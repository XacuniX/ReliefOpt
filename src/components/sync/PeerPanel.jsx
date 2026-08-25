import { useState, useRef, useEffect } from "react";
import { Button, Toast, Badge } from "../ui";
import { Wifi, WifiOff } from "lucide-react";
import { useData } from "../../context/DataContext";
import {
  startAutoHost,
  startAutoGuest,
  createHost,
  createGuest,
  offerToText,
  acceptOfferFromText,
  acceptAnswerFromText,
} from "../../lib/p2p";

const STATUS_COLORS = {
  connecting: "amber",
  connected: "green",
  disconnected: "grey",
};

export default function PeerPanel() {
  const { authoritativeSnapshotForPeer, applyPeerSnapshot } = useData();
  const [status, setStatus] = useState("disconnected");
  const [mode, setMode] = useState("auto"); // "auto" | "manual"
  const [log, setLog] = useState([]);
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [peerAnswer, setPeerAnswer] = useState("");
  const [toast, setToast] = useState(null);
  const controllerRef = useRef(null);

  const isConnected = status === "connected";

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function appendLog(entry) {
    setLog((prev) => [...prev.slice(-49), { id: crypto.randomUUID(), ...entry }]);
  }

  useEffect(() => {
    return () => {
      controllerRef.current?.disconnect();
    };
  }, []);

  function handleStateChange(patch) {
    setStatus((prev) => {
      const next = patch.status ?? prev;
      if (next !== prev) {
        appendLog({ text: `Connection state: ${next}`, tone: next === "connected" ? "good" : "info" });
      }
      return next;
    });
  }

  async function handleMessage(data) {
    appendLog({
      text: `Received: ${data.type ?? "message"} (${JSON.stringify(data).slice(0, 80)})`,
      tone: "info",
    });
    if (data?.type === "SNAPSHOT_PUSH" && data.snapshot) {
      const applied = await applyPeerSnapshot(data.snapshot);
      appendLog({
        text: applied
          ? `Applied authoritative snapshot #${data.snapshot.snapshotSeq}`
          : `Ignored snapshot #${data.snapshot.snapshotSeq} (not newer or not offline)`,
        tone: applied ? "good" : "info",
      });
    } else if (data?.type === "PING") {
      controllerRef.current?.send({ type: "PONG", from: "me" });
    } else if (data?.type === "PONG") {
      appendLog({ text: "Pong received — channel is alive", tone: "good" });
    }
  }

  async function handleHost() {
    controllerRef.current?.disconnect();
    setLog([]);
    setStatus("connecting");
    controllerRef.current = startAutoHost(handleMessage, handleStateChange);
    appendLog({ text: "Hosting — waiting for a Join tab on this machine...", tone: "info" });
    showToast("info", "Host started. Open another tab and press Join.");
  }

  async function handleJoin() {
    controllerRef.current?.disconnect();
    setLog([]);
    setStatus("connecting");
    controllerRef.current = startAutoGuest(handleMessage, handleStateChange);
    appendLog({ text: "Joining — waiting for the Host tab on this machine...", tone: "info" });
  }

  function handleDisconnect() {
    controllerRef.current?.disconnect();
    controllerRef.current = null;
    setStatus("disconnected");
    appendLog({ text: "Disconnected", tone: "info" });
  }

  async function handleCreateManualOffer() {
    controllerRef.current?.disconnect();
    setLog([]);
    setStatus("connecting");
    const controller = createHost(handleMessage, handleStateChange);
    controllerRef.current = controller;
    const text = await offerToText(controller);
    setLocalDescription(text);
    appendLog({ text: "Manual offer created — copy it to the other device", tone: "info" });
  }

  async function handleAcceptManualAnswer() {
    if (!peerAnswer.trim()) return;
    try {
      await acceptAnswerFromText(controllerRef.current, peerAnswer.trim());
      appendLog({ text: "Answer accepted — connecting...", tone: "info" });
      showToast("info", "Answer accepted. Waiting for the channel to open.");
    } catch {
      showToast("error", "That answer did not parse. Copy the whole text.");
    }
  }

  async function handleAcceptManualOffer() {
    if (!offerText.trim()) return;
    try {
      controllerRef.current?.disconnect();
      setStatus("connecting");
      const controller = createGuest(handleMessage, handleStateChange);
      controllerRef.current = controller;
      const answer = await acceptOfferFromText(controller, offerText.trim());
      setAnswerText(answer);
      appendLog({ text: "Offer accepted — copy the answer back to the host", tone: "info" });
    } catch {
      showToast("error", "That offer did not parse. Copy the whole text.");
    }
  }

  function handleSendTest() {
    if (!isConnected) {
      showToast("error", "Not connected yet.");
      return;
    }
    try {
      controllerRef.current.send({ type: "PING", from: "me" });
      appendLog({ text: "Sent PING", tone: "info" });
    } catch (err) {
      showToast("error", err.message || "Send failed.");
    }
  }

  async function handlePushSnapshot() {
    if (!isConnected) {
      showToast("error", "Not connected yet.");
      return;
    }
    const snapshot = authoritativeSnapshotForPeer();
    if (!snapshot || snapshot.snapshotSeq < 0) {
      showToast("error", "No authoritative snapshot is cached yet.");
      return;
    }
    try {
      await controllerRef.current.send({ type: "SNAPSHOT_PUSH", snapshot });
      appendLog({ text: `Sent authoritative snapshot #${snapshot.snapshotSeq}`, tone: "good" });
    } catch (err) {
      showToast("error", err.message || "Send failed.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge color={STATUS_COLORS[status]} text={status} />
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex gap-2">
        {[
          { key: "auto", label: "Auto (same machine)" },
          { key: "manual", label: "Manual (two devices)" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              mode === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "auto" && (
        <div className="flex gap-2">
          <Button onClick={handleHost} disabled={status === "connecting"}>
            Host
          </Button>
          <Button variant="outline" onClick={handleJoin} disabled={status === "connecting"}>
            Join
          </Button>
          {isConnected && (
            <>
              <Button variant="outline" onClick={handleSendTest}>
                Ping
              </Button>
              <Button variant="outline" onClick={handlePushSnapshot}>
                Push snapshot
              </Button>
            </>
          )}
          {status !== "disconnected" && (
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-3">
          {isConnected && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSendTest}>Ping</Button>
              <Button variant="outline" onClick={handlePushSnapshot}>Push snapshot</Button>
              <Button variant="destructive" onClick={handleDisconnect}>Disconnect</Button>
            </div>
          )}
          <Button onClick={handleCreateManualOffer} disabled={status === "connecting"}>
            Create offer (Host)
          </Button>
          {localDescription && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Copy this offer to the other device:
              </p>
              <textarea
                readOnly
                value={localDescription}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none"
              />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Paste the peer's answer:</p>
            <textarea
              value={peerAnswer}
              onChange={(e) => setPeerAnswer(e.target.value)}
              rows={3}
              placeholder="Pasted answer SDP..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button variant="outline" onClick={handleAcceptManualAnswer} disabled={!peerAnswer.trim()}>
              Accept answer
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">Guest side</p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Paste the peer's offer:</p>
              <textarea
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                rows={3}
                placeholder="Pasted offer SDP..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" onClick={handleAcceptManualOffer} disabled={!offerText.trim()}>
                Accept offer
              </Button>
            </div>
            {answerText && (
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground">
                  Copy this answer back to the host:
                </p>
                <textarea
                  readOnly
                  value={answerText}
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 border p-3">
        <p className="text-xs text-muted-foreground mb-3">
          A connected device may forward its cached authoritative snapshot. Only an offline receiver applies it; pending proposals are never transferred.
        </p>
        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
          Live Log
        </p>
        {log.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No activity yet. Start a Host or Join connection.
          </p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {log.map((entry) => (
              <li
                key={entry.id}
                className={`text-xs ${
                  entry.tone === "good"
                    ? "text-green-700 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {entry.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
