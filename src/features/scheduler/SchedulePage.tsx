import { useMemo, useState } from 'react';
import {
  CalendarDots,
  CaretLeft,
  CaretRight,
  ListBullets,
  WarningCircle,
} from '@phosphor-icons/react';
import { Card, SectionTitle } from '../../components/ui/Card';
import { Button, EmptyState, Input, LetterLabel, PageHeader } from '../../components/ui';
import { TaskForm } from '../../components/tasks/TaskForm';
import { TaskItem } from '../../components/tasks/TasksUI';
import type { AppSettings, LocalDate, Task } from '../../types';
import { useTasksForDate } from '../../hooks';
import {
  addDaysKey,
  clampHour,
  formatTime12,
  minutesToTime,
  parseDateKey,
  timeToMinutes,
  todayKey,
} from '../../utils';

interface Positioned {
  task: Task;
  start: number;
  end: number;
  lane: number;
  laneCount: number;
}

export function SchedulePage({ settings }: { settings: AppSettings }) {
  const [date, setDate] = useState(todayKey());
  const [view, setView] = useState<'day' | 'agenda'>('day');
  const [formOpen, setFormOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ startTime?: string }>({});
  const [editing, setEditing] = useState<Task | null>(null);
  const tasks = useTasksForDate(date) ?? [];

  const isToday = date === todayKey();
  const dateLabel = parseDateKey(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: parseDateKey(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  const timed = useMemo(
    () =>
      tasks
        .filter((t) => t.startTime != null)
        .sort((a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0)),
    [tasks],
  );
  const untimed = useMemo(() => tasks.filter((t) => !t.startTime), [tasks]);

  // Overlap detection (warnings only — never auto-resolve)
  const conflicts = useMemo(() => {
    const found = new Set<Task>();
    for (let i = 0; i < timed.length; i++) {
      const a = timed[i];
      for (let j = i + 1; j < timed.length; j++) {
        const b = timed[j];
        if (!a || !b) continue;
        const aS = timeToMinutes(a.startTime) ?? 0;
        const aE = timeToMinutes(a.endTime) ?? aS + a.durationMinutes;
        const bS = timeToMinutes(b.startTime) ?? 0;
        const bE = timeToMinutes(b.endTime) ?? bS + b.durationMinutes;
        if (aS < bE && bS < aE) {
          found.add(a);
          found.add(b);
        }
      }
    }
    return [...found];
  }, [timed]);

  const openNew = (startTime: string) => {
    setEditing(null);
    setPrefill({ startTime });
    setFormOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setPrefill({});
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={dateLabel}
        subtitle={`${timed.length} timed, ${untimed.length} unscheduled`}
        actions={
          <>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous day"
                onClick={() => setDate(addDaysKey(date, -1))}
              >
                <CaretLeft size={15} weight="bold" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setDate(todayKey())}
                disabled={isToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next day"
                onClick={() => setDate(addDaysKey(date, 1))}
              >
                <CaretRight size={15} weight="bold" />
              </Button>
            </div>
            <Input
              type="date"
              value={date}
              className="w-auto"
              aria-label="Pick a date"
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                  setDate(e.target.value);
              }}
            />
            <div className="flex overflow-hidden rounded-md border border-border">
              {(['day', 'agenda'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`flex h-11 items-center gap-1.5 px-3 text-[12.5px] transition-colors sm:h-9 ${
                    view === v
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                  aria-pressed={view === v}
                >
                  {v === 'day' ? (
                    <CalendarDots size={15} weight="bold" />
                  ) : (
                    <ListBullets size={15} weight="bold" />
                  )}
                  <LetterLabel text={v === 'day' ? 'Day' : 'Agenda'} />
                </button>
              ))}
            </div>
          </>
        }
      />

      {conflicts.length > 0 && (
        <div
          className="flex gap-3 rounded-lg border border-border bg-card p-4 text-[12.5px] leading-relaxed"
          role="status"
        >
          <WarningCircle
            size={18}
            weight="bold"
            className="mt-0.5 shrink-0 text-[#8A5C00] dark:text-[#DCC180]"
          />
          <div>
            <strong className="font-medium">
              {conflicts.length} scheduled task
              {conflicts.length > 1 ? 's' : ''} overlap.
            </strong>{' '}
            <span className="text-muted-foreground">
              Nothing was moved. Review the times to resolve:{' '}
              {conflicts.map((t) => t.title).join(', ')}.
            </span>
          </div>
        </div>
      )}

      {view === 'day' ? (
        <TimetableView
          date={date}
          startHour={clampHour(settings.dayStartHour)}
          endHour={clampHour(settings.dayEndHour)}
          slotMinutes={settings.intervalMinutes}
          tasks={timed}
          untimed={untimed}
          onSlotClick={openNew}
          onEdit={openEdit}
        />
      ) : (
        <AgendaView tasks={timed} untimed={untimed} onEdit={openEdit} />
      )}

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setPrefill({});
        }}
        editing={editing}
        initial={{
          startTime: editing?.startTime ?? prefill.startTime ?? '',
          scheduledDate: editing?.scheduledDate ?? date,
        }}
      />
    </div>
  );
}

function TimetableView({
  date,
  startHour,
  endHour,
  slotMinutes,
  tasks,
  untimed,
  onSlotClick,
  onEdit,
}: {
  date: LocalDate;
  startHour: number;
  endHour: number;
  slotMinutes: number;
  tasks: Task[];
  untimed: Task[];
  onSlotClick: (startTime: string) => void;
  onEdit: (t: Task) => void;
}) {
  const nowMin = new Date().getMinutes() + new Date().getHours() * 60;
  const isToday = date === todayKey();

  // greedy lane packing so overlapping tasks display side by side
  const positioned = useMemo<Positioned[]>(() => {
    const blocks = tasks
      .map((t) => {
        const start = timeToMinutes(t.startTime) ?? 0;
        const end = timeToMinutes(t.endTime) ?? Math.min(start + t.durationMinutes, start + 24 * 60);
        return { task: t, start, end };
      })
      .sort((a, b) => a.start - b.start);
    const laneEnds: number[] = [];
    const result: Positioned[] = [];
    for (const blk of blocks) {
      let lane = laneEnds.findIndex((e) => e <= blk.start);
      if (lane === -1) {
        laneEnds.push(blk.end);
        lane = laneEnds.length - 1;
      } else {
        laneEnds[lane] = blk.end;
      }
      result.push({ ...blk, lane, laneCount: 0 });
    }
    const laneCount = Math.max(1, laneEnds.length);
    for (const r of result) r.laneCount = laneCount;
    return result;
  }, [tasks]);

  const hours: number[] = [];
  for (let h = startHour; h <= endHour && hours.length <= 20; h++) hours.push(h);

  return (
    <div className="space-y-4">
      {untimed.length > 0 && (
        <Card className="p-6">
          <SectionTitle>Unscheduled</SectionTitle>
          <div className="space-y-2">
            {untimed.map((t) => (
              <TaskItem key={t.id} task={t} onEdit={onEdit} />
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="max-h-[70vh] overflow-y-auto md:max-h-[50vh]">
          {hours.map((h) => {
            const hourStart = h * 60;
            const hourEnd = hourStart + 60;
            const inHour = positioned.filter((p) => p.start >= hourStart && p.start < hourEnd);
            const showNowLine = isToday && nowMin >= hourStart && nowMin < hourEnd;
            const nowOffsetPct = ((nowMin - hourStart) / 60) * 100;
            return (
              <div key={h} className="border-b border-border/60 last:border-0">
                <div className="relative flex min-h-[3.25rem] hover:bg-accent/20 md:min-h-[3rem]">
                  {/* hour label / click target */}
                  <button
                    onClick={() => onSlotClick(minutesToTime(hourStart))}
                    className="meta w-20 shrink-0 border-r border-border/70 px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 sm:w-24 md:w-28"
                    aria-label={`Add task at ${formatTime12(minutesToTime(hourStart))}`}
                  >
                    {formatTime12(minutesToTime(hourStart))}
                  </button>
                  {/* slot body */}
                  <div className="relative min-w-0 flex-1">
                    {/* sub-slot rows for intervals */}
                    {slotMinutes < 60 &&
                      Array.from({ length: 60 / slotMinutes - 1 }).map((_, i) => {
                        const m = hourStart + (i + 1) * slotMinutes;
                        return (
                          <button
                            key={m}
                            onClick={() => onSlotClick(minutesToTime(m))}
                            className="group absolute inset-x-0 border-t border-dashed border-border/30 hover:bg-accent/30"
                            style={{ top: `${((i + 1) * slotMinutes / 60) * 100}%`, height: Math.max(24, (slotMinutes / 60) * 100 * 0.52) + 'px' }}
                            aria-label={`Add task at ${formatTime12(minutesToTime(m))}`}
                          >
                            <span className="invisible px-2 text-[10px] text-muted-foreground group-hover:visible">
                              Add at {formatTime12(minutesToTime(m))}
                            </span>
                          </button>
                        );
                      })}
                    {/* task blocks */}
                    {inHour.map((p, idx) => {
                      const topPct = ((p.start - hourStart) / 60) * 100;
                      const laneW = 100 / p.laneCount;
                      const done = p.task.status === 'completed';
                      const skip = p.task.status === 'skipped';
                      return (
                        <button
                          key={p.task.id}
                          onClick={() => onEdit(p.task)}
                          className={`absolute z-10 mx-1 flex w-[calc(100%-0.5rem)] flex-col justify-center overflow-hidden rounded-md border px-2 py-0.5 text-left text-xs transition-colors ${
                            p.task.status === 'in_progress'
                              ? 'chip-progress border-transparent'
                              : done
                                ? 'chip-done border-transparent'
                                : skip
                                  ? 'chip-neutral border-transparent line-through'
                                  : p.task.priority === 'urgent'
                                    ? 'chip-urgent border-transparent'
                                    : p.task.priority === 'high'
                                      ? 'chip-high border-transparent'
                                      : 'border-border bg-card hover:border-input hover:bg-muted/40'
                          }`}
                          style={{
                            top: `${topPct}%`,
                            height: 'min(3.5rem, max(2rem, ' + (((p.end - p.start) / 60) * 100 * 0.4) + '%))',
                            left: `${p.lane * laneW}%`,
                            width: `calc(${laneW}% - 0.5rem)`,
                            zIndex: 10 + idx * 0,
                            minHeight: '2rem',
                          }}
                          title={`${p.task.title}, ${formatTime12(p.task.startTime)} to ${formatTime12(p.task.endTime ?? minutesToTime(p.end))}, estimated ${p.task.durationMinutes} minutes`}
                        >
                          <span className="truncate font-medium">{p.task.title}</span>
                          <span className="truncate text-[10px] opacity-80">
                            {formatTime12(p.task.startTime)} to{' '}
                            {formatTime12(p.task.endTime ?? minutesToTime(p.end))},{' '}
                            {p.task.durationMinutes}m
                          </span>
                        </button>
                      );
                    })}
                    {/* current time indicator */}
                    {showNowLine && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-30"
                        style={{ top: `${Math.min(100, Math.max(0, nowOffsetPct))}%` }}
                        aria-hidden
                      >
                        <div className="flex items-center">
                          <span className="ml-[-2px] h-1.5 w-1.5 rounded-full bg-destructive sm:ml-1" />
                          <div className="h-px flex-1 bg-destructive" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* after end */}
          {isToday && nowMin > (endHour + 1) * 60 && (
            <div className="p-3 text-center text-[11.5px] text-muted-foreground">
              The current time is past the displayed range. Extend it in Settings.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AgendaView({ tasks, untimed, onEdit }: { tasks: Task[]; untimed: Task[]; onEdit: (t: Task) => void }) {
  const all = [...untimed, ...tasks];
  if (all.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDots size={24} weight="bold" />}
        title="Nothing scheduled this day"
        hint="Choose a time slot in Day view or add a task to plan something."
      />
    );
  }
  return (
    <Card className="p-6">
      <SectionTitle>Agenda</SectionTitle>
      <div className="space-y-2">
        {all.map((t) => (
          <TaskItem key={t.id} task={t} onEdit={onEdit} />
        ))}
      </div>
    </Card>
  );
}
