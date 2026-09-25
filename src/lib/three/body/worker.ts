import { buildBodyData, type BuildOptions } from "./build";

/** Generates the body mesh off the main thread and transfers the buffers back. */
self.onmessage = (e: MessageEvent<BuildOptions | null>) => {
  const d = buildBodyData(e.data ?? undefined);
  const transfer = [d.position, d.normal, d.bones, d.weights, d.info, d.fibre, d.extra, d.fuv, d.seg, d.index, d.bind].map((a) => a.buffer as ArrayBuffer);
  (self as unknown as Worker).postMessage(d, transfer);
};
