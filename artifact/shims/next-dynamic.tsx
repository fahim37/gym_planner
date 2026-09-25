import { lazy, Suspense, type ComponentType } from "react";

/** next/dynamic stand-in (client-only rendering is the default here). */
export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  opts: { loading?: () => React.ReactNode } = {},
) {
  const Lazy = lazy(async () => {
    const mod = await loader();
    return "default" in mod ? mod : { default: mod };
  });
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={opts.loading?.() ?? null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
