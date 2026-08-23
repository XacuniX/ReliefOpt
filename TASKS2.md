# ReliefOpt Remaining Implementation Tasks

This backlog is derived from the current `SRS.md` and a source/build audit of the project. It separates production architecture work from frontend defects and validation work.

## Priority legend

- **P0 — Production blocker:** required for the target architecture, security, or data integrity.
- **P1 — Core workflow:** a specified user flow is incomplete or broken.
- **P2 — Quality/polish:** maintainability, performance, accessibility, or secondary behavior.

## Phase 1 — Central Command backend and authentication

### T2-001 — Create the Central Command backend `[P0]`

**Requirements:** FR-DATA.3, FR-SYNC.1, NFR 5.2, NFR 5.5

**Status:** Completed. See `server/` and the `server:*` root scripts.

- [x] Create a Node.js and Express server package.
- [x] Add environment-based configuration and startup scripts.
- [x] Add PostgreSQL connectivity and migrations.
- [x] Create authoritative tables for users, reports, tasks, inventory, teams, warehouses, notifications, stock logs, map pins, proposals, processed proposal IDs, and snapshot metadata.
- [x] Add health/readiness endpoints.

**Acceptance criteria**

- The backend starts independently from the Vite client.
- Migrations create a clean database from scratch.
- PostgreSQL, rather than browser storage, is the authoritative data source.
- Automated integration tests verify database startup and basic CRUD behavior.

### T2-002 — Implement secure backend authentication `[P0]`

**Requirements:** FR-AUTH.2–7, FR-AUTH.10–12, FR-RBAC.8, NFR 5.3

**Status:** Completed. Authentication is server-authoritative; demo accounts are loaded only through the explicit non-production seed command.

- [x] Store passwords as bcrypt hashes.
- [x] Add login endpoint with username, password, status, and inactive-user validation.
- [x] Issue signed JWT access tokens containing user identity and role.
- [x] Add JWT validation middleware to protected endpoints.
- [x] Enforce role authorization on the server.
- [x] Remove the `login(role)` and user-object password bypasses.
- [x] Define cached, unexpired JWT behavior for existing offline sessions.
- [x] Prevent fresh login while offline.

**Acceptance criteria**

- Unknown users, wrong passwords, inactive users, expired tokens, and forged tokens are rejected.
- A user cannot gain admin access by modifying `localStorage`.
- Logout clears the client token and returns the user to `/login`.
- Authentication and authorization tests cover every role.

### T2-003 — Connect user administration to authentication `[P0]`

**Requirements:** FR-USER.3, FR-USER.5, FR-AUTH.5

**Status:** Completed. User administration is PostgreSQL-backed and restricted to Central Admin; IndexedDB now receives only a read cache for ID-based display enrichment.

- [x] Move user CRUD from isolated IndexedDB records to the backend.
- [x] Ensure newly created users can authenticate after receiving credentials.
- [x] Ensure edits and deactivation immediately affect subsequent authorization.
- [x] Link users and teams by `teamId`, `leaderId`, and `assignedUserId`.
- [x] Decide and implement password creation/reset behavior.

**Acceptance criteria**

- A deactivated user cannot log in again.
- A newly created active user can log in with the configured credentials.
- User edits are reflected consistently in authentication, teams, reports, and tasks.

## Phase 2 — Authoritative snapshots, proposals, and synchronization

### T2-004 — Add the client API adapter and snapshot cache `[P0]`

**Requirements:** FR-DATA.5, FR-DATA.7, FR-DATA.9, FR-SYNC.3–8

**Status:** Completed and validated with the server synchronization suite, P2P protocol tests, and production build.

- [x] ~~Add a client API module for login, snapshot fetch, proposal submission, and approval actions.~~
- [x] ~~Fetch authoritative snapshots while online.~~
- [x] ~~Poll at a fixed interval.~~
- [x] ~~Store the latest server-assigned `snapshotSeq`.~~
- [x] ~~Atomically replace the cached snapshot only when the incoming sequence is newer.~~
- [x] ~~Preserve the local outbox when replacing snapshot data.~~

**Acceptance criteria**

