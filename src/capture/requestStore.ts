import { MAX_REQUESTS } from "../shared/constants.ts";
import type { ApiTransaction, InspectorSnapshot } from "../shared/types.ts";

export function createRequestStore(max = MAX_REQUESTS) {
  let items: ApiTransaction[] = [];
  let paused = false;
  const listeners = new Set<(snapshot: InspectorSnapshot) => void>();

  function snapshot(): InspectorSnapshot {
    return { items, paused };
  }

  function notify() {
    const next = snapshot();
    for (const listener of listeners) listener(next);
  }

  return {
    add(item: ApiTransaction) {
      if (paused) return;
      items = items.length >= max ? [...items.slice(1), item] : [...items, item];
      notify();
    },
    getSnapshot: snapshot,
    isPaused() {
      return paused;
    },
    setPaused(next: boolean) {
      if (paused === next) return;
      paused = next;
      notify();
    },
    clear() {
      items = [];
      notify();
    },
    subscribe(listener: (snapshot: InspectorSnapshot) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type RequestStore = ReturnType<typeof createRequestStore>;
