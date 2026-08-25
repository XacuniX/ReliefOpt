export const TEST_CONFIG = Object.freeze({
  jwtSecret: "test-only-jwt-secret-with-at-least-32-characters",
  jwtIssuer: "reliefopt-central-command-test",
  jwtAudience: "reliefopt-client-test",
  jwtExpiresInSeconds: 3600,
  bcryptRounds: 10,
  passwordMinLength: 12,
  clientOrigins: ["http://127.0.0.1:5173"],
  loginRateLimitWindowMs: 60000,
  loginRateLimitMax: 1000,
});
