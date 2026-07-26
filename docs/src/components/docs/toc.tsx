"use client"

import { useMemo } from "react"
import {
  DOCS_SECTIONS,
  DOCS_SECTION_IDS,
} from "@/components/docs/navigation"
import { useActiveHeading } from "@/hooks/use-active-heading"

export function TableOfContents() {
  const activeSectionId = useActiveHeading(DOCS_SECTION_IDS)
  const activeSection = DOCS_SECTIONS.find(({ id }) => id === activeSectionId)
  const headingIds = useMemo(
    () => activeSection?.headings.map(({ id }) => id) ?? [],
    [activeSection],
  )
  const activeHeadingId = useActiveHeading(headingIds)

  if (!activeSection || activeSection.headings.length === 0) return null

  return (
    <nav
      data-md-visual
      aria-label={`On this page: ${activeSection.label}`}
      className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-border bg-muted/40 p-2"
    >
      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        On this page
      </p>
      {activeSection.headings.map((heading) => {
        const active = heading.id === activeHeadingId
        return (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            aria-current={active ? "location" : undefined}
            className={`flex min-h-11 items-center border-l-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-accent bg-background font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            {heading.label}
          </a>
        )
      })}
    </nav>
  )
}
