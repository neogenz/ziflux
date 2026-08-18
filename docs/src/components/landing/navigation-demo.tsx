import { useCallback, useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"

// ─── Shared ──────────────────────────────────────────────

function ReplayButton({ onClick, played }: { onClick: () => void; played: boolean }) {
  return (
    <div className="mt-4 flex justify-center">
      <button
        onClick={onClick}
        className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']"
      >
        <RotateCcw size={12} />
        {played ? "Replay" : "Play"}
      </button>
    </div>
  )
}

function DemoPanel({
  label,
  accent,
  glow,
  children,
}: {
  label: string
  accent: boolean
  glow?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-[border-color,background-color,opacity] duration-300 ${
        glow
          ? "border-accent/40 shadow-[0_0_20px_color-mix(in_oklab,var(--accent)_10%,transparent)]"
          : accent
            ? "border-accent/20"
            : "border-border"
      }`}
    >
      <div className="px-5 pt-4 pb-4">
        <span
          className={`text-sm font-semibold ${
            accent ? "text-accent-strong" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-lg bg-muted/60 px-3 py-2.5">
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/10" />
          <div className="mt-1.5 h-2.5 w-2/5 animate-pulse rounded bg-muted-foreground/6" />
        </div>
      ))}
    </div>
  )
}

function DataRow({
  name,
  detail,
  pending,
  highlight,
}: {
  name: string
  detail: string
  pending?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2.5 transition-[background-color,color,opacity] duration-200 ${
        highlight
          ? "bg-accent/5 ring-1 ring-accent/30"
          : "bg-muted/40"
      } ${pending ? "opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">{name}</p>
        {pending && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        )}
      </div>
      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{detail}</p>
    </div>
  )
}

// ─── Navigation Demo ─────────────────────────────────────

const NAV_TABS = ["Dashboard", "Team", "Reports"]

const NAV_TAB_DATA: { name: string; detail: string }[][] = [
  [
    { name: "Revenue overview", detail: "$48,290 this month" },
    { name: "Active users", detail: "1,204 online" },
    { name: "Conversion rate", detail: "3.2% (+0.4%)" },
  ],
  [
    { name: "Alice Martin", detail: "Engineering" },
    { name: "Bob Chen", detail: "Design" },
  ],
  [
    { name: "Q4 Sales", detail: "Generated Dec 12" },
    { name: "User growth", detail: "Generated Dec 10" },
    { name: "Churn analysis", detail: "Generated Dec 8" },
  ],
]

type NavState = { tab: number; loading: boolean; cached?: boolean }

const NAV_INITIAL: NavState = { tab: 0, loading: true }

const NAV_TIMELINE: { at: number; left: NavState; right: NavState }[] = [
  { at: 900, left: { tab: 0, loading: false }, right: { tab: 0, loading: false } },
  { at: 2700, left: { tab: 1, loading: true }, right: { tab: 1, loading: true } },
  { at: 3600, left: { tab: 1, loading: false }, right: { tab: 1, loading: false } },
  { at: 5400, left: { tab: 0, loading: true }, right: { tab: 0, loading: false, cached: true } },
  { at: 6300, left: { tab: 0, loading: false }, right: { tab: 0, loading: false, cached: true } },
]

// The settled last frame. Any earlier one still holds a skeleton or a spinner,
// which would animate forever while the reader is parsing the headline.
const NAV_POSTER = NAV_TIMELINE[4]

function NavDemo() {
  const [left, setLeft] = useState<NavState>(NAV_POSTER.left)
  const [right, setRight] = useState<NavState>(NAV_POSTER.right)
  const [runKey, setRunKey] = useState(0)

  // runKey 0 is the poster frame: nothing moves until the reader asks for it.
  useEffect(() => {
    if (runKey === 0) return

    const timeouts = NAV_TIMELINE.map(({ at, left: l, right: r }) =>
      setTimeout(() => {
        setLeft(l)
        setRight(r)
      }, at),
    )

    return () => timeouts.forEach(clearTimeout)
  }, [runKey])

  // Rewinding belongs to the click, not to the effect.
  const replay = useCallback(() => {
    setLeft(NAV_INITIAL)
    setRight(NAV_INITIAL)
    setRunKey((k) => k + 1)
  }, [])

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        <NavPanel label="Without cache" state={left} accent={false} />
        <NavPanel label="With cachedResource()" state={right} accent />
      </div>
      <ReplayButton onClick={replay} played={runKey > 0} />
    </>
  )
}

