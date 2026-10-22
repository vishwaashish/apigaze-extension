import { useEffect, useMemo, useState } from "react";
import { copyText } from "../shared/clipboard";
import { matchesFilters, sortTransactions } from "../shared/filters";
import { formatEntireApi } from "../shared/formatters";
import { formatBytes, formatDuration, statusTone } from "../shared/har";
import { RequestDetails } from "./components/RequestDetails";
import { Toolbar } from "./components/Toolbar";
import { useInspectorRequests } from "./useInspectorBridge";
import { MASK_SETTING_KEY, PRESERVE_SETTING_KEY } from "../shared/types";
import { useStorageFlag } from "./useStorageFlag";
import { useColumnVisibility } from "./useColumnVisibility";
import { useFilters } from "./useFilters";

export function App() {
  const { items, paused, setPaused, clear } = useInspectorRequests();
  const [mask, setMask] = useStorageFlag(MASK_SETTING_KEY, true);
  const [preserve, setPreserve] = useStorageFlag(PRESERVE_SETTING_KEY, true);
  const {
    visibility,
    toggleColumn,
    gridColumns,
    isVisible,
  } = useColumnVisibility();
  const filters = useFilters();
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const hosts = useMemo(
    () => [...new Set(items.map((item) => item.host).filter(Boolean))].sort(),
    [items],
  );
  const visible = useMemo(
    () =>
      sortTransactions(
        items.filter((item) =>
          matchesFilters(
            item,
            filters.search,
            filters.type,
            filters.status,
            filters.method,
            filters.domain,
            filters.errorsOnly,
          ),
        ),
        filters.sort,
        filters.sortDir,
      ),
    [
      items,
      filters.search,
      filters.type,
      filters.status,
      filters.method,
      filters.domain,
      filters.errorsOnly,
      filters.sort,
      filters.sortDir,
    ],
  );

  useEffect(() => {
    if (focusedId && visible.some((item) => item.id === focusedId)) return;
    setFocusedId(visible.at(-1)?.id ?? null);
  }, [visible, focusedId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select");

      if (event.key === "Escape") {
        if (typing) {
          target?.blur();
          return;
        }
        setOpenId(null);
        return;
      }

      if (typing) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        if (window.getSelection()?.toString()) return;
        const open = visible.find((item) => item.id === openId);
        if (!open) return;
        event.preventDefault();
        void copyText(formatEntireApi(open, mask));
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (visible.length === 0) return;
        const index = Math.max(
          0,
          visible.findIndex((item) => item.id === focusedId),
        );
        const next =
          event.key === "ArrowDown"
            ? Math.min(visible.length - 1, index + 1)
            : Math.max(0, index - 1);
        setFocusedId(visible[next].id);
        document
          .querySelector(`[data-request-id="${visible[next].id}"]`)
          ?.scrollIntoView({ block: "nearest" });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const id = focusedId ?? visible.at(-1)?.id;
        if (!id) return;
        setOpenId((current) => (current === id ? null : id));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, focusedId, openId, mask, filters]);

  return (
    <div className="app">
      <Toolbar
        search={filters.search}
        onSearch={filters.onSearch}
        type={filters.type}
        onType={filters.onType}
        status={filters.status}
        toggleStatus={filters.toggleStatus}
        method={filters.method}
        toggleMethod={filters.toggleMethod}
        domain={filters.domain}
        onDomain={filters.onDomain}
        sort={filters.sort}
        onSort={filters.onSort}
        sortDir={filters.sortDir}
        onSortDir={filters.onSortDir}
        hosts={hosts}
        mask={mask}
        onMask={setMask}
        visibility={visibility}
        toggleColumn={toggleColumn}
        paused={paused}
        onPaused={setPaused}
        preserve={preserve}
        onPreserve={setPreserve}
        errorsOnly={filters.errorsOnly}
        onErrorsOnly={filters.onErrorsOnly}
        items={visible}
        totalCount={items.length}
        onClear={() => {
          clear();
          setOpenId(null);
          setFocusedId(null);
        }}
      />
      {paused ? <p className="pause-banner">Recording paused</p> : null}
      {items.length === 0 ? (
        <main className="app-empty">
          <p>Open this DevTools panel, then trigger requests on the page.</p>
          <p className="app-muted">
            If traffic happened before DevTools opened, reload the page. Capture starts
            when DevTools opens, even if this tab was not selected yet.
          </p>
        </main>
      ) : visible.length === 0 ? (
        <main className="app-empty">
          <p>No requests match the current search or filters.</p>
        </main>
      ) : (
        <ul className="request-list">
          {visible.map((item) => {
            const open = openId === item.id;
            const focused = focusedId === item.id;
            return (
              <li
                key={item.id}
                data-request-id={item.id}
                className={[
                  "request-item",
                  open ? "request-item-open" : "",
                  focused ? "request-item-focused" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className="request-main"
                  style={{ gridTemplateColumns: gridColumns }}
                  onClick={() => {
                    setFocusedId(item.id);
                    setOpenId(open ? null : item.id);
                  }}
                  aria-expanded={open}
                >
                  {isVisible("url") && (
                    <span className="request-url">
                      <span className="request-path">
                        <span className="request-method">{item.request.method}</span>
                        <span className="request-api">{item.path}</span>
                      </span>
                      <span className="request-host">{item.host}</span>
                    </span>
                  )}
                  {isVisible("type") && (
                    <span className="request-type">{item.resourceType}</span>
                  )}
                  {isVisible("status") && (
                    <span className={`request-status status-${statusTone(item.response.status)}`}>
                      {item.response.status}
                    </span>
                  )}
                  {isVisible("size") && (
                    <span className="request-size">{formatBytes(item.response.size)}</span>
                  )}
                  {isVisible("duration") && (
                    <span className="request-duration">
                      {formatDuration(item.timing?.duration)}
                    </span>
                  )}
                  <span className="request-caret">{open ? "▼" : "▶"}</span>
                </button>
                {open ? <RequestDetails item={item} mask={mask} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
