import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { navigate } from "../router";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  children?: ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

/** Stand-in for next/link that navigates with the in-memory router. */
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, replace, prefetch, scroll, ...rest }, ref) {
  void prefetch;
  void scroll;
  const target =
    typeof href === "string" ? href : `${href.pathname ?? ""}${href.query ? `?${new URLSearchParams(href.query)}` : ""}`;
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(target, { replace });
  };
  return <a ref={ref} href={`#${target}`} onClick={handle} {...rest} />;
});

export default Link;
