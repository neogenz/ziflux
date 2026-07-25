"use client"

import { useState, useEffect, useRef } from "react"
import { Copy, FileText, ChevronDown, Check } from "lucide-react"
import { pageToMarkdown } from "@/lib/page-to-markdown"

export function CopyPageDropdown() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  // Closing unmounts whatever item was focused, so focus goes back to the
  // trigger rather than being dropped on <body>.
  const closeMenu = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const copyPage = async () => {
    try {
      await navigator.clipboard.writeText(pageToMarkdown())
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
    setTimeout(() => setStatus("idle"), 2000)
  }

  const viewAsMarkdown = () => {
    const md = pageToMarkdown()
    const blob = new Blob([md], { type: "text/plain" })
    window.open(URL.createObjectURL(blob), "_blank")
    closeMenu()
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-lg border border-border-strong">
        <button
          onClick={copyPage}
          className="flex cursor-pointer items-center gap-2 rounded-l-lg px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Copy page as Markdown"
        >
          <span className="relative h-3.5 w-3.5">
            <Copy
              size={14}
              className={`absolute inset-0 transition-[scale,opacity] duration-300 ${status === "copied" ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
            />
            <Check
              size={14}
              className={`absolute inset-0 text-ok-strong transition-[scale,opacity] duration-300 ${status === "copied" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
            />
          </span>
          <span>
            {status === "copied"
              ? "Copied!"
              : status === "failed"
                ? "Copy failed"
                : "Copy page"}
          </span>
        </button>
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-11 cursor-pointer items-center justify-center rounded-r-lg border-l border-border py-3 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="More copy options"
          aria-expanded={open}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Left-anchored on phones, where the trigger sits at the left edge and a
          right-anchored w-52 panel would hang off the viewport. */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-background p-1 shadow-lg sm:left-auto sm:right-0">
          <button
            onClick={() => {
              copyPage()
              closeMenu()
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <Copy size={16} className="shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">Copy page</div>
              <div className="text-xs text-muted-foreground">
                As Markdown for LLMs
              </div>
            </div>
          </button>
          <button
            onClick={viewAsMarkdown}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <FileText size={16} className="shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">View as Markdown</div>
              <div className="text-xs text-muted-foreground">
                Open raw text in new tab
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
