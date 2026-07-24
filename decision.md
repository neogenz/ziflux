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

## D-31 — Return stale snapshot on error status

**Date:** 2026-03-14

The `value` computed in `cachedResource` now returns the stale snapshot when `status === 'error'` and cached data exists, instead of falling through to `res.value()` (which Angular sets to `undefined` on error).

This is standard SWR behavior — TanStack Query preserves previous data on error. Without this, users lose displayed data when background revalidation fails: the screen goes blank instead of keeping the last good data with an error banner.

The fix adds `|| status === 'error'` to the existing status check (line 156). `isStale` and `isInitialLoading` are unchanged — they describe "revalidation in progress", not data freshness. Users detect error-with-cached-data via `error()` + `hasValue()`.

---

## D-32 — `invalidateKeys` runs after `onSuccess` in `cachedMutation`

**Date:** 2026-03-14

`invalidateKeys` was firing before `onSuccess` in `cachedMutation.mutate()`, destroying optimistic data set by `onMutate` before `onSuccess` could reconcile it with the server response. This made the standard `onMutate → onSuccess → invalidate` pattern (from TanStack Query) impossible to use with `invalidateKeys`.

Fixed by swapping the two blocks: `onSuccess` (inside the `thisCallId === callCounter` guard) now runs first, then `invalidateKeys` (unconditional, preserving outdated-mutation invalidation behavior per D-28).

---

## D-33 — `set()` and `update()` write to DataCache, not just Angular resource

**Date:** 2026-03-15

`cachedResource.set()` and `update()` only wrote to the Angular `resource` (`res.set()`), not to the `DataCache`. When `cache.version()` bumped from invalidating *any* key on that cache, the `staleSnapshot` `linkedSignal` re-ran, read the OLD data from the DataCache, and overwrote the optimistic value — causing a UI flicker back to stale data.

Fixed by writing the new value to `cache.set(resolveKey(params()), value)` before `res.set()`. When the loader re-runs after a version bump, `cache.get(key)` finds the optimistic value with a fresh timestamp and returns it — the UI stays stable. Guarded with `params() !== undefined` so idle-state `set()`/`update()` still works without a cache key.

---

## D-34 — Audit-driven robustness: mutation callbacks, reset, loader guard

**Date:** 2026-03-15

Systematic audit (4 parallel code reviewers) found 4 bugs in `cachedMutation` and `cachedResource`. All verified against TanStack Query v5 behavior — our fixes are stricter than TanStack's defaults.

**Bug 1 — `onSuccess` throw prevents `invalidateKeys`:** If `onSuccess` threw, the exception jumped to the catch block and `invalidateKeys` never ran. The mutation succeeded on the server but the cache stayed stale. Fixed by wrapping `onSuccess` in try/catch. TanStack Query has the same issue — they recommend `onSettled` or global callbacks as workaround. We guarantee invalidation always runs.

**Bug 2 — `onError` throw → unhandled rejection:** Violated the "`mutate()` never rejects" contract. Fixed by wrapping `onError` in try/catch. The original mutation error is already captured in the `error` signal.

**Bug 3 — `reset()` doesn't cancel in-flight mutations:** `reset()` set signals to idle but didn't increment `callCounter`. When the in-flight mutation resolved, it overwrote the reset state. Fixed with `callCounter++` at the top of `reset()`. TanStack Query has the same race condition.

**Bug 4 — Stale loader overwrites optimistic cache entry:** When a loader was in-flight and `set()`/`update()` wrote an optimistic value (D-33), the loader's `cache.set(k, data)` could overwrite the optimistic entry on resolution. Fixed by checking `res.status() === 'local'` before the cache write and returning the optimistic value to Angular. This aligns with TanStack's `cancelQueries()` pattern but is automatic — zero ceremony for the developer. Angular 21's `resource.set()` also aborts in-flight loaders natively, making this a defense-in-depth guard.

---

## D-35 — Preserve in-flight promises across invalidation (reverses D-27 clearing)

**Date:** 2026-03-15

