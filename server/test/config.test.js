import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, loadDatabaseConfig } from "../src/config.js";

test("loadDatabaseConfig does not require application-only JWT settings", () => {
  const config = loadDatabaseConfig({
    DATABASE_URL: "postgres://user:pass@localhost:5432/reliefopt",
  });
  assert.equal(config.databaseUrl, "postgres://user:pass@localhost:5432/reliefopt");
  assert.equal(config.databaseSsl, false);
});

test("loadConfig applies safe development defaults", () => {
  const config = loadConfig({
    DATABASE_URL: "postgres://user:pass@localhost:5432/reliefopt",
    JWT_SECRET: "test-only-jwt-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
  });
  assert.equal(config.nodeEnv, "development");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 4000);
  assert.equal(config.databaseSsl, false);
  assert.equal(config.databasePoolMax, 10);
});

test("loadConfig requires a PostgreSQL URL", () => {
  const auth = {
    JWT_SECRET: "test-only-jwt-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
  };
  assert.throws(() => loadConfig(auth), /DATABASE_URL is required/);
  assert.throws(
    () => loadConfig({ ...auth, DATABASE_URL: "https://example.com/database" }),
    /must use the postgres/,
  );
});

test("loadConfig validates numeric and boolean settings", () => {
  const base = {
    DATABASE_URL: "postgresql://user:pass@localhost/reliefopt",
    JWT_SECRET: "test-only-jwt-secret-with-at-least-32-characters",
    GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
  };
  assert.throws(() => loadConfig({ ...base, PORT: "70000" }), /PORT/);
  assert.throws(() => loadConfig({ ...base, DATABASE_SSL: "sometimes" }), /DATABASE_SSL/);
});

test("loadConfig rejects weak JWT secrets", () => {
  assert.throws(
    () => loadConfig({
      DATABASE_URL: "postgresql://user:pass@localhost/reliefopt",
      JWT_SECRET: "too-short",
      GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
    }),
    /JWT_SECRET/,
  );
});

test("loadConfig requires a Google web client ID", () => {
  assert.throws(
    () => loadConfig({
      DATABASE_URL: "postgresql://user:pass@localhost/reliefopt",
      JWT_SECRET: "test-only-jwt-secret-with-at-least-32-characters",
    }),
    /GOOGLE_CLIENT_ID/,
  );
});
