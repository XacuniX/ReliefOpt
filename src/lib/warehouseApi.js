import { apiRequest } from "./authApi";

function authorized(accessToken, options = {}) {
  return {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  };
}

export function fetchWarehouses(accessToken) {
  return apiRequest("/api/warehouses", authorized(accessToken));
}

export function createWarehouse(accessToken, warehouse) {
  return apiRequest("/api/warehouses", authorized(accessToken, {
    method: "POST",
    body: JSON.stringify(warehouse),
  }));
}
