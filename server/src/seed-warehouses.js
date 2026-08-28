import "./load-env.js";
import { loadConfig } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";
import { seedWarehouseData } from "./db/seed-demo.js";

const config = loadConfig();
const pool = createPool(config);
try {
  await runMigrations({ db: pool });
  const result = await seedWarehouseData({ db: pool });
  console.info(`Seeded ${result.warehouses} warehouses and ${result.inventory} inventory items.`);
} finally {
  await pool.end();
}
