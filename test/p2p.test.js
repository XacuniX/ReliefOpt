import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createChunkTransport } from "../src/lib/p2p.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function channelPair() {
  const left = { readyState: "open", onmessage: null };
  const right = { readyState: "open", onmessage: null };
  left.send = (data) => queueMicrotask(() => right.onmessage?.({ data }));
  right.send = (data) => queueMicrotask(() => left.onmessage?.({ data }));
  return [left, right];
}

test("P2P transport preserves small and chunked Unicode JSON byte-for-byte", async () => {
  const [left, right] = channelPair();
  const received = [];
  const sender = createChunkTransport(left, () => {}, {
    chunkSize: 32,
    ackTimeoutMs: 100,
  });
  const receiver = createChunkTransport(
    right,
    (message) => received.push(message),
    { chunkSize: 32, ackTimeoutMs: 100 },
  );
  left.onmessage = sender.handleMessage;
  right.onmessage = receiver.handleMessage;

  const small = {
    type: "PING",
    url: "https://example.test/a:b",
    text: "বাংলা",
  };
  const large = {
    type: "SNAPSHOT_PUSH",
    text: `${"a:b/✓বাংলা".repeat(1000)}:${new Date(0).toISOString()}`,
  };
  await sender.send(small);
  await sender.send(large);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(received, [small, large]);
  sender.dispose();
  receiver.dispose();
});

test("P2P transport fails visibly when an acknowledgement is missing", async () => {
  const channel = { readyState: "open", send() {} };
  const transport = createChunkTransport(channel, () => {}, {
    chunkSize: 8,
    ackTimeoutMs: 20,
  });
  await assert.rejects(
    transport.send({ payload: "this message requires several chunks" }),
    /acknowledgement timed out/,
  );
  transport.dispose();
});

test("P2P transport ignores malformed chunk envelopes", () => {
  const channel = { readyState: "open", send() {} };
  let received = false;
  const transport = createChunkTransport(channel, () => {
    received = true;
  });
  transport.handleMessage({ data: "__reliefopt_chunk__not-json" });
  transport.handleMessage({ data: "__reliefopt_chunk__{}" });
  assert.equal(received, false);
  transport.dispose();
});
