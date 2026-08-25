import {
  commitAuthoritativeMutation,
  fetchSnapshot,
  submitProposal,
} from "./syncApi.js";
import { withOperationalEvents } from "./decorators.js";

/**
 * Facade pattern: the UI uses a compact sync API rather than knowing REST
 * endpoints or transport details. Decorators add events without changing it.
 */
export class SyncFacade {
  constructor(api = { fetchSnapshot, submitProposal, commitAuthoritativeMutation }) {
    this.pullSnapshot = withOperationalEvents(
      (accessToken) => api.fetchSnapshot(accessToken),
      "sync.pullSnapshot",
    );
    this.submitProposal = withOperationalEvents(
      (accessToken, proposal) => api.submitProposal(accessToken, proposal),
      "sync.submitProposal",
    );
    this.commitMutation = withOperationalEvents(
      (accessToken, type, payload) => api.commitAuthoritativeMutation(accessToken, type, payload),
      "sync.commitMutation",
    );
  }
}

// Singleton facade shared by all React providers and feature screens.
export const syncFacade = new SyncFacade();
