"use client"

import { useState } from "react"
import { Check, Copy, X } from "lucide-react"

export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")

  // Clipboard writes reject on an insecure origin or a denied permission, and a
  // button that silently does nothing is worse than one that says so.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
    setTimeout(() => setStatus("idle"), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/40 opacity-100 transition-[background-color,color,opacity,scale] duration-150 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-white/20 hover:text-white/70 active:scale-[0.96] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 [--ring:var(--code-fg)]"
      aria-label={status === "failed" ? "Copy failed" : "Copy code"}
    >
      {status === "copied" ? (
        <Check size={14} />
      ) : status === "failed" ? (
        <X size={14} />
      ) : (
        <Copy size={14} />
      )}
    </button>
  )
}
