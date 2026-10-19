import { useMemo, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  Cell,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../../database/db';
import { Card, SectionTitle } from '../../components/ui/Card';
import { PageHeader, Select } from '../../components/ui';
import { addDaysKey, formatMinutes, todayKey, parseDateKey } from '../../utils';

type Range = 7 | 14 | 30 | 90;

const TOOLTIP_STYLE: CSSProperties = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

const TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: 'hsl(var(--foreground))',
};

const LEGEND_STYLE: CSSProperties = {
  fontSize: 12,
  color: 'hsl(var(--muted-foreground))',
};

export function StatsPage() {
  const [range, setRange] = useState<Range>(7);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []);

  const today = todayKey();
  const rangeStart = useMemo(() => addDaysKey(today, -(range - 1)), [range, today]);

  const inRange = (t: { scheduledDate: string | null; completedAt?: number | null }) =>
    !!t.scheduledDate && t.scheduledDate >= rangeStart && t.scheduledDate <= today;

  const stat = useMemo(() => {
    const all = tasks ?? [];
    const completed = all.filter((t) => t.status === 'completed' && inRange(t));
    const planned = all.filter((t) => inRange(t) && t.status !== 'skipped');
    const plannedMin = planned.reduce((s, t) => s + t.durationMinutes, 0);
    const completedMin = completed.reduce((s, t) => s + t.durationMinutes, 0);

    // daily series
    const daily: { date: string; label: string; completed: number; planned: number; minutes: number }[] = [];
    for (let i = 0; i < range; i++) {
      const d = addDaysKey(rangeStart, i);
      const dayTasks = all.filter((t) => t.scheduledDate === d && t.status !== 'skipped');
      daily.push({
        date: d,
        label: parseDateKey(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        completed: dayTasks.filter((t) => t.status === 'completed').length,
        planned: dayTasks.length,
        minutes: dayTasks.filter((t) => t.status === 'completed').reduce((s, t) => s + t.durationMinutes, 0),
      });
    }

    // category distribution of completed tasks
    const byCat = new Map<string, number>();
    for (const t of completed) {
      const c = t.category ?? 'Other';
      byCat.set(c, (byCat.get(c) ?? 0) + 1);
    }
    const catData = [...byCat.entries()].map(([name, value]) => ({ name, value }));

    return {
      completedCount: completed.length,
      plannedCount: all.filter((t) => inRange(t) && t.status !== 'skipped').length,
      plannedMin,
      completedMin,
      completionRate: planned.length > 0 ? Math.round((completed.length / planned.length) * 100) : 0,
      daily,
      catData,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, range, rangeStart, today]);

  // habit consistency in range
  const habitStats = useMemo(() => {
    const days = range;
    return (habits ?? []).filter((h) => !h.archived).map((h) => {
      const doable = days;
      const done = (logs ?? []).filter((l) => l.habitId === h.id && l.date >= rangeStart && l.date <= today).length;
      const activeDays = Math.min(
        doable,
        Math.max(1, Math.round((Date.now() - parseDateKey(today).getTime()) / 86_400_000) + 1),
      );
      const pct = Math.min(100, Math.round((done / Math.max(1, activeDays)) * 100));
      return { name: h.name, done, pct, color: h.color };
    });
  }, [habits, logs, range, rangeStart, today]);


  return (
    <div className="space-y-5">
      <PageHeader
        title="Statistics"
        subtitle="Trends built from your own task estimates and habit logs."
        actions={
          <Select
            aria-label="Date range"
            value={String(range)}
            onChange={(e) => setRange(Number(e.target.value) as Range)}
            className="w-auto"
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '14', label: 'Last 14 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="meta text-muted-foreground">Completed in {range} days</div>
          <div className="mt-2 font-display text-[28px] leading-none tracking-[-0.03em] tabular-nums">
            {stat.completedCount}
          </div>
        </Card>
        <Card className="p-5">
          <div className="meta text-muted-foreground">Completion rate</div>
          <div className="mt-2 font-display text-[28px] leading-none tracking-[-0.03em] tabular-nums">
            {stat.completionRate}%
          </div>
        </Card>
        <Card className="p-5">
          <div className="meta text-muted-foreground">Planned time</div>
          <div className="mt-2 font-display text-[28px] leading-none tracking-[-0.03em] tabular-nums">
            {formatMinutes(stat.plannedMin)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="meta text-muted-foreground">Completed time</div>
          <div className="mt-2 font-display text-[28px] leading-none tracking-[-0.03em] tabular-nums">
            {formatMinutes(stat.completedMin)}
          </div>
        </Card>
      </div>

      <p className="rounded-lg border border-border bg-card p-4 text-[11.5px] leading-relaxed text-muted-foreground">
        Counts and durations come from stored task records. Durations are your
        own estimates. The app measures real time only when you use the Focus
        timer.
      </p>

      <Card className="p-6">
        <SectionTitle>Completed against planned</SectionTitle>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stat.daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              width={28}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
            />
            <RTooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <Bar dataKey="planned" name="Planned" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[3, 3, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle>Categories completed</SectionTitle>
          {stat.catData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed tasks in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stat.catData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                  {[...stat.catData.keys()].map((i) => (
                    <Cell
                      key={i as number}
                      fill={
                        ['#6F7D62', '#8C6E54', '#6B7F8C', '#8E6B6B', '#7C748C', '#5F7F78'][
                          i % 6
                        ]
                      }
                    />
                  ))}
                </Pie>
                <RTooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <SectionTitle>Habit consistency</SectionTitle>
          {habitStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create habits on the Habits page to see consistency here.</p>
          ) : (
            <div className="space-y-3">
              {habitStats.map((h) => (
                <div key={h.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{h.name}</span>
                    <span className="meta text-muted-foreground">
                      {h.done} days, {h.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${h.pct}%`, backgroundColor: h.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle>Completion trend</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stat.daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              interval="preserveStartEnd"
            />
            <YAxis
              width={36}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
            />
            <RTooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Line type="monotone" dataKey="minutes" name="Est. minutes completed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
