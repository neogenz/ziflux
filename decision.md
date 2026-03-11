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

**Decision:** `cachedResource()` options follow the same shape as Angular's `resource()` — `params`, `loader`, with `cache` and `key` added.

**Rationale:** If you know `resource()`, you already know `cachedResource()`. No new mental model. The library feels like an Angular extension, not a separate framework.

**Key addition:** `key` — a static `string[]` or a function `(params) => string[]` that derives the cache key from params. This enables dynamic keys (e.g. per-filter, per-id) without any extra setup.

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

## Open questions (resolved)

- **Library name** — `ziflux` ✓ confirmed.
- **`DataCache` config override per instance** — ✓ Yes. Priority: constructor arg > global provider > defaults.
- **`prefetch()` on `DataCache` vs standalone function** — ✓ Method on `DataCache`.
- **RxJS interop** — ✓ `firstValueFrom()` used internally in `cachedResource`. No helper needed.
- **`injectCachedHttp` return type** — ✓ Typed as `CachedHttpClient<T>`.
- **`cachedResource` staleSnapshot exposure** — ✓ Kept internal. No public API for it.
