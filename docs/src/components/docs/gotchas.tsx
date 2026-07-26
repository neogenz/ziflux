import type { ReactNode } from "react"
import { CodeBlock } from "@/components/shared/code-block"
import { SectionHeading } from "@/components/docs/section-heading"

const INVALIDATE_EMPTY_WRONG = `// This does nothing: an empty prefix matches no key
cache.invalidate([])`

const INVALIDATE_EMPTY_RIGHT = `// Use clear() to wipe the entire cache
cache.clear()`

const INVALIDATE_PREFIX_CODE = `// invalidate(['order', 'details', '42']) also matches:
//   ['order', 'details', '42']
//   ['order', 'details', '42', 'comments']
//   ['order', 'details', '42', 'attachments']
//
// It does NOT match:
//   ['order', 'details', '43']
//   ['order', 'list']`

const SET_UPDATE_CODE = `// set() and update() write to both the Angular resource AND the DataCache.
// Optimistic values survive cache version bumps from unrelated invalidations.
ref.set(newValue)
ref.update(prev => ({ ...prev, name: 'updated' }))

// To trigger a fresh server fetch after an optimistic update:
cache.invalidate(['order', 'details', '42'])`

const UNTYPED_KEYS_CODE = `// Nothing prevents this: both compile fine
cache.set(['user', '1'], { name: 'Alice' })       // User
const entry = cache.get<Order[]>(['user', '1'])    // reads as Order[]

// Convention: one key prefix per type, enforced in your API service`

interface Gotcha {
  title: ReactNode
  label: string
  key: string
  description: string
  wrong?: string
  wrongLabel?: string
  right?: string
  rightLabel?: string
  code?: string
}

const GOTCHAS: Gotcha[] = [
  {
    key: "invalidate-empty",
    label: "invalidate([]) is a no-op",
    title: <><code>invalidate([])</code> is a no-op</>,
    description: "An empty prefix matches nothing. Use cache.clear() to wipe everything.",
    wrong: INVALIDATE_EMPTY_WRONG,
    wrongLabel: "No effect",
    right: INVALIDATE_EMPTY_RIGHT,
    rightLabel: "Correct",
  },
  {
    key: "invalidate-prefix",
    label: "invalidate() is prefix-based, not exact-match",
    title: <><code>invalidate()</code> is prefix-based, not exact-match</>,
    description: "A prefix matches all keys that start with it, including nested sub-keys.",
    code: INVALIDATE_PREFIX_CODE,
  },
  {
    key: "set-update-cache",
    label: "ref.set() / ref.update() write to the cache",
    title: <><code>ref.set()</code> / <code>ref.update()</code> write to the cache</>,
    description: "They update both the Angular resource and the DataCache. Optimistic values survive version bumps from unrelated invalidations. Call invalidate() to trigger a fresh server fetch.",
    code: SET_UPDATE_CODE,
  },
  {
    key: "untyped-keys",
    label: "Cache keys are untyped at the boundary",
    title: "Cache keys are untyped at the boundary",
    description: "DataCache stores unknown internally. Type correctness depends on consistent key→type pairings in your code.",
    code: UNTYPED_KEYS_CODE,
  },
]

export function Gotchas() {
  return (
    <section className="py-10 sm:py-12">
      <SectionHeading level={2} id="gotchas" label="Gotchas">
        Gotchas
      </SectionHeading>
      <p className="mt-2 text-muted-foreground">
        Common pitfalls and how to avoid them.
      </p>

      <div className="mt-8 space-y-4">
        {GOTCHAS.map((gotcha) => (
          <div key={gotcha.key} className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caution/10 text-xs font-bold text-caution-strong">!</span>
              <div>
                <SectionHeading level={3} id={gotcha.key} label={gotcha.label}>
                  {gotcha.title}
                </SectionHeading>
                <p className="mt-1 text-sm text-muted-foreground">{gotcha.description}</p>
              </div>
            </div>

            {gotcha.wrong && gotcha.right && (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="mb-1.5 inline-block rounded-md bg-danger/10 px-2 py-0.5 font-mono text-[11px] text-danger-strong">{gotcha.wrongLabel}</span>
                  <CodeBlock code={gotcha.wrong} />
                </div>
                <div>
                  <span className="mb-1.5 inline-block rounded-md bg-ok/10 px-2 py-0.5 font-mono text-[11px] text-ok-strong">{gotcha.rightLabel}</span>
                  <CodeBlock code={gotcha.right} />
                </div>
              </div>
            )}

            {gotcha.code && (
              <div className="mt-4">
                <CodeBlock code={gotcha.code} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
