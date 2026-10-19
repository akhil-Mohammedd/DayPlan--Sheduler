import { useRef, useState } from 'react';
import {
  DownloadSimple,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { Card, SectionTitle } from '../../components/ui/Card';
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  Input,
  Label,
  PageHeader,
  Select,
  useToast,
} from '../../components/ui';
import { useSettings } from '../../hooks';
import type { AppSettings, Theme } from '../../types';
import {
  buildExport,
  downloadFile,
  runImport,
  tasksToRows,
  toCsv,
  validateBundle,
  type ImportValidation,
} from '../../services/backupService';
import { resetAllData, THEME_CHOICES } from '../../services/settingsService';
import { todayKey } from '../../utils';

const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function SettingsPage() {
  const { settings, update } = useSettings();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingBundle, setPendingBundle] = useState<ImportValidation | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const s: AppSettings = settings;

  const handleExport = async (csv: boolean) => {
    setBusy(true);
    try {
      const bundle = await buildExport();
      downloadFile(
        `dayplan-export-${todayKey()}.json`,
        JSON.stringify(bundle, null, 2),
      );
      push('success', 'Backup downloaded. Keep it somewhere safe.');
      if (csv) {
        downloadFile(
          `dayplan-tasks-${todayKey()}.csv`,
          toCsv(tasksToRows(bundle.tasks)),
          'text/csv',
        );
        push('success', 'Task list exported as CSV.');
      }
    } catch {
      push('error', 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);
      const v = validateBundle(raw);
      setPendingBundle(v);
      if (!v.ok) {
        push('error', 'This file cannot be imported. See details in the dialog.');
      }
    } catch {
      push('error', 'Not a valid JSON file.');
      setPendingBundle(null);
    }
  };

  const doImport = async (mode: 'merge' | 'replace') => {
    if (!pendingBundle?.bundle) return;
    setBusy(true);
    try {
      const res = await runImport(mode, pendingBundle.bundle);
      push('success', `Imported (${mode}): ${res.added.tasks} tasks, ${res.added.habits} habits, ${res.added.notes} notes.${res.skipped ? ` ${res.skipped} duplicates skipped.` : ''}`);
      setPendingBundle(null);
    } catch (e) {
      console.error(e);
      push('error', 'Import failed — your existing data was not changed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Appearance, scheduling defaults and a local copy of your data."
      />

      <Card className="p-4 md:p-6">
        <SectionTitle>Appearance</SectionTitle>
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          <Label className="mb-0">Theme</Label>
          <Select
            aria-label="Theme"
            value={s.theme}
            onChange={(e) => update({ theme: e.target.value as Theme })}
            className="w-auto"
            options={THEME_CHOICES.map((value) => ({
              value,
              label: THEME_LABELS[value],
            }))}
          />
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          System follows your operating system setting. The theme switch in the header moves between
          light and dark only.
        </p>
      </Card>

      <Card className="p-4 md:p-6">
        <SectionTitle>Scheduler</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <Label htmlFor="st-start">Day starts (hour)</Label>
            <Input
              id="st-start"
              type="number"
              min={0}
              max={12}
              value={s.dayStartHour}
              onChange={(e) => update({ dayStartHour: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="st-end">Day ends (hour)</Label>
            <Input
              id="st-end"
              type="number"
              min={12}
              max={23}
              value={s.dayEndHour}
              onChange={(e) => update({ dayEndHour: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="st-interval">Interval</Label>
            <Select
              id="st-interval"
              className="w-full"
              value={String(s.intervalMinutes)}
              onChange={(e) => update({ intervalMinutes: Number(e.target.value) as 15 | 30 | 60 })}
              options={[
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '60', label: '60 minutes' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="st-dur">Default task duration (min)</Label>
            <Input
              id="st-dur"
              type="number"
              min={5}
              step={5}
              value={s.defaultTaskDuration}
              onChange={(e) => update({ defaultTaskDuration: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <SectionTitle
          right={
            <Badge className="chip-high">
              Stored only in this browser
            </Badge>
          }
        >
          Backup &amp; restore
        </SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Export a full backup regularly — e.g. weekly. Exports include tasks, completion history, recurring
          rules, habits, notes, focus sessions, and settings, plus a schema version and timestamp.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => handleExport(false)}>
            <DownloadSimple size={15} weight="bold" /> Export JSON
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => handleExport(true)}>
            <DownloadSimple size={15} weight="bold" /> Export JSON and CSV
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <UploadSimple size={15} weight="bold" /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Choose backup file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <SectionTitle>Data</SectionTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          Everything is stored locally in IndexedDB under this browser profile and origin. Clearing site data or
          uninstalling the browser will erase it — there is no server copy.
        </p>
        <Button variant="destructive" onClick={() => setConfirmReset(true)}>
          <Trash size={15} weight="bold" /> Delete all data
        </Button>
      </Card>

      {/* Import preview dialog */}
      <Dialog
        open={!!pendingBundle}
        onClose={() => setPendingBundle(null)}
        title={pendingBundle?.ok ? 'Import preview' : 'Import failed'}
        footer={
          pendingBundle?.ok ? (
            <>
              <Button variant="outline" onClick={() => setPendingBundle(null)}>Cancel</Button>
              <Button variant="outline" onClick={() => doImport('merge')} disabled={busy}>
                Merge
              </Button>
              <Button variant="destructive" onClick={() => doImport('replace')} disabled={busy}>
                Replace all
              </Button>
            </>
          ) : (
            <Button onClick={() => setPendingBundle(null)}>Close</Button>
          )
        }
      >
        {pendingBundle?.ok ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Tasks" value={String(pendingBundle.counts?.tasks ?? 0)} />
              <Stat label="Habits" value={String(pendingBundle.counts?.habits ?? 0)} />
              <Stat label="Habit logs" value={String(pendingBundle.counts?.habitLogs ?? 0)} />
              <Stat label="Notes" value={String(pendingBundle.counts?.notes ?? 0)} />
            </div>
            <p className="text-muted-foreground">
              <strong>Merge</strong> keeps existing data and skips duplicate IDs.{' '}
              <strong>Replace</strong> deletes current data first — a safety backup downloads automatically
              before replacing.
            </p>
          </div>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {pendingBundle?.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        title="Delete all data?"
        message="This removes every task, habit, note and setting stored in this browser. Export a backup first if you might want it back. This cannot be undone."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAllData()
            .then(() => {
              push('success', 'All data deleted.');
              setConfirmReset(false);
            })
            .catch(() => push('error', 'Could not delete data.'));
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-center">
      <div className="font-display text-[22px] leading-none tracking-[-0.03em]">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
