# ReliefOpt — Comprehensive Project Documentation

> **Purpose:** This document explains the entire ReliefOpt codebase to an instructor — from what each feature means in the real world, to exactly where every piece of logic lives in the source tree.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack — What Each Tool Is and Why We Use It](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Operations Dashboard](#4-operations-dashboard)
   - 4.1 [The "6,000" — What It Means](#41-the-6000--what-it-means)
   - 4.2 [Deployment Status](#42-deployment-status)
   - 4.3 [Live Alerts](#43-live-alerts)
   - 4.4 [Analytics Charts](#44-analytics-charts)
5. [The Map](#5-the-map)
   - 5.1 [How the Map Is Created](#51-how-the-map-is-created)
   - 5.2 [How Map Data Is Stored (Tile Cache)](#52-how-map-data-is-stored-tile-cache)
   - 5.3 [Map Pins in the Database](#53-map-pins-in-the-database)
6. [Urgency Scores](#6-urgency-scores)
7. [Voice-to-Text Feature](#7-voice-to-text-feature)
8. [Reports](#8-reports)
9. [Inventory](#9-inventory)
10. [Tasks](#10-tasks)
11. [Cargo Optimizer Algorithm](#11-cargo-optimizer-algorithm)
12. [Users & User Management](#12-users--user-management)
13. [The Backend — Where It Lives](#13-the-backend--where-it-lives)
14. [The Approval System](#14-the-approval-system)
15. [Settings & Map Tile Cache](#15-settings--map-tile-cache)
16. [Login — How It Is Stored & How It Works](#16-login--how-it-is-stored--how-it-works)
17. [Offline Syncing](#17-offline-syncing)

---

## 1. Project Overview

**ReliefOpt** is a disaster-relief coordination platform built for Bangladesh. It allows three types of users — **Central Admin**, **Warehouse Manager**, and **Field Worker** — to collaboratively manage disaster reports, relief supplies, field teams, cargo loading, and live maps, even when internet connectivity is lost.

The core challenge it solves: during a flood or cyclone, network coverage often drops. Field teams still need to file reports, coordinate tasks, and see maps. ReliefOpt handles all of this by keeping a full local copy of all data in the browser and syncing it back to the server once connectivity returns.

---

## 2. Tech Stack

| Technology | Role | Why We Need It |
|---|---|---|
| **React 19** | Frontend UI framework | Lets us build reactive, component-based interfaces. Every page is a React component. |
| **Vite** | Frontend build tool & dev server | Fast hot-reload during development; produces an optimised production bundle. `vite.config.js` |
| **Tailwind CSS v4** | Utility-first CSS framework | Rapid styling with design tokens; dark-mode support built in. |
| **React Router v7** | Client-side routing | Manages navigation between Dashboard, Map, Reports, Tasks, etc. without full page reloads. `src/routes.js` |
| **Leaflet + react-leaflet** | Interactive map rendering | Open-source map library that renders OpenStreetMap tiles and custom markers. |
| **Recharts** | Data charting library | Renders bar charts and pie charts on the Analytics Overview dashboard panel. |
| **idb** | IndexedDB wrapper | Stores all app data locally in the browser for offline access. `src/lib/db.js` |
| **@huggingface/transformers** | On-device AI (Whisper) | Runs the Whisper speech-recognition model entirely in the browser — no external API calls needed. |
| **Framer Motion** | Animation library | Smooth transitions and micro-animations across the UI. |
| **Capacitor** | Native Android wrapper | Packages the web app as an Android APK with access to native audio recording APIs. |
| **Node.js + Express 5** | Backend HTTP server | Handles authentication, proposal approval, and snapshot serving. `server/src/` |
| **PostgreSQL** | Relational database | Permanent, authoritative storage for all data: users, reports, tasks, inventory, etc. |
| **bcryptjs** | Password hashing | Securely hashes passwords before storing them in PostgreSQL. |
| **jsonwebtoken (JWT)** | Session tokens | Issues signed tokens on login; the client sends the token with every API request. |
| **Playwright** | End-to-end testing | Automated browser tests that simulate real user workflows. `e2e/` |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Browser / Android App               │
│                                                      │
│  React UI  ──►  DataContext (React)                  │
│                     │                                │
│               IndexedDB (idb)  ◄──►  Sync Queue      │
│               (reliefopt DB)        (proposalOutbox)  │
│                     │                                │
│               Tile Cache (IndexedDB: reliefopt-tiles) │
│               Session (localStorage)                  │
└─────────────────────┬────────────────────────────────┘
                      │  HTTPS  (JWT in Authorization header)
┌─────────────────────▼────────────────────────────────┐
│             Express Server  (server/src/)             │
│                                                      │
│   /api/auth   →  AuthService  →  bcrypt + JWT        │
│   /api/sync   →  SyncService  →  Proposals/Snapshots │
│   /api/users  →  UserRepository                      │
│                     │                                │
│               PostgreSQL (migrations/)               │
└──────────────────────────────────────────────────────┘
```

**Key pattern — Proposal / Snapshot model:**
- Any change a field worker or warehouse manager makes is called a **proposal**.
- Proposals are queued locally and sent to the server.
- The server (or a Central Admin via the Approvals page) either **accepts** or **rejects** them.
- Once accepted, the server advances a global `snapshot_seq` counter and the client downloads the new authoritative **snapshot**.
- This guarantees all clients converge to the same state.

---

## 4. Operations Dashboard

**File:** `src/pages/DashboardPage.jsx`

The dashboard is the first screen users see after logging in. It is composed of four sub-components:

| Component | File |
|---|---|
| KPI Cards | `src/components/dashboard/KpiCards.jsx` |
| Team Deployment Status table | `src/components/dashboard/TeamTable.jsx` |
| Live Alerts feed | `src/components/dashboard/AlertFeed.jsx` |
| Analytics Charts | `src/components/dashboard/ChartPanel.jsx` |

---

### 4.1 The "6,000" — What It Means

The **"6,000"** (or whatever total supply count is displayed in the **"Total Supply Items"** KPI card) is the **sum of every item quantity across all warehouses in the inventory**.

#### Real-life meaning
In a real disaster response, this tells the Central Admin at a glance: *"We currently have 6,000 units of relief supplies spread across all our warehouses."* This could be 6,000 packets of water, food rations, medicine boxes, tarpaulins, etc. — combined. It is not a count of different item types, but a grand total of all quantities added together.

#### How it is calculated in the code

In `src/components/dashboard/KpiCards.jsx`, **line 17**:

```js
{ label: "Total Supply Items", value: inventory.reduce((sum, item) => sum + Number(item.qty || 0), 0), icon: Package },
```

The `inventory` array (containing every item across every warehouse) is reduced by summing each item's `qty` field. The `inventory` data comes from `useData()`, which pulls it from the local **IndexedDB** store named `"inventory"`, which is seeded from mock data and kept in sync with the PostgreSQL server.

#### Impact in real life
If this number suddenly drops dramatically, a coordinator knows supplies are being consumed rapidly and needs to request more. If it is not increasing despite deliveries, it may indicate a data reporting gap somewhere in the system.

---

### 4.2 Deployment Status

**Exact file:** `src/components/dashboard/TeamTable.jsx`

#### What it shows
A sortable table listing every relief team with their:
- **Team ID**
- **Leader**
- **Location** (district they are operating in)
- **Status** — `Deployed`, `Standby`, or `Offline`
- **Assigned Task**

#### Where the data comes from
The component calls `const { teams } = useData()` (line 13). The `teams` array is pulled from IndexedDB store `"teams"`, which mirrors the `teams` table in PostgreSQL.

```js
const statusColors = { Deployed: "green", Standby: "amber", Offline: "grey" };
```

#### Where it lives in the database
Server-side: `teams` table defined in `server/migrations/001_initial_schema.sql`, lines 1–11.
Client-side: IndexedDB store `"teams"` inside the `"reliefopt"` database, managed by `src/lib/db.js`.

---

### 4.3 Live Alerts

**Exact file:** `src/components/dashboard/AlertFeed.jsx`

#### Where the information comes from
Live Alerts reads from the `notifications` collection via `useData()` (line 6). It filters for only unread, **Critical** or **System** type notifications:

```js
const alerts = notifications.filter((item) => !item.read && ["Critical", "System"].includes(item.type));
```

Notifications are stored in:
- **IndexedDB** (client): store `"notifications"` in the `"reliefopt"` database
- **PostgreSQL** (server): `notifications` table — `server/migrations/001_initial_schema.sql`, lines 121–132

Notifications are created server-side when significant events happen (e.g. a high-urgency report is submitted) and flow down to the client through the **snapshot sync**. When a user clicks **Acknowledge**, the `markNotificationRead` mutation is called, which goes through the full proposal flow and marks the notification as `read` in the database.

---

### 4.4 Analytics Charts

**Exact file:** `src/components/dashboard/ChartPanel.jsx`

#### Two charts are shown:

| Chart | What it shows | Data source |
|---|---|---|
| **Bar chart** — *Supply Distribution by Warehouse* | Total item quantities per warehouse | `inventory` + `warehouses` from `useData()` |
| **Pie chart** — *Incidents by Type* | Count of reports grouped by disaster type (Flood, Cyclone, etc.) | `reports` from `useData()` |

Both charts are rendered using the **Recharts** library. Both datasets come directly from the local **IndexedDB** cache via `useData()`. No external analytics service is used — the data is the same inventory and reports data used everywhere else in the app, aggregated in real-time with JavaScript `reduce` and `useMemo`.

```js
// Bar chart data: sum inventory per warehouse
const barData = useMemo(() => warehouses.map((warehouse) => ({
  name: warehouse.name,
  supplies: inventory.filter((item) => item.warehouseId === warehouse.id)
    .reduce((sum, item) => sum + Number(item.qty || 0), 0),
})), [inventory, warehouses]);

// Pie chart data: count reports per disaster type
const pieData = useMemo(() => Object.entries(
  reports.reduce((counts, report) => ({
    ...counts, [report.type]: (counts[report.type] || 0) + 1,
  }), {})
).map(([name, value]) => ({ name, value })), [reports]);
```

The feature is implemented from the `recharts` npm package (`BarChart`, `PieChart`, `ResponsiveContainer`, etc. — line 2 of ChartPanel.jsx).

---

## 5. The Map

### 5.1 How the Map Is Created

**Files involved:**
- `src/pages/MapPage.jsx` — page wrapper
- `src/components/map/MapView.jsx` — map container and custom tile layer
- `src/components/map/Markers.jsx` — disaster pins and warehouse markers
- `src/components/map/MapFilters.jsx` — filter controls (filter pins by type, water level, etc.)

The map is built using **Leaflet** (the industry-standard open-source mapping library) wrapped with **react-leaflet**. The `MapContainer` component (line 100 of `MapView.jsx`) initialises a Leaflet map centred on **Dhaka, Bangladesh** (`[23.8103, 90.4125]`) at zoom level 8.

```jsx
<MapContainer center={[23.8103, 90.4125]} zoom={8} scrollWheelZoom={true} ...>
```

Map **tiles** (the actual images that make up the map background) are served by **OpenStreetMap** — a free, open-source map service. The tile URL pattern is:
```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```
where `z` = zoom level, `x` and `y` = tile grid coordinates.

A custom `CachedTileLayer` (lines 8–78 of `MapView.jsx`) intercepts every tile request, checks if it is already saved locally in IndexedDB, and serves it from cache if so — or downloads it and saves it for next time.

---

### 5.2 How Map Data Is Stored (Tile Cache)

**File:** `src/lib/tileCache.js`

Map tiles are stored in a **separate** IndexedDB database called `"reliefopt-tiles"`, in an object store called `"tiles"` (lines 1–2). Each record has:

| Field | Description |
|---|---|
| `key` | Unique string `"z/x/y"` identifying the tile |
| `z`, `x`, `y` | Zoom level and grid coordinates |
| `blob` | The raw PNG image data |
| `size` | Blob size in bytes |
| `lastAccessed` | Timestamp for LRU eviction |

The default storage limit is **50 MB** (line 3: `DEFAULT_LIMIT_BYTES = 50 * 1024 * 1024`). This is adjustable from the Settings page. When the limit is exceeded, the **oldest-accessed tiles are deleted first** (LRU eviction, `enforceCacheLimit` function, lines 89–110).

#### Prefetch on demand
When the user clicks **"Download this area for offline use"** (the button in the bottom-left of the map), `prefetchVisibleTiles()` is called. It:
1. Calculates which tile coordinates are visible at the current zoom level ±1
2. Fetches up to **80 tiles** concurrently (4 at a time to avoid hammering OSM)
3. Saves each tile to IndexedDB

This means the map can be used completely **offline** in the downloaded area.

---

### 5.3 Map Pins in the Database

When a voice report is submitted, a **map pin** is created and placed on the map. Pins are stored in:

- **Client (IndexedDB):** store `"mapPins"` in the `"reliefopt"` database
- **Server (PostgreSQL):** `map_pins` table — `server/migrations/001_initial_schema.sql`, lines 134–144

The pin object includes `latitude`, `longitude`, `location`, `waterLevelFt`, `peopleCount`, and `childrenPresent`.

---

## 6. Urgency Scores

**File:** `src/lib/urgency.js`

### What is an Urgency Score?

An **Urgency Score** is a number from **0 to 100** that tells us how urgent a disaster report is. Instead of manually reading every report and guessing its priority, the system automatically calculates a score so reports can be sorted — highest-urgency first — so relief teams know where to go first.

**Zone classification:**
| Score | Zone | Meaning |
|---|---|---|
| 0–39 | Green | Low urgency — situation is manageable |
| 40–69 | Amber | Moderate urgency — action required soon |
| 70–100 | Red | Critical — immediate response needed |

### How Is It Calculated?

The score is calculated by the `ruleBasedUrgency()` function in `src/lib/urgency.js` (line 19), using a **weighted rule-based scoring system**. Five factors contribute points:

| Factor | Maximum Points | Scoring Rules |
|---|---|---|
| **Days Without Food** | 25 pts | 1 day = 8 pts, 2 days = 15 pts, 3 days = 20 pts, 4+ days = 25 pts |
| **Water Level (ft)** | 20 pts | 0–2 ft = 6 pts, 2–4 ft = 12 pts, 4–6 ft = 17 pts, 6+ ft = 20 pts |
| **People Affected** | 20 pts | 1–9 people = 4 pts, 10–49 = 8 pts, 50–199 = 13 pts, 200–999 = 17 pts, 1000+ = 20 pts |
| **Vulnerable People** | 20 pts | Children present = +12 pts, Elderly present = +8 pts |
| **Distance from Aid (km)** | 15 pts | 0–5 km = 0 pts, 5–15 km = 5 pts, 15–30 km = 10 pts, 30+ km = 15 pts |

**Total max = 100 points.** The score is clamped to [0, 100]:

```js
const score = Math.min(100, Math.max(0,
  foodPoints + waterPoints + peoplePoints + vulnerablePoints + distancePoints
));
```

The strategy pattern allows different scoring algorithms to be swapped in the future (line 93: `export const urgencyStrategies = Object.freeze({ ruleBased: ruleBasedUrgency })`).

#### Real-life example
A field worker reports: *"4 days without food, water level 7 feet, 500 people stranded, children present, 20 km from nearest aid."*
- Food: 25 pts (4+ days)
- Water: 20 pts (7 ft)
- People: 17 pts (500 people)
- Children: 12 pts
- Distance: 10 pts (20 km)
- **Score = 84 / 100 → Red zone** → Dispatched immediately

#### Where it is called in the code
- In `src/components/map/VoiceReportModal.jsx`, lines 268–274, when a voice report is submitted.
- The urgency fields are stored on the report: `urgencyScore`, `urgencyZone`, and `urgencyFactors`.
- The Reports page (`src/pages/ReportsPage.jsx`) sorts by `urgencyScore` descending by default (line 31: `const [sortKey, setSortKey] = useState("urgencyScore")`).
- In the PostgreSQL schema: `urgency_score`, `urgency_zone`, `urgency_factors` columns in the `reports` table — `server/migrations/001_initial_schema.sql`, lines 59–61.

---

## 7. Voice-to-Text Feature

### What It Does (Real-Life)
In a disaster zone, a field worker may be wading through floodwater with one hand, unable to type a report. They press the microphone button, speak: *"Flash flood in Sylhet, 3 feet of water, 200 people stranded, children present, no food for 2 days."* The app automatically converts this speech to a structured disaster report — including location, type, urgency fields — and pins it on the map.

### How It Works (Technically)

**Files:**
- `src/lib/speech.js` — recording and transcription engine
- `src/lib/speechAudio.js` — audio processing (resampling, normalisation, silence trimming)
- `src/lib/nativeAudioRecorder.js` — Android-native audio recording
- `src/lib/extract.js` — NLP keyword extraction from transcript
- `src/components/map/VoiceReportModal.jsx` — the UI modal

#### Step-by-step pipeline:

1. **User opens modal** → clicks "Start Recording" (`VoiceReportModal.jsx`, line 166 `beginRecording()`)

2. **AI model loads** — `loadModel()` in `speech.js` (line 67) downloads (first time only, ~80 MB) or reads from browser cache the **Whisper Base English** model from Hugging Face via `@huggingface/transformers`. Model ID: `"Xenova/whisper-base.en"`, quantised to `q4` format. This runs **100% locally in the browser** using WebAssembly (WASM) — no internet or API key needed during transcription.

3. **Recording starts** — `startRecording()` in `speech.js` (line 117) uses the **Web Audio API** (`AudioContext`, `ScriptProcessor`) to capture raw PCM audio chunks from the microphone. On Android, the native Capacitor audio recorder is used instead (controlled by `isNativeAndroidAudioRecorderAvailable()`).

4. **User stops recording** (max 30 seconds)

5. **Audio processing** — `speechAudio.js` resamples the captured audio to 16 kHz (Whisper's required sample rate), mixes stereo to mono, and trims silence.

6. **Transcription** — `transcribe()` in `speech.js` (line 227) passes the processed audio through the Whisper model pipeline:
   ```js
   const result = await model(audio, { chunk_length_s: 30, return_timestamps: false, ... });
   return cleanTranscript(result.text);
   ```

7. **Field extraction** — `extractFields()` in `extract.js` uses **keyword matching** (regex-based NLP, not a second AI model) to identify location, disaster type, water level, people count, days without food, and children/elderly presence. This supports both **English and Bangla keywords** (lines 11–42 of `extract.js`).

8. **User reviews & confirms** — extracted fields are shown as editable form fields in the modal. The user can correct any misrecognised values.

9. **Report + Map Pin created** — on submit, an urgency score is calculated and a report + map pin are both created via `addReport()` and `addMapPin()` from `DataContext`.

#### Where is the Whisper model stored?
- **Web:** Cached in the browser's **Cache Storage** by the Hugging Face Transformers.js library automatically.
- **Android:** Bundled directly into the APK under `/models/` (controlled by `isAndroidModelBundled` flag in `speech.js` line 18). Downloaded separately via `npm run android:download-model`.

#### Where is the Voice feature in the system?
The UI entry point is the floating microphone button (`VoiceReportModal.jsx`, rendered on the Map page). The resulting data (report + pin) is stored in IndexedDB `"reliefopt"` stores `"reports"` and `"mapPins"`, then synced to PostgreSQL via the proposal system.

---

## 8. Reports

**Files:**
- `src/pages/ReportsPage.jsx` — the reports list view with filters and sorting
- `src/components/reports/ReportDrawer.jsx` — slide-in detail panel when a report is clicked

### What a Report Contains

Each report has: `id`, `type` (Flood/Cyclone/Earthquake/Fire/Other), `district`, GPS coordinates, `severity` (1–5), `status` (Pending → Acknowledged → Resolved), `submittedBy`, `time`, `description`, `affectedCount`, `urgencyScore`, `urgencyZone`, `urgencyFactors`, `childrenPresent`, `elderlyPresent`, `notes[]`.

### Where Is a Report Stored?

| Layer | Location |
|---|---|
| **Client (browser)** | IndexedDB database `"reliefopt"`, object store `"reports"`. Managed by `src/lib/db.js`. |
| **Server (authoritative)** | PostgreSQL `reports` table — `server/migrations/001_initial_schema.sql`, lines 42–71 |
| **Sync mechanism** | `addReport()` → `mutate("ADD_REPORT", payload)` → proposal queued → server validates → accepted → PostgreSQL updated → snapshot refreshed |

The Reports page sorts by `urgencyScore` descending by default so the most critical situations appear first. It supports filtering by type, severity, status, date range, and free-text search.

---

## 9. Inventory

**Files:**
- `src/pages/InventoryPage.jsx` — main inventory page
- `src/components/inventory/InventoryTable.jsx` — sortable item table
- `src/components/inventory/ItemFormModal.jsx` — add/edit item form
- `src/components/inventory/StockLog.jsx` — audit log of quantity changes
- `src/components/inventory/LowStockAlert.jsx` — red/amber alert banner

### Features

| Feature | Description |
|---|---|
| **Per-warehouse tabs** | Inventory is organised by warehouse. Tabs let managers switch between Warehouse A, B, C, D, E. |
| **Add / Edit items** | Each item has: name, category, quantity, unit, warehouse, and auto-calculated status. |
| **Auto status** | `qty <= 5` → "Critical", `qty < 20` → "Low", otherwise "OK" (`InventoryPage.jsx` line 64). |
| **Stock Log** | Every quantity change is recorded with who made the change, why, and when. |
| **Low Stock Alerts** | A banner at the top highlights items with qty < 20. |
| **KPI summary cards** | Total SKUs, Low Stock Items, Out of Stock, Pending Shipments counts. |

### Where Is Inventory Stored?

| Layer | Location |
|---|---|
| **Client** | IndexedDB `"reliefopt"`, stores `"inventory"` + `"stockLog"` |
| **Server** | PostgreSQL tables `inventory` + `stock_log` — `server/migrations/001_initial_schema.sql`, lines 93–119 |

### Real-Life Scenario
After a flood, a warehouse receives a donation of 500 water bottles. The warehouse manager opens Inventory → selects Warehouse B → edits "Drinking Water" → increases quantity from 120 to 620. The app records a `stockLog` entry: "+500, Restocking, by Fatima Begum." The Central Admin sees the updated count on their dashboard immediately after the snapshot syncs.

---

## 10. Tasks

**Files:**
- `src/pages/TasksPage.jsx` — main tasks page (Kanban board for admins/managers)
- `src/components/tasks/CreateTaskModal.jsx` — task creation form
- `src/components/tasks/MyTasksList.jsx` — simplified list view for field workers

### How Tasks Work

Tasks are displayed as a **Kanban board** with four columns:
**To Do → In Progress → En Route → Completed**

A task has: `title`, `description`, `priority` (Critical/High/Medium/Low), `assignedTeamId` or `assignedUserId`, `dueTime`, `status`, and optionally a `linkedReportId`.

**Field workers** see only their own assigned tasks in a simplified list view (`MyTasksList.jsx`).

Task status transitions are enforced by `src/lib/workflowState.js` — illegal transitions (e.g. "To Do" → "Completed" directly) are rejected.

### Where Tasks Are Stored

| Layer | Location |
|---|---|
| **Client** | IndexedDB `"reliefopt"`, store `"tasks"` |
| **Server** | PostgreSQL `tasks` table — `server/migrations/001_initial_schema.sql`, lines 73–91 |

Tasks use the same proposal flow: `addTask()` / `updateTask()` → `mutate("ADD_TASK"/"UPDATE_TASK")` → proposal queued → server processes → snapshot updated → all clients see the change.

---

## 11. Cargo Optimizer Algorithm

**Files:**
- `src/lib/packing.js` — the algorithm (shelf/layer packing)
- `src/components/cargo/CargoInputForm.jsx` — input form (vehicle dimensions + box list)
- `src/components/cargo/PackingCanvas.jsx` — 3D visualisation of the packed vehicle
- `src/pages/CargoPage.jsx` — page wrapper

### What the Cargo Optimizer Does (Real-Life)

When a relief truck needs to be loaded, the team must figure out how to pack boxes of food, medicine, and equipment into the limited truck space without exceeding the weight limit. Doing this manually is slow and error-prone. The Cargo Optimizer takes the truck dimensions and list of boxes, and automatically calculates where each box should go inside the truck to maximise space usage.

### How the Algorithm Works

The algorithm is a **Shelf/Layer Packing** strategy (`shelfPacking()` function, `src/lib/packing.js` line 31):

1. **Pre-processing:** Boxes with multiple quantities are "expanded" into individual box instances (`expandBoxes()`). Boxes are then sorted **largest-first** by volume (lines 53–55), since placing large boxes first wastes less space.

2. **Coordinate system:** The truck interior is measured in **centimetres** (vehicle dimensions in metres are multiplied × 100). Three pointers `x`, `y`, `z` track the current placement position (width, length, height axes).

3. **Row packing:** Boxes are placed left-to-right (`x` axis). When the next box would exceed the vehicle width, a new row starts: `y += rowDepth` (lines 79–83).

4. **Layer packing:** When the next row would exceed the vehicle length, a new layer starts: `z += layerHeight` (lines 86–92). Layers are stacked upward.

5. **Rejection:** A box is rejected (not loaded) if:
   - Its individual dimensions exceed the vehicle interior
   - Adding its weight would exceed the maximum payload
   - There is no remaining volume

6. **Output:** The function returns:
   - `placements[]` — each placed box with its `x, y, z` coordinates (used by the 3D canvas to draw them)
   - `rejected[]` — boxes that couldn't fit, with the reason
   - `volumeUtilized` — percentage of truck volume used
   - `totalWeight` — total weight of loaded cargo

```js
// Entry point using the Strategy Pattern:
export function optimize(vehicle = {}, boxes = [], strategy = "shelf") {
  const pack = packingStrategies[strategy];
  if (!pack) throw new Error(`Unknown packing strategy: ${strategy}`);
  return pack(vehicle, boxes);
}
```

The **Strategy Pattern** is used so new algorithms (e.g. best-fit, priority-first) can be added later without changing the UI form.

### Where the Algorithm Is Stored

Purely client-side — `src/lib/packing.js`. No server interaction. Results are not persisted to any database; they exist only in-memory while the user is on the Cargo page.

---

## 12. Users & User Management

**Files:**
- `src/pages/UsersPage.jsx` — user management UI (Central Admin only via RoleGate)
- `src/lib/userApi.js` — HTTP calls to the users REST API
- `src/components/users/UserFormModal.jsx` — create/edit user form
- `src/components/users/TeamPanel.jsx` — shows team membership

### Where All Users Are Stored

Users are stored in **two places**:

| Layer | Location | Purpose |
|---|---|---|
| **Server — authoritative** | PostgreSQL `users` table — `server/migrations/001_initial_schema.sql`, lines 13–28 | Permanent record with hashed passwords, roles, login timestamps |
| **Client — cached** | IndexedDB `"reliefopt"`, store `"users"` | Read-only copy downloaded as part of the snapshot; used to enrich reports with submitter names |

The Users page is **role-gated** (`RoleGate` component, `UsersPage.jsx` line 168): only `central_admin` users can see it.

User CRUD (create, update, deactivate) bypasses the proposal/approval flow and goes **directly to the server REST API** (`/api/users`), because user management is a high-trust admin-only operation.

Three roles exist: `central_admin`, `warehouse_manager`, `field_worker` — enforced at the database level via a `CHECK` constraint in the SQL schema.

---

## 13. The Backend — Where It Lives

**Entire backend directory:** `server/`

```
server/
├── migrations/              ← PostgreSQL schema scripts (run once to set up the DB)
│   ├── 001_initial_schema.sql
│   ├── 002_user_auth_version.sql
│   ├── 003_proposal_conflicts.sql
│   └── 004_report_references.sql
└── src/
    ├── index.js             ← Server entry point (starts Express HTTP server on port 3001)
    ├── app.js               ← Express app setup (routes, middleware, CORS)
    ├── config.js            ← Environment variable loading (DB URL, JWT secret, etc.)
    ├── auth/
    │   ├── service.js       ← AuthService: bcrypt comparison, JWT issuance
    │   ├── routes.js        ← POST /api/auth/login, POST /api/auth/refresh
    │   └── middleware.js    ← JWT verification middleware (protects all other routes)
    ├── sync/
    │   ├── service.js       ← SyncService: proposal validation, snapshot building (802 lines)
    │   ├── repository.js    ← SQL queries for proposals and authoritative stores
    │   └── routes.js        ← POST /api/sync/proposal, GET /api/sync/snapshot
    ├── users/               ← User CRUD API routes
    └── db/
        ├── pool.js          ← PostgreSQL connection pool (pg library)
        ├── repository.js    ← UserAuthRepository, WarehouseRepository, SnapshotRepository
        ├── migrate.js       ← Migration runner
        └── seed-demo.js     ← Seeds demo data into PostgreSQL
```

---

## 14. The Approval System

**Files:**
- `src/pages/ApprovalsPage.jsx` — the approvals page (entry point)
- `src/components/sync/ApprovalQueue.jsx` — the queue UI with Accept/Reject buttons
- `server/src/sync/service.js` — server-side proposal processing and validation

### Why We Need the Approval System

In a disaster relief operation, not everyone should have the authority to make permanent changes. A field worker might submit a report with incorrect data, or a junior manager might accidentally modify inventory. The approval system creates a **review gate**:

- **Field workers and Warehouse Managers** submit **proposals** (suggestions for changes).
- **Central Admin** reviews them in the Approvals page and either **accepts** or **rejects** them.
- Only accepted proposals are written to the authoritative PostgreSQL database.

This is especially critical in an **offline-first** system: a field worker working offline might queue up 10 changes. When they reconnect, those changes are not immediately applied — they go through review first.

### How It Works

1. Every `mutate()` call in `DataContext.jsx` creates an **outbox entry** (a "proposal") with a UUID, type (e.g. `"ADD_REPORT"`), and payload.

2. If the user is a **Central Admin online**, changes are committed directly via `syncFacade.commitMutation()` — no approval needed (`DataContext.jsx` lines 296–301).

3. For **other roles** or **offline users**, proposals are saved to IndexedDB store `"proposalOutbox"` and then sent to the server's `POST /api/sync/proposal` endpoint.

4. The server validates the proposal (field types, value ranges, enum values) in `SyncService.validateProposalPayload()` and saves it to the PostgreSQL `proposals` table with status `"Pending"`.

5. A Central Admin sees pending proposals in the Approvals page and clicks **Accept** or **Reject**.

6. On acceptance, the server:
   - Writes the change to the relevant PostgreSQL table (e.g. inserts a row into `reports`)
   - Advances the global `snapshot_seq` counter
   - Returns `{ status: "Accepted" }` to the client

7. The client removes the entry from its outbox and pulls the new snapshot.

**Database:** `proposals` table — `server/migrations/001_initial_schema.sql`, lines 146–161. Idempotency is enforced via the `processed_proposal_ids` table (lines 171–176).

---

## 15. Settings & Map Tile Cache

**File:** `src/pages/SettingsPage.jsx`

### What Is the Map Tile Cache and Why Does It Exist?

During a disaster, internet connectivity is unreliable. If a field worker navigates to an area on the map while they have internet, the tile images for that area are automatically downloaded and saved. If they later go offline, they can still see the map.

The tile cache is a configurable storage budget in the user's browser for these saved map tiles.

### How the Cache Works in Code

- **Storage:** IndexedDB database `"reliefopt-tiles"` (managed by `src/lib/tileCache.js`)
- **Limit setting:** Stored in `localStorage` under key `"reliefopt-tile-cache-limit"` (`tileCache.js` line 4)
- **Default:** 50 MB
- **Adjustable:** Settings page has a range slider (10–200 MB, `SettingsPage.jsx` line 98). When moved, `setTileCacheLimit()` is called which saves the new limit to `localStorage` and immediately evicts old tiles if needed.

### Why We Need It in Settings

Users on limited-storage devices (e.g. older Android tablets used in the field) can reduce the tile cache to 10 MB. Desktop admin users may prefer 200 MB to cache an entire region.

### Other Settings

| Setting | Storage Location |
|---|---|
| Theme (Light/Dark/System) | `localStorage` via `ThemeContext` |
| Language (English/Bangla) | `localStorage` via `PreferencesContext` |
| Notification sounds | `localStorage` via `PreferencesContext` |

---

## 16. Login — How It Is Stored & How It Works

### Files
- `src/pages/LoginPage.jsx` — login form UI
- `src/lib/authSession.js` — session read/write helpers using `localStorage`
- `src/lib/authApi.js` — HTTP POST to `/api/auth/login`
- `src/context/AuthContext.jsx` — React context holding current user state
- `server/src/auth/service.js` — server-side authentication logic

### How a Login Works (Step by Step)

1. **User enters username + password** on the Login page.

2. **Client sends** `POST /api/auth/login` with `{ username, password }` in the request body.

3. **Server (`AuthService.authenticate()`, `server/src/auth/service.js` line 71):**
   - Looks up the user by username (case-insensitive) in PostgreSQL.
   - Compares the submitted password against the stored **bcrypt hash** using `bcrypt.compare()`.
   - If wrong password or inactive account: throws `AuthenticationError`.
   - If valid: issues a **JWT** (JSON Web Token) signed with HS256 and a secret key, containing `{ username, name, role, authVersion }` as claims and the user's PostgreSQL `id` as the `sub` (subject). Token expires in a configured number of seconds.

4. **Server returns** `{ accessToken, expiresAt, user }`.

5. **Client stores the session** in `localStorage` under key `"reliefopt-session"` via `writeCachedSession()` in `authSession.js` (line 56). The stored value is just `{ accessToken: "..." }` — a JSON string.

6. **On subsequent page loads**, `readCachedSession()` (line 45) reads from `localStorage`, decodes the JWT payload (no network call needed), checks the expiry timestamp, and restores the session if it is still valid.

7. **Every API request** includes the token in the `Authorization: Bearer <token>` HTTP header. The server's `middleware.js` verifies the signature and expiry before allowing access.

### Password Storage (Security)

Passwords are **never stored in plain text anywhere**. The flow is:
1. On account creation: `bcrypt.hash(password, 12 rounds)` → hashed string stored in `users.password_hash` in PostgreSQL.
2. On login: `bcrypt.compare(submitted, stored_hash)` → boolean match.

The `password_hash` column is **never included** in any API response (only `id`, `username`, `name`, `role`, `status` are returned — see `publicUser()` function in `server/src/auth/service.js` lines 7–16).

---

## 17. Offline Syncing

### Real-Life Scenario

A field worker is in a remote flood-affected village with no internet. They:
1. Open the app — it loads from the browser's local cache (service worker / IndexedDB)
2. Submit 3 disaster reports via voice
3. Update 2 task statuses
4. View the map in areas previously cached for offline use
5. Return to a town with 4G connectivity

The moment internet is detected, the app **automatically** replays all 5 queued actions to the server without any user input required.

### How It Works in Code

The offline sync system spans several files:

| File | Role |
|---|---|
| `src/lib/db.js` | Manages the IndexedDB "reliefopt" database — the local data store |
| `src/lib/sync.js` | Queue entry builder (`makeEntry()`) and `drainQueue()` helper |
| `src/lib/syncFacade.js` | Abstraction layer for sync API calls (used instead of calling the API directly) |
| `src/lib/syncApi.js` | HTTP client for `/api/sync/` endpoints |
| `src/context/DataContext.jsx` | Orchestrator: `mutate()`, `syncNow()`, `pullSnapshot()` |
| `src/context/OfflineContext.jsx` | Detects browser `online`/`offline` events |
| `src/lib/p2p.js` | WebRTC peer-to-peer sync between nearby devices on the same local network |

### The Sync Flow

```
User action (e.g. addReport)
         │
         ▼
mutate("ADD_REPORT", payload)     [DataContext.jsx line 276]
         │
         ├── Applies change OPTIMISTICALLY to local React state immediately
         │   (user sees their report right away, no waiting)
         │
         ├── Saves proposal entry to IndexedDB "proposalOutbox" store
         │
         └── If online: calls syncNow()
                  │
                  ├── pullSnapshot()      ← downloads latest server state
                  ├── For each queued proposal in outbox:
                  │     POST /api/sync/proposal
                  │     ├── Accepted   → removes from outbox
                  │     ├── Rejected   → marks as Failed in outbox
                  │     └── Pending    → marks as "Pending Approval" in outbox
                  └── pullSnapshot() again ← gets updated state after commits
```

**Auto-sync interval:** `syncNow()` is called automatically every **30 seconds** when online (`DataContext.jsx` line 265):
```js
const interval = window.setInterval(() => void syncNow(), 30000);
```

**Reconnect sync:** `OfflineContext` detects when the browser comes back online and triggers a sync immediately.

### Snapshot Model (Programming Detail)

Rather than syncing individual rows, the server produces a complete **authoritative snapshot**: a JSON object containing all records across all data stores. Each snapshot has a monotonically increasing `snapshot_seq` number (`snapshot_meta` table in PostgreSQL). The client only applies a snapshot if its sequence number is **higher** than the current one — preventing old data from overwriting newer local state.

```js
// DataContext.jsx - only apply if the server snapshot is newer
if (!force && snapshot.snapshotSeq <= authoritativeRef.current.snapshotSeq) return false;
```

### P2P (Peer-to-Peer) Offline Sync

Beyond server sync, the app supports **WebRTC peer-to-peer data sharing** between devices on the same local network (`src/lib/p2p.js`). This means two field workers in the same room, both offline, can exchange their latest snapshots directly between their devices using WebRTC data channels — no internet required. The snapshot can be too large for a single WebRTC message, so `createChunkTransport()` in `p2p.js` splits it into 16 KB chunks, acknowledges each one, and reassembles on the other side.

---

*End of documentation.*
*All file paths are relative to the project root:* `e:\Coding\CSE327\ReliefOpt\`
