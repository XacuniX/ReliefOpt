/**
 * Observer pattern: a small application-wide event bus.
 *
 * Domain modules publish facts (for example, "report:created") without
 * knowing which UI widgets, notifications, or analytics features react to it.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  subscribe(eventName, listener) {
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    const listeners = this.listeners.get(eventName);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  publish(eventName, payload) {
    this.listeners.get(eventName)?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        // One observer must not prevent other observers from receiving an event.
        console.error(`Observer failed for ${eventName}:`, error);
      }
    });
  }
}

// Singleton: all modules observe the same event stream.
export const eventBus = new EventBus();
