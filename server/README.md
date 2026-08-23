# ReliefOpt Central Command server

This package is the PostgreSQL-backed authoritative service for ReliefOpt. The
first implementation slice provides validated configuration, ordered SQL
migrations, health/readiness endpoints, graceful shutdown, and a small
repository used to verify database CRUD behavior.

## Local setup

1. Create a PostgreSQL database and user.
2. Copy `.env.example` to `.env` and update `DATABASE_URL`.
3. Install dependencies with `npm install` in this directory.
4. Set a unique `JWT_SECRET` containing at least 32 characters.
5. Run migrations with `npm run migrate`.
6. For local demo accounts only, run `npm run seed:demo`.
7. Start the server with `npm run dev`.

From the repository root, the equivalent commands are `npm run server:migrate`,
`npm run server:seed:demo`, `npm run server:dev`, and `npm run server:test`.

The default test suite uses an isolated PostgreSQL-compatible in-memory
database. To verify the same migrations and CRUD repository against a real,
dedicated PostgreSQL database, set `TEST_DATABASE_URL` and run
`npm run test:postgres` inside `server/`. The test creates the schema if needed
and removes only its uniquely named warehouse record.

## Health endpoints

- `GET /health/live` confirms that the HTTP process is running.
- `GET /health/ready` confirms that PostgreSQL is reachable and migrations have
  created the snapshot metadata record.

## Authentication endpoints

- `POST /api/auth/login` accepts `{ "username": "...", "password": "..." }`
  and returns an expiring JWT plus the current user profile.
- `GET /api/auth/me` validates the bearer token and reloads the user from the
  database so deactivation and role changes take effect immediately.
- `GET /api/admin/ping` is restricted to Central Admin.
- `GET /api/warehouse/ping` is restricted to Central Admin and Warehouse
  Manager.

Demo seeding is rejected when `NODE_ENV=production`. Production users and
passwords must be provisioned through an administrative process in a later task.

Domain CRUD API routes belong to subsequent tasks in `tasks2.md`.
