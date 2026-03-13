import { Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" aria-hidden="true">
            <rect x="110" y="110" width="45" height="45" fill="currentColor"/>
            <rect x="165" y="110" width="45" height="45" fill="currentColor"/>
            <rect x="220" y="110" width="45" height="45" fill="currentColor"/>
            <rect x="275" y="110" width="45" height="45" fill="currentColor"/>
            <rect x="330" y="110" width="45" height="45" fill="currentColor"/>
            <rect x="275" y="165" width="45" height="45" fill="currentColor"/>
            <rect x="220" y="220" width="45" height="45" fill="currentColor"/>
            <rect x="165" y="275" width="45" height="45" fill="currentColor"/>
            <rect x="110" y="330" width="45" height="45" fill="currentColor"/>
            <rect x="110" y="385" width="45" height="45" fill="currentColor"/>
            <rect x="165" y="385" width="45" height="45" fill="currentColor"/>
            <rect x="220" y="385" width="45" height="45" fill="currentColor"/>
            <rect x="275" y="385" width="45" height="45" fill="currentColor"/>
            <rect x="330" y="385" width="45" height="45" fill="currentColor"/>
          </svg>
          <span>ziflux &middot; MIT License</span>
        </div>
        <a
          href="https://github.com/neogenz/ziflux"
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