- Older or duplicate snapshots are ignored.
- A snapshot is either applied completely or not applied at all.
- Online refreshes converge to the backend state without losing pending proposals.

### T2-005 — Replace the current queue with a proposal outbox `[P0]`

**Requirements:** FR-SYNC.2, FR-SYNC.5, FR-SYNC.9–16, FR-LC.1–6

**Status:** Completed and validated through proposal lifecycle API tests and a successful client build.

- [x] ~~Give every proposal a client-generated UUID idempotency key.~~
- [x] ~~Store field mutations as pending proposals whether online or offline.~~
- [x] ~~Optimistically merge proposals into the local view.~~
- [x] ~~Display a visible “pending approval” badge.~~
- [x] ~~Persist drafts and pending proposals across refreshes.~~
- [x] ~~On reconnect, pull the newest snapshot before submitting proposals.~~
- [x] ~~Rebase pending proposals against the new snapshot.~~
- [x] ~~Roll back rejected optimistic changes and display rejection reasons.~~
- [x] ~~Reject proposals submitted by users deactivated while offline.~~

**Acceptance criteria**

- Offline changes remain visible and pending after a refresh.
- Reconnect follows pull → rebase → push order.
- Accepted proposals appear in a newer authoritative snapshot.
- Rejected proposals do not remain in the authoritative or optimistic view.

### T2-006 — Implement proposal approval, conflicts, and idempotency `[P0]`

**Requirements:** FR-CONFLICT.1–3, FR-IDEM.1–3, FR-APPR.1–6

**Status:** Completed and validated with conflict, ordering, role enforcement, rejection, and duplicate-retry tests.

- [x] ~~Add a Central Admin approval queue.~~
- [x] ~~Show proposal submitter, type, payload, timestamp, and conflict state.~~
- [x] ~~Support approve/reject with a rejection reason.~~
- [x] ~~Serialize competing proposal processing in arrival order.~~
- [x] ~~Apply first-arrived-wins conflict resolution.~~
- [x] ~~Persist processed proposal IDs so retries cannot double-apply.~~
- [x] ~~Advance `snapshotSeq` after authoritative changes.~~
- [x] ~~Support direct Central Admin authoritative overrides.~~

**Acceptance criteria**

- Duplicate proposal submissions apply at most once, including after a server restart.
- A later conflicting proposal is rejected without mutating authoritative state.
- Only Central Admin sessions can approve, reject, or directly commit state.

### T2-007 — Replace delta-based P2P with snapshot-only relay `[P0]`

**Requirements:** FR-P2P.1–4

**Status:** Completed and validated with byte-equivalence, malformed-frame, and acknowledgement-timeout tests.

- [x] ~~Replace `SYNC_PUSH` mutation sharing with `SNAPSHOT_PUSH`.~~
- [x] ~~Never include pending proposals in peer payloads.~~
- [x] ~~Accept only snapshots with a newer `snapshotSeq`.~~
- [x] ~~Atomically replace the receiver cache without touching its outbox.~~
- [x] ~~Permit forwarding of an unchanged authoritative snapshot.~~
- [x] ~~Restrict P2P snapshot relay to offline operation.~~

**Acceptance criteria**

- Peers cannot merge or exchange proposal outboxes.
- Replaying the same snapshot is idempotent.
- An older peer cannot overwrite a newer local snapshot.

## Phase 3 — Critical client defects

### T2-008 — Enforce route-level RBAC `[P0]`

**Requirements:** FR-RBAC.3–7

**Status:** Completed. Field workers are restricted to operational field routes; Inventory and task creation are coordinator-only.

- [x] ~~Route `/dashboard` through the role-gated dashboard page or a reusable protected-route guard.~~
- [x] ~~Redirect unauthorized direct URL access instead of rendering an empty page.~~
- [x] ~~Hide Dashboard from field workers.~~
- [x] ~~Confirm whether field workers may access Inventory; make the SRS and route matrix consistent.~~
- [x] ~~Verify Cargo and Users restrictions for both navigation and direct URLs.~~
- [x] ~~Decide whether field workers may create tasks; gate the action accordingly.~~

**Acceptance criteria**

