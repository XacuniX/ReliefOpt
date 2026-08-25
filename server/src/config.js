const VALID_NODE_ENVS = new Set(["development", "test", "production"]);

function parseInteger(value, fallback, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const candidate = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < min || candidate > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return candidate;
}

function parseBoolean(value, fallback, name) {
  if (value === undefined || value === "") return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`${name} must be either true or false.`);
}

function parseList(value, fallback = []) {
  if (value === undefined || value === "") return fallback;
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${Array.from(VALID_NODE_ENVS).join(", ")}.`);
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  let parsedDatabaseUrl;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET is required and must contain at least 32 characters.");
  }

  return Object.freeze({
    nodeEnv,
    host: env.HOST?.trim() || "127.0.0.1",
    port: parseInteger(env.PORT, 4000, "PORT", { max: 65535 }),
    databaseUrl,
    databaseSsl: parseBoolean(env.DATABASE_SSL, nodeEnv === "production", "DATABASE_SSL"),
    databaseSslRejectUnauthorized: parseBoolean(
      env.DATABASE_SSL_REJECT_UNAUTHORIZED,
      true,
      "DATABASE_SSL_REJECT_UNAUTHORIZED",
    ),
    databasePoolMax: parseInteger(env.DATABASE_POOL_MAX, 10, "DATABASE_POOL_MAX", { max: 100 }),
    databaseConnectionTimeoutMs: parseInteger(
      env.DATABASE_CONNECTION_TIMEOUT_MS,
      5000,
      "DATABASE_CONNECTION_TIMEOUT_MS",
      { max: 120000 },
    ),
    shutdownTimeoutMs: parseInteger(
      env.SHUTDOWN_TIMEOUT_MS,
      10000,
      "SHUTDOWN_TIMEOUT_MS",
      { max: 120000 },
    ),
    clientOrigins: parseList(env.CLIENT_ORIGINS, [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ]),
    jwtSecret,
    jwtIssuer: env.JWT_ISSUER?.trim() || "reliefopt-central-command",
    jwtAudience: env.JWT_AUDIENCE?.trim() || "reliefopt-client",
    jwtExpiresInSeconds: parseInteger(
      env.JWT_EXPIRES_IN_SECONDS,
      28800,
      "JWT_EXPIRES_IN_SECONDS",
      { min: 60, max: 86400 },
    ),
    bcryptRounds: parseInteger(env.BCRYPT_ROUNDS, 12, "BCRYPT_ROUNDS", { min: 10, max: 14 }),
    passwordMinLength: parseInteger(
      env.PASSWORD_MIN_LENGTH,
      12,
      "PASSWORD_MIN_LENGTH",
      { min: 8, max: 128 },
    ),
    loginRateLimitWindowMs: parseInteger(
      env.LOGIN_RATE_LIMIT_WINDOW_MS,
      900000,
      "LOGIN_RATE_LIMIT_WINDOW_MS",
      { min: 1000, max: 86400000 },
    ),
    loginRateLimitMax: parseInteger(
      env.LOGIN_RATE_LIMIT_MAX,
      10,
      "LOGIN_RATE_LIMIT_MAX",
      { min: 1, max: 10000 },
    ),
  });
}
