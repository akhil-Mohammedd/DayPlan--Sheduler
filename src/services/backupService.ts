import { db } from '../database/db';
import type {
  AppSettings,
  DailyNote,
  FocusSession,
  Habit,
  HabitLog,
  LocalDate,
  Priority,
  RecurrenceRule,
  Task,
  TaskStatus,
} from '../types';
import { PRIORITIES, DEFAULT_SETTINGS } from '../types';
import { todayKey } from '../utils';
import { uid } from '../utils';

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportBundle {
  schemaVersion: number;
  exportedAt: string;
  app: 'dayplan';
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  notes: DailyNote[];
  focusSessions: FocusSession[];
  settings: AppSettings | null;
}

export interface TaskListRow {
  title: string;
  date: string;
  status: string;
  priority: string;
  category: string;
  tags: string;
  notes: string;
}

export async function buildExport(): Promise<ExportBundle> {
  const [tasks, habits, habitLogs, notes, focusSessions, settings] = await Promise.all([
    db.tasks.toArray(),
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.notes.toArray(),
    db.focusSessions.toArray(),
    db.settings.get(1),
  ]);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'dayplan',
    tasks,
    habits,
    habitLogs,
    notes,
    focusSessions,
    settings: settings ?? null,
  };
}

export function toCsv(rows: TaskListRow[]): string {
  const esc = (v: string): string => `"${(v ?? '').replaceAll('"', '""')}"`;
  const header = ['title', 'date', 'status', 'priority', 'category', 'tags', 'notes'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.title, r.date, r.status, r.priority, r.category, r.tags, r.notes]
        .map(esc)
        .join(','),
    );
  }
  return lines.join('\n');
}

export function tasksToRows(tasks: Task[]): TaskListRow[] {
  return tasks.map((t) => ({
    title: t.title,
    date: t.scheduledDate ?? '',
    status: t.status,
    priority: t.priority,
    category: t.category ?? '',
    tags: (t.tags ?? []).join('; '),
    notes: (t.description ?? '').replace(/\r?\n/g, ' '),
  }));
}

export function downloadFile(filename: string, content: string, type = 'application/json'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------ */
/* Import                                                        */
/* ------------------------------------------------------------ */

export interface ImportValidation {
  ok: boolean;
  errors: string[];
  bundle?: ExportBundle;
  counts?: { tasks: number; habits: number; habitLogs: number; notes: number };
}

const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function validateTask(raw: unknown): string[] {
  if (!isPlainRecord(raw)) return ['task is not an object'];
  const errs: string[] = [];
  if (typeof raw.id !== 'string' || !raw.id) errs.push('task.id missing');
  if (typeof raw.title !== 'string') errs.push('task.title missing');
  if (raw.scheduledDate != null && typeof raw.scheduledDate !== 'string') {
    errs.push('task.scheduledDate invalid');
  }
  if (raw.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.scheduledDate))) {
    errs.push(`task.scheduledDate not yyyy-MM-dd (${String(raw.scheduledDate)})`);
  }
  if (typeof raw.status !== 'string') errs.push('task.status missing');
  else if (!(['pending', 'in_progress', 'completed', 'skipped'] as string[]).includes(raw.status)) {
    errs.push(`unknown task.status ${raw.status}`);
  }
  return errs;
}

