// Read an uploaded history file in the browser. Plain text is read as is.
// For PDFs we try a light text pull (inflate content streams, read text
// operators). Scanned or CID font PDFs give nothing readable, and then the
// caller asks the user to paste instead. No guessing.

export async function readHistoryFile(file: File): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const name = file.name.toLowerCase();
  if (file.size > 8 * 1024 * 1024) return { ok: false, reason: "That file is over 8 MB. Paste the text instead." };
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    try {
      const text = await pdfText(file);
      if (looksReadable(text)) return { ok: true, text };
    } catch { /* fall through to the server reader */ }
    // Scans and unusual fonts: read it once on the server (the model transcribes it; nothing is stored).
    if (file.size > 3 * 1024 * 1024) return { ok: false, reason: "That PDF is over 3 MB. Paste the text instead." };
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const res = await fetch("/api/read-pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: btoa(bin) }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok && typeof body.text === "string" && body.text.trim()) return { ok: true, text: body.text };
      return { ok: false, reason: body.error ?? "Could not read this PDF. Paste the text instead." };
    } catch {
      return { ok: false, reason: "Could not read this PDF. Paste the text instead." };
    }
  }
  const text = await file.text();
  if (!text.trim()) return { ok: false, reason: "That file is empty." };
  return { ok: true, text };
}

function looksReadable(t: string) {
  const s = t.replace(/\s+/g, " ").trim();
  if (s.length < 40) return false;
  const letters = (s.match(/[A-Za-z]/g) ?? []).length;
  return letters / s.length > 0.5;
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream("deflate");
  const w = ds.writable.getWriter();
  w.write(bytes as unknown as BufferSource).catch(() => {});
  w.close().catch(() => {});
  const r = ds.readable.getReader();
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await r.read();
      if (done) break;
      parts.push(value);
    }
  } catch {
    /* trailing bytes after the stream end; keep what we got */
  }
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return new TextDecoder("latin1").decode(out);
}

function unescapePdf(s: string) {
  return s
    .replace(/\\([nrtbf()\\])/g, (_, c: string) => ({ n: "\n", r: "", t: " ", b: "", f: "", "(": "(", ")": ")", "\\": "\\" }[c] ?? c))
    .replace(/\\(\d{1,3})/g, (_, o: string) => String.fromCharCode(parseInt(o, 8)));
}

function textFromContent(content: string): string {
  let out = "";
  const blocks = content.match(/BT[\s\S]*?ET/g) ?? [];
  for (const b of blocks) {
    const tokens = b.match(/\((?:\\.|[^\\)])*\)|T\*|Td|TD|Tm|'|"/g) ?? [];
    for (const t of tokens) {
      if (t.startsWith("(")) out += unescapePdf(t.slice(1, -1));
      else out += t === "Tm" || t === "Td" || t === "TD" || t === "T*" || t === "'" || t === '"' ? "\n" : "";
    }
    out += "\n";
  }
  return out;
}

async function pdfText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const latin = new TextDecoder("latin1").decode(buf);
  let text = "";
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin))) {
    const start = m.index + m[0].length;
    const end = latin.indexOf("endstream", start);
    if (end < 0) break;
    const head = latin.slice(Math.max(0, m.index - 400), m.index);
    const dict = head.slice(head.lastIndexOf("<<"));
    let content: string;
    if (/FlateDecode/.test(dict)) {
      try {
        content = await inflate(buf.subarray(start, end));
      } catch {
        re.lastIndex = end;
        continue;
      }
    } else if (/Filter/.test(dict)) {
      re.lastIndex = end;
      continue;
    } else {
      content = latin.slice(start, end);
    }
    text += textFromContent(content);
    re.lastIndex = end;
  }
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