- Field workers cannot open Dashboard, Cargo, or Users through navigation or direct URLs.
- Warehouse managers cannot open Users.
- Central Admin retains access to all intended routes.

### T2-009 — Repair current offline replay defects `[P1]`

**Status:** Completed by replacing replay with the typed proposal outbox; successful entries are removed and failures remain visible.

- [x] ~~Add or remove the dead `UPDATE_REPORT` replay path.~~
- [x] ~~Preserve complete task patches, including field-worker progress updates.~~
- [x] ~~Route inventory, user, stock-log, and notification mutations through the outbox until the proposal model replaces it.~~
- [x] ~~Trigger draining when the manual offline toggle returns online.~~
- [x] ~~Remove successful queue entries or archive them separately instead of retaining `Done` entries forever.~~
- [x] ~~Surface failed and unknown actions instead of silently discarding user changes.~~

**Acceptance criteria**

- Each supported mutation survives offline creation, refresh, and reconnect.
- Manual and browser connectivity recovery both trigger synchronization.
- The active queue becomes empty after successful replay.

### T2-010 — Fix WebRTC large-message transport `[P1]`

**Requirements:** FR-P2P.5–11

**Status:** Completed and validated with small/large Unicode payload, malformed-frame, and missing-acknowledgement tests.

- [x] ~~Send each chunk before awaiting its acknowledgement.~~
- [x] ~~Include the chunk index in acknowledgements.~~
- [x] ~~Parse the chunk envelope without splitting JSON payload content on `:`.~~
- [x] ~~Add acknowledgement timeouts and failure handling.~~
- [x] ~~Bound incomplete chunk buffers and clear them on disconnect.~~
- [x] ~~Remove synthetic demo-report mutation from the production path.~~

**Acceptance criteria**

- Payloads below and above 64 KB arrive byte-for-byte equivalent.
- JSON containing URLs, timestamps, colons, and Unicode survives transfer.
- Missing acknowledgements fail with a visible timeout instead of hanging forever.
- Two-tab automatic and manual SDP modes are covered by tests.

### T2-011 — Fix task creation and assignment links `[P1]`

**Requirements:** FR-TASK.5, FR-USER.5

**Status:** Completed and validated through the production build and ID-based relationship tests.

- [x] ~~Read current reports, teams, and users from `DataContext`/API instead of `mockData`.~~
- [x] ~~Store `assignedTeamId`, `assignedUserId`, and `linkedReportId`.~~
- [x] ~~Make field-worker task filtering use `assignedUserId`.~~
- [x] ~~Ensure newly submitted reports appear in the linked-report selector.~~
- [x] ~~Prevent assignment to inactive users.~~
- [x] ~~Replace timestamp IDs with UUIDs or server IDs.~~

**Acceptance criteria**

- A task assigned to a field worker immediately appears in that worker’s personal list.
- Renaming a user or team does not break the relationship.
- New reports can be linked without refreshing or reseeding data.

### T2-012 — Complete cargo input and validation `[P1]`

**Requirements:** FR-CARGO.1, FR-CARGO.5

**Status:** Completed and validated with quantity, invalid-input, weight-limit, bounds, and overlap tests.

- [x] ~~Render the defined quantity field.~~
- [x] ~~Add positive-number validation for all vehicle and box dimensions.~~
- [x] ~~Validate quantity as a positive integer.~~
- [x] ~~Validate weight and prevent negative values.~~
- [x] ~~Add `maxWeight` directly to vehicle seed/backend records.~~
- [x] ~~Remove name-based fallback weight logic after data migration.~~
- [x] ~~Clearly show rejected boxes and their reasons.~~

**Acceptance criteria**

- Entering quantity `N` generates exactly `N` packing candidates.
- Invalid values are rejected in the form instead of silently replaced by defaults.
- Vehicle weight limits come from vehicle data.

## Phase 4 — Complete frontend feature wiring

### T2-013 — Finish the dashboard `[P1]`

**Requirements:** FR-DASH.1–5

**Status:** Completed and validated with client tests, the backend synchronization suite, and a production build.

