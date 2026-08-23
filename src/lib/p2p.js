const RTC_CONFIG = { iceServers: [] };
const CHANNEL_NAME = "reliefopt";
const SIGNAL_CHANNEL_NAME = "reliefopt-p2p-signal";
const CHUNK_SIZE = 16 * 1024;
const CHUNK_PREFIX = "__reliefopt_chunk__";
const CHUNK_ACK_PREFIX = "__reliefopt_chunk_ack__";
const SIGNAL_STORAGE_KEY = "reliefopt-p2p-signal-event";

function createSignalChannel() {
  const broadcast = new BroadcastChannel(SIGNAL_CHANNEL_NAME);
  const channel = {
    onmessage: null,
    postMessage(data) {
      broadcast.postMessage(data);
      try {
        localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify({ id: crypto.randomUUID(), data }));
      } catch {
        // BroadcastChannel remains the primary transport when storage is unavailable.
      }
    },
    close() {
      broadcast.close();
      window.removeEventListener("storage", handleStorage);
    },
  };
  broadcast.onmessage = (event) => channel.onmessage?.(event);
  function handleStorage(event) {
    if (event.key !== SIGNAL_STORAGE_KEY || !event.newValue) return;
    try {
      channel.onmessage?.({ data: JSON.parse(event.newValue).data });
    } catch {
      // Ignore malformed or unrelated storage events.
    }
  }
  window.addEventListener("storage", handleStorage);
  return channel;
}

function waitForIceGatheringComplete(peer) {
  /** @type {Promise<void>} */
  return new Promise((resolve) => {
    if (peer.iceGatheringState === "complete") return resolve();
    const timeout = setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", handler);
      resolve();
    }, 10000);
    const handler = () => {
      if (peer.iceGatheringState !== "complete") return;
      clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", handler);
      resolve();
    };
    peer.addEventListener("icegatheringstatechange", handler);
  });
}

function reportState(onStateChange, patch) {
  onStateChange?.(patch);
}

/** Testable, bounded large-message protocol layered on an RTCDataChannel. */
export function createChunkTransport(channel, onMessage, {
  chunkSize = CHUNK_SIZE,
  ackTimeoutMs = 5000,
  maxIncompleteMessages = 32,
} = {}) {
  const incomplete = new Map();
  const pendingAcks = new Map();

  function acknowledge(id, index) {
    if (channel.readyState === "open") {
      channel.send(`${CHUNK_ACK_PREFIX}${JSON.stringify({ id, index })}`);
    }
  }

  function handleMessage(event) {
    const raw = String(event.data);
    try {
      if (raw.startsWith(CHUNK_ACK_PREFIX)) {
        const { id, index } = JSON.parse(raw.slice(CHUNK_ACK_PREFIX.length));
        const key = `${id}:${index}`;
        const pending = pendingAcks.get(key);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve();
          pendingAcks.delete(key);
        }
        return;
      }
      if (raw.startsWith(CHUNK_PREFIX)) {
        const frame = JSON.parse(raw.slice(CHUNK_PREFIX.length));
        if (!frame?.id || !Number.isInteger(frame.index) || !Number.isInteger(frame.total)
          || frame.index < 0 || frame.total < 1 || frame.index >= frame.total
          || typeof frame.payload !== "string") return;
        if (!incomplete.has(frame.id) && incomplete.size >= maxIncompleteMessages) {
          incomplete.delete(incomplete.keys().next().value);
        }
        const entry = incomplete.get(frame.id) || { parts: new Map(), total: frame.total };
        if (entry.total !== frame.total) return;
        entry.parts.set(frame.index, frame.payload);
        incomplete.set(frame.id, entry);
        acknowledge(frame.id, frame.index);
        if (entry.parts.size === entry.total) {
          incomplete.delete(frame.id);
          const text = Array.from({ length: entry.total }, (_, index) => entry.parts.get(index)).join("");
          onMessage?.(JSON.parse(text));
        }
        return;
      }
      onMessage?.(JSON.parse(raw));
    } catch {
      // Malformed peer data is ignored without affecting the channel.
    }
  }

  async function send(dataObject) {
    if (channel.readyState !== "open") throw new Error("Channel is not open — cannot send.");
    const serialized = JSON.stringify(dataObject);
    if (serialized.length <= chunkSize) {
      channel.send(serialized);
      return;
    }
    const id = crypto.randomUUID();
    const total = Math.ceil(serialized.length / chunkSize);
    for (let index = 0; index < total; index += 1) {
      const payload = serialized.slice(index * chunkSize, (index + 1) * chunkSize);
      const key = `${id}:${index}`;
      const acknowledgement = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingAcks.delete(key);
          reject(new Error(`Peer acknowledgement timed out for chunk ${index + 1}/${total}.`));
        }, ackTimeoutMs);
        pendingAcks.set(key, { resolve, reject, timer });
      });
      channel.send(`${CHUNK_PREFIX}${JSON.stringify({ id, index, total, payload })}`);
      await acknowledgement;
    }
  }

  function dispose() {
    incomplete.clear();
    for (const pending of pendingAcks.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Peer disconnected before transfer completed."));
    }
    pendingAcks.clear();
  }

  return { send, handleMessage, dispose };
}

