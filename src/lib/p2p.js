// Real WebRTC peer-to-peer with no signalling server.
//
// Two ways to swap the SDP handshake:
//   - Mode A (same device, two tabs): BroadcastChannel, fully automatic.
//   - Mode B (two devices): the offer/answer text is copied and pasted by hand.
//
// The connection and data transfer are genuinely peer-to-peer in both modes;
// only the initial handshake is manual/automatic-on-one-machine.

// No STUN/TURN servers: we only care about the local network.
const RTC_CONFIG = { iceServers: [] };

const CHANNEL_NAME = "reliefopt";
const SIGNAL_CHANNEL_NAME = "reliefopt-p2p-signal";

// Data channels die silently if a single send exceeds ~64 KB.
const CHUNK_SIZE = 16 * 1024;
const CHUNK_PREFIX = "__reliefopt_chunk__";
const CHUNK_ACK_PREFIX = "__reliefopt_chunk_ack__";

/**
 * Waits for the peer connection's ICE gathering to finish. Sending an offer
 * before this completes silently breaks the connection.
 */
function waitForIceGatheringComplete(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const handler = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handler);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", handler);
  });
}

function reportState(onStateChange, patch) {
  onStateChange?.((prev) => ({ ...prev, ...patch }));
}

/**
 * Builds a host peer connection that owns the data channel.
 * Returns a controller: { getStatus, send, disconnect } plus a helper to grab
 * the offer. state changes flow through onStateChange.
 */
export function createHost(onMessage, onStateChange) {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const channel = pc.createDataChannel(CHANNEL_NAME, { ordered: true });
  const chunks = new Map(); // chunkId -> { parts: Map, size }
  const pendingAcks = new Map(); // chunkId -> resolve fn
  let status = "connecting";

  function setStatus(next) {
    status = next;
    reportState(onStateChange, { status });
  }

  channel.onopen = () => setStatus("connected");
  channel.onclose = () => setStatus("disconnected");
  channel.onerror = () => setStatus("disconnected");

  channel.onmessage = (event) => {
    const text = String(event.data);
    if (text.startsWith(CHUNK_PREFIX)) {
      handleChunk(text);
      return;
    }
    if (text.startsWith(CHUNK_ACK_PREFIX)) {
      const chunkId = text.slice(CHUNK_ACK_PREFIX.length);
      pendingAcks.get(chunkId)?.();
      pendingAcks.delete(chunkId);
      return;
    }
    onMessage?.(JSON.parse(text));
  };

  function handleChunk(text) {
    const [, chunkId, indexStr, totalStr, payload] = text.split(":");
    const index = Number(indexStr);
    const total = Number(totalStr);
    let entry = chunks.get(chunkId);
    if (!entry) {
      entry = { parts: new Map(), size: total };
      chunks.set(chunkId, entry);
    }
    entry.parts.set(index, payload);
    // Tell the sender this chunk arrived so it can release memory.
    if (channel.readyState === "open") {
      channel.send(`${CHUNK_ACK_PREFIX}${chunkId}`);
    }
    if (entry.parts.size === total) {
      chunks.delete(chunkId);
      const full = Array.from({ length: total }, (_, i) => entry.parts.get(i)).join("");
      onMessage?.(JSON.parse(full));
    }
  }

  /** Resolves with the SDP offer once ICE gathering is complete. */
  async function getOffer() {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);
    return pc.localDescription;
  }

  /** Accepts the guest's answer SDP. */
  async function acceptAnswer(answer) {
    await pc.setRemoteDescription(answer);
  }

  /**
   * Sends a JS object. Splits into ~16 KB chunks and reassembles on the other
   * side; every chunk is acknowledged so the sender does not buffer forever.
   */
  async function send(dataObject) {
    if (channel.readyState !== "open") {
      throw new Error("Channel is not open — cannot send.");
    }
    const text = JSON.stringify(dataObject);
    if (text.length <= CHUNK_SIZE) {
      channel.send(text);
      return;
    }
    const chunkId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const total = Math.ceil(text.length / CHUNK_SIZE);
    for (let i = 0; i < total; i += 1) {
      const payload = text.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await new Promise((resolve) => pendingAcks.set(chunkId, resolve));
      channel.send(`${CHUNK_PREFIX}:${chunkId}:${i}:${total}:${payload}`);
    }
  }

  function disconnect() {
    try {
      channel.close();
    } catch {
      // Already closed.
    }
    try {
      pc.close();
    } catch {
      // Already closed.
    }
    setStatus("disconnected");
  }

  return { getStatus: () => status, getOffer, acceptAnswer, send, disconnect, pc };
}

/**
 * Builds a guest peer connection (no data channel of its own; it adopts the
 * host's channel). Returns the same controller shape as createHost.
 */
