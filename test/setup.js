/**
 * Shared bootstrap for Node unit tests. These values are intentionally local
 * so a unit test never needs production infrastructure.
 */
process.env.NODE_ENV = "test";
process.env.VITE_API_URL ||= "http://127.0.0.1:4000";
process.env.VITE_AUTH_TIMEOUT_MS ||= "1000";
