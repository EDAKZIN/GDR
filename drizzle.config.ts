import type { Config } from "drizzle-kit";

export default {
  dialect: "sqlite",
  schema: "./src/database/schema/index.ts",
  out: "./src/database/migrations/drizzle",
} satisfies Config;
