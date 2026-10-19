import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from '../database/db';
import type { AppSettings, LocalDate, Task, Theme } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { compareDateKeys, parseDateKey, todayKey, addDaysKey } from '../utils';
import { updateSettings as persistSettings, resolvedTheme } from '../services/settingsService';
import { ensureOccurrences } from '../services/taskService';

const DARK_SCHEME = '(prefers-color-scheme: dark)';

/** The OS colour-scheme query, or null where the environment has no matchMedia. */
function darkSchemeQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(DARK_SCHEME);
}

export function useAllTasks(): { tasks: Task[] | undefined; error: unknown } {
  const tasks = useLiveQuery(() => db.tasks.orderBy('updatedAt').reverse().toArray());
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!tasks && !error) {
      getSettings()
        .catch(setError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);
  return { tasks, error };
}

export function useTasksForDate(date: LocalDate): Task[] | undefined {
  return useLiveQuery(
    () => db.tasks.where('scheduledDate').equals(date).sortBy('updatedAt'),
    [date],
  );
}

export function useSettings() {
  const settings = useLiveQuery(async () => {
    const s = await db.settings.get(1);
    return s ?? DEFAULT_SETTINGS;
  }, []) ?? DEFAULT_SETTINGS;
  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      await persistSettings(patch);
    },
    [],
  );
  return { settings, update };
}

/** Applies theme (light/dark/system) to <html>. */
export function useThemeEffect(theme: Theme) {
  useEffect(() => {
    const mq = darkSchemeQuery();
    const apply = () => {
      const dark = resolvedTheme(theme, mq?.matches ?? false) === 'dark';
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.dataset.theme = dark ? 'liquid-glass' : undefined;
    };
    apply();
    if (theme === 'system' && mq) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);
}

/** Subscribe once to the OS colour-scheme preference so the toggle can mirror it. */
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(() => darkSchemeQuery()?.matches ?? false);

  useEffect(() => {
    const mq = darkSchemeQuery();
    if (!mq) return undefined;
    setPrefersDark(mq.matches);
    const onChange = () => setPrefersDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return prefersDark;
}

/** Ticking clock for header and current-time indicator. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Sort tasks: timed first by start, untimed at top status-aware */
export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusRank: Record<string, number> = { completed: 2, skipped: 3, in_progress: 0, pending: 1 };
    const sr = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (sr !== 0) return sr;
    const at = a.startTime ?? '99:99';
    const bt = b.startTime ?? '99:99';
    if (at !== bt) return at < bt ? -1 : 1;
    return compareDateKeys(b.scheduledDate ?? '', a.scheduledDate ?? '');
  });
}

export function isOverdue(task: Task): boolean {
  if (task.status !== 'pending') return false;
  const today = todayKey();
  if (task.scheduledDate && compareDateKeys(task.scheduledDate, today) < 0) return true;
  if (task.scheduledDate === today && task.deadline && compareDateKeys(task.deadline, today) < 0) {
    return true;
  }
  return false;
}

/** Filtering / searching over in-memory tasks */
export interface TaskFilter {
  query: string;
  category: string;
  priority: string;
  status: string;
  bucket: 'all' | 'today' | 'tomorrow' | 'upcoming' | 'overdue';
  tag: string;
}

export function applyFilter(tasks: Task[], f: TaskFilter): Task[] {
  const today = todayKey();
  const tomorrowKey = addDaysKey(today, 1);
  const q = f.query.trim().toLowerCase();

  return tasks.filter((t) => {
    if (q) {
      const hay = `${t.title} ${t.description ?? ''} ${(t.tags ?? []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.category && (t.category ?? '') !== f.category) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.tag && !(t.tags ?? []).includes(f.tag)) return false;

    switch (f.bucket) {
      case 'today':
        return t.scheduledDate === today;
      case 'tomorrow':
        return t.scheduledDate === tomorrowKey;
      case 'upcoming':
        return t.status === 'pending' && t.scheduledDate != null && compareDateKeys(t.scheduledDate, today) > 0;
      case 'overdue':
        return isOverdue(t);
      default:
        return true;
    }
  });
}

/* Occurrence consistency: run once per app session on mount. */
let materializeStarted = false;
export function useOccurrenceSync(): void {
  useEffect(() => {
    if (materializeStarted) return;
    materializeStarted = true;
    ensureOccurrences().catch((err) => {
      console.error('Failed to materialize recurring occurrences', err);
    });
  }, []);
}

export function useTags(tasks: Task[] | undefined): string[] {
  return useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks ?? []) for (const tag of t.tags ?? []) set.add(tag);
    return [...set].sort();
  }, [tasks]);
}

export const fmtDateLong = (key: string): string => {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};