export function createGuest(onMessage, onStateChange) {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const chunks = new Map();
  const pendingAcks = new Map();
  let status = "connecting";
  let channel = null;

  function setStatus(next) {
    status = next;
    reportState(onStateChange, { status });
  }

  pc.ondatachannel = (event) => {
    channel = event.channel;
    channel.onopen = () => setStatus("connected");
    channel.onclose = () => setStatus("disconnected");
    channel.onerror = () => setStatus("disconnected");
    channel.onmessage = (e) => {
      const text = String(e.data);
      if (text.startsWith(CHUNK_PREFIX)) {
        handleChunk(text);
        return;
      }
      if (text.startsWith(CHUNK_ACK_PREFIX)) {
        const chunkId = text.slice(CHUNK_ACK_PREFIX.length);
        pendingAcks.get(chunkId)?.();
        pendingAcks.delete(chunkId);
        return;
      }
      onMessage?.(JSON.parse(text));
    };
  };

  function handleChunk(text) {
    const [, chunkId, indexStr, totalStr, payload] = text.split(":");
    const index = Number(indexStr);
    const total = Number(totalStr);
    let entry = chunks.get(chunkId);
    if (!entry) {
      entry = { parts: new Map(), size: total };
      chunks.set(chunkId, entry);
    }
    entry.parts.set(index, payload);
    if (channel && channel.readyState === "open") {
      channel.send(`${CHUNK_ACK_PREFIX}${chunkId}`);
    }
    if (entry.parts.size === total) {
      chunks.delete(chunkId);
      const full = Array.from({ length: total }, (_, i) => entry.parts.get(i)).join("");
      onMessage?.(JSON.parse(full));
    }
  }

  async function acceptOffer(offer) {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGatheringComplete(pc);
    return pc.localDescription;
  }

  async function send(dataObject) {
    if (!channel || channel.readyState !== "open") {
      throw new Error("Channel is not open — cannot send.");
    }
    const text = JSON.stringify(dataObject);
    if (text.length <= CHUNK_SIZE) {
      channel.send(text);
      return;
    }
    const chunkId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const total = Math.ceil(text.length / CHUNK_SIZE);
    for (let i = 0; i < total; i += 1) {
      const payload = text.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await new Promise((resolve) => pendingAcks.set(chunkId, resolve));
      channel.send(`${CHUNK_PREFIX}:${chunkId}:${i}:${total}:${payload}`);
    }
  }

  function disconnect() {
    try {
      channel?.close();
    } catch {
      // Already closed.
    }
    try {
      pc.close();
    } catch {
      // Already closed.
    }
    setStatus("disconnected");
  }

  return { getStatus: () => status, acceptOffer, send, disconnect, pc };
}

/**
 * Mode A — automatic handshake between two tabs on the same machine.
 * One tab calls startAutoHost, the other startAutoGuest; BroadcastChannel
 * carries the SDP offers/answers between them.
 */
export function startAutoHost(onMessage, onStateChange) {
  const controller = createHost(onMessage, onStateChange);
  const signal = new BroadcastChannel(SIGNAL_CHANNEL_NAME);

  signal.onmessage = async (event) => {
    if (event.data?.type === "R2_ANSWER") {
      await controller.acceptAnswer(event.data.answer);
      signal.close();
    }
  };

  controller.getOffer().then((offer) => {
    signal.postMessage({ type: "R2_OFFER", offer });
  });

  const originalDisconnect = controller.disconnect;
  controller.disconnect = () => {
    try {
      signal.close();
    } catch {
      // Ignore.
    }
    originalDisconnect();
  };
  return controller;
}

export function startAutoGuest(onMessage, onStateChange) {
  const controller = createGuest(onMessage, onStateChange);
  const signal = new BroadcastChannel(SIGNAL_CHANNEL_NAME);

  signal.onmessage = async (event) => {
    if (event.data?.type === "R2_OFFER") {
      const answer = await controller.acceptOffer(event.data.offer);
      signal.postMessage({ type: "R2_ANSWER", answer });
      signal.close();
    }
  };

  const originalDisconnect = controller.disconnect;
  controller.disconnect = () => {
    try {
      signal.close();
    } catch {
      // Ignore.
    }
    originalDisconnect();
  };
  return controller;
}

/** Mode B — manual copy/paste: serializes an offer to a string for the guest. */
export async function offerToText(hostController) {
  const offer = await hostController.getOffer();
  return JSON.stringify(offer);
}

/** Mode B — guest side: accept a pasted offer string, return answer string. */
export async function acceptOfferFromText(guestController, offerText) {
  const answer = await guestController.acceptOffer(JSON.parse(offerText));
  return JSON.stringify(answer);
}

/** Mode B — host side: accept the pasted answer string. */
export async function acceptAnswerFromText(hostController, answerText) {
  await hostController.acceptAnswer(JSON.parse(answerText));
}