function validateBundle(raw: unknown): ImportValidation {
  if (!isPlainRecord(raw)) {
    return { ok: false, errors: ['File is not valid JSON of an object.'] };
  }
  const errors: string[] = [];
  if (raw.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: ${String(raw.schemaVersion)}`);
  }
  if (raw.app !== 'dayplan') errors.push('File was not exported from this app.');
  if (!Array.isArray(raw.tasks)) errors.push('tasks field missing');

  if (Array.isArray(raw.tasks)) {
    let bad = 0;
    for (const t of raw.tasks.slice(0, 5000)) {
      const errs = validateTask(t);
      if (errs.length > 0) {
        bad++;
        if (errors.length < 10) errors.push(...errs.slice(0, 2));
      }
    }
    if (bad > 5) errors.push(`More than 5 invalid tasks; refusing import.`);
  }
  return {
    ok: errors.length === 0,
    errors,
    bundle: errors.length === 0 ? (raw as unknown as ExportBundle) : undefined,
    counts:
      Array.isArray(raw.tasks)
        ? {
            tasks: raw.tasks.length,
            habits: Array.isArray(raw.habits) ? raw.habits.length : 0,
            habitLogs: Array.isArray(raw.habitLogs) ? raw.habitLogs.length : 0,
            notes: Array.isArray(raw.notes) ? raw.notes.length : 0,
          }
        : undefined,
  };
}

export { validateBundle };

type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  mode: ImportMode;
  added: { tasks: number; habits: number; habitLogs: number; notes: number };
  skipped: number;
}

const normalizeTask = (t: Partial<Task>): Task => ({
  id: typeof t.id === 'string' && t.id ? t.id : uid(),
  title: String(t.title ?? 'Imported task'),
  description: t.description ?? '',
  scheduledDate: t.scheduledDate ?? null,
  startTime: t.startTime ?? null,
  endTime: t.endTime ?? null,
  durationMinutes: Number(t.durationMinutes ?? 30) || 30,
  category: t.category ?? 'Personal',
  priority: (PRIORITIES.includes(t.priority as Priority) ? t.priority : 'medium') as Priority,
  status: (['pending', 'in_progress', 'completed', 'skipped'].includes(t.status as string)
    ? t.status
    : 'pending') as TaskStatus,
  deadline: t.deadline ?? null,
  recurrence: (t.recurrence ?? null) as RecurrenceRule | null,
  tags: Array.isArray(t.tags) ? t.tags : [],
  occurrenceKey: t.occurrenceKey ?? null,
  recurrenceParentId: t.recurrenceParentId ?? null,
  createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
  updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : Date.now(),
  completedAt: t.completedAt ?? null,
});

export async function runImport(
  mode: ImportMode,
  bundle: ExportBundle,
): Promise<ImportResult> {
  // safety backup of current state before any destructive import
  const backupFileContent = JSON.stringify(await buildExport(), null, 2);
  if (typeof document !== 'undefined') {
    // non-fatal if blocked
    try {
      downloadFile(
        `dayplan-backup-before-import-${todayKey()}.json`,
        backupFileContent,
      );
    } catch {
      /* ignore */
    }
  }

  const tasks = (bundle.tasks ?? []).map(normalizeTask);
  const habits = (bundle.habits ?? []).filter(isPlainRecord).map((h) => ({
    id: String(h.id ?? uid()),
    name: String(h.name ?? 'Imported habit'),
    color: String(h.color ?? '#6366f1'),
    archived: Boolean(h.archived),
    createdAt: typeof h.createdAt === 'number' ? h.createdAt : Date.now(),
    description: typeof h.description === 'string' ? h.description : '',
  })) as Habit[];
  const habitLogs = (bundle.habitLogs ?? []).filter(isPlainRecord).map((l) => ({
    id: String(l.id ?? `${l.habitId}:${l.date}`),
    habitId: String(l.habitId ?? ''),
    date: String(l.date ?? todayKey()) as LocalDate,
    completedAt: typeof l.completedAt === 'number' ? l.completedAt : Date.now(),
  })) as HabitLog[];
  const notes = (bundle.notes ?? []).filter(isPlainRecord).map((n) => ({
    id: String(n.id ?? uid()) as LocalDate,
    mainGoal: String(n.mainGoal ?? ''),
    topPriorities: Array.isArray(n.topPriorities)
      ? (n.topPriorities as string[]).map(String).slice(0, 3)
      : [],
    notes: String(n.notes ?? ''),
    wentWell: String(n.wentWell ?? ''),
    needsImprovement: String(n.needsImprovement ?? ''),
    tomorrowPlan: String(n.tomorrowPlan ?? ''),
    updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
  })) as DailyNote[];
  const settings = bundle.settings ?? null;

  const result: ImportResult = {
    mode,
    added: { tasks: 0, habits: 0, habitLogs: 0, notes: 0 },
    skipped: 0,
  };

  await (mode === 'replace'
    ? db.transaction(
        'rw',
        [db.tasks, db.habits, db.habitLogs, db.notes, db.settings, db.focusSessions],
        async () => {
          await Promise.all([
            db.tasks.clear(),
            db.habits.clear(),
            db.habitLogs.clear(),
            db.notes.clear(),
            db.focusSessions.clear(),
          ]);
          await db.tasks.bulkAdd(tasks);
          result.added.tasks = tasks.length;
          await db.habits.bulkPut(habits);
          result.added.habits = habits.length;
          await db.habitLogs.bulkPut(habitLogs);
          result.added.habitLogs = habitLogs.length;
          await db.notes.bulkPut(notes);
          result.added.notes = notes.length;
          if (settings) await db.settings.put(settings);
        },
      )
    : db.transaction(
        'rw',
        [db.tasks, db.habits, db.habitLogs, db.notes, db.focusSessions],
        async () => {
          for (const t of tasks) {
            const exists = await db.tasks.get(t.id);
            if (exists) {
              result.skipped++;
            } else {
              await db.tasks.add(t);
              result.added.tasks++;
            }
          }
          await db.habits.bulkPut(habits);
          result.added.habits = habits.length;
          // habit logs keyed by id prevent duplicate habit-completion records
          for (const l of habitLogs) {
            const exists = await db.habitLogs.get(l.id);
            if (exists) {
              result.skipped++;
            } else {
              await db.habitLogs.add(l);
              result.added.habitLogs++;
            }
          }
          for (const n of notes) {
            const exists = await db.notes.get(n.id);
            if (exists) {
              result.skipped++;
            } else {
              await db.notes.add(n);
              result.added.notes++;
            }
          }
        },
      ));

  return result;
}

export function isBundleSettings(s: unknown): s is AppSettings {
  return isPlainRecord(s) && typeof s.theme === 'string';
}

export { DEFAULT_SETTINGS };
