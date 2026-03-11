"use client"

import { useState } from "react"
import { Github, ExternalLink, Menu, X } from "lucide-react"

const NAV_LINKS = [
  { href: "#quickstart", label: "Quick Start" },
  { href: "#api", label: "API" },
  { href: "#architecture", label: "Architecture" },
  { href: "#freshness", label: "Freshness" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-white">
            Z
          </span>
          ziflux
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
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
            href="#" /* TODO: replace with real GitHub URL */
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </a>

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
