import { Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-white">
            Z
          </span>
          <span>ziflux &middot; MIT License</span>
        </div>
        <a
          href="#" /* TODO: replace with real GitHub URL */
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="GitHub"
        >
          <Github size={18} />
        </a>
      </div>
    </footer>
  )
}
