import { useEffect, useRef, useState } from 'react';
import {
  CalendarPlus,
  CaretDown,
  Copy,
  DotsThree,
  Flag,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Tooltip,
  useToast,
} from '../ui';
import type { Priority, Task } from '../../types';
import { PRIORITIES } from '../../types';
import {
  bulkDelete,
  changePriority,
  completeTask,
  createTask,
  deleteTask,
  duplicateTask,
  postponeToTomorrow,
  reopenTask,
  skipOccurrence,
} from '../../services/taskService';
import { friendlyDate, formatTime12, formatMinutes } from '../../utils';
import { isRecurringOccurrence } from './utils';

const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'chip-low',
  medium: 'chip-medium',
  high: 'chip-high',
  urgent: 'chip-urgent',
};

export function priorityBadge(p: Priority): React.ReactNode {
  return <Badge className={PRIORITY_STYLE[p]}>{p[0]!.toUpperCase() + p.slice(1)}</Badge>;
}

function MenuItem({
  icon,
  children,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-[13px] transition-colors hover:bg-muted/70 ${
        destructive ? 'text-destructive' : 'text-foreground'
      }`}
    >
      <span
        aria-hidden
        className={`shrink-0 ${destructive ? '' : 'text-muted-foreground'}`}
      >
        {icon}
      </span>
      {children}
    </button>
  );
}

export function TaskItem({
  task,
  onEdit,
  selected,
  onToggleSelected,
  showSelect = false,
  onAfterChange,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  selected?: boolean;
  onToggleSelected?: (id: string) => void;
  showSelect?: boolean;
  onAfterChange?: () => void;
}) {
  const { push } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const completed = task.status === 'completed';
  const isOcc = isRecurringOccurrence(task);

  // The compact action menu only exists on touch widths; dismiss it on an
  // outside press or Escape so it never strands the row.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const toggleComplete = async () => {
    try {
      if (completed) {
        await reopenTask(task.id);
        push('success', 'Task reopened.');
      } else {
        await completeTask(task.id);
        push('success', 'Completed.', {
          label: 'Undo',
          onClick: () => {
            reopenTask(task.id).catch(() => undefined);
          },
        });
      }
      onAfterChange?.();
    } catch {
      push('error', 'Storage error: could not update the task.');
    }
  };

  /** Clicking the title NEVER completes the task — it expands it. */
  const onDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteTask(task.id);
      push('success', 'Task deleted.', {
        label: 'Undo',
        onClick: async () => {
          try {
            await createTask(task);
          } catch {
            push('error', 'Could not restore the task.');
          }
        },
      });
      onAfterChange?.();
    } catch {
      push('error', 'Storage error: could not delete the task.');
    }
  };

  const postpone = () => {
    postponeToTomorrow(task.id)
      .then(() => push('success', 'Postponed to tomorrow.'))
      .then(onAfterChange)
      .catch(() => push('error', 'Could not postpone.'));
  };

  const cyclePriority = async () => {
    const i = PRIORITIES.indexOf(task.priority);
    const next = PRIORITIES[(i + 1) % PRIORITIES.length]!;
    await changePriority(task.id, next);
    onAfterChange?.();
  };

  const skip = () => {
    skipOccurrence(task.id).then(onAfterChange).catch(() => undefined);
  };

  const duplicate = () => {
    duplicateTask(task.id)
      .then(() => push('success', 'Task duplicated.'))
      .then(onAfterChange)
      .catch(() => push('error', 'Could not duplicate.'));
  };

  return (
    <div
      className={`group relative w-full min-w-0 rounded-lg border bg-card px-3.5 py-3 transition-colors ${
        selected
          ? 'border-ring/50 ring-1 ring-ring/15'
          : 'border-border hover:border-input'
      }`}
    >
      <div className="flex items-start gap-3">
        {showSelect && (
          <input
            type="checkbox"
            aria-label={`Select ${task.title}`}
            checked={!!selected}
            onChange={() => onToggleSelected?.(task.id)}
            className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
          />
        )}

        <Checkbox
          checked={completed}
          onChange={toggleComplete}
          aria-label={
            completed
              ? `Mark ${task.title} as not done`
              : `Mark ${task.title} as done`
          }
        />

        <div className="min-w-0 flex-1">
          <button
            className={`block w-full truncate text-left text-[13.5px] font-medium leading-relaxed transition-colors hover:underline hover:decoration-border hover:underline-offset-4 ${
              completed ? 'text-muted-foreground line-through' : ''
            } ${task.status === 'skipped' ? 'text-muted-foreground line-through' : ''}`}
            onClick={() => setExpanded((e) => !e)}
            title={task.title}
          >
            {task.title}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground">
            <span>{priorityBadge(task.priority)}</span>
            <span>{friendlyDate(task.scheduledDate)}</span>
            {(task.startTime || task.endTime) && (
              <span>
                {formatTime12(task.startTime)}
                {task.endTime ? ` – ${formatTime12(task.endTime)}` : ''}
              </span>
            )}
            {/* Phones keep priority, date and time; duration and tags live in
                the edit dialog so the row stays scannable. */}
            <span className="hidden sm:inline">
              {formatMinutes(task.durationMinutes)}
            </span>
            {task.status === 'in_progress' && (
              <Badge className="chip-progress">In progress</Badge>
            )}
            {task.status === 'skipped' && (
              <Badge className="chip-neutral">Skipped</Badge>
            )}
            {isOcc && <Badge className="chip-accent">Recurring</Badge>}
            {(task.tags ?? []).map((tag) => (
              <Badge key={tag} className="chip-neutral hidden sm:inline-flex">
                {tag}
              </Badge>
            ))}
            {task.completedAt && (
              <span className="hidden truncate sm:inline">
                {new Date(task.completedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>

        {/* Pointer and keyboard widths get the full set; touch widths get one
            menu so six icons cannot squeeze the task title to nothing. */}
        <div className="hidden shrink-0 items-center gap-1.5 self-center opacity-70 transition-opacity xl:flex xl:opacity-0 xl:group-hover:opacity-100 xl:group-focus-within:opacity-100">
            <Tooltip label="Postpone to tomorrow">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Postpone to tomorrow"
                onClick={postpone}
              >
                <CalendarPlus size={16} weight="bold" />
              </Button>
            </Tooltip>
            <Tooltip label="Change priority">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Change priority"
                onClick={cyclePriority}
              >
                <Flag size={16} weight="bold" />
              </Button>
            </Tooltip>
            {isOcc && (
              <Tooltip label="Skip occurrence">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Skip this occurrence"
                  onClick={skip}
                >
                  <CaretDown size={16} weight="bold" />
                </Button>
              </Tooltip>
            )}

            <Tooltip label="Duplicate">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Duplicate task"
                onClick={duplicate}
              >
                <Copy size={16} weight="bold" />
              </Button>
            </Tooltip>

            <Tooltip label="Edit">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit task"
                onClick={() => onEdit(task)}
              >
                <PencilSimple size={16} weight="bold" />
              </Button>
            </Tooltip>

            <Tooltip label="Delete">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete task"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash size={16} weight="bold" />
              </Button>
            </Tooltip>
        </div>

        <div ref={menuRef} className="relative shrink-0 self-start xl:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`More actions for ${task.title}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <DotsThree size={20} weight="bold" />
            </Button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Task actions"
                className="absolute right-0 top-full z-30 mt-1 w-56 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-lg border border-border bg-card py-1"
              >
                <MenuItem
                  icon={<CalendarPlus size={15} weight="bold" />}
                  onClick={() => {
                    setMenuOpen(false);
                    postpone();
                  }}
                >
                  Postpone to tomorrow
                </MenuItem>
                <MenuItem
                  icon={<Flag size={15} weight="bold" />}
                  onClick={() => {
                    setMenuOpen(false);
                    void cyclePriority();
                  }}
                >
                  Change priority
                </MenuItem>
                {isOcc && (
                  <MenuItem
                    icon={<CaretDown size={15} weight="bold" />}
                    onClick={() => {
                      setMenuOpen(false);
                      skip();
                    }}
                  >
                    Skip occurrence
                  </MenuItem>
                )}
                <MenuItem
                  icon={<Copy size={15} weight="bold" />}
                  onClick={() => {
                    setMenuOpen(false);
                    duplicate();
                  }}
                >
                  Duplicate
                </MenuItem>
                <MenuItem
                  icon={<PencilSimple size={15} weight="bold" />}
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(task);
                  }}
                >
                  Edit
                </MenuItem>
                <MenuItem
                  icon={<Trash size={15} weight="bold" />}
                  destructive
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  Delete
                </MenuItem>
            </div>
          )}
        </div>
      </div>

      {expanded && task.description && (
        <p className="ml-6 mt-1.5 whitespace-pre-wrap border-t border-border/60 pt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        message={
          <>
            “{task.title}” will be removed from your list.{" "}
            <strong>You can undo right after deleting.</strong>
          </>
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}

export function TaskList({
  tasks,
  onEdit,
  onAfterChange,
  selectable = false,
}: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onAfterChange?: () => void;
  selectable?: boolean;
}) {
  const { push } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastTasksRef = useRef<Task[] | null>(null);
  useEffect(() => {
    if (lastTasksRef.current && tasks !== lastTasksRef.current) {
      setSelected(new Set());
    }
    lastTasksRef.current = tasks;
  }, [tasks]);
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  const [bulkMode] = useState(selectable);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async (action: 'complete' | 'delete' | 'postpone' | 'skip') => {
    const ids = [...selected];
    try {
      if (action === 'complete') {
        await Promise.all(ids.map((id) => completeTask(id)));
      } else if (action === 'delete') {
        await bulkDelete(ids);
      } else if (action === 'postpone') {
        await Promise.all(ids.map((id) => postponeToTomorrow(id)));
      } else if (action === 'skip') {
        await Promise.all(ids.map((id) => skipOccurrence(id)));
      }
      push('success', `${ids.length} task(s) updated.`);
      setSelected(new Set());
      onAfterChange?.();
    } catch {
      push('error', 'Bulk action failed.');
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {bulkMode && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulk('complete')}
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulk('postpone')}
          >
            Postpone
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulk('skip')}
          >
            Skip
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => runBulk('delete')}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-3">
            <TaskItem
              task={t}
              onEdit={onEdit}
              onAfterChange={onAfterChange}
              showSelect={bulkMode}
              selected={selected.has(t.id)}
              onToggleSelected={toggle}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuickAdd({
  defaultDate,
  onCreated,
  placeholder = 'Add a task, for example "Call Sam at 5pm #errands"',
}: {
  defaultDate?: string;
  onCreated?: () => void;
  placeholder?: string;
}) {
  const { push } = useToast();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(defaultDate ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  const submit = async () => {
    const title = value.trim();
    if (!title) return;
    // natural quick syntax: "Title @5pm #tag !high"
    let titlePart = title;
    let time: string | null = null;
    const timeMatch = titlePart.match(/\s@(\d{1,2})(?::(\d{2}))?\s?(am|pm)?$/i);
    if (timeMatch) {
      let h = Number(timeMatch[1]);
      const m = Number(timeMatch[2] ?? 0);
      const pm = timeMatch[3]?.toLowerCase() === 'pm';
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      titlePart = titlePart.replace(timeMatch[0], '');
    }
    const tags: string[] = [];
    titlePart = titlePart.replace(/(^|\s)#([\w-]+)/g, (_m, _p, tag) => {
      tags.push(tag);
      return ' ';
    });
    let priority: Priority = 'medium';
    const priMatch = titlePart.match(/!(low|medium|high|urgent)/i);
    if (priMatch) {
      priority = priMatch[1]!.toLowerCase() as Priority;
      titlePart = titlePart.replace(priMatch[0], '');
    }
    try {
      await createTask({
        title: titlePart.trim() || title,
        scheduledDate: date || undefined,
        startTime: time,
        tags,
        priority,
      });
      setValue('');
      push('success', 'Task added.');
      onCreated?.();
    } catch {
      push('error', 'Could not add the task.');
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            leadingIcon={<PencilSimple size={15} weight="bold" />}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-label="Quick add task"
          />
        </div>
        <Button onClick={submit} disabled={!value.trim()}>
          <Plus size={15} weight="bold" />
          Add
        </Button>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Add a time with @5pm, a tag with #errands, or a priority with !high.
      </p>
    </div>
  );
}