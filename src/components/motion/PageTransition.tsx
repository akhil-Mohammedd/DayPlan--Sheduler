import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';

/**
 * One entrance per route: the new page settles into place. Motion is skipped
 * entirely for people who ask their system to reduce it.
 */
export function PageTransition({
  route,
  children,
}: {
  route: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(root, { autoAlpha: 1, y: 0, filter: 'none', clearProps: 'all' });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const wide = window.matchMedia('(min-width: 768px)').matches;
        gsap.fromTo(
          root,
          {
            autoAlpha: 0,
            y: 12,
            filter: wide ? 'blur(3px)' : 'none',
            willChange: 'transform, opacity',
          },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.42,
            ease: 'power3.out',
            clearProps: 'transform,filter,willChange',
          },
        );
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [route], revertOnUpdate: true },
  );

  return <div ref={rootRef}>{children}</div>;
}