**Bug:** Rapid sequential invalidations from `cachedMutation` caused O(n×k) redundant network requests instead of O(k). When multiple mutations for the same resource completed in rapid succession (~150-250ms apart), each `invalidate()` call deleted the in-flight dedup promise, forcing a redundant fetch on the next `deduplicate()` call.

**Root cause (D-27):** D-27 made `invalidate()` clear matching `#inFlight` entries to prevent pre-mutation data from persisting via dedup. This was correct for a single invalidation but caused a dedup miss storm under rapid sequential invalidations.

**Fix (three parts):**
1. `invalidate()` no longer clears `#inFlight` entries. The `.finally()` on the promise still cleans up after settlement.
2. `deduplicate()` tracks `staleAtCreation` — whether the cache entry was already stale when the fetch started. On dedup hit: if the in-flight was started while stale (`staleAtCreation: true`) or the entry is still fresh (`!isStale`), reuse it. If the in-flight was started while fresh but the entry is now stale (invalidated during fetch), discard it and start a new fetch. This prevents pre-mutation data from being served as fresh while still allowing rapid post-invalidation dedup.
3. `cachedResource` loader catches `AbortError` on dedup hits. When Angular's `resource()` aborts the previous loader (on param change from version bump), the dedup'd promise may reject with `AbortError` if the user's loader honors `abortSignal`. The loader retries via `deduplicate()` with the current (non-aborted) signal.

**Trade-off:** None — this approach handles both the pre-mutation and rapid-invalidation cases correctly. Pre-mutation in-flight fetches are discarded (MISS), post-invalidation fetches are reused (HIT).

---

## D-36 — Fix clearDirty prefix mismatch (two-set dirty tracking)

**Date:** 2026-03-17

**Bug:** `clearDirty(key)` was a no-op when invalidation used a broader prefix. `invalidate(['budget'])` stored prefix `["budget"` in `#dirtyKeys`, but `clearDirty(['budget', 'may'])` tried to delete `["budget","may"` — a different string. The dirty flag leaked forever, causing all prefetches under the prefix to be marked stale indefinitely (performance leak, not correctness bug).

**Root cause:** Single Set (`#dirtyKeys`) stored prefixes from `invalidate()` but `clearDirty()` tried exact-match deletion with a different serialization (full key vs. prefix). The tests only covered same-key scenarios (`invalidate(['a'])` + `clearDirty(['a'])`), missing the prefix mismatch.

**Fix:** Two-set approach:
- `#dirtyPrefixes: Set<string>` — prefix strings from `invalidate()` (unchanged behavior)
- `#resolvedKeys: Set<string>` — full serialized keys from `clearDirty()` (exclusion set)
- `#isDirty(serialized)`: returns `false` if in `#resolvedKeys`, then checks `#dirtyPrefixes`
- `invalidate(prefix)`: adds to `#dirtyPrefixes` and clears matching `#resolvedKeys` (re-dirties)
- `clearDirty(key)`: adds to `#resolvedKeys` (marks one key clean without affecting siblings)

**Trade-off:** One extra Set and an `O(r)` scan on `invalidate()` (where `r` = resolved keys, typically small). Gains per-key granularity — `clearDirty(['budget', 'may'])` clears May without clearing June.

---

## D-37 — Naming: `cachedResource` / `cachedMutation` (v0), `swrResource` / `swrMutation` candidate (v1)

**Date:** 2026-05-08

**Decision:** Keep `cachedResource` and `cachedMutation` for v0.x. Flag `swrResource` / `swrMutation` as a v1 rename candidate, gated on user feedback.

**Context:** External feedback flagged the API shape as "TanStack-adjacent" — mutation lifecycle (`onMutate → mutationFn → onSuccess → invalidateKeys`) and `invalidateKeys` callback mirror React Query. Naming is part of that surface.

**Options considered:**

- `withCachedResource` — collides with the `with*` feature-provider convention (`withDevtools`, `withRoutes`).
- `swrResource` / `swrMutation` — names the **semantic** (SWR) instead of the **side-effect** (cached). Tighter (8 chars vs 14). Aligns with the landing tagline "SWR caching for `resource()`".
- Keep current — plain-English, accurate, already on npm at v0.0.12.

**Rationale for keeping (v0):**

