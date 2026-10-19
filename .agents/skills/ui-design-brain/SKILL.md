---
name: ui-design-brain
description: Production-grade UI guidance grounded in documented interface component patterns. Use when building pages, dashboards, forms, navigation or any UI.
---

# UI design brain

Consult these component patterns before writing UI. The goal is modern, minimal,
production-ready work rather than generic template output.

## Design philosophy

1. **Restraint over decoration.** Fewer elements, highly refined. White space is a
   feature.
2. **Typography carries hierarchy.** A distinctive display face with a clean body
   face; strong contrast between headings and labels.
3. **One strong colour moment.** Neutral palette first, then one confident accent.
   If it could sit on a book cover, it is probably timeless.
4. **Spacing is structure.** Use an 8px grid. Tight gaps group related elements;
   generous gaps let hero content breathe.
5. **Accessibility is non-negotiable.** WCAG AA contrast, focus indicators,
   semantic HTML, keyboard navigation.
6. **No generic AI aesthetics.** No purple-on-white gradients, no default
   Inter/Roboto, no evenly spaced card grids, no cookie-cutter layout.

## Workflow

1. **Identify components.** Map the request to the patterns below.
2. **Apply best practices.** Layout, interaction, typography, states.
3. **Choose a direction.** Match the product: Modern SaaS, Apple-level Minimal,
   Enterprise, Creative/Portfolio or Data Dashboard.
4. **Generate code.** React and Tailwind unless the project says otherwise. Use
   the 8px spacing scale, CSS variables or Tailwind tokens for colour, expressive
   font pairings, hover/focus/active/disabled states, mobile-first responsive
   checks at 375/768/1440, and semantic HTML with ARIA where needed.

## Component quick reference

| Component | When to use | Key rule |
| --- | --- | --- |
| Button | Trigger actions | Verb-first labels; one primary per section |
| Card | Represent an entity | Media, title, meta, action; border OR shadow, not both |
| Modal | Focused attention | Trap focus; X, Cancel and Escape close it; restore focus |
| Navigation | Page or section links | 5–7 items; clear active state |
| Table | Structured data | Sticky header; right-align numbers; sortable columns |
| Tabs | Switch panels | 2–7 tabs; active indicator; accordion on mobile |
| Form | Collect input | Single column; labels above; validate on blur |
| Toast | Brief confirmation | Auto-dismiss 4–6s; undo for destructive actions |
| Alert | Important status | Semantic colour and icon; at most two sentences |
| Drawer | Secondary panel | Right for detail, left for nav; 320–480px |
| Search input | Find content | Cmd/Ctrl+K; debounce 200–300ms |
| Empty state | No data | Illustration or icon, headline, primary action |
| Skeleton | Loading | Match the real layout shape; shimmer |
| Badge | Status or metadata | 1–2 words; limited semantic palette |
| Dropdown menu | Actions or navigation | 7±2 items; destructive action last |

## Anti-patterns

- Rainbow badges with no semantic meaning.
- A modal inside a modal.
- A disabled submit button with no explanation.
- Spinners where a skeleton would preserve layout.
- "Click here" links.
- A hamburger menu on desktop when there is room for visible navigation.
- Auto-advancing carousels.
- Placeholder-only form fields.
- Equal-weight buttons with no hierarchy.
- Body text below 14px; prefer 16px.
- Icon-only buttons without labels.
- Removing focus rings.

## Review before delivery

- One h1 per page and a strict heading order.
- Labels above inputs, not placeholders used as labels.
- Loading, empty and error states all designed.
- Keyboard path reaches every control with visible focus.
- Touch targets at least 44px on mobile.
- Text contrast meets AA in both themes.
- Content uses real, specific language.
