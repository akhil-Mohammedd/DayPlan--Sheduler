import { db } from '../database/db';
import type {
  LocalDate,
  Priority,
  RecurrenceRule,
  Task,
  TaskDraft,
  TaskStatus,
} from '../types';
import { occurrencesBetween } from './recurrenceEngine';
import { addDaysKey, todayKey, dateKey } from '../utils';

/**
 * Look-back window: how many past days we still refresh occurrences for.
 * Keeps completed/skipped history intact while covering late rule edits.
 */
const RULE_PAST_DAYS = 7;
const RULE_FUTURE_DAYS = 35;

export async function createTask(draft: Partial<TaskDraft> & { title: string }): Promise<Task> {
  const now = Date.now();
  const task: Task = {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    description: draft.description ?? '',
    scheduledDate: draft.scheduledDate ?? todayKey(),
    startTime: draft.startTime ?? null,
    endTime: draft.endTime ?? null,
    durationMinutes: draft.durationMinutes ?? 30,
    category: draft.category ?? 'Personal',
    priority: draft.priority ?? 'medium',
    status: draft.status ?? 'pending',
    deadline: draft.deadline ?? null,
    recurrence: draft.recurrence ?? null,
    tags: draft.tags ?? [],
    occurrenceKey: draft.occurrenceKey ?? null,
    recurrenceParentId: draft.recurrenceParentId ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  if (task.startTime && !task.endTime && task.durationMinutes) {
    // derive end time if user only gave a start
    const parts = task.startTime.split(':').map(Number);
    const end = (parts[0] ?? 0) * 60 + (parts[1] ?? 0) + task.durationMinutes;
    task.endTime = `${String(Math.floor((end % 1440) / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  }
  await db.tasks.add(task);
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

export async function bulkDelete(ids: string[]): Promise<void> {
  await db.tasks.bulkDelete(ids);
}

export async function completeTask(id: string): Promise<void> {
  const task = await db.tasks.get(id);
  if (!task || task.status === 'completed') return;
  await db.tasks.update(id, {
    status: 'completed' as TaskStatus,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function reopenTask(id: string): Promise<void> {
  await db.tasks.update(id, { status: 'pending', completedAt: null, updatedAt: Date.now() });
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, {
    status,
    completedAt: status === 'completed' ? (t.completedAt ?? Date.now()) : null,
    updatedAt: Date.now(),
  });
}

export async function postponeToTomorrow(id: string): Promise<void> {
  await updateTask(id, { scheduledDate: addDaysKey(todayKey(), 1) });
}

export async function rescheduleTo(id: string, date: LocalDate): Promise<void> {
  await updateTask(id, { scheduledDate: date });
}

export async function changePriority(id: string, priority: Priority): Promise<void> {
  await updateTask(id, { priority });
}

export async function duplicateTask(id: string): Promise<Task | undefined> {
  const src = await db.tasks.get(id);
  if (!src) return undefined;
  const copy: Task = {
    ...src,
    id: crypto.randomUUID(),
    title: `${src.title} (copy)`,
    status: 'pending',
    completedAt: null,
    occurrenceKey: null,
    recurrenceParentId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.tasks.add(copy);
  return copy;
}

/* ------------------------------------------------------------------ */
/* Recurring rules                                                     */
/* ------------------------------------------------------------------ */

export type RuleEditScope = 'this' | 'future' | 'all';

/**
 * Edit a recurring task after the user picked a scope.
 *  - 'this'  : detach the clicked occurrence and change only it
 *  - 'future': update the rule (affects occurrences not yet materialized/confirmed)
 *  - 'all'   : update the rule and replace pending occurrences
 */
export async function editRecurring(
  occurrenceId: string,
  scope: RuleEditScope,
  patch: Partial<TaskDraft>,
): Promise<void> {
  const task = await db.tasks.get(occurrenceId);
  if (!task) return;

  if (!task.recurrence || !task.recurrenceParentId) {
    // plain task: just update
    await db.tasks.update(occurrenceId, { ...patch, updatedAt: Date.now() });
    return;
  }

  if (scope === 'this') {
    await db.tasks.update(occurrenceId, {
      ...patch,
      // becomes a standalone one-off; the rule keeps generating a fresh occurrence
      recurrence: null,
      recurrenceParentId: null,
      occurrenceKey: null,
      updatedAt: Date.now(),
    });
    return;
  }

  const rule: RecurrenceRule | undefined = task.recurrence;
  const newRule = {
    ...rule,
    ...((patch.recurrence as RecurrenceRule | null) ?? rule),
  };
  await db.tasks.update(task.recurrenceParentId, {
    title: patch.title ?? task.title,
    description: patch.description ?? task.description,
    startTime: patch.startTime ?? task.startTime,
    endTime: patch.endTime ?? task.endTime,
    durationMinutes: patch.durationMinutes ?? task.durationMinutes,
    category: patch.category ?? task.category,
    priority: patch.priority ?? task.priority,
    recurrence: newRule,
    updatedAt: Date.now(),
  });
  if (scope === 'all') {
    // replace pending occurrences of this rule with fresh values
    await replacePendingOccurrenceContent(task.recurrenceParentId, patch);
  }
}

async function replacePendingOccurrenceContent(ruleId: string, patch: Partial<TaskDraft>): Promise<void> {
  const all = await db.tasks.where('recurrenceParentId').equals(ruleId).toArray();
  const editable = all.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
  const now = Date.now();
  await db.tasks.bulkPut(
    editable.map((t) => ({
      ...t,
      ...patch,
      recurrence: t.recurrence, // occurrences keep their rule reference for skip/detach
      updatedAt: now,
    })),
  );
}

export async function skipOccurrence(occurrenceId: string): Promise<void> {
  // Skipping hides it for that day but never deletes the rule.
  await setTaskStatus(occurrenceId, 'skipped');
}

export type RuleDeleteScope = 'this' | 'future' | 'all';

export async function deleteRecurring(
  occurrenceId: string,
  scope: RuleDeleteScope,
): Promise<void> {
  const task = await db.tasks.get(occurrenceId);
  if (!task) return;
  const parentId = task.recurrenceParentId ?? task.id;

  if (!task.recurrence || !task.recurrenceParentId) {
    await db.tasks.delete(occurrenceId);
    return;
  }

  if (scope === 'this') {
    // remove just this occurrence; rule keeps running
    await db.tasks.delete(occurrenceId);
    return;
  }
  if (scope === 'all') {
    await db.tasks.where('recurrenceParentId').equals(parentId).delete();
    await db.tasks.delete(parentId);
    return;
  }
  // future: delete rule + pending occurrences, keep completed history
  const rule = await db.tasks.get(parentId);
  const endDate = task.scheduledDate
    ? addDaysKey(task.scheduledDate, -1)
    : undefined;
  if (rule?.recurrence) {
    await db.tasks.update(parentId, {
      recurrence: { ...rule.recurrence, endDate },
      updatedAt: Date.now(),
    });
  }
  const occ = await db.tasks.where('recurrenceParentId').equals(parentId).toArray();
  const pendingIds = occ
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .map((t) => t.id);
  await db.tasks.bulkDelete(pendingIds);
}

/**
 * Materialize missing occurrences for every recurring rule. Runs on app start
 * and whenever tasks change. occurrenceKey is the deduplication key, so
 * reopening/refreshing cannot create duplicates.
 */
export async function ensureOccurrences(): Promise<{ created: number }> {
  const today = todayKey();
  const from = addDaysKey(today, -RULE_PAST_DAYS);
  const to = addDaysKey(today, RULE_FUTURE_DAYS);

  const rules = (
    await db.tasks.toArray()
  ).filter((t) => t.recurrence && !t.recurrenceParentId);

  let created = 0;
  await db.transaction('rw', db.tasks, async () => {
    for (const ruleTask of rules) {
      const rule = ruleTask.recurrence!;
      const dates = occurrencesBetween(rule, from, to);
      const parent = ruleTask;
      for (const date of dates) {
        if (!date) continue;
        // The rule's own seed row should not be duplicated as an occurrence
        // unless it has a start date; occurrences are keyed by rule+date.
        const key = `${parent.id}:${date}`;
        const existing = await db.tasks.where('occurrenceKey').equals(key).first();
        if (existing) continue;
        await db.tasks.add({
          id: crypto.randomUUID(),
          title: parent.title,
          description: parent.description,
          scheduledDate: date,
          startTime: parent.startTime,
          endTime: parent.endTime,
          durationMinutes: parent.durationMinutes,
          category: parent.category,
          priority: parent.priority,
          status: 'pending',
          deadline: parent.deadline,
          recurrence: rule,
          tags: [...(parent.tags ?? [])],
          occurrenceKey: key,
          recurrenceParentId: parent.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          completedAt: null,
        });
        created++;
      }
    }
  });
  return { created };
}

/** Convert today's occurrences that belong to past rule dates into done state? No — history stays as stored. */
export function summarizeRuleInfo(task: Task): { isRule: boolean; isOccurrence: boolean } {
  const isRule = !!task.recurrence && !task.recurrenceParentId;
  const isOccurrence = !!task.recurrence && !!task.recurrenceParentId;
  return { isRule, isOccurrence };
}

export async function countTasksByDate(date: LocalDate): Promise<number> {
  return db.tasks.where('scheduledDate').equals(date).count();
}

export function buildRecurringTemplateDraft(task: Task): Partial<TaskDraft> {
  return {
    title: task.title,
    startTime: task.startTime,
    endTime: task.endTime,
    durationMinutes: task.durationMinutes,
    category: task.category,
    priority: task.priority,
  };
}

export async function createRuleTemplate(ruleTask: Task): Promise<void> {
  // The "rule" lives as a hidden template task with recurrence set and
  // recurrenceParentId null — it is managed by ensureOccurrences.
  const existing = await db.tasks.get(ruleTask.id);
  const draft = buildRecurringTemplateDraft(ruleTask);
  const withTitle = { ...draft, title: ruleTask.title };
  if (existing) {
    await updateTask(ruleTask.id, withTitle as Partial<Task>);
    return;
  }
  await createTask(withTitle);
}

export async function createNewRecurring(
  draft: Partial<TaskDraft> & { title: string; recurrence: RecurrenceRule },
): Promise<Task> {
  const task = await createTask({
    ...draft,
    scheduledDate: draft.recurrence.startDate ?? todayKey(),
  });
  await db.tasks.update(task.id, {
    recurrence: draft.recurrence,
    occurrenceKey: null,
  });
  await ensureOccurrences();
  return task;
}

/** Default rule used by the UI when none provided. */
export function defaultRule(): RecurrenceRule {
  return {
    frequency: 'daily',
    interval: 1,
    weekdays: [],
    startDate: dateKey(new Date()),
  };
}
