import { CodeBlock } from "@/components/shared/code-block"

const INSTALL_CODE = `npx skills add https://github.com/neogenz/ziflux --skill ziflux-expert`

// max-w-3xl, not 2xl: the install command is 70 chars and overflows a 672px code
// block. Not adjacent to the other 3xl section, so the width rhythm still holds.
export function AiSkills() {
  return (
    <section id="ai-skills" className="mx-auto max-w-3xl px-6 pt-8 pb-20 sm:pb-28">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#ai-skills" className="hover:no-underline">AI skills <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 max-w-[68ch] text-muted-foreground">
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
    </section>
  )
}
