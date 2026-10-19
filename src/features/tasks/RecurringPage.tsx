import { useMemo, useState } from 'react';
import { Repeat } from '@phosphor-icons/react';
import { Card } from '../../components/ui/Card';
import { Badge, Button, EmptyState, PageHeader } from '../../components/ui';
import { TaskItem } from '../../components/tasks/TasksUI';
import { TaskForm } from '../../components/tasks/TaskForm';
import { useAllTasks } from '../../hooks';
import type { Task } from '../../types';
import { todayKey } from '../../utils';

const FREQ_LABEL: Record<string, string> = {
  daily: 'Every day',
  weekdays: 'Mon–Fri',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom interval',
};

export function RecurringPage() {
  const { tasks: all } = useAllTasks();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // "all" scope for editing an existing rule template is edited via an occurrence dialog.
  const rules = useMemo(() => (all ?? []).filter((t) => t.recurrence && !t.recurrenceParentId), [all]);
  const today = todayKey();
  const occurrences = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of all ?? []) {
      if (!t.recurrenceParentId) continue;
      const list = map.get(t.recurrenceParentId) ?? [];
      list.push(t);
      map.set(t.recurrenceParentId, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''));
    return map;
  }, [all]);

  const nextFor = (ruleId: string): Task | undefined =>
    occurrences.get(ruleId)?.find((t) => t.status === 'pending' && (t.scheduledDate ?? '') >= today);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        subtitle="Rules that create a fresh, independent occurrence for each date."
      />
      {rules.length === 0 ? (
        <EmptyState
          icon={<Repeat size={22} weight="bold" />}
          title="No recurring tasks yet"
          hint="Create a task and turn on Repeat in the form. Each date then gets its own occurrence."
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const next = nextFor(rule.id);
            const occ = occurrences.get(rule.id) ?? [];
            const pending = occ.filter((t) => t.status === 'pending').length;
            const completed = occ.filter((t) => t.status === 'completed').length;
            return (
              <Card key={rule.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{rule.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge className="chip-accent">
                        {FREQ_LABEL[rule.recurrence!.frequency]}
                      </Badge>
                      {rule.startTime && (
                        <Badge className="chip-neutral">{rule.startTime}</Badge>
                      )}
                      <Badge className="chip-neutral">
                        {pending} pending, {completed} done
                      </Badge>
                      {next?.scheduledDate && (
                        <Badge className="chip-neutral">
                          next {next.scheduledDate}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(next ?? rule);
                      setFormOpen(true);
                    }}
                  >
                    Edit rule
                  </Button>
                </div>
                {occ.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <div className="meta text-muted-foreground">Occurrences</div>
                    {occ
                      .slice(-5)
                      .reverse()
                      .map((o) => (
                        <TaskItem
                          key={o.id}
                          task={o}
                          onEdit={(t) => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                        />
                      ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
        scopeChoice={editing ? { showScope: !!editing.recurrenceParentId, occurrence: editing } : null}
      />
    </div>
  );
}
