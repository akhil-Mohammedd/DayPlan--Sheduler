import type { Task } from '../../types';

export function isRecurringOccurrence(task: Task): boolean {
  return !!task.recurrence && !!task.recurrenceParentId;
}
