import type { ApiTransaction } from "./types.ts";

const SKIP = /^(host|content-length|connection|cookie|cookie2|origin|referer|accept-encoding|keep-alive|te|trailer|transfer-encoding|upgrade|via|proxy-|sec-|:)/i;

function bodyText(item: ApiTransaction): string | undefined {
  if (item.request.body !== undefined) {
    return typeof item.request.body === "string"
      ? item.request.body
      : JSON.stringify(item.request.body);
  }
  return item.request.bodyRaw;
}

export function formatReplayFetch(item: ApiTransaction): string {
  const headers = Object.fromEntries(
    Object.entries(item.request.headers).filter(([name]) => !SKIP.test(name)),
  );
  const init: Record<string, unknown> = { method: item.request.method };
  if (Object.keys(headers).length) init.headers = headers;
  const body = bodyText(item);
  if (body && item.request.method !== "GET" && item.request.method !== "HEAD") {
    init.body = body;
  }
  return `fetch(${JSON.stringify(item.request.url)}, ${JSON.stringify(init)})`;
}

export function replayInPage(item: ApiTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    if (!chrome.devtools?.inspectedWindow) {
      resolve(false);
      return;
    }
    try {
      chrome.devtools.inspectedWindow.eval(formatReplayFetch(item), (_result, exception) => {
        resolve(!exception?.isException);
      });
    } catch {
      resolve(false);
    }
  });
}