- Cost of break = sweep across README, llms.txt, decision log, skill files, landing site, example app.
- Renaming does not address the actual "TanStack copy" critique, which targets API **shape**, not API **name**.
- `cachedResource` is unambiguous and self-documenting today.

**Rationale for flagging (v1):**

- `swrResource` is a strict improvement on naming — names the contract, not the implementation.
- v1 is the natural break point; ahead-of-time signaling lets early adopters plan migration.

**Concrete intent:** v1 ships both names with the `cached*` aliases marked `@deprecated`, with a one-version overlap before removal. Trigger conditions for the rename: ≥2 unsolicited "what's the difference between this and TanStack" issues, OR a downstream library asks about naming alignment.

---

## D-38 — Cross-resource optimistic sync via decoupled `_dataVersion` signal

**Date:** 2026-05-09

**Decision:** Introduce an internal `_dataVersion` signal on `DataCache` that bumps on every content change (`set`, `invalidate`, `clear`). `cachedResource.staleSnapshot.source` reads `_dataVersion` instead of `version`, and the `value` computed prefers the snapshot over `res.value()` whenever the resource is not in `'local'` state. Keep `version` semantics unchanged (bumps on `invalidate`/`clear` only) so `resource.params` continues to reload only on invalidations.

**Context:** With write-through `set()`/`update()` (D-33), the optimistic value is correctly stored in the cache, but a sibling `cachedResource` instance with the same `cacheKey` did not reflect it. Its `staleSnapshot.source` only re-evaluated on `cache.version()` bumps, and `version` did not change on a plain `set`. Even when the snapshot recomputed, the `value` computed only consulted it during `loading`/`reloading`/`error` states — so a sibling sitting in `resolved` state kept rendering its own stale `res.value()`.

**Options considered:**

- **Bump `version` on `set` too.** Rejected — would cascade reload across all resources observing the cache (each loader-side `cache.set` bumps `version`, every other resource re-evals `params` and reloads, their loaders complete with `cache.set`, …). D-20 already documents this exact trap for `cleanup()`.
- **Per-key signal map.** Rejected — heavier (a signal per key, lifecycle to manage), unnecessary granularity for the use case.
- **Document "set is local-only".** Rejected — leaves a real footgun in the API. Two sibling resources sharing a key is a normal pattern (multiple components reading the same domain entity), not an edge case.
- **Decoupled `_dataVersion` (chosen).** Two signals: `version` for invalidation (drives reload), `_dataVersion` for write notifications (drives snapshot recompute, no reload). Plus tweak `value` to consult the snapshot whenever the local resource is not actively writing.

**Why this works without cascading:**

- Loader-side `cache.set` bumps `_dataVersion` only. Snapshots in other resources recompute and read the cache — no signal in the recompute chain triggers a reload. Stops cleanly.
- An optimistic `ref.set(v)` bumps `_dataVersion` (via `cache.set`) but **not** `version`. The writing resource sets its own status to `'local'` and the `value` computed special-cases `'local'` to return `res.value()`, so the writer doesn't flicker.
- Sibling resources see their snapshot update to `v`. Their `value` computed returns `snapshot` over `res.value()` since they are not in `'local'`. Render updates instantly, no fetch.
- `invalidate`/`clear` continue to bump both signals, preserving every prior behavior.

**API impact:** `_dataVersion` is marked `/** @internal */` and stripped from generated `.d.ts` via `stripInternal: true` in `tsconfig.lib.json`. Zero new public surface. Runtime contract between `DataCache` and `cachedResource` only.

**`value` computed change:** Previously consulted `staleSnapshot` only in `loading`/`reloading`/`error`. Now consults it whenever status is not `'local'`, falling back to `res.value()` if the snapshot is `NO_VALUE`. In normal flow (post-loader), the snapshot tracks `res.value()` because the loader writes the same data to the cache via `cache.set`, so no behavior change for non-shared keys.

**Trade-off:** None observed. The writer's UX is preserved (no reload, no flicker), siblings get instant propagation, no cascade, no cross-resource test churn.

---

## D-39 — Angular 22 peer range replaces v21, it does not extend it

