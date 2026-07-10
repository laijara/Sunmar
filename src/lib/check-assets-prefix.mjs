import {readJsonSafe, r} from "./_utils.mjs";

const ORDER_FILE = r("src/order.json");

const json = readJsonSafe(ORDER_FILE, {});
const raw = typeof json?.assetsPrefix === "string" ? json.assetsPrefix.trim() : "";

if (!raw) {
  console.error('[check] assetsPrefix is empty in src/order.json');
  process.exit(1);
}

if (/<[^>]+>/.test(raw)) {
  console.error(`[check] assetsPrefix looks like placeholder: "${raw}"`);
  process.exit(1);
}

console.log(`[check] assetsPrefix ok: "${raw}"`);
