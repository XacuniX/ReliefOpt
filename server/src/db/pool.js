import pg from "pg";

const { Pool } = pg;

export function createPool(config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
    idleTimeoutMillis: 30000,
    ssl: config.databaseSsl
      ? { rejectUnauthorized: config.databaseSslRejectUnauthorized }
      : false,
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error", error);
  });

  return pool;
}
