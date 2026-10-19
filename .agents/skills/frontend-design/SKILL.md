---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building or reshaping UI. Covers aesthetic direction, typography, layout and anti-template review.
---

# Frontend design

Act as the design lead at a studio known for distinct visual identities. Every
client has already rejected templated proposals. Make deliberate, opinionated
choices about palette, typography and layout that are specific to the brief.

## Ground the design in the subject

Identify the product, audience and primary job before choosing a direction. The
subject's industry, materials and vocabulary are where distinctive choices come
from. A planner for one person is not a financial analyst dashboard.

## Design principles

- **Hero:** open with the most characteristic thing in the subject's world. A big
  number with a gradient accent is the default treatment; use it only when it is
  genuinely best.
- **Typography carries personality.** Use one family, or two clearly distinct
  ones. Choose deliberately, not the default family for any project. Build a clear
  scale, with intentional weight, width and spacing. Line lengths under 80
  characters; slightly more line-height for serif body text.
- **Structure is information.** Borders, dividers, numbering and labels must
  encode something about the content. Numbered markers only for real sequences.
- **Motion:** one orchestrated moment beats scattered effects. Non-user-triggered
  motion should draw attention, not decorate every section. Motion that answers an
  action is welcome when it shows what changed.
- **Copy is design content.** Write real copy, not placeholder mood.

## Avoid these generated-page tells

- Warm cream + high-contrast serif + terracotta accent, used by default.
- Near-black + one acid-green or vermilion accent.
- Broadsheet hairline/zero-radius/dense-column imitation.
- The SaaS card kit: identical rounded cards, one radius everywhere, the same
  soft grey shadow, gradient washes.
- Template chrome: tracked all-caps eyebrows above every heading, middle-dot meta
  strings, `WORD — fragment` labels, tinted near-black, monospace for every small
  label, arrows appended to every link.
- Accenting one word in a headline with italic, bold or colour.
- All caps for labels.
- Fade-and-slide on every section and hover transitions on every card.

These looks are legitimate for some briefs, but only when the brief asks for
them. Where an axis is free, do not spend it on a default.

## Process

1. **Plan** a compact token system: 4–6 named palette values, typefaces and roles,
   a layout concept with alignment guidance, and the principles that make this
   page specific.
2. **Review** the plan against the brief. If a part is what you would produce for
   any similar page, revise it and say what changed.
3. **Build** only after the direction is confirmed. Watch CSS selector
   specificity; do not let section and element selectors cancel each other.
4. **Critique** while building. Take screenshots if the environment supports it.

## Restraint

Spend boldness in one place. Let one element be memorable and keep the rest quiet.
Meet the quality floor without announcing it: responsive to mobile, visible focus,
reduced motion respected, accessible contrast, harmonious palette. Remove one
accessory before shipping.

## Writing in design

Words make the interface easier to use. Ask what the design needs to say, then say
it plainly.

- Write from the user's perspective, in language they understand.
- Active voice. A call to action names exactly what happens: "Save changes".
- Keep one name for an action through the whole flow.
- Errors explain what failed and how to fix it. No apologies, no vagueness.
- Empty screens invite the next action.
- Sentence case, plain verbs, no filler. Match the brand's tone.
