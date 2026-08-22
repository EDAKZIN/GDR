import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { getDb } from "./database/client";
import { runMigrations } from "./database/migrations/runner";

async function bootstrap(): Promise<void> {
  try {
    const db = await getDb();
    const applied = await runMigrations(db);
    if (applied.length > 0) {
      console.info("Migraciones aplicadas:", applied.join(", "));
    }
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
