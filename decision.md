# Decision Log

Key architectural and API decisions made during the design of ziflux.
Each decision captures the context, the options considered, and the rationale.

---

## D-01 — Scope: cache layer only, not state manager

**Decision:** The library is a cache layer. It does not abstract the store pattern, mutation pattern, or API service structure.

**Rationale:** Angular already is the state manager (signals + `resource()` + injectable services). Adding a store abstraction would create a new mental model and a learning curve — exactly what we're trying to avoid. The library's job is to fill the one gap Angular leaves: the data lifecycle (fresh / stale / expired).

**What this means in practice:** Developers write plain `@Injectable()` classes for stores and API services. The library provides `DataCache` and `cachedResource()`. Nothing else.

---

## D-02 — Cache lives in the API service, not the store

**Decision:** `DataCache` is instantiated as a property of the Feature API service (`providedIn: 'root'`), not inside the store.

**Rationale:**

- **Survival** — Stores are route-scoped and get destroyed on navigation. The cache must outlive them.
- **Sharing** — Multiple stores (e.g. order list + order dashboard) consume the same API. One cache serves all without duplication.
- **Transparency** — Stores don't need to know the cache exists. Caching is an implementation detail of the API layer.

**Rejected alternative:** Cache in the store → cache lost on every navigation, defeating the purpose of SWR.

---

## D-03 — `cacheVersion()` is built into `DataCache`, not a separate helper

**Decision:** `DataCache` exposes a `version: Signal<number>` property. `invalidate()` increments it automatically.

**Context:** Early design had a separate `cacheVersion()` helper function, requiring 3 lines of boilerplate per API service:

```typescript
readonly cache = new DataCache<Order[]>()
readonly #version = cacheVersion()
readonly version = this.#version.version
```

**Rationale:** Version and cache are inseparable. If you invalidate the cache, the version must increment. Making them a single object eliminates the boilerplate and removes a concept to learn.

**Result:** One line, one object, full DX:

```typescript
readonly cache = new DataCache<Order[]>()
// cache.version → Signal<number>
// cache.invalidate() → marks stale + bumps version
```

---

## D-04 — `cachedResource()` mirrors `resource()` signature exactly

**Decision:** `cachedResource()` options follow the same shape as Angular's `resource()` — `params`, `loader`, with `cache` and `cacheKey` added.

**Rationale:** If you know `resource()`, you already know `cachedResource()`. No new mental model. The library feels like an Angular extension, not a separate framework.

**Key addition:** `cacheKey` — a static `string[]` or a function `(params) => string[]` that derives the cache key from params. This enables dynamic keys (e.g. per-filter, per-id) without any extra setup.

---

## D-05 — Seeding and SWR implemented internally via Angular primitives

**Decision:** `cachedResource()` internally uses `linkedSignal()` + `resource()` + `computed()` to show stale cached data during `loading` state.

**Rationale:** Angular 21+ provides exactly the primitives needed (`resource`, `linkedSignal` with `source`/`computation`, `computed`). The developer should never write `#staleData` signals or seed-before-params-change logic. This is library-internal plumbing.

**What the developer never writes again:**

```typescript
// Gone:
readonly #staleData = signal<Order | null>(null)
readonly isInitialLoading = computed(
  () => this.#resource.status() === 'loading' && !this.#staleData()
)
setOrderId(id: string) {
  this.#staleData.set(this.#cache.get(['order', 'details', id])?.data ?? null)
  this.#id.set(id)
}
```

---

## D-06 — Optimistic updates use Angular's native `set()` / `update()`

**Decision:** No dedicated optimistic update API. `ResourceRef.set()` and `ResourceRef.update()` handle it natively (status becomes `'local'`).

**Rationale:** Angular already solved this. Adding a wrapper would be inventing a concept over an existing one. The pattern is two lines:

```typescript
this.orders.update(list => list?.filter(o => o.id !== id)) // optimistic
this.orders.set(snapshot) // rollback
```

---

## D-07 — `CachedResourceRef<T>` mirrors `ResourceRef<T>` with two extra signals

