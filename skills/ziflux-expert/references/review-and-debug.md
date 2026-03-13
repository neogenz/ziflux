# ziflux Code Review, Debugging, and Testing Guide

Practical guidance for reviewing code that uses ziflux, debugging cache issues, and writing tests.

## Table of Contents
- [Code Review Checklist](#code-review-checklist)
- [Debugging Guide](#debugging-guide)
- [Testing Patterns](#testing-patterns)

---

## Code Review Checklist

### Architecture

- [ ] **DataCache in root service?** Cache must live in a `providedIn: 'root'` API service. Route-scoped caches die on navigation, breaking SWR.
- [ ] **Domain pattern respected?** Component → Store → API. Component never injects API directly.
- [ ] **One DataCache per API service?** Each API service owns exactly one cache instance.
- [ ] **Store is route-scoped?** Stores are `@Injectable()` (no `providedIn`), provided in component `providers`.
- [ ] **Store references API's cache?** `this.#api.cache`, never `new DataCache()` in a store.

### cachedResource Usage

- [ ] **Injection context?** `cachedResource()` must be called in a class field, constructor, or `runInInjectionContext`.
- [ ] **Cache key matches data shape?** Keys should be hierarchical and include all params that affect the response.
- [ ] **Dynamic keys use function form?** `cacheKey: params => ['entity', params.id]`, not string interpolation.
- [ ] **Undefined params for conditional loading?** `params: () => id ? { id } : undefined` — not a falsy check that breaks on `0` or `''`.
- [ ] **Loader uses params from context?** `loader: ({ params }) => ...`, not closured signals.
- [ ] **staleTime <= expireTime?** If overriding, validate the constraint.
- [ ] **isInitialLoading for spinners?** Not `isLoading` (which is true during SWR revalidation too).

### cachedMutation Usage

- [ ] **mutate() return not awaited for success check?** `mutate()` never rejects. Check `mutation.error()` or capture return value (`undefined` = error).
- [ ] **invalidateKeys returns string[][]?** Array of arrays, not a flat array.
- [ ] **Optimistic update has rollback?** If `onMutate` modifies UI, `onError` must restore via context.
- [ ] **Void-arg typed correctly?** `cachedMutation<void, R>` for no-arg mutations.

### Cache Keys

- [ ] **No string concatenation in keys?** Keys are `string[]`, not template literals.
- [ ] **Prefix hierarchy correct?** `invalidate(['orders'])` will hit `['orders', 'list']` but NOT `['order']` or `['orderDetails']`.
- [ ] **Filter params serialized consistently?** Use `JSON.stringify(filters)` as a key segment, not individual filter values.
- [ ] **No empty prefix invalidation?** `invalidate([])` is a no-op. Use `clear()` for full wipe.

### Signals and Reactivity

- [ ] **No Subjects or Observables for state?** Signals only. `firstValueFrom()` to bridge Observable → Promise.
- [ ] **No `any` or `as unknown as`?** Forbidden by project rules.
- [ ] **No wrapping Angular APIs?** `set()`, `update()`, `inject()` used directly.

---

## Debugging Guide

### "Data doesn't update after mutation"

**Symptoms:** Mutation succeeds but the list/detail view shows old data.

**Checklist:**
1. Does `invalidateKeys` return the correct key prefixes? Add a `console.log` in `invalidateKeys` to verify.
2. Is the invalidation prefix matching correctly? Remember: `['order']` does NOT match `['orders']`. Check for singular/plural mismatch.
3. Is the `cachedResource` reading from the same `DataCache` instance? Both must reference `this.#api.cache` — not two different `new DataCache()` instances.
4. Is `cache.version()` wired correctly? If using a custom setup, make sure the resource's `params` factory reads `cache.version()` (the default `cachedResource` does this automatically).

**Quick diagnostic:**
```typescript
// In the store, temporarily:
effect(() => {
  console.log('cache version:', this.#api.cache.version());
  console.log('cache inspect:', this.#api.cache.inspect());
});
```

### "NG0203: inject() must be called from an injection context"

**Cause:** `new DataCache()` called outside an injection context.

**Fix:** Move `DataCache` instantiation to a class field initializer, constructor, or wrap in `runInInjectionContext()`.

```typescript
// Wrong
function createCache() {
  return new DataCache();  // no injection context
}

// Right
@Injectable({ providedIn: 'root' })
export class MyApi {
  readonly cache = new DataCache();  // class field = injection context
}
```

### "Resource stays in 'idle' forever"

**Cause:** `params` function returns `undefined`.

**Fix:** Check the params function. If it depends on a signal that hasn't been set yet (route param, user input), the resource correctly suspends. Either:
- Ensure the signal gets a value
- Add a loading state for the idle case

```typescript
// This stays idle until orderId has a value
params: () => {
  const id = this.orderId();
  return id ? { id } : undefined;
},
```

### "Stale data not shown during revalidation"

**Symptoms:** User sees a spinner instead of stale data during SWR.

**Checklist:**
1. Are you checking `isInitialLoading()` (correct) or `isLoading()` (wrong for SWR)?
2. Does the template handle the `'reloading'` status? `value()` returns stale data during reloading — it's there, just read it.

```html
<!-- Wrong: shows spinner during SWR -->
@if (store.items.isLoading()) { <spinner /> }

<!-- Right: shows spinner only on cold cache -->
@if (store.items.isInitialLoading()) { <spinner /> }
@if (store.items.isStale()) { <subtle-refresh-indicator /> }
<items-list [items]="store.items.value()!" />
```

### "Duplicate HTTP requests for the same data"

**Cause:** Two components/stores creating separate `cachedResource` instances for the same key + same cache.

**Expected behavior:** `cache.deduplicate()` ensures only one in-flight request per key. If you're seeing duplicates:
1. Are both using the SAME `DataCache` instance? (not two `new DataCache()`)
2. Are the cache keys identical? (same array, same serialization)
3. Is one request completing before the other starts? (dedup only applies to concurrent requests)

### "Constructor throws: staleTime must be <= expireTime"

**Fix:** Check both explicit config AND global `provideZiflux()` defaults. Config priority: constructor > global > hardcoded. If the constructor sets `staleTime: 120_000` but global has `expireTime: 60_000`, the effective expireTime might be lower.

### Using Devtools for Debugging

Enable devtools to inspect cache state in real-time:

```typescript
provideZiflux(config, withDevtools({ logOperations: true }))
```

Add `<ziflux-devtools />` to your root component template. The panel shows:
- All registered caches with entry counts
- Each entry's state (FRESH / STALE / EXPIRED), TTL countdown, and data preview
- In-flight deduplication keys
- Console logs for SET, INVALIDATE, EVICT, CLEAR, DEDUP operations

Keyboard shortcut: `Ctrl+Shift+Z` / `Cmd+Shift+Z`.

### Programmatic Inspection

```typescript
const snapshot = this.#api.cache.inspect();
console.log('Cache size:', snapshot.size);
console.log('Stale entries:', snapshot.entries.filter(e => e.state === 'stale'));
console.log('In-flight:', snapshot.inFlightKeys);
```

---

## Testing Patterns

ziflux tests use Vitest with Angular's TestBed. Here are the key patterns.

### Testing cachedResource

```typescript
describe('OrderListStore', () => {
  let store: OrderListStore;
  let cache: DataCache;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrderListStore,
        { provide: OrderApi, useValue: { cache: null, getOrders: vi.fn() } },
      ],
    });

    // Create cache in injection context
    cache = TestBed.runInInjectionContext(() => new DataCache({ staleTime: 100, expireTime: 1000 }));
    const api = TestBed.inject(OrderApi);
    (api as any).cache = cache;
    (api.getOrders as any).mockReturnValue(Promise.resolve([{ id: '1' }]));

    store = TestBed.inject(OrderListStore);
  });

  it('should load from network on cold cache', async () => {
    await flushMicrotasks();
    TestBed.tick();
    await waitForStatus(store.orders, 'resolved');

    expect(store.orders.value()).toEqual([{ id: '1' }]);
    expect(store.orders.isInitialLoading()).toBe(false);
  });

  it('should serve from cache on warm cache', async () => {
    cache.set(['orders', 'list'], [{ id: 'cached' }]);

    // Recreate store to test cache hit
    store = TestBed.inject(OrderListStore);
    await flushMicrotasks();
    TestBed.tick();

    expect(store.orders.value()).toEqual([{ id: 'cached' }]);
    // loader not called for fresh cache
  });
});

// Helpers
function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function waitForStatus(ref: CachedResourceRef<any>, target: string, max = 100) {
  for (let i = 0; i < max; i++) {
    if (ref.status() === target) return;
    await flushMicrotasks();
    TestBed.tick();
  }
  throw new Error(`Status never reached ${target}, stuck at ${ref.status()}`);
}
```

### Testing cachedMutation

No TestBed needed — `cachedMutation` works without injection context:

```typescript
describe('delete mutation', () => {
  it('should invalidate cache on success', async () => {
    const cache = { invalidate: vi.fn() };

    const mutation = cachedMutation({
      mutationFn: (id: string) => Promise.resolve(),
      cache,
      invalidateKeys: (id) => [['items', id], ['items', 'list']],
    });

    await mutation.mutate('42');

    expect(mutation.status()).toBe('success');
    expect(cache.invalidate).toHaveBeenCalledWith(['items', '42']);
    expect(cache.invalidate).toHaveBeenCalledWith(['items', 'list']);
  });

  it('should capture error in signal, not reject', async () => {
    const mutation = cachedMutation({
      mutationFn: () => Promise.reject(new Error('boom')),
    });

    const result = await mutation.mutate();

    expect(result).toBeUndefined();
    expect(mutation.status()).toBe('error');
    expect(mutation.error()).toBeInstanceOf(Error);
  });

  it('should support optimistic update with rollback', async () => {
    const items = signal(['a', 'b', 'c']);

    const mutation = cachedMutation<string, void, string[]>({
      mutationFn: () => Promise.reject(new Error('fail')),
      onMutate: (id) => {
        const prev = items();
        items.set(prev.filter(i => i !== id));
        return prev;
      },
      onError: (_err, _id, prev) => {
        if (prev) items.set(prev);
      },
    });

    await mutation.mutate('b');
    expect(items()).toEqual(['a', 'b', 'c']);  // rolled back
  });
});
```

### Testing DataCache Directly

Use `Injector.create` for minimal DI setup:

```typescript
function createTestCache(opts?: DataCacheOptions) {
  const injector = Injector.create({ providers: [] });
  return runInInjectionContext(injector, () => new DataCache(opts));
}

it('should invalidate matching prefix', () => {
  const cache = createTestCache({ staleTime: 1000, expireTime: 5000 });

  cache.set(['orders', 'list'], []);
  cache.set(['orders', 'details', '1'], {});
  cache.set(['users', 'list'], []);

  cache.invalidate(['orders']);

  expect(cache.get(['orders', 'list'])!.fresh).toBe(false);
  expect(cache.get(['orders', 'details', '1'])!.fresh).toBe(false);
  expect(cache.get(['users', 'list'])!.fresh).toBe(true);  // untouched
});
```

### Testing with Custom Config

Override global config via `ZIFLUX_CONFIG` for fast tests:

```typescript
TestBed.configureTestingModule({
  providers: [
    { provide: ZIFLUX_CONFIG, useValue: { staleTime: 50, expireTime: 500 } },
  ],
});
```

### Timer-Based Tests

Use fake timers for staleTime/expireTime/retry/polling tests:

```typescript
it('should become stale after staleTime', () => {
  vi.useFakeTimers();
  try {
    const cache = createTestCache({ staleTime: 100, expireTime: 1000 });
    cache.set(['key'], 'data');

    vi.advanceTimersByTime(101);
    expect(cache.get(['key'])!.fresh).toBe(false);
  } finally {
    vi.useRealTimers();  // always restore
  }
});
```

### What to Test, What Not to Test

**Test:**
- Store wiring: correct cache keys, correct invalidation keys, correct loader calls
- Optimistic update + rollback flow
- Loading state logic in components (which signal controls which UI state)
- Edge cases: undefined params, error handling, concurrent mutations

**Don't test:**
- DataCache internals (tested by the library)
- SWR lifecycle mechanics (tested by the library)
- Signal reactivity (tested by Angular)

Focus tests on the integration: "does my store correctly wire ziflux to produce the right behavior?"
