import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { AppShell, type Route, NAV } from './components/layout/AppShell';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CursorFollower } from './components/motion/CursorFollower';
import { StatusPage } from './components/system/StatusPage';
import { NotFoundPage } from './features/system/NotFoundPage';
import { Dialog, Input, ToastProvider, Button, EmptyState } from './components/ui';
import {
  useAllTasks,
  applyFilter,
  useOccurrenceSync,
  usePrefersDark,
  useSettings,
  useThemeEffect,
  type TaskFilter,
} from './hooks';
import type { Task } from './types';
import { resolvedTheme, toggleTheme } from './services/settingsService';
import { TaskForm } from './components/tasks/TaskForm';
import { TaskItem } from './components/tasks/TasksUI';

const STORAGE_ROUTE = 'dayplan-route';

const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const SchedulePage = lazy(() =>
  import('./features/scheduler/SchedulePage').then((module) => ({
    default: module.SchedulePage,
  })),
);
const TasksPage = lazy(() =>
  import('./features/tasks/TasksPage').then((module) => ({
    default: module.TasksPage,
  })),
);
const RecurringPage = lazy(() =>
  import('./features/tasks/RecurringPage').then((module) => ({
    default: module.RecurringPage,
  })),
);
const HabitsPage = lazy(() =>
  import('./features/habits/HabitsPage').then((module) => ({
    default: module.HabitsPage,
  })),
);
const StatsPage = lazy(() =>
  import('./features/stats/StatsPage').then((module) => ({
    default: module.StatsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const FocusTimerPage = lazy(() =>
  import('./features/focus/FocusTimerPage').then((module) => ({
    default: module.FocusTimerPage,
  })),
);

/** Every route the app can actually render; anything else is a 404. */
function isKnownRoute(value: string | null | undefined): value is Route {
  return !!value && NAV.some((n) => n.id === value);
}

function readAddress(): string {
  return window.location.hash.replace('#', '');
}

function readInitialRoute(): Route {
  try {
    const hash = readAddress();
    if (hash) return isKnownRoute(hash) ? hash : 'not-found';
    const stored = window.localStorage.getItem(STORAGE_ROUTE);
    if (isKnownRoute(stored)) return stored;
  } catch {
    /* localStorage may be blocked; defaults are fine */
  }
  return 'dashboard';
}

function RouteLoading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-5 py-2">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-4 w-56" />
      <div className="skeleton h-40 w-full rounded-xl" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const [route, setRoute] = useState<Route>(readInitialRoute);
  const { settings, update } = useSettings();
  const prefersDark = usePrefersDark();
  useThemeEffect(settings?.theme ?? 'system');
  useOccurrenceSync();
  const { tasks: all, error } = useAllTasks();

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A 404 keeps the address the visitor typed so the page can name it.
    if (route === 'not-found') return;
    try {
      window.localStorage.setItem(STORAGE_ROUTE, route);
      if (readAddress() !== route) window.location.hash = route;
    } catch {
      /* ignore */
    }
  }, [route]);

  // Editing the address by hand, or following a link to an unknown route,
  // lands on the 404 page instead of silently showing Today.
  useEffect(() => {
    const onHashChange = () => {
      const next = readAddress();
      setRoute(isKnownRoute(next) ? next : 'not-found');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openForm = useCallback((t?: Task | null) => {
    setEditing(t ?? null);
    setFormOpen(true);
  }, []);

  // Keyboard shortcuts: N new task, / search, Ctrl/Cmd+K search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inText =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (e.key === 'Escape') return; // dialogs close themselves
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (inText) return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openForm();
      } else if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openForm]);

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [searchOpen]);

  const renderRoute = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage onNavigate={(r) => setRoute(r as Route)} />;
      case 'schedule':
        return <SchedulePage settings={settings!} />;
      case 'tasks':
        return <TasksPage />;
      case 'upcoming':
        return <TasksPage initialBucket="upcoming" />;
      case 'completed':
        return <TasksPage initialStatus="completed" />;
      case 'recurring':
        return <RecurringPage />;
      case 'habits':
        return <HabitsPage />;
      case 'stats':
        return <StatsPage />;
      case 'focus':
        return <FocusTimerPage />;
      case 'settings':
        return <SettingsPage />;
      case 'not-found':
        return (
          <NotFoundPage
            path={readAddress() ? `#${readAddress()}` : undefined}
            onNavigate={(r) => setRoute(isKnownRoute(r) ? r : 'not-found')}
          />
        );
      default:
        return (
          <NotFoundPage
            path={readAddress() ? `#${readAddress()}` : undefined}
            onNavigate={(r) => setRoute(isKnownRoute(r) ? r : 'not-found')}
          />
        );
    }
  };

  if (!settings) {
    return <LoadingScreen />;
  }

  const searchResults = (() => {
    if (!searchOpen || !search.trim()) return [];
    const f: TaskFilter = { query: search, category: '', priority: '', status: '', bucket: 'all', tag: '' };
    return applyFilter(all ?? [], f).slice(0, 8);
  })();

  return (
    <>
      <AppShell
        route={route}
        onNavigate={setRoute}
        onOpenSearch={() => setSearchOpen(true)}
        onQuickAdd={() => openForm()}
        theme={resolvedTheme(settings.theme, prefersDark)}
        onToggleTheme={() => update({ theme: toggleTheme(settings.theme, prefersDark) })}
      >
        <ErrorBoundary key={route}>
        {error ? (
          <StatusPage
            code="503"
            icon={<WarningCircle size={20} weight="bold" />}
            title="Storage is unavailable"
            description="The app could not read the local database (IndexedDB). This happens in some private browsing modes or when storage is full. Reload to try again, or check your browser settings."
            detail={String(error)}
            actions={
              <Button onClick={() => window.location.reload()}>Reload app</Button>
            }
          />
        ) : (
          <Suspense fallback={<RouteLoading />}>
            {renderRoute()}
          </Suspense>
        )}
        </ErrorBoundary>
      </AppShell>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} title="Search tasks">
        <Input
          ref={inputRef}
          autoFocus
          placeholder="Search title, notes, tags… (Esc to close)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search tasks"
        />
        <div className="mt-4 max-h-80 space-y-1.5 overflow-y-auto">
          {searchResults.length === 0 ? (
            <EmptyState
              title={search.trim() ? 'No matches' : 'Start typing'}
              hint={search.trim() ? 'Try a shorter phrase or search a tag.' : 'Search task titles, notes and tags.'}
            />
          ) : (
            searchResults.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onEdit={(task) => {
                  setSearchOpen(false);
                  openForm(task);
                }}
              />
            ))
          )}
        </div>
      </Dialog>

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />

      <CursorFollower />
    </>
  );
}
