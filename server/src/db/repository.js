import { randomUUID } from "node:crypto";

const WAREHOUSE_UPDATE_COLUMNS = new Set(["name", "latitude", "longitude"]);

export class UserAuthRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    const result = await this.db.query(
      `SELECT id, username, password_hash, name, role, status, team_id, auth_version
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username],
    );
    return result.rows[0] ?? null;
  }

  async findById(id) {
    const result = await this.db.query(
      `SELECT id, username, name, role, status, team_id, auth_version
       FROM users
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
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
}

export class WarehouseRepository {
  constructor(db) {
    this.db = db;
  }

  async create({ id = randomUUID(), name, latitude = null, longitude = null }) {
    if (!name?.trim()) throw new Error("Warehouse name is required.");
    const result = await this.db.query(
      `INSERT INTO warehouses (id, name, latitude, longitude)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, name.trim(), latitude, longitude],
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await this.db.query("SELECT * FROM warehouses WHERE id = $1", [id]);
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
