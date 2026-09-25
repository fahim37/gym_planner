"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface FocusRequest {
  /** Focused part id, or null for none. */
  id: string | null;
  /** Where the request came from: the page's part list scrolls the viewer into view. */
  source: "viewer" | "list";
  /** Bumped on every request, so re-selecting the same part re-focuses it. */
  nonce: number;
}

interface FocusContext {
  focus: FocusRequest;
  setFocus: (id: string | null, source?: FocusRequest["source"]) => void;
}

const Ctx = createContext<FocusContext | null>(null);

function useFocusState(): FocusContext {
  const [focus, set] = useState<FocusRequest>({ id: null, source: "viewer", nonce: 0 });
  const setFocus = useCallback(
    (id: string | null, source: FocusRequest["source"] = "viewer") => set((f) => ({ id, source, nonce: f.nonce + 1 })),
    [],
  );
  return useMemo(() => ({ focus, setFocus }), [focus, setFocus]);
}

/** Shares the focused part between the 3D viewer and part lists elsewhere on the page. */
export function EquipmentFocusProvider({ children }: { children: React.ReactNode }) {
  return <Ctx value={useFocusState()}>{children}</Ctx>;
}

/** The page's shared focus state, or local state when there is no provider. */
export function useEquipmentFocus(): FocusContext {
  const local = useFocusState();
  return useContext(Ctx) ?? local;
}
