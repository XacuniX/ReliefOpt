import { randomUUID } from "node:crypto";

const AUTH_USER_COLUMNS = `
  id, username, password_hash, name, email, role, status, team_id, auth_version,
  google_id, avatar_url, auth_provider
`;

const WAREHOUSE_UPDATE_COLUMNS = new Set([
  "name", "latitude", "longitude", "address", "capacity", "manager_name", "manager_phone",
]);

export class UserAuthRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    const result = await this.db.query(
      `SELECT ${AUTH_USER_COLUMNS}
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username],
    );
    return result.rows[0] ?? null;
  }

  async findById(id) {
    const result = await this.db.query(
      `SELECT ${AUTH_USER_COLUMNS}
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByGoogleId(googleId) {
    const result = await this.db.query(
      `SELECT ${AUTH_USER_COLUMNS}
       FROM users
       WHERE google_id = $1`,
      [googleId],
    );
    return result.rows[0] ?? null;
  }

  async resolveGoogleAccount({ googleId, email, name, avatarUrl, usernameBase }) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const client = await this.db.connect();
      try {
        await client.query("BEGIN");
        let result = await client.query(
          `SELECT ${AUTH_USER_COLUMNS}
           FROM users
           WHERE google_id = $1
           FOR UPDATE`,
          [googleId],
        );

        let user = result.rows[0] ?? null;
        if (user) {
          result = await client.query(
            `UPDATE users
             SET avatar_url = $2, auth_provider = 'google', updated_at = NOW()
             WHERE id = $1
             RETURNING ${AUTH_USER_COLUMNS}`,
            [user.id, avatarUrl],
          );
          user = result.rows[0];
        } else {
          result = await client.query(
            `SELECT ${AUTH_USER_COLUMNS}
             FROM users
             WHERE LOWER(email) = LOWER($1)
             FOR UPDATE`,
            [email],
          );
          user = result.rows[0] ?? null;

          if (user) {
            result = await client.query(
              `UPDATE users
               SET google_id = $2, avatar_url = $3, auth_provider = 'google', updated_at = NOW()
               WHERE id = $1
               RETURNING ${AUTH_USER_COLUMNS}`,
              [user.id, googleId, avatarUrl],
            );
            user = result.rows[0];
          } else {
            const usernameResult = await client.query(
              "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
              [usernameBase],
            );
            const username = usernameResult.rowCount === 0
              ? usernameBase
              : `${usernameBase.slice(0, 40)}.${randomUUID().slice(0, 8)}`;
            result = await client.query(
              `INSERT INTO users (
                 id, username, password_hash, name, email, google_id, avatar_url,
                 auth_provider, role, status, team_id, phone
               )
               VALUES ($1, $2, NULL, $3, $4, $5, $6, 'google', 'field_worker', 'Active', NULL, NULL)
               RETURNING ${AUTH_USER_COLUMNS}`,
              [randomUUID(), username, name, email, googleId, avatarUrl],
            );
            user = result.rows[0];
          }

          await client.query(
            "UPDATE snapshot_meta SET snapshot_seq = snapshot_seq + 1, updated_at = NOW() WHERE singleton = TRUE",
          );
        }

        await client.query("COMMIT");
        return user;
      } catch (error) {
        await client.query("ROLLBACK");
        if (error?.code !== "23505" || attempt === 1) throw error;
      } finally {
        client.release();
      }
    }
    throw new Error("Unable to resolve Google account.");
  }

  async updateLastLogin(id) {
    const result = await this.db.query(
      `UPDATE users
       SET last_login = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING last_login`,
      [id],
    );
    return result.rows[0]?.last_login ?? null;
  }

  async updateEmail(id, email) {
    const result = await this.db.query(
      `UPDATE users
       SET email = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, email],
    );
    return result.rowCount === 1;
  }

  async updatePassword(id, passwordHash) {
    const result = await this.db.query(
      `UPDATE users
       SET password_hash = $2, auth_version = auth_version + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, passwordHash],
    );
    return result.rowCount === 1;
  }
}

export class WarehouseRepository {
  constructor(db) {
    this.db = db;
  }

  async create({
    id = randomUUID(),
    name,
    latitude = null,
    longitude = null,
    address = null,
    capacity = null,
    managerName = null,
    managerPhone = null,
  }) {
    if (!name?.trim()) throw new Error("Warehouse name is required.");
    const result = await this.db.query(
      `INSERT INTO warehouses (id, name, latitude, longitude, address, capacity, manager_name, manager_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name.trim(), latitude, longitude, address, capacity, managerName, managerPhone],
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await this.db.query("SELECT * FROM warehouses WHERE id = $1", [id]);
    return result.rows[0] ?? null;
  }

  async findByName(name) {
    const result = await this.db.query(
      "SELECT * FROM warehouses WHERE LOWER(name) = LOWER($1)",
      [name],
    );
    return result.rows[0] ?? null;
  }

  async list() {
    const result = await this.db.query("SELECT * FROM warehouses ORDER BY name, id");
    return result.rows;
  }

  async update(id, patch) {
    const entries = Object.entries(patch).filter(([key]) => WAREHOUSE_UPDATE_COLUMNS.has(key));
    if (entries.length === 0) throw new Error("No supported warehouse fields were provided.");
    if (Object.hasOwn(patch, "name") && !patch.name?.trim()) {
      throw new Error("Warehouse name cannot be empty.");
    }

    const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
    const values = entries.map(([key, value]) => (key === "name" ? value.trim() : value));
    const result = await this.db.query(
      `UPDATE warehouses
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );
    return result.rows[0] ?? null;
  }

  async delete(id) {
    const result = await this.db.query("DELETE FROM warehouses WHERE id = $1 RETURNING id", [id]);
    return result.rows[0] ?? null;
  }
}

export class SnapshotRepository {
  constructor(db) {
    this.db = db;
  }

  async currentSequence() {
    const result = await this.db.query(
      "SELECT snapshot_seq FROM snapshot_meta WHERE singleton = TRUE",
    );
    return Number(result.rows[0]?.snapshot_seq ?? 0);
  }

  async advanceSequence() {
    const result = await this.db.query(
      `UPDATE snapshot_meta
       SET snapshot_seq = snapshot_seq + 1, updated_at = NOW()
       WHERE singleton = TRUE
       RETURNING snapshot_seq`,
    );
    return Number(result.rows[0].snapshot_seq);
  }
}
