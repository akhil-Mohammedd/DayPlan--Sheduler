import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../database/db';
import { createHabit, toggleHabitForDate, HABIT_LOG_ID } from '../../services/habitService';
import { getNote, saveNote, deleteNote } from '../../services/noteService';
import { validateBundle, runImport, buildExport, tasksToRows, toCsv } from '../../services/backupService';
import { createTask } from '../../services/taskService';
import { finishStaleSessions, getActiveSession } from '../../services/settingsService';
import { todayKey, addDaysKey } from '../../utils';

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

describe('habits', () => {
  it('prevents duplicate completion records for same habit+date', async () => {
    const h = await createHabit('Read 20 pages');
    const first = await toggleHabitForDate(h.id, todayKey());
    expect(first).toBe(true);
    const id = HABIT_LOG_ID(h.id, todayKey());
    const current = await db.habitLogs.get(id);
    expect(current).toBeTruthy();
    // re-completing the same habit+date cannot create a second row (id-keyed dedupe)
    await db.habitLogs.put({ id, habitId: h.id, date: todayKey(), completedAt: Date.now() + 1 });
    const logs = await db.habitLogs.where('habitId').equals(h.id).toArray();
    expect(logs.length).toBe(1);
    // toggling again removes it instead of stacking another record
    expect(await toggleHabitForDate(h.id, todayKey())).toBe(false);
    expect((await db.habitLogs.where('habitId').equals(h.id).toArray()).length).toBe(0);
  });

  it('toggle off removes the record without touching other dates', async () => {
    const h = await createHabit('Meditate');
    await toggleHabitForDate(h.id, todayKey());
    await toggleHabitForDate(h.id, addDaysKey(todayKey(), -1));
    expect(await toggleHabitForDate(h.id, todayKey())).toBe(false);
    const logs = await db.habitLogs.where('habitId').equals(h.id).toArray();
    expect(logs.map((l) => l.date)).toEqual([addDaysKey(todayKey(), -1)]);
  });
});

describe('regression: habits page query and focus session lookup', () => {
  it('habits can be listed without schema errors (orderBy createdAt on indexed key)', async () => {
    await createHabit('Walk');
    // This used to throw a Dexie SchemaError (blank page on /habits)
    const rows = await db.habits.orderBy('createdAt').toArray();
    expect(rows.length).toBe(1);
    expect(typeof rows[0]?.createdAt).toBe('number');
  });

  it('uncompleted focus sessions are findable despite boolean completed flag', async () => {
    // booleans are not valid IndexedDB keys: .where('completed').equals(0) finds nothing
    const now = Date.now();
    await db.focusSessions.add({
      id: 'fs1',
      taskId: null,
      taskTitle: 'Demo',
      startedAt: now,
      endsAt: now + 60_000,
      focusMinutes: 25,
      completed: false,
      date: todayKey(),
      pausedAt: null,
    });
    const found = await db.focusSessions.filter((s) => !s.completed).toArray();
    expect(found.length).toBe(1);
    const active = await getActiveSession();
    expect(active?.id).toBe('fs1');
    // paused session must not be auto-completed by stale cleanup
    await db.focusSessions.update('fs1', { endsAt: now - 1, pausedAt: now - 30_000 });
    await finishStaleSessions();
    const stillActive = await getActiveSession();
    expect(stillActive?.id).toBe('fs1');
  });
});

describe('daily notes', () => {
  it('notes stay associated with their own dates', async () => {
    const today = todayKey();
    const tomorrow = addDaysKey(today, 1);
    await saveNote(today, { mainGoal: 'Finish scheduler' });
    await saveNote(tomorrow, { mainGoal: 'Rest' });
    expect((await getNote(today))?.mainGoal).toBe('Finish scheduler');
    expect((await getNote(tomorrow))?.mainGoal).toBe('Rest');
    // editing today does not leak into tomorrow
    await saveNote(today, { mainGoal: 'Changed' });
    expect((await getNote(tomorrow))?.mainGoal).toBe('Rest');
  });

  it('deleteNote only removes that date', async () => {
    await saveNote(todayKey(), { notes: 'a' });
    await saveNote(addDaysKey(todayKey(), 1), { notes: 'b' });
    await deleteNote(todayKey());
    expect(await getNote(todayKey())).toBeUndefined();
    expect((await getNote(addDaysKey(todayKey(), 1)))?.notes).toBe('b');
  });
});

