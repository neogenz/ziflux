import type { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { CopyPageDropdown } from "@/components/shared/copy-page-dropdown"

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Reference for ngx-ziflux: quick start, cache keys and freshness, mutations and optimistic updates, testing with TestBed, the full API surface, and the gotchas worth knowing before you hit them.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "ziflux documentation",
    description:
      "Quick start, caching model, patterns, testing, API reference and gotchas for ngx-ziflux.",
    url: "/docs",
  },
}

/**
 * The reference route. Phase 3 turns this into the three-column shell with a
 * sticky sidebar and a table of contents; today it is the shared chrome plus
 * the content column, so nothing empty ships in the meantime.
 */
export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Navbar />
      {/* The landing carries this control in its hero; the reference route is
          where copying the page for an LLM actually pays off. */}
      <div className="mx-auto flex max-w-4xl justify-end px-6 pt-8">
        <CopyPageDropdown />
      </div>
      <main id="main" className="relative">
        {children}
      </main>
      <Footer />
    </>
  )
}
