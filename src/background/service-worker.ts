import { MASK_SETTING_KEY, PRESERVE_SETTING_KEY } from "../shared/types";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.get([MASK_SETTING_KEY, PRESERVE_SETTING_KEY], (result) => {
    const next: Record<string, boolean> = {};
    if (!(MASK_SETTING_KEY in result)) next[MASK_SETTING_KEY] = true;
    if (!(PRESERVE_SETTING_KEY in result)) next[PRESERVE_SETTING_KEY] = true;
    if (Object.keys(next).length) void chrome.storage.local.set(next);
  });
});
