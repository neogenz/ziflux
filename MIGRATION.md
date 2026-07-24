# Migration

## 0.1.x to 0.2.0

Three exported types changed in ways that can stop existing code from compiling, and
several behaviors changed because they were wrong before. Everything else is additive.

### `error` is now typed

`CachedResourceRef.error` went from `Signal<unknown>` to `Signal<Error | undefined>`,
matching what Angular's own `resource()` has always exposed.

```ts
// before: the cast was the only way to read it
const code = (ref.error() as ApiError).code

// after: `unknown` is gone, so the direct cast no longer compiles
const code = (ref.error() as unknown as ApiError).code
```

Reading `error()` as `unknown`, or checking it for truthiness, keeps working.

### `hasValue()` is a type guard

It used to return `boolean`. It now returns a type predicate, so `value()` narrows to `T`
inside the guard, the same way `ResourceRef.hasValue()` behaves.

```ts
if (ref.hasValue()) {
  ref.value().length // no longer `T | undefined`
}
```

This breaks hand-written test doubles of `CachedResourceRef`: a `hasValue: () => false`
property no longer satisfies the interface and has to be a method with the predicate
signature. It also changes semantics slightly. `hasValue()` is now exactly
`value() !== undefined`, so a loader that resolves `undefined` reports `false` where it
previously reported `true`.

### `CacheEntry` gained a required field

`CacheEntry<T>` now carries `invalidated: boolean`. Only code that constructs a
`CacheEntry` literal is affected, which in practice means test fixtures.

### Behavior changes

`reload()` now refetches even when the entry is still fresh. Its contract always said it
bypassed staleness checks, but the freshness short-circuit ran first, so inside the
`staleTime` window it did nothing. `refetchInterval` inherited the same bug, which meant a
3 second poll under a 5 second `staleTime` actually hit the network about every 6 seconds.

`invalidate()` is a flag rather than a timestamp shift. A per-resource `staleTime` larger
than the cache's can no longer swallow an invalidation, and a smaller `expireTime` can no
longer turn one into an eviction. The cost is request count: a raced in-flight fetch is
never reused, so invalidations spread over time cost one refetch each. Invalidations
within a single tick still collapse into one.

Observable loaders are cancelled when Angular aborts the request, so a superseded or
destroyed resource actually kills its `HttpClient` call. A loader Observable that completes
without emitting now rejects with a named `Error` instead of RxJS `EmptyError`.

Server rendering no longer starts timers. The cleanup sweep and polling are browser-only.

`cachedMutation` throws at construction, in dev mode only, when you pass `cache` without
`invalidateKeys` or the reverse. That configuration silently invalidated nothing before, so
this is the most likely upgrade-time crash. Pass both, or neither.

### New and optional

`defaultValue` on `cachedResource`, with the same overload pair Angular uses, so `value()`
is never `undefined` when you set it. `refetchOnWindowFocus` and `refetchOnReconnect`, both
off by default. `id`, forwarded to `resource()` so a server-rendered value is reused
through `TransferState` instead of refetched during hydration.
