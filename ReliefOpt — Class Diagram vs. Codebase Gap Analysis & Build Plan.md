# ReliefOpt — Class Diagram vs. Codebase Gap Analysis & Build Plan

## Context

ReliefOpt is a SWE-course project: a private, offline-capable PWA for disaster relief
coordination in Bangladesh. A class diagram has been drawn with 17 classes. The current
codebase is a **React 19 + Vite + Tailwind v4 front-end only** — no backend, no database,
no persistence. Every page imports `src/mockData.js` and holds it in local `useState`,
so nothing survives navigation or reload.

The goal of this document: state exactly which diagram classes are realised in code,
which are realised but structurally wrong, and which do not exist at all — then give a
build order that closes the gap.

**Verdict in one line:** the UI shell (Levels 1–3) is largely complete and looks finished;
the *system* underneath it (Levels 4–5: persistence, urgency algorithm, real packing,
service worker, WebRTC, speech) is almost entirely unbuilt.

---

## Current stack (verified)

| Item | Reality |
|---|---|
| Framework | React 19, Vite 6, react-router-dom 7, Tailwind v4, Recharts, Leaflet + react-leaflet |
| Language | Plain JavaScript (`.jsx`) — no TypeScript, so no diagram types are enforced anywhere |
| Backend | **None.** No `server/`, no API client, zero `fetch()` calls in `src/` |
| Database | **None.** No IndexedDB, no SQLite WASM |
| Persistence | `localStorage` used for exactly 2 things: theme (`ThemeContext.jsx`) and sidebar collapse (`AppLayout.jsx`); `sessionStorage` for one dismissed banner |
| Service worker | **None.** `src/manifest.json` exists and is linked from `index.html`, but there is no SW, no registration, no icon files |
| Data source | `src/mockData.js` (818 lines) — 11 static arrays |
| LOC | ~4,000 across 68 files |

---

## Class-by-class status

Legend: ✅ done · ⚠️ exists but needs changing · ❌ not built

### ✅ Done (structure matches diagram closely enough)

| Class | Where | Notes |
|---|---|---|
| **MapPin** | [Markers.jsx](src/components/map/Markers.jsx), [MapFilters.jsx](src/components/map/MapFilters.jsx) | Category-coded markers + filters + severity zones all render. No `MapPin` entity, but the diagram class is effectively satisfied by the render layer. |
| **Notification** | [NotifDrawer.jsx](src/components/notifications/NotifDrawer.jsx), `mockData.notifications` | `markRead()` works, tabs work. Only missing field: `userId` (notifications are global, not per-user). |
| **SupplyBox** | [CargoInputForm.jsx](src/components/cargo/CargoInputForm.jsx) | All 8 fields present as form rows. Not persisted, not linked to `InventoryItem`. |

### ⚠️ Exists but needs changing

