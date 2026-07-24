---
status: done
---

# Instruction: Mutation hardening — config pairing error, invalidation isolation

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
├── decision.md                                      ✏️ append D-44 (cache/invalidateKeys pairing enforced in dev)
└── projects/ziflux/src/lib
    ├── cached-mutation.ts                           ✏️ dev-mode pairing throw; invalidation loop isolated from status
    └── cached-mutation.spec.ts                      ✏️ pairing + isolation specs
```

## Tasks to do

### `1)` Fail loudly on half-configured invalidation

> `invalidateKeys` without `cache` (or vice versa) currently no-ops silently — the most likely misconfiguration in the API.

1. At factory time in `cachedMutation()`: `if (ngDevMode && !!cache !== !!invalidateKeys) throw new Error(...)` naming the missing option and the fix. Dev-only: production bundles keep zero overhead.
2. `decision.md`: D-44.

### `2)` `invalidateKeys()` / `invalidate()` failures must not corrupt mutation state

> Today a throw after `onSuccess` flips a succeeded mutation to `error` and fires both callbacks.

1. Wrap the invalidation loop (`invalidateKeys(args, result)` call + `cache.invalidate` iterations) in its own try/catch inside the success path; on throw, keep `status: 'success'`, report via `ngDevMode` console.error, never call `onError`.
2. Specs: (a) exactly one of the pair provided → dev-mode throw at creation; (b) `invalidateKeys` throwing after success → status stays `success`, `onError` not called, error surfaced in dev console.

## Test acceptance criteria

| Task | Acceptance criteria                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| 1    | `cachedMutation({ mutationFn, invalidateKeys })` without `cache` throws at creation in dev mode; both-or-neither passes.     |
| 2    | A throwing `invalidateKeys` leaves `status() === 'success'`, `data()` set, `onError` unfired; suite green.                   |
