import "dotenv/config";
import { loadConfig } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";

const config = loadConfig();
const pool = createPool(config);

try {
  const result = await runMigrations({ db: pool });
  console.info(
    result.applied.length > 0
      ? `Applied migrations: ${result.applied.join(", ")}`
      : `Database is current (${result.total} migrations).`,
  );
} finally {
  await pool.end();
}