- [x] ~~Consolidate `Dashboard`, `DashboardPage`, and the unused modular dashboard components.~~
- [x] ~~Add the required refresh control and real “Last Updated” timestamp to the routed page.~~
- [x] ~~Move alerts into the data/API layer.~~
- [x] ~~Persist acknowledgement actions.~~
- [x] ~~Fix the final-alert acknowledgement reset bug.~~
- [x] ~~Replace the hardcoded Offline Nodes value with real connectivity data.~~
- [x] ~~Ensure KPIs and charts react to authoritative state.~~

**Acceptance criteria**

- Acknowledged alerts stay removed after the final alert and after refresh.
- All six KPI values derive from live data.
- Refresh updates both data and the displayed timestamp.

### T2-014 — Make map markers use live state `[P1]`

**Requirements:** FR-MAP.3–4

**Status:** Completed and validated with live data-context wiring and a production build.

- [x] ~~Replace mock teams and reports in `Markers` with data-layer values.~~
- [x] ~~Derive warehouse markers from warehouse records rather than a component constant.~~
- [x] ~~Make newly submitted reports appear as severity zones.~~
- [x] ~~Use stable pin IDs as React keys.~~
- [x] ~~Wire the offline banner to the real `lastSyncedAt` value.~~

**Acceptance criteria**

- Report, team, warehouse, and voice-pin changes appear on the map without reseeding.
- The severity filter applies to newly submitted reports.
- “Last synced” reflects real synchronization state.

### T2-015 — Persist notification behavior `[P1]`

**Requirements:** FR-NOTIF.1–4

**Status:** Completed and validated through proposal persistence coverage and a production build.

- [x] ~~Make the active notification popover consume data-layer notifications.~~
- [x] ~~Persist per-notification read/unread changes.~~
- [x] ~~Add a persistent “Mark all as read” mutation.~~
- [x] ~~Remove or consolidate the unused duplicate notification drawer.~~
- [x] ~~Implement notification sounds or remove the setting from the SRS/UI.~~

**Acceptance criteria**

- Read state and unread counts survive refresh and synchronization.
- The popover and data layer always display the same notification state.

### T2-016 — Persist report assignment and notes `[P1]`

**Requirements:** FR-REPORT.5–6 and report workflow expectations

**Status:** Completed and validated with proposal API tests and a production build.

- [x] ~~Store assigned team IDs on reports.~~
- [x] ~~Store report notes with author and timestamp.~~
- [x] ~~Replace mock team options with live teams.~~
- [x] ~~Route assignment/note changes through the proposal/API layer.~~
- [x] ~~Display saved assignments and note history in the drawer.~~

**Acceptance criteria**

- Assignments and notes remain after closing, refreshing, and synchronizing.
- A toast is shown only after the mutation succeeds or is durably queued.

### T2-017 — Complete Settings behavior `[P1]`

**Requirements:** FR-SET.3–5

**Status:** Completed and validated with persisted preferences, cache rehydration behavior, and a production build.

- [x] ~~Persist language selection.~~
- [x] ~~Implement English/Bangla string translation or document the toggle as future work.~~
- [x] ~~Implement notification sound behavior or remove the toggle.~~
- [x] ~~Display actual `lastSyncedAt`, not the current clock time.~~
- [x] ~~Define whether Clear Cache includes the domain IndexedDB cache.~~
- [x] ~~Do not silently clear the authenticated session unless explicitly confirmed.~~
- [x] ~~Rehydrate application state immediately after a cache clear.~~

**Acceptance criteria**

- Settings survive refresh.
- Last Sync matches synchronization history.
- Clear Cache accurately reports and removes exactly the documented stores.

### T2-018 — Remove timestamp ID collision risks `[P1]`

**Status:** Completed and validated by a timestamp-ID source audit, synchronization tests, and a production build.

- [x] ~~Replace `voice-${Date.now()}`, `task${Date.now()}`, `u${Date.now()}`, and `inv${Date.now()}` with `crypto.randomUUID()` for client proposal IDs.~~
- [x] ~~Use server-generated authoritative IDs after proposal acceptance.~~
- [x] ~~Keep the client proposal ID separately for idempotency and reconciliation.~~

**Acceptance criteria**

- Simultaneous submissions cannot create duplicate record IDs.
- Accepted records can be reconciled to their originating proposal.

