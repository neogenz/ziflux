---
objective: "Every confirmed finding of the 2026-07-24 strategic review is fixed: invalidation is correct under per-resource overrides, loaders are cancellable, SSR is safe, reload() honors its contract, mutations fail loudly on misconfiguration, the API matches Angular 22 resource() parity claims, and every published claim is measured or deleted."
status: implemented
---

# Plan: Fix review findings (bugs, parity, credibility)

## Overview

| Field      | Value                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**   | Fix the 7 confirmed defects + resource() parity gaps + false claims found by the adversarially-verified review, before any launch communication.                 |
| **Source** | Session review (workflow `wf_ad69ed33-7fa`, 22 agents): referee roadmap items 1–8, confirmed findings re-verified against source in this session.                |

## Phases

| #   | Phase                                                        | File                         |
| --- | ------------------------------------------------------------ | ---------------------------- |
| 1   | Invalidation redesign: flag + epochs (critical bug + race)   | [`phase-1.md`](./phase-1.md) |
| 2   | Resource lifecycle: abort, reload() force, SSR timer guards  | [`phase-2.md`](./phase-2.md) |
| 3   | Mutation hardening: config pairing error, callback isolation | [`phase-3.md`](./phase-3.md) |
| 4   | Angular 22 resource() parity: hasValue, error, defaultValue  | [`phase-4.md`](./phase-4.md) |
| 5   | Credibility sweep: example, README, size claims, CI badge    | [`phase-5.md`](./phase-5.md) |

## Decisions

| Decision                                                                                                                                     | Why                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalidation becomes an explicit per-entry `invalidated` flag + a monotonic invalidation epoch, replacing timestamp backdating AND the `#dirtyPrefixes`/`#resolvedKeys` sets | Timestamp arithmetic against cache-level `staleTime` is the root cause of both the critical silent no-op (per-resource override) and the D-08 violation (spurious deletion); the epoch subsumes the dirty/resolved machinery and fixes the cold-cache race with one mechanism instead of three. |
| Observable loaders bridge through an abort-aware helper instead of bare `firstValueFrom()`                                                    | `firstValueFrom` cannot honor `abortSignal`; the documented primary use case (HttpClient loader) is currently uncancellable. Supersedes the literal `firstValueFrom` rule in CLAUDE.md (intent — no Subjects for state — unchanged).       |
| `reload()` and `refetchInterval` bypass the freshness short-circuit                                                                           | The JSDoc contract ("bypassing staleness checks") and polling semantics (configured interval = network interval) already promise it; the code is what changes, not the contract.                                                          |

## Out of scope (explicitly)

Referee items 9–12 (refetchOnWindowFocus, httpResource/SignalStore interop, support policy, non-goals page) are improvements, not corrections — separate plan on demand.
