import type Database from "@tauri-apps/plugin-sql";
import { randomUUID } from "../../core/utils/uuid";

export interface SectionRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  enabled: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateSectionInput {
  name: string;
  slug: string;
  icon?: string | null;
  position?: number;
}

export function createSectionsRepository(db: () => Promise<Database>) {
  return {
    async list(): Promise<SectionRow[]> {
      const database = await db();
      return database.select<SectionRow[]>(
        "SELECT * FROM sections WHERE deleted_at IS NULL AND enabled = 1 ORDER BY position, name",
      );
    },

    async create(input: CreateSectionInput): Promise<SectionRow> {
      const id = randomUUID();
      const database = await db();
      await database.execute(
        "INSERT INTO sections (id, name, slug, icon, position) VALUES ($1, $2, $3, $4, $5)",
        [id, input.name, input.slug, input.icon ?? null, input.position ?? 0],
      );
      const created = await database.select<SectionRow[]>(
        "SELECT * FROM sections WHERE id = $1",
        [id],
      );
      return created[0];
    },
  };
}