**Decision:** `cachedResource()` returns a `CachedResourceRef<T>` that mirrors Angular's `ResourceRef<T>` with exactly two additions: `isStale` and `isInitialLoading`. (See D-14 for why it's a standalone interface, not extending `ResourceRef<T>`.)

**Rationale:**

- `isStale` — needed to show subtle UI indicators (e.g. a refresh icon) without blocking the user. First-class because it's a new concept the library introduces.
- `isInitialLoading` — the key UX pattern: spinner only on cold cache, never during SWR revalidation. Computed as `status() === 'loading'` internally, but exposed as a named signal for clarity.
- Everything else (`value()`, `error()`, `reload()`, `set()`, `update()`, `status()`) mirrors Angular's `ResourceRef<T>`.

**Rejected:** Adding `seed()`, `prefetch()`, or mutation helpers to the ref — out of scope, adds cognitive overhead.

---

## D-08 — Invalidation marks stale, never deletes

**Decision:** `cache.invalidate(prefix)` sets `createdAt` to a past timestamp (marking the entry stale), never removes it from the Map.

**Rationale:** Deletion would mean the user sees a spinner after a mutation. Marking stale means they continue seeing data instantly while a background fetch gets fresh data. This is the "golden rule" of SWR: always return something, then revalidate.

---

## D-09 — Minimal exports

**Decision:** The public API started as 4 exports (`DataCache`, `cachedResource`, `injectCachedHttp`, `provideZiflux`), later extended to 7 with `cachedMutation`, `anyLoading`, and `ZIFLUX_CONFIG`. (See D-12 for `injectCachedHttp` rationale, D-15 for the rename to `provideZiflux`, D-16 for `cachedMutation`, D-17 for `anyLoading`.)

**Rationale:** Every additional export is a concept to learn. Prefetching, invalidation patterns, and loading state handling are either built into these four primitives or handled by Angular's native APIs.

---

## D-10 — `params: () => undefined` follows Angular's idle convention

**Decision:** When `params()` returns `undefined`, the loader does not run and the resource status is `'idle'`. This follows Angular's own `resource()` convention.

**Use case:** Detail stores where no entity is selected yet.

```typescript
params: () => {
  const id = this.#id()
  return id ? { id } : undefined // idle until id is set
}
```

---

## D-11 — `DataCache<T>` is a plain class, not injectable

**Decision:** `DataCache` is instantiated manually with `new DataCache<T>()`, not via Angular's DI system.

**Rationale:**

- Generic types don't work well with Angular's DI (`@Injectable` + generics = friction)
- Each API service owns one cache instance — DI would require per-token configuration
- `provideDataCache()` sets global defaults via an injection token that `DataCache` reads in its constructor via `inject()`

**Result:** Clean instantiation, DI-aware defaults, no DI friction.

---

## D-12 — `injectCachedHttp()` as 4th export

**Decision:** Add `injectCachedHttp(cache)` — a factory that returns a typed HTTP client where `get()` auto-populates the cache.

**Rationale:**

- API services repeat the same `http.get<T>(url).pipe(tap(data => cache.set(key, data)))` pattern
- `injectCachedHttp` eliminates the boilerplate while keeping the cache population explicit (via the `key` param on `get()`)
- Mutations (`post`, `put`, `patch`, `delete`) pass through without caching — mutations invalidate, they don't cache

**Constraint:** Must be called in an injection context (field initializer of an `@Injectable()`).

**Return type:** `CachedHttpClient<T>` — a typed interface with `get`, `post`, `put`, `patch`, `delete`.

---

## D-13 — Domain Pattern (API → Store → Component)

**Decision:** Document and enforce a 3-file pattern per feature domain:

1. `domain-name.api.ts` — HTTP + cache (singleton, `providedIn: 'root'`)
2. `domain-name.store.ts` — `cachedResource` + mutations (route-scoped)
3. `component.ts` — `inject(Store)`, read signals

**Rationale:**

- Without guidance, developers (and AI agents) create inconsistent patterns: components calling APIs directly, cache in stores, scattered state
- A deterministic, copy-pasteable pattern makes code generation reliable
- The naming convention (`OrderApi`, `OrderListStore`, `OrderDetailStore`) is mechanical — no decisions to make

