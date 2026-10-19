import { db } from '../database/db';
import type { DailyNote, LocalDate } from '../types';

export async function getNote(date: LocalDate): Promise<DailyNote | undefined> {
  return db.notes.get(date);
}

export async function saveNote(date: LocalDate, patch: Partial<DailyNote>): Promise<void> {
  const existing = await db.notes.get(date);
  const next: DailyNote = {
    id: date,
    topPriorities: patch.topPriorities ?? existing?.topPriorities ?? ['', '', ''],
    mainGoal: patch.mainGoal ?? existing?.mainGoal ?? '',
    notes: patch.notes ?? existing?.notes ?? '',
    wentWell: patch.wentWell ?? existing?.wentWell ?? '',
    needsImprovement: patch.needsImprovement ?? existing?.needsImprovement ?? '',
    tomorrowPlan: patch.tomorrowPlan ?? existing?.tomorrowPlan ?? '',
    updatedAt: Date.now(),
  };
  await db.notes.put(next);
}

export async function deleteNote(date: LocalDate): Promise<void> {
  await db.notes.delete(date);
}
