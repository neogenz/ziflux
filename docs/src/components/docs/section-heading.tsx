import type { ReactNode } from "react"

interface SectionHeadingProps {
  level: 2 | 3
  id: string
  label: string
  children: ReactNode
  className?: string
}

export function SectionHeading({
  level,
  id,
  label,
  children,
  className = "",
}: SectionHeadingProps) {
  const Heading = level === 2 ? "h2" : "h3"
  const scale =
    level === 2
      ? "text-[1.35rem] leading-[1.25] font-bold tracking-[-0.02em]"
      : "text-[1.125rem] leading-[1.35] font-semibold"

  return (
    <Heading id={id} className={`group ${scale} ${className}`}>
      <a
        href={`#${id}`}
        aria-label={`${label}, permalink`}
        className="rounded-sm hover:no-underline"
      >
        {children}{" "}
        <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground group-focus-within:text-muted-foreground">
          #
        </span>
      </a>
    </Heading>
  )
}