| Class | Gap |
|---|---|
| **User** | `mockData.users` has `name`/`team`/`status`/`lastLogin`/`phone`. Missing `username`; `team` is a **display string**, diagram says `teamId`. `AuthContext.login(role)` ignores username+password entirely — diagram says `login(username, password): boolean`. `switchRole()` exists as `setRole()`. |
| **Team** | Data exists but `leader` is a name string (diagram: `leaderId`), `location` is `"Sylhet"` (diagram: `GeoPoint`), `activeTask` is prose (diagram: `activeTaskId`). All three methods (`addMember`/`getMembers`/`updateStatus`) are unimplemented. |
| **Report** | Closest match in the codebase. But: `location` is a city string, diagram splits `location: GeoPoint` + `district`. `urgencyScore` is a **hardcoded number** in mock data, diagram says it is an `UrgencyScore` object. `submit()` **discards the report** — [SubmitReportPage.jsx:5](src/pages/SubmitReportPage.jsx#L5) does `useState(null)` and throws it away. `acknowledge()`/`resolve()` work ([ReportsPage.jsx:79](src/pages/ReportsPage.jsx#L79)) but only in page-local state. `assignTeam()` and `addNote()` do not exist. |
| **InventoryItem** | Has `warehouse: "Warehouse A"` (string) where diagram says `warehouseId`. Missing `expiryDate`. `status` is **hardcoded in mock data**, not derived — so `checkStockLevel()` does not exist. `updateQty(delta, reason)` is really a whole-object overwrite in [ItemFormModal.jsx](src/components/inventory/ItemFormModal.jsx); no delta, no reason. |
| **Task** | Good coverage: kanban `moveToNextStatus()` and `create()` both work ([TasksPage.jsx](src/pages/TasksPage.jsx), [CreateTaskModal.jsx](src/components/tasks/CreateTaskModal.jsx)). Missing fields `resourceChecklist` and `progress`; `assignedTo` is a **person name**, diagram says `assignedTeamId`. `start()`/`markComplete()`/`addUpdate()` not implemented. |
| **StockLogEntry** | Rows render fine, but the array is **hardcoded inside the component** ([StockLog.jsx:4-15](src/components/inventory/StockLog.jsx#L4-L15)) — it is not in `mockData.js` and is never written to when inventory changes. The `records` association to `InventoryItem` is fake. |
| **SyncQueueEntry** | Entries render with `details: string`; diagram says `payload: Map`. `retry()` is a `setTimeout` + `Math.random() > 0.3` ([OfflineQueue.jsx:17-29](src/components/sync/OfflineQueue.jsx#L17-L29)). Nothing is ever actually enqueued by a real user action. |
| **CargoVehicle** | `mockData.cargoVehicles` has id/name/L/W/H. Missing `maxWeight` and `type: VehicleType`; `getVolume()` is inlined in [PackingCanvas.jsx:84](src/components/cargo/PackingCanvas.jsx#L84). |
| **PackingPlan** | **This is the biggest "looks done but isn't".** `volumeUtilized` and `totalWeight` are computed correctly, but `layout` is a **fixed 3-column grid** ([PackingCanvas.jsx:22-59](src/components/cargo/PackingCanvas.jsx#L22-L59)) that ignores every box's real dimensions. There is no `BoxPlacement`, no knapsack/bin-packing, no `optimize(vehicle, boxes)`, no `export()`. The 1.5s spinner in `CargoInputForm.optimize()` is theatre. |

### ❌ Not built at all

| Class | Reality |
|---|---|
| **UrgencyScore** | No `calculate()`, no `getZone()`, none of `daysWithoutFood` / `waterLevel` / `peopleCount` / `vulnerablePersons` / `distanceFromAid`. [UrgencyGauge.jsx](src/components/reports/UrgencyGauge.jsx) is **display-only** and its `factors` prop is never passed real data. The only scoring in the repo is a one-liner: `severity * 20 + (children?10:0) + (elderly?10:0)` at [ReportForm.jsx:43](src/components/reports/ReportForm.jsx#L43). **This is the Level-4 core deliverable and it does not exist.** |
| **VoiceReport** | [VoiceReportModal.jsx](src/components/map/VoiceReportModal.jsx) has a **hardcoded transcript string and a hardcoded extracted object** (lines 12–19). No `getUserMedia`, no `MediaRecorder`, no Whisper, no `transcribeAudio()`, no `extractFields()`. It drops a map pin but never `<<create>>`s a `Report`, so the diagram's create-dependency is unrealised. |
| **Warehouse** | **No entity exists.** Warehouses are only the strings `"Warehouse A".."E"` on inventory rows. No `id`, no `location: GeoPoint`, no `managerId`, no `getInventory()`, no `getLowStockItems()`. The `stores` and `loaded with` associations have nothing to hang off. |
| **SyncManager** | No such module. [SyncIndicator.jsx](src/components/sync/SyncIndicator.jsx) reads `navigator.onLine` and shows a pill. No proposal outbox, no `lastCentralSyncTimestamp`, no `pendingCount`, and no central approval workflow yet. |
| **PeerDevice** | **Zero WebRTC.** No `RTCPeerConnection` anywhere in `src/`. [PeerPanel.jsx](src/components/sync/PeerPanel.jsx) maps a static array and `handleShareData()` is a 2-second `setTimeout` toast. `discover()`/`connect()`/`shareData()` are all fake. |

---

## Cross-cutting gaps not visible in the diagram

1. **No shared data layer — the single biggest blocker.** Every page does
   `useState(mockDataArray)`. Submitting a report, editing stock, or moving a task
   mutates one component's copy and is lost on navigation. **Every association in the
   diagram** (`Report → Task`, `VoiceReport <<create>> Report`, `Warehouse stores
   InventoryItem`, `StockLogEntry records InventoryItem`) is currently undemonstrable.
2. **No backend.** Blueprint calls for Node/Express or FastAPI + PostgreSQL. None exists.
3. **PWA is nominal.** Manifest is at `src/manifest.json` (convention is `public/`), the
   referenced `/icons/icon-192.png` and `icon-512.png` are absent, and there is no
   service worker — so the app **cannot load offline at all**, which is the project's
   headline claim.
4. **Map tiles hit the OSM CDN directly** ([MapView.jsx:12](src/components/map/MapView.jsx#L12)).
   Offline map is impossible today. The Settings "Map tile cache size" slider
   ([SettingsPage.jsx:89](src/pages/SettingsPage.jsx#L89)) is wired to nothing.
5. **Bangla i18n is cosmetic.** The `English / বাংলা` toggle sets local state and
   translates zero strings ([SettingsPage.jsx:9](src/pages/SettingsPage.jsx#L9)).
6. **Auth has no credential check and no session.** Refresh logs you out; `isAuthenticated`
   is in-memory only.
7. **Name-strings instead of foreign keys everywhere.** `team`, `leader`, `assignedTo`,
   `warehouse`, `submittedBy` are all human-readable names. The diagram is ID-based.
   This must be fixed *before* persistence lands, or it becomes a painful migration.
8. **No TypeScript**, so none of the diagram's types, enums (`RoleEnum`, `StatusStatus`,
   `PriorityEnum`, `ReasonEnum`, `ItemCategory`, `MarkerCategory`, `VehicleType`) are
   enforced or even declared.

## Suggested changes to the diagram itself

- **`Report.urgencyScore`** is drawn as a composed `UrgencyScore` object but the code
  treats it as a flat `int`. Pick one — recommend keeping the object (it's what makes
  the algorithm demonstrable and gives `getZone()` a home).
- **Three entities exist in code but are missing from the diagram**: `Alert`
  (dashboard alert feed), `SupplyDrop` (map markers), and app `Settings`/`Preferences`.
  Either add them or drop the features.
- **`VoiceReport --<<create>>--> Report`** is drawn, but code only creates a `MapPin`.
  Decide whether a voice report *is* a Report subtype or a separate entity that spawns one.
- **Casing inconsistency**: `StockLogEntry.userid` and `Notification.userid` vs.
  `User.id` / `Report.reportId` elsewhere. Normalise to `userId`.
- **`Team.activeTaskId` ↔ `Task.assignedTeamId`** is a redundant bidirectional link;
  fine to keep, but only one side should be authoritative.
- **No `Role`/permission class** despite RBAC being a headline feature — `RoleEnum`
  alone doesn't capture per-route permissions.
- **`MapPin.metadata: Map`** is untyped and will not survive to code; consider dropping it.

---

## Architecture decisions (confirmed)

- **Central-Command-authoritative synchronization.** A designated Central Command node is the
  single source of truth (SSoT). It alone commits permanent state, advances
  `lastCentralSyncTimestamp`, and publishes snapshots. Field nodes submit proposals into a local
  outbox and converge by ingesting newer snapshots. This is **eventual consistency via centralized
  master snapshot distribution**, not multi-peer bidirectional merge.
- **No backend, no server process.** Central Command is an in-app authoritative session backed by
  IndexedDB, not a remote service. IndexedDB is each node's local cache; only Central Command's
  stores are authoritative.
- **Proposal-only field mutations.** A field worker's report, task update, or inventory adjustment
  becomes a `Pending` proposal in the device-local outbox. It never becomes shared state until
  Central Command explicitly approves and broadcasts it.
- **Timestamped snapshot P2P propagation.** Peer connections exchange whole snapshots carrying
  `lastCentralSyncTimestamp`. A receiver ingests a snapshot only when the sender's timestamp is
  newer than its own; otherwise it ignores it. Peers never exchange proposals or per-mutation
  deltas, which prevents split-brain, cyclic delta loops, and unauthorized disconnected mutation.
- **All four Level-5 features are built for real**: urgency scoring, cargo packing, offline PWA +
  tile caching, real-audio voice-to-map, and WebRTC snapshot transport.
- **Speech runs fully in-browser** via `@huggingface/transformers` (transformers.js v3) with a
  quantised Whisper model, cached in Cache Storage so it works offline after first load.
- **WebRTC uses real `RTCPeerConnection` + `RTCDataChannel`.** With no server there is no signalling
  service, so the SDP handshake goes out-of-band behind a `SignalChannel` interface with two
  implementations: `BroadcastChannel` (same-device, multi-tab — the reliable demo path) and
  manual paste / QR (genuine cross-device). The peer connection and data transfer are real in both;
  only the initial handshake is out-of-band. **This is the one honest caveat in the build** and
  should be stated as such in the report rather than glossed over.

### Known risks to plan around

1. **Whisper model download.** First load pulls ~40–75 MB from the HuggingFace CDN and needs internet
   *once*. Ship `whisper-base` q8 (better Bangla than `tiny`), show a download-progress UI, and cache
   it. Add a manual-text fallback so the voice modal never hard-blocks a demo.
2. **Banglish is not a Whisper output mode.** Whisper transcribes Bangla speech into *Bengali script*;
   it does not produce romanised "Banglish". The keyword extractor must therefore match **both**
   Bengali-script and Latin-transliterated forms (পানি / pani, বাচ্চা / baccha, ফুট / foot), and
   handle Bengali numerals (১২ → 12). Budget real time for this dictionary.
3. **Transcription speed on low-spec phones** — the blueprint's target device. Use WebGPU where
   available with a WASM fallback, and keep clips short (≤15 s).

---

## Build plan (ordered)

### Phase A — Data layer (unblocks everything else)
1. Add a `Warehouse` entity to `src/mockData.js` (id, name, GeoPoint, managerId) and
   convert every name-string reference to an ID: `InventoryItem.warehouseId`,
   `Task.assignedTeamId`, `Team.leaderId`, `Report.submittedById`, `User.teamId`.
2. Create `src/context/DataContext.jsx` — one reducer over all entities, exposing the
   diagram's methods (`submitReport`, `acknowledgeReport`, `assignTeam`, `updateQty`,
   `moveToNextStatus`, …). Every page switches from `useState(mockX)` to `useData()`.
3. Add `src/lib/db.js` — IndexedDB wrapper (raw `idb` pattern, no new heavy dep) with one
   object store per entity, exposed through a **`repo` interface** (`repo.reports.list()`,
   `repo.reports.save()`, …). `DataContext` hydrates from `repo` on boot and writes through
   on every dispatch. The interface is the seam a REST backend would slot into later.
4. Move `StockLog`'s inline array into the store and **write a `StockLogEntry` on every
   `updateQty`**, so the `records` association becomes real.
5. Seed the store from `mockData.js` on first run only, so the demo data survives but user
   edits are never clobbered on reload.

### Phase B — The two algorithms (the graded core; pure JS, no infrastructure)
6. `src/lib/urgency.js` — real `calculateUrgency(report) → { totalScore, factors[], zone }`
   from `daysWithoutFood`, `waterLevel`, `peopleCount`, `vulnerablePersons`,
   `distanceFromAid`. Weighted, documented, and unit-testable. Add those five inputs to
   [ReportForm.jsx](src/components/reports/ReportForm.jsx) (replacing the `severity * 20`
   one-liner at line 43), feed the returned `factors` into the **already-built**
   [UrgencyGauge.jsx](src/components/reports/UrgencyGauge.jsx) `factors` prop, surface the
   gauge in [ReportDrawer.jsx](src/components/reports/ReportDrawer.jsx), and add an
   urgency sort to the Reports table.
7. `src/lib/packing.js` — real 3D shelf / guillotine bin-packing returning
   `BoxPlacement[] { boxId, x, y, z, w, h, d }` plus rejected-item list. Rewrite
   [PackingCanvas.jsx](src/components/cargo/PackingCanvas.jsx) to render actual placements
   (its 3-column grid at lines 22–59 goes away) with top and side views derived from the
   same coordinates. Add `CargoVehicle.maxWeight` + `getVolume()`, reject over-weight and
   over-volume loads, and implement `export()` (print + JSON).

### Phase C — Offline PWA
8. Move `manifest.json` from `src/` to `public/`, generate the missing `icon-192.png` /
   `icon-512.png`, add `vite-plugin-pwa`, register a service worker caching the app shell
   so the app boots with the network off.
9. Leaflet tile caching: custom `TileLayer` that reads/writes tiles in IndexedDB, wired to
   the existing (currently dead) Settings cache-size slider, with an eviction policy and a
   "pre-cache this region" control.
10. Real proposal outbox: every field mutation while offline enqueues a typed `Proposal`
    (`{ id, proposalType, payload, userId, status, timestamp }`) instead of a `details`
    string, and delivers pending proposals only to Central Command on reconnect. Wire real
    `pendingCount` and `lastCentralSyncTimestamp` into
    [SyncIndicator.jsx](src/components/sync/SyncIndicator.jsx) and replace the
    `Math.random()` fake retry in [OfflineQueue.jsx](src/components/sync/OfflineQueue.jsx).

### Phase D — Level-5 showcase features
11. **Voice (real audio, fully client-side)**: `src/lib/speech.js` — `getUserMedia` +
    `MediaRecorder` capture, transcription via `@huggingface/transformers` with a quantised
    Whisper model (progress UI + Cache Storage). `src/lib/extract.js` — bilingual keyword
    extraction covering Bengali script *and* Latin transliteration, plus Bengali-numeral
    normalisation. Rewrite [VoiceReportModal.jsx](src/components/map/VoiceReportModal.jsx)
    to drop its hardcoded transcript (lines 12–19), and have it **create a real `Report`**
    scored by `calculateUrgency` — satisfying the diagram's `<<create>>` dependency — which
    then plots its own pin. Keep a manual-text fallback.
12. **P2P (real WebRTC)**: `src/lib/p2p.js` — `RTCPeerConnection` + `RTCDataChannel` behind
    a `SignalChannel` interface (`BroadcastChannel` impl for the multi-tab demo, manual
    paste/QR impl for cross-device). Implement `PeerDevice.connect/shareSnapshot` for real,
    replacing the static array and `setTimeout` toast in
    [PeerPanel.jsx](src/components/sync/PeerPanel.jsx). Shared payload = an authoritative
    snapshot carrying `lastCentralSyncTimestamp`; the receiver ingests it only when the
    timestamp is newer, and never merges proposals.

### Phase E — Polish
13. Real `login(username, password)` against the user list, with the session persisted so a
    refresh no longer logs you out.
14. Bangla i18n dictionary wired to the existing (currently cosmetic) Settings toggle.
15. Add per-user `Notification.userId` targeting and the missing `Task` fields
    (`resourceChecklist`, `progress`).

---

## Deliverables of this task

Two Markdown files written into the project repo:

1. **`PROJECT_PLAN.md`** (repo root) — this document, moved out of the scratch plans
   directory so it lives with the code and can be committed.
2. **`TASKS.md`** (repo root) — the three-way work split described below, written for
   readers who are *not* deep in the SWE space, or to be pasted wholesale into an AI
   assistant by each member.

### Team split

| Member | Share | Scope |
|---|---|---|
| **RKN** | 50% | Voice-to-text module (Whisper WASM, mic capture, Bangla/Banglish extraction) + WebRTC snapshot relay + proposal outbox |
| **YSR** | 25% | Data layer: IndexedDB persistence, `DataContext`, ID refactor, `Warehouse` entity, StockLog wiring, real login |
| **NFT** | 25% | Urgency scoring algorithm + cargo packing algorithm + PWA service worker + offline map tile caching |

RKN's share is genuinely ~50% of remaining difficulty: speech and WebRTC are the two
hardest modules in the project.

### How the tasks are made independent

The natural blocker is that everything needs the data layer, which is YSR's. Broken by a
**Day-0 contract commit** (done once, before anyone starts):

- `src/context/DataContext.jsx` is created up front with a **working in-memory
  implementation** exposing the final API (`useData()` → entities + mutation methods).
- YSR's job then becomes *swapping the guts* of that file for IndexedDB **without changing
  the API surface**. RKN and NFT consume the API from hour one and never wait.
- `src/lib/contracts.js` holds the shared object shapes (Report, SyncQueueEntry,
  BoxPlacement, UrgencyResult) as JSDoc typedefs, so all three code against documented
  plain-object shapes rather than each other's code.

**File ownership is disjoint** — no two members edit the same file:

- RKN: `src/lib/{speech,extract,p2p,sync}.js`, `src/components/map/VoiceReportModal.jsx`,
  `src/components/sync/*`, `src/context/OfflineContext.jsx`
- YSR: `src/lib/db.js`, `src/context/{DataContext,AuthContext}.jsx`, `src/mockData.js`,
  `src/components/inventory/StockLog.jsx`, `src/pages/LoginPage.jsx`
- NFT: `src/lib/{urgency,packing,tileCache}.js`,
  `src/components/reports/{UrgencyGauge,ReportForm}.jsx`,
  `src/components/cargo/*`, `src/components/map/MapView.jsx`, `vite.config.js`, `public/`

### Writing style for `TASKS.md`

Per the request, each member's section must contain: plain-language explanation of *what*
and *why*; exact file paths to create/edit; exact commands to run; exact function
signatures and object shapes; the specific gotchas/parameters that break the feature
(e.g. Whisper model id and quantisation, `MediaRecorder` mime type, `RTCDataChannel`
ordering, IndexedDB version bumps); and a **tick-box completion checklist** ending each
section so the member knows objectively when they are done.

## Verification

- `npm run dev`, then per phase:
  - **A**: submit a report on `/submit-report` → it appears on `/reports`; reload the page → it is still there. Edit stock on `/inventory` → a new row appears in the Stock Log.
  - **B**: two reports with different water level / people count / vulnerable counts produce different scores and different gauge zones; the cargo SVG visibly changes when box dimensions change, and overloading is rejected.
  - **C**: DevTools → Network → Offline, hard reload → app still boots; make an edit offline → it appears in the Offline Queue with a real payload; go back online → queue drains.
  - **D**: speak a Bangla phrase into the mic → a real transcript appears (not the hardcoded one) → a real Report is created, appears on `/reports` with a computed urgency score, and plots a pin. Open the app in two tabs → connect over `BroadcastChannel` signalling → an edit in tab A appears in tab B, with `RTCDataChannel.readyState === "open"` confirmed in DevTools.
- **New deps to add**: `vite-plugin-pwa`, `@huggingface/transformers`. No server, no database, no new backend runtime.
- Suggested light test coverage on the two pure modules (`src/lib/urgency.js`, `src/lib/packing.js`) — they are the graded core and are trivially unit-testable with Vitest.
