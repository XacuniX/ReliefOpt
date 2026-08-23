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

export function fetchUsers(accessToken) {
  return apiRequest("/api/users", authorized(accessToken));
}

export function fetchTeams(accessToken) {
  return apiRequest("/api/teams", authorized(accessToken));
}

export function createUser(accessToken, user) {
  return apiRequest("/api/users", authorized(accessToken, {
    method: "POST",
    body: JSON.stringify(user),
  }));
}

export function updateUser(accessToken, id, patch) {
  return apiRequest(`/api/users/${encodeURIComponent(id)}`, authorized(accessToken, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }));
}

export function deactivateUser(accessToken, id) {
  return apiRequest(`/api/users/${encodeURIComponent(id)}/deactivate`, authorized(accessToken, {
    method: "POST",
  }));
}

export function resetUserPassword(accessToken, id, password) {
  return apiRequest(`/api/users/${encodeURIComponent(id)}/reset-password`, authorized(accessToken, {
    method: "POST",
    body: JSON.stringify({ password }),
  }));
}
