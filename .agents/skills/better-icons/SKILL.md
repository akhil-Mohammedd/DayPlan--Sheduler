---
name: better-icons
description: Use when working with icons. Search and retrieve SVGs from 200+ icon libraries through Iconify with the better-icons CLI.
---

# Better icons

Search and retrieve icons from Iconify's library set when a project needs a new
icon or a consistent replacement set.

## Installation

Prefer a project-local or global install only when the user approves adding the
tool:

```bash
npm install -g better-icons
```

Run without installing:

```bash
npx better-icons search arrow --limit 10
npx better-icons get ph:house > icon.svg
```

For this repository, icons in production UI use `@phosphor-icons/react`. Do not
add a second icon package without checking `package.json` and the design system.

## CLI

```bash
# Search across libraries
better-icons search <query> [--prefix <prefix>] [--limit <n>] [--json]

# Download results as SVG files
better-icons search <query> -d [dir] [--color <color>] [--size <px>]

# Get one SVG
better-icons get <icon-id> [--color <color>] [--size <px>] [--json]

# Configure an MCP server
better-icons setup [-a cursor,claude-code] [-s global|project]
```

Icon ids use `prefix:name`, for example `ph:house`, `lucide:home`,
`heroicons:check`. Popular collections: `ph`, `lucide`, `mdi`, `heroicons`,
`tabler`, `ri`, `solar`, `iconamoon`.

## Using icons well

- Standardise one stroke or fill weight across the interface.
- Prefer outline icons at small sizes and filled icons only for active states.
- Every icon-only button needs an accessible name.
- Decorative icons are hidden from assistive technology.
- Do not use emoji as icons.
- Keep icon sizes on the spacing scale: 14, 16, 18, 20, 24.
- Match the project's visual language, not the library's default personality.
- Before importing a new icon library, check whether the project already has one.
