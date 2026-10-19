import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button, EmptyState, Input, PageHeader, Select } from '../../components/ui';
import { QuickAdd, TaskList } from '../../components/tasks/TasksUI';
import { TaskForm } from '../../components/tasks/TaskForm';
import { useAllTasks, applyFilter } from '../../hooks';
import type { TaskFilter } from '../../hooks';
import type { Task } from '../../types';
import { CATEGORIES } from '../../types';
import { useTags } from '../../hooks';

const initialFilter: TaskFilter = {
  query: '',
  category: '',
  priority: '',
  status: '',
  bucket: 'all',
  tag: '',
};

export function TasksPage({
  initialBucket = 'all',
  initialStatus = '',
}: {
  initialBucket?: TaskFilter['bucket'];
  initialStatus?: string;
}) {
  const { tasks: all } = useAllTasks();
  const [filter, setFilter] = useState<TaskFilter>({
    ...initialFilter,
    bucket: initialBucket,
    status: initialStatus,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [sort, setSort] = useState<'date' | 'priority' | 'created'>('date');

  const tasks = all ?? [];
  const tags = useTags(all);
  const filtered = useMemo(() => applyFilter(tasks, filter), [tasks, filter]);
  const sorted = useMemo(() => {
    const priRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const out = [...filtered];
    if (sort === 'date') out.sort((a, b) => (a.scheduledDate ?? '9999').localeCompare(b.scheduledDate ?? '9999'));
    if (sort === 'priority') out.sort((a, b) => (priRank[a.priority] ?? 9) - (priRank[b.priority] ?? 9));
    if (sort === 'created') out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [filtered, sort]);

  const set = (patch: Partial<TaskFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          filter.status === 'completed'
            ? 'Completed'
            : filter.bucket === 'all'
              ? 'All tasks'
              : `${filter.bucket[0]?.toUpperCase()}${filter.bucket.slice(1)}`
        }
        subtitle={`${sorted.length} ${sorted.length === 1 ? 'task' : 'tasks'} in view`}
      />

      <QuickAdd />

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder="Search title, notes, tags…"
            value={filter.query}
            aria-label="Search tasks"
            onChange={(e) => set({ query: e.target.value })}
            className="lg:col-span-2"
          />
          <Select
            aria-label="Filter by bucket"
            value={filter.bucket}
            onChange={(e) => set({ bucket: e.target.value as TaskFilter['bucket'] })}
            className="w-full"
            options={[
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'tomorrow', label: 'Tomorrow' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <Select
            aria-label="Filter by category"
            value={filter.category}
            onChange={(e) => set({ category: e.target.value })}
            className="w-full"
            options={[{ value: '', label: 'Category: all' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <Select
            aria-label="Filter by priority"
            value={filter.priority}
            onChange={(e) => set({ priority: e.target.value })}
            className="w-full"
            options={[
              { value: '', label: 'Priority: all' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <Select
            aria-label="Filter by status"
            value={filter.status}
            onChange={(e) => set({ status: e.target.value })}
            className="w-full"
            options={[
              { value: '', label: 'Status: all' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'skipped', label: 'Skipped' },
            ]}
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-xs text-muted-foreground">Tags:</span>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => set({ tag: filter.tag === t ? '' : t })}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                  filter.tag === t
                    ? 'border-transparent bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
          <span>Showing {sorted.length}</span>
          <label className="flex items-center gap-2">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-11 rounded-md border border-input bg-card px-2 sm:h-8 md:px-3"
              aria-label="Sort tasks"
            >
              <option value="date">Date</option>
              <option value="priority">Priority</option>
              <option value="created">Recently created</option>
            </select>
          </label>
        </div>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          hint="Add one below — press N anywhere in the app to open quick add."
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No tasks match these filters"
          hint="Try clearing the search or switching filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilter({ ...initialFilter, bucket: initialBucket, status: initialStatus })
              }
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <TaskList tasks={sorted} onEdit={(t) => { setEditing(t); setFormOpen(true); }} selectable />
      )}

      <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />
    </div>
  );
}
