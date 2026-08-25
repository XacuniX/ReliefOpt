import { apiRequest } from "./authApi.js";

function authorized(accessToken, options = {}) {
  return {
    ...options,
    headers: { authorization: `Bearer ${accessToken}`, ...options.headers },
  };
}

export function fetchSnapshot(accessToken) {
  return apiRequest("/api/snapshot", authorized(accessToken));
}

export function submitProposal(accessToken, proposal) {
  return apiRequest("/api/proposals", authorized(accessToken, {
    method: "POST",
    body: JSON.stringify(proposal),
  }));
}

export function fetchProposals(accessToken) {
  return apiRequest("/api/proposals", authorized(accessToken));
}

export function decideProposal(accessToken, id, decision, reason = "") {
  return apiRequest(`/api/proposals/${encodeURIComponent(id)}/decision`, authorized(accessToken, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  }));
}

export function commitAuthoritativeMutation(accessToken, type, payload) {
  return apiRequest("/api/authoritative/mutations", authorized(accessToken, {
    method: "POST",
    body: JSON.stringify({ type, payload }),
  }));
}
