"use client";
import type { FactIndex } from "./PackView";

const TOKEN = /\[(f_[a-z0-9]+(?:\s*,\s*f_[a-z0-9]+)*)\]|\[(trip)\]|\[needs your input:\s*([^\]]*)\]/gi;

/** Strip citation and input markers, for comparing paragraphs. */
export function plain(p: string) {
  return p.replace(TOKEN, " ").replace(/\s+/g, " ").trim();
}

/** Cover letter text with inline citations shown as small marks and gaps shown as gaps. */
export function LetterText({ text, index }: { text: string; index: FactIndex }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, "gi");
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const ids = m[1].split(/\s*,\s*/);
      out.push(
        <sup key={k++} className="mono text-[10px] text-[var(--ice)] ml-0.5" title={ids.map((id) => index.get(id)?.fact.text ?? id).join("\n")}>
          {ids.map((id) => (index.get(id) ? `F${index.get(id)!.n}` : "F")).join(",")}
        </sup>
      );
    } else if (m[2]) {
      out.push(<sup key={k++} className="mono text-[10px] text-[var(--fg-3)] ml-0.5">trip</sup>);
    } else {
      out.push(
        <span key={k++} className="mono text-[13px] text-[var(--fg-2)] border-b border-dashed border-[var(--rule-strong)]">
          [to add: {m[3]}]
        </span>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
