import { useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';

/**
 * Shown while the local database and settings open. Quiet by design: the brand
 * mark, one honest line, and the shape of what is coming.
 */
export function LoadingScreen() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(root, { autoAlpha: 1, y: 0, clearProps: 'all' });
      });
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          root,
          { autoAlpha: 0, y: 6 },
          { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power2.out' },
        );
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div
        ref={rootRef}
        role="status"
        aria-live="polite"
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card font-display text-[15px] leading-none">
            D
          </span>
          <span className="font-display text-[17px] leading-none tracking-[-0.02em]">
            DayPlan
          </span>
        </div>

        <p className="mt-6 text-[13px] text-muted-foreground">
          Preparing your day…
        </p>

        <div className="mt-4 space-y-2" aria-hidden>
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-3 w-1/3" />
        </div>

        <div className="mt-8 h-24 rounded-xl border border-border bg-card" aria-hidden>
          <div className="skeleton m-4 h-3 w-1/2" />
          <div className="skeleton mx-4 h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
