# ReliefOpt — Team Task Assignment

**Three people. Three separate jobs. Nobody waits for anybody.**

|  Person |                                 What you own                                         |
|---------|--------------------------------------------------------------------------------------|
| **RKN** | Voice-to-text (speech recognition) + WebRTC peer-to-peer + offline sync queue        |
| **YSR** | Saving data permanently (database in the browser) + login + wiring pages to it       |
| **NFT** | The two math algorithms (urgency score, cargo packing) + making the app work offline |

---

## How to use this document

1. Find your name. Read **only your section** (plus "Ground rules" below).
2. Every task tells you: what to build, which files are yours, the exact commands to run,
   the exact shape of the data, and the traps that will waste your time.
3. Each task ends with a **checklist**. When every box is ticked, that task is done.
4. **If you use an AI assistant** (Claude, ChatGPT, Copilot): copy your entire section
   into it along with this sentence — *"This is my assigned task in a React 19 + Vite
   project. Help me implement it exactly as described, one task at a time."* Everything
   the AI needs is in your section.

---

## Ground rules (everybody reads this)

### 1. Only edit files that belong to you

The file list in your section is yours alone. **Do not edit files listed under someone
else's name**, even if you think it needs a small fix — message them instead. This is the
single rule that keeps three people from overwriting each other's work.

Files nobody owns (`src/App.jsx`, `src/main.jsx`, `src/routes.js`, `src/components/ui/*`,
`src/components/layout/*`): tell the group before touching them.

### 2. Work on your own git branch

### 3. Everybody gets data the same way

You never read `src/mockData.js` directly anymore. You call `useData()`:

```jsx
import { useData } from "../context/DataContext";

function MyComponent() {
  const { reports, addReport, ready } = useData();
  if (!ready) return <p>Loading…</p>;
  // reports is an array
}
```

**This already works before anyone starts** (see Day 0 below). YSR later changes *how* it
stores things, but the way you call it never changes. That is why nobody waits.

### 4. Run the app

```bash
npm install
npm run dev          # opens http://localhost:5173
```

---

## Day 0 — one-time setup (30 minutes, do this together)

Before anyone starts their own tasks, **these two files must exist on `main`**. Whoever is
free first creates them and pushes; the other two pull.

### File 1: `src/lib/contracts.js` (new file)

This is a documentation file. It defines the exact shape of every object the three of you
pass around. No logic, just comments — but everybody codes against it.

```js
/**
 * SHARED DATA SHAPES — do not change without telling the whole team.
 */

/**
 * @typedef {Object} UrgencyResult   // produced by NFT's src/lib/urgency.js
 * @property {number} totalScore     // 0-100
 * @property {"green"|"amber"|"red"} zone
 * @property {{label: string, value: string, points: number}[]} factors
 */

/**
 * @typedef {Object} VoiceExtraction // produced by RKN's src/lib/extract.js
 * @property {string} transcript
 * @property {string} language       // "bn" | "en"
 * @property {string|null} location  // must match a key in mockData.cityCoords
 * @property {number|null} waterLevelFt
 * @property {number|null} peopleCount
 * @property {boolean} childrenPresent
 * @property {boolean} elderlyPresent
 * @property {number|null} daysWithoutFood
 */

/**
 * @typedef {Object} SyncQueueEntry  // produced by RKN's src/lib/sync.js
 * @property {string} id
 * @property {string} actionType     // "ADD_REPORT" | "UPDATE_ITEM_QTY" | "MOVE_TASK" | ...
 * @property {Object} payload        // a real object, NOT a display string
 * @property {"Queued"|"Syncing"|"Failed"|"Done"} status
 * @property {string} timestamp      // ISO string
 */

/**
 * @typedef {Object} BoxPlacement    // produced by NFT's src/lib/packing.js
 * @property {string} boxId
 * @property {string} name
 * @property {string} category
 * @property {number} x  @property {number} y  @property {number} z   // cm, corner position
 * @property {number} w  @property {number} h  @property {number} d   // cm, size
 */

export {};
```

### File 2: `src/context/DataContext.jsx` (new file)

Create it with a **plain in-memory version** that already exposes the final API. YSR will
later replace the insides with a real database — **without changing any of these function
names or their arguments.**

