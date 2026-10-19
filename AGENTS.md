# DayPlan agent guide

DayPlan is a local-first daily planner built with React 18, strict TypeScript,
Vite, Tailwind CSS, Dexie and Recharts. Keep changes focused, preserve existing
behavior, and prefer the project’s current patterns over new abstractions.

## Start here

1. Read the relevant code and nearby tests before changing behavior.
2. For UI work, read [`DESIGN.md`](./DESIGN.md) and load the `dayplan-design`
   skill from `.agents/skills/dayplan-design/SKILL.md`.
3. Load only the supporting UI skills that apply to the task:
   - `frontend-design` for visual direction and typography.
   - `minimalist-ui` for palette and surface guidance.
   - `redesign-existing-projects` for targeted improvements to existing screens.
   - `ui-design-brain` for component and interaction patterns.
   - `ui-ux-pro-max` for accessibility and responsive checks.
   - `better-icons` when adding or changing icons.
4. Reuse primitives in `src/components/ui` before creating new ones.

## Product and design rules

- Keep DayPlan local-first. Do not introduce a remote service or transmit user
  data unless the task explicitly requires it.
- Use warm paper, ink text, hairline borders and sage sparingly. Avoid gradients,
  heavy shadows, glass effects and large saturated surfaces.
- Use Newsreader for page titles and large numerals, Instrument Sans for UI, and
  JetBrains Mono for dates, times and keyboard hints. Never use Inter or Roboto.
- Use Phosphor icons with bold weight. Do not add emoji, Lucide, Feather or
  Heroicons.
- Use sentence case, active voice and specific copy. Avoid filler and
  middle-dot-separated metadata.
- Keep one primary action per region. Preserve visible focus styles and support
  keyboard interaction. Check responsive layouts at 375px and wider viewports.
- Respect light and dark themes, reduced-motion preferences and semantic color
  tokens. Avoid raw status colors in components; use the existing `.chip-*`
  classes where appropriate.

## Code and behavior

- Keep TypeScript strict. Preserve meaningful types; do not use `any` or weaken
  compiler and test checks to silence errors.
- Follow nearby React, Tailwind and service patterns. Avoid unrelated refactors
  and new dependencies unless they are necessary for the requested change.
- Keep persistence and user-facing behavior consistent with the local-first
  model. Handle loading, empty and error states when changing data flows.
- Add or update focused tests for behavior changes. Keep tests alongside the
  existing `src/**/*.test.{ts,tsx}` convention.
- Do not commit changes or create branches unless explicitly asked.

## Validation

Available commands:

```bash
npm run dev      # Start the Vite development server
npm run build    # Run TypeScript project builds and create a production bundle
npm test         # Run the Vitest suite
```

After a non-trivial change, run the most relevant test first. Run `npm run build`
and the broader test suite when appropriate. Report commands that fail and
separate existing warnings from failures introduced by the change.
