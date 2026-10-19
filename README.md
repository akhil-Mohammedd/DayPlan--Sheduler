# DayPlan — Personal Daily Scheduler & Productivity Dashboard

A local-first personal scheduler and to-do dashboard. **All data lives in your browser (IndexedDB)** — no account, no login, no backend, no paid service.

## Features

- **Dashboard** — today's tasks, overdue tasks, completion %, progress bar, next-up task, quick-add, and daily notes.
- **My Schedule** — interactive day timetable (4 AM–11 PM configurable) with 15/30/60-min intervals, overlapping-task lanes, current-time indicator, click-a-slot-to-create, Day & Agenda views, prev/next/Today navigation, and non-destructive conflict warnings.
- **Task management** — create (quick or detailed), edit, complete/reopen, delete (with undo), duplicate, change priority, postpone to tomorrow, reschedule, bulk actions, filters (bucket/category/priority/status/tags), sorting, and search across title, notes, and tags. Clicking a task's title never completes it.
- **Recurring tasks** — daily, weekdays, selected weekdays, monthly, and every-N-days rules. Each date gets its own independent occurrence (keyed and deduplicated, so refreshing never creates duplicates). Completing or skipping today's occurrence never affects future ones. Editing offers *this occurrence / this and future / all* scopes; deleting offers the same scopes while preserving completed history.
- **Habits** — lightweight tracker with per-date completion records, streaks, weekly consistency strip, 14-day history, colors, archive, and strict habit+date dedupe.
- **Daily notes & review** — main goal, top-3 priorities, observations, went-well / needs-improvement / plan-for-tomorrow, saved per date and never overwritten across days.
- **Statistics** — completions, completion rate, planned vs completed (estimated) time, daily trends, category distribution, and habit consistency, filtered by 7/14/30/90-day ranges, all computed from stored records. Durations are *your estimates*, not measured time.
- **Focus timer (Pomodoro)** — configurable focus length, task association, session history, daily totals. Remaining time is recovered from a stored end-timestamp, so a refresh never breaks the countdown.
- **Backup & restore** — full JSON export (with schema version + timestamp), optional CSV task list, validated import preview, explicit merge/replace choice, automatic safety backup before a destructive replace, and duplicate-ID protection.
- **UX** — light/dark/system theme, keyboard shortcuts (`N` new task, `/` or `Ctrl/Cmd+K` search, `Esc` close, `Ctrl/Cmd+Enter` save), toasts, confirm dialogs, empty states, skeleton loading, responsive layout, reduced-motion support.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

## Publish to GitHub

Before the first push, create an empty repository on GitHub. Do not initialize
it with a README, license or `.gitignore`; this project already has those files.
Then, from the project directory, connect the local repository and push `main`:

```bash
git init -b main
git add .
git commit -m "Initial DayPlan release"
git remote add origin https://github.com/<your-username>/<repository>.git
git push -u origin main
```

Replace the remote URL with your repository URL. GitHub authentication is handled
by your configured Git credential manager or SSH key; never put a token in the
remote URL. The root `.gitignore` excludes dependencies, build output, temporary
browser profiles, local environment files and editor artifacts.

