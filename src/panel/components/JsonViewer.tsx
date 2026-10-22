import { useEffect, useState } from "react";
import { copyText } from "../../shared/clipboard";
import { prettyJson } from "../../shared/formatters";

interface ContextMenu {
  x: number;
  y: number;
  value: unknown;
  path: string;
}

export function JsonViewer({
  value,
  raw,
}: {
  value?: unknown;
  raw?: string;
}) {
  const hasJson = value !== undefined;
  const hasRaw = raw !== undefined;
  const [tab, setTab] = useState<"json" | "raw">(hasJson ? "json" : "raw");
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  if (!hasJson && !hasRaw) return null;

  const shown = tab === "json" && hasJson ? prettyJson(value) : (raw ?? prettyJson(value));

  async function copy() {
    if (await copyText(shown ?? "")) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  function handleContextMenu(event: React.MouseEvent, nodeValue: unknown, path: string) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, value: nodeValue, path });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  async function copyValue() {
    if (contextMenu && await copyText(JSON.stringify(contextMenu.value, null, 2))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
    closeContextMenu();
  }

  async function copyObject() {
    if (contextMenu && await copyText(JSON.stringify(contextMenu.value))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
    closeContextMenu();
  }

  async function copyPath() {
    if (contextMenu && await copyText(contextMenu.path)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
    closeContextMenu();
  }

  function storeAsGlobal() {
    if (!contextMenu) return;
    const valueStr = JSON.stringify(contextMenu.value);
    if (chrome.devtools?.inspectedWindow) {
      chrome.devtools.inspectedWindow.eval(`window.temp1 = ${valueStr}`);
    }
    closeContextMenu();
  }

  useEffect(() => {
    function handleClickOutside() {
      closeContextMenu();
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="json-viewer" onContextMenu={closeContextMenu}>
      <div className="tab-row">
        {hasJson ? (
          <button
            type="button"
            className={tab === "json" ? "tab tab-active" : "tab"}
            onClick={() => setTab("json")}
          >
            JSON
          </button>
        ) : null}
        {hasRaw || hasJson ? (
          <button
            type="button"
            className={tab === "raw" ? "tab tab-active" : "tab"}
            onClick={() => setTab("raw")}
          >
            RAW
          </button>
        ) : null}
        <button type="button" className="tab tab-right" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {tab === "json" && hasJson ? (
        <div className="json-tree">
          <JsonNode value={value} depth={0} path="" onContextMenu={handleContextMenu} />
        </div>
      ) : (
        <pre>{shown}</pre>
      )}
      {contextMenu && (
        <div
          className="json-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={copyValue}>Copy value</button>
          <button type="button" onClick={copyObject}>Copy object</button>
          <button type="button" onClick={copyPath}>Copy property path</button>
          <button type="button" onClick={storeAsGlobal}>Store as global variable</button>
        </div>
      )}
    </div>
  );
}

function JsonNode({
  name,
  value,
  depth,
  path,
  onContextMenu,
}: {
  name?: string;
  value: unknown;
  depth: number;
  path: string;
  onContextMenu: (event: React.MouseEvent, value: unknown, path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);
  const isObject = value !== null && typeof value === "object";
  const currentPath = name ? (path ? `${path}.${name}` : name) : path;

  if (!isObject) {
    return (
      <div
        className="json-line"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(e) => onContextMenu(e, value, currentPath)}
      >
        {name !== undefined ? <span className="json-key">{name}: </span> : null}
        <span className={`json-${value === null ? "null" : typeof value}`}>
          {JSON.stringify(value)}
        </span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(value);
  const label = Array.isArray(value) ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <div
      className="json-line"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => onContextMenu(e, value, currentPath)}
    >
      <button
        type="button"
        className={`json-toggle ${hovered ? "json-toggle-hovered" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "▼" : "▶"} {name ? `${name}: ` : ""}
        {label}
      </button>
      {open
        ? entries.map(([key, entry]) => (
            <div key={key} className="json-child">
              <JsonNode
                name={key}
                value={entry}
                depth={depth + 1}
                path={currentPath}
                onContextMenu={onContextMenu}
              />
            </div>
          ))
        : null}
    </div>
  );
}