```jsx
import { createContext, useContext, useState } from "react";
import * as mock from "../mockData";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [reports, setReports] = useState(mock.reports);
  const [tasks, setTasks] = useState(mock.tasks);
  const [inventory, setInventory] = useState(mock.inventory);
  const [notifications, setNotifications] = useState(mock.notifications);
  const [stockLog, setStockLog] = useState([]);
  const [mapPins, setMapPins] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);

  const value = {
    ready: true,
    reports, tasks, inventory, notifications, stockLog, mapPins, syncQueue,
    users: mock.users, teams: mock.teams, warehouses: [],

    addReport:      (r) => setReports((p) => [r, ...p]),
    updateReport:   (id, patch) => setReports((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)),
    addTask:        (t) => setTasks((p) => [t, ...p]),
    updateTask:     (id, patch) => setTasks((p) => p.map((t) => t.id === id ? { ...t, ...patch } : t)),
    updateItemQty:  (id, delta, reason, userName) => {
      setInventory((p) => p.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i));
      setStockLog((p) => [{ id: crypto.randomUUID(), itemId: id, change: delta, reason, user: userName, timestamp: new Date().toISOString() }, ...p]);
    },
    markNotificationRead: (id) => setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: !n.read } : n)),
    addMapPin:      (pin) => setMapPins((p) => [pin, ...p]),

    // sync queue — RKN uses these, YSR makes them persist
    enqueueSync:    (entry) => setSyncQueue((p) => [...p, entry]),
    updateSyncEntry:(id, patch) => setSyncQueue((p) => p.map((e) => e.id === id ? { ...e, ...patch } : e)),
    clearSyncEntry: (id) => setSyncQueue((p) => p.filter((e) => e.id !== id)),
    applyRemoteChange: (entry) => { /* YSR fills this in; RKN calls it for incoming P2P data */ },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
```

Then wrap the app once, in `src/App.jsx`, inside `<OfflineProvider>`:

```jsx
<OfflineProvider>
  <DataProvider>
    <AuthRoutes />
  </DataProvider>
</OfflineProvider>
```

**Day 0 checklist**
- [ ] `src/lib/contracts.js` exists on `main`
- [ ] `src/context/DataContext.jsx` exists on `main`
- [ ] `<DataProvider>` wraps the app in `src/App.jsx`
- [ ] `npm run dev` still loads every page with no console errors
- [ ] All three members have pulled `main` and branched off it

---
---

# 👤 RKN 

You have the two hardest features. Take them one at a time, in the order given.

### Files you own (nobody else edits these)

```
src/lib/speech.js                            (new)
src/lib/extract.js                           (new)
src/lib/p2p.js                               (new)
src/lib/sync.js                              (new)
src/components/map/VoiceReportModal.jsx      (rewrite)
src/components/sync/PeerPanel.jsx            (rewrite)
src/components/sync/OfflineQueue.jsx         (rewrite)
src/components/sync/SyncIndicator.jsx        (edit)
src/context/OfflineContext.jsx               (edit)
src/pages/MapPage.jsx                        (edit)
```

---

## Task R1 — Make the microphone actually work (voice-to-text)

### What this is, in plain English

Right now, when you press the microphone button on the Map page, the app **pretends**. It
waits 2 seconds and then shows a Bangla sentence that is typed directly into the code —
the same sentence every single time. Look at
`src/components/map/VoiceReportModal.jsx` lines 12–19 and you will see it.

Your job: make it real. A relief worker presses the mic, **speaks Bangla out loud**, and
the app writes down what they actually said, pulls the important numbers out of it, and
files a real emergency report.

This must work **with no internet**, so the speech recognition runs inside the browser
itself using a downloaded AI model (Whisper).

### Step 1 — Install the AI library

```bash
npm install @huggingface/transformers
```

### Step 2 — Create `src/lib/speech.js`

Two jobs: record audio from the microphone, and turn it into text.

```js
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;   // always fetch from the internet the first time

const MODEL_ID = "Xenova/whisper-base";
let transcriber = null;

/** Loads the AI model. Call once. onProgress gets {progress: 0-100}. */
export async function loadModel(onProgress) {
  if (transcriber) return transcriber;
  transcriber = await pipeline("automatic-speech-recognition", MODEL_ID, {
    dtype: "q8",
    device: (navigator.gpu ? "webgpu" : "wasm"),
    progress_callback: onProgress,
  });
  return transcriber;
}

/** Starts recording. Returns an object with a .stop() that resolves to a Blob. */
export async function startRecording() { /* MediaRecorder — see below */ }

/** Blob -> plain text string. */
export async function transcribe(blob) { /* see the CRITICAL trap below */ }
```

### ⚠️ CRITICAL TRAP — read this or you will lose a day

**Whisper cannot read the audio file the microphone gives you.** `MediaRecorder` produces
compressed `audio/webm` at 48,000 Hz. Whisper *only* accepts a raw `Float32Array` of
**mono audio at exactly 16,000 Hz**. If you skip this conversion you get gibberish or a
crash, and the error message will not tell you why.

Convert it like this — this exact code:

```js
export async function transcribe(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });   // 16000 is mandatory
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const audio = decoded.getChannelData(0);                    // channel 0 = mono

  const model = await loadModel();
  const result = await model(audio, {
    language: "bn",        // Bangla. Use "en" if the user picked English.
    task: "transcribe",    // NOT "translate" — translate would give you English
    chunk_length_s: 30,
    return_timestamps: false,
  });
  return result.text;
}
```

### Other traps

| Trap | What happens | Fix |
|---|---|---|
| Mic on `http://` (not localhost) | `getUserMedia` throws instantly | Only test on `localhost` or `https` |
| First load downloads ~40 MB | User thinks the app froze | Show a progress bar using `progress_callback` |
| Recording longer than ~15 s | Very slow on phones | Cap recording at 15 seconds with a timer |
| Model download needs internet **once** | Fails completely offline on a fresh device | Say so in the UI; keep a "Type it instead" fallback box |
| You forget `language: "bn"` | Whisper guesses, often wrongly | Always pass it |

