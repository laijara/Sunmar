import "./styles"; // index.js из styles (если используешь styles watcher)
import parts from "./markup";
import initsMap from "./scripts";
import {setupLocalCdnAssetRewrite} from "./lib/rewriteAssetsDev.js";

const CONTAINER_ID = "monkey-app";
const FLAG = "monkeyMounted";
const CDN_BASE = "http://localhost:3001";

function mount(container) {
  if (container.dataset[FLAG] === "1") return;

  for (const part of parts) {
    if (typeof part?.html === "string" && part.html.trim()) {
      container.insertAdjacentHTML("beforeend", part.html);
    }
  }

  container.dataset[FLAG] = "1";

  for (const part of parts) {
    const init = part?.key ? initsMap.get(part.key) : null;
    if (typeof init === "function") init(container);
  }
}

(() => {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;
  mount(container);
  document.documentElement.style.setProperty("--cdn-prefix", CDN_BASE);
  setupLocalCdnAssetRewrite({
    root: container,
    cdnBase: CDN_BASE,
    enabled: true, // dev-only (потому что этот код будет жить только в dev bundle)
  });
})();
