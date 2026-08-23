# ReliefOpt — Current Capability and Limitation Summary

**Prepared from the current repository state:** 2026-08-23

## 1. One-paragraph description

ReliefOpt is a browser-based disaster-relief coordination platform aimed at
Bangladesh. It combines a role-based operations dashboard, incident reporting,
map visualization, warehouse inventory, field-task coordination, cargo-packing
planning, user administration, notifications, and offline operation in one
Progressive Web App (PWA). The intended operating model is that a Central
Command server owns the permanent truth, while field and warehouse devices keep
a local cache and queue changes when disconnected. The current repository has
an implemented React/Vite client, an Express/PostgreSQL backend, IndexedDB
offline storage, WebRTC snapshot relay, deterministic urgency scoring, a
heuristic cargo-packing algorithm, and automated tests. It is a strong working
prototype/baseline for a relief-operations system, but it is not yet a complete
real-world emergency-management platform: several integrations are simulated
or deliberately simplified, there is no live external disaster-data feed,
there is no routing/dispatch engine, and some offline/PWA behavior still
depends on which assets and map tiles were previously downloaded.

## 2. What the system can do now

### 2.1 Authentication and role-based access

The system supports username/password login against the Central Command server.
The server:

- looks up users by username;
- verifies passwords using bcrypt hashes;
- refuses inactive users;
- issues signed, expiring JWT access tokens;
- reloads the current user from PostgreSQL when validating `/api/auth/me`;
- applies backend authorization to protected endpoints; and
- supports login rate limiting and token invalidation through the user's
  authentication version when a password is changed or an account is
  deactivated.

The client caches an unexpired session in `localStorage`, so a refresh does not
normally require another login. If a device loses connectivity, an existing
cached session can continue to open the local application. A brand-new login
still requires Central Command to be reachable.

There are three roles:

| Role | Main access | Intended responsibility |
|---|---|---|
| Central Admin | Dashboard, map, reports, inventory, tasks, cargo, users, settings | Central Command, approval, account management, authoritative decisions |
| Warehouse Manager | Dashboard, map, reports, inventory, tasks, cargo, settings | Stock control, packing, logistics, and response coordination |
| Field Worker | Map, reports, submit report, personal tasks, settings | Field observations, emergency reporting, and assigned work |

Role restrictions exist in the client route/navigation layer and are also
checked by the server. A field worker cannot simply reveal a hidden UI link and
gain access to admin operations.

### 2.2 Operations dashboard

The dashboard is a coordinator-facing overview. It currently provides:

- KPI cards such as active incidents, deployed teams, critical alerts, supply
  items, pending requests, and offline nodes;
- an operational/team deployment table;
- an alert feed with severity styling and acknowledgement behavior;
- charts for supply distribution and incident categories;
- a refresh control and last-updated display; and
- theme-aware presentation for light/dark/system preferences.

The dashboard is driven by the shared data context and the current cached or
server snapshot. It is not connected to a live telemetry stream or an external
emergency-management feed.

### 2.3 Map and geospatial view

The map uses Leaflet and OpenStreetMap tiles. It can display:

- response-team markers;
- warehouse markers;
- supply-drop markers;
- report severity zones/circles;
- voice-report/map-pin markers;
- popups with operational details;
- a minimum-severity filter;
- category toggles; and
- a city/location search that flies the map to a known Bangladesh location.

The map has a separate IndexedDB tile cache. Users can download the currently
visible area across a bounded range of zoom levels, and the cache has a size
limit with least-recently-used eviction. Previously cached tiles can remain
visible while offline, and the UI shows an offline banner with the last known
sync time.

The current location system is primarily point-based. It does not calculate
travel routes, road accessibility, estimated arrival times, evacuation paths,
geofenced alerts, satellite-derived flood boundaries, or live GPS tracking.
Some demo map content, especially supply drops and city coordinate lookups,
comes from static project data rather than a live external source.

### 2.4 Emergency report submission and management

A report can be submitted through a three-step form:

1. location/district, coordinates, and landmark;
2. incident type, severity, description, affected people, food/water/distance
   information, and vulnerable-population flags; and
3. review and submission.

Reports are assigned a generated ID, timestamp, submitter, coordinates, status,
and urgency result. They begin as `Pending`. The reports page supports:

- search by report ID, district, or submitter;
- filters for incident type, severity, status, and date range;
- sorting, including urgency score;
- a detail drawer with a mini-map;
- status changes to `Acknowledged` or `Resolved`;
- assignment to a team; and
- adding notes.

Reports now use `DataContext`, so the new report is immediately visible in the
optimistic local view, stored in IndexedDB, and synchronized using the online or
offline mutation path. A non-admin mutation may show a pending-approval badge
until Central Command accepts it.

