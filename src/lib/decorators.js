import { operationalEvents } from "./operationalEvents.js";

/** Decorator pattern for observable, consistently named async operations. */
export function withOperationalEvents(operation, name) {
  return async (...args) => {
    operationalEvents.publish({ type: "operation.started", name });
    try {
      const result = await operation(...args);
      operationalEvents.publish({ type: "operation.succeeded", name });
      return result;
    } catch (error) {
      operationalEvents.publish({ type: "operation.failed", name, error: error.message });
      throw error;
    }
  };
}
