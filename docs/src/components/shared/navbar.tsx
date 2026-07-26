"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Github, ExternalLink, Sun, Moon, Monitor } from "lucide-react"

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

export function Navbar() {
  const pathname = usePathname()
  const onDocs = pathname.startsWith("/docs")

  // One route link, so no hamburger and no in-page anchor list. The landing is
  // short enough to scroll, and the docs get their own sidebar in phase 3.
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
            ziflux
          </Link>
          <Link
            href="/docs"
            aria-current={onDocs ? "page" : undefined}
            className={`text-sm transition-colors hover:text-foreground ${
              onDocs ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            Documentation
          </Link>
        </div>

        {/* gap-3 keeps the three 44px tactile zones adjacent instead of overlapping. */}
        <div className="flex items-center gap-3">
          <a
            href="https://www.npmjs.com/package/ngx-ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className="relative hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-[''] hover:text-foreground min-[400px]:inline-flex"
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
        </div>
      </nav>
    </header>
  )
}
