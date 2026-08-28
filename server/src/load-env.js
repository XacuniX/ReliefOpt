import dotenv from "dotenv";

// Server-local settings take precedence. The repository-level .env is a
// fallback so root npm scripts and direct server commands behave consistently.
dotenv.config({ path: new URL("../.env", import.meta.url) });
dotenv.config({ path: new URL("../../.env", import.meta.url) });