export function createHost(onMessage, onStateChange) {
  const peer = new RTCPeerConnection(RTC_CONFIG);
  const channel = peer.createDataChannel(CHANNEL_NAME, { ordered: true });
  const transport = createChunkTransport(channel, onMessage);
  let status = "connecting";
  const setStatus = (next) => { status = next; reportState(onStateChange, { status }); };
  channel.onopen = () => setStatus("connected");
  channel.onclose = () => setStatus("disconnected");
  channel.onerror = () => setStatus("disconnected");
  channel.onmessage = transport.handleMessage;

  async function getOffer() {
    await peer.setLocalDescription(await peer.createOffer());
    await waitForIceGatheringComplete(peer);
    return peer.localDescription;
  }

  async function acceptAnswer(answer) {
    await peer.setRemoteDescription(answer);
  }

  function disconnect() {
    transport.dispose();
    try { channel.close(); } catch { /* already closed */ }
    try { peer.close(); } catch { /* already closed */ }
    setStatus("disconnected");
  }

  return { getStatus: () => status, getOffer, acceptAnswer, send: transport.send, disconnect, pc: peer };
}

export function createGuest(onMessage, onStateChange) {
  const peer = new RTCPeerConnection(RTC_CONFIG);
  let status = "connecting";
  let channel = null;
  let transport = null;
  const setStatus = (next) => { status = next; reportState(onStateChange, { status }); };

  peer.ondatachannel = (event) => {
    channel = event.channel;
    transport = createChunkTransport(channel, onMessage);
    channel.onopen = () => setStatus("connected");
    channel.onclose = () => setStatus("disconnected");
    channel.onerror = () => setStatus("disconnected");
    channel.onmessage = transport.handleMessage;
  };

  async function acceptOffer(offer) {
    await peer.setRemoteDescription(offer);
    await peer.setLocalDescription(await peer.createAnswer());
    await waitForIceGatheringComplete(peer);
    return peer.localDescription;
  }

  async function send(dataObject) {
    if (!transport) throw new Error("Channel is not open — cannot send.");
    return transport.send(dataObject);
  }

  function disconnect() {
    transport?.dispose();
    try { channel?.close(); } catch { /* already closed */ }
    try { peer.close(); } catch { /* already closed */ }
    setStatus("disconnected");
  }

  return { getStatus: () => status, acceptOffer, send, disconnect, pc: peer };
}

export function startAutoHost(onMessage, onStateChange) {
  const controller = createHost(onMessage, onStateChange);
  const signal = createSignalChannel();
  let offer;
  let offerRetry;
  const broadcastOffer = () => {
    if (offer) signal.postMessage({ type: "R2_OFFER", offer });
  };
  signal.onmessage = async (event) => {
    if (event.data?.type === "R2_ANSWER") {
      clearInterval(offerRetry);
      await controller.acceptAnswer(event.data.answer);
      signal.close();
    } else if (event.data?.type === "R2_READY" && offer) {
      broadcastOffer();
    }
  };
  controller.getOffer().then((description) => {
    offer = description;
    broadcastOffer();
    offerRetry = setInterval(broadcastOffer, 750);
  });
  const disconnect = controller.disconnect;
  controller.disconnect = () => { clearInterval(offerRetry); try { signal.close(); } catch { /* already closed */ } disconnect(); };
  return controller;
}

export function startAutoGuest(onMessage, onStateChange) {
  const controller = createGuest(onMessage, onStateChange);
  const signal = createSignalChannel();
  const announceReady = () => signal.postMessage({ type: "R2_READY" });
  const readyRetry = setInterval(announceReady, 750);
  signal.onmessage = async (event) => {
    if (event.data?.type === "R2_OFFER") {
      clearInterval(readyRetry);
      const answer = await controller.acceptOffer(event.data.offer);
      signal.postMessage({ type: "R2_ANSWER", answer });
      signal.close();
    }
  };
  announceReady();
  const disconnect = controller.disconnect;
  controller.disconnect = () => { clearInterval(readyRetry); try { signal.close(); } catch { /* already closed */ } disconnect(); };
  return controller;
}

export async function offerToText(hostController) {
  return JSON.stringify(await hostController.getOffer());
}

export async function acceptOfferFromText(guestController, offerText) {
  return JSON.stringify(await guestController.acceptOffer(JSON.parse(offerText)));
}

export async function acceptAnswerFromText(hostController, answerText) {
  await hostController.acceptAnswer(JSON.parse(answerText));
}
