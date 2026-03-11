"use client"

import { useEffect, useRef, useState } from "react"

const NAVS = [
  { path: "/orders", firstVisit: true },
  { path: "/orders/42", firstVisit: true },
  { path: "/orders", firstVisit: false },
  { path: "?status=pending", firstVisit: true },
  { path: "/orders", firstVisit: false },
]

const LOAD_DELAY = 700
const STEP_DELAY = 1400

export function NavigationDemo() {
  const [rows, setRows] = useState(0)
  const [leftDone, setLeftDone] = useState<boolean[]>([])
  const [rightDone, setRightDone] = useState<boolean[]>([])
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    let i = 0

    function step() {
      if (i >= NAVS.length) return

      const idx = i
      const nav = NAVS[idx]

      setRows(idx + 1)

      // Left: always loads with delay
      timeouts.current.push(
        setTimeout(() => {
          setLeftDone((prev) => {
            const next = [...prev]
            next[idx] = true
            return next
          })
        }, LOAD_DELAY),
      )

      // Right: instant for cached returns
      if (nav.firstVisit) {
        timeouts.current.push(
          setTimeout(() => {
            setRightDone((prev) => {
              const next = [...prev]
              next[idx] = true
              return next
            })
          }, LOAD_DELAY),
        )
      } else {
        setRightDone((prev) => {
          const next = [...prev]
          next[idx] = true
          return next
        })
      }

      i++
      timeouts.current.push(setTimeout(step, STEP_DELAY))
    }

    timeouts.current.push(setTimeout(step, 400))

    return () => {
      timeouts.current.forEach(clearTimeout)
      timeouts.current = []
    }
  }, [])

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      <Panel label="Without cache" accent={false}>
        {Array.from({ length: rows }, (_, i) => (
          <Row
            key={i}
            path={NAVS[i].path}
            done={!!leftDone[i]}
            cached={false}
          />
        ))}
      </Panel>
      <Panel label="With cachedResource()" accent>
        {Array.from({ length: rows }, (_, i) => {
          const cached = !NAVS[i].firstVisit
          return (
            <Row
              key={i}
              path={NAVS[i].path}
              done={!!rightDone[i]}
              cached={cached && !!rightDone[i]}
            />
          )
        })}
      </Panel>
    </div>
  )
}

function Panel({
  label,
  accent,
  children,
}: {
  label: string
  accent: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-accent/20 bg-accent/[0.03]"
          : "border-border bg-muted/30"
      }`}
    >
      <p
        className={`mb-3 text-xs font-semibold tracking-wide ${
          accent ? "text-accent" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <div className="min-h-[148px] space-y-2.5 font-mono text-xs sm:text-sm">
        {children}
      </div>
    </div>
  )
}

function Row({
  path,
  done,
  cached,
}: {
  path: string
  done: boolean
  cached: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 nav-row-enter"
    >
      <span
        className={cached ? "text-accent" : "text-muted-foreground"}
      >
        {path}
      </span>
      {done ? (
        <span
          className={
            cached
              ? "font-semibold text-accent"
              : "text-emerald-500"
          }
        >
          {cached ? "instant" : "✓"}
        </span>
      ) : (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      )}
    </div>
  )
}
