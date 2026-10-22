import { useCallback, useEffect, useState } from "react";
import {
  INSPECTOR_BRIDGE_KEY,
  type ApiTransaction,
  type InspectorBridge,
} from "../shared/types";

function readBridge(): InspectorBridge | undefined {
  const value = Reflect.get(window, INSPECTOR_BRIDGE_KEY);
  if (
    value &&
    typeof value === "object" &&
    "getSnapshot" in value &&
    "subscribe" in value &&
    "clear" in value &&
    "setPaused" in value
  ) {
    return value as InspectorBridge;
  }
  return undefined;
}

export function useInspectorRequests() {
  const [items, setItems] = useState<ApiTransaction[]>([]);
  const [paused, setPausedState] = useState(false);
  const [bridge, setBridge] = useState<InspectorBridge>();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const connect = () => {
      const next = readBridge();
      if (!next) return false;
      setBridge(next);
      const snapshot = next.getSnapshot();
      setItems(snapshot.items);
      setPausedState(snapshot.paused);
      unsubscribe = next.subscribe((value) => {
        setItems(value.items);
        setPausedState(value.paused);
      });
      return true;
    };

    if (connect()) {
      return () => unsubscribe?.();
    }

    // ponytail: poll until DevTools onShown attaches the bridge. Cap at 5s.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (connect() || ++tries >= 100) window.clearInterval(timer);
    }, 50);

    return () => {
      window.clearInterval(timer);
      unsubscribe?.();
    };
  }, []);

  const clear = useCallback(() => {
    bridge?.clear();
  }, [bridge]);

  const setPaused = useCallback(
    (next: boolean) => {
      bridge?.setPaused(next);
    },
    [bridge],
  );

  return { items, paused, setPaused, clear };
}
