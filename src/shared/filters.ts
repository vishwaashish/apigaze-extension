import type {
  ApiTransaction,
  MethodFilter,
  ResourceType,
  SortDir,
  SortKey,
  StatusFilter,
  TypeFilter,
} from "./types.ts";

const TYPE_GROUPS: Record<Exclude<TypeFilter, "all" | "other">, readonly ResourceType[]> = {
  "fetch/xhr": ["fetch", "xhr"],
  fetch: ["fetch"],
  xhr: ["xhr"],
  doc: ["document"],
  css: ["stylesheet"],
  js: ["script"],
  font: ["font"],
  img: ["image"],
  media: ["media"],
  manifest: ["manifest"],
  ws: ["websocket", "eventsource"],
  wasm: ["wasm"],
};

const GROUPED_TYPES = new Set<ResourceType>(Object.values(TYPE_GROUPS).flat());

function bodyHaystack(value?: unknown, raw?: string): string {
  if (raw) return raw;
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function matchesSearch(item: ApiTransaction, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    item.request.url.toLowerCase().includes(q) ||
    item.path.toLowerCase().includes(q) ||
    item.host.toLowerCase().includes(q) ||
    item.request.method.toLowerCase().includes(q) ||
    String(item.response.status).includes(q) ||
    bodyHaystack(item.request.body, item.request.bodyRaw).toLowerCase().includes(q) ||
    bodyHaystack(item.response.body, item.response.bodyRaw).toLowerCase().includes(q)
  );
}

function statusClass(status: number): StatusFilter | null {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500) return "5xx";
  return null;
}

export function matchesType(item: ApiTransaction, type: TypeFilter): boolean {
  if (type === "all") return true;
  if (type === "other") return !GROUPED_TYPES.has(item.resourceType);
  return TYPE_GROUPS[type].includes(item.resourceType);
}

export function matchesFilters(
  item: ApiTransaction,
  search: string,
  type: TypeFilter,
  statuses: StatusFilter[],
  methods: MethodFilter[],
  domain = "",
  errorsOnly = false,
): boolean {
  if (!matchesSearch(item, search)) return false;
  if (!matchesType(item, type)) return false;
  if (domain && item.host !== domain) return false;
  if (methods.length && !methods.includes(item.request.method.toUpperCase() as MethodFilter)) {
    return false;
  }
  if (errorsOnly) {
    if (item.response.status < 400) return false;
  } else if (statuses.length) {
    const bucket = statusClass(item.response.status);
    if (!bucket || !statuses.includes(bucket)) return false;
  }
  return true;
}

function sortValue(item: ApiTransaction, key: SortKey): number | string {
  if (key === "time") return item.timing?.startedAt ?? 0;
  if (key === "method") return item.request.method;
  if (key === "path") return item.path;
  if (key === "type") return item.resourceType;
  if (key === "status") return item.response.status;
  if (key === "size") return item.response.size ?? -1;
  return item.timing?.duration ?? -1;
}

export function sortTransactions(
  items: ApiTransaction[],
  key: SortKey,
  dir: SortDir,
): ApiTransaction[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left < right) return -sign;
    if (left > right) return sign;
    return 0;
  });
}
