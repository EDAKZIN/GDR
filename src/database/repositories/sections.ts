import type Database from "@tauri-apps/plugin-sql";
import {
  createSectionInputSchema,
  reorderInputSchema,
  updateSectionInputSchema,
  type CreateSectionInput,
  type ReorderInput,
  type Section,
  type UpdateSectionInput,
} from "../../core/sections";
import { randomUUID } from "../../core/utils/uuid";
import { createSearchRepository } from "./search";
import {
  appendSet,
  boolToDb,
  dbEnabled,
  listClauses,
  nowIso,
  reorderAtomically,
  type DbHandle,
  type ListOptions,
} from "./shared";
import { z } from "zod";

interface SectionRow {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  enabled: number;
  allowChildren: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const sectionRowSchema = z
  .object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    name: z.string(),
    description: z.string().nullable(),
    icon: z.string().nullable(),
    position: z.number().int(),
    enabled: dbEnabled,
    allowChildren: dbEnabled,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .transform((row): Section => ({
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    description: row.description,
    icon: row.icon,
    position: row.position,
    enabled: row.enabled,
    allowChildren: row.allowChildren,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }));

const SECTION_COLUMNS =
  "id, parent_id AS parentId, name, description, icon, position, enabled, allow_children AS allowChildren, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt";

export interface SectionListOptions extends ListOptions {
  /**
   * Filtro jerárquico:
   * - undefined: todas las secciones que cumplan los filtros base.
   * - null: solo secciones raíz (parent_id IS NULL).
   * - string: solo hijas directas de esa sección.
   */
  parentId?: string | null;
}

function parseSections(rows: SectionRow[]): Section[] {
  return z.array(sectionRowSchema).parse(rows);
}

export interface SectionRepository {
  create(input: CreateSectionInput): Promise<Section>;
  get(id: string): Promise<Section | null>;
  list(options?: SectionListOptions): Promise<Section[]>;
  /** Todas las secciones (incluidas deshabilitadas y eliminadas); base para árboles. */
  listAll(): Promise<Section[]>;
  update(id: string, input: UpdateSectionInput): Promise<Section>;
  /**
   * Mueve una sección bajo otro padre (null = raíz).
   * Rechaza auto-parentado y ciclos (mover bajo un propio descendiente).
   */
  move(id: string, newParentId: string | null): Promise<Section>;
  disable(id: string): Promise<Section>;
  enable(id: string): Promise<Section>;
  /** Soft-delete en cascada: elimina también todo el subárbol de descendientes. */
  softDelete(id: string): Promise<Section>;
  /**
   * Restaura la sección y los descendientes eliminados EN LA MISMA cascada
   * (los borrados individualmente antes o después permanecen en papelera).
   */
  restore(id: string): Promise<Section>;
  /** Borrado definitivo; las FK con ON DELETE CASCADE arrastran subárbol y datos. */
  hardDelete(id: string): Promise<boolean>;
  /** Fija position = índice para cada id, en el orden dado. */
  reorder(orderedIds: ReorderInput): Promise<void>;
}

export function createSectionsRepository(db: DbHandle): SectionRepository {
  // El índice FTS solo debe contener contenido visible: purgar al borrar la
  // sección (subárbol incluido) y reindexar sus registros vivos al restaurar.
  const searchRepository = createSearchRepository(db);

  async function getRow(database: Database, id: string): Promise<Section | null> {
    const rows = await database.select<SectionRow[]>(
      `SELECT ${SECTION_COLUMNS} FROM sections WHERE id = $1`,
      [z.uuid().parse(id)],
    );
    if (rows.length === 0) {
      return null;
    }
    return sectionRowSchema.parse(rows[0]);
  }

  async function requireRow(database: Database, id: string): Promise<Section> {
    const section = await getRow(database, id);
    if (section === null) {
      throw new Error(`Sección no encontrada: ${id}`);
    }
    return section;
  }

  /** Valida que el padre propuesto exista, no esté eliminado y admita hijas. */
  async function requireLiveParent(database: Database, parentId: string): Promise<Section> {
    const parent = await getRow(database, z.uuid().parse(parentId));
    if (parent === null) {
      throw new Error(`Sección padre no encontrada: ${parentId}`);
    }
    if (parent.deletedAt !== null) {
      throw new Error(`La sección padre está eliminada: ${parent.name}`);
    }
    if (!parent.allowChildren) {
      throw new Error(`La sección «${parent.name}» no permite sub-secciones.`);
    }
    return parent;
  }

  /**
   * Rechaza colgar `sectionId` bajo `newParentId` si este es (cuelga de) un
   * propio descendiente: produciría un ciclo y rompería el recorrido del
   * subárbol. Usado tanto por move() como por update() con parentId.
   */
  async function assertNoCycle(
    database: Database,
    sectionId: string,
    newParentId: string,
  ): Promise<void> {
    let cursor: Section | null = await getRow(database, newParentId);
    while (cursor !== null && cursor.parentId !== null) {
      if (cursor.parentId === sectionId) {
        throw new Error("No se puede mover una sección bajo su propio descendiente.");
      }
      cursor = await getRow(database, cursor.parentId);
    }
  }

  /** Nº de subsecciones NO eliminadas de una sección. */
  async function countLiveChildren(database: Database, id: string): Promise<number> {
    const rows = await database.select<Array<{ total: number }>>(
      "SELECT COUNT(*) AS total FROM sections WHERE parent_id = $1 AND deleted_at IS NULL",
      [id],
    );
    return rows[0]?.total ?? 0;
  }

  /**
   * Ids de la sección y de TODO su subárbol, en pre-orden (padre antes que hijos),
   * para poder restaurar en el orden correcto.
   */
  async function collectSubtreeIds(database: Database, rootId: string): Promise<string[]> {
    const ids: string[] = [rootId];
    const visited = new Set<string>([rootId]);
    let frontier = [rootId];
    while (frontier.length > 0) {
      const placeholders = frontier.map((_, index) => `$${String(index + 1)}`).join(", ");
      const rows = await database.select<Array<{ id: string }>>(
        `SELECT id FROM sections WHERE parent_id IN (${placeholders})`,
        frontier,
      );
      // Dedupe defensivo: un ciclo heredado en parent_id no debe colgar el recorrido.
      frontier = rows.map((row) => row.id).filter((id) => !visited.has(id));
      for (const id of frontier) {
        visited.add(id);
      }
      ids.push(...frontier);
    }
    return ids;
  }

  /** Aplica/retira deleted_at a un conjunto de ids en una sola UPDATE. */
  async function applyDeletedFlag(
    database: Database,
    ids: string[],
    deleted: boolean,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const params: unknown[] = [deleted ? nowIso() : null, nowIso()];
    const placeholders = ids
      .map((id) => {
        params.push(z.uuid().parse(id));
        return `$${String(params.length)}`;
      })
      .join(", ");
    await database.execute(
      `UPDATE sections SET deleted_at = $1, updated_at = $2 WHERE id IN (${placeholders})`,
      params,
    );
  }

  /** Listado con filtros base + filtro jerárquico opcional por padre. */
  async function listSections(options?: SectionListOptions): Promise<Section[]> {
    const database = await db();
    const clauses = listClauses(options);
    const params: unknown[] = [];
    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        clauses.push("parent_id IS NULL");
      } else {
        clauses.push(`parent_id = $${String(params.length + 1)}`);
        params.push(z.uuid().parse(options.parentId));
      }
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await database.select<SectionRow[]>(
      `SELECT ${SECTION_COLUMNS} FROM sections ${where} ORDER BY position, name`,
      params,
    );
    return parseSections(rows);
  }

