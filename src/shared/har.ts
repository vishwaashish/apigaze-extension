import { parseRequestBody, type HarPostDataLike } from "./bodies.ts";
import type { ApiTransaction, ResourceType } from "./types.ts";

export interface HarNameValue {
  name: string;
  value: string;
}

export interface HarEntryLike {
  _resourceType?: string | null;
  startedDateTime?: string;
  time?: number;
  request: {
    method: string;
    url: string;
    headers?: HarNameValue[];
    queryString?: HarNameValue[];
    postData?: HarPostDataLike;
    bodySize?: number;
  };
  response: {
    status: number;
    statusText?: string;
    headers?: HarNameValue[];
    bodySize?: number;
    content?: {
      size?: number;
      mimeType?: string;
    };
  };
}

const RESOURCE_TYPES: ResourceType[] = [
  "document",
  "stylesheet",
  "image",
  "media",
  "font",
  "script",
  "texttrack",
  "xhr",
  "fetch",
  "prefetch",
  "eventsource",
  "websocket",
  "manifest",
  "signed-exchange",
  "ping",
  "csp-report",
  "preflight",
  "wasm",
  "other",
];

export function resourceTypeOf(entry: HarEntryLike): ResourceType {
  const type = entry._resourceType;
  return type && RESOURCE_TYPES.includes(type as ResourceType) ? (type as ResourceType) : "other";
}

export function headersFromHar(
  headers: HarNameValue[] | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const header of headers ?? []) {
    const existing = out[header.name];
    out[header.name] = existing ? `${existing}, ${header.value}` : header.value;
  }
  return out;
}

export function queryFromHar(
  queryString: HarNameValue[] | undefined,
): Record<string, string | string[]> | undefined {
  if (!queryString?.length) return undefined;

  const out: Record<string, string | string[]> = {};
  for (const param of queryString) {
    const existing = out[param.name];
    if (existing === undefined) {
      out[param.name] = param.value;
    } else if (Array.isArray(existing)) {
      existing.push(param.value);
    } else {
      out[param.name] = [existing, param.value];
    }
  }
  return out;
}

export function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

export function toApiTransaction(entry: HarEntryLike, id: string): ApiTransaction {
  const startedAt = entry.startedDateTime
    ? Date.parse(entry.startedDateTime)
    : Date.now();
  const requestHeaders = headersFromHar(entry.request.headers);
  const responseHeaders = headersFromHar(entry.response.headers);
  const requestBody = parseRequestBody(
    entry.request.postData,
    requestHeaders,
    entry.request.bodySize,
  );

  const size = entry.response.content?.size ?? entry.response.bodySize;

  return {
    id,
    path: pathFromUrl(entry.request.url),
    host: hostFromUrl(entry.request.url),
    resourceType: resourceTypeOf(entry),
    request: {
      url: entry.request.url,
      method: entry.request.method,
      headers: requestHeaders,
      query: queryFromHar(entry.request.queryString),
      ...requestBody,
    },
    response: {
      status: entry.response.status,
      statusText: entry.response.statusText,
      headers: responseHeaders,
      contentType:
        entry.response.content?.mimeType ||
        Object.entries(responseHeaders).find(
          ([name]) => name.toLowerCase() === "content-type",
        )?.[1],
      ...(typeof size === "number" && size > 0 ? { size } : {}),
    },
    timing: {
      startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
      duration: typeof entry.time === "number" ? entry.time : undefined,
    },
  };
}

export function statusTone(status: number): "success" | "redirect" | "client" | "server" | "other" {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client";
  if (status >= 500) return "server";
  return "other";
}

export function formatDuration(duration?: number): string {
  if (duration === undefined) return "—";
  return `${Math.round(duration)}ms`;
}

export function formatBytes(size?: number): string {
  if (size === undefined || size < 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} kB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
