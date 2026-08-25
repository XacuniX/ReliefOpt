import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bluetooth, Download, RefreshCw, Send, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import {
  createNearbySnapshotPayload,
  parseNearbySnapshotPayload,
} from "../../lib/nearbySnapshot";
import {
  acceptNearbyConnection,
  addNearbyListener,
  getNearbyAvailability,
  rejectNearbyConnection,
  requestNearbyConnection,
  requestNearbyPermissions,
  sendNearbySnapshot,
  startNearbyAdvertising,
  startNearbyDiscovery,
  stopNearbySync,
} from "../../lib/nearbySync";
import { Badge, Button } from "../ui";

const DEVICE_NAME_KEY = "reliefopt-nearby-device-name";

function initialDeviceName(user) {
  const saved = localStorage.getItem(DEVICE_NAME_KEY);
  if (saved) return saved;
  const person = user?.name?.split(" ")[0] || "Field Phone";
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `ReliefOpt · ${person} · ${suffix}`;
}

function progressPercent(update) {
  if (!Number.isFinite(update?.totalBytes) || update.totalBytes <= 0) return 0;
  return Math.min(100, Math.round((update.bytesTransferred / update.totalBytes) * 100));
}

export default function NearbySyncPanel() {
  const { currentUser } = useAuth();
  const {
    snapshotSeq,
    lastSyncedAt,
    authoritativeSnapshotForPeer,
    applyNearbySnapshot,
  } = useData();
  const [deviceName, setDeviceName] = useState(() => initialDeviceName(currentUser));
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [mode, setMode] = useState("idle");
  const [status, setStatus] = useState("Ready for nearby offline sync.");
  const [devices, setDevices] = useState([]);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [connectedPeer, setConnectedPeer] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [transfer, setTransfer] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentSequenceRef = useRef(snapshotSeq);
  const applySnapshotRef = useRef(applyNearbySnapshot);
  const modeRef = useRef(mode);
  const sentSequenceRef = useRef(null);

  currentSequenceRef.current = snapshotSeq;
  applySnapshotRef.current = applyNearbySnapshot;
  modeRef.current = mode;

  useEffect(() => {
    let disposed = false;
    const handles = [];

    async function addListener(name, listener) {
      const handle = await addNearbyListener(name, listener);
      if (disposed) await handle.remove();
      else handles.push(handle);
    }

    void getNearbyAvailability()
      .then((result) => {
        if (!disposed) setPermissionsGranted(Boolean(result.permissionsGranted));
      })
      .catch((availabilityError) => {
        if (!disposed) setError(availabilityError.message || "Nearby Sync is unavailable on this phone.");
      });

    void addListener("endpointFound", (endpoint) => {
      setDevices((current) => [
        ...current.filter((item) => item.endpointId !== endpoint.endpointId),
        endpoint,
      ]);
    });
    void addListener("endpointLost", ({ endpointId }) => {
      setDevices((current) => current.filter((item) => item.endpointId !== endpointId));
    });
    void addListener("connectionInitiated", (connection) => {
      setVerificationCode(connection.authenticationDigits || "");
      if (connection.incoming) {
        setPendingConnection(connection);
        setStatus(`${connection.endpointName} wants to share ReliefOpt data.`);
      } else {
        setStatus(`Connecting to ${connection.endpointName}. Confirm that both phones show the same code.`);
      }
    });
    void addListener("connectionResult", (result) => {
      if (result.status === "connected") {
        setPendingConnection(null);
        setConnectedPeer({ endpointId: result.endpointId, endpointName: result.endpointName });
        setStatus(
          modeRef.current === "send"
            ? `Connected to ${result.endpointName}. The approved snapshot is ready to send.`
            : `Connected to ${result.endpointName}. Waiting for its approved snapshot.`,
        );
      } else {
        setPendingConnection(null);
        setConnectedPeer(null);
        setError(result.error || "The nearby connection was not accepted.");
      }
    });
    void addListener("disconnected", ({ endpointName }) => {
      setConnectedPeer(null);
      setStatus(`Disconnected from ${endpointName}.`);
    });
    void addListener("transferUpdate", (update) => {
      const percent = progressPercent(update);
      setTransfer((current) => ({
        ...current,
        status: update.status,
        percent: update.status === "success" ? 100 : percent,
        bytesTransferred: update.bytesTransferred,
        totalBytes: update.totalBytes,
      }));
      if (update.status === "success" && modeRef.current === "send") {
        setStatus(`Snapshot #${sentSequenceRef.current} was sent successfully.`);
      } else if (["failure", "canceled"].includes(update.status)) {
        setError("The nearby transfer did not complete. Keep both phones close and try again.");
      }
    });
    void addListener("payloadReceived", async ({ payload, endpointName }) => {
      setTransfer((current) => ({ ...current, status: "validating", percent: 100 }));
      try {
        const snapshot = parseNearbySnapshotPayload(payload, currentSequenceRef.current);
        const applied = await applySnapshotRef.current(snapshot);
        if (!applied) throw new Error("This phone already has this snapshot or a newer one.");
        setTransfer({ status: "applied", percent: 100, snapshotSeq: snapshot.snapshotSeq });
        setStatus(`Applied approved snapshot #${snapshot.snapshotSeq} from ${endpointName}.`);
      } catch (receiveError) {
        setTransfer(null);
        setError(receiveError.message || "The received snapshot was not accepted.");
      }
    });
    void addListener("nearbyError", ({ message }) => setError(message || "Nearby Sync encountered an error."));

    return () => {
      disposed = true;
      handles.forEach((handle) => void handle.remove());
      void stopNearbySync().catch(() => {});
    };
  }, []);

  function saveDeviceName(value) {
    const clean = value.slice(0, 40);
    setDeviceName(clean);
    localStorage.setItem(DEVICE_NAME_KEY, clean);
  }

  async function ensurePermissions() {
    if (permissionsGranted) return true;
    try {
      const result = await requestNearbyPermissions();
      const granted = Boolean(result.granted);
      setPermissionsGranted(granted);
      return granted;
    } catch (permissionError) {
      setError(permissionError.message || "Nearby permissions were denied.");
      return false;
    }
  }

  function resetFlow(nextMode) {
    setMode(nextMode);
    setDevices([]);
    setPendingConnection(null);
    setConnectedPeer(null);
    setVerificationCode("");
    setTransfer(null);
    setError("");
  }

  async function startReceiving() {
    setBusy(true);
    resetFlow("receive");
    try {
      if (!(await ensurePermissions())) return;
      await startNearbyAdvertising(deviceName);
      setStatus("Waiting for Phone A. Keep this screen open and both phones close together.");
    } catch (startError) {
      setError(startError.message || "Unable to start receiving.");
    } finally {
      setBusy(false);
    }
  }

  async function startSending() {
    setBusy(true);
    resetFlow("send");
    try {
      createNearbySnapshotPayload(authoritativeSnapshotForPeer());
      if (!(await ensurePermissions())) return;
      await startNearbyDiscovery(deviceName);
      setStatus("Searching for a nearby ReliefOpt phone that is waiting to receive.");
    } catch (startError) {
      setError(startError.message || "Unable to search for nearby phones.");
    } finally {
      setBusy(false);
    }
  }

  async function connect(endpoint) {
    setBusy(true);
    setError("");
    try {
      await requestNearbyConnection(endpoint.endpointId);
      setStatus(`Connection request sent to ${endpoint.endpointName}.`);
    } catch (connectionError) {
      setError(connectionError.message || "Unable to connect to that phone.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptConnection() {
    if (!pendingConnection) return;
    setBusy(true);
    setError("");
    try {
      await acceptNearbyConnection(pendingConnection.endpointId);
      setStatus(`Accepted ${pendingConnection.endpointName}. Connecting now…`);
    } catch (acceptError) {
      setError(acceptError.message || "Unable to accept the nearby phone.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectConnection() {
    if (!pendingConnection) return;
    try {
      await rejectNearbyConnection(pendingConnection.endpointId);
    } catch {
      // The peer may have already canceled; the local flow can still be reset.
    }
    setPendingConnection(null);
    setStatus("Connection declined. Waiting for another nearby phone.");
  }

  async function sendSnapshot() {
    if (!connectedPeer) return;
    setBusy(true);
    setError("");
    try {
      const snapshot = authoritativeSnapshotForPeer();
      const prepared = createNearbySnapshotPayload(snapshot);
      sentSequenceRef.current = prepared.snapshot.snapshotSeq;
      setTransfer({ status: "sending", percent: 0, totalBytes: prepared.byteLength });
      await sendNearbySnapshot(connectedPeer.endpointId, prepared.payload);
      setStatus(`Sending approved snapshot #${prepared.snapshot.snapshotSeq}…`);
    } catch (sendError) {
      setTransfer(null);
      setError(sendError.message || "Unable to send the approved snapshot.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await stopNearbySync();
    } catch {
      // Local UI still returns to idle if Android already stopped the session.
    }
    resetFlow("idle");
    setStatus("Nearby Sync stopped.");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3">
        <div className="flex items-start gap-3">
          <Bluetooth className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div>
            <p className="text-sm font-semibold">Direct Android-to-Android transfer</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              No internet or router is needed during transfer. Keep Bluetooth and Wi-Fi turned on; the phones do not need to join a Wi-Fi network.
            </p>
          </div>
        </div>
      </div>

      <label className="block text-xs font-semibold">
        This phone’s nearby name
        <input
          value={deviceName}
          maxLength={40}
          disabled={mode !== "idle"}
          onChange={(event) => saveDeviceName(event.target.value)}
          className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={startSending} loading={busy && mode === "send"} disabled={mode !== "idle"}>
          <Send className="h-4 w-4" /> Send latest approved snapshot
        </Button>
        <Button variant="outline" onClick={startReceiving} loading={busy && mode === "receive"} disabled={mode !== "idle"}>
          <Download className="h-4 w-4" /> Receive nearby update
        </Button>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={error ? "red" : connectedPeer ? "green" : mode === "idle" ? "grey" : "amber"} text={error ? "Needs attention" : connectedPeer ? "Connected" : mode === "idle" ? "Ready" : "Searching"} />
          <p className="text-xs text-muted-foreground">{error || status}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>Local snapshot: #{snapshotSeq}</span>
          <span>Approved: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Not downloaded yet"}</span>
        </div>
      </div>

      {mode === "send" && !connectedPeer && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Nearby ReliefOpt phones</h3>
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {devices.length ? devices.map((device) => (
              <button
                type="button"
                key={device.endpointId}
                disabled={busy}
                onClick={() => connect(device)}
                className="flex w-full items-center justify-between rounded-lg border bg-background p-3 text-left hover:border-teal-500/50 disabled:opacity-50"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone className="h-4 w-4 text-teal-600" /> {device.endpointName}
                </span>
                <span className="text-xs text-primary">Connect</span>
              </button>
            )) : (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                No receiving phone found yet. Start “Receive nearby update” on Phone B.
              </p>
            )}
          </div>
        </section>
      )}

      {pendingConnection && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold">Accept {pendingConnection.endpointName}?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirm the code on both phones before receiving approved ReliefOpt data.
              </p>
              <p className="my-3 text-center font-mono text-2xl font-bold tracking-[0.25em]">{verificationCode || "—"}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={acceptConnection} loading={busy}>Accept phone</Button>
                <Button size="sm" variant="outline" onClick={rejectConnection} disabled={busy}>Decline</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {connectedPeer && (
        <section className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{connectedPeer.endpointName}</p>
              {verificationCode && <p className="text-xs text-muted-foreground">Verified with code {verificationCode}</p>}
            </div>
            {mode === "send" && (
              <Button size="sm" onClick={sendSnapshot} loading={busy} disabled={transfer?.status === "sending"}>
                <Send className="h-4 w-4" /> Send snapshot #{snapshotSeq}
              </Button>
            )}
          </div>
        </section>
      )}

      {transfer && (
        <section className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">
              {transfer.status === "applied" ? `Approved snapshot #${transfer.snapshotSeq} applied` : "Nearby transfer"}
            </span>
            <span>{transfer.percent ?? 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-teal-500 transition-[width] duration-300" style={{ width: `${transfer.percent ?? 0}%` }} />
          </div>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mode !== "idle" && (
        <Button variant="ghost" size="sm" className="w-full" onClick={stop} loading={busy}>Stop nearby sync</Button>
      )}
    </div>
  );
}
