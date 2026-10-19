import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  CalendarBlank,
  CalendarDots,
  CaretLeft,
  ChartBar,
  Checks,
  Flame,
  GearSix,
  List,
  MagnifyingGlass,
  Moon,
  Plus,
  Repeat,
  SquaresFour,
  Sun,
  Timer,
  X,
} from '@phosphor-icons/react';
import { Button, LetterLabel, Tooltip } from '../ui';
import { useNow } from '../../hooks';
import { PageTransition } from '../motion/PageTransition';
import { gsap, useGSAP } from '../../lib/gsap';
import { oppositeTheme } from '../../services/settingsService';
import type { ResolvedTheme } from '../../types';

export type Route =
  | 'dashboard'
  | 'schedule'
  | 'tasks'
  | 'upcoming'
  | 'recurring'
  | 'completed'
  | 'habits'
  | 'stats'
  | 'settings'
  | 'focus'
  // Not a destination in NAV: the fallback for an address that matches nothing.
  | 'not-found';

interface NavItem {
  id: Route;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const icon = (node: ReactNode) => node;

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Plan',
    items: [
      { id: 'dashboard', label: 'Today', icon: icon(<SquaresFour size={16} weight="bold" />) },
      { id: 'schedule', label: 'Schedule', icon: icon(<CalendarBlank size={16} weight="bold" />) },
      { id: 'tasks', label: 'All tasks', icon: icon(<Checks size={16} weight="bold" />) },
      { id: 'upcoming', label: 'Upcoming', icon: icon(<CalendarDots size={16} weight="bold" />) },
    ],
  },
  {
    label: 'Track',
    items: [
      { id: 'recurring', label: 'Recurring', icon: icon(<Repeat size={16} weight="bold" />) },
      { id: 'completed', label: 'Completed', icon: icon(<Checks size={16} weight="bold" />) },
      { id: 'habits', label: 'Habits', icon: icon(<Flame size={16} weight="bold" />) },
    ],
  },
  {
    label: 'Review',
    items: [
      { id: 'stats', label: 'Statistics', icon: icon(<ChartBar size={16} weight="bold" />) },
      { id: 'focus', label: 'Focus', icon: icon(<Timer size={16} weight="bold" />) },
    ],
  },
];

export const NAV: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  {
    id: 'settings',
    label: 'Settings',
    icon: icon(<GearSix size={16} weight="bold" />),
  },
];

const THEME_META: Record<ResolvedTheme, { icon: ReactNode; label: string }> = {
  light: { icon: <Sun size={16} weight="bold" />, label: 'Light' },
  dark: { icon: <Moon size={16} weight="bold" />, label: 'Dark' },
};

/**
 * One name for the action everywhere it appears. `theme` is the resolved theme —
 * a stored `system` preference arrives here already pinned to a side, so the
 * control never has to name a third state it cannot show.
 */
function themeSwitchLabel(theme: ResolvedTheme): string {
  return `Switch to ${THEME_META[oppositeTheme(theme)].label.toLowerCase()} theme`;
}

/** Header and rail share one control: the current theme, switching on click. */
function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ResolvedTheme;
  onToggle: () => void;
}) {
  const label = themeSwitchLabel(theme);
  return (
    <Tooltip label={label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        className="hidden md:inline-flex"
        onClick={onToggle}
      >
        {THEME_META[theme].icon}
      </Button>
    </Tooltip>
  );
}

function ThemeRow({
  theme,
  onToggle,
  collapsed = false,
}: {
  theme: ResolvedTheme;
  onToggle: () => void;
  collapsed?: boolean;
}) {
  const label = themeSwitchLabel(theme);

  const button = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground md:min-h-[38px] ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      <span className="shrink-0">{THEME_META[theme].icon}</span>
      {!collapsed && <LetterLabel text={label} className="truncate" />}
    </button>
  );

  // Collapsed, the row is icon-only, so it needs the same tooltip as its neighbours.
  if (collapsed) return <Tooltip label={label}>{button}</Tooltip>;
  return button;
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card font-display text-[15px] leading-none">
        D
      </span>
      {!collapsed && (
        <span className="font-display text-[17px] leading-none tracking-[-0.02em]">
          DayPlan
        </span>
      )}
    </div>
  );
}