**Decision:** `peerDependencies` moves from `@angular/core ^21.0.0` to `^22.0.0`. One major supported at a time. Consumers still on v21 stay on `0.0.13`.

**Rationale:** The emitted partial declarations link on Angular 17+, so a `^21.0.0 || ^22.0.0` range would install and probably run. But CI compiles, lints and runs the 227 tests against a single Angular version, so a dual range would advertise support the pipeline never exercises. A published peer range is a promise, not a guess.

**Rejected alternative:** Dual range `^21.0.0 || ^22.0.0` for a softer upgrade path. Rejected — untested compatibility surfaces as a consumer's runtime bug, and the library is pre-1.0 with a well-known consumer set.

**Collateral:** the v22 toolchain forces TypeScript 6.0 (`@angular/compiler-cli` peer `>=6.0 <6.1`), hence `typescript-eslint` 8.65+. Two `ng update` migrations were deliberately not kept: `change-detection-eager`, because v22's OnPush default is the target rather than a regression to paper over, and `strict-safe-navigation-narrow`, because suppressing `nullishCoalescingNotNullable` / `optionalChainNotNullable` would hide the dead assertions they exist to find — one of which was real, in `cachedResource`.

---

## D-40 — Invalidation is a flag on the entry, not a shift of its timestamp

**Decision:** `invalidate()` sets `entry.invalidated = true` instead of backdating `createdAt`. `get()` computes `fresh` as `age < staleTime && !invalidated`. A `set()` clears the flag. In-flight fetches carry the same idea: `invalidate()` marks matching in-flight records `raced`, a raced fetch is never reused by a later caller, and its result is stored flagged rather than fresh. The `#dirtyPrefixes` / `#resolvedKeys` sets, `clearDirty()` and `staleAtCreation` are all deleted.

**Rationale:** backdating measured staleness against the *cache-level* `staleTime`, but `cachedResource` reads with its own per-resource override. The two disagreed in both directions:

- Override larger than the cache's (`staleTime: 120_000` on a 30s cache): the entry was backdated to an age of 30 001 ms, still inside the resource's 120 s window, so the loader short-circuited on a "fresh" entry and **the invalidation was silently lost**.
- Override smaller in `expireTime` (`expireTime: 2_000`): the backdated age exceeded it, so `get()` **deleted the entry** — the exact opposite of D-08's "invalidate marks stale, never deletes".

A flag is independent of every time window, so neither edge exists. It also subsumes the dirty-prefix machinery: "was this data fetched before the invalidation?" is answered by the in-flight record itself, which self-deletes on settle, instead of by two `Set`s that grew for the process lifetime.

**Cold-cache race (fixed by the same mechanism):** the old reuse rule was `staleAtCreation || !isStale`, and `isStale` read `false` when no entry existed. So on a cold cache an in-flight fetch was *always* reusable, including after an `invalidate()` — a mutation landing during the initial load left pre-mutation data stored as fresh for a full `staleTime`. Now that fetch is `raced`, so it is neither reused nor written as fresh.

**Ordering:** a raced fetch that resolves *after* a newer fetch already wrote would otherwise overwrite newer data with older. Records replaced by a newer fetch are marked `superseded` and their late result is dropped.

**Trade-off:** a burst of N mutations during one in-flight fetch now costs up to N requests instead of one, because every running fetch predates the mutation that followed it. This is the correct price: the single-request behavior it replaces was serving data known to be obsolete. In a `cachedResource` the superseded requests are aborted (D-41), so only the last one completes.

**Behavior change:** a fetch started *after* an invalidation is now stored **fresh**. Previously any `prefetch()` under an invalidated prefix stayed stale until a `cachedResource` loader called `clearDirty()`, which forced a needless extra revalidation of data that already reflected the mutation.

---

## D-41 — Observable loaders bridge through an abort-aware helper, not `firstValueFrom()`

**Decision:** `cachedResource` subscribes to an Observable loader manually and unsubscribes when `abortSignal` fires. `firstValueFrom()` is no longer used *in `cachedResource`*. `cachedMutation` still uses it, deliberately: a mutation has no `abortSignal` to honor, and cancelling a write mid-flight is not a behavior the API offers.

