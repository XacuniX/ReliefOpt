/**
 * Observer pattern: a small, application-wide event subject for operational
 * events. Subscribers are isolated so a dashboard listener cannot break sync.
 */
export class OperationalEventBus {
  #listeners = new Set();

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  publish(event) {
    const message = { ...event, occurredAt: event.occurredAt || new Date().toISOString() };
    for (const listener of this.#listeners) {
      try {
        listener(message);
      } catch (error) {
        console.error("Operational event listener failed:", error);
      }
    }
  }
}

// Singleton: one shared subject prevents duplicate subscriptions across screens.
export const operationalEvents = new OperationalEventBus();
