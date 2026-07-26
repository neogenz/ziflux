import { CodeBlock } from "@/components/shared/code-block"

const INSTALL_CODE = `npm install ngx-ziflux`

export function ClosingCta() {
  return (
    <section className="bg-accent text-accent-foreground">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Add it to one resource()
        </h2>
        <p className="mt-4 max-w-[62ch] text-base font-medium sm:text-lg">
          Caches resource(). Nothing else. Zero dependencies, 6.2 kB brotli, three APIs.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <CodeBlock code={INSTALL_CODE} language="bash" />
          </div>
          {/* --ring defaults to --foreground, which is near-white in dark mode.
              --accent-foreground is near-black in both themes, so the ring holds
              6.28:1 on this orange either way. */}
          <a
            href="/docs"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.96] sm:self-auto [--ring:var(--accent-foreground)]"
          >
            Read the docs
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
