import { WarehouseRepository } from "../db/repository.js";

export class WarehouseManagementError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "WarehouseManagementError";
    this.status = status;
    this.code = code;
  }
}

function requiredText(value, name, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new WarehouseManagementError(400, "VALIDATION_ERROR", `${name} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new WarehouseManagementError(400, "VALIDATION_ERROR", `${name} is too long.`);
  }
  return normalized;
}

function optionalText(value, name, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, name, maxLength);
}

function optionalNumber(value, name, { min, max } = {}) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || (min !== undefined && normalized < min) || (max !== undefined && normalized > max)) {
    throw new WarehouseManagementError(400, "VALIDATION_ERROR", `${name} is invalid.`);
  }
  return normalized;
}

async function advanceSnapshot(db) {
  await db.query(
    "UPDATE snapshot_meta SET snapshot_seq = snapshot_seq + 1, updated_at = NOW() WHERE singleton = TRUE",
  );
}

export function mapWarehouse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    lat: row.latitude == null ? null : Number(row.latitude),
    lng: row.longitude == null ? null : Number(row.longitude),
    address: row.address ?? null,
    capacity: row.capacity == null ? null : Number(row.capacity),
    managerName: row.manager_name ?? null,
    managerPhone: row.manager_phone ?? null,
  };
}

export class WarehouseManagementService {
  constructor({ db }) {
    this.db = db;
    this.repository = new WarehouseRepository(db);
  }

  async listWarehouses() {
    return (await this.repository.list()).map(mapWarehouse);
  }

  async createWarehouse(input) {
    const warehouse = {
      name: requiredText(input?.name, "Warehouse name", 100),
      address: optionalText(input?.address, "Address", 200),
      latitude: optionalNumber(input?.latitude, "Latitude", { min: -90, max: 90 }),
      longitude: optionalNumber(input?.longitude, "Longitude", { min: -180, max: 180 }),
      capacity: optionalNumber(input?.capacity, "Storage capacity", { min: 0 }),
      managerName: optionalText(input?.managerName, "Manager name", 100),
      managerPhone: optionalText(input?.managerPhone, "Manager phone", 30),
    };

    if (await this.repository.findByName(warehouse.name)) {
      throw new WarehouseManagementError(409, "WAREHOUSE_NAME_TAKEN", "A warehouse with that name already exists.");
    }
    const created = await this.repository.create(warehouse);
    await advanceSnapshot(this.db);
    return mapWarehouse(created);
  }
}
