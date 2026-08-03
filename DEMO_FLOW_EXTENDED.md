# ReliefOpt — Extended Demo Flow (Presentation Script)

> Point-form script — not word-for-word. Speak naturally, tap each feature, move quick.

---

## 0. Opening (10 sec)

- ReliefOpt is a disaster relief coordination platform — map-based, offline-capable, role-driven
- Three user roles: Central Admin, Warehouse Manager, Field Worker — each sees a different view
- Walk through login → dashboard → map → reports → inventory → tasks → cargo → users → notifications → settings → sync

---

## 1. Login `/login`

- Land on login page — ReliefOpt branding, clean centered card
- Username/password fields — demo accepts anything
- Role dropdown: Field Worker / Warehouse Manager / Central Admin
- **Pick Central Admin → Sign In** (500ms spinner, natural feel)
- Offline mode banner visible even here — "data will sync when connected"
- **New: Logout button in sidebar bottom — clicking it sends you back here**

---

## 2. Dashboard `/dashboard` (Central Admin view)

- "Operations Dashboard" — 6 KPI cards across top
  - **Active Incidents**: live count of unresolved reports
  - **Deployed Teams**: how many teams in the field
  - **Critical Alerts**: red-alert count from the alert feed
  - **Total Supply Items**: aggregate quantity across all warehouses
  - **Pending Requests**: reports waiting for acknowledgment
  - **Offline Nodes**: 2 currently (simulated)
  - Each card has trend arrow ▲/▼ — color-coded green/red
- Refresh button top-right → updates the "Last Updated: just now" timestamp
- **Team Deployment Status table** (left side)
  - Columns: Team ID, Leader, Location, Status (Deployed/Standby/Offline badges), Last Sync, Assigned Task
  - Sortable by any column — click header toggles asc/desc
- **Live Alerts feed** (right side, scrollable)
  - Red/amber/teal left border by severity (Critical/High/Medium)
  - Each alert: location, timestamp, severity badge, message
  - "Acknowledge" button removes it — feed empties to "No new alerts"
- **Analytics Overview** (bottom)
  - Bar chart: Supply Distribution by Warehouse (5 warehouses)
  - Pie chart: Incidents by Type (Flood, Cyclone, Earthquake, Fire, Other)
  - Charts respect dark/light theme — colors flip
- **Note**: Dashboard is gated — field workers don't see it (RoleGate)

---

## 3. Map `/map`

- Full-screen OpenStreetMap via Leaflet — tile cache adjustable in Settings
- **Color-coded markers**:
  - Teams (blue circles)
  - Warehouses (green boxes)
  - Supply drops (orange diamonds)
  - Severity zones (red-to-amber heat overlay based on report severity)
  - Voice-report dropped pins (custom markers)
- **Filter panel** — toggles for Teams / Warehouses / Supply Drops / Severity Zones + min severity slider
- **Voice Report Mic** button → opens modal
  - Simulated voice input — creates a pin at a location with typed note
  - "Plot Pin" drops it on the map
- **Offline banner** at top when offline — "Map data may be stale"
- Works full-height — negative margin to push under the top nav

---

## 4. Reports `/reports`

- "Emergency Reports" — count shows filtered total
- **Filter bar**: search (ID/location/submitter), type dropdown, severity dropdown, status dropdown, date-from, date-to
- **Sortable table** — click any column header
  - Report ID (monospace), Type (colored badge), Location, Severity (1-5 badge), Status (Pending/Acknowledged/Resolved), Submitted By, Time
- **Click any row → Report Drawer slides in** (right-side sheet)
  - Full detail: all fields + description
  - Status action buttons: Acknowledge / Resolve
  - Mini map showing report location
- Status changes reflect instantly in the table

---

## 5. Submit Report `/submit-report`

- "File a new emergency report for response coordination"
- **3-step form**:
  - Step 1: Report type (Flood/Cyclone/Earthquake/Fire/Other), location text
  - Step 2: Severity slider (1–5), description textarea
  - Step 3: Review all inputs → Submit
- Submit shows success toast
- New report appears in the Reports table

---

## 6. Inventory `/inventory`

- "Monitor relief supplies across all warehouses"
- **4 summary cards**: Total SKUs, Low Stock Items, Out of Stock, Pending Shipments
- **Low Stock Alert banner** (top) — lists critical items, clicking one jumps to that item's warehouse tab and highlights it
- **Warehouse tabs**: A through E
- **Inventory table** per warehouse: name, category, quantity, status (OK/Low/Critical), last updated
- **Edit button** per row → ItemFormModal (edit name/category/qty/warehouse)
- **Add Item button** → same modal, empty form
- **Stock Log** component at bottom — recent stock movement history
- Save/update shows toast confirmation

---

## 7. Tasks `/tasks`

