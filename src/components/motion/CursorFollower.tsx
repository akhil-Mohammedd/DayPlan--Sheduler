import { useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';

/** Controls that count as "the pointer is over something clickable". */
const INTERACTIVE = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  'select',
  'summary',
  'label[for]',
  'input[type="checkbox"]',
  'input[type="radio"]',
].join(', ');

/** Class on <html> that swaps the system pointer for this one. */
const HIDE_NATIVE = 'cursor-fine';
const SPARKLE_SHAPES = ['star', 'diamond', 'cross', 'burst'] as const;

/** Read a design token so the cursor always matches the current theme. */
function token(name: string, alpha: number): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return `hsl(${raw || '40 8% 10%'} / ${alpha})`;
}

/**
 * The pointer for fine-pointer visitors: a hairline ring with a centre dot
 * that replaces the system cursor. Over a control it grows into a lens that
 * inverts the pixels underneath — light theme inside a dark control, dark
 * theme inside a light one — while the control itself lifts by a hair. Touch
 * devices and reduced-motion visitors keep their normal cursor.
 */
export function CursorFollower() {
  const rootRef = useRef<HTMLDivElement>(null);
  const sparkleLayerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const lensRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const sparkleLayer = sparkleLayerRef.current;
      const scaleWrap = scaleRef.current;
      const ring = ringRef.current;
      const lens = lensRef.current;
      const halo = haloRef.current;
      if (!root || !sparkleLayer || !scaleWrap || !ring || !lens || !halo) return;
      const sparkles = [...sparkleLayer.querySelectorAll<HTMLElement>('.cursor-follower__sparkle')];
      if (!window.matchMedia('(pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // The system pointer only disappears once this cursor is really running,
      // so a failed enhancement never leaves the visitor without a pointer.
      const html = document.documentElement;
      html.classList.add(HIDE_NATIVE);

      // Without backdrop-filter the lens cannot invert, so fall back to a
      // translucent ink wash that still reads on both themes.
      const canInvert =
        typeof CSS !== 'undefined' &&
        typeof CSS.supports === 'function' &&
        CSS.supports('backdrop-filter', 'invert(1)');

      // Short trail: enough to feel smooth, tight enough to aim with, now that
      // no system cursor sits underneath.
      const moveX = gsap.quickTo(root, 'x', { duration: 0.07, ease: 'power2.out' });
      const moveY = gsap.quickTo(root, 'y', { duration: 0.07, ease: 'power2.out' });

      const safe = <T extends (...args: never[]) => unknown>(fn: T): T =>
        contextSafe ? contextSafe(fn) : fn;

      let hot = false;
      let sparkleIndex = 0;
      let lastSparkleAt = 0;
      let lastSparkleX = -1;
      let lastSparkleY = -1;

      const emitSparkle = safe((x: number, y: number, duration: number, deltaX: number, deltaY: number) => {
        const sparkle = sparkles[sparkleIndex % sparkles.length];
        sparkleIndex += 1;
        if (!sparkle) return;

        const directionLength = Math.hypot(deltaX, deltaY) || 1;
        const directionX = deltaX / directionLength;
        const directionY = deltaY / directionLength;
        const backstep = Math.random() * 8;
        const sideStep = (Math.random() - 0.5) * 8;
        const originX = x - directionX * backstep - directionY * sideStep;
        const originY = y - directionY * backstep + directionX * sideStep;
        gsap.fromTo(
          sparkle,
          { x: originX, y: originY, scale: 1.15, autoAlpha: 1, rotation: 0 },
          {
            x: originX,
            y: originY,
            scale: 0.1,
            rotation: 45 + Math.random() * 90,
            autoAlpha: 0,
            duration,
            ease: 'power1.out',
            overwrite: true,
          },
        );
      });

      // The lens enlarges the letters it passes over — only the ones inside the
      // circle, only on the control currently under the pointer. The size boost
      // peaks at the centre and eases toward the edge so it feels classy rather
      // than a hard pop. Peak size is proportional to half the lens radius.
      const LENS_RADIUS = 22;
      const LENS_MAX_DURATION = 0.34;
      const LENS_MAX_LIFT = 0.16;
      const sizeAtCenter = Math.max(0, LENS_RADIUS / 2);
      const LENS_MAX_SIZE = 1 + sizeAtCenter / 10;

      let zoomed: HTMLElement | null = null;
      let letters: { el: HTMLElement; x: number; y: number }[] = [];
      const letterFns = new Map<
        HTMLElement,
        {
          scale: (value: number) => void;
          y: (value: number) => void;
          skewX: (value: number) => void;
        }
      >();
      let lastX = -1;
      let lastY = -1;

      const measureLetters = () => {
        letters = letters.map(({ el }) => {
          const rect = el.getBoundingClientRect();
          return { el, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });
      };

      /** Enlarge, lift, and tilt the letters under the lens. */
      const magnify = (x: number, y: number) => {
        for (const letter of letters) {
          let axes = letterFns.get(letter.el);
          if (!axes) {
            axes = {
              scale: gsap.quickTo(letter.el, 'scale', {
                duration: LENS_MAX_DURATION,
                ease: 'power2.out',
              }),
              y: gsap.quickTo(letter.el, 'y', {
                duration: LENS_MAX_DURATION,
                ease: 'power2.out',
              }),
              skewX: gsap.quickTo(letter.el, 'skewX', {
                duration: LENS_MAX_DURATION,
                ease: 'power2.out',
              }),
            };
            letterFns.set(letter.el, axes);
          }
          const dx = letter.x - x;
          const dy = letter.y - y;
          const dist = Math.hypot(dx, dy);
          const radius = dist >= LENS_RADIUS ? 0 : 1 - dist / LENS_RADIUS;

          // Size is tied to half the circle radius; edge letters whisper.
          const size = 1 + radius * (LENS_MAX_SIZE - 1);
          const lift = radius * LENS_MAX_LIFT;
          const skew = radius * 3;

          axes.scale(size);
          axes.y(-lift * 8);
          axes.skewX(skew);
        }
      };

      const setControl = (el: HTMLElement | null) => {
        if (zoomed === el) return;
        zoomed = el;
        letterFns.forEach(({ scale, y, skewX }) => {
          scale(1);
          y(0);
          skewX(0);
        });
        letterFns.clear();
        letters = el
          ? [...el.querySelectorAll<HTMLElement>('.btn-letter')].map((node) => ({
              el: node,
              x: 0,
              y: 0,
            }))
          : [];
        if (letters.length) measureLetters();
        magnify(lastX, lastY);
      };

      const applyState = safe((next: boolean) => {
        hot = next;
        gsap.to(scaleWrap, {
          scale: next ? 2.2 : 1,
          duration: 0.34,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        gsap.to(ring, {
          borderColor: next ? token('--foreground', 0.6) : token('--input', 1),
          outlineColor: next
            ? token('--background', 0.55)
            : token('--background', 0),
          backgroundColor:
            next && !canInvert
              ? token('--foreground', 0.12)
              : token('--foreground', 0),
          duration: 0.3,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        gsap.to(lens, {
          opacity: next && canInvert ? 1 : 0,
          duration: 0.24,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        gsap.to(halo, {
          opacity: next ? 0.28 : 0,
          scale: next ? 1.18 : 1,
          backgroundColor: token('--foreground', 0.14),
          duration: 0.42,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      });

      const press = safe((down: boolean) => {
        gsap.to(scaleWrap, {
          scale: down ? (hot ? 2 : 0.82) : hot ? 2.2 : 1,
          duration: 0.16,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      });

      const onMove = (e: PointerEvent) => {
        moveX(e.clientX);
        moveY(e.clientY);
        lastX = e.clientX;
        lastY = e.clientY;
        magnify(lastX, lastY);
        root.dataset.visible = 'true';

        const deltaX = lastSparkleX < 0 ? 0 : e.clientX - lastSparkleX;
        const deltaY = lastSparkleY < 0 ? 0 : e.clientY - lastSparkleY;
        const distance = Math.hypot(deltaX, deltaY);
        if (
          lastSparkleX < 0 ||
          (distance > 4 && e.timeStamp - lastSparkleAt > 42)
        ) {
          if (lastSparkleX >= 0) {
            const dragging = e.buttons > 0;
            const burstSize = dragging ? 3 : 2;
            const duration = dragging ? 0.5 : 1;
            for (let i = 0; i < burstSize; i += 1) {
              emitSparkle(e.clientX, e.clientY, duration, deltaX, deltaY);
            }
          }
          lastSparkleX = e.clientX;
          lastSparkleY = e.clientY;
          lastSparkleAt = e.timeStamp;
        }
      };
      const onDragOver = (e: DragEvent) => onMove(e as unknown as PointerEvent);
      const onOver = (e: PointerEvent) => {
        const target = e.target instanceof Element ? e.target : null;
        const control = target?.closest<HTMLElement>(INTERACTIVE) ?? null;
        const next = !!control && !control.matches(':disabled');
        setControl(next ? control : null);
        if (next !== hot) applyState(next);
      };

      // Scrolling moves the letters underneath a still pointer.
      const onScroll = () => {
        if (!letters.length) return;
        measureLetters();
        magnify(lastX, lastY);
      };
      const onDown = () => press(true);
      const onUp = () => press(false);
      const onLeave = () => {
        root.dataset.visible = 'false';
        setControl(null);
        if (hot) applyState(false);
      };
      const onEnter = () => {
        root.dataset.visible = 'true';
      };

      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('dragover', onDragOver, true);
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });
      window.addEventListener('pointerover', onOver, true);
      window.addEventListener('pointerdown', onDown, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('blur', onLeave);
      document.documentElement.addEventListener('pointerleave', onLeave);
      document.documentElement.addEventListener('pointerenter', onEnter);

      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('dragover', onDragOver, true);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('pointerover', onOver, true);
        window.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('blur', onLeave);
        document.documentElement.removeEventListener('pointerleave', onLeave);
        document.documentElement.removeEventListener('pointerenter', onEnter);
        letterFns.clear();
        html.classList.remove(HIDE_NATIVE);
      };
    },
    { dependencies: [] },
  );

  return (
    <>
      <div ref={sparkleLayerRef} aria-hidden className="cursor-sparkle-layer">
        {Array.from({ length: 72 }, (_, sparkle) => (
          <span
            key={sparkle}
            className={`cursor-follower__sparkle cursor-follower__sparkle--${SPARKLE_SHAPES[sparkle % SPARKLE_SHAPES.length]}`}
          />
        ))}
      </div>
      <div ref={rootRef} aria-hidden className="cursor-follower">
        <span className="cursor-follower__dot" />
        <span ref={scaleRef} className="cursor-follower__scale">
          <span ref={haloRef} className="cursor-follower__halo" />
          <span ref={lensRef} className="cursor-follower__lens" />
          <span ref={ringRef} className="cursor-follower__ring" />
        </span>
      </div>
    </>
  );
}
