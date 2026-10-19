import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database/db';
import { Check, Flame, Plus } from '@phosphor-icons/react';
import { Card } from '../../components/ui';
import {
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Tooltip,
  useToast,
} from '../../components/ui';
import {
  HABIT_COLORS,
  HABIT_COLOR_NAMES,
  computeStreak,
  archiveHabit,
  createHabit,
  deleteHabit,
  toggleHabitForDate,
  updateHabit,
} from '../../services/habitService';
import type { Habit, LocalDate } from '../../types';
import { addDaysKey, todayKey } from '../../utils';

interface HabitWithLogs {
  habit: Habit;
  dates: Set<LocalDate>;
  streak: number;
  weekCount: number;
  total: number;
}

export function HabitsPage() {
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const today = todayKey();
  const weekDates = useMemo(() => {
    const d = new Date(today + 'T00:00:00');
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    const keys: LocalDate[] = [];
    for (let i = 0; i < 7; i++) {
      const mm = new Date(monday);
      mm.setDate(monday.getDate() + i);
      keys.push(`${mm.getFullYear()}-${String(mm.getMonth() + 1).padStart(2, '0')}-${String(mm.getDate()).padStart(2, '0')}`);
    }
    return keys;
  }, [today]);

  const habitsWithLogs: HabitWithLogs[] = useMemo(() => {
    return (habits ?? [])
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .filter((h) => (showArchived ? true : !h.archived))
      .map((h) => {
        const dates = new Set((logs ?? []).filter((l) => l.habitId === h.id).map((l) => l.date));
        const weekCount = weekDates.filter((d) => dates.has(d)).length;
        return {
          habit: h,
          dates,
          streak: computeStreak(dates, today),
          weekCount,
          total: dates.size,
        };
      });
  }, [habits, logs, showArchived, today, weekDates]);

  const last14 = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDaysKey(today, -(13 - i))),
    [today],
  );

  const toggle = async (h: Habit, date: LocalDate) => {
    try {
      await toggleHabitForDate(h.id, date);
    } catch {
      push('error', 'Could not update habit.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        subtitle="Small repeated actions, tracked one day at a time."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} weight="bold" /> New habit
          </Button>
        }
      />

      {(habits ?? []).filter((h) => h.archived).length > 0 && (
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
          />
          Show archived
        </label>
      )}

      {habitsWithLogs.length === 0 ? (
        <EmptyState
          icon={<Flame size={22} weight="bold" />}
          title="No habits yet"
          hint="Create a habit such as reading 20 pages or a morning review. Check it off daily to build a streak."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} weight="bold" /> Create habit
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {habitsWithLogs.map(({ habit: h, dates, streak, weekCount, total }) => (
            <Card key={h.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Tooltip
                    label={streak > 0 ? `${streak}-day streak` : 'No active streak'}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: h.color }}
                    >
                      <Flame size={18} weight="fill" />
                    </div>
                  </Tooltip>
                  <div>
                    <div className="text-[14px] font-medium">{h.name}</div>
                    <div className="meta mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                      <span>{streak} day streak</span>
                      <span>{weekCount} of 7 this week</span>
                      <span>{total} total</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditTarget(h)}
                  >
                    Edit
                  </Button>
                  {h.archived ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void archiveHabit(h.id, false);
                        push('success', 'Habit restored.');
                      }}
                    >
                      Unarchive
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void archiveHabit(h.id);
                        push('success', 'Habit archived.');
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(h)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Last 14 days grid */}
              <div className="mt-5 grid max-w-[22rem] grid-cols-7 gap-1.5">
                {last14.map((d) => {
                  const done = dates.has(d);
                  const isToday = d === today;
                  return (
                    <button
                      key={d}
                      onClick={() => toggle(h, d)}
                      title={`${d}${done ? ', completed' : ''}${done && isToday ? ' (today)' : ''}`}
                      aria-label={`${h.name} on ${d}`}
                      aria-pressed={done}
                      style={done ? { backgroundColor: h.color } : undefined}
                      className={`aspect-square min-h-9 w-full rounded-md border text-[10px] tabular-nums transition-colors ${
                        done
                          ? 'border-transparent text-white'
                          : isToday
                            ? 'border-primary border-dashed hover:bg-accent'
                            : 'border-border hover:bg-accent'
                      }`}
                    >
                      {d.slice(8)}
                    </button>
                  );
                })}
              </div>

              {/* Week strip */}
              <div className="mt-4">
                <div className="mb-2 text-xs text-muted-foreground">This week</div>
                <div className="flex gap-1.5">
                  {weekDates.map((d) => (
                    <div
                      key={d}
                      className="h-3 flex-1 rounded-full"
                      style={{ backgroundColor: dates.has(d) ? h.color : 'hsl(var(--muted))' }}
                      title={d}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewHabitDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit dialog */}
      <EditHabitDialog habit={editTarget} onClose={() => setEditTarget(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete habit?"
        message={`“${deleteTarget?.name}” and all its completion history will be removed. This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteHabit(deleteTarget.id)
              .then(() => push('success', 'Habit deleted.'))
              .catch(() => push('error', 'Could not delete habit.'))
              .finally(() => setDeleteTarget(null));
          }
        }}
      />
    </div>
  );
}

function HabitColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11.5px] font-medium tracking-[0.01em] text-muted-foreground">
        Color
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {HABIT_COLORS.map((color, index) => {
          const selected = value === color;
          const name = HABIT_COLOR_NAMES[index] ?? `Color ${index + 1}`;
          return (
            <button
              key={color}
              type="button"
              aria-label={name}
              aria-pressed={selected}
              title={name}
              onClick={() => onChange(color)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-black/5 text-white transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:h-9 sm:w-9 ${
                selected
                  ? 'ring-2 ring-ring ring-offset-2 ring-offset-card'
                  : ''
              }`}
              style={{ backgroundColor: color }}
            >
              {selected && <Check size={14} weight="bold" aria-hidden />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function NewHabitDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(HABIT_COLORS[0]!);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setColor(HABIT_COLORS[0]!);
    setError('');
    setSaving(false);
  }, [open]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the habit a short name.');
      return;
    }
    setSaving(true);
    try {
      await createHabit(trimmed, { color });
      push('success', 'Habit created.');
      onClose();
    } catch {
      push('error', 'Could not create the habit. Storage may be unavailable.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New habit"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-habit-form" disabled={saving}>
            {saving ? 'Creating…' : 'Create habit'}
          </Button>
        </>
      }
    >
      <form
        id="new-habit-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <Label htmlFor="new-habit-name">Habit name</Label>
          <Input
            id="new-habit-name"
            autoFocus
            value={name}
            maxLength={80}
            placeholder="Read 20 pages"
            aria-invalid={!!error}
            aria-describedby={error ? 'new-habit-error' : 'new-habit-hint'}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
          />
          {error ? (
            <p
              id="new-habit-error"
              role="alert"
              className="mt-1.5 text-[11.5px] text-destructive"
            >
              {error}
            </p>
          ) : (
            <p
              id="new-habit-hint"
              className="mt-1.5 text-[11.5px] text-muted-foreground"
            >
              Keep it small enough to repeat every day.
            </p>
          )}
        </div>

        <HabitColorPicker value={color} onChange={setColor} />
      </form>
    </Dialog>
  );
}

function EditHabitDialog({
  habit,
  onClose,
}: {
  habit: Habit | null;
  onClose: () => void;
}) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(HABIT_COLORS[0]!);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setColor(habit.color);
      setError('');
      setSaving(false);
    }
  }, [habit]);

  const submit = async () => {
    if (!habit) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the habit a short name.');
      return;
    }
    setSaving(true);
    try {
      await updateHabit(habit.id, { name: trimmed, color });
      push('success', 'Habit updated.');
      onClose();
    } catch {
      push('error', 'Could not update the habit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!habit}
      onClose={onClose}
      title="Edit habit"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-habit-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        id="edit-habit-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <Label htmlFor="edit-habit-name">Habit name</Label>
          <Input
            id="edit-habit-name"
            autoFocus
            value={name}
            maxLength={80}
            aria-invalid={!!error}
            aria-describedby={error ? 'edit-habit-error' : undefined}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
          />
          {error && (
            <p
              id="edit-habit-error"
              role="alert"
              className="mt-1.5 text-[11.5px] text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <HabitColorPicker value={color} onChange={setColor} />
      </form>
    </Dialog>
  );
}