import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  CalendarBlank,
  Check,
  ListChecks,
  Plus,
} from '@phosphor-icons/react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressRing,
  SectionTitle,
  useToast,
} from '../../components/ui';
import { QuickAdd, TaskList } from '../../components/tasks/TasksUI';
import {
  useAllTasks,
  sortTasksForDisplay,
  isOverdue,
  useNow,
  useSettings,
} from '../../hooks';
import type { Habit, Priority, Task } from '../../types';
import {
  addDaysKey,
  clampHour,
  formatMinutes,
  formatTime12,
  friendlyDate,
  minutesToTime,
  parseDateKey,
  timeToMinutes,
  todayKey,
} from '../../utils';
import { postponeToTomorrow } from '../../services/taskService';
import { toggleHabitToday } from '../../services/habitService';
import { db } from '../../database/db';
import { DailyNotesCard } from '../../components/notes/DailyNotesCard';
import { TaskForm } from '../../components/tasks/TaskForm';

const PRIORITY_CHIP: Record<Priority, string> = {
  low: 'chip-neutral',
  medium: 'chip-medium',
  high: 'chip-high',
  urgent: 'chip-urgent',
};

export function DashboardPage({
  onNavigate,
}: {
  onNavigate?: (r: string) => void;
}) {
  const now = useNow(30_000);
  const today = todayKey();
  const { tasks: all, error } = useAllTasks();
  const { settings } = useSettings();
  const { push } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const habitLogs =
    useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [
      today,
    ]) ?? [];

  const openEdit = (t: Task) => {
    setEditing(t);
    setFormOpen(true);
  };

  const tasks = all ?? [];
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.scheduledDate === today),
    [tasks, today],
  );
  const overdueTasks = useMemo(
    () => tasks.filter((t) => isOverdue(t) && t.scheduledDate !== today),
    [tasks, today],
  );
  const completedToday = todayTasks.filter((t) => t.status === 'completed');
  const total = todayTasks.length;
  const done = completedToday.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const dateLabel = parseDateKey(today).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextTask =
    todayTasks
      .filter((t) => t.status === 'pending' && t.startTime)
      .map((t) => ({ t, m: timeToMinutes(t.startTime) ?? 0 }))
      .filter(({ m }) => m >= nowMin)
      .sort((a, b) => a.m - b.m)[0] ?? null;

  const startHour = clampHour(settings.dayStartHour);
  const endHour = clampHour(settings.dayEndHour);

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived).sort((a, b) => a.createdAt - b.createdAt),
    [habits],
  );
  const doneHabitIds = useMemo(
    () => new Set(habitLogs.map((l) => l.habitId)),
    [habitLogs],
  );

  const nextDays = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => addDaysKey(today, i + 1)).map(
        (date) => ({
          date,
          tasks: tasks.filter((t) => t.scheduledDate === date),
        }),
      ),
    [tasks, today],
  );

  const plannedMinutes = todayTasks.reduce(
    (s, t) => s + t.durationMinutes,
    0,
  );
  const completedMinutes = completedToday.reduce(
    (s, t) => s + t.durationMinutes,
    0,
  );

  const dayPct = Math.round((nowMin / (24 * 60)) * 100);

  if (!all && !error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-9 w-40" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-36 w-full rounded-xl" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="font-medium text-destructive">Storage error</div>
        <p className="mt-2 max-w-[65ch] text-[13px] leading-relaxed text-muted-foreground">
          The local database could not be read. Private-browsing restrictions or
          a full storage quota can cause this. Try reloading; if the problem
          persists, export your backup from Settings once storage is restored.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today"
        subtitle={`${dateLabel}. ${done} of ${total} ${total === 1 ? 'task' : 'tasks'} done.`}
        actions={
          <Button variant="outline" onClick={() => onNavigate?.('schedule')}>
            <CalendarBlank size={15} weight="bold" />
            Open schedule
          </Button>
        }
      />

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-4">
            <ProgressRing pct={pct} done={done} total={total} />
            <div className="sm:hidden">
              <div className="meta text-muted-foreground">Day elapsed</div>
              <div className="mt-1 font-display text-[26px] leading-none tracking-[-0.03em] tabular-nums">
                {dayPct}%
              </div>
              <div className="meta mt-1 text-muted-foreground">
                {formatTime12(minutesToTime(nowMin))}
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-y-5 sm:grid-cols-4 sm:gap-y-0 sm:border-l sm:border-border sm:pl-6 md:gap-4">
            <Stat
              label="Planned"
              value={String(total)}
              sub={`${formatMinutes(plannedMinutes)} estimated`}
            />
            <Stat
              label="Completed"
              value={String(done)}
              sub={`${formatMinutes(completedMinutes)} finished`}
            />
            <Stat
              label="Overdue"
              value={String(overdueTasks.length)}
              sub={overdueTasks.length === 0 ? 'All clear' : 'Needs a new date'}
              alert={overdueTasks.length > 0}
            />
            <Stat
              label="Day elapsed"
              value={`${dayPct}%`}
              sub={formatTime12(minutesToTime(nowMin))}
              className="hidden sm:block"
            />
          </div>
        </div>

        <DayTimeline
          tasks={todayTasks}
          startHour={startHour}
          endHour={endHour}
          nowMin={nowMin}
          isToday
        />

        <div className="mt-5 border-t border-border pt-4">
          {nextTask ? (
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <div className="meta text-muted-foreground">Next up</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-[26px] leading-none tracking-[-0.03em]">
                    {formatTime12(nextTask.t.startTime)}
                  </span>
                  <span className="max-w-[38ch] truncate text-[13.5px] font-medium text-foreground">
                    {nextTask.t.title}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="chip-neutral">
                  in {Math.max(0, nextTask.m - nowMin)} min
                </Badge>
                <span className="meta text-muted-foreground">
                  {formatMinutes(nextTask.t.durationMinutes)}
                </span>
                <Badge className={PRIORITY_CHIP[nextTask.t.priority]}>
                  {nextTask.t.priority[0]!.toUpperCase() +
                    nextTask.t.priority.slice(1)}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12.5px] text-muted-foreground">
                No timed task ahead. The rest of the day is open.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={14} weight="bold" />
                Add a timed task
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {overdueTasks.length > 0 && (
            <Card className="p-4 sm:p-6">
              <SectionTitle
                right={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      Promise.all(
                        overdueTasks.map((t) => postponeToTomorrow(t.id)),
                      )
                        .then(() =>
                          push('success', 'Overdue tasks moved to tomorrow.'),
                        )
                        .catch(() => push('error', 'Could not move the tasks.'))
                    }
                  >
                    Move all to tomorrow
                  </Button>
                }
              >
                Overdue
              </SectionTitle>
              <TaskList
                tasks={sortTasksForDisplay(overdueTasks).slice(0, 6)}
                onEdit={openEdit}
              />
            </Card>
          )}

          <Card className="p-4 sm:p-6">
            <SectionTitle
              right={
                <span className="meta text-muted-foreground">
                  {done} of {total} done
                </span>
              }
            >
              Today's tasks
            </SectionTitle>
            <QuickAdd defaultDate={today} />
            <div className="mt-4">
              {total === 0 ? (
                <EmptyState
                  icon={<ListChecks size={20} weight="bold" />}
                  title="Nothing planned for today"
                  hint="Add a task above, or open the schedule to block out your day hour by hour."
                />
              ) : (
                <TaskList
                  tasks={sortTasksForDisplay(todayTasks)}
                  onEdit={openEdit}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4 sm:p-6">
            <SectionTitle
              right={
                activeHabits.length > 0 ? (
                  <span className="meta text-muted-foreground">
                    {doneHabitIds.size} of {activeHabits.length}
                  </span>
                ) : undefined
              }
            >
              Habits today
            </SectionTitle>
            {activeHabits.length === 0 ? (
              <div className="space-y-3">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  No habits yet. Add one to track a daily streak.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate?.('habits')}
                >
                  <Plus size={14} weight="bold" />
                  Create a habit
                </Button>
              </div>
            ) : (
              <ul className="-my-1 divide-y divide-border/70">
                {activeHabits.slice(0, 6).map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    done={doneHabitIds.has(h.id)}
                    onToggle={() => {
                      toggleHabitToday(h.id).catch(() =>
                        push('error', 'Could not update the habit.'),
                      );
                    }}
                  />
                ))}
              </ul>
            )}
            {activeHabits.length > 6 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 -ml-2"
                onClick={() => onNavigate?.('habits')}
              >
                All habits
                <ArrowRight size={13} weight="bold" />
              </Button>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <SectionTitle
              right={
                <Button
                  size="sm"
                  variant="ghost"
                  className="-mr-2 h-7 px-2"
                  onClick={() => onNavigate?.('upcoming')}
                >
                  View all
                  <ArrowRight size={13} weight="bold" />
                </Button>
              }
            >
              Next days
            </SectionTitle>
            <ul className="-my-1 divide-y divide-border/70">
              {nextDays.map(({ date, tasks: dayTasks }) => {
                const pending = dayTasks.filter(
                  (t) => t.status !== 'completed' && t.status !== 'skipped',
                );
                const firstTimed = pending.find((t) => t.startTime);
                return (
                  <li key={date}>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('upcoming')}
                      className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-foreground">
                          {friendlyDate(date)}
                        </span>
                        <span className="meta block truncate text-muted-foreground">
                          {firstTimed
                            ? `${formatTime12(firstTimed.startTime)}, ${firstTimed.title}`
                            : pending.length === 0
                              ? 'Nothing planned'
                              : `${pending.length} ${pending.length === 1 ? 'task' : 'tasks'} planned`}
                        </span>
                      </span>
                      <span className="meta shrink-0 text-muted-foreground">
                        {parseDateKey(date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <DailyNotesCard date={today} dateLabel={dateLabel} />

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  alert = false,
  className = '',
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="meta text-muted-foreground">{label}</div>
      <div
        className={`mt-1.5 font-display text-[27px] leading-none tracking-[-0.03em] tabular-nums ${
          alert ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="meta mt-2 truncate text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

function DayTimeline({
  tasks,
  startHour,
  endHour,
  nowMin,
  isToday,
}: {
  tasks: Task[];
  startHour: number;
  endHour: number;
  nowMin: number;
  isToday: boolean;
}) {
  const start = startHour * 60;
  const end = (endHour + 1) * 60;
  const span = Math.max(1, end - start);
  const position = (minutes: number) =>
    Math.min(100, Math.max(0, ((minutes - start) / span) * 100));

  const blocks = tasks
    .filter((t) => t.startTime)
    .map((t) => {
      const from = timeToMinutes(t.startTime) ?? 0;
      const to = timeToMinutes(t.endTime) ?? from + Math.max(15, t.durationMinutes);
      const left = position(from);
      return {
        task: t,
        left,
        width: Math.max(1.5, position(to) - left),
      };
    });

  const ticks: number[] = [];
  for (let h = startHour; h <= endHour; h++) ticks.push(h);

  const summary = blocks.length
    ? `${blocks.length} timed ${blocks.length === 1 ? 'task' : 'tasks'} between ${formatTime12(minutesToTime(startHour * 60))} and ${formatTime12(minutesToTime(endHour * 60))}`
    : 'No timed tasks in the displayed day range';

  return (
    <div className="mt-6">
      <div className="relative h-12 overflow-hidden rounded-md border border-border bg-muted/40">
        {ticks.map((h) => (
          <span
            key={h}
            aria-hidden
            className={`absolute inset-y-0 w-px bg-border/70 ${h % 2 === 0 ? '' : 'opacity-40'}`}
            style={{ left: `${position(h * 60)}%` }}
          />
        ))}

        <span className="sr-only">{summary}</span>

        {blocks.map(({ task, left, width }) => {
          const completed = task.status === 'completed';
          const skipped = task.status === 'skipped';
          const inProgress = task.status === 'in_progress';
          return (
            <span
              key={task.id}
              aria-hidden
              title={`${task.title}, ${formatTime12(task.startTime)}`}
              className={`absolute inset-y-1.5 rounded-sm border ${
                completed
                  ? 'border-accent-foreground/25 bg-accent'
                  : skipped
                    ? 'border-dashed border-muted-foreground/40 bg-muted'
                    : inProgress
                      ? 'chip-progress border-transparent'
                      : 'border-primary/25 bg-foreground/15'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}

        {isToday && nowMin >= start && nowMin <= end && (
          <span
            aria-hidden
            className="absolute inset-y-0 z-10 w-px bg-destructive"
            style={{ left: `${position(nowMin)}%` }}
          >
            <span className="absolute -left-[3px] top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
          </span>
        )}
      </div>

      <div className="meta mt-2 flex items-center justify-between text-muted-foreground">
        <span>{formatTime12(minutesToTime(startHour * 60))}</span>
        <span>{formatTime12(minutesToTime(endHour * 60))}</span>
      </div>
    </div>
  );
}

function HabitRow({
  habit,
  done,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={
          done ? `Mark ${habit.name} as not done` : `Mark ${habit.name} as done`
        }
        className="group flex min-h-[44px] w-full items-center gap-3 py-2.5 text-left"
      >
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: habit.color }}
        />
        <span
          className={`min-w-0 flex-1 truncate text-[13px] transition-colors ${
            done ? 'text-muted-foreground line-through' : 'text-foreground'
          }`}
        >
          {habit.name}
        </span>
        <span
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
            done
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input text-transparent group-hover:border-ring'
          }`}
        >
          <Check size={11} weight="bold" />
        </span>
      </button>
    </li>
  );
}
