import { Capacitor, registerPlugin } from "@capacitor/core";

const NearbySync = registerPlugin("NearbySync");

export function isAndroidNearbyAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function getNearbyAvailability() {
  return NearbySync.getAvailability();
}

export function requestNearbyPermissions() {
  return NearbySync.requestNearbyPermissions();
}

export function startNearbyAdvertising(deviceName) {
  return NearbySync.startAdvertising({ deviceName });
}

export function startNearbyDiscovery(deviceName) {
  return NearbySync.startDiscovery({ deviceName });
}

export function requestNearbyConnection(endpointId) {
  return NearbySync.requestConnection({ endpointId });
}

export function acceptNearbyConnection(endpointId) {
  return NearbySync.acceptConnection({ endpointId });
}

export function rejectNearbyConnection(endpointId) {
  return NearbySync.rejectConnection({ endpointId });
}

export function sendNearbySnapshot(endpointId, payload) {
  return NearbySync.sendSnapshot({ endpointId, payload });
}

export function stopNearbySync() {
  return NearbySync.stop();
}

export function addNearbyListener(eventName, listener) {
  return NearbySync.addListener(eventName, listener);
}
