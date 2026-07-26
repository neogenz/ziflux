import type { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { CopyPageDropdown } from "@/components/shared/copy-page-dropdown"
import { Sidebar } from "@/components/docs/sidebar"
import { TableOfContents } from "@/components/docs/toc"

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

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Navbar />
      <main id="main" className="docs-register relative">
        <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-8 px-6 lg:grid-cols-[13rem_minmax(0,56rem)] xl:grid-cols-[13rem_minmax(0,56rem)_13rem] xl:gap-x-10">
          <div className="flex justify-end py-6 lg:col-start-2">
            <CopyPageDropdown />
          </div>
          <div className="lg:col-start-1 lg:row-start-2">
            <Sidebar />
          </div>
          <div className="min-w-0 lg:col-start-2 lg:row-start-2">
            {children}
          </div>
          <div className="hidden xl:col-start-3 xl:row-start-2 xl:block">
            <TableOfContents />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
