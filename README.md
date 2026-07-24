# ziflux

[![npm version](https://img.shields.io/npm/v/ngx-ziflux)](https://www.npmjs.com/package/ngx-ziflux)
[![license](https://img.shields.io/npm/l/ngx-ziflux)](https://github.com/neogenz/ziflux/blob/main/LICENSE)
[![Angular](https://img.shields.io/badge/Angular-22+-dd0031)](https://angular.dev)
[![CI](https://github.com/neogenz/ziflux/actions/workflows/ci.yml/badge.svg)](https://github.com/neogenz/ziflux/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/badge/core-5.9_kB_brotli-blue)](https://github.com/neogenz/ziflux/blob/main/.size-limit.json)

A zero-dependency, signal-native caching layer for Angular 22+.
Stale-while-revalidate semantics for `resource()` — instant navigations and background refreshes, with no spinner on return visits while the entry is still within `expireTime`.

**[Documentation](https://ziflux.dev)** · [npm](https://www.npmjs.com/package/ngx-ziflux) · [GitHub](https://github.com/neogenz/ziflux)

---

## Quick Start

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

// todo.api.ts — singleton, owns the cache
@Injectable({ providedIn: 'root' })
export class TodoApi {
  readonly cache = new DataCache()
  readonly #http = inject(HttpClient)
  getAll$() { return this.#http.get<Todo[]>('/todos') }
}

// todo-list.store.ts — route-scoped, reads the cache
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

All `DataCache` instances inherit defaults from `provideZiflux()`. `new DataCache()` and `cachedResource()` must run inside an Angular injection context — a field initializer, a constructor, or `runInInjectionContext()`. Devtools are only active in dev mode.

See the [full example app](https://github.com/neogenz/ziflux/tree/main/projects/example) for a working Todo demo with mutations, optimistic updates, polling, and devtools.

---

## Architecture

**Component → Store → API Service → DataCache → Server**

Each layer has a clear scope: components own the view, stores own the route state, API services (root singletons) own the cache. Signals flow back from Store to Component. The cache is transparent to the Store.

See the [Architecture Guide](https://ziflux.dev#guide) for the full domain pattern.

---

## Why ziflux?

- **Instant navigations** — cached data appears immediately, fresh data loads in the background. No spinner on return visits while the entry is within `expireTime`.
- **Optimistic updates without hand-rolled state** — `cachedMutation` gives you the `onMutate` / `onError` hooks and write-through `set()` / `update()`; you write the snapshot and the rollback, it owns the status signals and the invalidation.
- **Zero plumbing** — you stop hand-rolling stale-while-revalidate logic, duplicating it across projects, and maintaining it forever.

`resource()` handles the fetch lifecycle. ziflux handles the data lifecycle — when to re-fetch, what to keep, what's stale. Angular signals remain your state layer.

---

## How is this different?

| | ziflux | TanStack Query | NgRx |
| --- | --- | --- | --- |
| Mental model | `resource()` + cache | Query client | Actions + reducers + effects |
| Angular signals | Native | Angular adapter (`@tanstack/angular-query-experimental`) | Native (`@ngrx/signals` SignalStore) |
| Runtime dependencies | 0 (peers: `@angular/core`, `@angular/common`, `rxjs`) | TanStack core + Angular adapter | multiple `@ngrx/*` packages |
| Bundle size | 5.9 kB brotli, enforced in CI | ~13 kB gzip | varies by packages used |
| API surface | 9 runtime + 13 type exports | broader | broader |
| Use case | SWR caching for `resource()` | Full data-fetching framework | Full state management |
| **Best for** | SWR on `resource()` | Full data-fetching layer | Complex state + effects |

**Pick ziflux when** you want caching semantics on top of Angular's built-in `resource()` — nothing more, nothing less.
**Pick TanStack Query when** you need a comprehensive data-fetching layer with pagination, infinite queries, persistence, and devtools across frameworks — noting its Angular adapter still ships as `@tanstack/angular-query-experimental` and documents breaking changes in minor and patch releases.
**Pick NgRx when** you need full-blown state management with time-travel debugging, entity adapters, and complex side-effect orchestration.

---

## API at a Glance

| Export | Description |
| --- | --- |
| `DataCache` | Per-domain cache instance — owns entries, invalidation, dedup |
| `cachedResource()` | `resource()` + SWR cache awareness. Returns `CachedResourceRef<T>` |
| `cachedMutation()` | Declarative mutation lifecycle — status signals, optimistic updates, auto-invalidation |
| `provideZiflux()` | Global config — `staleTime`, `expireTime`, `maxEntries`, `cleanupInterval` |
| `withDevtools()` | Cache inspector + structured console logging (dev mode only) |
| `anyLoading()` | Aggregate `Signal<boolean>` from multiple loading/pending signals |
| `ZIFLUX_CONFIG` | Injection token for the resolved config |
| `CacheRegistry` | Tracks all `DataCache` instances — used internally by devtools |
| `ZifluxDevtoolsComponent` | Standalone component — renders cache inspector overlay in dev mode |

Full signatures, return types, and usage examples → **[API Reference](https://ziflux.dev#api)**

---

## Freshness Model

Entries move through three states: **Fresh** → **Stale** → **Expired**. `staleTime` and `expireTime` control the transitions.

- **Fresh** — returned directly from cache, no fetch
- **Stale** — returned immediately + background fetch (SWR)
- **Expired** — cache miss, full fetch from server

**Golden rule: `invalidate()` marks entries stale. It never deletes them.**
Users always see data instantly — even stale — while fresh data loads.

See the [Freshness Guide](https://ziflux.dev#freshness) for TTL configuration and examples.

---

## Cache Keys

Hierarchical arrays. Serialized with `JSON.stringify`. Prefix-based invalidation.

```typescript
['order', 'list', 'pending']  // filtered list
['order', 'details', '42']   // single entity
['order']                     // invalidate(['order']) → matches both above
```

---

## Gotchas

- **`invalidate([])` is a no-op.** An empty prefix matches nothing. Use `cache.clear()` to wipe everything.
- **`invalidate()` is prefix-based, not exact-match.** `invalidate(['order', 'details', '42'])` also matches `['order', 'details', '42', 'comments']`.
- **`ref.set()` / `ref.update()` write to the cache.** They update both the Angular resource and the `DataCache` — optimistic values survive cache version bumps from unrelated invalidations. To trigger a fresh server fetch, call `invalidate()`.
- **`value()` preserves cached data on error.** When a background revalidation fails, `value()` returns the last cached value (not `undefined`). Check `error()` to detect the failure and show an error banner alongside the stale data.
- **Cache keys are untyped at the boundary.** Type correctness depends on consistent key→type pairings in your code.

---

## Documentation

- **[Guide](https://ziflux.dev#guide)** — Domain pattern, 3-file structure, full usage walkthrough (API → Store → Template → Mutations → Optimistic updates)
- **[Testing](https://ziflux.dev#testing)** — TestBed setup, store testing, standalone DataCache testing
- **[Caching](https://ziflux.dev#freshness)** — Freshness model, loading states, cache keys, when to cache
- **[API Reference](https://ziflux.dev#api)** — Full signatures, return types, usage examples for all 9 exports

---

## Prior Art

- **RFC 5861** — stale-while-revalidate HTTP cache-control extension
- **TanStack Query** — `staleTime`, `gcTime`, structured query keys
- **SWR by Vercel** — popularized SWR in the frontend ecosystem
- **Angular `resource()`** — the foundation this library builds on

Zero runtime dependencies — Angular signals, `resource()` and an in-memory `Map`. `rxjs` is a peer dependency (already present in every Angular app) and is used to consume Observable loaders.

AI code generation instructions: [llms.txt](https://github.com/neogenz/ziflux/blob/main/llms.txt)

---

## AI Skills

Install the ziflux expert skill for your AI coding agent:

```bash
npx skills add neogenz/ziflux
```

Gives your agent deep knowledge of ziflux APIs, patterns, and best practices for implementation, debugging, code review, and testing.

---

## Limitations

- **No SSR transfer state** — the cache is in-memory and does not serialize across the server/client boundary, so the client refetches on hydration. Server rendering itself is safe: the cleanup sweep and `refetchInterval` polling are browser-only.

---

## Contributing

See [CONTRIBUTING.md](https://github.com/neogenz/ziflux/blob/main/CONTRIBUTING.md).

## License

MIT — see [LICENSE](https://github.com/neogenz/ziflux/blob/main/LICENSE).
