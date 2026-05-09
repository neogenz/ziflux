# Product

## Register

brand

## Users

Angular developers (junior to senior) building real-world SPAs. Already know `signal()`, `computed()`, `inject()`, and likely `resource()` (Angular 21+). They have felt the pain of spinner-on-every-tab navigations. They have evaluated TanStack Query and NgRx and either rejected the complexity or are shopping for something simpler. They land on this page from search ("angular cache resource", "swr angular"), Hacker News, X/Bluesky, GitHub Discover, or a colleague's recommendation. They evaluate in roughly 60 seconds: "is this for me, or is this another over-engineered library?"

## Product Purpose

ziflux is a small SWR caching layer for Angular's `resource()`. It does one thing: cache HTTP-backed signal data with `staleTime` / `expireTime` semantics, deduped requests, optimistic updates, and prefix-based invalidation. Zero dependencies. Signal-native. About 2KB. The landing page exists so an Angular developer can evaluate the library — its scope, its fit, and its philosophy — in under 60 seconds. Success means the developer either installs and tries, or definitively decides "not for me." Both outcomes beat ambiguity.

## Brand Personality

Voice: terse, technical, opinionated. Tone: peer engineer, not salesperson. Three words: focused, honest, confident. Emotional goals: relief ("finally, a small library that does the obvious thing"), trust ("they are not hiding the limitations"), respect ("they assume I know Angular").

## Anti-references

- TanStack Query landing — too many features, too much marketing copy, framework-agnostic flexing.
- NgRx docs — institutional, dense, intimidating.
- Generic SaaS landings — Vercel-template clones, gradient hero on dark background, "blazing fast", "developer-first".
- Anything that says "the future of state management" or "reimagining data fetching".
- Hero-metric template: big number, small label, supporting stats, gradient accent.
- Bouncy testimonial carousels.
- Animation that distracts from technical content.

## Design Principles

1. Show the pain before the solution. Visceral problem statements beat marketing copy.
2. Code is the demo. Real production-shaped snippets, not abstract diagrams.
3. Brutal honesty about scope. State what this is NOT, where it doesn't fit, what it skips on purpose.
4. Respect the reader's time. Every section earns its place. No fluff, no restated headings.
5. Differentiate via focus, not feature count. "Caches `resource()`. Nothing else." beats "47 advanced features."

## Accessibility & Inclusion

WCAG 2.1 AA. Keyboard-navigable navbar. Focus-visible rings on all interactive elements. Sufficient color contrast in both light and dark themes. Semantic HTML hierarchy (h1 → h2 → h3). Code blocks readable, copy buttons keyboard-operable. Theme toggle respects `prefers-color-scheme`. No decorative motion that ignores `prefers-reduced-motion`.
