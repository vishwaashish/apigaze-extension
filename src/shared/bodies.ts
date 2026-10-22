import { MAX_BODY_BYTES } from "./constants.ts";

export interface HarPostDataLike {
  mimeType?: string;
  text?: string;
  params?: Array<{
    name: string;
    value?: string;
    fileName?: string;
    contentType?: string;
  }>;
}

export function findHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const match = Object.keys(headers).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return match ? headers[match] : undefined;
}

export function mimeTypeOf(contentType?: string): string {
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function isBinaryMime(mime: string): boolean {
  if (!mime) return false;
  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    mime === "application/x-www-form-urlencoded" ||
    mime.startsWith("multipart/")
  ) {
    return false;
  }
  return (
    mime.startsWith("image/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/") ||
    mime.startsWith("font/") ||
    mime === "application/octet-stream" ||
    mime === "application/pdf" ||
    mime === "application/wasm" ||
    mime.includes("zip")
  );
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function parseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function mergeParam(
  out: Record<string, unknown>,
  name: string,
  value: unknown,
) {
  const existing = out[name];
  if (existing === undefined) {
    out[name] = value;
  } else if (Array.isArray(existing)) {
    existing.push(value);
  } else {
    out[name] = [existing, value];
  }
}

export function parseFormUrlEncoded(
  text: string,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [name, value] of new URLSearchParams(text)) {
    const existing = out[name];
    if (existing === undefined) {
      out[name] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[name] = [existing, value];
    }
  }
  return out;
}

function objectFromParams(
  params: NonNullable<HarPostDataLike["params"]>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const param of params) {
    const value = param.fileName
      ? {
          fileName: param.fileName,
          contentType: param.contentType,
          value: param.value,
        }
      : (param.value ?? "");
    mergeParam(out, param.name, value);
  }
  return out;
}

export function parseRequestBody(
  postData: HarPostDataLike | undefined,
  headers: Record<string, string>,
  bodySize?: number,
): Pick<
  ApiRequestBody,
  "body" | "bodyRaw" | "bodyUnavailable" | "bodyTruncated"
> {
  const mime = mimeTypeOf(postData?.mimeType ?? findHeader(headers, "content-type"));
  const text = postData?.text;
  const params = postData?.params;

  if (typeof text === "string" && byteLength(text) > MAX_BODY_BYTES) {
    return { bodyRaw: text.slice(0, MAX_BODY_BYTES), bodyTruncated: true };
  }

  if (params?.length) {
    return { body: objectFromParams(params), bodyRaw: text };
  }

  if (typeof text === "string") {
    if (mime.includes("json") || looksLikeJson(text)) {
      const parsed = parseJson(text);
      return parsed !== undefined ? { body: parsed } : { bodyRaw: text };
    }
    if (mime === "application/x-www-form-urlencoded") {
      return { body: parseFormUrlEncoded(text), bodyRaw: text };
    }
    return { bodyRaw: text };
  }

  if ((bodySize ?? 0) > 0) {
    return { bodyUnavailable: true };
  }

  return {};
}

interface ApiRequestBody {
  body?: unknown;
  bodyRaw?: string;
  bodyUnavailable?: boolean;
  bodyTruncated?: boolean;
}

export function responseSize(contentSize?: number, bodySize?: number): number | undefined {
  if (typeof contentSize === "number" && contentSize > 0) return contentSize;
  if (typeof bodySize === "number" && bodySize > 0) return bodySize;
  return undefined;
}

export function shouldSkipGetContent(size?: number): boolean {
  return size !== undefined && size > MAX_BODY_BYTES;
}

export function parseResponseText(
  content: string,
  encoding: string,
  contentType: string | undefined,
  reportedSize?: number,
): Pick<
  ApiRequestBody,
  "body" | "bodyRaw" | "bodyUnavailable" | "bodyTruncated"
> & { bodyBinary?: boolean } {
  const mime = mimeTypeOf(contentType);

  if (encoding.toLowerCase() === "base64" || isBinaryMime(mime)) {
    return { bodyBinary: true };
  }

  if (!content) {
    return (reportedSize ?? 0) > 0 ? { bodyUnavailable: true } : {};
  }

  if (byteLength(content) > MAX_BODY_BYTES) {
    return { bodyRaw: content.slice(0, MAX_BODY_BYTES), bodyTruncated: true };
  }

  if (mime.includes("json") || looksLikeJson(content)) {
    const parsed = parseJson(content);
    return parsed !== undefined ? { body: parsed } : { bodyRaw: content };
  }

  return { bodyRaw: content };
}
