import {
  parseResponseText,
  responseSize,
  shouldSkipGetContent,
} from "../shared/bodies.ts";
import { toApiTransaction } from "../shared/har.ts";
import type { ApiTransaction } from "../shared/types.ts";

export function readResponseContent(
  entry: chrome.devtools.network.Request,
): Promise<{ content: string; encoding: string }> {
  return new Promise((resolve) => {
    try {
      entry.getContent((content, encoding) => {
        resolve({ content: content ?? "", encoding: encoding ?? "" });
      });
    } catch {
      resolve({ content: "", encoding: "" });
    }
  });
}

export async function captureTransaction(
  entry: chrome.devtools.network.Request,
  id: string,
): Promise<ApiTransaction> {
  const transaction = toApiTransaction(entry, id);

  const size = responseSize(
    entry.response.content?.size,
    entry.response.bodySize,
  );

  if (shouldSkipGetContent(size)) {
    transaction.response.bodyTruncated = true;
    return transaction;
  }

  try {
    const { content, encoding } = await readResponseContent(entry);
    Object.assign(
      transaction.response,
      parseResponseText(content, encoding, transaction.response.contentType, size),
    );
  } catch {
    transaction.response.bodyUnavailable = true;
  }

  return transaction;
}
