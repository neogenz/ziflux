import { Github, ExternalLink } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-white">
            Z
          </span>
          ziflux
        </a>

        <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#quickstart" className="transition-colors hover:text-foreground">
            Quick Start
          </a>
          <a href="#api" className="transition-colors hover:text-foreground">
            API
          </a>
          <a href="#architecture" className="transition-colors hover:text-foreground">
            Architecture
          </a>
          <a href="#freshness" className="transition-colors hover:text-foreground">
            Freshness
          </a>
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
            href="https://github.com/user/ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </a>
        </div>
      </nav>
    </header>
  )
}
