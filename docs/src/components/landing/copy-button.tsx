"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 rounded-lg bg-white/10 p-2 text-white/40 opacity-100 transition-all hover:bg-white/20 hover:text-white/70 sm:opacity-0 sm:group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}