function NavButton({
  item,
  active,
  collapsed = false,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={`relative flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-150 md:min-h-[38px] {
        collapsed ? 'justify-center' : ''
      } {
        active
          ? 'bg-accent font-medium text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
      }`}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-3.5 w-px -translate-y-1/2 bg-accent-foreground/50"
        />
      )}
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && (
        <LetterLabel text={item.label} className="truncate" />
      )}
    </button>
  );

  if (collapsed) {
    return <Tooltip label={item.label}>{button}</Tooltip>;
  }
  return button;
}

export function AppShell({
  route,
  onNavigate,
  onOpenSearch,
  onQuickAdd,
  theme,
  onToggleTheme,
  children,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
  onOpenSearch: () => void;
  onQuickAdd: () => void;
  /** The theme on screen, already resolved from any `system` preference. */
  theme: ResolvedTheme;
  onToggleTheme: () => void;
  children: ReactNode;
}) {
  const now = useNow(30_000);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Kept true for one short exit beat so closing does not snap.
  const [drawerPresent, setDrawerPresent] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDrawerOpen(false), [route]);

  useEffect(() => {
    if (drawerOpen) setDrawerPresent(true);
  }, [drawerOpen]);

  // The drawer eases in from the left and eases back out; the backdrop fades
  // underneath it. Reduced motion swaps the travel for an instant swap.
  useGSAP(
    () => {
      const panel = drawerRef.current;
      const backdrop = backdropRef.current;
      if (!panel || !backdrop) return;

      const mm = gsap.matchMedia();

      if (!drawerOpen) {
        mm.add('(prefers-reduced-motion: reduce)', () => {
          setDrawerPresent(false);
        });
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap
            .timeline({ onComplete: () => setDrawerPresent(false) })
            .to(backdrop, { autoAlpha: 0, duration: 0.16, ease: 'power2.in' }, 0)
            .to(
              panel,
              { autoAlpha: 0, xPercent: -10, duration: 0.18, ease: 'power2.in' },
              0,
            );
        });
        return () => mm.revert();
      }

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([backdrop, panel], { autoAlpha: 1, xPercent: 0, clearProps: 'transform' });
      });
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo(
            backdrop,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.22, ease: 'power2.out' },
            0,
          )
          .fromTo(
            panel,
            { autoAlpha: 0, xPercent: -100 },
            {
              autoAlpha: 1,
              xPercent: 0,
              duration: 0.36,
              clearProps: 'transform,opacity,visibility',
            },
            0.02,
          );
      });
      return () => mm.revert();
    },
    { dependencies: [drawerOpen, drawerPresent], revertOnUpdate: true },
  );

  // The drawer covers the page: close on Escape, trap Tab inside it, and stop
  // the page behind from scrolling. Focus returns to the trigger on close.
  useEffect(() => {
    if (!drawerPresent) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = drawerRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    const focusTimer = window.setTimeout(() => drawerRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      document.getElementById('nav-toggle')?.focus();
    };
  }, [drawerPresent]);

  // A new route starts at the top of the page, not wherever the last one ended.
  // The jump is instant: smooth scrolling is for in-page anchors.
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (typeof main.scrollTo === 'function') {
      main.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      main.scrollTop = 0;
    }
  }, [route]);

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const navigate = (r: Route) => {
    onNavigate(r);
    setDrawerOpen(false);
  };

  const settingsItem = NAV[NAV.length - 1]!;

  const groups = (isCollapsed: boolean) => (
    <div className="flex flex-col">
      {NAV_GROUPS.map((group, index) => (
        <div
          key={group.label}
          className={`pt-3 ${index === 0 ? 'pt-1' : 'mt-2 border-t border-border/70'}`}
        >
          {!isCollapsed && (
            <div className="px-2.5 pb-1 text-[10.5px] font-medium tracking-[0.01em] text-muted-foreground">
              {group.label}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={route === item.id}
                collapsed={isCollapsed}
                onClick={() => navigate(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 supports-[height:100dvh]:h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-[13px] focus:shadow-sm"
      >
        Skip to content
      </a>        <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-r border-border bg-background md:flex md:transition-[width,opacity] md:duration-300 md:ease-[cubic-bezier(0.4,0,0.2,1)] ${
          collapsed ? 'md:w-[62px] md:opacity-100' : 'md:w-[232px] md:opacity-100'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4 md:transition-all md:duration-300 md:ease-[cubic-bezier(0.4,0,0.2,1)]">
          <BrandMark collapsed={collapsed} />
        </div>

        <nav
          aria-label="Main navigation"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-3"
        >
          {groups(collapsed)}

          <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-2">
            <ThemeRow
              theme={theme}
              onToggle={onToggleTheme}
              collapsed={collapsed}
            />                <NavButton
                  item={settingsItem}
                  active={route === 'settings'}
                  collapsed={collapsed}
                  onClick={() => navigate('settings')}
                />
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground md:min-h-[38px] ${
                collapsed ? 'justify-center' : ''
              }`}
            >                <CaretLeft
                size={16}
                weight="bold"
                className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'rotate-180' : ''}`}
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </nav>
      </aside>

      {drawerPresent && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <div
            ref={backdropRef}
            className="absolute inset-0 bg-foreground/25"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="mobile-nav"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[264px] max-w-[85vw] flex-col border-r border-border bg-background focus:outline-none"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <BrandMark />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={16} weight="bold" />
              </Button>
            </div>
            <nav
              aria-label="Main navigation"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 py-2"
            >
              {groups(false)}
              <div className="mt-auto border-t border-border pt-2">
                <ThemeRow theme={theme} onToggle={onToggleTheme} />
                <NavButton
                  item={settingsItem}
                  active={route === 'settings'}
                  onClick={() => navigate('settings')}
                />
              </div>
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:gap-3 sm:px-6">
          <Button
            id="nav-toggle"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav"
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <List size={18} weight="bold" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="meta flex min-w-0 flex-wrap items-baseline gap-x-2 text-muted-foreground">
              <span className="truncate">{dateStr}</span>
              <span className="hidden text-border sm:inline">/</span>
              <span className="hidden sm:inline">{timeStr}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden h-8 w-44 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-input lg:flex lg:w-56"
            aria-label="Search tasks"
          >
            <MagnifyingGlass size={14} weight="bold" />
            <span className="flex-1 text-left">Search tasks</span>
            <kbd>/</kbd>
          </button>

          <Tooltip label="Search (/)">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="lg:hidden"
              onClick={onOpenSearch}
            >
              <MagnifyingGlass size={17} weight="bold" />
            </Button>
          </Tooltip>

          <Button
            variant="outline"
            onClick={onQuickAdd}
            className="hidden sm:inline-flex"
          >
            <Plus size={15} weight="bold" />
            New task
          </Button>

          <Tooltip label="New task (N)">
            <Button
              variant="outline"
              size="icon"
              aria-label="New task"
              className="sm:hidden"
              onClick={onQuickAdd}
            >
              <Plus size={16} weight="bold" />
            </Button>
          </Tooltip>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <Tooltip label="Settings">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
              className={`hidden md:inline-flex ${
                route === 'settings' ? 'bg-accent text-accent-foreground' : ''
              }`}
              onClick={() => onNavigate('settings')}
            >
              <GearSix size={17} weight="bold" />
            </Button>
          </Tooltip>
        </header>

        <main
          id="main"
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-9">
            <PageTransition route={route}>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
