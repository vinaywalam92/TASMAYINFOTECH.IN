import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  as?: "input" | "textarea" | "select";
  type?: string;
  children?: ReactNode; // <option>s for select
} & Omit<ComponentProps<"input">, "name" | "type" | "defaultValue" | "className" | "children">;

/**
 * Accessible labelled field: label is bound to the control, errors/hints are announced through
 * aria-describedby, and invalid state is exposed with aria-invalid.
 */
export function Field({ label, name, error, hint, required, defaultValue, className, as = "input", type = "text", children, ...rest }: Props) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const shared = { id, name, required, defaultValue, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, className: "input" };

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required ? <span aria-hidden="true" className="ml-0.5 text-red-400">*</span> : <span className="ml-1 text-xs font-normal text-muted">(optional)</span>}
      </label>
      {as === "textarea" ? (
        <textarea rows={5} {...(shared as unknown as ComponentProps<"textarea">)} {...(rest as unknown as ComponentProps<"textarea">)} />
      ) : as === "select" ? (
        <select {...(shared as unknown as ComponentProps<"select">)}>{children}</select>
      ) : (
        <input type={type} {...shared} {...rest} />
      )}
      {hint && !error ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
      {error ? <p id={`${id}-err`} role="alert" className="field-error">{error}</p> : null}
    </div>
  );
}

/** Checkbox with label text (supports links via children). */
export function Check({ name, error, children, required, defaultChecked }: { name: string; error?: string; children: ReactNode; required?: boolean; defaultChecked?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-muted">
        <input id={id} name={name} type="checkbox" required={required} defaultChecked={defaultChecked} aria-invalid={error ? true : undefined} className="mt-0.5 size-4 shrink-0 rounded border-line/30 accent-electric" />
        <span>{children}</span>
      </label>
      {error ? <p role="alert" className="field-error">{error}</p> : null}
    </div>
  );
}

/** Form-level success / error banner. */
export function FormMessage({ state }: { state: { ok?: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn("rounded-xl border px-4 py-3 text-sm", state.ok ? "msg-ok" : "msg-err")}
    >
      {state.message}
    </div>
  );
}
