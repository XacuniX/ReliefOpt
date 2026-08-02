# ReliefOpt Demo Flow

## 1. Login `/login`
- Any username/password, pick role, Sign In → Dashboard

## 2. Dashboard `/dashboard`
- 6 KPI cards → acknowledge alerts → refresh timestamp

## 3. Map `/map`
- Full Leaflet map, color markers, filter panel, voice report mic → Plot Pin

## 4. Reports `/reports`
- Filterable/sortable table → click row → drawer with actions + mini map

## 5. Submit Report `/submit-report`
- 3-step form → severity slider → review → submit toast

## 6. Inventory `/inventory`
- Summary cards, low-stock alerts, warehouse tabs, edit, stock log

## 7. Tasks `/tasks`
- Kanban (admin) / personal list (field worker) → New Task modal

## 8. Cargo `/cargo`
- Vehicle selector → add items → Optimize → SVG packing plan with real volume/weight

## 9. Users `/users`
- Filterable table → edit/deactivate → expandable team cards

## 10. Notifications (bell top-right)
- Slide-in drawer, tabs, type icons, Mark All Read

## 11. Settings `/settings`
- Profile, theme, language toggle, cache, Clear Cache

## 12. Sync (status dot next to notification bell)
- Reads `navigator.onLine`, click → devices + queue + Retry All + Share Data

## Global
- **DemoSwitcher**: role switch + offline toggle (bottom-right)
- **Dark/light** via sidebar or settings
- **Mobile**: BottomNav, responsive drawers
