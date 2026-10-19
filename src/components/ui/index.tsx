import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, X } from '@phosphor-icons/react';
import { gsap, useGSAP } from '../../lib/gsap';

export { Card, SectionTitle } from './Card';

/* ---------------- PageHeader ---------------- */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/* ---------------- LetterLabel ---------------- */

/**
 * Splits a label into per-letter spans so the letters can animate on hover.
 * Words stay whole (they never break mid-word) while the line still wraps at
 * spaces. The text content is unchanged, so accessible names and tests that
 * read `textContent` keep working.
 */
export function LetterLabel({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(\s+)/).filter(Boolean);
  let step = 0;

  return (
    <span className={`btn-label ${className}`}>
      {parts.map((part, partIndex) => {
        if (/^\s+$/.test(part)) {
          return <span key={`gap-${partIndex}`}>{part}</span>;
        }
        return (
          <span key={`word-${partIndex}`} className="btn-word">
            {[...part].map((letter, letterIndex) => (
              <span
                key={`letter-${partIndex}-${letterIndex}`}
                className="btn-letter"
                style={
                  { '--letter-index': Math.min(step++, 12) } as React.CSSProperties
                }
              >
                {letter}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

/** Buttons animate their own labels; a truncating button keeps a plain node. */
function labelWithLetters(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === 'string' ? <LetterLabel text={child} /> : child,
  );
}

/* ---------------- Button ---------------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | 'default'
    | 'ghost'
    | 'outline'
    | 'destructive'
    | 'secondary'
    | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  block?: boolean;
};

export function Button({
  className = '',
  variant = 'default',
  size = 'md',
  type,
  block,
  children,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    default:
      'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85',
    ghost:
      'text-muted-foreground hover:bg-muted hover:text-foreground',
    outline:
      'border border-border bg-transparent text-foreground hover:border-input hover:bg-muted/70',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/92',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-muted',
    link:
      'text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground',
  };

  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-[12.5px]',
    md: 'h-9 px-4 text-[13px]',
    lg: 'h-10 px-5 text-[13.5px]',
    icon: 'h-10 w-10 max-sm:w-11',
  };

  // A truncating label needs its own text node to keep the ellipsis.
  const animateLabel = !/\btruncate\b/.test(className);

  return (
    <button
      type={type ?? 'button'}
      className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-md font-medium tracking-[-0.005em] transition-[background-color,border-color,transform,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:min-h-0 ${block ? 'w-full' : ''} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {animateLabel ? labelWithLetters(children) : children}
    </button>
  );
}

/* ---------------- Inputs ---------------- */
const fieldClass =
  'min-w-0 w-full rounded-md border border-input bg-card text-[13.5px] leading-normal text-foreground placeholder:text-muted-foreground/85 transition-[border-color,box-shadow,background-color] duration-150 hover:border-muted-foreground/45 focus:border-ring focus:bg-card focus:outline-none focus:ring-[3px] focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/15';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Icon rendered inside the field, before the text. */
  leadingIcon?: React.ReactNode;
  /** Interactive element rendered inside the field, after the text. */
  trailing?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', leadingIcon, trailing, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      className={`${fieldClass} h-11 px-3 sm:h-10 ${leadingIcon ? 'pl-9' : ''} ${
        trailing ? 'pr-11' : ''
      } ${className}`}
      {...props}
    />
  );

  if (!leadingIcon && !trailing) return field;

  return (
    <div
      className={`relative min-w-0 ${
        /\bw-auto\b/.test(className) ? 'w-auto' : 'w-full'
      }`}
    >
      {leadingIcon && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground"
        >
          {leadingIcon}
        </span>
      )}
      {field}
      {trailing && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </div>
  );
});

export function Textarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${fieldClass} min-h-[76px] resize-y px-3 py-2.5 leading-relaxed ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = '',
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  const autoWidth = /\bw-auto\b/.test(className);
  return (
    <div className={`relative min-w-0 ${autoWidth ? 'w-auto' : 'w-full'}`}>
      <select
        className={`${fieldClass} h-11 cursor-pointer appearance-none py-0 pl-3 pr-9 sm:h-10 ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown
        aria-hidden
        size={13}
        weight="bold"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export function Label({
  htmlFor,
  children,
  className = '',
  title,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      title={title}
      className={`mb-1.5 block text-[11.5px] font-medium tracking-[0.01em] text-muted-foreground ${className}`}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-relaxed text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  'aria-label': ariaLabel,
  reference,
}: {
  checked: boolean;
  onChange: (next: boolean, e: React.MouseEvent) => void;
  'aria-label'?: string;
  reference?: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <span
      ref={reference}
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked, e as unknown as React.MouseEvent);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked, e);
      }}
      className={`relative inline-flex h-[19px] w-[19px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border transition-[background-color,border-color,color] duration-150 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] sm:after:h-8 sm:after:w-8 ${
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-card hover:border-ring'
      }`}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            d="M20 6 9 17l-5-5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function Badge({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-[10.5px] font-medium leading-normal ${
        className || 'bg-muted text-muted-foreground'
      }`}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ---------------- Tooltip (native-title based, accessible) ---------------- */
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span title={label} aria-label={label} className="inline-flex">
      {children}
    </span>
  );
}

/* ---------------- Dialog ---------------- */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Kept mounted for one short exit beat so closing does not snap.
  const [present, setPresent] = useState(open);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  // The panel settles in; the backdrop fades beneath it. Closing is quicker
  // and softer than opening. Both respect the system reduced-motion setting.
  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!overlay || !panel) return;

      const mm = gsap.matchMedia();

      if (!open) {
        mm.add('(prefers-reduced-motion: reduce)', () => {
          setPresent(false);
        });
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap
            .timeline({ onComplete: () => setPresent(false) })
            .to(panel, { autoAlpha: 0, y: 6, duration: 0.15, ease: 'power2.in' }, 0)
            .to(overlay, { autoAlpha: 0, duration: 0.15, ease: 'power2.in' }, 0);
        });
        return () => mm.revert();
      }

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([overlay, panel], { autoAlpha: 1, clearProps: 'all' });
      });
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo(
            overlay,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.18, ease: 'power2.out' },
          )
          .fromTo(
            panel,
            { autoAlpha: 0, y: 8, scale: 0.985 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.26,
              clearProps: 'transform',
            },
            0.02,
          );
      });
      return () => mm.revert();
    },
    { scope: panelRef, dependencies: [open, present], revertOnUpdate: true },
  );

  // Escape closes, Tab cycles inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock the page behind the dialog and return focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      const target = restoreFocusRef.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [open]);

  // Focus the panel only when it opens and only if nothing inside already has
  // focus. Re-running this on every parent render steals focus from inputs.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!present || typeof document === 'undefined') return null;

  // Portalled to <body>: page containers animate with a transform, which would
  // otherwise become the containing block and trap the fixed overlay inside
  // the scrolled content column.
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/30 p-3 dark:bg-black/55 sm:px-6 sm:py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full ${
          wide ? 'max-w-2xl' : 'max-w-md'
        } flex-col overflow-hidden rounded-xl border border-border bg-card focus:outline-none sm:max-h-[calc(100dvh-5rem)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
          <h2 className="pt-0.5 font-display text-[21px] leading-tight tracking-[-0.02em]">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-0.5"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} weight="bold" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3.5 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- ConfirmDialog ---------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-muted-foreground">{message}</div>
    </Dialog>
  );
}

/* ---------------- Toasts ---------------- */
export interface ToastItem {
  id: string;
  kind: 'success' | 'error' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<{
  push: (
    kind: ToastItem['kind'],
    message: string,
    action?: ToastItem['action'],
  ) => void;
} | null>(null);

function ToastCard({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);

  // Toasts arrive while the eye is elsewhere: a short rise, nothing more.
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'all' });
      });
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.2,
            ease: 'power2.out',
            clearProps: 'transform',
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  // The exit is shorter and softer than the entrance, so it never competes
  // with whatever the action just opened.
  const dismiss = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onRemove(toast.id);
      return;
    }
    gsap.to(el, {
      autoAlpha: 0,
      y: -6,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => onRemove(toast.id),
    });
  }, [onRemove, toast.id]);

  // A single timer per toast, keyed on its id so parent rerenders do not
  // restart the reading time.
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), 6000);
    return () => window.clearTimeout(timer);
  }, [toast.id]);

  return (
    <div
      ref={ref}
      role="status"
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3.5 text-[12.5px] leading-relaxed shadow-[0_12px_32px_-20px_rgba(0,0,0,0.35)] ${
        toast.kind === 'error'
          ? 'border-destructive/30 bg-destructive text-destructive-foreground'
          : 'border-border bg-card text-foreground'
      }`}
    >
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <Button
          size="sm"
          variant="link"
          className="h-auto px-0 py-0 text-[12px]"
          onClick={() => {
            toast.action?.onClick();
            dismiss();
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        className="relative mt-0.5 opacity-55 transition-opacity duration-150 hover:opacity-100"
        onClick={dismiss}
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback(
    (kind: ToastItem['kind'], message: string, action?: ToastItem['action']) => {
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev.slice(-4), { id, kind, message, action }]);
    },
    [],
  );
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2 sm:bottom-5 sm:right-5">
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export function useUniqueId() {
  return useId();
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className = '',
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  /** Tighter spacing when an empty state sits inside a card. */
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 px-6 py-14 text-center ${className}`}
    >
      {icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="text-[14.5px] font-medium leading-snug text-foreground">
        {title}
      </div>
      {hint && (
        <div className="max-w-[42ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {hint}
        </div>
      )}
      {action}
    </div>
  );
}

/* ---------------- ProgressRing ---------------- */
export function ProgressRing({
  pct,
  done,
  total,
}: {
  pct: number;
  done: number;
  total: number;
}) {
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div
      className="relative h-[92px] w-[92px] shrink-0"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Today's completion percentage"
    >
      <svg viewBox="0 0 80 80" className="h-[92px] w-[92px] -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={5}
        />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[24px] leading-none tracking-[-0.03em] tabular-nums">
          {pct}%
        </span>
        <span className="mt-1 text-[10px] text-muted-foreground">
          {done} of {total}
        </span>
      </div>
    </div>
  );
}