- "Coordinate relief work from assignment through completion"
- **Role-dependent view**:
  - Admin/Warehouse Manager → **Kanban board** (4 columns: To Do, In Progress, En Route, Completed)
  - Field Worker → **My Tasks list** (personal task view)
- **Kanban cards** show: task ID, title, team, priority badge (Critical/High/Medium/Low), due time
- Each card has "Move →" dropdown → transitions to next status column
- Columns color-coded (blue/amber/purple/emerald backgrounds)
- Column headers show task count badge
- **+ New Task button** → CreateTaskModal: title, description, assignee, priority, due date → adds to "To Do"

---

## 8. Cargo `/cargo` (Admin & Warehouse Manager only)

- "Cargo Packing Optimizer"
- **Left panel — Cargo Input Form**:
  - Vehicle selector (pickup truck, van, box truck, etc.) — sets max volume + weight
  - Add items: each has name, quantity, dimensions (L×W×H in cm), weight (kg)
  - List of added items with remove
- **Click Optimize → right panel slides in**:
  - SVG packing plan — visual layout of items inside vehicle volume
  - Shows real volume utilization percentage + total weight
  - Print Plan button → browser print dialog
- Items are placed respecting real volume/weight constraints

---

## 9. Users `/users` (Admin only)

- "Users" page — search by name, filter by role dropdown
- **User table**: name, role badge, team, status (Active/Inactive), last login
- **Edit button** → UserFormModal (edit name, role, team)
- **Deactivate button** → sets user to Inactive, shows toast
- **+ Add User button** → same modal, generates new ID
- **Team Panel** below — expandable cards showing teams with member lists
- Saves/deactivates reflect instantly

---

## 10. Notifications (bell icon, top-right)

- Fixed bell button with red dot for unread count
- Opens **slide-in drawer from right** (Sheet component)
- **Tabs**: All / Critical / System
- Each notification:
  - Icon colored by type (red=Critical, blue=System, teal=Info)
  - Unread dot indicator
  - Title, type badge, body text, timestamp
  - Click toggles read/unread — read items fade to 55% opacity
- **Mark all as read** button at bottom
- Empty state message per tab

---

## 11. Settings `/settings`

- **Profile section**: avatar circle (initials), name, role badge, user ID
- **Preferences**:
  - Theme: Light / Dark / System dropdown
  - Language: English / বাংলা toggle buttons
  - Map tile cache size: slider (10–200 MB)
  - Notification sounds: checkbox toggle
- **About section**: version v0.0.1, last sync time, cache status
- **Clear Cache button** — removes all `reliefopt-` localStorage keys, shows count

---

## 12. Sync & Connectivity (status pill next to bell)

- Green dot: "Online – synced 2 min ago" with Wifi icon
- Amber dot: "Sync Pending – N changes queued" with AlertTriangle
- Red dot: "Offline Mode" with WifiOff
- **Click → Dialog** with two tabs:
  - **Nearby Devices**: PeerPanel — shows simulated peer devices for P2P data sharing, share data button
  - **Offline Queue**: pending changes list with Retry All button
- Reflects `navigator.onLine` status

---

## Global Features (mention as you go)

- **DemoSwitcher** (bottom-right floating panel):
  - "Demo Mode" label
  - Instant role switch: Field Worker / Warehouse Manager / Central Admin
  - Online/Offline toggle
  - Role switches demonstrate how UI changes per role
- **Sidebar** (desktop):
  - Collapsible (60px icons-only or 240px full)
  - Role-gated nav items (e.g. Cargo/Users hidden from field workers)
  - User avatar + name + role at bottom
  - Theme toggle (sun/moon), collapse toggle, **Sign Out** (LogOut icon, red hover)
- **BottomNav** (mobile): icons for main pages, adapts to screen size
- **Dark/Light theme**: toggled from sidebar or Settings, applies to charts + all components
- **Offline-first design**: localStorage caching, offline banner, sync queue, peer-to-peer sharing
- **Responsive**: md breakpoint switches sidebar/BottomNav, full mobile support

---

## Suggested Walkthrough Order (Presenter Notes)

1. Start at login, sign in as Admin
2. Dashboard — hit all 6 KPIs, acknowledge an alert, show charts
3. Map — toggle filters, drop a voice pin
4. Reports — filter to Critical only, open a report drawer, change status
5. Submit Report — quick 3-step form, show the toast
6. Inventory — click a low-stock alert, edit an item
7. Tasks — move a card across kanban, create a new task
8. Cargo — add 3 items, optimize, show the packing plan
9. Switch to Field Worker via DemoSwitcher — show how dashboard/cargo/users disappear
10. Switch to Warehouse Manager — show cargo appears but users doesn't
11. Back to Admin — open Notifications, mark all read
12. Settings — toggle dark mode, switch language to বাংলা, show cache clear
13. Sync dialog — show devices tab + offline queue
14. Sign Out — demonstrate the logout button in sidebar, land back on login