### Step 3 — Create `src/lib/extract.js` (pull the facts out of the sentence)

Whisper gives you a sentence. You need numbers out of it.

**⚠️ Important thing people get wrong:** Whisper writes Bangla in **Bengali script**
(`পানি`), *not* in romanised "Banglish" (`pani`). But field workers might type Banglish in
the fallback box. **So you must match both spellings**, and you must convert Bengali
digits to normal digits.

```js
const BN_DIGITS = { "০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9" };
export const normaliseDigits = (s) => s.replace(/[০-৯]/g, (d) => BN_DIGITS[d]);

const KEYWORDS = {
  water:    ["পানি", "পানির", "জল", "pani", "panir", "jol", "water"],
  feet:     ["ফুট", "foot", "feet", "fut"],
  people:   ["জন", "মানুষ", "লোক", "jon", "manush", "lok", "people"],
  children: ["বাচ্চা", "শিশু", "baccha", "bacha", "shishu", "children", "kids"],
  elderly:  ["বৃদ্ধ", "বয়স্ক", "briddho", "boyosko", "elderly", "old"],
  food:     ["খাবার", "খাওয়া", "khabar", "khawa", "food"],
  days:     ["দিন", "din", "day", "days"],
};

/** @returns {import('./contracts').VoiceExtraction} */
export function extractFields(rawTranscript) { /* ... */ }
```

Rules to implement:
- `waterLevelFt` → the number that appears **nearest to** a `water` or `feet` keyword.
- `peopleCount` → the number nearest a `people` keyword.
- `childrenPresent` / `elderlyPresent` → `true` if any of those keywords appear at all.
- `daysWithoutFood` → the number nearest a `days` keyword **when** a `food` keyword is
  also in the sentence.
- `location` → check the sentence against every key of `cityCoords` in `src/mockData.js`
  (case-insensitive). Return `null` if nothing matches — **do not guess**.
- Anything you cannot find must be `null`, never `0`. `0` means "confirmed zero".

Test sentence: `"মিরপুরে পানি ৪ ফুট, ১২ জন মানুষ আটকা, বাচ্চা আছে"` should give
`{ location: "Mirpur", waterLevelFt: 4, peopleCount: 12, childrenPresent: true }`.

### Step 4 — Rewrite `VoiceReportModal.jsx`

Delete the fake transcript (lines 12–19). New flow:

`idle` → `loading model` (progress bar) → `recording` (with a timer) → `transcribing`
(spinner) → `done`

On `done`, show the **editable** transcript and the extracted fields, then on confirm:

1. Build a report object and call `addReport(report)` from `useData()` — **a real report
   that shows up on the `/reports` page.** This is the part the current code is missing
   entirely; today it only drops a map pin.
2. Call `addMapPin(pin)` so it also appears on the map.
3. Set `report.urgencyScore` using NFT's `calculateUrgency()` from `src/lib/urgency.js`.
   **If NFT hasn't finished yet, just use `0` and add a `// TODO` comment** — swap it in
   later. Do not wait for them.

### ✅ Task R1 checklist

- [ ] `npm install @huggingface/transformers` done and committed to `package.json`
- [ ] Pressing the mic asks for real microphone permission
- [ ] A progress bar shows while the model downloads the first time
- [ ] I spoke a Bangla sentence and the app printed **what I actually said** (not the old fixed sentence)
- [ ] Speaking a *different* sentence gives a *different* transcript
- [ ] The audio is converted to 16,000 Hz mono before reaching Whisper
- [ ] `extractFields()` returns the correct values for the test sentence above
- [ ] Missing values come back as `null`, not `0`
- [ ] Bengali digits (`১২`) are converted to `12`
- [ ] Confirming creates a report that **appears in the table on `/reports`**
- [ ] It also drops a pin on the map
- [ ] There is a "type it manually" fallback if the mic or model fails
- [ ] Recording is capped at 15 seconds
- [ ] No red errors in the browser console

---

## Task R2 — Real device-to-device connection (WebRTC)

### What this is, in plain English

The pitch for this whole project: during a flood, phones talk **directly to each other**
over a local Wi-Fi router, with no internet and no mobile towers.

Right now this is 100% fake. `src/components/sync/PeerPanel.jsx` shows three made-up
devices from a list, and pressing "Share Data" just waits 2 seconds and shows a success
message. There is no networking code anywhere in the project.

Your job: make two browser windows genuinely connect and pass data between them.

### ⚠️ Understand this limitation before you start

For two devices to start talking, they must first swap a small text blob called an "SDP
offer". Normally a server in the middle passes it along. **We decided not to build a
server**, so you will provide two ways to swap it by hand:

- **Mode A — same computer, two browser tabs.** Uses `BroadcastChannel`, a built-in
  browser feature. Fully automatic. **This is your demo. Build this one first and get it
  working.**
- **Mode B — two different phones/laptops.** Shows the offer text on screen to copy-paste
  (or as a QR code) into the other device. Clunky, but genuinely cross-device.

The actual connection and data transfer are **completely real in both modes.** Only the
initial handshake is done by hand. Say this honestly in your report — do not claim you
built a full mesh network.

