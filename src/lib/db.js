import { openDB } from "idb";
import { seedData } from "../mockData";

const DB_NAME = "reliefopt";
const DB_VERSION = 1;
export const STORES = [
  "reports",
  "tasks",
  "inventory",
  "users",
  "teams",
  "warehouses",
  "notifications",
  "stockLog",
  "mapPins",
  "syncQueue",
  "meta",
];

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    },
  });
}

export async function getAll(store) {
  return (await getDB()).getAll(store);
}

export async function put(store, record) {
  return (await getDB()).put(store, record);
}

export async function remove(store, id) {
  return (await getDB()).delete(store, id);
}

export async function clearStore(store) {
  return (await getDB()).clear(store);
}

/**
 * Seeds the demo data once. Writes { id: "seeded", value: true } into the meta
 * store so re-seeding never happens again (user edits are not wiped on refresh).
 * Returns true when it actually seeded (i.e. the database was missing or
 * unseeded), false when the data was already there.
 */
export async function seedOnce() {
  const db = await getDB();
  const seeded = await db.get("meta", "seeded");
  if (seeded?.value) return false;

  const tx = db.transaction(STORES, "readwrite");
  for (const [store, records] of Object.entries(seedData)) {
    for (const record of records) {
      tx.objectStore(store).put(record);
    }
  }
  tx.objectStore("meta").put({ id: "seeded", value: true });
  await tx.done;
  return true;
}
