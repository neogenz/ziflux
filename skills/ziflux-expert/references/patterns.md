# ziflux Implementation Patterns

Practical patterns for implementing features with ziflux. Each pattern includes the code and explains when and why to use it.

## Table of Contents
- [Setup](#setup)
- [Basic Resource (no params)](#basic-resource-no-params)
- [Parameterized Resource](#parameterized-resource)
- [Conditional Loading](#conditional-loading)
- [Mutations with Invalidation](#mutations-with-invalidation)
- [Optimistic Updates](#optimistic-updates)
- [Cache Key Hierarchies](#cache-key-hierarchies)
- [Polling](#polling)
- [Retry](#retry)
- [Prefetching](#prefetching)
- [Loading States](#loading-states)
- [Per-Resource Freshness](#per-resource-freshness)
- [Multiple Caches](#multiple-caches)
- [Observable Loaders](#observable-loaders)

---

## Setup

### app.config.ts

```typescript
import { provideZiflux, withDevtools } from 'ngx-ziflux';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux(
      { staleTime: 60_000, expireTime: 300_000 },
      withDevtools(),  // remove in production or rely on isDevMode() guard
    ),
  ],
};
```

### Component template (devtools)

```html
<ziflux-devtools />
<!-- auto-hides in production via isDevMode() — no @if guard needed -->
```

---

## Basic Resource (no params)

For data that loads once without parameters (user profile, app config, feature flags):

```typescript
// user.api.ts
@Injectable({ providedIn: 'root' })
export class UserApi {
  readonly #http = inject(HttpClient);
  readonly cache = new DataCache({ name: 'user' });

  getProfile() {
    return this.#http.get<UserProfile>('/api/me');
  }
}

// user-profile.store.ts
@Injectable()
export class UserProfileStore {
  readonly #api = inject(UserApi);

  readonly profile = cachedResource({
    cache: this.#api.cache,
    cacheKey: ['user', 'profile'],
    loader: () => this.#api.getProfile(),
  });
}
```

When `params` is omitted, it defaults to `() => ({})` and the resource loads immediately.

---

## Parameterized Resource

For data that depends on route params or signals:

```typescript
// order-detail.store.ts
@Injectable()
export class OrderDetailStore {
  readonly #api = inject(OrderApi);
  readonly #route = inject(ActivatedRoute);

  readonly orderId = toSignal(this.#route.params.pipe(map(p => p['id'])));

  readonly order = cachedResource({
    cache: this.#api.cache,
    cacheKey: params => ['orders', 'details', params.id],
    params: () => {
      const id = this.orderId();
      return id ? { id } : undefined;  // undefined suspends
    },
    loader: ({ params }) => this.#api.getOrder(params.id),
  });
}
```

Returning `undefined` from `params` keeps the resource in `'idle'` state — the loader won't fire until params are defined.

---

## Conditional Loading

Use `undefined` params to suspend loading until a condition is met:

```typescript
readonly details = cachedResource({
  cache: this.#api.cache,
  cacheKey: params => ['item', params.id],
  params: () => {
    const id = this.selectedId();
    return id ? { id } : undefined;  // don't load until selection exists
  },
  loader: ({ params }) => this.#api.getItem(params.id),
});
```

---

## Mutations with Invalidation

### Basic mutation

```typescript
readonly createOrder = cachedMutation({
  cache: this.#api.cache,
  mutationFn: (order: NewOrder) => this.#api.createOrder(order),
  invalidateKeys: () => [['orders']],  // invalidates all order-related entries
});
```

### Using result in invalidation

`invalidateKeys` receives both the args and the server response:

```typescript
readonly updateOrder = cachedMutation({
  cache: this.#api.cache,
  mutationFn: (order: UpdateOrder) => this.#api.updateOrder(order),
  invalidateKeys: (args, result) => [
    ['orders', 'list'],                    // refresh the list
    ['orders', 'details', result.id],      // refresh this specific order
  ],
});
```

### Void-arg mutation

```typescript
readonly refreshAll = cachedMutation<void, void>({
  mutationFn: () => this.#api.refreshData(),
  cache: this.#api.cache,
  invalidateKeys: () => [['data']],
});

// Usage:
this.refreshAll.mutate();  // no argument
```

### Calling mutations from components

```typescript
// component
async onSubmit(form: NewOrder) {
  const result = await this.store.createOrder.mutate(form);
  if (result) {
    this.router.navigate(['/orders', result.id]);
  }
  // on error, result is undefined — check store.createOrder.error()
}
```

---

## Optimistic Updates

Use `onMutate` to update UI immediately, `onError` to rollback:

```typescript
readonly deleteItem = cachedMutation<string, void, Item[]>({
  mutationFn: (id) => this.#api.deleteItem(id),
  cache: this.#api.cache,
  invalidateKeys: () => [['items']],
  onMutate: (id) => {
    const previous = this.items.value()!;
    this.items.update(items => items!.filter(i => i.id !== id));
    return previous;  // stored as context
  },
  onSuccess: () => {
    // optional: show success toast
  },
  onError: (_err, _id, previous) => {
    if (previous) this.items.set(previous);  // rollback
  },
});
```

The third generic `C` in `cachedMutation<A, R, C>` is the context type returned by `onMutate`.

---

## Cache Key Hierarchies

Design keys hierarchically for precise invalidation:

```typescript
// Granular keys
['products', 'list']
['products', 'list', JSON.stringify({ category: 'electronics' })]
['products', 'details', '42']
['products', 'reviews', '42']

// Invalidation granularity
cache.invalidate(['products']);                    // everything
cache.invalidate(['products', 'list']);            // all lists (filtered and unfiltered)
cache.invalidate(['products', 'details', '42']);   // just product 42's details
cache.invalidate(['products', 'reviews', '42']);   // just product 42's reviews
```

For filter-dependent lists, serialize the filter object into the key:

```typescript
cacheKey: params => ['products', 'list', JSON.stringify(params.filters)],
```

---

## Polling

### Static interval

```typescript
readonly status = cachedResource({
  cache: this.#api.cache,
  cacheKey: ['system', 'status'],
  loader: () => this.#api.getSystemStatus(),
  refetchInterval: 30_000,  // every 30s
});
```

### Reactive interval (signal-driven)

```typescript
readonly data = cachedResource({
  cache: this.#api.cache,
  cacheKey: ['data'],
  loader: () => this.#api.getData(),
  refetchInterval: () => this.isActive() ? 5_000 : false,  // stop when inactive
});
```

The function runs inside an `effect()` — when the signal changes, the timer restarts.

### Polling + staleTime interaction

Polling calls `ref.reload()`, which only triggers a fetch if the cache entry is stale. If `staleTime` is longer than `refetchInterval`, some polls will be no-ops (data is still fresh). Set `staleTime` shorter than or equal to `refetchInterval` for consistent polling.

---

## Retry

### Simple retry count

```typescript
cachedResource({
  // ...
  retry: 3,  // expands to { maxRetries: 3, baseDelay: 1000, maxDelay: 30_000 }
});
```

### Full retry config

```typescript
cachedResource({
  // ...
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 10_000,
    retryIf: (error) => {
      // only retry on network errors, not 4xx
      return error instanceof HttpErrorResponse && error.status >= 500;
    },
  },
});
```

Retry uses exponential backoff with jitter. AbortSignal cancels pending retries on destroy.

---

## Prefetching

Eagerly load data before navigation:

```typescript
// In a route guard or resolver
const api = inject(OrderApi);
await api.cache.prefetch(
  ['orders', 'details', id],
  () => firstValueFrom(api.getOrder(id))
);
```

Uses `deduplicate()` internally — concurrent prefetch + resource load for the same key collapse into one request.

---

## Loading States

### Spinner (cold cache only)

```html
@if (store.orders.isInitialLoading()) {
  <loading-spinner />
} @else if (store.orders.error()) {
  <error-message [error]="store.orders.error()" />
} @else {
  <order-list [orders]="store.orders.value()!" />
}
```

### Subtle refresh indicator (SWR)

```html
<div class="relative">
  @if (store.orders.isStale()) {
    <refresh-indicator class="absolute top-0 right-0" />
  }
  <order-list [orders]="store.orders.value()!" />
</div>
```

### Combined loading for multiple resources

```typescript
readonly isLoading = anyLoading(
  this.orders.isLoading,
  this.users.isLoading,
  this.createOrder.isPending,
);
```

```html
@if (store.isLoading()) {
  <progress-bar />
}
```

---

## Per-Resource Freshness

Override cache-level defaults for specific resources:

```typescript
// Dashboard data: refresh frequently
readonly dashboard = cachedResource({
  cache: this.#api.cache,
  cacheKey: ['dashboard'],
  loader: () => this.#api.getDashboard(),
  staleTime: 10_000,     // stale after 10s
  expireTime: 60_000,    // expire after 1min
});

// Reference data: cache longer
readonly countries = cachedResource({
  cache: this.#api.cache,
  cacheKey: ['ref', 'countries'],
  loader: () => this.#api.getCountries(),
  staleTime: 600_000,    // stale after 10min
  expireTime: 3_600_000, // expire after 1h
});
```

These overrides are passed to `cache.get()` as per-call options.

---

## Multiple Caches

Use separate `DataCache` instances for domains with different freshness needs:

```typescript
@Injectable({ providedIn: 'root' })
export class ProductApi {
  readonly cache = new DataCache({ name: 'products', staleTime: 60_000 });
  // ...
}

@Injectable({ providedIn: 'root' })
export class AnalyticsApi {
  readonly cache = new DataCache({ name: 'analytics', staleTime: 5_000, maxEntries: 50 });
  // ...
}
```

Each API service owns exactly one `DataCache`. Keep it simple.

---

## Observable Loaders

`cachedResource` accepts Observable loaders (converted via `firstValueFrom` internally):

```typescript
readonly orders = cachedResource({
  cache: this.#api.cache,
  cacheKey: ['orders'],
  loader: () => this.#http.get<Order[]>('/api/orders'),  // Observable
});
```

This works because Angular's `HttpClient` returns cold Observables that emit once and complete.

For the API service layer, use `cache.wrap()` to bridge an Observable into the cache:

```typescript
getOrders(): Observable<Order[]> {
  return this.cache.wrap(
    ['orders', 'list'],
    this.#http.get<Order[]>('/api/orders')
  );
}
```