### Step — Create `src/lib/p2p.js`

```js
// No STUN/TURN servers: we only care about the local network.
const RTC_CONFIG = { iceServers: [] };

export function createHost(onMessage, onStateChange) { /* ... */ }
export function createGuest(onMessage, onStateChange) { /* ... */ }
export function send(connection, dataObject) { /* ... */ }
```

The handshake order — **do not reorder these**:

1. Host: `pc.createDataChannel("reliefopt", { ordered: true })`
2. Host: `createOffer()` → `setLocalDescription()`
3. **Host: wait until `pc.iceGatheringState === "complete"`** (trap below)
4. Host sends the offer to the guest
5. Guest: `setRemoteDescription(offer)` → `createAnswer()` → `setLocalDescription()`
6. Guest waits for ICE complete, sends the answer back
7. Host: `setRemoteDescription(answer)`
8. Both wait for `channel.readyState === "open"`

### Traps

| Trap | What happens | Fix |
|---|---|---|
| Sending the offer before ICE finishes | Connection silently never opens | Wait for `iceGatheringState === "complete"` before sharing the offer |
| Sending before the channel is open | Throws `InvalidStateError` | Always check `channel.readyState === "open"` first |
| Sending more than ~64 KB at once | Channel dies with no error | Split big payloads into 16 KB chunks and reassemble |
| Sending a JS object directly | Fails | `JSON.stringify()` on send, `JSON.parse()` on receive |
| Two tabs both acting as Host | Nothing connects | One tab clicks "Host", the other clicks "Join" |

### What to actually send

Send your sync queue (Task R3) plus any changed records:

```json
{ "type": "SYNC_PUSH", "from": "deviceName", "entries": [ /* SyncQueueEntry[] */ ] }
```

On receiving, loop over entries and call `applyRemoteChange(entry)` from `useData()`.
If YSR hasn't implemented that yet it is an empty function — **that is fine, it will start
working the moment they finish. Do not wait for them.**

### Step — Rewrite `PeerPanel.jsx`

Delete the fake `peerDevices` import and the fake `setTimeout`. Show real connection state:
`disconnected` → `connecting` → `connected`, a Host button, a Join button, and a live log
of messages sent/received.

### ✅ Task R2 checklist

- [ ] `src/lib/p2p.js` exists and uses a real `RTCPeerConnection`
- [ ] Two browser tabs connect automatically via `BroadcastChannel` (Mode A)
- [ ] In DevTools console, `channel.readyState` prints `"open"`
- [ ] Typing a message in tab A makes it appear in tab B
- [ ] Creating a report in tab A makes it appear in tab B's `/reports` page
- [ ] Manual copy-paste of the offer/answer works between two devices (Mode B)
- [ ] Code waits for ICE gathering to complete before sharing the offer
- [ ] Payloads over 64 KB are chunked and reassembled correctly
- [ ] `PeerPanel.jsx` no longer imports `peerDevices` from `mockData.js`
- [ ] Disconnecting one tab updates the other tab's status to disconnected
- [ ] The honest limitation (manual handshake) is written down in the report

---

## Task R3 — Real offline queue

### What this is, in plain English

When a worker has no signal and edits something, the change must be **remembered** and
sent later when signal returns. Right now `src/components/sync/OfflineQueue.jsx` is fake —
its "Retry All" button literally rolls a dice (`Math.random() > 0.3`) to decide whether
things succeeded.

### Build `src/lib/sync.js`

```js
export function makeEntry(actionType, payload) {
  return { id: crypto.randomUUID(), actionType, payload,
           status: "Queued", timestamp: new Date().toISOString() };
}
export async function drainQueue(queue, applyFn, updateFn) { /* ... */ }
export function getStatus(isOffline, pendingCount) { /* "online" | "pending" | "offline" */ }
```

Rules:
- **`payload` must be a real object**, e.g. `{ itemId: "inv3", delta: -5, reason: "Distribution" }`.
  The current code stores a display string like `"Rice qty updated to 2,450 kg"`, which is
  useless because you cannot replay it.
- When `isOffline` is true, any change goes on the queue instead of being applied directly.
- When the browser comes back online, drain automatically.
- Update `SyncIndicator.jsx` to show the **real** `pendingCount` and a **real**
  `lastSyncedAt` time.

### ✅ Task R3 checklist

- [ ] Queue entries store an object payload, not a sentence
- [ ] Going offline (DevTools → Network → Offline) and making a change adds a real entry
- [ ] The sync pill shows the correct number of pending changes
- [ ] Going back online drains the queue automatically
- [ ] "Retry All" replays the real payloads — no `Math.random()` anywhere
- [ ] `lastSyncedAt` updates to the real time after a successful drain
- [ ] `OfflineQueue.jsx` no longer imports `offlineQueue` from `mockData.js`
- [ ] Queued changes survive a page refresh

---
---

# 👤 YSR

You are the reason the app remembers anything. **This is the most important foundation
work in the project**, even though it is the least flashy.

### Files you own

