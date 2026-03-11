# ziflux — Project Context

## What this project is

An Angular 21+ library that adds stale-while-revalidate (SWR) caching semantics to Angular's `resource()` API.
Zero dependencies. Signal-native. Idiomatic Angular.

## What it is NOT

Not a state manager. Not a store abstraction. Not a TanStack port.
Angular signals + `resource()` IS the state layer. This library is the cache layer that sits beneath it.

## Library scope

Seven public exports:

- `DataCache<T>` — plain class, owns freshness tracking + dedup + invalidation
- `cachedResource<T, P>()` — `resource()` extended with cache awareness
- `cachedMutation<A, R, C>()` — mutation lifecycle with signals (status, error, data, cache invalidation)
- `injectCachedHttp(cache)` — HttpClient wrapper that auto-populates cache on GET
- `provideZiflux(config?)` — global staleTime / gcTime defaults
- `anyLoading(...signals)` — aggregate loading state from any `Signal<boolean>`

## Key architectural decisions

See `decision.md` for the full log. Short version:

- Cache lives in API services (`providedIn: 'root'`), not in route-scoped stores
- `DataCache.version` is a `Signal<number>` — auto-increments on `invalidate()`
- `cachedResource()` wraps Angular's `resource()` (maps `params`/`loader`)
- `cachedMutation()` wraps any mutation fn with signal-based lifecycle + auto cache invalidation
- Seeding/SWR during loading is handled internally via `linkedSignal` + `computed`
- Optimistic updates via `cachedMutation`'s `onMutate`/`onError` callbacks or Angular's native `resource.set()` / `resource.update()`
- `invalidate()` marks stale, never deletes entries
- `injectCachedHttp()` provides a typed HTTP client that auto-populates cache on GET responses

## Conventions

- TypeScript strict mode
- Angular private class fields with `#` prefix
- No `any`, no `as unknown as`
- Signals for all state — no Subjects, no BehaviorSubjects
- `firstValueFrom()` to bridge Observable → Promise inside loaders

## File structure

```
projects/ziflux/src/
  lib/
    types.ts               # All interfaces & types
    data-cache.ts           # DataCache<T> class
    cached-resource.ts      # cachedResource() function
    cached-mutation.ts      # cachedMutation() function
    inject-cached-http.ts   # injectCachedHttp() factory
    provide-ziflux.ts       # provideZiflux() + ZIFLUX_CONFIG token
    any-loading.ts          # anyLoading() utility
    index.ts                # public API barrel
  public-api.ts
```

## Target users

Senior Angular developers who know `resource()`, signals, and injectable services.
The library should feel like Angular extended — not a new framework to learn.
