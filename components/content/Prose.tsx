import type { ReactNode } from "react";

/** Renders owner-written text: blank line = paragraph, "## " = heading, "- " lines = bullets. No HTML is ever injected. */
export function Prose({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 leading-relaxed text-muted">
      {blocks.map((b, i): ReactNode => {
        if (b.startsWith("## ")) return <h2 key={i} className="pt-2 text-xl font-semibold text-fg">{b.slice(3)}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i} className="list-disc space-y-1 pl-6">{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}
