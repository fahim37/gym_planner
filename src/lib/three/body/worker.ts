import { buildBodyData } from "./build";

/** Generates the body mesh off the main thread and transfers the buffers back. */
self.onmessage = () => {
  const d = buildBodyData();
  const transfer = [d.position, d.normal, d.bones, d.weights, d.info, d.fibre, d.extra, d.index, d.bind].map((a) => a.buffer as ArrayBuffer);
  (self as unknown as Worker).postMessage(d, transfer);
};
