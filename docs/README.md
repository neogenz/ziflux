# ziflux docs

Documentation site for [ziflux](https://ziflux.dev) — built with Next.js 16, React 19, and Tailwind 4.

## Getting Started

```bash
cd docs
pnpm install
pnpm dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build    # Production build
pnpm start    # Serve locally
```

## Structure

```
docs/src/
├── app/
│   ├── layout.tsx       # Root layout, fonts, theme provider
│   └── page.tsx         # Landing page — assembles all sections
└── components/landing/
    ├── hero.tsx          # Headline, install, interactive demo
    ├── quickstart.tsx    # 4-step setup guide
    ├── guide.tsx         # Architecture, domain pattern, usage walkthrough
    ├── testing.tsx       # Store + DataCache testing examples
    ├── freshness.tsx     # Cache lifecycle, cache keys, when to cache
    ├── advanced-usage.tsx # Factory pattern alternative
    ├── api-reference.tsx # Tabbed API docs for all exports
    ├── gotchas.tsx       # Common pitfalls
    ├── prior-art.tsx     # Comparison + install CTA
    └── navbar.tsx        # Sticky nav with theme toggle
```

All content is in a single landing page — no routing, no separate pages.

## Editing Content

Each section is a self-contained React component. Code examples are defined as template literal constants at the top of each file. To update a code example, edit the constant — the component renders it via `<CodeBlock>`.
