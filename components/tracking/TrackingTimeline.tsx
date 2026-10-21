import { Check } from "lucide-react";
import type { TrackingView } from "@/lib/tracking";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TrackingTimeline({ view }: { view: TrackingView }) {
  return (
    <div className="glass space-y-6 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xl font-bold">{view.orderNumber}</h2>
        <span className="chip !text-fg">{view.statusLabel}</span>
      </div>
      {view.terminal ? <p role="status" className="msg-err rounded-xl border px-4 py-3 text-sm">This order is {view.terminal.toLowerCase()}.{view.latestNote ? ` ${view.latestNote}` : ""}</p> : (
        <ol className="relative space-y-5 border-l border-line/20 pl-6" aria-label="Order progress">
          {view.steps.map((s) => (
            <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className="relative">
              <span className={cn("absolute -left-[34px] flex size-5 items-center justify-center rounded-full border text-[10px]", s.state === "done" ? "border-emerald-500 bg-emerald-500 text-white" : s.state === "current" ? "animate-pulse border-electric-500 bg-electric-500" : "border-line/30 bg-surface")}>
                {s.state === "done" ? <Check className="size-3" aria-hidden="true" /> : null}
              </span>
              <p className={cn("text-sm font-medium", s.state === "upcoming" && "text-muted")}>{s.label}</p>
              {s.at ? <p className="text-xs text-muted">{formatDate(s.at, true)}</p> : null}
            </li>
          ))}
        </ol>
      )}
      {view.courier ? (
        <p className="text-sm">Courier: <strong>{view.courier.name}</strong>{view.courier.trackingNumber ? <> · <span className="font-mono">{view.courier.trackingNumber}</span></> : null}{view.courier.trackingUrl ? <> · <a className="text-electric-500 underline" href={view.courier.trackingUrl} target="_blank" rel="noopener noreferrer">Track with courier</a></> : null}</p>
      ) : null}
      {view.estimatedDelivery ? <p className="text-sm text-muted">Estimated delivery: {view.estimatedDelivery} (policy estimate, not live courier data).</p> : null}
      <ul className="text-sm text-muted">{view.items.map((i) => <li key={i.name}>{i.name} × {i.quantity}</li>)}</ul>
    </div>
  );
}
