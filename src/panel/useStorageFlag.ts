import { useEffect, useState } from "react";

export function useStorageFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    if (!chrome.storage?.local) return;
    void chrome.storage.local.get({ [key]: fallback }, (result) => {
      if (chrome.runtime?.lastError) return;
      setValue(fallback ? result[key] !== false : result[key] === true);
    });
  }, [key, fallback]);

  function update(next: boolean) {
    setValue(next);
    void chrome.storage?.local.set({ [key]: next });
  }

  return [value, update] as const;
}
