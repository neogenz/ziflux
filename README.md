# ziflux

[![npm version](https://img.shields.io/npm/v/ziflux)](https://www.npmjs.com/package/ziflux)
[![license](https://img.shields.io/npm/l/ziflux)](https://github.com/neogenz/ziflux/blob/main/LICENSE)
[![Angular](https://img.shields.io/badge/Angular-21+-dd0031)](https://angular.dev)
[![CI](https://github.com/neogenz/ziflux/actions/workflows/ci.yml/badge.svg)](https://github.com/neogenz/ziflux/actions/workflows/ci.yml)

A zero-dependency, signal-native caching layer for Angular 21+.
Stale-while-revalidate semantics for `resource()` — instant navigations, background refreshes, no spinners on return visits.

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

`resource()` handles the **fetch lifecycle** (loading → resolved → error). It doesn't handle the **data lifecycle** — when to re-fetch, what to keep, what's stale.

```
resource()  → fetch lifecycle  → loading  | resolved | error
DataCache   → data lifecycle   → fresh    | stale    | expired
```

ziflux fills that gap. Angular signals remain your state layer — this is just the cache.

---

## API

Seven runtime exports, plus types.

### `DataCache`

Own one per domain, in your API service (singleton). Must be instantiated inside an **injection context** (constructor, field initializer, or `runInInjectionContext()`).

```typescript
class DataCache {
  readonly version: Signal<number> // auto-increments on invalidate()

  constructor(config?: Partial<ZifluxConfig>) // priority: arg > provider > defaults

  get<T>(
    key: string[],
    options?: { staleTime?: number; expireTime?: number },
  ): { data: T; fresh: boolean } | null
  set<T>(key: string[], data: T): void
  invalidate(prefix: string[]): void // marks stale + bumps version
  wrap<T>(key: string[], obs$: Observable<T>): Observable<T>
  deduplicate<T>(key: string[], fn: () => Promise<T>): Promise<T>
  prefetch<T>(key: string[], fn: () => Promise<T>): Promise<void>
  clear(): void
}
```

### `cachedResource<T, P>()`

`resource()` extended with cache awareness. Same mental model. Must be called inside an **injection context** (constructor, field initializer, or `runInInjectionContext()`).

```typescript
function cachedResource<T, P extends object>(options: {
  cache: DataCache
  cacheKey: string[] | ((params: NoInfer<P>) => string[])
  params?: () => P | undefined
  loader: (context: { params: P; abortSignal: AbortSignal }) => Observable<T> | Promise<T>
  staleTime?: number // override global
  expireTime?: number // override global
  retry?: number | RetryConfig          // auto-retry with exponential backoff
  refetchInterval?: number | (() => number | false) // polling
}): CachedResourceRef<T>
```

```typescript
interface CachedResourceRef<T> {
  readonly value: Signal<T | undefined>
  readonly status: Signal<ResourceStatus>
  readonly error: Signal<unknown>
  readonly isLoading: Signal<boolean>
  readonly isStale: Signal<boolean>
  readonly isInitialLoading: Signal<boolean> // true only on cold cache
  hasValue(): boolean
  reload(): boolean
  destroy(): void
  set(value: T): void
  update(updater: (value: T | undefined) => T): void
}
```

Everything else (`status()`, `error()`, `reload()`, `set()`, `update()`) behaves exactly like Angular's `ResourceRef<T>`.

`retry` accepts a retry count (exponential backoff with defaults) or a full `RetryConfig`:

```typescript
interface RetryConfig {
  maxRetries: number
  baseDelay?: number              // default: 1_000 ms
  maxDelay?: number               // default: 30_000 ms
  retryIf?: (error: unknown) => boolean // default: retry all
}
```

`refetchInterval` enables polling — pass a number (ms) or a function returning `number | false` to pause.

### `provideZiflux(config?, ...features)`

```typescript
function provideZiflux(
  config?: Partial<ZifluxConfig>,
  ...features: ZifluxFeature[]
): EnvironmentProviders
```

```typescript
provideZiflux({
  staleTime: 30_000, // ms before fresh → stale (default: 30s)
  expireTime: 300_000, // ms before stale → evicted (default: 5min)
  maxEntries: 500, // LRU eviction when exceeded (default: unlimited)
})
```

Pass feature functions like `withDevtools()` as additional arguments.

### `withDevtools(config?: DevtoolsConfig)`

Enables cache inspector and structured console logging. Only active in dev mode.

```typescript
function withDevtools(config?: DevtoolsConfig): ZifluxFeature
```

```typescript
interface DevtoolsConfig {
  logOperations?: boolean // default: true in dev mode
}
```

### `ZifluxDevtoolsComponent`

Floating overlay panel for inspecting live cache state. Standalone component.

```typescript
// In your root component template
<ziflux-devtools />
```

Toggle with **Ctrl+Shift+Z** (Cmd+Shift+Z on Mac). Shows per-cache entries, freshness state, TTL, and in-flight requests.

### `CacheRegistry`

*Advanced — most apps won't need this directly.*

Global registry of all `DataCache` instances. Auto-managed when `withDevtools()` is enabled.

```typescript
class CacheRegistry {
  readonly caches: Signal<Map<string, DataCache>>
  inspectAll(): { name: string; inspection: CacheInspection<unknown> }[]
}
```

Useful for building custom monitoring — most users won't need it directly.

### `cachedMutation<A, R, C>()`

Declarative mutation lifecycle — status signals, cache invalidation, optimistic updates.

```typescript
function cachedMutation<A = void, R = void, C = void>(options: {
  mutationFn: (args: A) => Observable<R> | Promise<R>
  cache?: { invalidate(prefix: string[]): void } // any DataCache works
  invalidateKeys?: (args: A, result: R) => string[][]
  onMutate?: (args: A) => C | Promise<C> // optimistic update, returns rollback context
  onSuccess?: (result: R, args: A) => void
  onError?: (error: unknown, args: A, context: C | undefined) => void
}): CachedMutationRef<A, R>
```

```typescript
interface CachedMutationRef<A, R> {
  mutate(...args: A extends void ? [] : [args: A]): Promise<R | undefined>
  readonly status: Signal<CachedMutationStatus> // 'idle' | 'pending' | 'success' | 'error'
  readonly isPending: Signal<boolean>
  readonly error: Signal<unknown>
  readonly data: Signal<R | undefined> // last successful result
  reset(): void // back to idle
}
```

`mutate()` never rejects — errors are captured in the `error` signal.

### `anyLoading()`

Aggregate loading state from any `Signal<boolean>`.

```typescript
function anyLoading(...signals: Signal<boolean>[]): Signal<boolean>
```

Works with both `CachedResourceRef.isLoading` and `CachedMutationRef.isPending`.

---

## Domain Pattern

**Recommended** — most features follow a 3-file structure:

```
1. order.api.ts          ← HTTP + cache (singleton, providedIn: 'root')
2. order-list.store.ts   ← cachedResource + mutations (route-scoped)
3. order-list.component  ← inject(Store), read signals
```

The cache must outlive route navigations (singleton API service), while stores stay route-scoped and components stay presentation-only.

These are recommendations. The library works without a store layer — you can use `cachedResource` directly in a component if your use case is simple.

### Guidelines

1. Components **shouldn't** inject an API service directly
2. Keep HTTP logic in the API service, not the store
3. The store **shouldn't** instantiate a `DataCache` — it reads `this.#api.cache`
4. Mutations in the store call the API → the API invalidates the cache

### Naming conventions

| Concept      | Class name         | File name               |
| ------------ | ------------------ | ----------------------- |
| API service  | `OrderApi`         | `order.api.ts`          |
| List store   | `OrderListStore`   | `order-list.store.ts`   |
| Detail store | `OrderDetailStore` | `order-detail.store.ts` |

---

## Usage

### 1. API service

The cache lives here — it's a singleton that survives route navigations.

```typescript
@Injectable({ providedIn: 'root' })
export class OrderApi {
  readonly cache = new DataCache()
  readonly #http = inject(HttpClient)

  getAll$(filters: OrderFilters): Observable<Order[]> {
    return this.#http.get<Order[]>('/orders', { params: { ...filters } })
  }

  getById$(id: string): Observable<Order> {
    return this.#http.get<Order>(`/orders/${id}`)
  }

  delete$(id: string): Observable<void> {
    return this.#http.delete<void>(`/orders/${id}`)
  }
}
```

### 2. Store — list with filters

```typescript
@Injectable()
export class OrderListStore {
  readonly #api = inject(OrderApi)

  readonly filters = signal<OrderFilters>({ status: 'all', search: '' })

  readonly orders = cachedResource({
    cache: this.#api.cache,
    cacheKey: params => ['order', 'list', params.status, params.search],
    params: () => this.filters(),
    loader: ({ params }) => this.#api.getAll$(params),
  })

  setFilters(filters: Partial<OrderFilters>) {
    this.filters.update(f => ({ ...f, ...filters }))
  }
}
```

`orders.reload()`, `orders.isInitialLoading()`, `orders.isStale()` — already there.

### 3. Store — detail by id

```typescript
@Injectable()
export class OrderDetailStore {
  readonly #api = inject(OrderApi)

  readonly #id = signal<string | null>(null)

  readonly order = cachedResource({
    cache: this.#api.cache,
    cacheKey: params => ['order', 'details', params.id],
    params: () => {
      const id = this.#id()
      return id ? { id } : undefined // undefined = idle, loader doesn't run
    },
    loader: ({ params }) => this.#api.getById$(params.id),
  })

  load(id: string) {
    this.#id.set(id)
  }
}
```

### 4. Template

```html
@if (store.orders.isInitialLoading()) {
  <app-spinner />
} @else {
  @let list = store.orders.value();
  @if (list) {
    <app-order-list [orders]="list" [stale]="store.orders.isStale()" />
  } @else {
    <app-empty-state />
  }
}
```

When the server fails but stale data exists, show both:

```html
@if (store.orders.error()) {
  <div class="error-banner">Failed to refresh. Showing cached data.</div>
}
@if (store.orders.isInitialLoading()) {
  <app-spinner />
} @else {
  @let list = store.orders.value();
  @if (list) {
    <app-order-list [orders]="list" [stale]="store.orders.isStale()" />
  } @else {
    <app-empty-state />
  }
}
```

### 5. Mutations with `cachedMutation()`

Replaces ~13 lines of boilerplate per mutation with a declarative definition.

```typescript
@Injectable()
export class OrderListStore {
  readonly #api = inject(OrderApi)

  readonly orders = cachedResource({ /* ... */ })

  readonly deleteOrder = cachedMutation({
    cache: this.#api.cache,
    mutationFn: (id: string) => this.#api.delete$(id),
    invalidateKeys: (id) => [['order', 'details', id], ['order', 'list']],
  })
}
```

```html
<button (click)="store.deleteOrder.mutate(order.id)">Delete</button>
@if (store.deleteOrder.isPending()) { <app-spinner /> }
```

### 6. Optimistic updates + rollback

Use `onMutate` to apply optimistic changes, return rollback context, revert on error.

```typescript
readonly updateOrder = cachedMutation({
  cache: this.#api.cache,
  mutationFn: (args) => this.#api.update$(args.id, args.data),
  invalidateKeys: (args) => [['order', 'details', args.id], ['order', 'list']],
  onMutate: (args) => {
    const prev = this.orders.value()
    this.orders.update(list =>
      list?.map(o => (o.id === args.id ? { ...o, ...args.data } : o)),
    )
    return prev // rollback context
  },
  onError: (_err, _args, context) => {
    if (context) this.orders.set(context)
  },
})
```

### 7. Aggregate loading state

```typescript
readonly isAnythingLoading = anyLoading(
  this.orders.isLoading,
  this.deleteOrder.isPending,
)
```

---

## Freshness model

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

## Cache keys

Hierarchical arrays. Serialized with `JSON.stringify`. Prefix-based invalidation.

```typescript
['order', 'list', 'pending']  // filtered list
['order', 'details', '42']   // single entity
['order']                     // invalidate(['order']) → matches both above
```

---

## Gotchas

- **`invalidate([])` is a no-op.** An empty prefix matches nothing. Use `cache.clear()` to wipe everything.
- **`invalidate()` is prefix-based, not exact-match.** `invalidate(['order', 'details', '42'])` also matches `['order', 'details', '42', 'comments']` if it exists.
- **`ref.set()` / `ref.update()` are local-only.** They update the component's view but do NOT write to the cache. Call `invalidate()` to trigger a fresh server fetch.
- **Cache keys are untyped at the boundary.** `DataCache` stores `unknown` internally. Type correctness depends on consistent key→type pairings in your code.

---

## Testing

`DataCache` and `cachedResource` require an Angular injection context. Use `TestBed`:

### Testing a store

```typescript
describe('OrderListStore', () => {
  let store: OrderListStore

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZiflux(),
        provideHttpClient(),
        provideHttpClientTesting(),
        OrderApi,
        OrderListStore,
      ],
    })
    store = TestBed.inject(OrderListStore)
  })

  it('loads orders', async () => {
    const httpTesting = TestBed.inject(HttpTestingController)

    // Flush the HTTP request
    httpTesting.expectOne('/orders').flush([{ id: '1', status: 'pending' }])
    await flushMicrotasks()
    TestBed.tick()

    expect(store.orders.value()).toHaveLength(1)
  })
})
```

### Testing with a standalone DataCache

```typescript
let cache: DataCache

beforeEach(() => {
  TestBed.configureTestingModule({})
  cache = TestBed.runInInjectionContext(() => new DataCache())
})

it('stores and retrieves data', () => {
  cache.set(['key'], 'value')
  expect(cache.get<string>(['key'])?.data).toBe('value')
})
```

---

## Loading states

| Situation                 | Cache | Resource status        | isInitialLoading | Display               |
| ------------------------- | ----- | ---------------------- | ---------------- | --------------------- |
| First visit, cold cache   | MISS  | `'loading'`                | `true`           | Spinner               |
| First visit, prefetched   | FRESH | `'resolved'`               | `false`          | Data                  |
| Return visit              | STALE | `'loading'` → `'resolved'` | `false`          | Stale data → fresh    |
| After mutation            | STALE | `'reloading'`              | `false`          | Data + silent refresh |
| Network error, had cache  | STALE | `'error'`                  | `false`          | Stale data, no crash  |
| Network error, cold cache | MISS  | `'error'`                  | `true`           | Error state           |

---

## When to cache / when not to

| Cache                                             | Don't cache                                |
| ------------------------------------------------- | ------------------------------------------ |
| GET — entity lists                                | POST / PUT / DELETE                        |
| GET — entity details                              | Search results with unique volatile params |
| Data shared across multiple screens               | Real-time data (WebSocket, SSE)            |
| Predictable access patterns (tabs, next/prev nav) | Large binaries                             |

---

## Prior art

- **RFC 5861** — stale-while-revalidate HTTP cache-control extension
- **TanStack Query** — `staleTime`, `gcTime`, structured query keys
- **SWR by Vercel** — popularized SWR in the frontend ecosystem
- **Angular `resource()`** — the foundation this library builds on

Zero external dependencies. 100% Angular signals + `resource()` + in-memory `Map`.

AI code generation instructions: [llms.txt](./llms.txt)

---

## Limitations

- **Client-side only** — no SSR transfer state. The cache is in-memory and does not serialize across server/client boundaries.
