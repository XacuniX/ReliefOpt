import "dotenv/config";
import { loadConfig } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";
import { seedDemoData } from "./db/seed-demo.js";

const config = loadConfig();
if (config.nodeEnv === "production") {
  throw new Error("Demo user seeding is disabled in production.");
}
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error("DEMO_PASSWORD is required for demo seeding.");

const pool = createPool(config);
try {
  await runMigrations({ db: pool });
  const result = await seedDemoData({ db: pool, password, bcryptRounds: config.bcryptRounds });
  console.info(
    `Seeded ${result.users} demo users, ${result.teams} teams, ${result.warehouses} warehouses, and ${result.inventory} inventory items.`,
  );
} finally {
  await pool.end();
}
