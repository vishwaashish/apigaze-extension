import { captureTransaction } from "../capture/networkMonitor";
import { createRequestStore } from "../capture/requestStore";
import {
  INSPECTOR_BRIDGE_KEY,
  PRESERVE_SETTING_KEY,
  type InspectorBridge,
} from "../shared/types";

const store = createRequestStore();
let nextId = 1;
let preserve = true;

if (chrome.storage?.local) {
  chrome.storage.local.get({ [PRESERVE_SETTING_KEY]: true }, (result) => {
    preserve = result[PRESERVE_SETTING_KEY] !== false;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[PRESERVE_SETTING_KEY]) return;
    preserve = changes[PRESERVE_SETTING_KEY].newValue !== false;
  });
}

chrome.devtools.network.onNavigated.addListener(() => {
  if (!preserve) store.clear();
});

chrome.devtools.network.onRequestFinished.addListener((entry) => {
  if (store.isPaused()) return;
  const id = String(nextId);
  nextId += 1;
  void captureTransaction(entry, id).then((transaction) => {
    if (store.isPaused()) return;
    store.add(transaction);
  });
});

chrome.devtools.panels.create(
  "APIGaze",
  "icons/icon-32.png",
  "src/panel/index.html",
  (panel) => {
    panel.onShown.addListener((panelWindow) => {
      const bridge: InspectorBridge = {
        getSnapshot: () => store.getSnapshot(),
        subscribe: (listener) => store.subscribe(listener),
        clear: () => store.clear(),
        setPaused: (paused) => store.setPaused(paused),
      };
      Reflect.set(panelWindow, INSPECTOR_BRIDGE_KEY, bridge);
    });
  },
);