**Rules (non-negotiable):**

1. A component never injects an API service directly
2. HTTP logic is in the API service, never in the store
3. The store never instantiates a `DataCache` — it reads `this.#api.cache`
4. Mutations in the store call the API → the API invalidates the cache

---

## D-14 — `CachedResourceRef<T>` does not extend `ResourceRef<T>`

**Decision:** `CachedResourceRef<T>` is a standalone interface, not extending Angular's `ResourceRef<T>`.

**Rationale:** `ResourceRef<T>` requires `value: WritableSignal<T>`. Our SWR wrapper uses `computed()` for `value` (read-only signal that shows stale data during loading). TypeScript doesn't allow narrowing `WritableSignal<T>` to `Signal<T>` in interface extension. Users write via `ref.set()` / `ref.update()`, not `ref.value.set()`.

---

## D-15 — Rename `provideDataCache` → `provideZiflux`

**Decision:** The global config provider is `provideZiflux()`, not `provideDataCache()`.

**Rationale:** Aligns with the library name. One provider, one name. The injection token is `ZIFLUX_CONFIG`.

---

## D-16 — `cachedMutation()` — mutation lifecycle with signals

**Decision:** Add `cachedMutation<A, R, C>()` — a factory that wraps any mutation (Observable or Promise) with signal-based `status`, `isPending`, `error`, `data`, and automatic cache invalidation.

**Rationale:**

- Every mutation in a store repeats ~13 lines of identical boilerplate: loading signal, error signal, try/catch, invalidation, finally
- `cachedMutation()` reduces this to 5 declarative lines while keeping full control (optimistic updates, rollback, success/error callbacks)
- `cache` is optional and structurally typed `{ invalidate(prefix: string[]): void }` — mutations without cache (email, workflow) still get `isPending`/`error` tracking
- `invalidateKeys` receives `(args, result)` — the server response can drive which keys to invalidate
- `mutate()` never rejects — errors are captured in the `error` signal, no unhandled Promise rejections
- Concurrent mutations: last-write-wins (simple, sufficient for v1)
- No injection context required — `signal()` works anywhere in Angular 21+

**Rejected alternatives:**
- TanStack-style `useMutation` hook → requires injection context, opinionated on caching
- Store-level `mutate()` helper → doesn't compose, can't be used declaratively as a class field

---

## D-17 — `anyLoading()` accepts `Signal<boolean>[]`, not `CachedResourceRef[]`

**Decision:** `anyLoading(...signals: Signal<boolean>[])` takes any boolean signals, not library-specific types.

**Rationale:** Maximally generic. Works with `CachedResourceRef.isLoading`, `CachedMutationRef.isPending`, or any user-created `Signal<boolean>`. Three lines of implementation, zero coupling.

**Rejected alternative:** `anyLoading(...refs: CachedResourceRef[])` → too narrow, can't mix resources and mutations.

---

## D-18 — Retry with exponential backoff is opt-in on `cachedResource`, not on `cachedMutation`

**Decision:** `retry` option is available on `cachedResource` only. `cachedMutation` does not support retry.

**Rationale:** Mutations have side effects (POST/PUT/DELETE). Silent retry is dangerous (double charge, double create). Retry on reads is safe — the server is idempotent. If users want mutation retry, they compose manually.

---

## D-19 — Polling uses `effect()` with `onCleanup`, not raw `setInterval`

**Decision:** `refetchInterval` is implemented via Angular's `effect()` with `onCleanup`.

**Rationale:** `effect()` ties the timer to the injection context lifecycle. Auto-cleans on destroy. For reactive intervals (signal-driven), `effect()` re-runs when the signal changes — no manual subscription management.

---

## D-20 — `cleanup()` does not bump cache version

**Decision:** `cleanup()` evicts expired entries but does not increment `#version`.

**Rationale:** GC evicts entries where `age > expireTime`. No active `cachedResource` should depend on expired data. Bumping version on GC would cause unnecessary reloads across all resources watching that cache.

---

## D-21 — `inspect()` is always available, not gated by `ngDevMode`

**Decision:** `inspect()` is a public method on `DataCache`, always available in production.

