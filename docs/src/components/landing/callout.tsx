import type { ReactNode } from "react"
import { Info, AlertTriangle, AlertOctagon } from "lucide-react"

type CalloutVariant = "tip" | "important" | "critical"

const VARIANTS: Record<CalloutVariant, { icon: typeof Info; border: string; bg: string; iconColor: string; label: string }> = {
  tip: {
    icon: Info,
    border: "border-blue-500/20",
    bg: "bg-blue-500/[0.03]",
    iconColor: "text-blue-500",
    label: "Tip",
  },
  important: {
    icon: AlertTriangle,
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.03]",
    iconColor: "text-amber-500",
    label: "Important",
  },
  critical: {
    icon: AlertOctagon,
    border: "border-red-500/20",
    bg: "bg-red-500/[0.03]",
    iconColor: "text-red-500",
    label: "Critical",
  },
}

export function Callout({ variant, title, children }: { variant: CalloutVariant; title?: string; children: ReactNode }) {
  const v = VARIANTS[variant]
  const Icon = v.icon

  return (
    <div className={`rounded-lg border ${v.border} ${v.bg} px-5 py-4`}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={`mt-0.5 shrink-0 ${v.iconColor}`} />
        <div>
          {title && <p className="text-sm font-semibold">{title}</p>}
          <div className={`text-sm text-muted-foreground ${title ? "mt-2" : ""}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}
