import { useMemo } from "react";
import { back, navigate, useLocation } from "../router";

/** Stand-ins for next/navigation backed by the in-memory router. */
export class NotFoundError extends Error {}

export function notFound(): never {
  throw new NotFoundError("not found");
}

export function redirect(href: string): never {
  navigate(href, { replace: true });
  throw new NotFoundError("redirect");
}

export function useRouter() {
  return useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => navigate(href, { replace: true }),
      back,
      forward: () => window.history.forward(),
      refresh: () => undefined,
      prefetch: () => undefined,
    }),
    [],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams() {
  return {};
}
