export type ResourceType =
  | "document"
  | "stylesheet"
  | "image"
  | "media"
  | "font"
  | "script"
  | "texttrack"
  | "xhr"
  | "fetch"
  | "prefetch"
  | "eventsource"
  | "websocket"
  | "manifest"
  | "signed-exchange"
  | "ping"
  | "csp-report"
  | "preflight"
  | "wasm"
  | "other";

export interface ApiTransaction {
  id: string;
  path: string;
  host: string;
  resourceType: ResourceType;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    query?: Record<string, string | string[]>;
    body?: unknown;
    bodyRaw?: string;
    bodyUnavailable?: boolean;
    bodyTruncated?: boolean;
  };
  response: {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    contentType?: string;
    body?: unknown;
    bodyRaw?: string;
    bodyUnavailable?: boolean;
    bodyTruncated?: boolean;
    bodyBinary?: boolean;
    size?: number;
  };
  timing?: {
    startedAt: number;
    duration?: number;
  };
}

export interface CleanApiTransaction {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    query?: Record<string, string | string[]>;
    body?: unknown;
    bodyRaw?: string;
    bodyUnavailable?: boolean;
    bodyTruncated?: boolean;
  };
  response: {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    body?: unknown;
    bodyRaw?: string;
    bodyUnavailable?: boolean;
    bodyTruncated?: boolean;
  };
  timing?: {
    startedAt: number;
    duration?: number;
  };
}

export interface InspectorSnapshot {
  items: ApiTransaction[];
  paused: boolean;
}

export interface InspectorBridge {
  getSnapshot(): InspectorSnapshot;
  subscribe(listener: (snapshot: InspectorSnapshot) => void): () => void;
  clear(): void;
  setPaused(paused: boolean): void;
}

export const INSPECTOR_BRIDGE_KEY = "__API_INSPECTOR__";
export const MASK_SETTING_KEY = "maskSensitiveHeaders";
export const PRESERVE_SETTING_KEY = "preserveLog";
export const FILTERS_SETTING_KEY = "apiInspectorFilters";

export const TYPE_FILTERS = [
  "all",
  "fetch/xhr",
  "fetch",
  "xhr",
  "doc",
  "css",
  "js",
  "font",
  "img",
  "media",
  "manifest",
  "ws",
  "wasm",
  "other",
] as const;

export type TypeFilter = (typeof TYPE_FILTERS)[number];

export const TYPE_FILTER_LABELS: Record<TypeFilter, string> = {
  all: "All",
  "fetch/xhr": "Fetch/XHR",
  fetch: "Fetch",
  xhr: "XHR",
  doc: "Doc",
  css: "CSS",
  js: "JS",
  font: "Font",
  img: "Img",
  media: "Media",
  manifest: "Manifest",
  ws: "WS",
  wasm: "Wasm",
  other: "Other",
};

export type StatusFilter = "2xx" | "4xx" | "5xx";
export type MethodFilter = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ColumnKey = "type" | "url" | "status" | "size" | "duration";

export const SORT_KEYS = ["time", "method", "path", "type", "status", "size", "duration"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export const SORT_LABELS: Record<SortKey, string> = {
  time: "Time",
  method: "Method",
  path: "URL",
  type: "Type",
  status: "Status",
  size: "Size",
  duration: "Duration",
};