```
src/lib/db.js                          (new)
src/context/DataContext.jsx            (replace the insides — keep the API identical)
src/context/AuthContext.jsx            (edit)
src/mockData.js                        (edit)
src/components/inventory/*             (all four files)
src/components/users/*                 (all three files)
src/pages/InventoryPage.jsx            (edit)
src/pages/UsersPage.jsx                (edit)
src/pages/LoginPage.jsx                (edit)
src/pages/DashboardPage.jsx            (edit)
src/pages/TasksPage.jsx                (edit)
```

---

## Task Y1 — Make data survive a refresh

### What this is, in plain English

Try it right now: go to `/submit-report`, fill in the form, submit it. You get a nice green
"success" message. Now go to `/reports` — **your report is not there.** It was thrown away
the instant you submitted it.

Every single page in this app does the same thing: it grabs a copy of the fake data from
`src/mockData.js`, keeps it in memory, and forgets everything when you navigate away or
refresh. Nothing is ever saved.

Your job: store everything in **IndexedDB** — a real database built into every browser,
which works with no internet.

### Step 1 — Install a helper

```bash
npm install idb
```

(You *can* use raw IndexedDB, but its API is genuinely unpleasant. `idb` is 1.6 KB.)

### Step 2 — Create `src/lib/db.js`

```js
import { openDB } from "idb";

const DB_NAME = "reliefopt";
const DB_VERSION = 1;
const STORES = ["reports", "tasks", "inventory", "users", "teams",
                "warehouses", "notifications", "stockLog", "mapPins",
                "syncQueue", "meta"];

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

export async function getAll(store)      { return (await getDB()).getAll(store); }
export async function put(store, record) { return (await getDB()).put(store, record); }
export async function remove(store, id)  { return (await getDB()).delete(store, id); }
export async function seedOnce() { /* see below */ }
```

### Traps

| Trap | What happens | Fix |
|---|---|---|
| Every record **must** have an `id` | `put()` throws | `keyPath: "id"` requires it — generate with `crypto.randomUUID()` |
| Adding a new store later | New store silently missing | You **must** bump `DB_VERSION` to 2, 3, … |
| Re-seeding on every load | User edits get wiped every refresh | Write `{id:"seeded", value:true}` into `meta` and check it first |
| IndexedDB is asynchronous | Pages render before data arrives | Expose `ready: false` until hydration finishes; pages show a loader |
| Testing with old data | Confusing stale results | DevTools → Application → IndexedDB → Delete database |

### Step 3 — Rewrite the insides of `DataContext.jsx`

**Keep every function name and every argument exactly as it is in the Day-0 file.** RKN and
NFT are already calling these. If you rename `addReport` to `createReport`, you break both
of their branches.

- On mount: `seedOnce()`, then load every store into state, then set `ready = true`.
- Every mutation: update React state **and** `put()` into IndexedDB.
- Implement `applyRemoteChange(entry)` — a `switch` on `entry.actionType` that applies
  `entry.payload`. RKN calls this with incoming peer data.

### ✅ Task Y1 checklist

- [ ] `npm install idb` done and committed
- [ ] DevTools → Application → IndexedDB shows a `reliefopt` database with all 11 stores
- [ ] Submitting a report on `/submit-report` makes it appear on `/reports`
- [ ] **Pressing F5 — the new report is still there**
- [ ] Editing inventory quantity survives a refresh
- [ ] Moving a task on the kanban board survives a refresh
- [ ] Closing and reopening the browser keeps everything
- [ ] Deleting the database and reloading re-seeds the demo data cleanly
- [ ] Every function name in `DataContext` is unchanged from the Day-0 file
- [ ] `ready` is `false` while loading, `true` after
- [ ] `applyRemoteChange()` is implemented, not empty

---

## Task Y2 — Fix the broken links between records + add Warehouses

### What this is, in plain English

Look at `src/mockData.js`. A task says `assignedTo: "Kamal Hossain"` — a person's **name**,
typed as text. An inventory item says `warehouse: "Warehouse A"`.

This is like a library filing books by the author's name written in pencil. If two people
share a name, or someone's name is spelled differently, the link breaks. Real systems link
by **ID numbers**.

Also: **there is no Warehouse record at all.** "Warehouse A" through "Warehouse E" only
exist as text on inventory rows. They have no ID, no location on the map, no manager. The
class diagram says `Warehouse` should be a real thing with `getInventory()` and
`getLowStockItems()`.

### What to do

Add a `warehouses` array to `mockData.js`:

```js
export const warehouses = [
  { id: "w1", name: "Warehouse A", lat: 23.8103, lng: 90.4125, managerId: "u2" },
  // ... B through E, using real Bangladesh coordinates
];
```

Then add ID fields **alongside** the existing name fields (do not delete the old ones yet):

| Record | Add this |
|---|---|
| `InventoryItem` | `warehouseId: "w1"` |
| `Task` | `assignedTeamId: "t1"`, `assignedUserId: "u3"` |
| `Team` | `leaderId: "u3"`, `location: {lat, lng}`, `activeTaskId: "task1"` |
| `User` | `teamId: "t1"`, `username: "kamal"` |
| `Report` | `submittedById: "u3"`, `district: "Sylhet"`, `location: {lat, lng}` |