**Rationale:** It's an explicit method call, not automatic overhead. Devtools, console debugging, and custom monitoring all benefit from always-available introspection. Tree-shaking removes it if unused.

---

## D-22 — Auto-cleanup uses `DestroyRef` for cleanup

**Decision:** When `cleanupInterval` is set, `DataCache` uses `inject(DestroyRef)` + `setInterval` + `destroyRef.onDestroy()`.

**Rationale:** `DataCache` already runs in injection context (`inject(ZIFLUX_CONFIG)` in constructor). Adding `inject(DestroyRef)` with `onDestroy()` is the Angular-idiomatic way to manage timer lifecycle. Root-scoped caches live forever (no early cleanup). Test-scoped caches clean up when `TestBed` destroys the injector.

---

## D-23 — Devtools via `withDevtools()` feature, not config flag

**Decision:** Devtools capabilities (cache registry, console logging) are activated via `withDevtools()`, a feature function passed to `provideZiflux()`.

**Rationale:** Follows Angular's `provideRouter(routes, withDebugTracing())` pattern. Feature functions compose cleanly, tree-shake when unused, and match what TanStack Query Angular and NgRx Signal Store do. Zero runtime cost when not enabled — `DataCache` uses `inject(CacheRegistry, { optional: true })` and `inject(DevtoolsLogger, { optional: true })`, which return `null` when `withDevtools()` is absent.

**Usage:**
```typescript
provideZiflux({ staleTime: 60_000 }, withDevtools())
```

---

## D-24 — Devtools component auto-gates via `isDevMode()`, not manual guards

**Decision:** `ZifluxDevtoolsComponent` checks `isDevMode()` internally and renders nothing in production builds. The user drops `<ziflux-devtools />` once — no `@if` guard needed.

**Rationale:** Like Vercel's toolbar on preview deploys — the component decides visibility internally. Angular's `isDevMode()` is the standard runtime check tied to the build configuration (`ng build` vs `ng build --configuration production`). This eliminates a class of bugs where developers forget to remove devtools from production templates.

---

## D-25 — Remove `injectCachedHttp()` from public API

**Decision:** Remove `injectCachedHttp()`, `CachedHttpClient<T>`, and `CachedHttpRequestOptions` from the public API. API services use plain `HttpClient`. `cachedResource` handles all cache read/write. `DataCache.wrap()` and `DataCache.prefetch()` remain as low-level primitives.

**Rationale:**

- `injectCachedHttp` duplicated `DataCache.wrap()` (same `tap → cache.set` pattern)
- When used with `cachedResource`, the cache key had to be specified twice (API service + store) — source of silent bugs if they diverged
- `cachedResource` already writes to the cache after the loader resolves, making the `tap` write from `injectCachedHttp` a redundant double-write
- For prefetch, `DataCache.prefetch()` handles the cache write — `injectCachedHttp` was redundant there too
- Violated the lib's goal of crystal-clear, zero-learning-curve API

**Migration:** Replace `injectCachedHttp(cache)` with `inject(HttpClient)`. Cache population is handled by `cachedResource`. For prefetch, use `cache.prefetch(key, () => firstValueFrom(http.get(...)))`.

**Supersedes:** D-12

---

## D-26 — Add `maxEntries` with LRU eviction

**Decision:** `ZifluxConfig.maxEntries` is an optional soft limit. When `set()` pushes the entry count above `maxEntries`, the least recently used entry is evicted. `get()` promotes accessed entries to most-recently-used position using Map insertion-order reordering.

**Rationale:**
- SPAs with dynamic key cardinality (detail pages by ID) cause unbounded memory growth
- `cleanupInterval` only evicts expired entries — doesn't bound total count
- LRU is the right policy because frequently accessed entries (list pages) should survive while rarely visited details are evicted
- JavaScript `Map` preserves insertion order — `delete()` + `set()` = O(1) move-to-end

**Trade-off:** `get()` now does a `delete+set` when `maxEntries` is configured. This is O(1) but touches the Map on every read. Acceptable for cache hit paths.

---

## D-27 — Fix invalidate + in-flight race condition

