import { useState } from "react";
import { copyText } from "../../shared/clipboard";
import { prettyJson } from "../../shared/formatters";
import { formatBytes, formatDuration } from "../../shared/har";
import { maskTransaction } from "../../shared/mask";
import type { ApiTransaction } from "../../shared/types";
import { CopyMenu } from "./CopyMenu";
import { JsonViewer } from "./JsonViewer";

type Tab = "request" | "response" | "headers" | "raw";

export function RequestDetails({
  item,
  mask,
}: {
  item: ApiTransaction;
  mask: boolean;
}) {
  const [tab, setTab] = useState<Tab>("request");
  const view = maskTransaction(item, mask);

  return (
    <section className="details">
      <div className="details-head">
        <div className="details-url">
          <h2>{view.request.url}</h2>
          <CopyUrlButton url={view.request.url} />
        </div>
        <CopyMenu item={item} mask={mask} />
      </div>
      <dl className="details-meta">
        <div>
          <dt>Method</dt>
          <dd>{view.request.method}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {view.response.status}
            {view.response.statusText ? ` ${view.response.statusText}` : ""}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(view.timing?.duration)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatBytes(view.response.size)}</dd>
        </div>
      </dl>

      <div className="tab-row">
        {(["request", "response", "headers", "raw"] as const).map((name) => (
          <button
            key={name}
            type="button"
            className={tab === name ? "tab tab-active" : "tab"}
            onClick={() => setTab(name)}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      {tab === "request" ? (
        <>
          {view.request.query ? (
            <BodyBlock title="Query" value={view.request.query} empty="No query." />
          ) : null}
          <BodyBlock title="Request headers" value={view.request.headers} empty="No request headers." />
          <BodyBlock
            title="Request body"
            value={view.request.body}
            raw={view.request.bodyRaw}
            unavailable={view.request.bodyUnavailable}
            truncated={view.request.bodyTruncated}
            empty="No request body."
          />
        </>
      ) : null}

      {tab === "response" ? (
        <BodyBlock
          title="Response body"
          value={view.response.body}
          raw={view.response.bodyRaw}
          unavailable={view.response.bodyUnavailable}
          truncated={view.response.bodyTruncated}
          binary={view.response.bodyBinary}
          empty="No response body."
        />
      ) : null}

      {tab === "headers" ? (
        <>
          <BodyBlock title="Request headers" value={view.request.headers} empty="No request headers." />
          <BodyBlock title="Response headers" value={view.response.headers} empty="No response headers." />
        </>
      ) : null}

      {tab === "raw" ? <pre>{prettyJson(view)}</pre> : null}
    </section>
  );
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="icon-btn details-copy-url"
      data-tooltip={copied ? "Copied" : "Copy URL"}
      aria-label="Copy URL"
      onClick={() => {
        void copyText(url).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <CopyIcon />
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.5" y="5.5" width="7" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 10.5V3.5h7" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function BodyBlock({
  title,
  value,
  raw,
  unavailable,
  truncated,
  binary,
  empty,
}: {
  title: string;
  value?: unknown;
  raw?: string;
  unavailable?: boolean;
  truncated?: boolean;
  binary?: boolean;
  empty: string;
}) {
  let message: string | undefined;
  if (binary) message = "Binary / unsupported response body";
  else if (unavailable) {
    message = title.startsWith("Request")
      ? "Some request information is unavailable."
      : "Response body unavailable";
  } else if (truncated && value === undefined && raw === undefined) {
    message = "Response body truncated.";
  }

  const hasContent = value !== undefined || raw !== undefined;

  return (
    <div className="details-block">
      <h3>{title}</h3>
      {truncated && hasContent ? <p className="app-muted">Body truncated.</p> : null}
      {message ? <p className="app-muted">{message}</p> : null}
      {hasContent ? (
        <JsonViewer value={value} raw={raw} />
      ) : !message ? (
        <p className="app-muted">{empty}</p>
      ) : null}
    </div>
  );
}
