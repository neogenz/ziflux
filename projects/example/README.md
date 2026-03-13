# ziflux Example App

A Todo application demonstrating all ziflux features with a fake HTTP backend (no server needed).

## Run

```bash
pnpm example
# → http://localhost:4200
```

## What's demonstrated

| Feature | Where |
| --- | --- |
| `cachedResource` (basic + params) | `todo-list.store.ts`, `todo-detail.store.ts` |
| `cachedMutation` + optimistic updates | `todo-list.store.ts` (add, toggle, delete) |
| `cachedMutation` + error rollback | `todo-detail.store.ts` (edit) |
| `DataCache` (multiple instances) | `todo.api.ts` (listCache, itemCache) |
| `provideZiflux` + `withDevtools` | `main.ts` |
| `anyLoading` | `todo-list.store.ts` |
| `invalidate` (prefix-based) | Mutations in both stores |
| `prefetch` on hover | `todo-list.component.ts` |
| Polling (`refetchInterval`) | `todo-list.store.ts` |
| Retry strategy | `todo-detail.store.ts` |
| `CacheRegistry` + `inspectAll()` | `cache-inspector.component.ts` |
| `ZifluxDevtoolsComponent` | `app.component.ts` |
| Network latency simulation | Nav bar dropdown (0ms–3s) |

## Routes

- `/` — Todo list with CRUD, polling, optimistic updates
- `/todos/:id` — Todo detail with inline editing, retry
- `/cache` — Cache inspector (all registered caches, entries, lifecycle controls)
