export const ROUTE_ROLES = Object.freeze({
  "/dashboard": ["central_admin", "warehouse_manager"],
  "/map": ["central_admin", "warehouse_manager", "field_worker"],
  "/reports": ["central_admin", "warehouse_manager", "field_worker"],
  "/submit-report": ["central_admin", "warehouse_manager", "field_worker"],
  "/inventory": ["central_admin", "warehouse_manager"],
  "/tasks": ["central_admin", "warehouse_manager", "field_worker"],
  "/cargo": ["central_admin", "warehouse_manager"],
  "/users": ["central_admin"],
  "/approvals": ["central_admin"],
  "/settings": ["central_admin", "warehouse_manager", "field_worker"],
});

export function canAccessRoute(role, path) {
  return Boolean(role && ROUTE_ROLES[path]?.includes(role));
}

export function homeForRole(role) {
  return role === "field_worker" ? "/map" : "/dashboard";
}
