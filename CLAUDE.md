# ziflux
SWR caching layer for Angular's `resource()` API. Zero dependencies. Signal-native.

## Tech Stack
- Angular 21+ library (ng-packagr, Vitest)
- pnpm, Lefthook
- `docs/` — Landing/docs site: Next.js 16, React 19, Tailwind 4, shadcn/ui

## Commands
- `pnpm build` - Build library via ng-packagr
- `pnpm test` - Vitest (no watch)
- `pnpm typecheck` - `tsc --noEmit` against lib tsconfig
- `cd docs && pnpm dev` - Docs dev server

## Important Files
- `decision.md` - Chronological decision log (append-only, not current state). Add a new `D-XX` entry for every architectural or API decision.

## Rules
- **NEVER** add patterns foreign to Angular — the API must feel like `resource()` extended, zero learning curve
- **NEVER** use Subjects, BehaviorSubjects, or Observables for state — Signals only. `firstValueFrom()` to bridge Observable → Promise in loaders
- **NEVER** use `any` or `as unknown as`
- Private class fields use `#` prefix
- Cache lives in API services (`providedIn: 'root'`), not in route-scoped stores
- `invalidate()` marks stale, never deletes entries
- This is a cache layer, not a state manager — Angular signals + `resource()` IS the state layer
