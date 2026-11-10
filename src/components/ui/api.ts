// Thin JSON fetch helper. Surfaces the API's own error message.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

export async function api<T>(path: string, body?: unknown, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      ...init,
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
    if (!res.ok) {
      const j = json as { error?: unknown; message?: unknown } | null;
      const msg =
        (j && typeof j.error === "string" && j.error) ||
        (j && typeof j.message === "string" && j.message) ||
        (text && text.length < 300 ? text : "") ||
        `Request failed with status ${res.status}`;
      return { ok: false, error: msg, status: res.status };
    }
    if (json === null) return { ok: false, error: "The server sent an empty or unreadable reply.", status: res.status };
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export const walrusBlobUrl = (blobId: string) => `https://walruscan.com/mainnet/blob/${blobId}`;
export const suiTxUrl = (digest: string) => `https://suivision.xyz/txblock/${digest}`;
export const suiObjectUrl = (id: string) => `https://suivision.xyz/object/${id}`;
export const suiAccountUrl = (addr: string) => `https://suivision.xyz/account/${addr}`;

export const short = (s: string, head = 6, tail = 4) =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
