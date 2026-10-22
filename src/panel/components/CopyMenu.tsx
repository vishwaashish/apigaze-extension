import { useEffect, useRef, useState } from "react";
import { copyText } from "../../shared/clipboard";
import {
  formatBodyPiece,
  formatCurl,
  formatEntireApi,
  formatFetch,
  formatHeadersJson,
  formatMarkdown,
  formatRequestAndResponse,
  formatRequestJson,
  formatResponseJson,
  formatUrl,
} from "../../shared/formatters";
import { replayInPage } from "../../shared/replay";
import type { ApiTransaction } from "../../shared/types";

const OPTIONS = [
  ["entire", "Copy Entire API"],
  ["url", "Copy URL"],
  ["headers", "Copy request headers"],
  ["requestBody", "Copy request body"],
  ["responseBody", "Copy response body"],
  ["request", "Copy request JSON"],
  ["response", "Copy response JSON"],
  ["both", "Copy request + response"],
  ["curl", "Copy cURL"],
  ["fetch", "Copy fetch()"],
  ["markdown", "Copy Markdown"],
] as const;

function payload(item: ApiTransaction, mask: boolean, kind: (typeof OPTIONS)[number][0]) {
  if (kind === "entire") return formatEntireApi(item, mask);
  if (kind === "url") return formatUrl(item);
  if (kind === "headers") return formatHeadersJson(item, "request", mask);
  if (kind === "requestBody") return formatBodyPiece(item, "request", mask);
  if (kind === "responseBody") return formatBodyPiece(item, "response", mask);
  if (kind === "request") return formatRequestJson(item, mask);
  if (kind === "response") return formatResponseJson(item, mask);
  if (kind === "both") return formatRequestAndResponse(item, mask);
  if (kind === "curl") return formatCurl(item, mask);
  if (kind === "fetch") return formatFetch(item, mask);
  return formatMarkdown(item, mask);
}

export function CopyMenu({
  item,
  mask,
}: {
  item: ApiTransaction;
  mask: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [replayed, setReplayed] = useState<"ok" | "fail" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function copy(kind: (typeof OPTIONS)[number][0]) {
    if (await copyText(payload(item, mask, kind))) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    }
  }

  async function replay() {
    const ok = await replayInPage(item);
    setReplayed(ok ? "ok" : "fail");
    window.setTimeout(() => setReplayed(null), 1500);
  }

  return (
    <div className="copy-more" ref={rootRef}>
      <button
        type="button"
        className={open ? "icon-btn icon-btn-active" : "icon-btn"}
        data-tooltip="Copy, formats, and replay"
        aria-label="Actions"
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon />
      </button>
      {open ? (
        <ul className="menu">
          {OPTIONS.map(([kind, label]) => (
            <li key={kind}>
              <button type="button" onClick={() => void copy(kind)}>
                {copied === kind ? "Copied" : label}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => void replay()}>
              {replayed === "ok" ? "Sent" : replayed === "fail" ? "Failed" : "Replay"}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="3.5" r="1.2" fill="currentColor" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