The form also stores an unfinished report draft locally. A browser refresh can
restore the draft before submission.

### 2.5 Voice reporting in Bangla/English

The map includes a voice-report flow that:

- requests microphone access through `getUserMedia`;
- records audio with `MediaRecorder`;
- converts audio to 16 kHz mono samples;
- loads the in-browser `Xenova/whisper-base` speech model;
- transcribes Bangla or English audio;
- extracts likely fields from the transcript;
- normalizes Bengali digits; and
- lets the user edit/confirm the extracted values before creating a report.

The extractor recognizes a limited, rule-based vocabulary for locations and
facts such as water level, people count, days without food, children, and
elderly people. It supports English, Bangla script, and common Banglish
spellings. If the microphone/model path fails, the user can type the report
instead.

The voice flow is therefore useful for a controlled prototype and field demo,
but it is not a general natural-language understanding system. It does not
guarantee accurate transcription in noise, infer arbitrary facts, validate a
speaker's identity, or automatically verify a location against GPS.

### 2.6 Deterministic urgency scoring

The urgency engine is a pure JavaScript function that returns a score from 0 to
100, a `green`, `amber`, or `red` zone, and a factor breakdown. The maximum
weight is exactly 100 and is distributed across:

| Factor | Maximum contribution |
|---|---:|
| Days without food | 25 |
| Water level | 20 |
| People affected | 20 |
| Children/elderly present | 20 |
| Distance from aid | 15 |

Zones are green below 40, amber from 40 through 69, and red at 70 or above.
Missing values are treated as unknown and do not invent risk points. This is a
transparent prioritization aid, not a medically or scientifically validated
disaster-risk model. Severity and urgency are separate concepts: severity is a
user-entered incident rating, while urgency is computed from the five factors.

### 2.7 Inventory and warehouse operations

Inventory is organized across five demo warehouses. The inventory page can:

- show total SKU, low-stock, out-of-stock, and pending-shipment summaries;
- show low-stock alerts;
- filter/display items by warehouse tab;
- add items;
- edit item name, category, quantity, unit, warehouse, and status; and
- show stock history.

Quantity adjustments create stock-log entries containing the change amount,
reason, user, item, and timestamp. Inventory and stock history are persisted in
the local cache and, when online, are submitted to the authoritative backend
through the mutation system.

The current low-stock rule is quantity `< 20`; the UI labels quantities at or
below 5 as critical and quantities below 20 as low. There is no barcode/RFID
integration, purchase-order system, supplier integration, automatic
replenishment, expiry/batch tracking, or physical warehouse sensor feed.

### 2.8 Task coordination

Coordinator roles see a Kanban board with four statuses:

- `To Do`
- `In Progress`
- `En Route`
- `Completed`

Task cards show task ID, title, assignment, priority, and due time. Central
Admins and Warehouse Managers can create tasks with descriptions, assignees,
priority, due date/time, linked report, and resource checklist. They can move a
task forward through the board. Field Workers see a personal task list and can
update assigned work, but cannot create tasks.

Task state is persisted through the shared data layer and survives refresh.
There is no automatic route planning, workload balancing, shift scheduling,
GPS proof-of-delivery, task escalation engine, or real-time chat attached to a
task.

### 2.9 Cargo packing optimizer

The cargo page allows a user to select a demo vehicle and enter supply boxes
with quantity, dimensions in centimeters, and weight. The optimizer:

- expands quantities into individual candidate boxes;
- sorts candidates by size/volume;
- uses a shelf/layer-style placement heuristic;
- converts vehicle dimensions from meters to centimeters;
- places boxes within vehicle bounds without overlap;
- rejects invalid, oversized, or overweight boxes with reasons;
- reports placed/rejected items, volume utilization, total weight, and fit;
- renders top/side placement views; and
- supports print and JSON download.

This is a practical packing heuristic, not a globally optimal 3D solver. It
does not model weight distribution, center of gravity, fragile-item constraints,
loading order, vehicle axle limits, road restrictions, or live fleet status.
Vehicle weight limits are partly represented through project data/fallback logic,
so real deployments would need a properly maintained vehicle specification
source.

### 2.10 Users and teams

Central Admins can use the Users page to:

- list and search users;
- filter by role;
- create accounts;
- edit role, status, team, and profile fields;
- optionally set/reset passwords; and
- deactivate users.

The server enforces a minimum password length, hashes passwords, validates team
relationships, prevents duplicate usernames, and prevents the final active admin
from removing their own access. Team cards display team membership and related
information.

This is administrative user/team management, not a full identity provider. It
does not currently include SSO, MFA, email verification, granular per-warehouse
permissions, audit-report export, or a self-service password-recovery flow.

### 2.11 Notifications, preferences, and cache controls

