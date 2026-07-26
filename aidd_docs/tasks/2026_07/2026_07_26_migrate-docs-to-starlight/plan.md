---
objective: "The ziflux website is one statically exported Astro application whose custom landing remains at `/` and whose multi-page documentation is authored and served by Starlight under `/docs`."
status: in-progress
---

# Plan: Migrate the documentation to Starlight

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Replace the custom Next.js documentation shell with native Starlight pages without regressing the landing, content, branding, or static deployment |
| **Source** | User request in this task on 2026-07-26 |

The current `docs/` application uses Next.js for two static routes. Its documentation
route reimplements Starlight concerns locally: sidebar, table of contents, heading
observation, code highlighting, theme handling, and Markdown page actions. The migration
makes the reference content the source of the navigation instead of keeping those
concerns in React.

## Phases

| #   | Phase                         | File                         |
| --- | ----------------------------- | ---------------------------- |
| 1   | Astro and Starlight foundation | [`phase-1.md`](./phase-1.md) |
| 2   | Native documentation content   | [`phase-2.md`](./phase-2.md) |
| 3   | Brand parity and legacy removal | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| [Starlight manual setup](https://starlight.astro.build/manual-setup/) | Starlight is added to an Astro project through the integration plus a `docsLoader()` and `docsSchema()` content collection. |
| [Starlight pages guide](https://starlight.astro.build/guides/pages/) | Markdown and MDX files generate documentation routes while custom Astro pages can coexist in the same application. |
| [Starlight customization guide](https://starlight.astro.build/guides/customization/) | The default shell, table of contents, fonts, custom CSS, and component overrides are public customization surfaces. |
| [Starlight plugins catalog](https://starlight.astro.build/resources/plugins/) | `starlight-page-context-action` is listed for copy/view-as-Markdown actions; Pagefind remains the default search provider. |
| [starlight-page-context-action](https://github.com/babblebey/starlight-page-context-action) | The plugin supports Astro 5+ and Starlight 0.36+, mobile actions, copy, view Markdown, and generated LLM text files. |
| [Astro Vercel deployment](https://docs.astro.build/en/guides/deploy/vercel/) | A static Astro site deploys to Vercel without a server adapter. |
| [Tailwind CSS with Astro](https://tailwindcss.com/docs/installation/framework-guides/astro) | Tailwind CSS 4 uses `@tailwindcss/vite` in Astro; the former PostCSS configuration must be removed. |

## Decisions

| Decision | Why |
| -------- | --- |
| Run the landing and documentation in one Astro application | Two applications would duplicate deployment, theme, metadata, and dependency ownership. Astro custom pages and Starlight content routes coexist natively. |
| Author the reference as a multi-page MDX tree | Navigation, search, per-page table of contents, editability, and future growth are the reasons to adopt Starlight; wrapping the existing long React page would keep the old maintenance problem. |
| Keep React only for existing interactive landing islands and bespoke visuals | Rewriting working demonstrations in another UI model adds risk without improving the documentation architecture. Static content moves to MDX; interactivity hydrates only where required. |
| Preserve `/docs` and expose legacy section anchors on its overview | Existing links cannot redirect fragments server-side. An overview carrying the old section IDs keeps those URLs meaningful while linking to the new pages. |
| Pin the beta stack in the lockfile and use public extension points only | Starlight documents itself as beta and remains pre-1.0. Exact resolved versions and minimal overrides constrain upgrade churn. |
