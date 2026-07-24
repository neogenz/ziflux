---
status: done
---

# Instruction: Credibility sweep — example, README, measured size, CI badge

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
├── README.md                                        ✏️ ngx-ziflux imports; measured size; honest deps wording; badge
├── llms.txt                                         ✏️ audit + align same claims
├── package.json                                     ✏️ size-limit devDep + script
├── .github/workflows/ci.yml (or existing CI file)   ✏️ size-limit step
├── docs/src/components/landing/hero.tsx             ✏️ "~2KB" → measured number
├── docs/src/components/landing/ (comparison table)  ✏️ fix or delete unsourced comparison rows
├── projects/ziflux/package.json                     ✏️ drop tslib if dist proves it unused
└── projects/example/src/app/todo/todo-list.store.ts ✏️ delete 4 redundant listCache.set() calls
```

## Tasks to do

### `1)` Example teaches write-through, not plumbing

> `todos.set()` already writes through to the cache (D-33); the 4 manual `listCache.set()` calls teach the opposite.

1. `todo-list.store.ts`: delete the redundant `this.#api.listCache.set(['todos'], …)` at lines 33, 39, 58 and 63–64 (keep the `this.todos.set(...)` calls).
2. Run the example's flows (specs or manual dev-server pass) to confirm optimistic add/delete/rollback still behave.

### `2)` README + llms.txt truth pass

1. `README.md`: `from 'ziflux'` → `from 'ngx-ziflux'` (lines 22, 33) and audit every snippet/install command for the same slip.
2. Reword "zero dependencies" everywhere to what is true: "no dependencies beyond Angular's own peers (`@angular/core`, `rxjs`)".
3. Delete or fix unsourced comparison claims: export-count rows counted like-for-like or removed; any "Trade-off: None" replaced by the real trade-off; learning-curve "Minutes/Hours/Days" row deleted; NgRx cell corrected (SignalStore is signal-first, not an adapter).
4. `llms.txt`: same claims aligned.

### `3)` Measured size, enforced in CI

1. Verify tslib: `grep -c "tslib" dist/ziflux/fesm2022/*.mjs` — if zero usage, remove `tslib` from `projects/ziflux/package.json` dependencies (ng-packagr default, unused at ES2022 targets).
2. Add `size-limit` (+ esbuild-based preset) as root devDependency with a config measuring the core import (`DataCache`, `cachedResource`, `cachedMutation`, `provideZiflux`) from `dist/ziflux`, externals `@angular/*`, `rxjs`; budget set just above the measured number (~3.5 KB gzip today, re-measure after phases 1–4).
3. CI: run build + size-limit on PRs (extend the existing workflow); README badge with the measured figure.
4. `hero.tsx:48` and any docs copy: "~2KB" → the measured min+gzip figure, phrased "core, devtools excluded".

## Test acceptance criteria

| Task | Acceptance criteria                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Example compiles and optimistic add/toggle/delete + rollback work with zero manual cache writes in the store.                               |
| 2    | Every README/llms.txt code snippet imports from `ngx-ziflux`; no unsourced comparative number remains anywhere in README, llms.txt, docs.   |
| 3    | `pnpm size-limit` passes locally and in CI with the published budget; the number in README/hero matches the CI-enforced budget; tslib absent from dist package.json if proven unused. |
