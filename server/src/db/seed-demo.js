import bcrypt from "bcryptjs";
import { demoTeams, demoUsers, demoWarehouses, demoInventory } from "./demo-data.js";

async function upsertWarehousesAndInventory(client) {
  for (const warehouse of demoWarehouses) {
    await client.query(
      `INSERT INTO warehouses (id, name, latitude, longitude, address, capacity, manager_name, manager_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         address = EXCLUDED.address,
         capacity = EXCLUDED.capacity,
         manager_name = EXCLUDED.manager_name,
         manager_phone = EXCLUDED.manager_phone,
         updated_at = NOW()`,
      [
        warehouse.id, warehouse.name, warehouse.latitude, warehouse.longitude,
        warehouse.address, warehouse.capacity, warehouse.managerName, warehouse.managerPhone,
      ],
    );
  }
  for (const item of demoInventory) {
    await client.query(
      `INSERT INTO inventory (id, name, category, quantity, unit, status, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         quantity = EXCLUDED.quantity,
         unit = EXCLUDED.unit,
         status = EXCLUDED.status,
         warehouse_id = EXCLUDED.warehouse_id,
         updated_at = NOW()`,
      [item.id, item.name, item.category, item.qty, item.unit, item.status, item.warehouseId],
    );
  }
  return { warehouses: demoWarehouses.length, inventory: demoInventory.length };
}

export async function seedDemoData({ db, password, bcryptRounds }) {
  if (!password || password.length < 8) {
    throw new Error("The demo password must contain at least 8 characters.");
  }
  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    for (const team of demoTeams) {
      await client.query(
        `INSERT INTO teams (id, name, member_count, status, location)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           member_count = EXCLUDED.member_count,
           status = EXCLUDED.status,
           location = EXCLUDED.location,
           updated_at = NOW()`,
        [team.id, team.name, team.memberCount, team.status, team.location],
      );
    }
    for (const user of demoUsers) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, name, role, status, team_id, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           status = EXCLUDED.status,
           team_id = EXCLUDED.team_id,
           phone = EXCLUDED.phone,
           updated_at = NOW()`,
        [user.id, user.username, passwordHash, user.name, user.role, user.status, user.teamId, user.phone],
      );
    }
    for (const team of demoTeams) {
      await client.query(
        "UPDATE teams SET leader_id = $2, updated_at = NOW() WHERE id = $1",
        [team.id, team.leaderId],
      );
    }
    const { warehouses, inventory } = await upsertWarehousesAndInventory(client);
    await client.query("COMMIT");
    return { teams: demoTeams.length, users: demoUsers.length, warehouses, inventory };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Seeds only warehouses and inventory — safe to run against a live database since it never touches teams, users, or passwords. */
export async function seedWarehouseData({ db }) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await upsertWarehousesAndInventory(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
