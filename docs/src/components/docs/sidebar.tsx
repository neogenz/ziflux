"use client"

import {
  DOCS_HEADING_IDS,
  DOCS_SECTIONS,
  DOCS_SECTION_IDS,
} from "@/components/docs/navigation"
import { useActiveHeading } from "@/hooks/use-active-heading"

function activeClasses(active: boolean): string {
  return active
    ? "border-accent bg-background font-semibold text-foreground"
    : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
}

export function Sidebar() {
  const activeSectionId = useActiveHeading(DOCS_SECTION_IDS)
  const activeHeadingId = useActiveHeading(DOCS_HEADING_IDS)

  return (
    <>
      <details data-md-visual className="group mb-6 rounded-lg border border-border bg-muted/40 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold marker:content-none">
          Sections
          <span
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          >
            ↓
          </span>
        </summary>
        <nav
          aria-label="Documentation sections"
          className="max-h-[min(60vh,24rem)] overflow-y-auto border-t border-border p-2"
        >
          {DOCS_SECTIONS.map((section) => (
            <div key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={activeSectionId === section.id ? "location" : undefined}
                className={`flex min-h-11 items-center border-l-2 px-3 text-sm transition-colors ${activeClasses(activeSectionId === section.id)}`}
              >
                {section.label}
              </a>
              {section.headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  aria-current={activeHeadingId === heading.id ? "location" : undefined}
                  className={`flex min-h-11 items-center border-l-2 py-2 pr-3 pl-6 text-sm transition-colors ${activeClasses(activeHeadingId === heading.id)}`}
                >
                  {heading.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </details>

      <nav
        data-md-visual
        aria-label="Documentation sections"
        className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-border bg-muted/40 p-2 lg:block"
      >
        <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Sections
        </p>
        {DOCS_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={activeSectionId === section.id ? "location" : undefined}
            className={`flex min-h-11 items-center border-l-2 px-3 text-sm transition-colors ${activeClasses(activeSectionId === section.id)}`}
          >
            {section.label}
          </a>
        ))}
      </nav>
    </>
  )
}
