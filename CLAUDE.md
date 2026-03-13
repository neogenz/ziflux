# ziflux

**Angular library** — SWR caching layer for `resource()`. Zero dependencies. Signal-native.

This is a library, not an application. Every line of code ships to other developers' bundles.

## Philosophy

Angular already IS the state manager: signals, `resource()`, injectable services.
ziflux fills the one gap Angular left open — **the data lifecycle** (fresh → stale → expired). That's it.

- **Unopinionated** — No new patterns. No new mental models. If you know `resource()`, you know `cachedResource()`. If you know `signal()`, you already know how to read ziflux state.
- **Idiomatic Angular** — Signals, `inject()`, `providedIn: 'root'`, `DestroyRef`, feature functions. Same naming conventions, same architecture patterns the Angular team documents.
- **Crystal clear DX** — A junior and a 10-year veteran should both understand the API in minutes. Zero learning curve. No magic. No ceremony.
- **Not NgRx. Not TanStack Query.** — Those are powerful but complex. ziflux is deliberately simpler: fewer concepts, less API surface, more clarity.

Every API decision is filtered through one question: *"Would an Angular developer guess this API without reading docs?"*

## Tech Stack
- Angular 21+ library (ng-packagr, Vitest)
- pnpm, Lefthook
- `docs/` — Landing/docs site: Next.js 16, React 19, Tailwind 4, shadcn/ui

## Commands
- `pnpm build` — Build library via ng-packagr
- `pnpm test` — Vitest (no watch)
- `pnpm typecheck` — `tsc --noEmit` against lib tsconfig
- `cd docs && pnpm dev` — Docs dev server

## Important Files
- `decision.md` — Chronological decision log (append-only, not current state). Add a new `D-XX` entry for every architectural or API decision.

## Rules
- **NEVER** add patterns foreign to Angular — the API must feel like `resource()` extended, zero learning curve
- **NEVER** wrap or abstract an existing Angular API — if Angular has it (`set()`, `update()`, `inject()`), use it directly
- **NEVER** use Subjects, BehaviorSubjects, or Observables for state — Signals only. `firstValueFrom()` to bridge Observable → Promise in loaders
- **NEVER** use `any` or `as unknown as`
- **NEVER** add an export without weighing the learning curve it introduces — every export is a concept to learn
- Private class fields use `#` prefix
- Cache lives in API services (`providedIn: 'root'`), not in route-scoped stores
- `invalidate()` marks stale, never deletes entries
- This is a cache layer, not a state manager — Angular signals + `resource()` IS the state layer
