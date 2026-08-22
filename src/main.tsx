import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { getDb } from "./database/client";
import { runMigrations } from "./database/migrations/runner";
import { createSearchRepository } from "./database/repositories";

async function bootstrap(): Promise<void> {
  let fatal: unknown = null;

  try {
    const db = await getDb();
    const applied = await runMigrations(db);
    if (applied.length > 0) {
      console.info("Migraciones aplicadas:", applied.join(", "));
    }
    // El índice FTS5 se reconstruye al arrancar (idempotente): repara índices
    // desincronizados y llena el índice tras aplicar la migración 0002_fts.
    try {
      await createSearchRepository(getDb).reindexAll();
    } catch (indexError) {
      console.error("Error al reconstruir el índice de búsqueda:", indexError);
    }
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
    fatal = error;
  }

  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

  // Si la base de datos falla, la app no puede funcionar: mostrar pantalla de
  // error en lugar de una interfaz que consultará tablas inexistentes.
  if (fatal !== null) {
    root.render(
      <React.StrictMode>
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-zinc-950 p-8 text-center">
          <h1 className="text-lg font-semibold text-rose-400">
            No se pudo inicializar la base de datos
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            Revisa que la aplicación tenga permisos de escritura y vuelve a abrirla.
          </p>
          <pre className="max-w-lg overflow-auto rounded-md border border-zinc-800 bg-zinc-900 p-3 text-left text-xs text-zinc-500">
            {fatal instanceof Error ? fatal.message : JSON.stringify(fatal)}
          </pre>
        </div>
      </React.StrictMode>,
    );
    return;
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
