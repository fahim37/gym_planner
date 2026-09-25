import { expect } from "vitest";

/**
 * Fails with every problem listed, one per line. (A plain `toEqual([])` gets
 * truncated, and vitest merges failures whose messages are identical.)
 */
export function expectNoProblems(problems: readonly string[], context: string) {
  if (problems.length === 0) return;
  expect.fail(`${context} — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n  • ${problems.join("\n  • ")}\n`);
}
