export interface DocsHeading {
  id: string
  label: string
}

export interface DocsSection {
  id: string
  label: string
  headings: readonly DocsHeading[]
}

export const DOCS_SECTIONS = [
  {
    id: "quickstart",
    label: "Quick start",
    headings: [
      { id: "quickstart-install", label: "Install & configure" },
      { id: "quickstart-cache", label: "Add a cache" },
      { id: "quickstart-resource", label: "Use cachedResource()" },
      { id: "quickstart-template", label: "Template" },
    ],
  },
  {
    id: "guide",
    label: "Guide",
    headings: [
      { id: "domain-pattern", label: "Domain pattern" },
      { id: "usage", label: "Recipes" },
    ],
  },
  {
    id: "freshness",
    label: "Caching",
    headings: [
      { id: "loading-states", label: "What the user sees" },
      { id: "cache-keys", label: "Cache keys" },
      { id: "when-to-cache", label: "When to cache" },
    ],
  },
  {
    id: "scenarios",
    label: "Use cases",
    headings: [
      { id: "admin-tabs", label: "Admin dashboard with tabs" },
      { id: "ecom-list-detail", label: "E-commerce list → detail → back" },
      { id: "dependent-form", label: "Multi-step form with dependent data" },
    ],
  },
  {
    id: "advanced-usage",
    label: "Patterns",
    headings: [
      { id: "factory-pattern", label: "Factory pattern" },
      { id: "when-to-use-which", label: "When to use which" },
    ],
  },
  {
    id: "testing",
    label: "Testing",
    headings: [
      { id: "testing-store", label: "Testing a store" },
      { id: "testing-data-cache", label: "Testing a standalone DataCache" },
    ],
  },
  { id: "api", label: "API", headings: [] },
  {
    id: "gotchas",
    label: "Gotchas",
    headings: [
      { id: "invalidate-empty", label: "invalidate([]) is a no-op" },
      {
        id: "invalidate-prefix",
        label: "invalidate() is prefix-based, not exact-match",
      },
      {
        id: "set-update-cache",
        label: "ref.set() / ref.update() write to the cache",
      },
      {
        id: "untyped-keys",
        label: "Cache keys are untyped at the boundary",
      },
    ],
  },
] as const satisfies readonly DocsSection[]

export const DOCS_SECTION_IDS = DOCS_SECTIONS.map(({ id }) => id)
export const DOCS_HEADING_IDS = DOCS_SECTIONS.flatMap(({ headings }) =>
  headings.map(({ id }) => id),
)
