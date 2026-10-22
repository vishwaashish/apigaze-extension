import { useEffect, useState } from "react";
import { FILTERS_SETTING_KEY, SORT_KEYS, TYPE_FILTERS } from "../shared/types";
import type { MethodFilter, SortDir, SortKey, StatusFilter, TypeFilter } from "../shared/types";

interface Filters {
  search: string;
  type: TypeFilter;
  status: StatusFilter[];
  method: MethodFilter[];
  domain: string;
  sort: SortKey;
  sortDir: SortDir;
  errorsOnly: boolean;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  type: "all",
  status: [],
  method: [],
  domain: "",
  sort: "time",
  sortDir: "asc",
  errorsOnly: false,
};

const STATUSES: StatusFilter[] = ["2xx", "4xx", "5xx"];
const METHODS: MethodFilter[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function asList<T extends string>(value: unknown, allowed: T[]): T[] {
  if (Array.isArray(value)) return value.filter((entry): entry is T => allowed.includes(entry as T));
  if (typeof value === "string" && allowed.includes(value as T)) return [value as T];
  return [];
}

function parseDomain(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function parseSort(value: unknown): SortKey {
  if (typeof value === "string" && (SORT_KEYS as readonly string[]).includes(value)) {
    return value as SortKey;
  }
  return DEFAULT_FILTERS.sort;
}

function parseSortDir(value: unknown): SortDir {
  return value === "desc" ? "desc" : "asc";
}

function parseType(value: unknown): TypeFilter {
  if (typeof value === "string" && (TYPE_FILTERS as readonly string[]).includes(value)) {
    return value as TypeFilter;
  }
  return DEFAULT_FILTERS.type;
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (!chrome.storage?.local) return;
    void chrome.storage.local.get({ [FILTERS_SETTING_KEY]: DEFAULT_FILTERS }, (result) => {
      const saved = result[FILTERS_SETTING_KEY] as Partial<Filters> | undefined;
      if (!saved) return;
      setFilters({
        search: typeof saved.search === "string" ? saved.search : DEFAULT_FILTERS.search,
        type: parseType(saved.type),
        status: asList(saved.status, STATUSES),
        method: asList(saved.method, METHODS),
        domain: parseDomain(saved.domain ?? (saved as { domains?: unknown }).domains),
        sort: parseSort(saved.sort),
        sortDir: parseSortDir(saved.sortDir),
        errorsOnly: saved.errorsOnly === true,
      });
    });
  }, []);

  function update(next: Filters) {
    setFilters(next);
    void chrome.storage?.local.set({ [FILTERS_SETTING_KEY]: next });
  }

  return {
    search: filters.search,
    onSearch: (value: string) => update({ ...filters, search: value }),
    type: filters.type,
    onType: (value: TypeFilter) => update({ ...filters, type: value }),
    status: filters.status,
    toggleStatus: (value: StatusFilter) =>
      update({ ...filters, status: toggleValue(filters.status, value) }),
    method: filters.method,
    toggleMethod: (value: MethodFilter) =>
      update({ ...filters, method: toggleValue(filters.method, value) }),
    domain: filters.domain,
    onDomain: (value: string) => update({ ...filters, domain: value }),
    sort: filters.sort,
    onSort: (value: SortKey) => update({ ...filters, sort: value }),
    sortDir: filters.sortDir,
    onSortDir: (value: SortDir) => update({ ...filters, sortDir: value }),
    errorsOnly: filters.errorsOnly,
    onErrorsOnly: (value: boolean) => update({ ...filters, errorsOnly: value }),
  };
}
