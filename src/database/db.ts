import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  DailyNote,
  FocusSession,
  Habit,
  HabitLog,
  Task,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

export class DayPlanDB extends Dexie {
  tasks!: Table<Task, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  notes!: Table<DailyNote, string>;
  settings!: Table<AppSettings, number>;
  focusSessions!: Table<FocusSession, string>;

  constructor() {
    super('dayplan-db');
    // Versioned schema. Never bump destructively without a migration;
    // keeping old versions listed preserves existing user data across updates.
    this.version(1).stores({
      tasks:
        'id, scheduledDate, status, priority, category, occurrenceKey, recurrenceParentId, updatedAt',
      habits: 'id, archived',
      habitLogs: 'id, habitId, date, [habitId+date]',
      notes: 'id',
      settings: 'id',
      focusSessions: 'id, date, completed',
    });
    // v2 migration: add an index only (no data touched, nothing deleted).
    // Habits are sorted by createdAt in HabitsPage, which requires the index.
    this.version(2).stores({
      habits: 'id, archived, createdAt',
    });
  }
}

export const db = new DayPlanDB();

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(1);
  if (existing) return existing;
  const settings = { ...DEFAULT_SETTINGS };
  await db.settings.put(settings);
  return settings;
}

export async function migrateLegacySettings(): Promise<void> {
  // Reserved for future version(2) upgrades. Persisted settings survive
  // app updates because Dexie preserves all tables across versions.
}