The client includes a notification bell with unread count, filtering tabs, read
state, and “mark all as read.” Notification state is handled through the shared
mutation system, so it can be persisted and synchronized. A notification sound
preference is stored locally and a small browser-generated tone can play when
the unread count increases, subject to browser autoplay rules.

Settings currently include:

- profile and role display;
- light/dark/system theme;
- English/Bangla navigation/settings label toggle;
- map tile-cache size control;
- notification-sound preference; and
- a cache-clear action that preserves the session and proposal outbox.

The language toggle is partial: it translates the primary navigation/settings
labels but does not translate every page, report, notification, or system
message.

## 3. How the system is implemented

### 3.1 Client architecture

The client is a React 19 single-page application built with Vite, Tailwind CSS,
React Router, Leaflet, Recharts, Framer Motion, and plain JavaScript/JSX rather
than TypeScript. Cross-cutting state is provided through:

- `AuthContext` for identity and session;
- `OfflineContext` for online/offline/manual-offline state;
- `DataContext` for domain data, mutations, optimistic state, and sync;
- `ThemeContext` for theme; and
- `PreferencesContext` for language and notification settings.

Pages and components read through these contexts instead of directly owning
independent copies of authoritative domain data.

### 3.2 Server architecture

The backend is a Node.js/Express service. PostgreSQL is the intended durable
database and contains users, teams, reports, tasks, inventory, warehouses,
notifications, stock logs, map pins, proposals, processed proposal IDs, and
snapshot metadata.

Important server endpoints include:

- authentication: `/api/auth/login`, `/api/auth/me`;
- snapshots: `GET /api/snapshot`;
- proposal submission: `POST /api/proposals`;
- admin proposal list/decisions: `GET /api/proposals`,
  `POST /api/proposals/:id/decision`;
- admin direct mutations: `POST /api/authoritative/mutations`;
- user/team administration under `/api/users` and `/api/teams`; and
- liveness/readiness checks under `/health/live` and `/health/ready`.

The current domain write interface is intentionally centered on typed generic
mutations/proposals rather than separate REST CRUD endpoints for every domain
entity.

### 3.3 Client persistence

The browser uses IndexedDB database `reliefopt` for cached domain collections,
including reports, tasks, inventory, users, teams, warehouses, notifications,
stock logs, map pins, drafts, snapshots, metadata, and the proposal outbox.
Map tiles use a separate `reliefopt-tiles` database.

`DataContext` hydrates the cache on startup, applies optimistic changes to the
visible state, writes changes through to IndexedDB, and later reconciles with
Central Command snapshots. A localStorage shadow is also maintained for fast
state continuity, so cache-reset behavior must clear both IndexedDB and the
shadow when a genuinely clean demo reset is needed.

### 3.4 Central-Command-authoritative synchronization

The core consistency model is:

1. Central Command PostgreSQL is the single permanent source of truth.
2. Each client keeps a cached authoritative snapshot and a separate local
   proposal outbox.
3. Central Admin online changes can be committed directly.
4. Field/warehouse changes are optimistic locally but become proposals.
5. Online clients poll for snapshots approximately every 30 seconds.
6. On reconnect, the client pulls the newest snapshot, rebases the optimistic
   outbox, submits proposals, then pulls again.
7. Accepted proposals advance the server's monotonic `snapshotSeq`.
8. Rejected proposals remain visible with a reason and their optimistic effect
   is removed during reconciliation.

Proposal IDs are client-generated UUIDs. The server records processed proposal
IDs so retries are idempotent. Conflicts use a serialized, first-arrived-wins
policy for the same conflict key; a later competing proposal is rejected rather
than merged.

This gives the system eventual consistency with central arbitration. It does not
provide peer-to-peer multi-master editing or automatic semantic conflict
merging.

### 3.5 Offline and peer-to-peer behavior

Offline mode uses the last local snapshot for reading and queues typed changes
for later submission. Pending entries can be shown in the sync UI with queued,
syncing, pending-approval, failed, accepted, or rejected states.

For peer relay, the app uses real `RTCPeerConnection` and `RTCDataChannel`
connections. It supports:

- automatic same-device/two-tab signalling using `BroadcastChannel`; and
- manual SDP offer/answer copy/paste for two devices.

Large JSON messages are split into 16 KB chunks with acknowledgements and
timeouts. The only intended peer payload is an authoritative snapshot with a
sequence number. Pending proposals are never sent to peers. A receiver ignores
older/duplicate snapshots and atomically replaces cached authoritative stores
without touching its own outbox.

The system does not provide peer discovery, a signalling server, STUN/TURN
infrastructure, NAT traversal guarantees, end-to-end snapshot signing, or
peer-to-peer proposal merging. Manual copy/paste may be required for different
devices, and WebRTC success depends on browser/network conditions.

## 4. What it cannot do or should not be assumed to do yet

