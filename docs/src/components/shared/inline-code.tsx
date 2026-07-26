import type { ReactNode } from "react"

/**
 * Renders `backtick`-delimited spans as inline code. Several sections hold their
 * copy as plain strings in a data array, where the backticks an author naturally
 * writes would otherwise ship as literal characters.
 */
export function withInlineCode(text: string): ReactNode[] {
  return text
    .split("`")
    .map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))
}
