import { maskTransaction } from "./mask.ts";
import type { ApiTransaction, CleanApiTransaction } from "./types.ts";

export function toCleanTransaction(
  item: ApiTransaction,
  mask = false,
): CleanApiTransaction {
  const masked = maskTransaction(item, mask);
  return {
    request: {
      url: masked.request.url,
      method: masked.request.method,
      headers: masked.request.headers,
      ...(masked.request.query ? { query: masked.request.query } : {}),
      ...(masked.request.body !== undefined ? { body: masked.request.body } : {}),
      ...(masked.request.bodyRaw !== undefined ? { bodyRaw: masked.request.bodyRaw } : {}),
      ...(masked.request.bodyUnavailable ? { bodyUnavailable: true } : {}),
      ...(masked.request.bodyTruncated ? { bodyTruncated: true } : {}),
    },
    response: {
      status: masked.response.status,
      ...(masked.response.statusText
        ? { statusText: masked.response.statusText }
        : {}),
      headers: masked.response.headers,
      ...(masked.response.body !== undefined ? { body: masked.response.body } : {}),
      ...(masked.response.bodyRaw !== undefined
        ? { bodyRaw: masked.response.bodyRaw }
        : {}),
      ...(masked.response.bodyUnavailable ? { bodyUnavailable: true } : {}),
      ...(masked.response.bodyTruncated ? { bodyTruncated: true } : {}),
    },
    ...(masked.timing ? { timing: masked.timing } : {}),
  };
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function formatEntireApi(item: ApiTransaction, mask = false): string {
  return prettyJson(toCleanTransaction(item, mask));
}

export function formatRequestJson(item: ApiTransaction, mask = false): string {
  return prettyJson(toCleanTransaction(item, mask).request);
}

export function formatResponseJson(item: ApiTransaction, mask = false): string {
  return prettyJson(toCleanTransaction(item, mask).response);
}

export function formatRequestAndResponse(item: ApiTransaction, mask = false): string {
  const clean = toCleanTransaction(item, mask);
  return prettyJson({ request: clean.request, response: clean.response });
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function requestBodyText(item: ApiTransaction): string | undefined {
  if (item.request.body !== undefined) {
    return typeof item.request.body === "string"
      ? item.request.body
      : JSON.stringify(item.request.body);
  }
  return item.request.bodyRaw;
}

export function formatCurl(item: ApiTransaction, mask = false): string {
  const masked = maskTransaction(item, mask);
  const parts = [`curl -X ${masked.request.method} ${shellEscape(masked.request.url)}`];
  for (const [name, value] of Object.entries(masked.request.headers)) {
    if (skipCopyHeader(name)) continue;
    parts.push(`  -H ${shellEscape(`${name}: ${value}`)}`);
  }
  const body = requestBodyText(masked);
  if (body) parts.push(`  --data-raw ${shellEscape(body)}`);
  return parts.join(" \\\n");
}

function skipCopyHeader(name: string): boolean {
  return /^(content-length|host|:)/i.test(name);
}

export function formatFetch(item: ApiTransaction, mask = false): string {
  const masked = maskTransaction(item, mask);
  const headers = Object.fromEntries(
    Object.entries(masked.request.headers).filter(([name]) => !skipCopyHeader(name)),
  );
  const init: Record<string, unknown> = {};
  if (masked.request.method !== "GET") init.method = masked.request.method;
  if (Object.keys(headers).length) init.headers = headers;
  const body = requestBodyText(masked);
  if (body) init.body = body;
  const initText =
    Object.keys(init).length === 0 ? "" : `, ${prettyJson(init)}`;
  return `fetch(${prettyJson(masked.request.url)}${initText});`;
}

export function formatMarkdown(item: ApiTransaction, mask = false): string {
  const clean = toCleanTransaction(item, mask);
  const duration =
    clean.timing?.duration === undefined ? "—" : `${Math.round(clean.timing.duration)}ms`;
  return [
    `# ${clean.request.method} ${clean.request.url}`,
    "",
    `- Status: ${clean.response.status}${clean.response.statusText ? ` ${clean.response.statusText}` : ""}`,
    `- Duration: ${duration}`,
    "",
    "## Request headers",
    "",
    "```json",
    prettyJson(clean.request.headers),
    "```",
    "",
    "## Request body",
    "",
    "```json",
    prettyJson(clean.request.body ?? clean.request.bodyRaw ?? null),
    "```",
    "",
    "## Response headers",
    "",
    "```json",
    prettyJson(clean.response.headers),
    "```",
    "",
    "## Response body",
    "",
    "```json",
    prettyJson(clean.response.body ?? clean.response.bodyRaw ?? null),
    "```",
    "",
  ].join("\n");
}

function headersToHar(headers: Record<string, string>) {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

function queryToHar(query?: Record<string, string | string[]>) {
  if (!query) return [];
  return Object.entries(query).flatMap(([name, value]) =>
    Array.isArray(value)
      ? value.map((entry) => ({ name, value: entry }))
      : [{ name, value }],
  );
}

export function formatHar(items: ApiTransaction[], mask = false): string {
  return prettyJson({
    log: {
      version: "1.2",
      creator: { name: "APIGaze", version: "0.1.0" },
      entries: items.map((item) => {
        const clean = toCleanTransaction(item, mask);
        const text = requestBodyText(maskTransaction(item, mask));
        return {
          startedDateTime: clean.timing
            ? new Date(clean.timing.startedAt).toISOString()
            : new Date().toISOString(),
          time: clean.timing?.duration ?? -1,
          request: {
            method: clean.request.method,
            url: clean.request.url,
            httpVersion: "HTTP/1.1",
            cookies: [],
            headers: headersToHar(clean.request.headers),
            queryString: queryToHar(clean.request.query),
            headersSize: -1,
            bodySize: text ? text.length : 0,
            ...(text
              ? { postData: { mimeType: "application/json", text } }
              : {}),
          },
          response: {
            status: clean.response.status,
            statusText: clean.response.statusText ?? "",
            httpVersion: "HTTP/1.1",
            cookies: [],
            headers: headersToHar(clean.response.headers),
            content: {
              size: clean.response.bodyRaw?.length ?? 0,
              mimeType: item.response.contentType ?? "application/json",
              text:
                clean.response.body !== undefined
                  ? prettyJson(clean.response.body)
                  : (clean.response.bodyRaw ?? ""),
            },
            redirectURL: "",
            headersSize: -1,
            bodySize: -1,
          },
          cache: {},
          timings: { send: 0, wait: clean.timing?.duration ?? 0, receive: 0 },
        };
      }),
    },
  });
}

export function formatExportJson(items: ApiTransaction[], mask = false): string {
  return prettyJson(items.map((item) => toCleanTransaction(item, mask)));
}

export function formatExportMarkdown(items: ApiTransaction[], mask = false): string {
  return items.map((item) => formatMarkdown(item, mask)).join("\n---\n\n");
}

export function formatUrl(item: ApiTransaction): string {
  return item.request.url;
}

export function formatHeadersJson(
  item: ApiTransaction,
  which: "request" | "response",
  mask = false,
): string {
  const clean = toCleanTransaction(item, mask);
  return prettyJson(which === "request" ? clean.request.headers : clean.response.headers);
}

export function formatBodyPiece(
  item: ApiTransaction,
  which: "request" | "response",
  mask = false,
): string {
  const clean = toCleanTransaction(item, mask);
  const part = which === "request" ? clean.request : clean.response;
  if (part.body !== undefined) {
    return typeof part.body === "string" ? part.body : prettyJson(part.body);
  }
  return part.bodyRaw ?? "";
}
