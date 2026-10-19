/** yyyy-MM-dd local date string */
export type LocalDate = string;

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'       // every week on selected weekdays (defaults to rule's weekday)
  | 'weekdays'     // monday-friday
  | 'monthly'
  | 'custom';      // every N days

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** for custom: repeat every N days; for weekly: 0=Sun..6=Sat selected weekdays */
  interval: number;
  weekdays?: number[];
  /** first occurrence date (yyyy-MM-dd) */
  startDate: LocalDate;
  /** occurrences stop after this date (inclusive, optional) */
  endDate?: LocalDate;
}

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export interface Task {
  id: string;
  title: string;
  description?: string;
  /** null = someday / no scheduled date */
  scheduledDate: LocalDate | null;
  /** "HH:mm" or null for untimed tasks */
  startTime?: string | null;
  /** "HH:mm" or null */
  endTime?: string | null;
  /** estimated duration in minutes (displayed as estimate, not measured time) */
  durationMinutes: number;
  category?: string;
  priority: Priority;
  status: TaskStatus;
  deadline?: LocalDate | null;
  recurrence?: RecurrenceRule | null;
  tags: string[];
  /** present on materialized occurrences: `${ruleId}:${date}` — unique index */
  occurrenceKey?: string | null;
  /** id of the parent recurring rule, set on materialized occurrences */
  recurrenceParentId?: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface Habit {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  createdAt: number;
  description?: string;
}

/** one record per habit per day, id = `${habitId}:${date}` */
export interface HabitLog {
  id: string;
  habitId: string;
  date: LocalDate;
  completedAt: number;
}

export interface DailyNote {
  /** pk = yyyy-MM-dd */
  id: LocalDate;
  mainGoal?: string;
  /** Up to three items; missing slots are treated as empty strings. */
  topPriorities: string[];
  notes?: string;
  wentWell?: string;
  needsImprovement?: string;
  tomorrowPlan?: string;
  updatedAt: number;
}

/** What the user chose: `system` defers to the operating system. */
export type Theme = 'light' | 'dark' | 'system';

/** What is actually on screen. `system` is resolved to a side before it reaches the UI. */
export type ResolvedTheme = 'light' | 'dark';

export interface AppSettings {
  /** singleton row with id=1 */
  id: 1;
  theme: Theme;
  dayStartHour: number;   // e.g. 4
  dayEndHour: number;     // e.g. 23
  intervalMinutes: 15 | 30 | 60;
  defaultTaskDuration: number;
  updateReminderDismissed?: number;
}

export interface FocusSession {
  id: string;
  taskId?: string | null;
  taskTitle?: string | null;
  /** stored as endsAt timestamps so the timer survives refreshes */
  startedAt: number;
  endsAt: number;
  focusMinutes: number;
  completed: boolean;
  date: LocalDate;
  /** set while paused: moment pause began; endsAt is then shifted on resume */
  pausedAt?: number | null;
}

export const CATEGORIES = [
  'Personal',
  'Work',
  'Study',
  'Health',
  'Errands',
  'Other',
] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  theme: 'system',
  dayStartHour: 4,
  dayEndHour: 23,
  intervalMinutes: 30,
  defaultTaskDuration: 30,
};