## Phase 5 — Quality, performance, and SRS alignment

### T2-019 — Add automated unit and integration tests `[P0]`

**Status:** Completed. `npm test` runs 15 client tests and 30 passing server tests; the dedicated real-PostgreSQL test remains opt-in through `TEST_DATABASE_URL`.

- [x] ~~Add a test runner and `npm test` script.~~
- [x] ~~Test urgency boundaries, null handling, and score clamping.~~
- [x] ~~Test Bangla, Banglish, English, Bengali-digit, and missing-value extraction.~~
- [x] ~~Property-test packing bounds, overlap, quantities, volume, and weight limits.~~
- [x] ~~Test IndexedDB hydration, deletion, refresh persistence, and outbox behavior.~~
- [x] ~~Test authentication and authorization APIs.~~
- [x] ~~Test snapshot ordering, proposal conflicts, idempotency, approval, and rollback.~~
- [x] ~~Test P2P chunking and malformed payload handling.~~

**Acceptance criteria**

- Tests run non-interactively in CI.
- Critical business logic and synchronization failure paths are covered.

### T2-020 — Add headless-browser and screenshot validation `[P1]`

**Status:** Completed. The final clean-profile Playwright run passed 10/10 tests and retained desktop/mobile screenshots under `artifacts/screenshots/`.

- [x] ~~Add Playwright or an equivalent browser E2E runner.~~
- [x] ~~Capture desktop and mobile screenshots for Login, Dashboard, Map, Reports, Inventory, Tasks, Cargo, Users, and Settings.~~
- [x] ~~Test successful, failed, and inactive-user login.~~
- [x] ~~Test direct-route RBAC for all three roles.~~
- [x] ~~Test report submission and persistence after reload.~~
- [x] ~~Test offline submission, pending badges, refresh, reconnect, approval, and rejection.~~
- [x] ~~Test notification read persistence.~~
- [x] ~~Test cargo quantity and rejection behavior.~~
- [x] ~~Test two-tab P2P snapshot relay.~~
- [x] ~~Check browser console errors, failed network requests, overflow, focus order, and responsive layout.~~

**Acceptance criteria**

- The E2E suite runs headlessly from a clean browser profile.
- Screenshots are retained as CI artifacts or approved visual baselines.
- Tests fail on unauthorized route access, console errors, and broken core workflows.

### T2-021 — Add linting, type safety, and CI `[P2]`

**Status:** Completed. `npm run check` passes lint, formatting, checkJs, 45 automated tests, and the production build; GitHub Actions also runs E2E with retained artifacts.

- [x] ~~Add ESLint and a `lint` script.~~
- [x] ~~Add formatting checks.~~
- [x] ~~Add TypeScript or `checkJs`/JSDoc type checking.~~
- [x] ~~Remove or consolidate unused duplicate components and routes.~~
- [x] ~~Add CI jobs for build, lint, type checking, unit tests, integration tests, and E2E tests.~~

**Acceptance criteria**

- A clean checkout passes every quality command.
- Contract mismatches such as `assignedTo` versus `assignedUserId` are detected automatically.

### T2-022 — Reduce initial bundle cost `[P2]`

**Status:** Completed. The initial JavaScript path is approximately 159 kB gzip (27 kB app + 42 kB UI + 89 kB React), down from approximately 487 kB gzip; map, charts, speech, and heavy routes are split.

- [x] ~~Lazy-load the speech model and speech-specific runtime.~~
- [x] ~~Lazy-load map, chart, and other route-heavy dependencies.~~
- [x] ~~Split large vendor chunks.~~
- [x] ~~Measure first load and repeat offline load.~~
- [x] ~~Document realistic performance budgets.~~

**Current baseline**

- Main JavaScript bundle: approximately 1.65 MB minified / 487 KB gzip.
- Speech WASM asset: approximately 23.6 MB.

**Acceptance criteria**

- Initial users do not download speech or map code until those features are opened.
- The app shell remains available after initial PWA caching.

### T2-023 — Correct and normalize `SRS.md` `[P1]`

**Status:** Completed. SRS v2.2 now describes the implemented backend/snapshot model, uses one interface section set, records the agreed role matrix, and separates target requirements from the evidence matrix.

