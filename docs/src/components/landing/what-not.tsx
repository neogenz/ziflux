import { Check, X } from "lucide-react"

const IS = [
  "A cache layer for Angular's resource()",
  "Stale-while-revalidate semantics",
  "Signal-native, zero dependencies",
  "Idiomatic — feels like Angular, not a framework",
]

const IS_NOT = [
  "Not a state manager — signals are your state manager",
  "Not a store abstraction — you write plain @Injectable()",
  "Not another NgRx, not a TanStack port",
  "Not a replacement for resource() — an extension of it",
]

const CACHE_YES = [
  "GET — entity lists",
  "GET — entity details",
  "Data shared across multiple screens",
  "Predictable access patterns (tabs, navigation)",
]

const CACHE_NO = [
  "POST / PUT / DELETE",
  "Search results with volatile params",
  "Real-time data (WebSocket, SSE)",
  "Large binaries",
]

export function WhatNot() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      {/* Identity */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-emerald-500">
            What it is
          </h3>
          <ul className="space-y-3">
            {IS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400">
            What it is NOT
          </h3>
          <ul className="space-y-3">
            {IS_NOT.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <X size={16} className="mt-0.5 shrink-0 text-red-400" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* When to cache */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-emerald-500">
            Cache
          </h3>
          <ul className="space-y-3">
            {CACHE_YES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400">
            Don&apos;t cache
          </h3>
          <ul className="space-y-3">
            {CACHE_NO.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <X size={16} className="mt-0.5 shrink-0 text-red-400" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
