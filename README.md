# ziflux

[![npm version](https://img.shields.io/npm/v/ziflux)](https://www.npmjs.com/package/ziflux)
[![license](https://img.shields.io/npm/l/ziflux)](https://github.com/neogenz/ziflux/blob/main/LICENSE)
[![Angular](https://img.shields.io/badge/Angular-21+-dd0031)](https://angular.dev)
[![CI](https://github.com/neogenz/ziflux/actions/workflows/ci.yml/badge.svg)](https://github.com/neogenz/ziflux/actions/workflows/ci.yml)

A zero-dependency, signal-native caching layer for Angular 21+.
Stale-while-revalidate semantics for `resource()` — instant navigations, background refreshes, no spinners on return visits.

**[Documentation](https://ziflux.dev)** · [npm](https://www.npmjs.com/package/ziflux) · [GitHub](https://github.com/neogenz/ziflux)

---

## Quick Start

```bash
npm install ziflux
```

```typescript
import { provideZiflux, withDevtools } from 'ziflux'

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideZiflux({ staleTime: 30_000, expireTime: 300_000 }, withDevtools())],
}
```

```typescript
import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { DataCache, cachedResource } from 'ziflux'

// todo.api.ts — singleton, owns the cache
@Injectable({ providedIn: 'root' })
export class TodoApi {
  readonly cache = new DataCache()
  readonly #http = inject(HttpClient)
  getAll$() { return this.#http.get<Todo[]>('/todos') }
}

// todo-list.store.ts — route-scoped, reads the cache
readonly todos = cachedResource({
  cache: this.#api.cache,
  cacheKey: ['todos'],
  loader: () => this.#api.getAll$(),
})
```

All `DataCache` instances inherit defaults from `provideZiflux()`. Devtools are only active in dev mode.

---

## Architecture

```
Component  →  Store  →  API Service  →  DataCache  →  Server
view scope    route      root             root          remote
              scope      singleton        singleton

              cachedResource()  cache.set()   SWR + dedup
              mutations         invalidate()  version signal
```

Signals flow back from Store to Component. The cache is transparent to the Store.

---

## Why ziflux?

- **Instant navigations** — cached data appears immediately, fresh data loads in the background. No spinners on return visits.
- **Optimistic updates in 5 lines** — `cachedMutation` handles the snapshot → mutate → rollback-on-error lifecycle for you.
- **Zero plumbing** — you stop hand-rolling stale-while-revalidate logic, duplicating it across projects, and maintaining it forever.

`resource()` handles the fetch lifecycle. ziflux handles the data lifecycle — when to re-fetch, what to keep, what's stale. Angular signals remain your state layer.

---

## How is this different?

| | ziflux | TanStack Query | NgRx |
| --- | --- | --- | --- |
| Mental model | `resource()` + cache | Query client | Actions + reducers + effects |
| Angular signals | Native | Adapter | Adapter (SignalStore) |
| Dependencies | 0 | 3+ | 5+ |
| Learning curve | Minutes | Hours | Days |
| API surface | 9 exports | 50+ | 100+ |
| Use case | SWR caching for `resource()` | Full data-fetching framework | Full state management |

**Pick ziflux when** you want caching semantics on top of Angular's built-in `resource()` — nothing more, nothing less.
**Pick TanStack Query when** you need a comprehensive data-fetching layer with pagination, infinite queries, and devtools across frameworks.
**Pick NgRx when** you need full-blown state management with time-travel debugging, entity adapters, and complex side-effect orchestration.

---

## API at a Glance

| Export | Description |
| --- | --- |
| `DataCache` | Per-domain cache instance — owns entries, invalidation, dedup |
| `cachedResource()` | `resource()` + SWR cache awareness. Returns `CachedResourceRef<T>` |
| `cachedMutation()` | Declarative mutation lifecycle — status signals, optimistic updates, auto-invalidation |
| `provideZiflux()` | Global config — `staleTime`, `expireTime`, `maxEntries` |
| `withDevtools()` | Cache inspector + structured console logging (dev mode only) |
| `anyLoading()` | Aggregate `Signal<boolean>` from multiple loading/pending signals |
| `ZIFLUX_CONFIG` | Injection token for the resolved config |

Full signatures, return types, and usage examples → **[API Reference](https://ziflux.dev#api)**

---

## Freshness Model

```
  write        staleTime          expireTime
    │              │                 │
    ▼              ▼                 ▼
    ├── FRESH ─────┤──── STALE ──────┤── EVICTED ──▶
         return          return +        fetch from
         directly     background fetch    server
```

**Golden rule: `invalidate()` marks entries stale. It never deletes them.**
Users always see data instantly — even stale — while fresh data loads.

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
- **`ref.set()` / `ref.update()` are local-only.** They don't write to the cache. Call `invalidate()` to trigger a fresh server fetch.
- **Cache keys are untyped at the boundary.** Type correctness depends on consistent key→type pairings in your code.

---

## Documentation

- **[Guide](https://ziflux.dev#guide)** — Domain pattern, 3-file structure, full usage walkthrough (API → Store → Template → Mutations → Optimistic updates)
- **[Testing](https://ziflux.dev#testing)** — TestBed setup, store testing, standalone DataCache testing
- **[Caching](https://ziflux.dev#freshness)** — Freshness model, loading states, cache keys, when to cache
- **[API Reference](https://ziflux.dev#api)** — Full signatures, return types, usage examples for all 7 exports

---

## Prior Art

- **RFC 5861** — stale-while-revalidate HTTP cache-control extension
- **TanStack Query** — `staleTime`, `gcTime`, structured query keys
- **SWR by Vercel** — popularized SWR in the frontend ecosystem
- **Angular `resource()`** — the foundation this library builds on

Zero external dependencies. 100% Angular signals + `resource()` + in-memory `Map`.

AI code generation instructions: [llms.txt](./llms.txt)

---

## Limitations

- **Client-side only** — no SSR transfer state. The cache is in-memory and does not serialize across server/client boundaries.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
