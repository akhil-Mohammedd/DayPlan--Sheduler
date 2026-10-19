import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../database/db';
import {
  completeTask,
  createTask,
  createNewRecurring,
  deleteTask,
  ensureOccurrences,
  reopenTask,
  skipOccurrence,
  updateTask,
} from '../../services/taskService';
import { occurrencesBetween, isDateInRule } from '../../services/recurrenceEngine';
import { addDaysKey, todayKey, dateKey } from '../../utils';

import type { RecurrenceRule } from '../../types';

beforeEach(async () => {
  await Promise.all([
    db.tasks.clear(),
    db.habits.clear(),
    db.habitLogs.clear(),
    db.notes.clear(),
    db.settings.clear(),
    db.focusSessions.clear(),
  ]);
});

describe('task persistence (IndexedDB via Dexie)', () => {
  it('keeps a new task after a "reload" (clears only React state)', async () => {
    const t = await createTask({ title: 'Buy groceries', scheduledDate: todayKey() });
    // simulate reload: fresh read straight from the DB
    const reloaded = await db.tasks.get(t.id);
    expect(reloaded?.title).toBe('Buy groceries');
    expect(reloaded?.status).toBe('pending');
  });

  it('updates persist: edit, complete, reopen', async () => {
    const t = await createTask({ title: 'A', scheduledDate: todayKey() });
    await updateTask(t.id, { title: 'A2' });
    await completeTask(t.id);
    let row = await db.tasks.get(t.id);
    expect(row?.title).toBe('A2');
    expect(row?.status).toBe('completed');
    expect(row?.completedAt).not.toBeNull();
    await reopenTask(t.id);
    row = await db.tasks.get(t.id);
    expect(row?.status).toBe('pending');
    expect(row?.completedAt).toBeNull();
  });

  it('delete removes the task', async () => {
    const t = await createTask({ title: 'gone', scheduledDate: todayKey() });
    await deleteTask(t.id);
    expect(await db.tasks.get(t.id)).toBeUndefined();
  });
});

describe('recurrence engine (pure)', () => {
  const rule = (r: Partial<RecurrenceRule>): RecurrenceRule => ({
    frequency: 'daily',
    interval: 1,
    weekdays: [],
    startDate: dateKey(new Date(2026, 0, 1)),
    ...r,
  });

  it('daily fires every day', () => {
    const r = rule({});
    expect(isDateInRule(r, '2026-01-01')).toBe(true);
    expect(isDateInRule(r, '2026-01-02')).toBe(true);
    expect(isDateInRule(r, '2025-12-31')).toBe(false); // before start
  });

  it('weekdays skip weekends', () => {
    const r = rule({ frequency: 'weekdays' });
    // 2026-01-04 is a Sunday, 2026-01-05 Monday
    expect(isDateInRule(r, '2026-01-04')).toBe(false);
    expect(isDateInRule(r, '2026-01-05')).toBe(true);
  });

  it('weekly on selected weekdays', () => {
    const r = rule({ frequency: 'weekly', weekdays: [0] }); // Sundays
    expect(isDateInRule(r, '2026-01-04')).toBe(true); // Sunday
    expect(isDateInRule(r, '2026-01-05')).toBe(false);
  });

  it('custom every N days', () => {
    const r = rule({ frequency: 'custom', interval: 3 });
    expect(isDateInRule(r, '2026-01-01')).toBe(true);
    expect(isDateInRule(r, '2026-01-04')).toBe(true);
    expect(isDateInRule(r, '2026-01-03')).toBe(false);
  });

  it('monthly fires on the same day of month', () => {
    const r = rule({ frequency: 'monthly' });
    expect(isDateInRule(r, '2026-01-01')).toBe(true);
    expect(isDateInRule(r, '2026-02-01')).toBe(true);
    expect(isDateInRule(r, '2026-01-15')).toBe(false);
  });

  it('respects endDate', () => {
    const r = rule({ endDate: '2026-01-03' });
    expect(isDateInRule(r, '2026-01-03')).toBe(true);
    expect(isDateInRule(r, '2026-01-04')).toBe(false);
  });

  it('occurrencesBetween window is inclusive and bounded', () => {
    const r = rule({ frequency: 'weekly', weekdays: [3] }); // Wednesdays
    // 2026-01-07 and 2026-01-14 are Wednesdays
    const occ = occurrencesBetween(r, '2026-01-01', '2026-01-16');
    expect(occ).toEqual(['2026-01-07', '2026-01-14']);
  });
});

describe('recurring materialization', () => {
  it('creates one occurrence per scheduled day AND does not duplicate on re-run', async () => {
    const today = todayKey();
    const startingTomorrow = addDaysKey(today, 1);
    await createNewRecurring({
      title: 'Morning revision',
      recurrence: {
        frequency: 'daily',
        interval: 1,
        weekdays: [],
        startDate: startingTomorrow,
      },
    });
    const firstRun = await ensureOccurrences();
    const occKeys = await db.tasks.toArray().then((all) => all.filter((t) => t.recurrenceParentId));
    expect(occKeys.length).toBeGreaterThanOrEqual(1);
    const before = occKeys.map((t) => t.occurrenceKey).sort();

    // second materialization (the "reload") must not duplicate
    const secondRun = await ensureOccurrences();
    const after = await db.tasks
      .toArray()
      .then((all) => all.filter((t) => t.recurrenceParentId).map((t) => t.occurrenceKey))
      .then((keys) => keys.sort());
    expect(after).toEqual(before);
    expect(secondRun.created).toBe(0);
    void firstRun;
  });

  it('completing an occurrence does not complete future occurrences', async () => {
    const today = todayKey();
    const ruleStartDate = addDaysKey(today, -2);
    await createNewRecurring({
      title: 'Coding practice',
      recurrence: { frequency: 'daily', interval: 1, weekdays: [], startDate: ruleStartDate },
    });
    const occs = await db.tasks
      .toArray()
      .then((all) => all.filter((t) => t.recurrenceParentId))
      .then((all) => all.sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '')));
    expect(occs.length).toBeGreaterThanOrEqual(2);
    // complete the earliest occurrence
    const first = occs[0]!;
    await completeTask(first.id);
    // all other pending occurrences stay pending — even later ones
    for (const o of occs.slice(1)) {
      const row = await db.tasks.get(o.id);
      expect(row?.status).toBe('pending');
    }
  });

  it('skipping an occurrence keeps the rule intact (future ones still generated)', async () => {
    const ruleStartDate = addDaysKey(todayKey(), -1);
    await createNewRecurring({
      title: 'Evening revision',
      recurrence: { frequency: 'daily', interval: 1, weekdays: [], startDate: ruleStartDate },
    });
    const occ = await db.tasks
      .toArray()
      .then((all) => all.filter((t) => t.recurrenceParentId))
      .then((a) => a.find((t) => t.scheduledDate !== undefined));
    expect(occ).toBeTruthy();
    await skipOccurrence(occ!.id);
    const ruleRow = await db.tasks.get(occ!.recurrenceParentId!);
    expect(ruleRow?.recurrence).toBeTruthy();
    // future occurrences for the rule still exist
    const pending = await db.tasks
      .toArray()
      .then((all) => all.filter((t) => t.recurrenceParentId === occ!.recurrenceParentId && t.status === 'pending'));
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });
});

describe('date handling across day boundaries', () => {
  it('addDaysKey crosses months and years correctly', () => {
    expect(addDaysKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysKey('2027-03-01', -1)).toBe('2027-02-28');
  });
});
