import type { ApiTransaction } from "./types.ts";

const SENSITIVE = /^(authorization|cookie|set-cookie)$|key|token|secret|password/i;

export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE.test(name);
}

export function maskHeaders(
  headers: Record<string, string>,
  mask: boolean,
): Record<string, string> {
  if (!mask) return headers;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    out[name] = isSensitiveHeader(name) ? "****" : value;
  }
  return out;
}

export function maskTransaction(
  item: ApiTransaction,
  mask: boolean,
): ApiTransaction {
  if (!mask) return item;
  return {
    ...item,
    request: {
      ...item.request,
      headers: maskHeaders(item.request.headers, true),
    },
    response: {
      ...item.response,
      headers: maskHeaders(item.response.headers, true),
    },
  };
}
