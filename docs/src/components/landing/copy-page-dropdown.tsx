"use client"

import { useState, useEffect, useRef } from "react"
import { Copy, FileText, ChevronDown, Check } from "lucide-react"
import { pageToMarkdown } from "@/lib/page-to-markdown"

export function CopyPageDropdown() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "copied">("idle")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const copyPage = async () => {
    const md = pageToMarkdown()
    await navigator.clipboard.writeText(md)
    setStatus("copied")
    setOpen(false)
    setTimeout(() => setStatus("idle"), 2000)
  }

  const viewAsMarkdown = () => {
    const md = pageToMarkdown()
    const blob = new Blob([md], { type: "text/plain" })
    window.open(URL.createObjectURL(blob), "_blank")
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-lg border border-border">
        <button
          onClick={copyPage}
          className="flex cursor-pointer items-center gap-2 rounded-l-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Copy page as Markdown"
        >
          <span className="relative h-3.5 w-3.5">
            <Copy
              size={14}
              className={`absolute inset-0 transition-all duration-300 ${status === "copied" ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
            />
            <Check
              size={14}
              className={`absolute inset-0 text-emerald-500 transition-all duration-300 ${status === "copied" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
            />
          </span>
          <span>{status === "copied" ? "Copied!" : "Copy page"}</span>
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer border-l border-border px-1.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="More copy options"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border bg-background p-1 shadow-lg">
          <button
            onClick={copyPage}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
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
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
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
