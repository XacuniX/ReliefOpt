const DB_NAME = "reliefopt-tiles";
const STORE_NAME = "tiles";
const DEFAULT_LIMIT_BYTES = 50 * 1024 * 1024;
const LIMIT_KEY = "reliefopt-tile-cache-limit";
// This is deliberately small: it covers a normal viewport at three nearby
// zoom levels without turning this feature into a map crawler.
const MAX_PREFETCH_TILES = 80;
const PREFETCH_CONCURRENCY = 4;
const inFlightRequests = new Map();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      store.createIndex("lastAccessed", "lastAccessed");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tileKey(z, x, y) {
  return `${z}/${x}/${y}`;
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getTileCacheLimit() {
  const savedLimit = Number(localStorage.getItem(LIMIT_KEY));
  return Number.isFinite(savedLimit) && savedLimit > 0 ? savedLimit : DEFAULT_LIMIT_BYTES;
}

export async function getTile(z, x, y) {
  try {
    const database = await openDatabase();
    const key = tileKey(z, x, y);
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const record = await requestAsPromise(store.get(key));
    if (record) store.put({ ...record, lastAccessed: Date.now() });
    return record?.blob || null;
  } catch {
    return null;
  }
}

export async function saveTile(z, x, y, blob) {
  if (!blob) return;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      key: tileKey(z, x, y),
      z,
      x,
      y,
      blob,
      size: blob.size,
      lastAccessed: Date.now(),
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    await enforceCacheLimit();
  } catch {
    // Tile caching should never prevent the online map from rendering.
  }
}

export async function getTileCacheSize() {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const records = await requestAsPromise(transaction.objectStore(STORE_NAME).getAll());
    return records.reduce((total, record) => total + (record.size || 0), 0);
  } catch {
    return 0;
  }
}

export async function enforceCacheLimit(limitBytes = getTileCacheLimit()) {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const records = await requestAsPromise(store.getAll());
    let size = records.reduce((total, record) => total + (record.size || 0), 0);

    for (const record of records.sort((a, b) => a.lastAccessed - b.lastAccessed)) {
      if (size <= limitBytes) break;
      store.delete(record.key);
      size -= record.size || 0;
    }
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return size;
  } catch {
    return 0;
  }
}

export async function setTileCacheLimit(limitBytes) {
  localStorage.setItem(LIMIT_KEY, String(limitBytes));
  return enforceCacheLimit(limitBytes);
}

export async function clearTileCache() {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    return true;
  } catch {
    return false;
  }
}

export function getTileUrl(z, x, y) {
  const subdomain = ["a", "b", "c"][(x + y) % 3];
  return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export async function getOrFetchTile(z, x, y) {
  const cached = await getTile(z, x, y);
  if (cached) return cached;

  const key = tileKey(z, x, y);
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const request = (async () => {
    try {
      const response = await fetch(getTileUrl(z, x, y));
      if (!response.ok) return null;
      const blob = await response.blob();
      await saveTile(z, x, y, blob);
      return blob;
    } catch {
      // Offline and transient network failures leave the map usable.
      return null;
    } finally {
      inFlightRequests.delete(key);
    }
  })();
  inFlightRequests.set(key, request);
  return request;
}

function longitudeToTile(lng, zoom) {
  return Math.floor(((lng + 180) / 360) * (2 ** zoom));
}

function latitudeToTile(lat, zoom) {
  const radians = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * (2 ** zoom));
}

export async function prefetchVisibleTiles(bounds, zoom) {
  const tasks = [];
  const seen = new Set();
  for (const level of [zoom - 1, zoom, zoom + 1]) {
    const tileZoom = Math.max(0, Math.min(19, level));
    const tileCount = 2 ** tileZoom;
    const west = longitudeToTile(bounds.getWest(), tileZoom);
    const east = longitudeToTile(bounds.getEast(), tileZoom);
    const north = latitudeToTile(bounds.getNorth(), tileZoom);
    const south = latitudeToTile(bounds.getSouth(), tileZoom);

    for (let x = west; x <= east && tasks.length < MAX_PREFETCH_TILES; x += 1) {
      for (let y = north; y <= south && tasks.length < MAX_PREFETCH_TILES; y += 1) {
        if (y < 0 || y >= tileCount) continue;
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        const key = tileKey(tileZoom, wrappedX, y);
        if (!seen.has(key)) {
          seen.add(key);
          tasks.push(() => getOrFetchTile(tileZoom, wrappedX, y));
        }
      }
    }
  }
  const results = [];
  let nextTask = 0;
  async function worker() {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask];
      nextTask += 1;
      results.push(await task());
    }
  }

  // Fetch a few tiles at once, instead of placing a burst of requests on OSM.
  const workers = Array.from(
    { length: Math.min(PREFETCH_CONCURRENCY, tasks.length) },
    worker,
  );
  await Promise.all(workers);
  return { requested: tasks.length, cached: results.filter(Boolean).length };
}
