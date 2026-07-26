---
objective: "The ziflux site serves two jobs on two routes with two registers: `/` is brand and lets a developer decide in 60 seconds, `/docs` is product and carries the reference, on the existing Next.js stack and with a typography and colour identity that is chosen rather than inherited."
status: implemented
---

# Plan: Split the landing page from the documentation

## Overview

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| **Goal**   | Separate the 60-second evaluation from the reference, and give the site a point of view |
| **Source** | User request 2026-07-25, then the confirmed `/impeccable shape` design brief  |

The site is one page of 20 456 px across 12 sections, 33 code blocks and 25 viewports.
`PRODUCT.md` states a developer evaluates in roughly 60 seconds. Only about 4 viewports
serve that; the other 21 are reference a visitor meets before deciding. Beyond the
structural problem, the page passes every technical bar while having no visual point of
view: Geist is Vercel's own typeface on a site whose `PRODUCT.md` lists "Vercel-template
clones" as an anti-reference, the accent is Tailwind `orange-500` untouched, and twelve
sections share one width and one rhythm.

## Phases

| #   | Phase                    | File                         |
| --- | ------------------------ | ---------------------------- |
| 1   | Route split              | [`phase-1.md`](./phase-1.md) |
| 2   | Landing recomposition    | [`phase-2.md`](./phase-2.md) |
| 3   | Docs navigation, product | [`phase-3.md`](./phase-3.md) |
| 4   | Typography and colour    | [`phase-4.md`](./phase-4.md) |

Phases 1 to 3 are structural and independent. Phase 4 is identity and runs last on
purpose: it touches every surface, so it lands once the surfaces have stopped moving.

## Resources

| Source                                                                                       | Verified                                                                                                    |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [pagefind.app/docs](https://pagefind.app/docs/)                                               | Generator-agnostic, indexes built HTML after the build, no server component. Works on `output: "export"`.       |
| [starlight.astro.build/getting-started](https://starlight.astro.build/getting-started/)       | Self-describes as "beta software". Ships Pagefind, sidebar, i18n, TOC.                                        |
| [starlight.astro.build/guides/components](https://starlight.astro.build/guides/components/)   | React islands work in MDX, so the demo would port if a migration ever happens.                                 |
| [starlight.astro.build/guides/site-search](https://starlight.astro.build/guides/site-search/) | Pagefind is the zero-config default search.                                                                   |
| `npm view @astrojs/starlight version`                                                          | `0.41.4`, published 2026-07-22. Still 0.x.                                                                    |
| `fonts.googleapis.com/css2` probe                                                              | Archivo and Sometype Mono are both available on Google Fonts, so `next/font/google` can serve them self-hosted. |

## Decisions

| Decision                                                       | Why                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep Next.js 16 + React 19 + Tailwind 4; do not adopt Starlight | Pagefind, the main reason to migrate, is generator-agnostic and runs on the current static export. Starlight is 0.x with its own CSS variable system, which would mean redoing the OKLCH token layer. Trades ~1750 lines of TSX→MDX conversion and a 400-line demo port against 374 lines of reimplementation removed. Reopen if docs exceed ~5 distinct pages or need per-version docs. |
| `/` is brand register, `/docs` is product register              | They serve opposite states of mind: deciding versus finding. `/docs` takes product conventions (fixed rem scale, higher density, sidebar, secondary neutral layer for rails) while sharing the token layer, so it reads as the same site doing a different job.       |
| `/docs` is a single long page, not a page tree                  | Three public APIs do not justify a router. A sticky sidebar over one page gives the same navigation at a fraction of the complexity, and keeps every existing `#anchor` valid.                                                                                |
| Install on `/`, the four-step walkthrough in `/docs`            | Quickstart is 2271 px and 5 code blocks. The install command and the hero snippet are enough to judge integration cost; the walkthrough is reference material a visitor reads after deciding.                                                                 |
| Geist → Archivo, Geist Mono → Sometype Mono                     | Geist is Vercel's own typeface on a site that names Vercel clones as an anti-reference, and Geist Mono shares its skeleton, which is the "similar but not identical" pairing to avoid. Archivo is one family with enough weight and width range to carry display and UI alone; Sometype Mono contrasts rather than matches. |
| Recompose the accent instead of shipping Tailwind `orange-500`  | `#f97316` is `orange-500` verbatim. A composed orange, redder and more saturated, matches the datasheet anchor and the existing STALE/EVICTED semantics. Accepted cost: the logo, `og.png` and `og.svg` carry the current orange and must be regenerated in the same phase, or page and share card diverge. |
| Defer full-text search                                          | Search earns its place once `/docs` is multi-page. On one page, the sidebar plus browser find covers it. Pagefind stays available as a post-build step whenever that changes.                                                                                 |
