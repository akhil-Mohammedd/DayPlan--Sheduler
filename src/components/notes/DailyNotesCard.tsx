import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { Field, Input, Textarea, Button, useToast } from '../ui';
import { getNote, saveNote } from '../../services/noteService';
import type { DailyNote, LocalDate } from '../../types';

function TextareaSection({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium text-foreground"
      >
        {title}
      </label>
      <p id={`${id}-hint`} className="mb-2 mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
      {children}
    </div>
  );
}

function PriorityLine({
  rank,
  value,
  onChange,
}: {
  rank: number;
  value: string;
  onChange: (value: string) => void;
}) {

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="meta w-5 shrink-0 text-right text-muted-foreground"
      >
        {String(rank).padStart(2, '0')}
      </span>
      <Input

        value={value}
        placeholder={`Priority ${rank}`}
        aria-label={`Priority ${rank}`}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}


function makeNoteFor(date: LocalDate): DailyNote {
  return {
    id: date,
    mainGoal: '',
    topPriorities: ['', '', ''],
    notes: '',
    wentWell: '',
    needsImprovement: '',
    tomorrowPlan: '',
    updatedAt: 0,
  };
}

export function DailyNotesCard({ date, dateLabel }: { date: LocalDate; dateLabel: string }) {
  const { push } = useToast();
  const [note, setNote] = useState<DailyNote>(() => makeNoteFor(date));
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');

  // Always keep the newest note available to the unmount auto-save. The note
  // carries its own date id, so a cleanup can never save under the wrong day.
  const latestRef = useRef({ note, dirty });
  latestRef.current = { note, dirty };

  useEffect(() => {
    let alive = true;
    getNote(date)
      .then((n) => {
        if (!alive) return;
        setNote(n ?? makeNoteFor(date));
        setLoaded(true);
        setDirty(false);
        setSaveState('saved');
      })
      .catch(() => {
        if (alive) {
          push('error', 'Could not load notes for this day.');
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const set = (patch: Partial<DailyNote>) => {
    setNote((n) => ({ ...n, ...patch }));
    setDirty(true);
  };

  const save = async (snapshot = note) => {
    setSaveState('saving');
    try {
      await saveNote(snapshot.id, snapshot);
      if (latestRef.current.note === snapshot) {
        setDirty(false);
        setSaveState('saved');
      }
    } catch {
      setSaveState('error');
      push('error', 'Could not save notes. Try saving again.');
    }
  };

  useEffect(() => {
    if (!loaded || !dirty) return;
    const snapshot = note;
    const timer = setTimeout(() => void save(snapshot), 700);
    return () => clearTimeout(timer);
    // Save after the user pauses, while keeping an explicit save action available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, loaded, note]);

  // auto-save pending edits when leaving the page/day
  useEffect(() => {
    return () => {
      const { note: latest, dirty: isDirty } = latestRef.current;
      if (isDirty) saveNote(latest.id, latest).catch(() => undefined);
    };
  }, []);


  if (!loaded) {
    return <Card className="p-6"><div className="skeleton h-40 w-full" /></Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-5 sm:px-6">
        <div>
          <h2 className="font-display text-[24px] leading-tight tracking-[-0.03em]">
            Daily notes
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            A quiet place to set an intention and reflect.
          </p>
        </div>
        <time className="meta text-muted-foreground" dateTime={date}>
          {dateLabel}
        </time>
      </div>

      <div className="space-y-7 px-4 py-5 sm:px-6 sm:py-6">
        <section className="rounded-lg bg-muted/50 p-4 sm:p-5">
          <Field
            label="Today's main goal"
            htmlFor="dn-goal"
            hint="Choose one thing that would make today feel worthwhile."
          >
            <Input
              id="dn-goal"
              value={note.mainGoal ?? ''}
              placeholder="Finish the draft review"
              onChange={(e) => set({ mainGoal: e.target.value })}
            />
          </Field>
        </section>

        <section className="space-y-3.5">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              Top three priorities
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Put the most important work first.
            </p>
          </div>

          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <PriorityLine
                  rank={i + 1}
                  value={(note.topPriorities ?? [])[i] ?? ''}
                  onChange={(value) => {
                    const arr = [...(note.topPriorities ?? ['', '', ''])];
                    arr[i] = value;
                    set({ topPriorities: arr });
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border pt-5">
          <h3 className="mb-4 text-[14px] font-semibold text-foreground">
            End-of-day reflection
          </h3>
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 sm:gap-y-6">
            <TextareaSection
              id="dn-notes"
              title="Notes and observations"
              hint="Capture decisions, loose ends, or details worth remembering."
            >
              <Textarea
                id="dn-notes"
                aria-describedby="dn-notes-hint"
                rows={5}
                className="min-h-[128px] bg-background text-[14px] leading-6"
                value={note.notes ?? ''}
                placeholder="What do you want to remember about today?"
                onChange={(e) => set({ notes: e.target.value })}
              />
            </TextareaSection>
            <TextareaSection
              id="dn-well"
              title="What went well"
              hint="Notice a win, a useful habit, or something to repeat."
            >
              <Textarea
                id="dn-well"
                aria-describedby="dn-well-hint"
                rows={5}
                className="min-h-[128px] bg-background text-[14px] leading-6"
                placeholder="What are you glad you made time for?"
                value={note.wentWell ?? ''}
                onChange={(e) => set({ wentWell: e.target.value })}
              />
            </TextareaSection>
            <TextareaSection
              id="dn-imp"
              title="What needs improvement"
              hint="Pick one small change, without trying to fix everything."
            >
              <Textarea
                id="dn-imp"
                aria-describedby="dn-imp-hint"
                rows={5}
                className="min-h-[128px] bg-background text-[14px] leading-6"
                placeholder="What would you approach differently next time?"
                value={note.needsImprovement ?? ''}
                onChange={(e) => set({ needsImprovement: e.target.value })}
              />
            </TextareaSection>
            <TextareaSection
              id="dn-tmrw"
              title="Plan for tomorrow"
              hint="Leave yourself a clear, manageable first step."
            >
              <Textarea
                id="dn-tmrw"
                aria-describedby="dn-tmrw-hint"
                rows={5}
                className="min-h-[128px] bg-background text-[14px] leading-6"
                placeholder="What is the first thing you will start with?"
                value={note.tomorrowPlan ?? ''}
                onChange={(e) => set({ tomorrowPlan: e.target.value })}
              />
            </TextareaSection>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-6">
        <span
          role="status"
          aria-live="polite"
          className={`text-[11.5px] ${saveState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {saveState === 'error'
            ? 'Could not save. Try again.'
            : saveState === 'saving'
              ? 'Saving notes…'
              : dirty
                ? 'Unsaved changes'
                : 'All changes saved'}
        </span>
        <Button size="sm" onClick={() => void save()} disabled={!dirty || saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving' : 'Save notes'}
        </Button>
      </div>
    </Card>
  );
}