**Rationale:** `firstValueFrom()` has no `AbortSignal` parameter — it stays subscribed until the first emission whatever the resource does. The documented primary loader shape is `({ params }) => this.http.get(...)`, so an Angular abort (params changed, resource destroyed) left the HTTP request running to completion. Consequences: a typeahead leaked one live request per keystroke, and `destroy()` cancelled nothing. Angular's own `rxResource` unsubscribes on abort; ziflux claims to mirror `resource()` and did not.

**Behavior:** the source is piped through `take(1)`, so a first emission tears it down and only the abort path unsubscribes explicitly. Abort rejects with `abortSignal.reason` when it is an `Error`, otherwise a standard `AbortError` `DOMException`. Completing without emitting rejects with a named error rather than rxjs `EmptyError` — rxjs deprecates constructing that class ("internal implementation detail"), and `cachedResource: the loader Observable completed without emitting` says more at a debugger than `EmptyError` does.

**Collateral:** the abort-reason construction, previously duplicated inline in `retryWithBackoff` with two eslint suppressions, is now one `abortReason()` helper with none. Supersedes the CLAUDE.md rule naming `firstValueFrom()` as the bridge.

---

## D-42 — `reload()` and `refetchInterval` bypass the freshness check

**Decision:** a `force` flag, set by `reload()` and by each polling tick, makes the next loader run skip the `entry?.fresh` short-circuit.

**Rationale:** the loader's first act is to return cached data when the entry is fresh. `reload()` went through that path, so within `staleTime` it issued **zero** requests and resolved from cache — while its own JSDoc promised "triggers an immediate refetch, bypassing staleness checks". The example app's Reload button was a no-op for 5 s after every fetch.

Polling inherited the same bug through `res.reload()`: `refetchInterval: 3_000` under `staleTime: 5_000` produced a request roughly every 6 s (only the ticks that happened to land on a stale entry), not every 3 s. A configured poll interval must mean the network interval.

**Trade-off:** none. Both entry points are explicit user intent to refetch; the freshness short-circuit exists for reactive re-runs (params re-eval, version bumps), which still take it.

---

## D-43 — Recurring timers are browser-only

**Decision:** `DataCache`'s `cleanupInterval` sweep and `cachedResource`'s `refetchInterval` effect are created only when `isPlatformBrowser()`. `PLATFORM_ID` is injected `{ optional: true }` and defaults to browser.

**Rationale:** both timers started during SSR. On zone.js-based SSR a recurring `setInterval` keeps `ApplicationRef.isStable` false forever, so rendering hangs until the timeout for any app that configures either option — and `cleanupInterval` runs from a `providedIn: 'root'` service constructor, i.e. on every request. On zoneless SSR a render slower than `refetchInterval` reload-loops. `ZifluxDevtoolsComponent` already guarded this way; the cache and the resource did not.

**Optional injection:** `DataCache` is documented as constructible in any injection context, including a bare `Injector.create()` that provides no `PLATFORM_ID`. Requiring the token would have thrown NG0201 there, so absence is treated as browser — the pre-existing behavior.

---

## D-44 — `cache` and `invalidateKeys` must be passed together

**Decision:** `cachedMutation()` throws at creation, in dev mode only, when exactly one of `cache` / `invalidateKeys` is provided. Invalidation failures are caught and reported instead of rewriting the mutation's outcome.

**Rationale:** the invalidation branch reads `if (invalidateKeys && cache)`, but the two options are independently optional. Passing `invalidateKeys` and forgetting `cache` (or the reverse) produced a mutation that succeeded, fired its callbacks, and invalidated nothing — a stale UI with no error, no warning, nothing in devtools. It is the most likely misconfiguration in the whole API and it was the quietest.

**Rejected alternative:** collapsing the pair into a single `invalidate` option. It reads better, but it is a breaking change to the documented API for a problem a dev-mode guard solves, and `invalidateKeys(args, result)` returning keys is what makes result-derived invalidation (`todo => [['todos', String(todo.id)]]`) possible.

