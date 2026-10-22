import { useEffect, useRef, useState } from "react";
import { METHODS } from "../../shared/constants";
import { downloadText } from "../../shared/clipboard";
import {
  formatExportJson,
  formatExportMarkdown,
  formatHar,
} from "../../shared/formatters";
import {
  SORT_KEYS,
  SORT_LABELS,
  TYPE_FILTER_LABELS,
  TYPE_FILTERS,
  type ApiTransaction,
  type ColumnKey,
  type MethodFilter,
  type SortDir,
  type SortKey,
  type StatusFilter,
  type TypeFilter,
} from "../../shared/types";
import { COLUMN_LABELS, LOCKED_COLUMNS } from "../useColumnVisibility";

const STATUSES: StatusFilter[] = ["2xx", "4xx", "5xx"];
const COLUMN_KEYS: ColumnKey[] = ["url", "type", "status", "size", "duration"];

export function Toolbar({
  search,
  onSearch,
  type,
  onType,
  status,
  toggleStatus,
  method,
  toggleMethod,
  domain,
  onDomain,
  sort,
  onSort,
  sortDir,
  onSortDir,
  hosts,
  mask,
  onMask,
  visibility,
  toggleColumn,
  paused,
  onPaused,
  preserve,
  onPreserve,
  errorsOnly,
  onErrorsOnly,
  items,
  totalCount,
  onClear,
}: {
  search: string;
  onSearch: (value: string) => void;
  type: TypeFilter;
  onType: (value: TypeFilter) => void;
  status: StatusFilter[];
  toggleStatus: (value: StatusFilter) => void;
  method: MethodFilter[];
  toggleMethod: (value: MethodFilter) => void;
  domain: string;
  onDomain: (value: string) => void;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  sortDir: SortDir;
  onSortDir: (value: SortDir) => void;
  hosts: string[];
  mask: boolean;
  onMask: (value: boolean) => void;
  visibility: Record<ColumnKey, boolean>;
  toggleColumn: (key: ColumnKey) => void;
  paused: boolean;
  onPaused: (value: boolean) => void;
  preserve: boolean;
  onPreserve: (value: boolean) => void;
  errorsOnly: boolean;
  onErrorsOnly: (value: boolean) => void;
  items: ApiTransaction[];
  totalCount: number;
  onClear: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersActive =
    type !== "all" ||
    status.length > 0 ||
    method.length > 0 ||
    Boolean(domain) ||
    sort !== "time" ||
    sortDir !== "asc" ||
    errorsOnly;
  const domainOptions = [...new Set([...hosts, ...(domain ? [domain] : [])])].sort();

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setExportOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExportOpen(false);
        setFiltersOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function exportAs(kind: "json" | "har" | "markdown") {
    const stamp = new Date().toISOString().replaceAll(":", "-");
    if (kind === "json") {
      downloadText(`apigaze-${stamp}.json`, formatExportJson(items, mask));
    } else if (kind === "har") {
      downloadText(`apigaze-${stamp}.har`, formatHar(items, mask), "application/json");
    } else {
      downloadText(
        `apigaze-${stamp}.md`,
        formatExportMarkdown(items, mask),
        "text/markdown",
      );
    }
    setExportOpen(false);
  }

  return (
    <header className="toolbar" ref={rootRef}>
      <div className="toolbar-row">
        <div className="toolbar-left">
          <button
            type="button"
            className="icon-btn"
            data-tooltip={
              paused
                ? "Start recording network log"
                : "Stop recording network log"
            }
            aria-label={paused ? "Start recording" : "Stop recording"}
            onClick={() => onPaused(!paused)}
          >
            <RecordIcon recording={!paused} />
          </button>
          <button
            type="button"
            className="icon-btn"
            data-tooltip="Clear the captured request list"
            aria-label="Clear"
            onClick={onClear}
            disabled={totalCount === 0}
          >
            <ClearIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            data-tooltip="Reload the inspected page"
            aria-label="Reload"
            onClick={() => chrome.devtools?.inspectedWindow.reload()}
          >
            <ReloadIcon />
          </button>
          <button
            type="button"
            className={preserve ? "icon-btn icon-btn-active" : "icon-btn"}
            data-tooltip={
              preserve
                ? "Keep the list when the page reloads"
                : "Clear the list when the page reloads"
            }
            aria-label="Preserve log"
            onClick={() => onPreserve(!preserve)}
          >
            <PreserveIcon />
          </button>
          <span className="app-count">
            {items.length}/{totalCount}
          </span>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className={errorsOnly ? "icon-btn icon-btn-active" : "icon-btn"}
            data-tooltip={errorsOnly ? "Showing 4xx and 5xx only. Click to show all" : "Show only failed requests (4xx and 5xx)"}
            aria-label="Errors only"
            onClick={() => onErrorsOnly(!errorsOnly)}
          >
            <ErrorsIcon />
          </button>
          <button
            type="button"
            className={searchOpen || search.trim() ? "icon-btn icon-btn-active" : "icon-btn"}
            data-tooltip="Search URL, path, headers-adjacent fields, and request or response body"
            aria-label="Search"
            onClick={() => {
              setSearchOpen((value) => !value);
              setExportOpen(false);
            }}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={filtersOpen || filtersActive ? "icon-btn icon-btn-active" : "icon-btn"}
            data-tooltip="Filter by type, status, method, domain, and columns"
            aria-label="Filters"
            onClick={() => {
              setFiltersOpen((value) => !value);
              setExportOpen(false);
            }}
          >
            <FilterIcon />
          </button>
          <button
            type="button"
            className={mask ? "icon-btn icon-btn-active" : "icon-btn"}
            data-tooltip={
              mask
                ? "Secrets are hidden. Click to show Authorization, Cookie, and token values"
                : "Secrets are visible. Click to hide Authorization, Cookie, and token values"
            }
            aria-label="Mask secrets"
            onClick={() => onMask(!mask)}
          >
            {mask ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <div className="toolbar-pop">
            <button
              type="button"
              className={exportOpen ? "icon-btn icon-btn-active" : "icon-btn"}
              data-tooltip="Export captured requests as JSON, HAR, or Markdown"
              aria-label="Export"
              disabled={items.length === 0}
              onClick={() => setExportOpen((value) => !value)}
            >
              <ExportIcon />
            </button>
            {exportOpen ? (
              <ul className="popover menu-list">
                <li>
                  <button type="button" data-tooltip="Download the list as JSON" onClick={() => exportAs("json")}>
                    JSON
                  </button>
                </li>
                <li>
                  <button type="button" data-tooltip="Download the list as a HAR file" onClick={() => exportAs("har")}>
                    HAR
                  </button>
                </li>
                <li>
                  <button type="button" data-tooltip="Download the list as Markdown" onClick={() => exportAs("markdown")}>
                    Markdown
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {searchOpen ? (
        <div className="search-bar">
          <input
            ref={searchRef}
            className="search"
            type="search"
            placeholder="URL, path, domain, method, status, or body text"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
      ) : null}

      {filtersOpen ? (
        <div className="filter-bar">
          <div className="filter-field filter-types">
            <span className="filter-label">Type</span>
            <div className="filter-group">
              {TYPE_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={type === value ? "chip chip-active" : "chip"}
                  data-tooltip={value === "all" ? "Show all request types" : `Show ${TYPE_FILTER_LABELS[value]} only`}
                  onClick={() => onType(value)}
                >
                  {TYPE_FILTER_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-field">
            <span className="filter-label">Status</span>
            <div className="filter-group">
              {STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={status.includes(value) ? "chip chip-active" : "chip"}
                  data-tooltip={`Show ${value} responses`}
                  onClick={() => toggleStatus(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-field">
            <span className="filter-label">Method</span>
            <div className="filter-group">
              {METHODS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={method.includes(value) ? "chip chip-active" : "chip"}
                  data-tooltip={`Show ${value} requests`}
                  onClick={() => toggleMethod(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-field">
            <span className="filter-label">Domain</span>
            <select
              className="toolbar-select"
              data-tooltip="Show requests from one domain"
              value={domain}
              onChange={(event) => onDomain(event.target.value)}
            >
              <option value="">All domains</option>
              {domainOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <span className="filter-label">Sort</span>
            <div className="sort-row">
              <select
                className="toolbar-select"
                data-tooltip="Sort captured requests"
                value={sort}
                onChange={(event) => onSort(event.target.value as SortKey)}
              >
                {SORT_KEYS.map((value) => (
                  <option key={value} value={value}>
                    {SORT_LABELS[value]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn"
                data-tooltip={sortDir === "asc" ? "Ascending. Click for newest or highest first" : "Descending. Click for oldest or lowest first"}
                aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
                onClick={() => onSortDir(sortDir === "asc" ? "desc" : "asc")}
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
          <div className="filter-field filter-columns">
            <span className="filter-label">Columns</span>
            <div className="filter-group">
              {COLUMN_KEYS.map((key) => {
                const locked = LOCKED_COLUMNS.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={locked || visibility[key] ? "chip chip-active" : "chip"}
                    data-tooltip={locked ? `${COLUMN_LABELS[key]} is always shown` : `Toggle ${COLUMN_LABELS[key]}`}
                    disabled={locked}
                    onClick={() => toggleColumn(key)}
                  >
                    {COLUMN_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function RecordIcon({ recording }: { recording: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      {recording ? (
        <circle className="record-on" cx="8" cy="8" r="5" />
      ) : (
        <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="6.75" cy="6.75" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10.25 13.25 13.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PreserveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5 2.5h6l1.5 3H13v2H3V5.5h.5L5 2.5Zm.7 8.5h4.6L9.6 14H6.4L5.7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 2.5 14 13.5H2L8 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13 8a5 5 0 1 1-1.46-3.54"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M13.25 2.5v3.25H10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.75 8s2.25-4.25 6.25-4.25S14.25 8 14.25 8s-2.25 4.25-6.25 4.25S1.75 8 1.75 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="8" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.75 8s2.25-4.25 6.25-4.25S14.25 8 14.25 8s-2.25 4.25-6.25 4.25S1.75 8 1.75 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="8" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 13 13 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M2 3h12l-4.2 5.2V13l-3.6 1.6V8.2Z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.25 1.5h3.5l.38 1h3.12a.75.75 0 0 1 0 1.5h-.38l-.72 8.22A1.75 1.75 0 0 1 10.41 15H5.59a1.75 1.75 0 0 1-1.74-1.78L3.13 4H2.75a.75.75 0 0 1 0-1.5h3.12l.38-1Zm.9 3.25.5 7.5h1.7l.5-7.5h-2.7Z"
      />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5ZM2.5 10.25a.75.75 0 0 1 .75.75v1.5h9.5v-1.5a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75V11a.75.75 0 0 1 .75-.75Z"
      />
    </svg>
  );
}
