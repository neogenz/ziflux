import { CopyButton } from "./copy-button"

const KEYWORDS = new Set([
  "import", "export", "from", "const", "let", "var", "readonly", "new",
  "return", "class", "extends", "implements", "interface", "type", "function",
  "async", "await", "if", "else", "try", "catch", "this", "void", "null",
  "undefined", "true", "false", "typeof", "as", "inject", "signal",
  "computed", "pipe", "tap", "of",
])

/**
 * Single-pass TypeScript tokenizer.
 * Splits code into tokens, then wraps each in a span.
 */
function highlightTS(code: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // Single-pass regex: match tokens in priority order
  const TOKEN_RE =
    /(\/\/[^\n]*)|(`[^`]*`)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(@\w+)|(\b\d[\d_]*(?:\.\d+)?\b)|(\b[A-Z][a-zA-Z0-9]*\b)|(\b[a-z_]\w*(?=\())|(\b\w+\b)|(=&amp;gt;|=&gt;)/g

  return escaped.replace(TOKEN_RE, (match, comment, tmpl, str, decorator, num, type, fn, word, arrow) => {
    if (comment) return `<span class="token-comment">${match}</span>`
    if (tmpl) return `<span class="token-string">${match}</span>`
    if (str) return `<span class="token-string">${match}</span>`
    if (decorator) return `<span class="token-fn">${match}</span>`
    if (num) return `<span class="token-number">${match}</span>`
    if (type) return `<span class="token-type">${match}</span>`
    if (fn) return `<span class="token-fn">${match}</span>`
    if (word) {
      if (KEYWORDS.has(match)) return `<span class="token-keyword">${match}</span>`
      return match
    }
    if (arrow) return `<span class="token-keyword">${match}</span>`
    return match
  })
}

export function CodeBlock({
  code,
  filename,
  language = "typescript",
}: {
  code: string
  filename?: string
  language?: string
}) {
  const highlighted = language === "bash"
    ? code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : highlightTS(code)

  return (
    <div className="group relative">
      {filename && (
        <div className="flex items-center gap-2 rounded-t-xl bg-[#181825] px-4 py-2 text-xs text-[var(--code-comment)] border border-b-0 border-white/[0.06]">
          <span>{filename}</span>
        </div>
      )}
      <pre className={filename ? "!rounded-t-none !border-t-0" : ""}>
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      <CopyButton text={code} />
    </div>
  )
}