**Isolation:** `invalidateKeys()` or `cache.invalidate()` throwing used to land in the mutation's own `catch`, flipping a succeeded mutation to `error` and firing `onError` after `onSuccess` had already run for the same call. The invalidation loop now has its own `try`/`catch`: status stays `success`, and dev mode logs the failure.

---

## D-45 — Close the measured `resource()` parity gaps

**Decision:** `CachedResourceRef.error` is typed `Signal<Error | undefined>`, `hasValue()` is a type guard that narrows `value` to `Signal<T>`, and `cachedResource()` accepts `defaultValue` with the same overload pair Angular uses.

**Rationale:** "mirrors `resource()` exactly" (D-04) is the headline claim, and three details contradicted it against Angular 22:

- `error: Signal<unknown>` — the underlying `res.error` is already `Signal<Error | undefined>` (`@angular/core` `BaseWritableResource`), so ziflux widened a type for nothing and forced consumers to cast.
- `hasValue(): boolean` — Angular declares `hasValue(): this is ResourceRef<Exclude<T, undefined>>`, so `if (r.hasValue())` narrows. ziflux returned a plain boolean and narrowed nothing.
- no `defaultValue`, while `resource()` overloads on it: with the option, the ref's value is never `undefined`.

**Narrowing shape:** Angular carries `| undefined` in the ref's generic (`ResourceRef<T | undefined>`), so `Exclude<T, undefined>` is enough. `CachedResourceRef<T>` instead declares `value: Signal<T | undefined>` with `T` as the data type, so the equivalent guard is `Omit<CachedResourceRef<T>, 'value'> & { readonly value: Signal<T> }`. The plain intersection without `Omit` does **not** narrow — the wide `value` signature stays first in overload order and `value()` still returns `T | undefined`. Both spec assertions are type-level and fail the build if that regresses.

**`hasValue()` implementation:** now literally `value() !== undefined`, which is what its own doc always claimed. The previous status-based expression was equivalent for every reachable state but had to be re-derived by hand for `defaultValue`.

**Trade-off:** one new option and two changed type signatures. `error` narrowing from `unknown` to `Error | undefined` is technically breaking for anyone who annotated it as `unknown`, but pre-1.0 and strictly more precise.

---

## D-46 - Focus and reconnect revalidation are opt-in listeners, not a background service

**Decision:** `cachedResource` accepts `refetchOnWindowFocus` and `refetchOnReconnect`. Both default to off. When enabled in a browser, the resource listens to `visibilitychange` on `document` and `online` on `window`, and calls the resource's own `reload()` on each.

**Rationale:** Revalidating on return is the behavior people expect from a stale-while-revalidate cache, and it belongs to the data lifecycle rather than to state management. Two event listeners cover it, so there is no scheduler, no shared service, and nothing new to inject. The option names match TanStack Query's, which means anyone arriving from that library can guess them.

**Why they respect `staleTime`:** the handler calls the internal `res.reload()`, not the public `reload()`. The public one forces a network round trip by contract (D-42), which would turn every tab switch into a request. The internal path still runs the loader's freshness check, so an entry inside its `staleTime` is served from cache and costs nothing. A stale entry refetches, which is the point.

**Why opt-in:** a library that starts refetching on events the developer never configured is surprising, and the cost lands on someone else's API. Defaulting to off also keeps the behavior of every existing call site unchanged.

**Browser-only:** guarded by the same `isPlatformBrowser` check as the polling timer (D-43). `document` and `window` do not exist during server rendering.

**Cleanup:** listeners are removed both by `DestroyRef.onDestroy` and by an explicit `destroy()` call, since the two can happen independently.

---

## Open questions (resolved)

- **Library name** — `ziflux` ✓ confirmed.
- **`DataCache` config override per instance** — ✓ Yes. Priority: constructor arg > global provider > defaults.
- **`prefetch()` on `DataCache` vs standalone function** — ✓ Method on `DataCache`.
- **RxJS interop** — superseded by D-41: `cachedResource` bridges Observables with an abort-aware helper, because `firstValueFrom()` ignores `abortSignal`.
- **`cachedResource` staleSnapshot exposure** — ✓ Kept internal. No public API for it.
