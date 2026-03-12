# ziflux

A zero-dependency, signal-native caching layer for Angular 21+.
Stale-while-revalidate semantics for `resource()` — instant navigations, background refreshes, no spinners on return visits.

---

## Architecture

```
Component  →  Store  →  API Service  →  DataCache  →  Server
view scope    route      root             root          remote
              scope      singleton        singleton

              cachedResource()  cache.set()   SWR + dedup
              mutations         invalidate()  version signal
```

**You write** Component, Store, API Service — plain Angular `@Injectable()` classes.
**Library provides** `DataCache`, `cachedResource()`, `cachedMutation()`, `injectCachedHttp()`, `provideZiflux()`, `withDevtools()`, `ZifluxDevtoolsComponent`, and `anyLoading()` — the cache + mutation lifecycle layer.

Signals flow back from Store to Component. The cache is transparent to the Store.

---

## What it is

A **cache layer** that fills the gap Angular's `resource()` leaves open: the data lifecycle.

```
resource()  → fetch lifecycle  → loading  | resolved | error
DataCache   → data lifecycle   → fresh    | stale    | expired
```

`resource()` knows **how** to fetch. `ziflux` knows **when** to re-fetch and **what** to keep.

## What it is NOT

- Not a state manager — Angular signals are your state manager
- Not a store abstraction — you write plain injectable services
- Not another NgRx, not a TanStack port

---

## Installation

```bash
npm install ziflux
```

## Setup

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideZiflux({ staleTime: 30_000, expireTime: 300_000 })],
}
```

```typescript
// With devtools (dev mode only)
providers: [provideZiflux({ staleTime: 30_000, expireTime: 300_000 }, withDevtools())]
```

One line. All `DataCache` instances in your app inherit these defaults.

---

## API

Ten exports.

### `DataCache<T>`

Own one per domain, in your API service (singleton).

```typescript
class DataCache<T> {
  readonly version: Signal<number> // auto-increments on invalidate()

  constructor(config?: Partial<ZifluxConfig>) // priority: arg > provider > defaults

  get(
    key: string[],
    options?: { staleTime?: number; expireTime?: number },
  ): { data: T; fresh: boolean } | null
  set(key: string[], data: T): void
  invalidate(prefix: string[]): void // marks stale + bumps version
  wrap(key: string[], obs$: Observable<T>): Observable<T>
  deduplicate(key: string[], fn: () => Promise<T>): Promise<T>
  prefetch(key: string[], fn: () => Promise<T>): Promise<void>
  clear(): void
}
```

### `cachedResource<T, P>()`

`resource()` extended with cache awareness. Same mental model.

```typescript
function cachedResource<T, P extends object>(options: {
  cache: DataCache<T>
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

### `injectCachedHttp(cache)`

HTTP client that auto-populates a `DataCache` on GET responses.

```typescript
function injectCachedHttp<T>(cache: DataCache<T>): CachedHttpClient<T>
```

```typescript
interface CachedHttpClient<T> {
  get(url: string, key: string[], options?): Observable<T> // fetches + caches
  post(url: string, body: unknown, options?): Observable<T> // pass-through
  put(url: string, body: unknown, options?): Observable<T> // pass-through
  patch(url: string, body: unknown, options?): Observable<T> // pass-through
  delete(url: string, options?): Observable<T> // pass-through
}
```

Must be called in an injection context (field initializer of an `@Injectable()`).

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

Global registry of all `DataCache` instances. Auto-managed when `withDevtools()` is enabled.

```typescript
class CacheRegistry {
  readonly caches: Signal<Map<string, DataCache<unknown>>>
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

## Architecture — Domain Pattern

Every feature follows the same 3-file pattern. Always. No exceptions.

```
1. order.api.ts          ← HTTP + cache (singleton, providedIn: 'root')
2. order-list.store.ts   ← cachedResource + mutations (route-scoped)
3. order-list.component  ← inject(Store), read signals
```

### Rules

1. A component **never** injects an API service directly
2. HTTP logic is in the API service, **never** in the store
3. The store **never** instantiates a `DataCache` — it reads `this.#api.cache`
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
  readonly cache = new DataCache<Order>()
  readonly #http = injectCachedHttp(this.cache)

  getAll$(filters: OrderFilters): Observable<Order[]> {
    return this.#http.get('/orders', ['order', 'list', filters.status], {
      params: { ...filters },
    })
  }

  getById$(id: string): Observable<Order> {
    return this.#http.get(`/orders/${id}`, ['order', 'details', id])
  }

  delete$(id: string): Observable<void> {
    return this.#http
      .delete<void>(`/orders/${id}`)
      .pipe(tap(() => this.cache.invalidate(['order'])))
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
readonly updateOrder = cachedMutation<{ id: string; data: Partial<Order> }, Order, Order[]>({
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

## For AI agents

When generating code for a ziflux project, follow this pattern exactly:

### Creating a new domain (e.g. "product")

**Step 1** — Create `product.api.ts`:

```typescript
@Injectable({ providedIn: 'root' })
export class ProductApi {
  readonly cache = new DataCache<Product>()
  readonly #http = injectCachedHttp(this.cache)

  getAll$(): Observable<Product[]> {
    return this.#http.get('/products', ['product', 'list'])
  }

  getById$(id: string): Observable<Product> {
    return this.#http.get(`/products/${id}`, ['product', 'details', id])
  }

  create$(body: CreateProduct): Observable<Product> {
    return this.#http.post('/products', body)
  }
}
```

**Step 2** — Create `product-list.store.ts`:

```typescript
@Injectable()
export class ProductListStore {
  readonly #api = inject(ProductApi)

  readonly products = cachedResource({
    cache: this.#api.cache,
    cacheKey: () => ['product', 'list'],
    params: () => ({}),
    loader: () => this.#api.getAll$(),
  })

  readonly createProduct = cachedMutation({
    cache: this.#api.cache,
    mutationFn: (body: CreateProduct) => this.#api.create$(body),
    invalidateKeys: () => [['product', 'list']],
  })

  readonly isAnythingLoading = anyLoading(
    this.products.isLoading,
    this.createProduct.isPending,
  )
}
```

**Step 3** — Use in component:

```typescript
@Component({ providers: [ProductListStore] })
export class ProductListComponent {
  readonly store = inject(ProductListStore)
}
```

### What an agent must NOT do

- Inject `HttpClient` or an API service directly in a component
- Put `DataCache` inside a store
- Call HTTP methods from a store
- Skip the API layer and fetch directly in `cachedResource`'s loader
- Create a new `DataCache` per store (use the one from the API service)
- Write manual loading/error signal boilerplate — use `cachedMutation()` instead
- Invalidate cache manually inside a store — use `cachedMutation`'s `invalidateKeys`

---

## Prior art

- **RFC 5861** — stale-while-revalidate HTTP cache-control extension
- **TanStack Query** — `staleTime`, `gcTime`, structured query keys
- **SWR by Vercel** — popularized SWR in the frontend ecosystem
- **Angular `resource()`** — the foundation this library builds on

Zero external dependencies. 100% Angular signals + `resource()` + in-memory `Map`.
