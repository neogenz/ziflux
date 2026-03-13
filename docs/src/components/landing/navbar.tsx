"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Github, ExternalLink, Menu, X, Sun, Moon, Monitor } from "lucide-react"

const NAV_LINKS = [
  { href: "#quickstart", label: "Quick Start" },
  { href: "#guide", label: "Guide" },
  { href: "#testing", label: "Testing" },
  { href: "#freshness", label: "Caching" },
  { href: "#advanced-usage", label: "Patterns" },
  { href: "#api", label: "API" },
  { href: "#gotchas", label: "Gotchas" },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-9 w-9" />
  }

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <button
      onClick={() => setTheme(next)}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`)
          }
        }
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

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <a href="#" className="text-lg font-bold tracking-tight">
          ziflux<span className="font-normal text-muted-foreground">.docs</span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-foreground ${activeSection === link.href ? "text-foreground" : ""}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://www.npmjs.com/package/ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            npm
            <ExternalLink size={10} />
          </a>
          <a
            href="https://github.com/neogenz/ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </a>
          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground sm:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-border/50 bg-background px-6 pb-4 pt-2 sm:hidden">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