describe('backup export / import', () => {
  const goodBundle = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: 'dayplan',
    tasks: [
      {
        id: 't1',
        title: 'Imported',
        scheduledDate: '2026-01-05',
        status: 'pending',
        priority: 'medium',
        durationMinutes: 30,
        tags: [],
      },
    ],
    habits: [{ id: 'h1', name: 'Walk', color: '#6366f1', archived: false, createdAt: 1 }],
    habitLogs: [{ id: 'h1:2026-01-05', habitId: 'h1', date: '2026-01-05', completedAt: 1 }],
    notes: [{ id: '2026-01-05', mainGoal: '', topPriorities: [], notes: '', updatedAt: 1 }],
    focusSessions: [],
    settings: null,
  };

  it('round-trips: exported JSON re-imports into a clean DB', async () => {
    await createTask({ title: 'Original', scheduledDate: todayKey() });
    const bundle = await buildExport();
    expect(bundle.schemaVersion).toBe(1);
    // reset and import
    await Promise.all([db.tasks.clear(), db.habits.clear(), db.notes.clear()]);
    const v = validateBundle(bundle);
    expect(v.ok).toBe(true);
    const res = await runImport('replace', v.bundle!);
    expect(res.mode).toBe('replace');
    expect(res.added.tasks).toBe(bundle.tasks.length);
    const rows = await db.tasks.toArray();
    expect(rows.some((t) => t.title === 'Original')).toBe(true);
  });

  it('invalid imports do not destroy existing data', async () => {
    await createTask({ title: 'Precious', scheduledDate: todayKey() });
    const badVariants: unknown[] = [
      'not json object semantics at all',
      { app: 'dayplan', schemaVersion: 99, tasks: [] },
      { app: 'other-app', schemaVersion: 1, tasks: [] },
      { app: 'dayplan', schemaVersion: 1, tasks: 'not-an-array' },
      { app: 'dayplan', schemaVersion: 1, tasks: [{ id: '', title: 42, status: 'nope' }] },
      42,
      null,
    ];
    for (const bad of badVariants) {
      const v = validateBundle(bad);
      expect(v.ok).toBe(false);
      // attempting import with invalid bundle must be impossible: no bundle returned
      expect(v.bundle).toBeUndefined();
    }
    // data intact
    const rows = await db.tasks.toArray();
    expect(rows.length).toBe(1);
    expect(rows[0]?.title).toBe('Precious');
  });

  it('merge mode skips duplicate ids and preserves existing rows', async () => {
    await createTask({ title: 'Existing', scheduledDate: todayKey() }).then(async (t) => {
      const existing = await db.tasks.get(t.id);
      const v = validateBundle({
        ...goodBundle,
        tasks: [
          {
            ...existing,
            id: t.id, // duplicate id
            title: 'Existing',
          },
          goodBundle.tasks[0],
        ],
      });
      expect(v.ok).toBe(true);
      const res = await runImport('merge', v.bundle!);
      expect(res.skipped).toBe(1);
      const rows = await db.tasks.toArray();
      expect(rows.length).toBe(2);
    });
  });

  it('CSV escaping handles quotes and commas', () => {
    const csv = toCsv(
      tasksToRows([
        {
          id: 'x',
          title: 'Area "52", room 7',
          description: 'a, b',
          scheduledDate: '2026-01-01',
          status: 'pending',
          priority: 'low',
          category: 'Other',
          tags: ['tag'],
          deadline: null,
          recurrence: null,
          startTime: null,
          endTime: null,
          durationMinutes: 30,
          occurrenceKey: null,
          createdAt: 1,
          updatedAt: 1,
          completedAt: null,
        },
      ]),
    );
    expect(csv.split('\n')[1]).toContain('"Area ""52"", room 7"');
  });
});
