import { CodeBlock } from "./code-block"

const INSTALL_CODE = `npx skills add https://github.com/neogenz/ziflux --skill ziflux-expert`

export function AiSkills() {
  return (
    <section id="ai-skills" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-center text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#ai-skills" className="hover:no-underline">AI skills <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        Give your AI coding agent deep ziflux expertise. Works with Claude Code, Cursor, Windsurf, and any{" "}
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

      <ul className="mt-8 border-y border-border divide-y divide-border text-sm">
        <li className="grid gap-1 py-4 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-6">
          <p><strong className="font-semibold">Implementation patterns</strong></p>
          <p className="text-muted-foreground">Domain architecture, cachedResource setup, mutations, optimistic updates, polling, and retry.</p>
        </li>
        <li className="grid gap-1 py-4 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-6">
          <p><strong className="font-semibold">Code review checklist</strong></p>
          <p className="text-muted-foreground">Architecture rules, cache key design, signal usage, and common anti-patterns to catch.</p>
        </li>
        <li className="grid gap-1 py-4 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-6">
          <p><strong className="font-semibold">Debugging guide</strong></p>
          <p className="text-muted-foreground">Stale data issues, NG0203 errors, idle resources, duplicate requests, and devtools usage.</p>
        </li>
        <li className="grid gap-1 py-4 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-6">
          <p><strong className="font-semibold">Testing patterns</strong></p>
          <p className="text-muted-foreground">TestBed setup, store testing, DataCache testing, mutation testing, and fake timers.</p>
        </li>
      </ul>
    </section>
  )
}