For later updates, use `git add .`, `git commit -m "Describe the change"`, then
`git push`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck + production build (outputs `dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the automated tests (Vitest, 22 tests) |
| `npm run test:watch` | Watch mode tests |

## Local data persistence (important)

Everything is stored in **IndexedDB** (`dayplan-db`) via [Dexie.js](https://dexie.org), versioned with a schema definition so future app updates never wipe your data. Tasks, completion history, recurring rules, habits and their history, daily notes, categories, tags, and settings all survive page refreshes, browser restarts, and app updates.

### Limitations you should know

1. **Data is per browser profile and per origin.** `http://localhost:5173` and a deployed URL (e.g. `https://yourname.github.io`) each have *separate* databases.
2. **Clearing site data erases everything.** "Clear browsing data" or clearing this site's storage deletes your tasks permanently.
3. **Private/incognito mode** may block IndexedDB entirely; the app shows a storage error instead of silently losing data.
4. Regular **exports are your safety net** — Settings shows a persistent reminder. Data cannot be recovered by the app if the browser profile is lost.

## Backup & restore guide

### Export
1. Go to **Settings → Backup & restore**.
2. *Export JSON* downloads a full snapshot (`dayplan-export-<date>.json`) containing tasks, completion history, recurring rules, habits, habit logs, notes, focus sessions, settings, a schema version, and an export timestamp.
3. *Export JSON + CSV* additionally downloads a spreadsheet-friendly task list.

### Import
1. Click **Import backup** and choose a previously exported JSON file.
2. The file is validated (schema version, structure, field types) **before** anything is written. A preview shows what would be imported.
3. Choose:
   - **Merge** — keeps existing data, skips rows whose IDs already exist (no duplicate IDs or habit records).
   - **Replace** — wipes current data, but a safety backup of your current state is downloaded automatically first.
4. Malformed or unsupported files are rejected with an error and your existing data is untouched.

## Deployment (static hosting)

The build is a fully static bundle; deploy `dist/` anywhere:

- **Netlify / Vercel / Cloudflare Pages**: set build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: run `npm run build`, commit/push `dist/` to a `gh-pages` branch (or use any GitHub Action that does so).

Remember: the deployed origin will have its *own* empty database on first visit — export/import a JSON backup to move your data between origins.

## Project structure

```
src/
├── components/         # UI primitives, layout shell, shared task widgets, notes card
│   ├── layout/         # Header, collapsible sidebar, mobile drawer
│   ├── tasks/          # TaskItem, TaskList, QuickAdd, TaskForm, bulk actions
│   ├── notes/          # DailyNotesCard
│   └── ui/             # Button, Input, Dialog, Toasts, EmptyState…
├── features/
│   ├── dashboard/      # Main dashboard page
│   ├── scheduler/      # Interactive timetable (Day/Agenda)
│   ├── tasks/          # All Tasks / Recurring pages
│   ├── habits/         # Habit tracker
│   ├── stats/          # Statistics with Recharts
│   ├── settings/       # Preferences + backup/restore UI
│   └── focus/          # Pomodoro timer
├── database/           # Dexie schema (versioned)
├── services/           # All business logic: tasks, recurrence, habits, notes, backup, settings
├── hooks/              # Live queries, filters, theme, ticking clock
├── types/              # Shared TypeScript models
├── utils/              # Date keys, time math, formatting
└── test/               # Test setup (fake-indexeddb)
```

Database operations are fully separated from UI components: pages consume services through typed hooks backed by Dexie live queries.

## Tests

Automated coverage (`npm test`) verifies the acceptance criteria:

- New tasks persist to IndexedDB after a simulated reload; edits, completions, reopens, and deletes write correctly.
- The recurrence engine handles daily/weekdays/weekly/monthly/custom rules, `endDate`, and bounded windows.
- Materialization is idempotent — reopening the app does not duplicate occurrences.
- Completing/skipping one occurrence never affects future occurrences and preserves the rule.
- Daily notes remain bound to their dates; editing one day never leaks to another.
- Habit logs dedupe per habit+date.
- Exported JSON re-imports; invalid imports are rejected without touching existing data; merge skips duplicate IDs; CSV escaping works.
- Date math crosses month/year/midnight boundaries correctly.

## Tech stack

React 18 + TypeScript (strict), Vite, Tailwind CSS, Dexie (IndexedDB), date-fns, Recharts, Phosphor icons, Vitest + fake-indexeddb.

## Design system

DayPlan uses a warm monochrome editorial system: Newsreader page titles, Instrument
Sans interface text, JetBrains Mono for dates and numbers, hairline borders and a
single sage accent. The full token table, layout rules and copy guidance live in
[DESIGN.md](./DESIGN.md).

UI work must follow the project skills in `.agents/skills/`. Read
`dayplan-design` first; the supporting skills cover frontend direction,
minimalist UI, redesign audits, component patterns, UX checks and icons.
