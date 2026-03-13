# ziflux API Reference

Complete type signatures, configuration options, and edge-case behaviors for every ziflux export.

## Table of Contents
- [DataCache](#datacache)
- [cachedResource](#cachedresource)
- [cachedMutation](#cachedmutation)
- [provideZiflux and withDevtools](#provideziflux-and-withdevtools)
- [anyLoading](#anyloading)
- [CacheRegistry](#cacheregistry)
- [ZifluxDevtoolsComponent](#zifluxdevtoolscomponent)
- [Types](#types)

---

## DataCache

In-memory SWR cache engine. Handles key serialization, freshness evaluation, LRU eviction, request deduplication, and automatic cleanup.

### Construction

```typescript
new DataCache(config?: DataCacheOptions)
```

**Requires injection context** — calls `inject(ZIFLUX_CONFIG, { optional: true })` internally. Instantiate in class field initializers, constructors, or `runInInjectionContext()`.

If `CacheRegistry` is available (via `withDevtools()`), the cache auto-registers on construction and auto-unregisters via `DestroyRef.onDestroy()`.

### DataCacheOptions

```typescript
interface DataCacheOptions {
  staleTime?: number        // ms before entry becomes stale. Default: 30_000
  expireTime?: number       // ms before entry is evicted on read. Default: 300_000
  cleanupInterval?: number  // ms between automatic eviction sweeps. undefined = disabled
  maxEntries?: number       // LRU capacity cap. undefined = no limit
  name?: string             // human-readable label for devtools. Auto-generated as 'cache-N' if omitted
}
```

**Validation rules (constructor throws on violation):**
- `staleTime`, `expireTime`, `cleanupInterval`, `maxEntries`: must be finite numbers >= 0
- `maxEntries`: must be an integer (2.5 throws)
- `staleTime <= expireTime` (strict)
- `staleTime === 0` is valid (every read is stale, always triggers background refetch)
- `staleTime === expireTime` is valid

**Config priority:** constructor arg > `provideZiflux()` global > hardcoded defaults.

### Methods

#### `get<T>(key: string[], options?): { data: T; fresh: boolean } | null`

Returns cached data with freshness flag. Returns `null` if:
- Key not found
- Entry age > `expireTime` (lazy eviction: entry is deleted on this read)

Optional per-call overrides: `{ staleTime?: number; expireTime?: number }` — takes precedence over instance config.

When `maxEntries` is configured, a `get()` hit moves the entry to most-recently-used position (Map delete+set).

#### `set<T>(key: string[], data: T): void`

Writes or overwrites an entry, resetting `createdAt` to `Date.now()`.
Triggers LRU eviction of the oldest entry if `size > maxEntries`.

#### `invalidate(prefix: string[]): void`

Marks all entries whose serialized key starts with `JSON.stringify(prefix).slice(0, -1)` as stale.

Internals:
- Sets `createdAt` to `Date.now() - staleTime - 1` using `Math.min` clamping
- **Idempotent**: repeated calls do not push the entry further into the past or cause expiry
- Clears matching in-flight `deduplicate()` promises (prevents stale writes after invalidation)
- Bumps `version` signal
- Empty prefix `[]` is explicitly a no-op

**Prefix matching safety:** `invalidate(['order'])` does NOT match `['orders']` or `['orderDetails']`. The JSON prefix `["order"` won't match `["orders"`.

#### `deduplicate<T>(key: string[], fn: () => Promise<T>): Promise<T>`

Ensures at most one in-flight request per key. If a Promise for the same key is pending, returns the existing Promise without calling `fn`. Cleans up on settle (resolve or reject).

#### `prefetch<T>(key: string[], fn: () => Promise<T>): Promise<void>`

Eagerly fetches and stores data. Uses `deduplicate()` internally — concurrent prefetch calls for the same key collapse into one request.

#### `wrap<T>(key: string[], obs$: Observable<T>): Observable<T>`

Returns the same Observable with a `tap` side effect calling `set(key, data)` on each emit. Bridges RxJS `HttpClient` calls into the cache.

#### `clear(): void`

Removes all entries and all in-flight deduplication state. Bumps `version`.

#### `cleanup(): number`

Evicts all entries where age > `expireTime`. Does NOT bump `version`. Returns count of evicted entries. Called automatically on `cleanupInterval` when configured.

#### `inspect(): CacheInspection<unknown>`

Returns a point-in-time snapshot for devtools/debugging. Always available (no dev-mode gate).

### Properties

```typescript
readonly name: string             // 'cache-N' if not provided
readonly version: Signal<number>  // bumps on invalidate() and clear()
readonly staleTime: number        // resolved effective value
readonly expireTime: number       // resolved effective value
```

### Internal Key Serialization

Keys are `string[]` serialized via `JSON.stringify()`. The internal Map uses the serialized string as key.

```typescript
// ['orders', 'list'] → '["orders","list"]'
// ['orders', 'details', '42'] → '["orders","details","42"]'
```

---

## cachedResource

Angular `resource()` with SWR caching, request deduplication, retry, and polling.

### Signature

```typescript
function cachedResource<T, P extends object>(
  options: CachedResourceOptions<T, P>
): CachedResourceRef<T>
```

**Requires injection context.** The underlying `resource()` and optional polling `effect()` are owned by the calling injector and destroyed with it.

### CachedResourceOptions<T, P>

```typescript
interface CachedResourceOptions<T, P extends object> {
  cache: DataCache                                            // required
  cacheKey: string[] | ((params: NoInfer<P>) => string[])    // required
  params?: () => P | undefined                               // optional, defaults to () => ({})
  loader: (ctx: { params: P; abortSignal: AbortSignal }) => Observable<T> | Promise<T>  // required
  staleTime?: number          // per-resource override (ms)
  expireTime?: number         // per-resource override (ms)
  retry?: number | RetryConfig  // optional
  refetchInterval?: number | (() => number | false)  // optional polling
}
```

**Key behaviors:**
- `params` returning `undefined` suspends the resource (status: `'idle'`, loader never called)
- `params` omitted defaults to `() => ({})` — resource loads immediately
- `cacheKey` as function receives resolved params (the primary pattern for dynamic keys)
- `loader` can return `Observable<T>` (converted via `firstValueFrom`) or `Promise<T>`
- `staleTime`/`expireTime` passed to `cache.get()` as per-call overrides

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries: number
  baseDelay?: number   // default: 1000ms
  maxDelay?: number    // default: 30_000ms
  retryIf?: (error: unknown) => boolean  // default: () => true
}
```

Shorthand: `retry: 3` expands to `{ maxRetries: 3, baseDelay: 1000, maxDelay: 30_000 }`.

Retry uses exponential backoff with jitter: `Math.random() * Math.min(maxDelay, baseDelay * 2^attempt)`.
AbortSignal is respected during retry delays — destroy cancels pending retries.

### refetchInterval

- Static `number`: polls every N ms
- Function `() => number | false`: reactive polling. Wraps in an `effect()` — a signal-driven function restarts the timer when signals change. Return `false` to stop polling.

### CachedResourceRef<T>

```typescript
interface CachedResourceRef<T> {
  readonly value: Signal<T | undefined>
  readonly status: Signal<ResourceStatus>
  readonly error: Signal<unknown>
  readonly isLoading: Signal<boolean>
  readonly isStale: Signal<boolean>
  readonly isInitialLoading: Signal<boolean>
  readonly hasValue: () => boolean
  reload(): boolean
  destroy(): void
  set(value: T): void
  update(updater: (value: T | undefined) => T): void
}
```

**Signal semantics:**
- `value` — SWR-enhanced computed: during `'loading'`/`'reloading'`, returns stale snapshot if available via `linkedSignal`
- `isLoading` — true during any fetch (initial or revalidation)
- `isStale` — true when stale data is displayed while background fetch runs
- `isInitialLoading` — true ONLY on cold cache (no prior data). **Use this for spinners.**
- `set()`/`update()` — optimistic updates. Status becomes `'local'`. Does NOT write to cache.

**CachedResourceRef does NOT extend ResourceRef** — `value` is `Signal<T>` (read-only), not `WritableSignal<T>`.

### Internal Execution Flow

1. `linkedSignal` captures stale snapshot when `params()` or `cache.version()` changes
2. `resource()` params factory reads both user params and `cache.version()` → cache invalidation triggers reload
3. Loader: checks `cache.get(key)` — fresh? return immediately. Otherwise `cache.deduplicate(key, loaderFn)` → on resolve, `cache.set(key, data)` only if `!abortSignal.aborted`
4. `value` computed: during loading/reloading, returns stale snapshot if available

---

## cachedMutation

Mutation wrapper with signal-based status, cache invalidation, and optimistic update support.

### Signature

```typescript
function cachedMutation<A = void, R = void, C = void>(
  options: CachedMutationOptions<A, R, C>
): CachedMutationRef<A, R>
```

**No injection context required.**

### CachedMutationOptions<A, R, C>

```typescript
interface CachedMutationOptions<A = void, R = void, C = void> {
  mutationFn: (args: A) => Observable<R> | Promise<R>       // required
  cache?: { invalidate(prefix: string[]): void }            // optional, structurally typed
  invalidateKeys?: (args: A, result: R) => string[][]       // after success
  onMutate?: (args: A) => C | Promise<C>                    // before mutationFn, return = context
  onSuccess?: (result: R, args: A) => void                  // after invalidation
  onError?: (error: unknown, args: A, context: C | undefined) => void  // receives context for rollback
}
```

**Lifecycle order:**
- Success: `onMutate` → `mutationFn` → cache invalidation → signal updates → `onSuccess`
- Error: `onMutate` → `mutationFn` (throws) → signal updates → `onError(err, args, context)`

`cache` is structurally typed — any `{ invalidate(prefix: string[]): void }` works, not just `DataCache`.

### CachedMutationRef<A, R>

```typescript
interface CachedMutationRef<A, R> {
  mutate(...args: A extends void ? [] : [args: A]): Promise<R | undefined>
  readonly status: Signal<CachedMutationStatus>
  readonly isPending: Signal<boolean>
  readonly error: Signal<unknown>
  readonly data: Signal<R | undefined>
  reset(): void
}
```

**Critical:** `mutate()` **never rejects**. Errors captured in `error` signal. Returns `undefined` on error, `R` on success.

### Concurrent Mutation Semantics

Latest-wins by **call order** (monotonic counter), not resolution order:
- All successful mutations invalidate the cache (server state changed)
- Only the last-invoked call updates signals and fires `onSuccess`
- Earlier calls' results are silently dropped from signals

---

## provideZiflux and withDevtools

### provideZiflux

```typescript
function provideZiflux(
  config?: Partial<ZifluxConfig>,
  ...features: ZifluxFeature[]
): EnvironmentProviders
```

Called once in `app.config.ts`. Registers `ZIFLUX_CONFIG` injection token.

### withDevtools

```typescript
function withDevtools(config?: DevtoolsConfig): ZifluxFeature
```

```typescript
interface DevtoolsConfig {
  logOperations?: boolean  // default: true — logs SET, INVALIDATE, EVICT, CLEAR, DEDUP
}
```

Provides `CacheRegistry` and `DevtoolsLogger`. Without `withDevtools()`, these are `null` via `inject(..., { optional: true })` — zero runtime cost when disabled.

### ZIFLUX_CONFIG

```typescript
const ZIFLUX_CONFIG = new InjectionToken<ZifluxConfig>('ZIFLUX_CONFIG')
```

Useful for testing: `{ provide: ZIFLUX_CONFIG, useValue: { staleTime: 100, expireTime: 1000 } }`.

---

## anyLoading

```typescript
function anyLoading(...signals: Signal<boolean>[]): Signal<boolean>
```

3-line `computed(() => signals.some(s => s()))`. No injection context. Works with `CachedResourceRef.isLoading`, `CachedMutationRef.isPending`, or any `Signal<boolean>`.

Zero args returns `signal(false)`.

---

## CacheRegistry

Provided by `withDevtools()`. Signal-reactive registry of all active caches.

```typescript
@Injectable()
class CacheRegistry {
  readonly caches: Signal<Map<string, DataCache>>
  register(cache: DataCache): void
  unregister(cache: DataCache): void
  inspectAll(): { name: string; inspection: CacheInspection<unknown> }[]
}
```

Every `register`/`unregister` creates a new Map reference (Angular signals compare by reference).

---

## ZifluxDevtoolsComponent

Selector: `<ziflux-devtools />`. Standalone, `OnPush`.

- `isDevMode()` check — renders nothing in production
- `isPlatformBrowser()` — SSR-safe
- Floating "Z" button (bottom-right), opens side panel
- Keyboard shortcut: `Ctrl+Shift+Z` / `Cmd+Shift+Z`
- Polls `registry.inspectAll()` every 1s when panel is open
- Shows: cache entries, state badges (FRESH/STALE/EXPIRED), TTL counters, JSON preview

Requires `withDevtools()` for data to appear.

---

## Types

### ZifluxConfig

```typescript
interface ZifluxConfig {
  staleTime: number
  expireTime: number
  cleanupInterval?: number
  maxEntries?: number
}
```

### CacheEntry<T>

```typescript
interface CacheEntry<T> {
  data: T
  createdAt: number
}
```

### CacheEntryInfo<T>

Enriched entry returned by `inspect()`:
```typescript
interface CacheEntryInfo<T> {
  key: string[]
  data: T
  createdAt: number
  age: number
  fresh: boolean
  expired: boolean
  state: 'fresh' | 'stale' | 'expired'
  timeToStale: number
  timeToExpire: number
}
```

### CacheInspection<T>

```typescript
interface CacheInspection<T> {
  size: number
  entries: CacheEntryInfo<T>[]
  inFlightKeys: string[][]
  version: number
  config: ZifluxConfig
}
```

### ResourceStatus (Angular)

String union from Angular: `'idle' | 'loading' | 'reloading' | 'resolved' | 'error' | 'local'`

### CachedMutationStatus

`'idle' | 'pending' | 'success' | 'error'`

### ZifluxFeature

Opaque type: `EnvironmentProviders & { readonly ɵzifluxFeature: never }`. Only constructible via `withDevtools()`.
