"use client"

import { useEffect, useState } from "react"

export function pickTopmostId(
  ids: readonly string[],
  intersecting: ReadonlySet<string>,
  top: (id: string) => number,
): string | null {
  return ids
    .filter((id) => intersecting.has(id))
    .sort((a, b) => top(a) - top(b))[0] ?? null
}

export function useActiveHeading(ids: readonly string[]): string | null {
  const [observedId, setObservedId] = useState<string | null>(ids[0] ?? null)
  const activeId = observedId && ids.includes(observedId) ? observedId : ids[0] ?? null

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const intersecting = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id)
          else intersecting.delete(entry.target.id)
        }

        const nextId = pickTopmostId(
          ids,
          intersecting,
          (id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity,
        )

        // Keep the last match through gaps and below the final heading.
        if (nextId) setObservedId(nextId)
      },
      { rootMargin: "-80px 0px -70% 0px" },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [ids])

  return activeId
}
