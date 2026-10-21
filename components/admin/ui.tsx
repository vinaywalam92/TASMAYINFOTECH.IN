import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Flash({ sp }: { sp: { saved?: string; error?: string; denied?: string } }) {
  if (sp.error) return <p role="alert" className="msg-err mb-4 rounded-xl border px-4 py-3 text-sm">{sp.error}</p>;
  if (sp.saved) return <p role="status" className="msg-ok mb-4 rounded-xl border px-4 py-3 text-sm">{sp.saved === "1" ? "Saved." : sp.saved}</p>;
  if (sp.denied) return <p role="alert" className="msg-err mb-4 rounded-xl border px-4 py-3 text-sm">You do not have permission for that area.</p>;
  return null;
}

type FProps = { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; hint?: string; textarea?: boolean; rows?: number; className?: string; placeholder?: string; step?: string };
export function F({ label, name, defaultValue, type = "text", required, hint, textarea, rows = 4, className, placeholder, step }: FProps) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {textarea
        ? <textarea id={id} name={name} rows={rows} required={required} defaultValue={defaultValue ?? ""} className="input" placeholder={placeholder} />
        : <input id={id} name={name} type={type} step={step} required={required} defaultValue={defaultValue ?? ""} className="input" placeholder={placeholder} />}
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Sel({ label, name, value, options, className }: { label: string; name: string; value?: string | null; options: { value: string; label: string }[]; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="label">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="input">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </div>
  );
}

export const Chk = ({ name, label, checked }: { name: string; label: string; checked?: boolean }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-electric-500" /> {label}</label>
);

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={cn("glass rounded-2xl p-5", className)}>{title ? <h2 className="mb-4 font-semibold">{title}</h2> : null}{children}</section>;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line/15 text-xs uppercase tracking-wide text-muted"><tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line/10">{children}</tbody>
      </table>
    </div>
  );
}

export const PageTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{children}</h1>{action}</div>
);
