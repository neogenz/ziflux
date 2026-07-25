import type { ReactNode } from "react"
import { Info, AlertTriangle, AlertOctagon } from "lucide-react"

type CalloutVariant = "tip" | "important" | "critical"

const VARIANTS: Record<CalloutVariant, { icon: typeof Info; border: string; bg: string; iconColor: string; label: string }> = {
  tip: {
    icon: Info,
    border: "border-info/20",
    bg: "bg-info/[0.03]",
    iconColor: "text-info-strong",
    label: "Tip",
  },
  important: {
    icon: AlertTriangle,
    border: "border-caution/20",
    bg: "bg-caution/[0.03]",
    iconColor: "text-caution-strong",
    label: "Important",
  },
  critical: {
    icon: AlertOctagon,
    border: "border-danger/20",
    bg: "bg-danger/[0.03]",
    iconColor: "text-danger-strong",
    label: "Critical",
  },
}

export function Callout({ variant, title, children }: { variant: CalloutVariant; title?: string; children: ReactNode }) {
  const v = VARIANTS[variant]
  const Icon = v.icon

  return (
    <div className={`rounded-lg border ${v.border} ${v.bg} px-5 py-4`}>
      <div className="flex items-start gap-3">
        {/* The icon is the only carrier of the severity, so it needs a name. */}
        <Icon size={16} role="img" aria-label={v.label} className={`mt-0.5 shrink-0 ${v.iconColor}`} />
        <div>
          {title && <p className="text-sm font-semibold">{title}</p>}
          <div className={`text-sm text-muted-foreground ${title ? "mt-2" : ""}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}
