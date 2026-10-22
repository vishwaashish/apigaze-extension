import { useCallback, useMemo, useState } from "react";
import type { ColumnKey } from "../shared/types";

export const DEFAULT_COLUMN_VISIBILITY: Record<ColumnKey, boolean> = {
  type: true,
  url: true,
  status: true,
  size: true,
  duration: true,
};

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  type: "Request Type",
  url: "API URL",
  status: "Status Code",
  size: "Response Size",
  duration: "Timing",
};

export const LOCKED_COLUMNS: ColumnKey[] = ["url"];

const WIDTHS: Record<ColumnKey, string> = {
  url: "minmax(0, 1fr)",
  type: "72px",
  status: "40px",
  size: "56px",
  duration: "56px",
};

export function useColumnVisibility() {
  const [visibility, setVisibility] = useState<Record<ColumnKey, boolean>>(
    DEFAULT_COLUMN_VISIBILITY,
  );

  const toggleColumn = useCallback((key: ColumnKey) => {
    if (LOCKED_COLUMNS.includes(key)) return;
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const gridColumns = useMemo(() => {
    const cols = (Object.keys(WIDTHS) as ColumnKey[])
      .filter((key) => visibility[key])
      .map((key) => WIDTHS[key]);
    return [...cols, "14px"].join(" ");
  }, [visibility]);

  return {
    visibility,
    toggleColumn,
    gridColumns,
    isVisible: (key: ColumnKey) => visibility[key] ?? true,
  };
}