- [x] ~~Mark local logout/session clearing as implemented while retaining backend JWT work as planned.~~ Backend JWT work is now implemented too.
- [x] ~~Mark WebRTC large-message chunking partial/broken until T2-010 passes.~~ It is now marked implemented after transport and browser validation.
- [x] ~~Point Dashboard requirements at the component actually used by routing.~~
- [x] ~~Update the dashboard data statement: reports, teams, and inventory are data-backed; alerts are still mocked.~~ Alerts are now data-backed and documented accordingly.
- [x] ~~Remove duplicated Sections 4.2–4.4.~~
- [x] ~~Resolve field-worker Inventory access inconsistency.~~
- [x] ~~Record whether field workers may create tasks.~~
- [x] ~~Keep implementation status separate from target architecture requirements.~~

**Acceptance criteria**

- Every functional requirement has a current status and a valid source/test reference.
- The role matrix, navigation rules, and route guards agree.

## Recommended execution order

1. T2-001 → T2-003: backend, database, authentication, and authoritative user management.
2. T2-004 → T2-007: snapshots, proposal outbox, approval workflow, and snapshot-only P2P.
3. T2-008 → T2-012: security/data-integrity defects and broken core workflows.
4. T2-013 → T2-018: complete frontend data wiring and persistence.
5. T2-019 → T2-023: tests, browser validation, CI, performance, and SRS correction.

## Audit validation baseline

- [x] Production Vite build succeeds.
- [x] PWA service worker is generated.
- [x] Local app, manifest, and source endpoints return HTTP 200.
- [x] Urgency null and maximum-score checks pass.
- [x] Bangla extraction check passes.
- [x] Cargo algorithm rejects an overweight box correctly.
- [x] Browser screenshots and interactive flows verified — Playwright passes 10/10 clean-profile tests and retains desktop/mobile route screenshots.
- [x] Automated backend test suite exists — 30 tests pass and the real-PostgreSQL test is opt-in through `TEST_DATABASE_URL`.

## Project completion note for the owner

All implementation tasks T2-001 through T2-023 are complete in this repository. The following items require personal or environment-specific validation before a production/demo sign-off:

- [ ] Run the opt-in migration/CRUD test against a dedicated real PostgreSQL database by setting `TEST_DATABASE_URL`; the normal automated suite uses `pg-mem`.
- [ ] Test microphone permission, Bangla speech recognition, first-time Whisper model download, and a repeat transcription from the browser cache on the actual presentation devices.
- [ ] Install the built PWA on the intended phone/laptop, disconnect the network, restart the browser, and confirm the warm offline app shell and previously downloaded map tiles load within the documented budget.
- [ ] Review the retained screenshots in `artifacts/screenshots/` on the intended display sizes and confirm the visual design, Bangla typography, table scrolling, and map-filter density are acceptable.
- [ ] Verify notification audio on the target browsers after a user gesture; autoplay policies differ by browser and operating system.
- [ ] Exercise manual SDP transfer between two physical devices on the intended LAN. The automated suite validates two tabs, while STUN/TURN and internet-wide peer connectivity are intentionally out of scope.
- [ ] Perform a keyboard-only and screen-reader walkthrough and decide whether formal WCAG conformance is required; automated tests check basic focus order, overflow, and accessible names but do not certify accessibility.
- [ ] Validate production secrets, HTTPS, CORS origins, PostgreSQL backups/restore, monitoring, and deployment runbooks in the real hosting environment.
- [ ] Review the four high-severity `npm audit --omit=dev` advisories inherited through the Node-side `@huggingface/transformers` dependency chain (`onnxruntime-node`/`adm-zip` and `sharp`). npm currently reports no fix; before production, either accept and document the browser-only exposure model, isolate the speech feature, or replace the dependency.

Further project work is limited to explicitly deferred scope and release hardening rather than incomplete T2 backlog work: resolve or formally accept the speech dependency advisories, add snapshot signing/integrity verification, configure STUN/TURN, use WebSocket push instead of polling, complete full-site Bangla translation beyond primary navigation/settings, obtain formal WCAG certification if required, and finish production observability/operations.
