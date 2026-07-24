---
status: done
---

# Instruction: Angular 22 resource() parity — hasValue narrowing, error typing, defaultValue

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
├── decision.md                                      ✏️ append D-45 (parity closes: error type, hasValue guard, defaultValue)
└── projects/ziflux/src/lib
    ├── types.ts                                     ✏️ error: Signal<Error | undefined>; hasValue type guard; defaultValue option
    ├── cached-resource.ts                           ✏️ forward defaultValue; value() falls back to it
    ├── cached-resource.spec.ts                      ✏️ defaultValue + narrowing specs
    └── integration.spec.ts                          ✏️ type-level assertions updated
```

## Tasks to do

### `1)` `error: Signal<Error | undefined>`

> Angular 22 `ResourceRef.error` is `Signal<Error | undefined>` (verified `@angular/core/types/core.d.ts:7418`); ziflux widens it to `unknown` for no reason — it passes `res.error` straight through.

1. `types.ts` `CachedResourceRef.error`: retype to `Signal<Error | undefined>`; update JSDoc.

### `2)` `hasValue()` type narrowing

> Angular 22: `hasValue(): this is ResourceRef<Exclude<T, undefined>>`. Mirror the guard so `if (ref.hasValue())` narrows `value()`.

1. `types.ts`: type `hasValue()` as a guard narrowing `value` to `Signal<T>` (Angular-style `this is CachedResourceRef<Exclude<T, undefined>>` if it composes with `value: Signal<T | undefined>`, else intersection `this is CachedResourceRef<T> & { readonly value: Signal<T> }` — pick whichever narrows `value()` in a plain `if` block, prove it with an in-spec type assertion).
2. Runtime implementation unchanged.

### `3)` `defaultValue` option

> `resource()` accepts `defaultValue?: NoInfer<T>` (verified `_api-chunk.d.ts:274`); "mirrors resource() exactly" requires it.

1. `types.ts` `CachedResourceOptions`: add `defaultValue?: NoInfer<T>`.
2. `cached-resource.ts`: forward it to the inner `resource()` call; in the SWR `value` computed, return `defaultValue` instead of `undefined` on the no-snapshot and error branches.
3. Specs: value() returns defaultValue before first load and on error-without-snapshot; cached snapshot still wins over defaultValue.

## Test acceptance criteria

| Task | Acceptance criteria                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `typecheck` green with `error()` assignable to `Error | undefined`; no `unknown` leaks in consumer code.                                  |
| 2    | In-spec type assertion: inside `if (ref.hasValue())`, `ref.value()` is `T` (no `undefined`).                                              |
| 3    | With `defaultValue`, `value()` never returns `undefined`; without it, existing behavior byte-for-byte identical; suite + typecheck green.  |
