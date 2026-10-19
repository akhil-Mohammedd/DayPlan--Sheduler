---
name: minimalist-ui
description: Clean editorial-style interfaces with a warm monochrome palette, typographic contrast, flat bento grids and muted pastel accents. No gradients, no heavy shadows.
---

# Premium utilitarian minimalism

A directive for refined, ultra-minimal, document-style interfaces: warm
monochrome, editorial type, macro-whitespace, bento grids and flat components with
deliberate pastel accents.

## Banned defaults

- Inter, Roboto or Open Sans.
- Generic thin-line icon sets such as Lucide, Feather or standard Heroicons.
- Tailwind `shadow-md`, `shadow-lg`, `shadow-xl`. Shadows must be almost invisible
  or customised below 5% opacity.
- Bright primary-coloured backgrounds for large regions.
- Gradients, neon, 3D or glassmorphism beyond a subtle nav blur.
- Pill radii on large containers, cards or primary buttons.
- Emoji anywhere in code, markup, copy, headings or alt text.
- Generic placeholder names or Lorem Ipsum.
- AI copy clichés: elevate, seamless, unleash, next-gen, game-changer, delve.

## Typography

- **Body/UI:** a clean geometric or system-native sans with character, such as
  `SF Pro Display`, `Geist Sans`, `Helvetica Neue` or `Switzer`.
- **Display:** an editorial serif such as `Lyon Text`, `Newsreader`,
  `Playfair Display` or `Instrument Serif`. Tight tracking (−0.02 to −0.04em),
  line-height around 1.1.
- **Mono:** `Geist Mono`, `SF Mono` or `JetBrains Mono` for code, keystrokes and
  metadata.
- Body text is never pure black. Use off-black or charcoal with line-height 1.6.
  Secondary text is a muted grey.

## Palette

Colour is scarce, used for meaning or quiet accent.

- Canvas: `#FFFFFF`, warm bone `#F7F6F3` or `#FBFBFA`.
- Card surface: `#FFFFFF` or `#F9F9F8`.
- Hairline: `#EAEAEA` or `rgba(0,0,0,0.06)`.
- Pastels only for tags, inline code or icon backgrounds:
  pale red `#FDEBEC` / `#9F2F2D`, pale blue `#E1F3FE` / `#1F6C9F`,
  pale green `#EDF3EC` / `#346538`, pale yellow `#FBF3DB` / `#956400`.

## Components

- **Bento grids:** asymmetric CSS grid, 1px borders, 8–12px radius, 24–40px
  padding.
- **Primary button:** `#111111` background, white text, 4–6px radius, no shadow.
  Hover shifts to `#333333`; active scales to 0.98.
- **Badges:** small type, wide tracking, pastel background. Pills are allowed for
  status only, never for large elements.
- **Accordions:** no container boxes; hairline dividers and a sharp +/− toggle.
- **Keystrokes:** real `<kbd>` elements with hairline border, 4px radius, warm
  surface and mono type.
- **Window chrome:** when mocking software, a white top bar with three small grey
  circles.

## Icons and imagery

- Phosphor or Radix icons; standardise stroke weight.
- Illustrations: monochrome rough line work with one offset pastel shape.
- Photos: desaturated, warm, low-opacity grain. No oversaturated stock.
- Sections need depth: a very low-opacity image, a soft warm radial light or a
  minimal line pattern. Keep it below 4% visual weight.

## Motion

- Invisible, quiet motion. Scroll entry: opacity plus 12px rise over 600ms with
  `cubic-bezier(0.16, 1, 0.3, 1)`, using IntersectionObserver.
- Hover: shadow from `0 0 0` to `0 2px 8px rgba(0,0,0,0.04)` over 200ms.
- Stagger list items by 80ms, never mount everything at once.
- Animate only transform and opacity. No layout properties.
- Gate motion behind `prefers-reduced-motion: no-preference` and disable it under
  `reduce`. Hover and press feedback may remain.

## Execution

1. Establish macro-whitespace first with generous vertical section padding.
2. Constrain content to `max-w-4xl` or `max-w-5xl`.
3. Apply the custom type hierarchy and monochrome variables immediately.
4. Every card, divider and border follows the 1px hairline rule.
5. Add restrained reveal motion to major blocks only.
6. Give sections depth without gradients.