### 🔑 The clever bit that stops you breaking other people's pages

Other pages display `report.submittedBy` and `item.warehouse` as text. If you delete those
fields, **NFT's and RKN's pages break.**

So: have `DataContext` hand out **enriched** records — the ID fields *and* the display
names, filled in automatically:

```js
const enrichedReports = reports.map((r) => ({
  ...r,
  submittedBy: users.find((u) => u.id === r.submittedById)?.name ?? "Unknown",
}));
```

Now the data is properly ID-linked underneath, and nobody else's code changes at all.

### ✅ Task Y2 checklist

- [ ] `warehouses` array exists with 5 entries, each with an id and real coordinates
- [ ] Every inventory item has a `warehouseId` pointing at a real warehouse
- [ ] Every task has `assignedTeamId` and `assignedUserId`
- [ ] Every user has `teamId` and `username`
- [ ] Every report has `submittedById` and a `location` with lat/lng
- [ ] `DataContext` returns enriched records with display names filled in
- [ ] **Every page still looks exactly the same as before** — no visible change
- [ ] `getWarehouseInventory(id)` and `getLowStockItems(id)` helper functions work
- [ ] No page anywhere shows "undefined" or "Unknown" where a name should be

---

## Task Y3 — Real login + a working stock history

### Part A: Login

Open `src/context/AuthContext.jsx` line 16. `login(role)` takes **only a role**. It
completely ignores the username and password the person typed. Anyone can log in as an
admin by picking it from a dropdown.

Fix it:
- `login(username, password)` returns `true` or `false`
- Look the user up by `username` in the users list
- Password for the demo: `"reliefopt"` for everyone (write this in the README)
- Wrong details → show a red error, stay on the login page
- Save the session to `localStorage` under `reliefopt-session` so **refreshing does not
  log you out** (it currently does)
- Deactivated users (`status: "Inactive"`) cannot log in

### Part B: Stock history

Open `src/components/inventory/StockLog.jsx` lines 4–15. The history is **typed directly
into the component**. Changing stock on the inventory page does not add a row.

Fix it: read `stockLog` from `useData()`, and make `updateItemQty()` write a real entry
every time — with the change amount, the reason, and **who did it** (from `useAuth()`).

### ✅ Task Y3 checklist

- [ ] `login()` takes a username and a password
- [ ] Wrong password shows an error and does not log you in
- [ ] Correct details log you in as **that specific person**, with their real role
- [ ] Refreshing the page keeps you logged in
- [ ] Sign Out clears the session and returns to `/login`
- [ ] Inactive users are refused
- [ ] Demo usernames and the password are written in `README.md`
- [ ] `StockLog.jsx` no longer has a hardcoded array
- [ ] Changing a quantity adds a real row showing amount, reason, and the logged-in user
- [ ] Stock history survives a refresh

---
---

# 👤 NFT

You own the **two algorithms** — the parts that make this a software *engineering* project
rather than a set of forms. Examiners look hardest at these.

### Files you own

```
src/lib/urgency.js                      (new)
src/lib/packing.js                      (new)
src/lib/tileCache.js                    (new)
src/components/reports/*                (all three files)
src/components/cargo/*                  (both files)
src/components/map/MapView.jsx          (edit)
src/pages/ReportsPage.jsx               (edit)
src/pages/SubmitReportPage.jsx          (edit)
src/pages/CargoPage.jsx                 (edit)
src/pages/SettingsPage.jsx              (edit)
vite.config.js                          (edit)
index.html                              (edit)
public/                                 (new folder)
```

---

## Task N1 — The Smart Urgency Scoring Algorithm

### What this is, in plain English

A commander gets 50 emergency reports at once and must decide **who to save first**. This
algorithm scores each crisis from 0 to 100 so the worst ones float to the top.

Right now this does not exist. The only scoring in the whole project is this single line in
`src/components/reports/ReportForm.jsx` line 43:

```js
urgencyScore: Math.min(100, form.severity * 20 + (childrenPresent ? 10 : 0) + (elderlyPresent ? 10 : 0))
```

That ignores how long people have gone without food, how deep the water is, how many people
are trapped, and how far away help is — the exact factors the project design lists.

**Good news:** the display component `UrgencyGauge.jsx` is already built and already
accepts a `factors` list. Nothing currently passes it any. You are filling in the missing
brain, not building the face.

### Create `src/lib/urgency.js`

```js
/** @returns {import('./contracts').UrgencyResult} */
export function calculateUrgency({
  daysWithoutFood,    // number of days, or null
  waterLevelFt,       // flood depth in feet, or null
  peopleCount,        // people affected, or null
  childrenPresent,    // boolean
  elderlyPresent,     // boolean
  distanceFromAidKm,  // km to nearest warehouse/team, or null
}) { /* ... */ }
```

### The scoring table — implement exactly this

The five weights **must add up to 100**. Write this table into your report; examiners ask
where the numbers came from.

