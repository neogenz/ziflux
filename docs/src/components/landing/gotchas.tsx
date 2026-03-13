import { CodeBlock } from "./code-block"

const INVALIDATE_EMPTY_WRONG = `// This does nothing — empty prefix matches nothing
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

const SET_UPDATE_WRONG = `// Local only — the cache doesn't know about this
ref.set(newValue)
ref.update(prev => ({ ...prev, name: 'updated' }))`

const SET_UPDATE_RIGHT = `// To trigger a fresh server fetch, invalidate the cache
cache.invalidate(['order', 'details', '42'])`

const UNTYPED_KEYS_CODE = `// Nothing prevents this — both compile fine
cache.set(['user', '1'], { name: 'Alice' })       // User
const entry = cache.get<Order[]>(['user', '1'])    // reads as Order[]

// Convention: one key prefix per type, enforced in your API service`

const GOTCHAS: {
  title: string
  description: string
  wrong?: string
  wrongLabel?: string
  right?: string
  rightLabel?: string
  code?: string
}[] = [
  {
    title: "invalidate([]) is a no-op",
    description: "An empty prefix matches nothing. Use cache.clear() to wipe everything.",
    wrong: INVALIDATE_EMPTY_WRONG,
    wrongLabel: "No effect",
    right: INVALIDATE_EMPTY_RIGHT,
    rightLabel: "Correct",
  },
  {
    title: "invalidate() is prefix-based, not exact-match",
    description: "A prefix matches all keys that start with it — including nested sub-keys.",
    code: INVALIDATE_PREFIX_CODE,
  },
  {
    title: "ref.set() / ref.update() are local-only",
    description: "They update the component's view but do NOT write to the cache. Call invalidate() to trigger a fresh server fetch.",
    wrong: SET_UPDATE_WRONG,
    wrongLabel: "Local only",
    right: SET_UPDATE_RIGHT,
    rightLabel: "Triggers fetch",
  },
  {
    title: "Cache keys are untyped at the boundary",
    description: "DataCache stores unknown internally. Type correctness depends on consistent key→type pairings in your code.",
    code: UNTYPED_KEYS_CODE,
  },
]

export function Gotchas() {
  return (
    <section id="gotchas" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#gotchas" className="hover:no-underline">Gotchas <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        Common pitfalls and how to avoid them.
      </p>

      <div className="mt-8 space-y-8">
        {GOTCHAS.map((gotcha) => (
          <div key={gotcha.title} className="border-l-2 border-amber-500 pl-4">
            <h3 className="text-sm font-semibold">{gotcha.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{gotcha.description}</p>

            {gotcha.wrong && gotcha.right && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-red-400">{gotcha.wrongLabel}</p>
                  <CodeBlock code={gotcha.wrong} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-emerald-500">{gotcha.rightLabel}</p>
                  <CodeBlock code={gotcha.right} />
                </div>
              </div>
            )}

            {gotcha.code && (
              <div className="mt-3">
                <CodeBlock code={gotcha.code} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
