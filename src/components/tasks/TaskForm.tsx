import { useEffect, useState } from 'react';
import { Button, Dialog, Input, Label, Select, Textarea, useToast } from '../ui';
import type { AppSettings, LocalDate, Priority, RecurrenceRule, Task, TaskDraft } from '../../types';
import { CATEGORIES, PRIORITIES } from '../../types';
import { todayKey } from '../../utils';
import {
  createTask,
  createNewRecurring,
  defaultRule,
  editRecurring,
} from '../../services/taskService';
import type { RuleEditScope } from '../../services/taskService';
import { useUniqueId } from '../ui';

export interface TaskFormValues {
  title: string;
  description: string;
  scheduledDate: LocalDate | '';
  startTime: string;
  durationMinutes: number;
  category: string;
  priority: Priority;
  deadline: LocalDate | '';
  tags: string;
  recurrenceEnabled: boolean;
  rule: RecurrenceRule;
}

function emptyValues(settings: AppSettings): TaskFormValues {
  return {
    title: '',
    description: '',
    scheduledDate: todayKey(),
    startTime: '',
    durationMinutes: settings.defaultTaskDuration,
    category: 'Personal',
    priority: 'medium',
    deadline: '',
    tags: '',
    recurrenceEnabled: false,
    rule: defaultRule(),
  };
}

function fromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    scheduledDate: task.scheduledDate ?? '',
    startTime: task.startTime ?? '',
    durationMinutes: task.durationMinutes,
    category: task.category ?? 'Personal',
    priority: task.priority,
    deadline: task.deadline ?? '',
    tags: (task.tags ?? []).join(', '),
    recurrenceEnabled: !!task.recurrence,
    rule:
      task.recurrence ??
      {
        ...defaultRule(),
        startDate: task.scheduledDate ?? todayKey(),
      },
  };
}

