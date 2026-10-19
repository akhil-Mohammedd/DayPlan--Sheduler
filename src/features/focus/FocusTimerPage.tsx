import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database/db';
import {
  ArrowCounterClockwise,
  Pause,
  Play,
  Timer as TimerIcon,
} from '@phosphor-icons/react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  LetterLabel,
  PageHeader,
  SectionTitle,
  Select,
  useToast,
} from '../../components/ui';
import { useAllTasks } from '../../hooks';
import type { Task } from '../../types';
import {
  cancelActiveSession,
  finishStaleSessions,
  focusSummary,
  getActiveSession,
  markSessionComplete,
  pauseActiveSession,
  resumeActiveSession,
  startFocusSession,
} from '../../services/settingsService';
import { formatMinutes, parseDateKey, todayKey } from '../../utils';
import type { FocusSession } from '../../types';

const FOCUS_PRESETS = [25, 45, 60];
const BREAK_PRESETS = [5, 15];

const DIAL_R = 52;
const DIAL_C = 2 * Math.PI * DIAL_R;

/** 44px tall so the presets keep a comfortable touch target. */
function DurationButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-11 min-w-[4.75rem] rounded-md border px-4 text-[13px] transition-[background-color,border-color,color] duration-150 ${
        selected
          ? 'border-ring/60 bg-accent text-accent-foreground'
          : 'border-border text-foreground hover:border-input hover:bg-muted/70'
      }`}
    >
      {typeof children === 'string' ? <LetterLabel text={children} /> : children}
    </button>
  );
}

export function FocusTimerPage() {
  const { push } = useToast();
  const all = useAllTasks().tasks ?? [];
  const pending = useMemo(
    () =>
      all.filter(
        (t) => t.status === 'pending' && t.scheduledDate === todayKey(),
      ),
    [all],
  );

  const [active, setActive] = useState<FocusSession | null>(null);
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(BREAK_PRESETS[0]!);
  const [taskId, setTaskId] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const sessions = useLiveQuery(
    () => db.focusSessions.where('date').equals(todayKey()).toArray(),
    [],
  );

  // Restore the session on mount; the countdown is computed from stored
  // timestamps, so a refresh never resets the clock.
  useEffect(() => {
    finishStaleSessions().catch(() => undefined);
    getActiveSession()
      .then((s) => {
        if (s) {
          setActive(s);
          setFocusMin(s.focusMinutes);
          const ref = s.pausedAt ?? Date.now();
          setRemaining(Math.max(0, Math.round((s.endsAt - ref) / 1000)));
        }
      })
      .catch(() => undefined);
    focusSummary().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      // While paused the countdown freezes at stored pausedAt; on resume endsAt is shifted.
      const reference = active.pausedAt ?? Date.now();
      const remainMs = active.endsAt - reference;
      if (remainMs <= 0 && !active.pausedAt) {
        setRemaining(0);
        markSessionComplete(active.id)
          .then(() =>
            push('success', `Session complete. Take a ${breakMin} minute break.`),
          )
          .catch(() => undefined);
        setActive(null);
        return;
      }
      setRemaining(Math.max(0, Math.round(remainMs / 1000)));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [active, breakMin, push]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const taskTitle = active?.taskTitle ?? 'Unassigned';
  const paused = !!active?.pausedAt;

  // The tab keeps the time in view, so switching away does not lose the count.
  const baseTitle = useRef(document.title);
  useEffect(() => {
    if (!active) return;
    document.title = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')} Focus`;
    return () => {
      document.title = baseTitle.current;
    };
  }, [active, mm, ss]);

  const totalSeconds = Math.max(1, (active?.focusMinutes ?? 0) * 60);
  const progress = active ? Math.min(1, Math.max(0, 1 - remaining / totalSeconds)) : 0;

  const start = async () => {
    if (active) return;
    try {
      const s = await startFocusSession({
        focusMinutes: focusMin,
        taskId: taskId || null,
        taskTitle: all.find((t) => t.id === taskId)?.title ?? null,
      });
      setActive(s);
      setRemaining(focusMin * 60);
    } catch {
      push('error', 'Could not start the timer.');
    }
  };

  const stop = async () => {
    if (!active) return;
    setConfirmReset(false);
    await cancelActiveSession();
    setActive(null);
    setRemaining(0);
  };

  const togglePause = async () => {
    if (!active) return;
    try {
      if (paused) {
        await resumeActiveSession();
        push('success', 'Timer resumed.');
      } else {
        await pauseActiveSession();
        push('success', 'Timer paused.');
      }
      const fresh = await getActiveSession();
      setActive(fresh ?? null);
    } catch {
      push('error', 'Could not pause or resume the timer.');
    }
  };

  const doneToday = (sessions ?? []).filter((s) => s.completed);
  const minsToday = doneToday.reduce((a, s) => a + s.focusMinutes, 0);
  const longestToday = doneToday.reduce((a, s) => Math.max(a, s.focusMinutes), 0);
  const startedAt = active
    ? new Date(active.startedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Focus"
        subtitle="Work in one block, then step away. Sessions count down from stored timestamps, so a refresh keeps the clock."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          {active ? (
            <div className="flex flex-col items-center">
              <div className="text-[12px] font-medium text-muted-foreground">
                Focusing on
              </div>
              <div
                className="mt-1 mb-6 max-w-full truncate text-[14px] font-medium"
                title={taskTitle}
              >
                {taskTitle}
              </div>

              <div className="relative h-[212px] w-[212px]">
                <svg
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                  className={`h-full w-full -rotate-90 transition-opacity duration-150 ${
                    paused ? 'opacity-40' : ''
                  }`}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r={DIAL_R}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth={4}
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={DIAL_R}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={DIAL_C}
                    strokeDashoffset={DIAL_C * (1 - progress)}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div
                    role="timer"
                    aria-label={`${mm} minutes ${ss} seconds remaining`}
                    className="font-display text-[56px] leading-none tracking-[-0.04em] tabular-nums"
                  >
                    {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                  </div>
                  {paused && <Badge className="chip-high mt-3">Paused</Badge>}
                </div>
              </div>

              <div className="mt-7 flex w-full max-w-xs gap-2">
                <Button
                  variant="outline"
                  onClick={togglePause}
                  className="flex-1"
                >
                  {paused ? (
                    <Play size={15} weight="fill" />
                  ) : (
                    <Pause size={15} weight="fill" />
                  )}
                  {paused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmReset(true)}
                  className="flex-1"
                >
                  <ArrowCounterClockwise size={15} weight="bold" /> Reset
                </Button>
              </div>

              <p className="meta mt-4 text-muted-foreground">
                Started {startedAt}, {active.focusMinutes} minute session
              </p>
            </div>
          ) : (
            <div>
              <SectionTitle right={<TimerIcon size={16} weight="bold" />}>
                New session
              </SectionTitle>

              <div className="space-y-4">
                <div>
                  <Label>Session length</Label>
                  <div
                    role="group"
                    aria-label="Session length"
                    className="flex flex-wrap gap-2"
                  >
                    {FOCUS_PRESETS.map((m) => (
                      <DurationButton
                        key={m}
                        selected={focusMin === m}
                        onClick={() => setFocusMin(m)}
                      >
                        {`${m} min`}
                      </DurationButton>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Break length</Label>
                  <div
                    role="group"
                    aria-label="Break length"
                    className="flex flex-wrap gap-2"
                  >
                    {BREAK_PRESETS.map((m) => (
                      <DurationButton
                        key={m}
                        selected={breakMin === m}
                        onClick={() => setBreakMin(m)}
                      >
                        {`${m} min`}
                      </DurationButton>
                    ))}
                  </div>
                </div>

                <div className="max-w-[11rem]">
                  <Label htmlFor="custom-length">Or set your own</Label>
                  <Input
                    id="custom-length"
                    type="number"
                    min={1}
                    value={focusMin}
                    aria-label="Custom session length in minutes"
                    onChange={(e) =>
                      setFocusMin(Math.max(1, Number(e.target.value)))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="focus-task">Task (optional)</Label>
                  <Select
                    id="focus-task"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    options={[
                      { value: '', label: 'No task' },
                      ...pending
                        .slice(0, 20)
                        .map((t: Task) => ({ value: t.id, label: t.title })),
                    ]}
                  />
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={start}
                disabled={focusMin < 1}
              >
                <Play size={15} weight="fill" /> Start session
              </Button>
            </div>
          )}
        </Card>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card className="p-6">
            <SectionTitle>Today</SectionTitle>
            <div className="flex gap-8">
              <div>
                <div className="font-display text-[26px] leading-none tracking-[-0.03em] tabular-nums">
                  {minsToday}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  focus minutes
                </div>
              </div>
              <div>
                <div className="font-display text-[26px] leading-none tracking-[-0.03em] tabular-nums">
                  {doneToday.length}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  sessions
                </div>
              </div>
              <div>
                <div className="font-display text-[26px] leading-none tracking-[-0.03em] tabular-nums">
                  {longestToday}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  longest
                </div>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
              Between sessions take a {breakMin} minute break. Stand up, drink
              water and look away from the screen.
            </p>
          </Card>

          <Card className="p-6">
            <SectionTitle>Recent sessions</SectionTitle>
            {doneToday.length === 0 ? (
              <EmptyState
                className="px-2 py-8"
                icon={<TimerIcon size={18} weight="bold" />}
                title="No sessions today"
                hint="Start a session and it shows up here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {doneToday
                  .slice(-6)
                  .reverse()
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="truncate text-[13px]">
                        {s.taskTitle ?? 'Unassigned'}
                      </span>
                      <span className="meta shrink-0 text-muted-foreground">
                        {formatMinutes(s.focusMinutes)},{' '}
                        {parseDateKey(s.date).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset this session?"
        message="Progress from this session is discarded and the timer returns to zero."
        confirmLabel="Reset session"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          stop().catch(() => undefined);
        }}
      />
    </div>
  );
}
