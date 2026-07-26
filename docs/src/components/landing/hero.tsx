import { CodeBlock } from "@/components/shared/code-block"
import { NavigationDemo } from "./navigation-demo"
import { CopyPageDropdown } from "@/components/shared/copy-page-dropdown"

const INSTALL_CODE = `npm install ngx-ziflux`

const USAGE_CODE = `const todos = cachedResource({
  cache: this.#api.cache,
  cacheKey: params => ['todos', params.status],
  params: () => this.filters(),
  loader: ({ params }) => this.#api.getAll$(params),
})`

export function Hero() {
  return (
    <section className="relative px-6 pt-20 pb-8 sm:pt-28 sm:pb-12">
      {/* Ambient glow, viewport-wide now that the section no longer clips it */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[500px] bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklab,var(--accent)_8%,transparent)_0%,transparent_60%)]" />

      <div className="relative mx-auto max-w-2xl">
        {/* flex-col-reverse keeps the badge first in DOM order for the Markdown
            scrape while putting the control on top on phones. */}
        <div className="mb-6 flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between">
          <p className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Angular 22+ &middot; Zero dependencies &middot; Signal-native &middot; Tree-shakeable
          </p>
          <CopyPageDropdown />
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.75rem,6vw,5rem)] font-[750] leading-[0.98] tracking-[-0.035em]">
          SWR caching for Angular{" "}
          <span className="text-accent-display">resource()</span>
        </h1>

        {/* One-liner subtitle */}
        <p className="mt-4 text-lg text-muted-foreground">
          Stale-while-revalidate for <code className="rounded bg-muted px-1.5 py-0.5 text-base">resource()</code>. Instant navigations, silent background refreshes.
        </p>

        {/* Value proposition */}
        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          Go back to a page you already visited and you get the spinner again. ziflux paints the
          cached value immediately and refreshes behind it, for as long as the entry is within{" "}
          <code>expireTime</code>.
        </p>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          If you know <code>resource()</code> and signals, most of this is already familiar. Three
          APIs, no runtime dependencies, 6.2 kB brotli enforced in CI.
        </p>

        {/* Install */}
        <div className="mt-8">
          <CodeBlock code={INSTALL_CODE} language="bash" />
        </div>

        {/* Primary CTAs, explicit paths after install snippet */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href="/docs/quick-start/"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-[opacity,scale] duration-150 hover:opacity-90 active:scale-[0.96]"
          >
            Quick start
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="https://www.npmjs.com/package/ngx-ziflux"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-[color,background-color,scale] duration-150 hover:bg-muted active:scale-[0.96]"
          >
            View on npm
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        {/* Usage, the signature code */}
        <div className="mt-6">
          <CodeBlock code={USAGE_CODE} filename="order-list.store.ts" />
        </div>

        {/* The label stays on the prose axis; only the demo below breaks out, so
            the heading does not float 176px left of the thing it names. */}
        <h2 className="mt-10 text-lg font-semibold">What it feels like</h2>
        <p className="mt-2 text-sm text-muted-foreground">Same app, same actions. One caches.</p>
      </div>

      {/* Animated comparison, wider than the prose column: it is the argument, not an illustration */}
      <div className="relative mx-auto mt-6 max-w-5xl">
        <NavigationDemo />
      </div>
    </section>
  )
}
