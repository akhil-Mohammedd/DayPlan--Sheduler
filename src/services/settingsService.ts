import { db, getSettings } from '../database/db';
import type { AppSettings, FocusSession, LocalDate, ResolvedTheme, Theme } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { dateKey, uid, todayKey } from '../utils';

/** Every theme the user can pick in Settings, in menu order. */
export const THEME_CHOICES: Theme[] = ['system', 'light', 'dark'];

/** The concrete theme to paint, given the pick and what the operating system prefers. */
export function resolvedTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

/** The other side of a two-state toggle. */
export function oppositeTheme(theme: ResolvedTheme): ResolvedTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

/**
 * The header and rail control is a two-state switch, so a stored `system`
 * preference lands on the opposite of whatever is currently on screen.
 */
export function toggleTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  return oppositeTheme(resolvedTheme(theme, prefersDark));
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...DEFAULT_SETTINGS, ...current, ...patch, id: 1 as const };
  await db.settings.put(next);
  return next;
}

export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.tasks, db.habits, db.habitLogs, db.notes, db.focusSessions],
    async () => {
      await Promise.all([
        db.tasks.clear(),
        db.habits.clear(),
        db.habitLogs.clear(),
        db.notes.clear(),
        db.focusSessions.clear(),
      ]);
    },
  );
  await db.settings.put({ ...DEFAULT_SETTINGS });
}

/* ---------------- focus sessions ---------------- */

export async function startFocusSession(
  opts: { taskId?: string | null; taskTitle?: string | null; focusMinutes: number },
): Promise<FocusSession> {
  const nows = Date.now();
  const session: FocusSession = {
    id: uid(),
    taskId: opts.taskId ?? null,
    taskTitle: opts.taskTitle ?? null,
    startedAt: nows,
    endsAt: nows + opts.focusMinutes * 60_000,
    focusMinutes: opts.focusMinutes,
    completed: false,
    date: dateKey(new Date()),
  };
  await db.focusSessions.add(session);
  return session;
}

export async function pauseActiveSession(): Promise<number> {
  const active = await getActiveSession();
  if (!active || active.pausedAt) return 0;
  await db.focusSessions.update(active.id, { pausedAt: Date.now() });
  return active.endsAt - Date.now();
}

export async function resumeActiveSession(): Promise<void> {
  const active = await getActiveSession();
  if (!active?.pausedAt) return;
  const shift = Date.now() - active.pausedAt;
  await db.focusSessions.update(active.id, { endsAt: active.endsAt + shift, pausedAt: null });
}

export async function getActiveSession(): Promise<FocusSession | undefined> {
  // NOTE: booleans are not valid IndexedDB keys, so `completed` cannot be
  // queried via .where() — filter in memory instead.
  const all = await db.focusSessions.filter((s) => !s.completed).toArray();
  // paused sessions stay active even if their original endsAt has passed
  return all.find((s) => s.pausedAt || s.endsAt > Date.now());
}

export async function getSessionsForDate(date: LocalDate): Promise<FocusSession[]> {
  return db.focusSessions.where('date').equals(date).toArray();
}

export async function finishStaleSessions(): Promise<void> {
  const now = Date.now();
  const all = await db.focusSessions.filter((s) => !s.completed).toArray();
  const stale = all.filter((s) => s.endsAt <= now && !s.pausedAt);
  if (stale.length > 0) {
    await db.focusSessions.bulkPut(
      stale.map((s) => ({ ...s, completed: true })),
    );
  }
}

export async function markSessionComplete(id: string): Promise<void> {
  await db.focusSessions.update(id, { completed: true });
}

export async function cancelActiveSession(): Promise<void> {
  const active = await getActiveSession();
  if (active) await db.focusSessions.delete(active.id);
}

export interface FocusSummary {
  minutesToday: number;
  sessionsToday: number;
}

export async function focusSummary(): Promise<FocusSummary> {
  const today = todayKey();
  const sessions = await getSessionsForDate(today);
  const done = sessions.filter((s) => s.completed);
  return {
    minutesToday: done.reduce((sum, s) => sum + s.focusMinutes, 0),
    sessionsToday: done.length,
  };
}