export function TaskForm({
  open,
  onClose,
  editing,           // Task | null for plain edit/creation
  scopeChoice,       // undefined for plain tasks; 'ask' triggers scope dialog for occurrences
  initial,           // prefill for quick creation (e.g., clicked time slot)
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Task | null;
  scopeChoice?: { showScope: boolean; occurrence: Task } | null;
  initial?: Partial<TaskFormValues>;
  onSaved?: () => void;
}) {
  const { push } = useToast();
  const [values, setValues] = useState<TaskFormValues>(() => emptyValues({
    ...({} as AppSettings),
    defaultTaskDuration: 30,
  }));
  const [scope, setScope] = useState<RuleEditScope>('this');
  const uidInput = useUniqueId();

  useEffect(() => {
    if (open) {
      if (editing) setValues(fromTask(editing));
      else setValues({ ...emptyValues({ defaultTaskDuration: 30 } as AppSettings), ...initial });
      setScope('this');
    }
    // Intentionally only re-initialise when the dialog opens or target changes;
    // `initial` may be a fresh object on each parent render and must not wipe edits.
  }, [open, editing]);

  const set = (patch: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...patch }));

  const validDate = (s: string): LocalDate | null | '' => {
    if (!s) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  };

  const validate = (v: TaskFormValues): string | null => {
    if (!v.title.trim()) return 'Title is required.';
    if (v.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(v.scheduledDate)) {
      return 'Scheduled date must be a valid date.';
    }
    if (v.startTime && !/^\d{2}:\d{2}$/.test(v.startTime)) return 'Start time must be HH:mm.';
    if (v.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(v.deadline)) return 'Deadline must be a valid date.';
    if (v.startTime && Number(v.durationMinutes) <= 0) return 'Duration must be positive when a start time is set.';
    return null;
  };

  const handleSave = async () => {
    const err = validate(values);
    if (err) {
      push('error', err);
      return;
    }
    const draft: Partial<TaskDraft> & { title: string } = {
      title: values.title,
      description: values.description,
      scheduledDate: (validDate(values.scheduledDate) || null) as LocalDate | null,
      startTime: values.startTime || null,
      durationMinutes: Number(values.durationMinutes) || 30,
      category: values.category,
      priority: values.priority,
      deadline: (validDate(values.deadline) || null) as LocalDate | null,
      tags: values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      recurrence: values.recurrenceEnabled
        ? { ...values.rule, startDate: values.rule.startDate || values.scheduledDate || todayKey() }
        : null,
    };

    try {
      if (editing) {
        if (scopeChoice?.showScope) {
          await editRecurring(editing.id, scope, draft);
          push('success', scope === 'this' ? 'Occurrence updated.' : 'Recurring schedule updated.');
        } else {
          await editRecurring(editing.id, 'this', draft);
          push('success', 'Task updated.');
        }
      } else if (draft.recurrence) {
        await createNewRecurring(draft as never);
        push('success', 'Recurring task created.');
      } else {
        await createTask(draft);
        push('success', 'Task created.');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      push('error', 'Could not save the task. Storage may be unavailable.');
    }
  };

  const isOccurrenceEdit = !!editing && !!scopeChoice?.showScope;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? (isOccurrenceEdit ? 'Edit recurring task' : 'Edit task') : 'New task'}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isOccurrenceEdit && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 p-2 text-sm">
            <span className="font-medium">Apply changes to:</span>
            {(['this', 'future', 'all'] as RuleEditScope[]).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === s}
                  onChange={() => setScope(s)}
                />
                {s === 'this' ? 'Only this occurrence' : s === 'future' ? 'This and future' : 'All occurrences'}
              </label>
            ))}
          </div>
        )}
        <div>
          <Label htmlFor={uidInput}>Title</Label>
          <Input
            id={uidInput}
            value={values.title}
            autoFocus
            onChange={(e) => set({ title: e.target.value })}
            placeholder="What needs doing?"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleSave();
              }
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-4">
          <div>
            <Label htmlFor="tf-date">Date</Label>
            <Input
              id="tf-date"
              type="date"
              value={values.scheduledDate}
              onChange={(e) => set({ scheduledDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tf-start">Start (optional)</Label>
            <Input
              id="tf-start"
              type="time"
              value={values.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="tf-dur" title="Estimated duration">Duration (min)</Label>
            <Input
              id="tf-dur"
              type="number"
              min={5}
              step={5}
              value={values.durationMinutes}
              onChange={(e) => set({ durationMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="tf-deadline">Deadline (optional)</Label>
            <Input
              id="tf-deadline"
              type="date"
              value={values.deadline}
              onChange={(e) => set({ deadline: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3">
          <div>
            <Label htmlFor="tf-cat">Category</Label>
            <Select
              id="tf-cat"
              className="w-full"
              value={values.category}
              onChange={(e) => set({ category: e.target.value })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <Label htmlFor="tf-pri">Priority</Label>
            <Select
              id="tf-pri"
              className="w-full"
              value={values.priority}
              onChange={(e) => set({ priority: e.target.value as Priority })}
              options={PRIORITIES.map((p) => ({ value: p, label: p[0]!.toUpperCase() + p.slice(1) }))}
            />
          </div>
          <div className="col-span-full sm:col-span-1">
            <Label htmlFor="tf-tags">Tags (comma separated)</Label>
            <Input
              id="tf-tags"
              value={values.tags}
              onChange={(e) => set({ tags: e.target.value })}
              placeholder="exam, infra"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tf-notes">Notes</Label>
          <Textarea
            id="tf-notes"
            rows={2}
            value={values.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Details, links, context…"
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium sm:min-h-0">
            <input
              type="checkbox"
              checked={values.recurrenceEnabled}
              onChange={(e) => {
                const on = e.target.checked;
                set({
                  recurrenceEnabled: on,
                  rule: on ? { ...values.rule, startDate: values.scheduledDate || todayKey() } : values.rule,
                });
              }}
            />
            Repeat
          </label>
          {values.recurrenceEnabled && (
            <div className="mt-4 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-4">
              <div className="col-span-full sm:col-span-1">
                <Label htmlFor="rf-freq">Frequency</Label>
                <Select
                  id="rf-freq"
                  className="w-full"
                  value={values.rule.frequency}
                  onChange={(e) => set({
                    rule: {
                      ...values.rule,
                      frequency: e.target.value as RecurrenceRule['frequency'],
                    },
                  })}
                  options={[
                    { value: 'daily', label: 'Every day' },
                    { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
                    { value: 'weekly', label: 'Selected weekdays' },
                    { value: 'monthly', label: 'Monthly (day of month)' },
                    { value: 'custom', label: 'Every N days' },
                  ]}
                />
              </div>
              {values.rule.frequency === 'weekly' && (
                <div className="col-span-full">
                  <Label>On days</Label>
                  <div className="flex flex-wrap gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((lbl, i) => {
                      const active = (values.rule.weekdays ?? []).includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            const cur = new Set(values.rule.weekdays ?? []);
                            if (cur.has(i)) cur.delete(i);
                            else cur.add(i);
                            set({ rule: { ...values.rule, weekdays: [...cur].sort() } });
                          }}
                          className={`group inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs sm:h-8 sm:w-8 ${
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:bg-accent'
                          }`}
                        >
                          <span className="inline-block transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110">
                            {lbl}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {values.rule.frequency === 'custom' && (
                <div>
                  <Label htmlFor="rf-interval">Every N days</Label>
                  <Input
                    id="rf-interval"
                    type="number"
                    min={1}
                    value={values.rule.interval}
                    onChange={(e) => set({ rule: { ...values.rule, interval: Number(e.target.value) } })}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="rf-start">Starts on</Label>
                <Input
                  id="rf-start"
                  type="date"
                  value={values.rule.startDate}
                  onChange={(e) => set({ rule: { ...values.rule, startDate: e.target.value || todayKey() } })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
