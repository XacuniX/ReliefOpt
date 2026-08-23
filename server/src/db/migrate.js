import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const defaultMigrationsDirectory = fileURLToPath(
  new URL("../../migrations/", import.meta.url),
);

async function loadMigrationFiles(migrationsDirectory) {
  const names = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(join(migrationsDirectory, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

export async function runMigrations({ db, migrationsDirectory = defaultMigrationsDirectory }) {
  const client = await db.connect();
  const appliedNow = [];

  try {
    const metadataTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    `);
    if (metadataTable.rowCount === 0) {
      await client.query(`
      CREATE TABLE schema_migrations (
        name TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `);
    }

    const migrations = await loadMigrationFiles(migrationsDirectory);
    const result = await client.query("SELECT name, checksum FROM schema_migrations");
    const applied = new Map(result.rows.map((row) => [row.name, row.checksum.trim()]));

    for (const migration of migrations) {
      if (applied.has(migration.name)) {
        if (applied.get(migration.name) !== migration.checksum) {
          throw new Error(`Migration ${migration.name} has changed since it was applied.`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [migration.name, migration.checksum],
        );
        await client.query("COMMIT");
        appliedNow.push(migration.name);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return { applied: appliedNow, total: migrations.length };
  } finally {
    client.release();
  }
}
