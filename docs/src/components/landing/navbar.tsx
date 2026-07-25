"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Github, ExternalLink, Menu, X, Sun, Moon, Monitor } from "lucide-react"

// Document order — useActiveSection resolves ties by taking the first match.
const NAV_LINKS = [
  { href: "#quickstart", label: "Quick start" },
  { href: "#not-a-fit", label: "Not a fit" },
  { href: "#guide", label: "Guide" },
  { href: "#freshness", label: "Caching" },
  { href: "#scenarios", label: "Use cases" },
  { href: "#prior-art", label: "Compare" },
  { href: "#advanced-usage", label: "Patterns" },
  { href: "#testing", label: "Testing" },
  { href: "#api", label: "API" },
  { href: "#gotchas", label: "Gotchas" },
  { href: "#ai-skills", label: "AI skills" },
]

// 44px tactile zone around a 34px icon control, without moving the layout.
const TAP_TARGET =
  "relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"

const neverChanges = () => () => {}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // next-themes only knows the real theme after hydration. useSyncExternalStore
  // reports that without a setState inside an effect.
  const mounted = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  )

  // Same box as the mounted button, so hydration does not shift the nav row.
  if (!mounted) {
    return <div className="h-[34px] w-[34px]" />
  }

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <button
      onClick={() => setTheme(next)}
      className={`rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground ${TAP_TARGET}`}
      aria-label={`Switch to ${next} theme`}
    >
      <Icon size={18} />
    </button>
  )
}

function useActiveSection() {
  const [active, setActive] = useState("")

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1))
    // Tracking the whole visible set (rather than reacting to each entry) both
    // clears the highlight past the last section and keeps it deterministic
    // when the observer band straddles two adjacent sections.
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const current = ids.find((id) => visible.has(id))
        setActive(current ? `#${current}` : "")
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  return active
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const activeSection = useActiveSection()

  // The header is opaque rather than translucent: at bg-background/80 a code
  // block scrolling underneath paints through and drops the muted-foreground
  // links to 3.15:1 in light theme.
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
        <a href="#" className="shrink-0 text-lg font-bold tracking-tight">
          ziflux<span className="font-normal text-muted-foreground">.docs</span>
        </a>

        {/* Desktop links. 11 labels no longer fit a 1024px row, hence xl. */}
        <div className="hidden items-center gap-5 text-sm text-muted-foreground xl:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={activeSection === link.href ? "true" : undefined}
              className={`whitespace-nowrap transition-colors hover:text-foreground ${activeSection === link.href ? "text-foreground" : ""}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* gap-3 keeps the three 44px tactile zones adjacent instead of overlapping. */}
        <div className="flex items-center gap-3">
          <a
            href="https://www.npmjs.com/package/ngx-ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className="relative hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-[''] hover:text-foreground min-[360px]:inline-flex"
          >
            npm
            <ExternalLink size={10} />
          </a>
          <a
            href="https://github.com/neogenz/ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground ${TAP_TARGET}`}
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </a>
          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={`rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground xl:hidden ${TAP_TARGET}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div
          id="nav-menu"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border/50 bg-background px-6 pb-4 pt-2 xl:hidden"
        >
          {/* py-3 instead of a gap: the rows become 44px targets and stay flush. */}
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
