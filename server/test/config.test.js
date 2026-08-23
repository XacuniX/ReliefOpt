import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";

test("loadConfig applies safe development defaults", () => {
  const config = loadConfig({
    DATABASE_URL: "postgres://user:pass@localhost:5432/reliefopt",
    JWT_SECRET: "test-only-jwt-secret-with-at-least-32-characters",
  });
  assert.equal(config.nodeEnv, "development");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 4000);
  assert.equal(config.databaseSsl, false);
  assert.equal(config.databasePoolMax, 10);
});

test("loadConfig requires a PostgreSQL URL", () => {
  const auth = { JWT_SECRET: "test-only-jwt-secret-with-at-least-32-characters" };
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
  };
  assert.throws(() => loadConfig({ ...base, PORT: "70000" }), /PORT/);
  assert.throws(() => loadConfig({ ...base, DATABASE_SSL: "sometimes" }), /DATABASE_SSL/);
});

test("loadConfig rejects weak JWT secrets", () => {
  assert.throws(
    () => loadConfig({
      DATABASE_URL: "postgresql://user:pass@localhost/reliefopt",
      JWT_SECRET: "too-short",
    }),
    /JWT_SECRET/,
  );
});
