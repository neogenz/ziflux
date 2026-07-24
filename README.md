# ziflux

[![npm version](https://img.shields.io/npm/v/ngx-ziflux)](https://www.npmjs.com/package/ngx-ziflux)
[![license](https://img.shields.io/npm/l/ngx-ziflux)](https://github.com/neogenz/ziflux/blob/main/LICENSE)
[![Angular](https://img.shields.io/badge/Angular-22+-dd0031)](https://angular.dev)
[![CI](https://github.com/neogenz/ziflux/actions/workflows/ci.yml/badge.svg)](https://github.com/neogenz/ziflux/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/badge/library-6.2_kB_brotli-blue)](https://github.com/neogenz/ziflux/blob/main/.size-limit.json)

A caching layer for Angular's `resource()`, plus the mutation half that `resource()`
deliberately leaves out. No runtime dependencies, signals throughout, Angular 22+.

`resource()` owns the fetch lifecycle. ziflux owns the data lifecycle: when a value
goes stale, when to refetch it, when to drop it, and what invalidates it after a write.
`resource()` is read-only by design, so `cachedMutation` is not a convenience wrapper
here. It covers a gap the framework acknowledges.

**[Documentation](https://ziflux.dev)** · [npm](https://www.npmjs.com/package/ngx-ziflux) · [GitHub](https://github.com/neogenz/ziflux)

---

## Why not TanStack Query?

It's the right question, and for a lot of teams TanStack is the right answer. Three
reasons you might still pick this one.

Its Angular adapter has shipped as `@tanstack/angular-query-experimental` for about two
and a half years, and its README states that breaking changes may happen in minor and
patch releases. ziflux builds only on stable Angular APIs and declares a single peer
range.

There is no second mental model. A query client, query keys and query options are a
parallel system that sits next to Angular's. `cachedResource()` is `resource()` with a
cache attached, and you read its state with signals you already know.

It's small enough to read. 6.2 kB brotli, one afternoon to understand the whole thing.

The honest hedge, since it cuts the other way too: Angular's `resource()` ships no
caching options at all (`params`, `loader`, `defaultValue`, `equal`, `injector`, `id`),
which is why this library exists. If Angular ever adds a native freshness model,
migrating off ziflux means deleting a thin wrapper and keeping your `resource()` calls.
Migrating off a library built on query keys means a rewrite. That asymmetry is the most
defensible thing ziflux has.

---

## Install

```bash
npm install ngx-ziflux
```

```typescript
import { provideZiflux, withDevtools } from 'ngx-ziflux'

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideZiflux({ staleTime: 30_000, expireTime: 300_000 }, withDevtools())],
}
```

```typescript
import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { DataCache, cachedResource } from 'ngx-ziflux'

// todo.api.ts, a singleton that owns the cache
@Injectable({ providedIn: 'root' })
export class TodoApi {
  readonly cache = new DataCache()
  readonly #http = inject(HttpClient)
  getAll$() { return this.#http.get<Todo[]>('/todos') }
}

// todo-list.store.ts, route-scoped, reads the cache
@Injectable()
export class TodoListStore {
  readonly #api = inject(TodoApi)

  readonly todos = cachedResource({
    cache: this.#api.cache,
    cacheKey: ['todos'],
    loader: () => this.#api.getAll$(),
  })
}
```

All `DataCache` instances inherit defaults from `provideZiflux()`. `new DataCache()` and
`cachedResource()` must run inside an Angular injection context, so a field initializer,
a constructor, or `runInInjectionContext()`. Devtools are active in dev mode only.

See the [example app](https://github.com/neogenz/ziflux/tree/main/projects/example) for a
working Todo demo with mutations, optimistic updates, polling and devtools.

---

## What you actually have to learn

If you know `resource()` and signals, most of this is already familiar. Two ideas are new.

The first is a cache entry with a freshness cycle. An entry is fresh, then stale, then
expired, and `staleTime` and `expireTime` decide when it moves. Fresh entries are served
without a request. Stale entries are served immediately while a refresh runs behind them.
Expired entries are gone and the next read fetches.

The second is a mutation that invalidates. `cachedMutation` runs your write, then marks
the keys you name as stale, which is what makes every resource reading those keys refresh.

That is the whole model. The rest of the API is `resource()` with the same names it
already uses.

---

## Architecture

Component, then Store, then API service, then DataCache, then the server.

Components own the view. Stores own route state. API services are root singletons and own
the cache. Signals flow back from the store to the component, and the cache stays
invisible to the store.

See the [architecture guide](https://ziflux.dev#guide) for the full pattern.

---

## How it compares

| | ziflux | TanStack Query | NgRx |
| --- | --- | --- | --- |
| Mental model | `resource()` + cache | Query client | Actions, reducers, effects |
| Angular signals | Native | Angular adapter (`@tanstack/angular-query-experimental`) | Native (`@ngrx/signals` SignalStore) |
| Runtime dependencies | 0 (peers: `@angular/core`, `@angular/common`, `rxjs`) | TanStack core + Angular adapter | multiple `@ngrx/*` packages |
| Bundle size | 6.9 kB gzip, 6.2 kB brotli | ~13 kB gzip | varies by packages used |
| API surface | 9 runtime + 13 type exports | broader | broader |
| Best for | SWR on `resource()` | A full data-fetching layer | Complex state and effects |

Sizes measured on 2026-07-24 from the same build. ziflux is measured by
[`size-limit`](https://github.com/neogenz/ziflux/blob/main/.size-limit.json), which
enforces a 6.4 kB brotli ceiling on every CI run. That figure is an upper bound: it runs
esbuild without the Angular CLI's optimizer, so it still counts the devtools component
that a real Angular build removes when you don't import it. TanStack's number comes from
[Bundlephobia](https://bundlephobia.com/package/@tanstack/angular-query-experimental@5.101.4),
which reports 13,180 B min+gzip for `@tanstack/angular-query-experimental@5.101.4`
including its `@tanstack/query-core` dependency. Both figures exclude framework peers.

Pick TanStack Query when you need pagination, infinite queries, persistence and
cross-framework devtools. Pick NgRx when you need time-travel debugging, entity adapters
and complex side-effect orchestration. Pick ziflux when what you actually wanted was
caching on top of `resource()`.

---

## API at a glance

| Export | Description |
| --- | --- |
| `DataCache` | Per-domain cache instance. Owns entries, invalidation and dedup |
| `cachedResource()` | `resource()` plus SWR cache awareness. Returns `CachedResourceRef<T>` |
| `cachedMutation()` | Mutation lifecycle: status signals, optimistic updates, auto-invalidation |
| `provideZiflux()` | Global config for `staleTime`, `expireTime`, `maxEntries`, `cleanupInterval` |
| `withDevtools()` | Cache inspector and structured console logging, dev mode only |
| `anyLoading()` | Aggregate `Signal<boolean>` from several loading or pending signals |
| `ZIFLUX_CONFIG` | Injection token for the resolved config |
| `CacheRegistry` | Tracks every `DataCache` instance. Used internally by devtools |
| `ZifluxDevtoolsComponent` | Standalone component that renders the cache inspector overlay |

Full signatures and examples are in the [API reference](https://ziflux.dev#api).

---

## Freshness model

Entries move through fresh, then stale, then expired. `staleTime` and `expireTime` control
the transitions.

- Fresh: returned from cache, no fetch.
- Stale: returned immediately, with a background fetch.
- Expired: treated as a miss, full fetch.

`invalidate()` marks entries stale and never deletes them, so users keep seeing data while
the fresh copy loads.

See the [freshness guide](https://ziflux.dev#freshness) for TTL configuration.

---

## Cache keys

Hierarchical arrays, serialized with `JSON.stringify`, invalidated by prefix.

```typescript
['order', 'list', 'pending']  // filtered list
['order', 'details', '42']    // single entity
['order']                     // invalidate(['order']) matches both above
```

---

## Revalidation

Beyond the freshness cycle, a resource can refresh on its own.

```typescript
cachedResource({
  cache: this.#api.cache,
  cacheKey: ['todos'],
  loader: () => this.#api.getAll$(),
  refetchInterval: 30_000,     // poll
  refetchOnWindowFocus: true,  // revalidate when the tab comes back
  refetchOnReconnect: true,    // revalidate when the network returns
})
```

Focus and reconnect are off by default and browser-only. Both respect `staleTime`, so
coming back to a tab whose entry is still fresh costs no request. Polling ignores
`staleTime` on purpose, because a configured interval should mean what it says.

---

## Server rendering

Rendering on the server is safe. The cleanup sweep, polling and the focus and reconnect
listeners are all browser-only, so nothing keeps a server render from stabilizing.

Pass `id` to reuse the server-rendered value on the client through `TransferState`,
instead of refetching during hydration:

```typescript
cachedResource({ cache, cacheKey: ['todos'], id: 'todos', loader: () => this.#api.getAll$() })
```

The transferred value populates the resource rather than the `DataCache`, so a later
navigation back to the same key still fetches once to fill the cache.

---

## Gotchas

- `invalidate([])` does nothing. An empty prefix matches no key. Use `cache.clear()` to wipe everything.
- `invalidate()` matches by prefix, not exact key. `invalidate(['order', 'details', '42'])` also matches `['order', 'details', '42', 'comments']`.
- `ref.set()` and `ref.update()` write to the cache as well as the resource, so optimistic values survive unrelated invalidations. Call `invalidate()` when you want a server fetch.
- `value()` keeps cached data on error. A failed background revalidation leaves the last value in place, so check `error()` to show a banner next to stale data.
- Concurrent `cachedMutation` calls are latest-wins. If call 1 fails after call 2 started, `onError` does not fire for call 1 and its optimistic value stays on screen.
- Cache keys are untyped at the boundary. Consistent key to type pairings are on you.
- A burst of invalidations spread over time refetches once per invalidation. Invalidations within a single tick collapse into one refetch.

---

## Non-goals

These are deliberate. Each one is a reason to use something else, not a roadmap item.

**Persistence and SSR dehydration.** ziflux does not serialize the cache. For hydration
without a refetch, pass `id` and let `resource()` use Angular's `TransferState`. If you
need the whole cache persisted to storage and rehydrated, use TanStack Query.

**Infinite queries and pagination primitives.** There is no `fetchNextPage`, no page-param
plumbing and no cursor state machine. Model pages as separate cache keys, or use TanStack
Query.

**A normalized cache.** Entries are stored whole against their key. Updating an entity in
one place does not update it inside every list that contains it. If you want normalization,
you want Apollo or TanStack Query with a normalizer.

**State management.** No actions, no reducers, no time-travel, no entity adapters. Angular
signals are the state layer. Use NgRx when the problem is orchestration rather than caching.

---

## Support policy

Stable APIs only. ziflux builds on `resource()` and signals as they ship, with no
dependency on developer-preview or experimental APIs, so a release will not break because
an upstream preview API changed.

One peer range at a time. The current range is `@angular/core ^22.0.0`. Supporting older
majors would mean either polyfilling APIs or holding back, and both contradict the reason
to pick this over an adapter that documents breaking changes in patch releases.

Feature-complete by design. The non-goals above are not a backlog. Bug fixes, Angular
version support and documentation continue; the API surface is meant to stop growing. A
library you can read in an afternoon only stays that way if someone says no.

Versioning follows semver, with the caveat that this is still 0.x: breaking changes land
in the minor position and are called out in the changelog.

---

## Documentation

- [Guide](https://ziflux.dev#guide) covers the domain pattern and a full walkthrough from API to store to template to mutations.
- [Testing](https://ziflux.dev#testing) covers TestBed setup and testing a `DataCache` standalone.
- [Caching](https://ziflux.dev#freshness) covers the freshness model, loading states and cache keys.
- [API reference](https://ziflux.dev#api) has full signatures for all nine exports.

---

## Prior art

RFC 5861 defined stale-while-revalidate for HTTP caches. TanStack Query popularized
`staleTime`, `gcTime` and structured query keys. SWR by Vercel brought the pattern to the
frontend mainstream. Angular's `resource()` is what this builds on.

There are no runtime dependencies: Angular signals, `resource()` and an in-memory `Map`.
`rxjs` is a peer dependency, already present in every Angular app, and is used to consume
Observable loaders.

Instructions for AI code generation are in [llms.txt](https://github.com/neogenz/ziflux/blob/main/llms.txt).

---

## AI skills

```bash
npx skills add neogenz/ziflux
```

Gives a coding agent working knowledge of the APIs and patterns for implementation,
review and testing.

---

## Contributing

See [CONTRIBUTING.md](https://github.com/neogenz/ziflux/blob/main/CONTRIBUTING.md).

## License

MIT, see [LICENSE](https://github.com/neogenz/ziflux/blob/main/LICENSE).
