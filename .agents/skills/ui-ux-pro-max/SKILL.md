---
name: ui-ux-pro-max
description: UI/UX design intelligence for web, mobile and desktop. Use when designing, reviewing or fixing interfaces, including layout, accessibility, interaction, typography, colour and data display.
---

# UI/UX pro max

Use this skill when a task changes how something looks, feels, moves or is
interacted with. Skip it for backend logic and non-visual work.

The upstream searchable database is not vendored in this repository. Use the
priority rules and checklists below, plus the project tokens in `DESIGN.md`.

## Rule priority

| Priority | Category | Must have | Avoid |
| --- | --- | --- | --- |
| 1 | Accessibility | 4.5:1 contrast, alt text, keyboard nav, ARIA labels | Removing focus rings; unlabeled icon buttons |
| 2 | Touch and interaction | 44×44px targets, 8px spacing, loading feedback | Hover-only actions; 0ms state changes |
| 3 | Performance | Modern images, lazy loading, reserved space | Layout thrash; cumulative layout shift |
| 4 | Style selection | Match the product, stay consistent, SVG icons | Mixing styles randomly; emoji as icons |
| 5 | Layout and responsive | Mobile-first, viewport meta, no horizontal scroll | Fixed pixel containers; disabled zoom |
| 6 | Type and colour | 16px base, 1.5 line-height, semantic tokens | Body under 12px; raw hex in components |
| 7 | Animation | Purposeful timing, motion conveys meaning | One duration everywhere; animating width/height |
| 8 | Forms and feedback | Visible labels, errors near fields, helper text | Placeholder-only labels; errors only at top |
| 9 | Navigation | Predictable back, deep links, ≤5 bottom nav items | Overloaded navigation; broken back behavior |
| 10 | Charts and data | Legends, tooltips, accessible colours | Relying on colour alone |

## Workflow

1. **Analyse** the request: product type, audience, context, style keywords and
   stack. Detect the stack from the project; never assume one.
2. **Choose a direction** from the product and audience, not from a trend.
3. **Search specific concerns** in the priority table; fix the highest-priority
   problem first.
4. **Implement** with the project's existing UI primitives and tokens.
5. **Verify** at 375, 768 and 1440px, in light and dark mode, with keyboard only.

## Accessibility details

- Check one observable outcome at a time: focus not obscured, error summary,
  decorative icon hidden, accessible name on an icon button.
- Do not accept a generic accessibility claim for a specific interaction.
- Keep live regions for status changes; announce toasts sparingly.
- Provide text alternatives for charts and colour-coded status.

## Delivery checklist

- Contrast passes in both themes.
- Focus visible on every interactive element.
- No horizontal scroll at 375px.
- Labels are visible and errors are inline.
- Touch targets and spacing meet the 44px rule.
- Motion respects reduced-motion and does not animate layout.
- Empty, loading and error states exist.
- Icons have consistent weight and accessible names.
- Copy is specific, sentence case and free of clichés.
