import { NodeHtmlMarkdown } from "node-html-markdown"

let cached: string | null = null

const PHASE_DIAGRAM = `| Phase | Behavior | Transition |
|-------|----------|------------|
| **FRESH** | Return cached data, no network request | \`staleTime\` elapsed → data may be outdated |
| **STALE** | Return cached + re-fetch in background | \`expireTime\` elapsed → entry evicted |
| **EVICTED** | Fetch from server, cache entry removed | Data written to cache → FRESH |`

const CACHE_KEY_TREE = `\`\`\`
['order']                          ← invalidate here, everything below becomes stale
  ├── ['order', 'list']            → all orders page
  ├── ['order', 'list', 'pending'] → filtered view
  └── ['order', 'details', '42']   → detail page
\`\`\``

const DOMAIN_PATTERN = `| # | File | Role | Scope |
|---|------|------|-------|
| 1 | \`order.api.ts\` | HTTP + cache | singleton |
| 2 | \`order-list.store.ts\` | cachedResource + mutations | route-scoped |
| 3 | \`order-list.component.ts\` | inject(Store), read signals | view scope |`

export function pageToMarkdown(): string {
  if (cached) return cached

  const main = document.querySelector("#main")
  if (!main) return ""

  const clone = main.cloneNode(true) as HTMLElement

  // Strip buttons (copy buttons, replay buttons, etc.)
  for (const el of clone.querySelectorAll("button")) {
    el.remove()
  }

  // Strip interactive demos (NavigationDemo — aria-hidden visual-only)
  for (const el of clone.querySelectorAll('[aria-hidden="true"]')) {
    el.remove()
  }

  // Strip visual-only elements (diagrams, phase bars, trees)
  for (const el of clone.querySelectorAll("[data-md-visual]")) {
    el.remove()
  }

  // Strip all inline SVGs (arrows, decorative icons)
  for (const el of clone.querySelectorAll("svg")) {
    el.remove()
  }

  // Strip gotcha warning icons (the "!" badges)
  for (const el of clone.querySelectorAll(".rounded-full")) {
    if (el.textContent?.trim() === "!") el.remove()
  }

  const md = NodeHtmlMarkdown.translate(clone.innerHTML, {
    codeBlockStyle: "fenced",
    bulletMarker: "-",
  })

  cached = md
    // Clean anchor link artifacts: [Quick Start #](#quickstart) → [Quick Start](#quickstart)
    .replace(/\[([^\]]+?)\s+#\]/g, "[$1]")
    // Remove orphaned ### Architecture heading (diagram was stripped)
    .replace(/### Architecture\n+(?=### )/g, "")
    // Remove unnecessary backslash escapes (outside code blocks)
    .replace(/\\~/g, "~")
    // Inject domain pattern table after "A recommended structure for most features:"
    .replace(
      /(A recommended structure for most features:)\n*/,
      `$1\n\n${DOMAIN_PATTERN}\n\n`,
    )
    // Inject phase diagram table
    .replace(
      /(marks entries stale\s*[—–-]\s*it never deletes them\.)\n*/,
      `$1\n\n${PHASE_DIAGRAM}\n\n`,
    )
    // Inject cache key tree
    .replace(
      /(Cache keys make this one line:)\n*/,
      `$1\n\n${CACHE_KEY_TREE}\n\n`,
    )
    // Clean escaped dots in numbered headings: 1\. → 1.
    .replace(/(\d+)\\\./g, "$1.")
    // Clean trailing backslash on links: ](url)\ → ](url)
    .replace(/\]\(([^)]+)\)\\/g, "]($1)")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return cached
}