  async function setFlags(
    database: Database,
    id: string,
    flags: { enabled?: boolean; deleted?: boolean },
  ): Promise<Section> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (flags.enabled !== undefined) {
      appendSet(sets, params, "enabled", boolToDb(flags.enabled));
    }
    if (flags.deleted !== undefined) {
      appendSet(sets, params, "deleted_at", flags.deleted ? nowIso() : null);
    }
    if (sets.length === 0) {
      return requireRow(database, id);
    }
    appendSet(sets, params, "updated_at", nowIso());
    params.push(id);
    await database.execute(
      `UPDATE sections SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
      params,
    );
    return requireRow(database, id);
  }

  return {
    async create(input: CreateSectionInput): Promise<Section> {
      const data = createSectionInputSchema.parse(input);
      const id = randomUUID();
      const database = await db();
      if (data.parentId != null) {
        await requireLiveParent(database, data.parentId);
      }
      let position = data.position;
      if (position === undefined) {
        // Sin posición explícita, la sección se añade al FINAL entre sus
        // hermanas (position 0 la colocaría antes que las existentes).
        const rows =
          data.parentId == null
            ? await database.select<Array<{ next: number }>>(
                "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM sections WHERE parent_id IS NULL",
              )
            : await database.select<Array<{ next: number }>>(
                "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM sections WHERE parent_id = $1",
                [data.parentId],
              );
        position = rows[0]?.next ?? 0;
      }
      await database.execute(
        "INSERT INTO sections (id, parent_id, name, description, icon, position, allow_children) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          id,
          data.parentId ?? null,
          data.name,
          data.description ?? null,
          data.icon ?? null,
          position,
          boolToDb(data.allowChildren ?? true),
        ],
      );
      return requireRow(database, id);
    },

    async get(id: string): Promise<Section | null> {
      return getRow(await db(), z.uuid().parse(id));
    },

    async list(options?: SectionListOptions): Promise<Section[]> {
      return listSections(options);
    },

    async listAll(): Promise<Section[]> {
      return listSections({ includeDisabled: true, includeDeleted: true });
    },

    async update(id: string, input: UpdateSectionInput): Promise<Section> {
      const data = updateSectionInputSchema.parse(input);
      const sectionId = z.uuid().parse(id);
      const database = await db();
      const sets: string[] = [];
      const params: unknown[] = [];
      if (data.name !== undefined) {
        appendSet(sets, params, "name", data.name);
      }
      if (data.description !== undefined) {
        appendSet(sets, params, "description", data.description ?? null);
      }
      if (data.icon !== undefined) {
        appendSet(sets, params, "icon", data.icon ?? null);
      }
      if (data.allowChildren !== undefined && !data.allowChildren) {
        // Solo se puede convertir en hoja estructural una sección sin hijas vivas.
        const liveChildren = await countLiveChildren(database, sectionId);
        if (liveChildren > 0) {
          throw new Error(
            "No se puede desactivar «Permitir sub-secciones»: la sección tiene subsecciones. Mueve o elimina primero sus hijas.",
          );
        }
      }
      if (data.parentId !== undefined) {
        // null explícito = pasar a raíz; id = validar que exista y esté vivo.
        if (data.parentId !== null) {
          await requireLiveParent(database, data.parentId);
          // Igual que move(): prohibido colgarse de un propio descendiente.
          await assertNoCycle(database, sectionId, data.parentId);
        }
        if (data.parentId === sectionId) {
          throw new Error("Una sección no puede ser su propia sección padre.");
        }
        appendSet(sets, params, "parent_id", data.parentId);
      }
      if (data.position !== undefined) {
        appendSet(sets, params, "position", data.position);
      }
      if (data.allowChildren !== undefined) {
        appendSet(sets, params, "allow_children", boolToDb(data.allowChildren));
      }
      if (sets.length === 0) {
        return requireRow(database, z.uuid().parse(id));
      }
      appendSet(sets, params, "updated_at", nowIso());
      params.push(z.uuid().parse(id));
      await database.execute(
        `UPDATE sections SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
        params,
      );
      return requireRow(database, z.uuid().parse(id));
    },

    async move(id: string, newParentId: string | null): Promise<Section> {
      const sectionId = z.uuid().parse(id);
      const database = await db();
      await requireRow(database, sectionId);
      if (newParentId !== null) {
        const target = z.uuid().parse(newParentId);
        if (target === sectionId) {
          throw new Error("Una sección no puede ser su propia sección padre.");
        }
        await requireLiveParent(database, target);
        // Evitar ciclos: ningún ancestro del nuevo padre puede ser la sección
        // que se mueve (eso significaría colgarla de su propio descendiente).
        await assertNoCycle(database, sectionId, target);
      }
      await database.execute("UPDATE sections SET parent_id = $1, updated_at = $2 WHERE id = $3", [
        newParentId,
        nowIso(),
        sectionId,
      ]);
      return requireRow(database, sectionId);
    },

    async disable(id: string): Promise<Section> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { enabled: false });
    },

    async enable(id: string): Promise<Section> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { enabled: true });
    },

    async softDelete(id: string): Promise<Section> {
      const sectionId = z.uuid().parse(id);
      const database = await db();
      // Soft-delete en cascada: la sección y todo su subárbol a la papelera.
      const subtreeIds = await collectSubtreeIds(database, sectionId);
      await applyDeletedFlag(database, subtreeIds, true);
      // Los registros del subárbol dejan de ser visibles: fuera del índice.
      const placeholders = subtreeIds.map((_, index) => `$${String(index + 1)}`).join(", ");
      await database.execute(
        `DELETE FROM fts_values WHERE record_id IN (
           SELECT r.id FROM records r JOIN forms fo ON fo.id = r.form_id
           WHERE fo.section_id IN (${placeholders})
         )`,
        subtreeIds,
      );
      return requireRow(database, sectionId);
    },

    async restore(id: string): Promise<Section> {
      const sectionId = z.uuid().parse(id);
      const database = await db();
      /*
       * Restauración selectiva: SOLO se resucitan los nodos borrados EN LA
       * MISMA cascada que la raíz. El soft-delete recursivo estampa un único
       * timestamp para todo el subárbol (una UPDATE con un solo nowIso()),
       * así que comparar deleted_at con el de la raíz distingue:
       *   - hijos eliminados individualmente ANTES de borrar el padre
       *     (timestamp anterior) → siguen en la papelera;
       *   - hijos eliminados después, por su cuenta (timestamp posterior)
       *     → también siguen en la papelera.
       * Se atraviesa el subárbol completo (sin cortar en nodos no
       * restaurables) porque puede haber restaurables bajo ramas tocadas
       * por otras operaciones.
       */
      const root = await requireRow(database, sectionId);
      if (root.deletedAt === null) {
        return root;
      }
      const ids: string[] = [sectionId];
      const visited = new Set<string>([sectionId]);
      let frontier = [sectionId];
      while (frontier.length > 0) {
        // $1 = timestamp de la cascada; $2.. = frontera actual.
        const placeholders = frontier.map((_, index) => `$${String(index + 2)}`).join(", ");
        const rows = await database.select<Array<{ id: string }>>(
          `SELECT id FROM sections WHERE parent_id IN (${placeholders}) AND deleted_at = $1`,
          [root.deletedAt, ...frontier],
        );
        // Dedupe defensivo contra ciclos heredados en parent_id.
        frontier = rows.map((row) => row.id).filter((childId) => !visited.has(childId));
        for (const childId of frontier) {
          visited.add(childId);
        }
        ids.push(...frontier);
      }
      await applyDeletedFlag(database, ids, false);
      // Reindexar los registros vivos de los formularios restaurados.
      const placeholders = ids.map((_, index) => `$${String(index + 1)}`).join(", ");
      const recordRows = await database.select<Array<{ id: string }>>(
        `SELECT DISTINCT r.id FROM records r
         JOIN forms fo ON fo.id = r.form_id
         WHERE fo.section_id IN (${placeholders}) AND r.deleted_at IS NULL`,
        ids,
      );
      for (const row of recordRows) {
        await searchRepository.indexRecord(row.id);
      }
      return requireRow(database, sectionId);
    },

    async hardDelete(id: string): Promise<boolean> {
      const database = await db();
      const result = await database.execute("DELETE FROM sections WHERE id = $1", [
        z.uuid().parse(id),
      ]);
      if (result.rowsAffected > 0) {
        // Las FK (parent_id, forms→section, fields/records→forms,
        // field_values→records/fields) usan ON DELETE CASCADE, así que el
        // subárbol y sus datos desaparecen solos; esta limpieza defensiva
        // garantiza que no queden field_values/registros huérfanos aunque
        // las claves foráneas estuvieran desactivadas en tiempo de ejecución.
        await database.execute(
          "DELETE FROM field_values WHERE record_id NOT IN (SELECT id FROM records)",
        );
        await database.execute("DELETE FROM records WHERE form_id NOT IN (SELECT id FROM forms)");
        await database.execute("DELETE FROM fields WHERE form_id NOT IN (SELECT id FROM forms)");
        await database.execute(
          "DELETE FROM fts_values WHERE record_id NOT IN (SELECT id FROM records)",
        );
      }
      return result.rowsAffected > 0;
    },

    async reorder(orderedIds: ReorderInput): Promise<void> {
      const ids = reorderInputSchema.parse(orderedIds);
      const database = await db();
      await reorderAtomically(database, "sections", ids);
    },
  };
}