**Decision:** `invalidate()` now clears matching in-flight `deduplicate()` promises. `cachedResource` guards `cache.set()` with an `abortSignal.aborted` check.

**Bug:** When `invalidate(['todos'])` was called while a `deduplicate(['todos'])` had a Promise in-flight, the post-invalidation loader reused the same pre-mutation Promise via deduplication. When it resolved, the stale data overwrote the cache — silently undoing the invalidation.

**Fix (two parts):**
1. `invalidate()` iterates `#inFlight` and deletes entries whose key matches the prefix. Subsequent `deduplicate()` calls start a fresh fetch instead of reusing the pre-mutation Promise.
2. `cachedResource` checks `abortSignal.aborted` before calling `cache.set()`. Angular's `resource()` aborts the previous loader when params change (version bump), so this prevents any aborted loader from writing stale data.

**Trade-off:** `invalidate()` now iterates both `#entries` and `#inFlight`. Both are small Maps in practice — negligible cost.

---

## D-29 — Use `Symbol('NO_VALUE')` sentinel in staleSnapshot

**Decision:** `cachedResource` internally uses a `Symbol('NO_VALUE')` sentinel instead of `undefined` to represent "no cached data" in the stale snapshot.

**Rationale:** When `T` includes `undefined` as a valid value (e.g., `DataCache<string | undefined>`), using `undefined` as both "no data" and "data is undefined" creates ambiguity. The sentinel makes the distinction type-safe. This is internal — the public `CachedResourceRef<T>.value` type is unchanged.

---

## D-28 — cachedMutation uses latest-wins by call order, not resolution order

**Decision:** `mutate()` tracks a monotonically increasing call counter. Only the most recently invoked `mutate()` updates reactive signals (`status`, `data`, `error`) and fires lifecycle callbacks (`onSuccess`, `onError`). Cache invalidation runs for all successful mutations regardless.

**Rationale:** With last-write-wins by resolution order, a slow earlier mutation could overwrite a faster later mutation's UI state — the user sees stale data from an earlier action. Latest-wins by call order ensures signals always reflect the most recent user intent. Cache invalidation must run for all successful mutations because the server state actually changed.

**Trade-off:** If the user needs the result of an earlier mutation, they must capture it from the `mutate()` return value before the next call. Signals only reflect the latest.

---

## D-30 — DataCache uses per-method generics, not instance-level generic

**Decision:** `DataCache` is no longer generic at the class level (`DataCache<T>`). Instead, each method that reads or writes data carries its own generic: `get<T>()`, `set<T>()`, `wrap<T>()`, `deduplicate<T>()`, `prefetch<T>()`. Internally the cache stores `unknown`; type safety comes from each call site.

**Rationale:**

- Real domains have mixed shapes in one cache: `Order[]` (list) + `Order` (detail). An instance-level `DataCache<Order>` forces `T` to be the same everywhere, making `loader: () => Observable<Order[]>` a type error.
- TanStack Query, SWR, and every modern caching library use per-query generics, not per-cache-instance generics. Alignment with prior art reduces surprise.
- The two internal casts (`entry.data as T` in `get`, `existing as Promise<T>` in `deduplicate`) are safe: the caller writes and reads the same key with the same `T`.
- v0.0.1 — no downstream consumers yet, so this is a free breaking change.

**What changed:**
- `CachedResourceOptions.cache` is `DataCache` (not `DataCache<T>`)
- `CacheRegistry` stores `Map<string, DataCache>` (not `DataCache<unknown>`)
- `cachedResource` defaults `params` to `() => ({})` when omitted, eliminating boilerplate for parameterless resources

**Supersedes:** D-11 (class is still `new DataCache()`, just no longer generic)

---

## Open questions (resolved)

- **Library name** — `ziflux` ✓ confirmed.
- **`DataCache` config override per instance** — ✓ Yes. Priority: constructor arg > global provider > defaults.
- **`prefetch()` on `DataCache` vs standalone function** — ✓ Method on `DataCache`.
- **RxJS interop** — ✓ `firstValueFrom()` used internally in `cachedResource`. No helper needed.
- **`cachedResource` staleSnapshot exposure** — ✓ Kept internal. No public API for it.