function NavPanel({
  label,
  state,
  accent,
}: {
  label: string
  state: NavState
  accent: boolean
}) {
  return (
    <DemoPanel label={label} accent={accent} glow={state.cached}>
      {/* Tabs */}
      <div className="mb-4 flex gap-1.5">
        {NAV_TABS.map((tab, i) => (
          <span
            key={tab}
            className={`rounded-md px-3 py-1 text-xs transition-[background-color,color,opacity] duration-200 ${
              state.tab === i
                ? accent
                  ? "bg-accent/10 font-medium text-accent-strong"
                  : "bg-muted font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Fixed height: tallest tab (3 items) + cache label */}
      <div key={`${state.tab}-${state.loading}`} className="min-h-[168px] nav-row-enter">
        {state.loading ? (
          <Skeleton />
        ) : (
          <>
            <div className="space-y-3">
              {NAV_TAB_DATA[state.tab].map((item) => (
                <DataRow key={item.name} name={item.name} detail={item.detail} />
              ))}
            </div>
            {state.cached && (
              <p className="mt-3 text-xs font-medium text-accent-strong">
                &larr; from cache
              </p>
            )}
          </>
        )}
      </div>
    </DemoPanel>
  )
}

// ─── Mutation Demo ───────────────────────────────────────

type MutationPhase = "idle" | "dialog" | "saving" | "done"

const NEW_ROLE = "Lead Design"

function MutationDemo() {
  // Both settled: "saving" would spin forever before the reader presses Play.
  const [leftPhase, setLeftPhase] = useState<MutationPhase>("done")
  const [rightPhase, setRightPhase] = useState<MutationPhase>("done")
  const [runKey, setRunKey] = useState(0)

  // runKey 0 is the poster frame: nothing moves until the reader asks for it.
  useEffect(() => {
    if (runKey === 0) return

    const timeouts: ReturnType<typeof setTimeout>[] = []

    // t=1000: Dialog appears on both
    timeouts.push(setTimeout(() => {
      setLeftPhase("dialog")
      setRightPhase("dialog")
    }, 1000))

    // t=2800: User "confirms" edit
    // Right: instant update (optimistic)
    // Left: saving state (spinner)
    timeouts.push(setTimeout(() => {
      setLeftPhase("saving")
      setRightPhase("done")
    }, 2800))

    // t=4200: Left finally resolves
    timeouts.push(setTimeout(() => {
      setLeftPhase("done")
    }, 4200))

    return () => timeouts.forEach(clearTimeout)
  }, [runKey])

  // Rewinding belongs to the click, not to the effect.
  const replay = useCallback(() => {
    setLeftPhase("idle")
    setRightPhase("idle")
    setRunKey((k) => k + 1)
  }, [])

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        <MutationPanel label="Without cachedMutation()" phase={leftPhase} accent={false} />
        <MutationPanel label="With cachedMutation()" phase={rightPhase} accent />
      </div>
      <ReplayButton onClick={replay} played={runKey > 0} />
    </>
  )
}

function MutationPanel({
  label,
  phase,
  accent,
}: {
  label: string
  phase: MutationPhase
  accent: boolean
}) {
  const isEditing = phase !== "idle"
  const showNewValue = phase === "done"

  return (
    <DemoPanel label={label} accent={accent} glow={accent && phase === "done"}>
      <div className="relative">
        {/* Data rows, dimmed when dialog is open */}
        <div className={`space-y-3 transition-opacity duration-200 ${isEditing ? "opacity-30" : ""}`}>
          <DataRow name="Alice Martin" detail="Engineering" />
          <DataRow
            name="Bob Chen"
            detail={showNewValue ? NEW_ROLE : "Editor"}
          />
          <DataRow name="Carol Wu" detail="Marketing" />
        </div>

        {/* Overlay dialog */}
        {isEditing && (
          <>
            {/* Backdrop */}
            <div className="absolute inset-0" />
            {/* Dialog */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-2 rounded-xl border border-border bg-background p-4 shadow-lg nav-row-enter">
              <p className="text-xs font-semibold text-foreground">Edit role</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Change role for Bob Chen</p>

              {/* Input-like field showing the change */}
              <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground">Role</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground line-through">Editor</span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="font-semibold text-foreground">{NEW_ROLE}</span>
                </div>
              </div>

              {/* Footer with action status */}
              <div className="mt-3 flex items-center justify-end gap-2">
                {phase === "dialog" && (
                  <span className="rounded-md bg-foreground px-3 py-1 text-[11px] font-medium text-background">
                    Save
                  </span>
                )}
                {phase === "saving" && (
                  <span className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                    Saving...
                  </span>
                )}
                {phase === "done" && (
                  <span className={`rounded-md px-3 py-1 text-[11px] font-medium ${
                    accent
                      ? "bg-accent/10 text-accent-strong"
                      : "bg-ok/10 text-ok-strong"
                  }`}>
                    {accent ? "✓ Instant" : "✓ Saved"}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DemoPanel>
  )
}

// ─── Main Export ─────────────────────────────────────────

export function NavigationDemo() {
  const [mode, setMode] = useState<"nav" | "mutation">("nav")

  return (
    <div
      data-md-visual
      role="group"
      aria-label="Animated comparison of the same app with and without ziflux"
      className="mt-10"
    >
      <div className="mb-4 flex gap-1">
        <button
          onClick={() => setMode("nav")}
          aria-pressed={mode === "nav"}
          className={`relative cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-[''] ${
            mode === "nav"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Navigations
        </button>
        <button
          onClick={() => setMode("mutation")}
          aria-pressed={mode === "mutation"}
          className={`relative cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-[''] ${
            mode === "mutation"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mutations
        </button>
      </div>

      {mode === "nav" ? <NavDemo /> : <MutationDemo />}
    </div>
  )
}
