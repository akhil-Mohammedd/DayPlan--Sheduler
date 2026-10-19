import { db } from '../database/db';
import type { Habit, LocalDate } from '../types';
import { todayKey } from '../utils';
import { uid } from '../utils';

// Desaturated, warm-leaning habit markers so streaks stay quiet on paper.
export const HABIT_COLORS = [
  '#6F7D62', '#8C6E54', '#6B7F8C', '#8E6B6B',
  '#7C748C', '#5F7F78', '#9A7C4F', '#7B7A6A',
];

export const HABIT_COLOR_NAMES = [
  'Sage', 'Clay', 'Slate', 'Rose', 'Mauve', 'Teal', 'Ochre', 'Stone',
];

export const HABIT_LOG_ID = (habitId: string, date: LocalDate): string =>
  `${habitId}:${date}`;

export async function createHabit(
  name: string,
  opts: { color?: string; description?: string } = {},
): Promise<Habit> {
  const habit: Habit = {
    id: uid(),
    name: name.trim(),
    color: opts.color ?? HABIT_COLORS[0]!,
    archived: false,
    createdAt: Date.now(),
    description: opts.description ?? '',
  };
  await db.habits.add(habit);
  return habit;
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  await db.habits.update(id, patch);
}

export async function archiveHabit(id: string, archived = true): Promise<void> {
  await db.habits.update(id, { archived });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', [db.habits, db.habitLogs], async () => {
    await db.habitLogs.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  });
}

export async function toggleHabitToday(habitId: string): Promise<boolean> {
  return toggleHabitForDate(habitId, todayKey());
}

export async function toggleHabitForDate(habitId: string, date: LocalDate): Promise<boolean> {
  const id = HABIT_LOG_ID(habitId, date);
  const done = await db.habitLogs.get(id);
  if (done) {
    await db.habitLogs.delete(id);
    return false;
  }
  await db.habitLogs.add({ id, habitId, date, completedAt: Date.now() });
  return true;
}

/** Current consecutive streak ending today (or yesterday, so today pending doesn't break it visually). */
export function computeStreak(logDates: Set<LocalDate>, from: LocalDate): number {
  const d = new Date(from + 'T00:00:00');
  const key = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  let streak = 0;
  // allow streak to still count if today's check not logged yet
  if (!logDates.has(key(d))) d.setDate(d.getDate() - 1);
  for (;;) {
    if (logDates.has(key(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}
