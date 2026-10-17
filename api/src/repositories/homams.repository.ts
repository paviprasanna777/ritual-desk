import type Database from 'better-sqlite3';

export interface HomamInput {
  name: string;
  default_amount: number;
  duration_mins: number | null;
  items_needed: string[];
  notes: string | null;
}

export interface Homam extends HomamInput {
  id: number;
  active: number;
}

function mapHomam(record: Omit<Homam, 'items_needed'> & { items_needed: string }): Homam {
  return { ...record, items_needed: JSON.parse(record.items_needed) as string[] };
}

export function createHomamsRepository(database: Database.Database) {
  const selectById = database.prepare(`
    SELECT id, name, default_amount, duration_mins, items_needed, notes, active
    FROM homam_types
    WHERE id = ?
  `);

  return {
    list(all: boolean): Homam[] {
      const records = database.prepare(`
        SELECT id, name, default_amount, duration_mins, items_needed, notes, active
        FROM homam_types
        ${all ? '' : 'WHERE active = 1'}
        ORDER BY name COLLATE NOCASE, id
      `).all() as Array<Omit<Homam, 'items_needed'> & { items_needed: string }>;
      return records.map(mapHomam);
    },

    findById(id: number): Homam | undefined {
      const record = selectById.get(id) as
        | (Omit<Homam, 'items_needed'> & { items_needed: string })
        | undefined;
      return record ? mapHomam(record) : undefined;
    },

    create(input: HomamInput): Homam {
      const result = database.prepare(`
        INSERT INTO homam_types (name, default_amount, duration_mins, items_needed, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        input.name,
        input.default_amount,
        input.duration_mins,
        JSON.stringify(input.items_needed),
        input.notes,
      );
      return this.findById(Number(result.lastInsertRowid))!;
    },

    update(id: number, input: HomamInput): Homam | undefined {
      const result = database.prepare(`
        UPDATE homam_types
        SET name = ?, default_amount = ?, duration_mins = ?, items_needed = ?, notes = ?
        WHERE id = ?
      `).run(
        input.name,
        input.default_amount,
        input.duration_mins,
        JSON.stringify(input.items_needed),
        input.notes,
        id,
      );
      return result.changes ? this.findById(id) : undefined;
    },

    softDelete(id: number): boolean {
      const result = database.prepare(
        'UPDATE homam_types SET active = 0 WHERE id = ? AND active != 0',
      ).run(id);
      return result.changes > 0;
    },
  };
}
