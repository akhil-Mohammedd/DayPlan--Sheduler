---
name: dayplan-design
description: DayPlan's design system and anti-slop rules. Use for every UI change in this repository so screens stay editorial, warm and consistent.
---

# DayPlan design

DayPlan is a local-first daily planner. The interface is a quiet paper desk
planner: warm paper, ink typography, hairline structure, and colour only where it
carries meaning. Read `DESIGN.md` at the repository root for the full token table.

## Checklist before writing UI

1. Read `DESIGN.md` and the tokens in `src/index.css`.
2. Reuse `PageHeader`, `Card`, `Button`, `Input`, `Badge`, `Dialog`, `EmptyState`
   and `ProgressRing` from `src/components/ui`. Do not recreate one-off versions.
3. Use Phosphor icons only (`@phosphor-icons/react`, `weight="bold"`), never emoji.
4. Use the `.chip-*` classes for status and priority colour.
5. Keep one primary action per section.
6. Check light and dark mode, mobile at 375px, and keyboard focus.

## Non-negotiables

- Fonts: Newsreader for page titles and large numerals, Instrument Sans for UI,
  JetBrains Mono for dates, times and keyboard hints. Never Inter or Roboto.
- Palette: warm paper canvas, white surface, ink text, warm hairlines, one sage
  accent. No bright saturated colours, gradients, glass or heavy shadows.
- Surfaces: 12px radius, `1px solid hsl(var(--border))`, 24px padding, flat.
- Buttons: 6px radius, 36px height, ink primary, outline/ghost secondary.
- Page title: use `<PageHeader title subtitle actions />`; it renders the serif
  title and muted subtitle. Do not hand-roll an `h1` with `text-lg font-semibold`.
- Meta strings: no middle dots. Use comma-separated spans or plain words.
- Copy: sentence case, active voice, specific language. No emoji, exclamation
  marks, "Oops", "Elevate", "Seamless", "Unleash" or other filler.
- Empty states: one line of direction plus a real next action.
- Motion: `.page-enter` only on route content; 150ms interaction transitions;
  respect `prefers-reduced-motion`.

## Where things live

| Concern | File |
| --- | --- |
| Colour, type, motion tokens | `src/index.css` |
| Tailwind colour and font mapping | `tailwind.config.js` |
| Design system narrative | `DESIGN.md` |
| Primitives and PageHeader | `src/components/ui/index.tsx` |
| Card and SectionTitle | `src/components/ui/Card.tsx` |
| Shell, navigation, header | `src/components/layout/AppShell.tsx` |

## Review questions

- Does this screen look like it belongs to one specific planner, or any SaaS app?
- Is colour doing semantic work, or decorating?
- Is there one clear action, or several competing filled buttons?
- Would this survive a 375px screen and a keyboard-only pass?
- Did I remove one accessory before shipping?
