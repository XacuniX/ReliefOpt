import "./load-env.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";

async function main() {
  const config = loadConfig();
  const pool = createPool(config);

  try {
    const migrationResult = await runMigrations({ db: pool });
    if (migrationResult.applied.length > 0) {
      console.info(`Applied migrations: ${migrationResult.applied.join(", ")}`);
    }
  } catch (error) {
    await pool.end();
    throw error;
  }

  const app = createApp({ db: pool, config });
  const server = app.listen(config.port, config.host, () => {
    console.info(`ReliefOpt Central Command listening on http://${config.host}:${config.port}`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`Received ${signal}; shutting down.`);

    const forceTimer = setTimeout(() => {
      console.error("Graceful shutdown timed out.");
      process.exit(1);
    }, config.shutdownTimeoutMs);
    forceTimer.unref();

    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    clearTimeout(forceTimer);
    process.exit(0);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Failed to start ReliefOpt Central Command", error);
  process.exitCode = 1;
});
