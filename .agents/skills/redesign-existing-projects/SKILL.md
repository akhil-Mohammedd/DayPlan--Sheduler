---
name: redesign-existing-projects
description: Upgrade existing websites and apps to premium quality by auditing generic AI patterns and applying targeted design standards without breaking functionality.
---

# Redesign an existing project

## Sequence

1. **Scan** the codebase: framework, styling method, existing components, routes.
2. **Diagnose** against the audit below. List every generic pattern, weak point
   and missing state.
3. **Fix** with targeted upgrades in the existing stack. Do not rewrite from
   scratch. Do not migrate frameworks or styling libraries.

## Audit

### Typography

- Replace browser defaults and Inter everywhere. Choose a family with character,
  such as Geist, Outfit, Cabinet Grotesk or Satoshi. Editorial projects can pair a
  serif display with a sans body.
- Give headlines presence: larger size, tighter tracking, shorter line-height.
- Limit body line length to roughly 65 characters and raise line-height.
- Add medium and semibold weights for subtle hierarchy, not just 400/700.
- Use tabular figures for data-heavy interfaces.
- Avoid all-caps subheaders. Avoid a single orphaned word; use `text-wrap: balance`
  or `pretty`.

### Colour and surfaces

- No pure `#000000` backgrounds; use off-black or tinted dark.
- Keep accent saturation below 80%; desaturate toward the neutrals.
- Pick one accent. Remove the rest.
- Do not mix warm and cool greys.
- Remove purple/blue "AI gradient" aesthetics.
- Tint shadows to the background hue; no generic black at low opacity.
- Break flat sterility with subtle texture or imagery, not standard 45° fades.
- Keep a consistent lighting direction.
- Do not insert a random dark section into a light page. Commit to one system.
- Give empty sections depth with blurred or masked imagery at low opacity.

### Layout

- Break perfect symmetry with offset margins, mixed aspect ratios or left-aligned
  headers over centred content.
- Replace the equal three-card feature row with a zig-zag, asymmetric grid,
  horizontal scroll or masonry.
- Use `min-height: 100dvh`, not `100vh`.
- Use CSS Grid instead of flex percentage math.
- Constrain content to a maximum width with auto margins.
- Avoid uniform border-radius on everything. Tighten inner elements.
- Use overlap and negative margins for depth.
- Adjust vertical padding optically; bottoms often need more.
- A dashboard does not always need a left sidebar. Consider top navigation or a
  command menu.
- A collapsed sidebar keeps an accessible icon rail of 56–72px, with names in the
  DOM, tooltips and 44px targets. Below tablet, use an off-canvas drawer.
- Double the whitespace. Align shared elements across side-by-side cards and pin
  buttons to the bottom.

### Interactivity and states

- Add hover, active and focus states to everything interactive.
- Transitions 200–300ms; no instant changes.
- Keep a visible focus ring; it is an accessibility requirement.
- Use skeleton loaders shaped like the content, not generic spinners.
- Design loading, empty and error states.
- Use inline errors, never `window.alert()`.
- Remove dead `#` links or disable them visibly.
- Mark the current page in navigation.
- Icon-only controls keep an accessible name and a real target.
- Smooth anchor scrolling.
- Animate transform and opacity only.

### Content

- Use realistic, diverse names and believable brands.
- Avoid fake round metrics; use organic data.
- Remove AI copy clichés: elevate, seamless, unleash, next-gen, game-changer,
  delve, tapestry.
- No exclamation marks in success messages and no "Oops" errors.
- Use active voice.
- No Lorem Ipsum. No identical dates or repeated avatars.
- Title Case On Every Header is a tell; use sentence case.

### Components

- A card needs only one of border, shadow or background separation.
- Do not always pair one filled and one ghost button. Add text links and tertiary
  styles.
- Avoid pill "New"/"Beta" badges, accordion FAQ blocks and 3-card testimonial
  carousels unless the content truly calls for them.
- Prefer inline editing, slide-overs and expandable sections over modals for simple
  actions.
- Prefer squircle avatars when a circular set would be generic.
- Do not make the theme switch a sun/moon toggle if settings can own it.
- Simplify footers.

### Icons and code

- No single default icon library everywhere. Choose a set with the right weight and
  keep one stroke width.
- Replace cliché metaphors (rocket for launch, shield for security).
- Include a branded favicon.
- Use semantic HTML, not div soup.
- Keep collapsed navigation operable and exposed to assistive technology.
- Move inline styles into the styling system.
- Use relative units, not hardcoded pixel widths.
- Add meaningful alt text.
- Establish a z-index scale.
- Remove commented-out code and debug artifacts.
- Verify every import exists.
- Add title, description, Open Graph and social metadata.
- Add legal links, back navigation, a custom 404, form validation, a skip link and
  cookie consent where required.

## Upgrade techniques

- **Type:** variable font animation, outline-to-fill, text-mask reveals.
- **Layout:** broken grids, aggressive negative space, parallax card stacks,
  split-screen scroll.
- **Motion:** smooth inertia, staggered entry, spring physics, scroll-driven
  reveals.
- **Surface:** true glass with an inner border, spotlight borders, grain, tinted
  shadows.

## Fix priority

1. Font swap.
2. Palette cleanup.
3. Hover and active states.
4. Layout and spacing.
5. Replace generic components.
6. Loading, empty and error states.
7. Final type scale and spacing polish.

## Rules

Work with the existing stack. Never break functionality. Check dependencies before
importing anything. Test after every change. Keep changes reviewable; prefer small
targeted improvements over big rewrites.