The current system should not be described as if it already provides the
following:

1. **Live disaster intelligence.** There are no live government, weather,
   satellite, IoT, social-media, or emergency-service feeds.
2. **Operational dispatch optimization.** It does not select the best team,
   route vehicles, calculate ETA, or optimize aid allocation across incidents.
3. **Complete GIS analysis.** It displays points/circles but does not perform
   road-network analysis, flood modeling, geofencing, elevation analysis, or
   offline routing.
4. **Guaranteed offline completeness.** The app shell and cached data/tiles can
   work offline, but uncached route chunks, first-use speech-model assets, and
   new map areas may require a network. PWA asset precaching intentionally
   excludes several large chunks.
5. **Automatic cross-device discovery.** P2P requires same-device signalling or
   manual SDP exchange; it is not a mesh network.
6. **Peer authority.** A peer cannot commit authoritative changes. Only the
   server accepts/commits permanent state.
7. **General AI understanding.** Voice extraction is regex/rule based around a
   known vocabulary after Whisper transcription. It is not a conversational AI
   or open-ended report parser.
8. **Scientifically validated triage.** The urgency score is transparent and
   deterministic, but its weights are project-defined and require domain
   validation before being used for life-critical prioritization.
9. **Globally optimal packing.** Cargo packing is a bounded heuristic and does
   not model all real logistics constraints.
10. **Full enterprise identity/security.** There is no SSO, MFA, formal audit
    trail UI, password recovery, fine-grained permission system, snapshot
    signature verification, or formal WCAG certification.
11. **Rich collaboration.** There is no built-in messaging, voice calling,
    live co-editing, or task comments/chat stream beyond report notes and
    status changes.
12. **Production-scale operations.** Horizontal scaling, background job
    processing, WebSocket push, backups/restore workflows, monitoring, and
    disaster-recovery procedures are not represented as complete product
    capabilities in this repository.

## 5. Known implementation/setup caveats

- The project is plain JavaScript/JSX. `typecheck` currently means JavaScript
  configuration checking, not full TypeScript type safety.
- A real deployment requires PostgreSQL, a strong `JWT_SECRET`, database
  migrations, and a configured `DEMO_PASSWORD` only if demo seeding is wanted.
- The README currently documents `reliefopt` as the demo password, but the
  server's seed command reads `DEMO_PASSWORD` from the environment. The actual
  password therefore depends on how the demo database was seeded. The current
  E2E fixtures use `ReliefOpt!123`.
- The normal automated server suite uses an isolated PostgreSQL-compatible
  in-memory test database. The dedicated real-PostgreSQL test is opt-in and was
  skipped when no `TEST_DATABASE_URL` was configured.
- Current automated verification is strong for algorithms, RBAC, auth,
  synchronization, database migrations, proposals, and user management, but
  microphone permissions, real speech-model download, real browser PWA install,
  actual offline reload, OpenStreetMap availability, and multi-device WebRTC
  should still be manually validated in the target deployment environment.
- The project directory already contains many working-tree changes and generated
  artifacts. The summary describes the current files, not an assumed clean git
  baseline.

## 6. Current maturity assessment

The most accurate description is:

> ReliefOpt is an implemented, test-backed disaster-relief coordination
> prototype with a functioning central-authority/offline-cache architecture.
> It demonstrates the core workflows and technical risks of a field operations
> platform, but it is not yet a production emergency-response system because
> real-world data integrations, dispatch/routing intelligence, enterprise
> security, operational observability, and comprehensive offline/device testing
> are still outside the implemented scope.

## 7. Good future use cases

The current architecture is suitable for evolving toward:

- a district-level incident intake and triage tool;
- a warehouse-to-field relief allocation workflow;
- offline-first reporting for areas with intermittent connectivity;
- a Central Command approval and audit workflow for field submissions;
- a training/demo platform for disaster-response coordinators;
- a lightweight NGO coordination dashboard; and
- a foundation for later integration with weather alerts, government data,
  GPS/routing services, satellite layers, and real fleet/warehouse systems.

The most valuable next product steps would likely be validating the urgency
model with relief professionals, adding proper auditability and data provenance,
integrating authoritative external data, improving offline asset packaging,
adding routing/dispatch support, and hardening authentication, deployment,
monitoring, backups, and recovery before claiming production readiness.

## 8. Verification snapshot

At the time of this summary:

- root tests: **15 passed**;
- server tests: **30 passed, 1 skipped** because a dedicated
  `TEST_DATABASE_URL` was not configured;
- production build: **passed**;
- ESLint: **passed**;
- JavaScript configuration/type check: **passed**.

The build reports several large chunks, especially the speech, chart, and map
vendors. This is already partly mitigated with manual chunking and PWA precache
exclusions, but it remains relevant to first-load performance and offline
availability.
