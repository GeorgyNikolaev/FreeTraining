import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "danger" | "warning";

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: "bg-sunken text-body", icon: Info },
  success: { box: "bg-success-soft text-body", icon: CheckCircle2 },
  danger: { box: "bg-danger-soft text-body", icon: XCircle },
  warning: { box: "bg-sunken text-body", icon: AlertTriangle },
};

const ICON_TONES: Record<Tone, string> = {
  info: "text-subtle",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}) {
  const Icon = TONES[tone].icon;

  return (
    <div className={clsx("flex gap-3 rounded-card p-4", TONES[tone].box)}>
      <Icon size={18} className={clsx("mt-0.5 shrink-0", ICON_TONES[tone])} />
      <div className="min-w-0 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-muted">{children}</div> : null}
      </div>
    </div>
  );
}
