# ziflux — Project Context

## What this project is

An Angular 21+ library that adds stale-while-revalidate (SWR) caching semantics to Angular's `resource()` API.
Zero dependencies. Signal-native. Idiomatic Angular.

## What it is NOT

Not a state manager. Not a store abstraction. Not a TanStack port.
Angular signals + `resource()` IS the state layer. This library is the cache layer that sits beneath it.

## Library scope

Four public exports:

- `DataCache<T>` — plain class, owns freshness tracking + dedup + invalidation
- `cachedResource<T, P>()` — `resource()` extended with cache awareness
- `injectCachedHttp(cache)` — HttpClient wrapper that auto-populates cache on GET
- `provideZiflux(config?)` — global staleTime / gcTime defaults

## Key architectural decisions

See `decision.md` for the full log. Short version:

- Cache lives in API services (`providedIn: 'root'`), not in route-scoped stores
- `DataCache.version` is a `Signal<number>` — auto-increments on `invalidate()`
- `cachedResource()` wraps Angular's `resource()` (maps `params`/`loader`)
- Seeding/SWR during loading is handled internally via `linkedSignal` + `computed`
- Optimistic updates use Angular's native `resource.set()` / `resource.update()` — no new API
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
    types.ts               # CachedResourceRef<T>, CacheEntry<T>, ZifluxConfig, CachedHttpClient<T>
    data-cache.ts           # DataCache<T> class
    cached-resource.ts      # cachedResource() function
    inject-cached-http.ts   # injectCachedHttp() factory
    provide-ziflux.ts       # provideZiflux() + ZIFLUX_CONFIG token
    index.ts                # public API barrel
  public-api.ts
```

## Target users

Senior Angular developers who know `resource()`, signals, and injectable services.
The library should feel like Angular extended — not a new framework to learn.
