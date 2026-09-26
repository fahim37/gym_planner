import { buildBodyData, type BodyData, type BuildOptions } from "./build";
import { buildSculptedBody } from "./mhbody";

export type WorkerRequest = { kind: "procedural"; opts: BuildOptions } | { kind: "sculpted"; levels: number };

/** Generates the body mesh off the main thread and transfers the buffers back. */
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  const d: BodyData = req.kind === "sculpted" ? await buildSculptedBody(req.levels) : buildBodyData(req.opts);
  const transfer = [d.position, d.normal, d.bones, d.weights, d.info, d.fibre, d.extra, d.fuv, d.seg, d.index, d.bind].map((a) => a.buffer as ArrayBuffer);
  (self as unknown as Worker).postMessage(d, transfer);
};
