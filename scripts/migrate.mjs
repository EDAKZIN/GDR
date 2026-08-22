import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = fileURLToPath(new URL("../src/database/migrations", import.meta.url));

const files = readdirSync(migrationsDir)
  .filter((file) => /^\d{4}_.*\.sql$/.test(file))
  .sort();

if (files.length === 0) {
  console.error("No se encontraron migraciones en src/database/migrations");
  process.exit(1);
}

const seenIds = new Set();
let previousNumber = 0;

for (const file of files) {
  const number = Number.parseInt(file.slice(0, 4), 10);
  if (number <= previousNumber) {
    console.error(`Numeración de migración inválida o duplicada: ${file}`);
    process.exit(1);
  }
  previousNumber = number;

  const id = file.replace(/\.sql$/, "");
  if (seenIds.has(id)) {
    console.error(`Id de migración duplicado: ${id}`);
    process.exit(1);
  }
  seenIds.add(id);

  const content = readFileSync(join(migrationsDir, file), "utf8");
  if (content.trim().length === 0) {
    console.error(`Migración vacía: ${file}`);
    process.exit(1);
  }

  console.log(`OK ${id}`);
}

console.log(`${files.length} migración(es) válida(s).`);
