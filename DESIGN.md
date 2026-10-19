# DayPlan design system

DayPlan is a local-first daily planner. The interface should feel like a quiet
paper desk planner: warm paper, ink typography, hairline structure, and colour
used only to carry meaning. It is not a generic SaaS dashboard.

## Skills

Read these before any UI change. They are stored in `.agents/skills/`:

| Skill | Use it for |
| --- | --- |
| `dayplan-design` | This project's tokens, layout and copy rules. Always read first. |
| `frontend-design` | Aesthetic direction, typography, anti-template review. |
| `minimalist-ui` | Warm monochrome palette, flat surfaces, editorial hierarchy. |
| `redesign-existing-projects` | Auditing and upgrading existing screens without rewrites. |
| `ui-design-brain` | Component selection and interaction best practices. |
| `ui-ux-pro-max` | Accessibility, responsive and UX quality checks. |
| `better-icons` | Finding and retrieving icons when a new one is needed. |

## Direction

- **Subject:** one person planning a day, not an enterprise analytics tool.
- **Hero:** the current day. A serif page title, the date, and one honest
  progress signal. No marketing headline, no gradient hero.
- **Personality:** editorial restraint. Newsreader titles over Instrument Sans
  interface text, warm grey hairlines, sage used sparingly for selection.
- **Structure encodes information:** borders separate real regions, not every
  card. Groups of navigation get hairlines, not decorative labels everywhere.

## Tokens

### Light

| Token | Value | Use |
| --- | --- | --- |
| canvas | `#FAF9F6` | app background |
| surface | `#FFFFFF` | cards, inputs, dialogs |
| muted surface | `#F3F1EC` | quiet fills, hover |
| ink | `#1B1A17` | primary text, primary button |
| muted ink | `#6F6A60` | secondary text, meta |
| hairline | `#E5E1D8` | borders and dividers |
| input line | `#DCD7CC` | field and hover borders |
| sage | `#E9EFE3` / text `#3F5B39` | active navigation, selected state |
| focus ring | `#4F6047` | keyboard focus |

### Dark

| Token | Value |
| --- | --- |
| canvas | `#161513` |
| surface | `#1D1C19` |
| muted surface | `#242320` |
| ink | `#EFEDE7` |
| muted ink | `#A9A499` |
| hairline | `#302E29` |
| input line | `#38352F` |
| sage | `#2B3127` / text `#DCE4D4` |
| focus ring | `#9DB58F` |

Semantic pastels are the only other colour: pale blue for medium priority and
in-progress, pale yellow for high priority and warnings, pale red for urgent and
destructive, pale green for completed. Chips are defined as `.chip-*` in
`src/index.css`. Never use raw Tailwind red/blue/green utilities in components.

## Typography

| Role | Family | Rules |
| --- | --- | --- |
| Page title, timer, large metrics | Newsreader | 28–34px page titles, weight 400, tracking −0.03em, line-height 1.08 |
| Interface and body | Instrument Sans | 13–15px, line-height 1.6, labels 11.5px |
| Dates, times, counters, kbd | JetBrains Mono | 10.5px meta, tabular figures |

Never use Inter, Roboto or Open Sans. Do not add a third display family. Do not
accent a single word in a heading. Do not set labels in all caps.

## Layout

- Desktop: 232px navigation rail, 56px header, content `max-w-5xl`.
- Collapsed rail: 62px, icons only, tooltips and accessible names retained.
- Page padding: 16px mobile, 32px desktop. Section gap: 20–24px.
- Cards: 12px radius, 1px hairline border, 24px padding, no shadow.
- Buttons: 6px radius, 36px height. Primary is ink, never a saturated colour.
- One primary action per region. Everything else is outline, ghost or a link.
- Mobile: off-canvas navigation drawer; no horizontal scroll; 44px touch targets.

## Motion

- One entrance only: `.page-enter` on route content, 480ms, opacity plus 10px rise.
- Interactive transitions are 150ms; buttons press with `scale(0.98)`.
- No continuous ambient animation, no scroll listeners, no staggered card reveals.
- `prefers-reduced-motion: reduce` disables entrance motion.

## Copy

- Sentence case everywhere, including page titles and buttons.
- Active voice and verb-first actions: "Save changes", "New task", "Move to tomorrow".
- Keep one name per action through the whole flow.
- Errors say what happened and how to fix it. No apologies, no "Oops".
- Empty states invite the next action. No exclamation marks, no emoji.
- Do not join meta strings with middle dots. Use separate elements, commas or
  plain words.

## Hard bans

- No gradients, glow, glassmorphism, noise overlays or 3D effects.
- No `shadow-md`, `shadow-lg`, `shadow-xl`; custom shadows stay under 5% opacity.
- No Lucide, Feather or Heroicons. Use Phosphor (`@phosphor-icons/react`, bold
  weight) or a custom SVG with the same stroke weight.
- No emoji in UI copy, tooltips or titles.
- No pill-shaped primary buttons or large containers.
- No bright saturated backgrounds or rainbow status badges.
- No generic three-column card rows or floating rounded cards without structure.
- No removing focus rings. No icon-only control without an accessible name.