| Factor | Max | Rule |
|---|---|---|
| Days without food | **25** | 0 days → 0 · 1 → 8 · 2 → 15 · 3 → 20 · 4+ → 25 |
| Water level (ft) | **20** | 0 → 0 · under 2 → 6 · 2–4 → 12 · 4–6 → 17 · over 6 → 20 |
| People affected | **20** | under 10 → 4 · 10–49 → 8 · 50–199 → 13 · 200–999 → 17 · 1000+ → 20 |
| Vulnerable people | **20** | children → +12 · elderly → +8 (both → 20) |
| Distance from aid (km) | **15** | under 5 → 0 · 5–14 → 5 · 15–29 → 10 · 30+ → 15 |

Return `zone` as: **under 40 → `"green"`, 40 to 69 → `"amber"`, 70 and above → `"red"`.**

### ⚠️ Traps

- **The zone thresholds must be exactly 40 and 70.** `UrgencyGauge.jsx` line 3 already
  splits its coloured bar at those points. Different numbers = the number and the colour
  disagree on screen.
- **`null` is not `0`.** `null` means "we didn't ask" → score 0 points for it but say
  `"Unknown"` in the factors list. `0` means "confirmed none".
- Return the `factors` array even when everything is `null`, so the gauge has rows to show.
- Never return above 100 or below 0.

### Then wire it up

1. Add the five new inputs to `ReportForm.jsx` step 2 (days without food, water level,
   distance from aid — `peopleCount` and the two checkboxes already exist).
2. Delete the line-43 formula and call `calculateUrgency()` instead.
3. Show `<UrgencyGauge score={...} factors={...} />` inside `ReportDrawer.jsx`.
4. Add an "Urgency" sortable column to the table on `ReportsPage.jsx`, sorted high→low by
   default.

### ✅ Task N1 checklist

- [ ] `src/lib/urgency.js` exists and exports `calculateUrgency`
- [ ] The five weights add up to exactly 100
- [ ] A worst-case input (4+ days, 7 ft, 5000 people, children + elderly, 40 km) returns 100
- [ ] A best-case input (all zero/false) returns 0
- [ ] Zones flip at exactly 40 and 70
- [ ] `null` inputs score 0 points and display as "Unknown"
- [ ] `ReportForm.jsx` line 43's old formula is **deleted**
- [ ] Two reports with different inputs get visibly different scores
- [ ] The gauge in the report drawer shows the breakdown of all five factors
- [ ] The reports table has a sortable Urgency column
- [ ] The scoring table is copied into the project report

---

## Task N2 — The Cargo Packing Optimizer

### What this is, in plain English

A worker has a truck and a pile of relief boxes. Which boxes fit, and how should they be
stacked to waste the least space?

**Warning — this one looks finished but is not.** Open
`src/components/cargo/PackingCanvas.jsx` lines 22–59. It draws boxes in a **fixed
3-column grid**. It never looks at how big any box actually is. A 10 cm medicine box and a
200 cm tent are drawn identically. The 1.5-second "Optimizing…" spinner in
`CargoInputForm.jsx` is decoration — no algorithm runs.

The volume percentage and total weight *are* calculated correctly. Keep those.

### Create `src/lib/packing.js`

```js
/** @returns {{placements: BoxPlacement[], rejected: object[],
 *             volumeUtilized: number, totalWeight: number, fits: boolean}} */
export function optimize(vehicle, boxes) { /* ... */ }
```

Use a **shelf / layer packing** algorithm (this is a well-known method — say its name in
your report):

1. Expand quantities: a box with `quantity: 3` becomes 3 separate boxes.
2. Sort largest volume first.
3. Place boxes left to right along the width (X).
4. When the next box would stick out past the vehicle's width, start a new row further
   back (Y), at a depth equal to the deepest box in the finished row.
5. When you run out of length, start a new layer on top (Z), at the height of the tallest
   box in the finished layer.
6. If a box does not fit anywhere, or adding it exceeds `maxWeight`, put it in `rejected`.

### 🚨 THE TRAP THAT WILL BREAK THIS — units

**The vehicle is measured in METRES. The boxes are measured in CENTIMETRES.**

Look at `CargoInputForm.jsx` line 68: vehicle fields are labelled `(m)`. The item fields
are labelled just `L`, `W`, `H` and the demo script says centimetres.

A 6.2 m truck is **620 cm**. If you compare `6.2` against a `50` cm box, the algorithm will
decide *nothing fits* and you will spend hours confused.

**Convert everything to centimetres as the very first thing `optimize()` does,** and label
the form fields clearly so the user knows which unit to type.

### Other things to do

- Add `maxWeight` to each vehicle in `mockData.cargoVehicles`
  (Relief Truck ≈ 3000 kg, Cargo Van ≈ 1200 kg, Heavy Hauler ≈ 8000 kg).
  **Ask YSR to add it** — `mockData.js` is their file. Meanwhile use a local default.
- Rewrite `PackingCanvas.jsx` to draw the **real** `x/y/z/w/h/d` values.
  Top view uses x and y; side view uses x and z. Both come from the same numbers.
- Show rejected boxes in a red "Could not fit" list with the reason.
- Add an `export()` — a Print button and a JSON download.

### ✅ Task N2 checklist

