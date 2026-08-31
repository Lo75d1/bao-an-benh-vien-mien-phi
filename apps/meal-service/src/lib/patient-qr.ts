export function normalizeQrTargetUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function buildDepartmentQrUrl(baseUrl: string, token: string) {
  const cleanBase = normalizeQrTargetUrl(baseUrl);
  if (!cleanBase || !token.trim()) return "";
  try {
    return new URL(`/k/${encodeURIComponent(token)}`, cleanBase).toString();
  } catch {
    return "";
  }
}
