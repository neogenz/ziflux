# ziflux documentation

Astro hosts the custom landing page at `/`. Starlight renders the documentation
tree under `/docs`.

## Local development

```bash
pnpm install
pnpm dev
```

Astro serves the site at [http://localhost:4321](http://localhost:4321).

## Validation and production build

```bash
pnpm check
pnpm build
pnpm start
```

The static production output is written to `dist/`. No server adapter is required.

## Content

```text
src/
├── content/docs/docs/   # Starlight MDX pages
├── pages/index.astro    # custom landing page
├── components/landing/ # interactive React islands
└── styles/              # separate landing and Starlight themes
```

Edit documentation in `src/content/docs/docs/*.mdx`. Frontmatter owns page titles
and descriptions; Markdown headings own the table of contents and search anchors.
`astro.config.mjs` owns the ordered sidebar.

The production build also emits `llms.txt`, `llms-full.txt`, and cleaned Markdown
copies for documentation tools.
