import { newDb } from "pg-mem";
import { createApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { seedDemoData } from "./db/seed-demo.js";

const PASSWORD = "ReliefOpt!123";
const host = process.env.E2E_HOST || "127.0.0.1";
const port = Number(process.env.E2E_PORT || 4000);
const configuredClientOrigins = (process.env.E2E_CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
// Keep the desktop web client usable when this server is started with an
// Android/LAN origin list. Android-specific origins remain configurable.
const clientOrigins = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  ...configuredClientOrigins,
].filter((origin, index, origins) => origins.indexOf(origin) === index);
const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
const adapter = memoryDatabase.adapters.createPg();
const pool = new adapter.Pool();
await runMigrations({ db: pool });
await seedDemoData({ db: pool, password: PASSWORD, bcryptRounds: 10 });

await pool.query(`INSERT INTO warehouses (id, name, latitude, longitude) VALUES
  ('w1', 'Dhaka Central Warehouse', 23.8103, 90.4125),
  ('w2', 'Sylhet Relief Depot', 24.8949, 91.8687)`);
await pool.query(`INSERT INTO reports
  (id, type, district, latitude, longitude, severity, status, submitted_by_id, description, affected_count, people_count, urgency_score, urgency_zone)
  VALUES ('r1', 'Flood', 'Sylhet', 24.8949, 91.8687, 5, 'Pending', 'u3', 'River flooding near the market', 250, 250, 82, 'red')`);
await pool.query(`INSERT INTO tasks
  (id, title, description, priority, assigned_team_id, assigned_user_id, status, linked_report_id)
  VALUES ('task-1', 'Distribute water', 'Deliver clean water', 'Critical', 't1', 'u3', 'To Do', 'r1')`);
await pool.query(`INSERT INTO inventory
  (id, name, category, quantity, unit, status, warehouse_id)
  VALUES ('inv-1', 'Rice', 'Food', 500, 'kg', 'OK', 'w1'), ('inv-2', 'Water', 'Food', 10, 'cases', 'Low', 'w2')`);
await pool.query(`INSERT INTO notifications (id, user_id, type, title, body, is_read) VALUES
  ('notice-1', NULL, 'Critical', 'Flood escalation', 'Water level is rising in Sylhet.', FALSE),
  ('notice-2', NULL, 'System', 'Snapshot ready', 'Central Command snapshot is available.', FALSE)`);

const config = {
  jwtSecret: "e2e-only-jwt-secret-with-at-least-32-characters",
  jwtIssuer: "reliefopt-central-command-e2e",
  jwtAudience: "reliefopt-client-e2e",
  jwtExpiresInSeconds: 3600,
  bcryptRounds: 10,
  passwordMinLength: 12,
  clientOrigins,
  loginRateLimitWindowMs: 60000,
  loginRateLimitMax: 1000,
};

const app = createApp({ db: pool, config });
const server = app.listen(port, host, () => {
  console.info(`ReliefOpt E2E server listening on http://${host}:${port} (demo password: ${PASSWORD})`);
});

async function close() {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
process.on("SIGINT", () => void close().finally(() => process.exit(0)));
process.on("SIGTERM", () => void close().finally(() => process.exit(0)));
