import { CodeBlock } from "./code-block"

const INSTALL_CODE = `npx skills add neogenz/ziflux`

export function AiSkills() {
  return (
    <section id="ai-skills" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">AI skills</h2>
      <p className="mt-2 text-center text-muted-foreground">
        Give your AI coding agent deep ziflux expertise — works with Claude Code, Cursor, Windsurf, and any{" "}
        <a
          href="https://skills.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          skills.sh
        </a>
        -compatible tool.
      </p>

      <div className="mt-8">
        <CodeBlock code={INSTALL_CODE} language="bash" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">Implementation patterns</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Domain architecture, cachedResource setup, mutations, optimistic updates, polling, and retry.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">Code review checklist</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Architecture rules, cache key design, signal usage, and common anti-patterns to catch.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">Debugging guide</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Stale data issues, NG0203 errors, idle resources, duplicate requests, and devtools usage.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">Testing patterns</p>
          <p className="mt-1 text-sm text-muted-foreground">
            TestBed setup, store testing, DataCache testing, mutation testing, and fake timers.
          </p>
        </div>
      </div>
    </section>
  )
}