- [ ] `src/lib/packing.js` exists and exports `optimize`
- [ ] Everything is converted to centimetres before any comparison
- [ ] Changing a box's dimensions **visibly changes the drawing**
- [ ] The 3-column grid in `PackingCanvas.jsx` lines 22–59 is **gone**
- [ ] Top view and side view are both drawn from the same placement data
- [ ] Boxes never overlap and never stick out past the vehicle outline
- [ ] Too many boxes → the extras appear in the rejected list, not on the drawing
- [ ] Exceeding `maxWeight` rejects boxes and shows a warning
- [ ] Volume percentage matches what is drawn
- [ ] Print and JSON export both work
- [ ] The algorithm's name is written in the project report

---

## Task N3 — Make the app actually work offline

### What this is, in plain English

The headline claim of this project is *"works with no internet."* **Right now it does not.**
Turn off your Wi-Fi, refresh the page, and you get a browser error page. Two reasons:

1. There is **no service worker** — the little background program that lets a website load
   without a network.
2. The map (`src/components/map/MapView.jsx` line 12) downloads its tiles live from
   openstreetmap.org every time.

Also: `src/manifest.json` is in the wrong folder, and the two icon files it points at
(`/icons/icon-192.png`, `/icons/icon-512.png`) **do not exist**.

### Part A — Service worker

```bash
npm install -D vite-plugin-pwa
```

1. Create a `public/` folder at the project root.
2. Move `src/manifest.json` → `public/manifest.json`.
3. Actually create `public/icons/icon-192.png` and `icon-512.png` (any ReliefOpt logo).
4. In `index.html`, change the link to `href="/manifest.json"`.
5. In `vite.config.js`, add the plugin alongside the existing `react()` and `tailwindcss()`:

```js
VitePWA({
  registerType: "autoUpdate",
  manifest: false,                       // we use our own public/manifest.json
  workbox: {
    globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
  devOptions: { enabled: true },         // lets you test without building
})
```

**⚠️ Trap:** service workers normally do **not** run under `npm run dev`. Either set
`devOptions.enabled: true` as above, or test properly with:

```bash
npm run build && npm run preview
```

### Part B — Map tiles

Create `src/lib/tileCache.js`. Intercept each map tile: check IndexedDB (database
`reliefopt-tiles`, key `"z/x/y"`) first; if it is missing, download it, show it, and save
the Blob for next time.

Then connect the **Settings page slider** — `SettingsPage.jsx` line 89 has a "Map tile
cache size" slider that currently controls **nothing at all**. Make it a real limit, and
delete the oldest tiles when it is exceeded.

Add a "Download this area for offline use" button that pre-fetches the visible region.

**⚠️ Be polite:** OpenStreetMap's servers are free and donation-funded. Do not mass-download.
Limit pre-caching to the visible box and about 3 zoom levels.

### ✅ Task N3 checklist

- [ ] `public/manifest.json` exists (not in `src/`)
- [ ] `public/icons/icon-192.png` and `icon-512.png` really exist
- [ ] `index.html` points at `/manifest.json`
- [ ] `npm run build && npm run preview` works with no errors
- [ ] DevTools → Application → Service Workers shows one **activated and running**
- [ ] **Network → Offline, then hard refresh — the app still loads** (this is the whole point)
- [ ] Chrome offers "Install app" in the address bar
- [ ] Map tiles you have already viewed still display when offline
- [ ] The Settings cache slider actually limits stored tiles
- [ ] Oldest tiles are deleted when the limit is passed
- [ ] "Download this area" pre-caches the visible region
- [ ] Lighthouse → PWA audit passes the installability checks

---
---

# 🏁 Final integration (all three, together, at the end)

Merge all branches into `main`, then run through this as a group:

- [ ] `npm install && npm run build` completes with no errors
- [ ] Log in with a real username and password (YSR)
- [ ] Submit a report → it appears in the table → **refresh → still there** (YSR)
- [ ] The report shows a real urgency score with a five-factor breakdown (NFT)
- [ ] Speak a Bangla sentence → a real report is created **and scored** (RKN + NFT)
- [ ] Add cargo boxes → optimise → the drawing matches the real dimensions (NFT)
- [ ] Go offline → the app still loads → make a change → it queues (NFT + RKN)
- [ ] Come back online → the queue drains (RKN)
- [ ] Open a second tab → connect P2P → a change in one appears in the other (RKN)
- [ ] Switch between all three roles — the right pages hide and show
- [ ] No red errors in the console on any page
- [ ] `README.md` lists the demo usernames and password

### For the written report — be honest about these

1. **The P2P handshake is manual.** The connection and data transfer are real WebRTC, but
   with no signalling server the initial offer is swapped via `BroadcastChannel` (same
   device) or copy-paste (across devices).
2. **The speech model needs internet once.** Whisper downloads ~40 MB on first use, then
   works fully offline forever after.
3. **Whisper writes Bengali script, not "Banglish".** The keyword extractor handles both
   spellings, but the transcript itself will come out in Bengali letters.
4. **There is no cloud server.** IndexedDB in the browser is the only database.
   `syncWithCloud()` is built and working against local storage, ready for a real backend
   to be plugged in later.
