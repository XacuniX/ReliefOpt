import { openDB } from "idb";
import { seedData } from "../mockData.js";

const DB_NAME = "reliefopt";
const DB_VERSION = 2;
export const AUTHORITATIVE_STORES = [
  "reports", "tasks", "inventory", "users", "teams", "warehouses",
  "notifications", "stockLog", "mapPins",
];
export const STORES = [
  ...AUTHORITATIVE_STORES,
  "syncQueue",
  "proposalOutbox",
  "snapshots",
  "drafts",
  "settings",
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

export async function getMeta(id) {
  return (await getDB()).get("meta", id);
}

export async function setMeta(id, value) {
  return (await getDB()).put("meta", { id, value });
}

/** Atomically replaces only authoritative stores and never touches the proposal outbox. */
export async function applyAuthoritativeSnapshot(snapshot) {
  if (!Number.isSafeInteger(snapshot?.snapshotSeq) || !snapshot?.data) return false;
  const db = await getDB();
  const tx = db.transaction([...AUTHORITATIVE_STORES, "snapshots", "meta"], "readwrite");
  const current = await tx.objectStore("meta").get("snapshotSeq");
  if (Number(current?.value ?? -1) >= snapshot.snapshotSeq) {
    await tx.done;
    return false;
  }
  for (const store of AUTHORITATIVE_STORES) {
    const objectStore = tx.objectStore(store);
    await objectStore.clear();
    for (const record of snapshot.data[store] || []) await objectStore.put(record);
  }
  await tx.objectStore("meta").put({ id: "snapshotSeq", value: snapshot.snapshotSeq });
  await tx.objectStore("meta").put({ id: "lastSyncedAt", value: snapshot.generatedAt || new Date().toISOString() });
  await tx.objectStore("snapshots").put({ id: "current", ...snapshot });
  await tx.done;
  return true;
}

export async function clearDomainCache({ preserveOutbox = true } = {}) {
  const stores = preserveOutbox
    ? [...AUTHORITATIVE_STORES, "syncQueue", "drafts", "snapshots", "meta"]
    : [...AUTHORITATIVE_STORES, "syncQueue", "proposalOutbox", "drafts", "snapshots", "meta"];
  const db = await getDB();
  const tx = db.transaction(stores, "readwrite");
  await Promise.all(stores.map((store) => tx.objectStore(store).clear()));
  await tx.done;
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
