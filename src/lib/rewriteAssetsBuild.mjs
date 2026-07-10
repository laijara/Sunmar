import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CMS_DIR = path.resolve(ROOT, "@CMS");
const ORDER_FILE = path.resolve(ROOT, "src/order.json");
const prefixArg = process.argv[2];

// CDN base (hardcoded start of path)
const CDN_BASE = "https://b2ccdn.coral.ru/content";

function readOrderPrefix() {
  if (!fs.existsSync(ORDER_FILE)) return null;
  try {
    const json = JSON.parse(fs.readFileSync(ORDER_FILE, "utf8"));
    const p = json?.assetsPrefix;
    return typeof p === "string" && p.trim() ? p.trim() : null;
  } catch {
    return null;
  }
}

const prefixFromOrder = readOrderPrefix();
const rawPrefix = prefixArg || prefixFromOrder;

if (!rawPrefix) {
  console.log("[rewrite-images] skip: no prefix provided");
  console.log('Hint: set "assetsPrefix" in src/order.json or pass CLI arg');
  process.exit(0);
}

if (/<[^>]+>/.test(rawPrefix)) {
  console.warn(`[rewrite-images] warning: assetsPrefix looks like placeholder "${rawPrefix}"`);
  console.warn("[rewrite-images] skip: set a real path or pass CLI arg");
  process.exit(0);
}

function normalizeBase(p) {
  return String(p || "").trim().replace(/\/+$/, "");
}

function normalizeRelPrefix(p) {
  let s = String(p || "").trim();
  s = s.replace(/^\/+/, ""); // убрать leading /
  s = s.replace(/\/+$/, ""); // убрать trailing /
  return s;
}

const BASE = normalizeBase(CDN_BASE);
const REL_PREFIX = normalizeRelPrefix(rawPrefix);
const FULL_PREFIX = REL_PREFIX ? `${BASE}/${REL_PREFIX}` : BASE;

function isSkippable(u) {
  return (
    /^https?:\/\//i.test(u) ||
    u.startsWith("//") ||
    u.startsWith("data:") ||
    u.startsWith("blob:") ||
    u.startsWith("mailto:") ||
    u.startsWith("tel:") ||
    u.startsWith("#")
  );
}

function isRootRel(u) {
  return typeof u === "string" && u.startsWith("/") && !u.startsWith("//");
}

function joinPrefix(u) {
  if (!isRootRel(u) || isSkippable(u)) return u;
  if (!REL_PREFIX) return BASE + u;
  if (u === `/${REL_PREFIX}` || u.startsWith(`/${REL_PREFIX}/`)) return BASE + u;
  return FULL_PREFIX + u; // u уже начинается с /
}

function rewriteSrcset(srcset) {
  if (!srcset || typeof srcset !== "string") return srcset;
  return srcset
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((item) => {
      const [url, ...rest] = item.split(/\s+/);
      if (isSkippable(url)) return item;
      return [joinPrefix(url), ...rest].join(" ");
    })
    .join(", ");
}

// --- CSS url(...) переписываем ТОЛЬКО для картинок по расширениям
// поддержка query/hash: /a.webp?v=1#x
const IMG_EXT_RE = /\.(?:jpe?g|png|webp)(?:[?#][^'")]*)?(?=['")\s]|$)/i;

function rewriteCssUrls(cssText) {
  if (!cssText || typeof cssText !== "string") return cssText;

  return cssText.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (m, q, u) => {
      if (isSkippable(u)) return m;
      if (!isRootRel(u)) return m;          // трогаем только "/..."
      if (!IMG_EXT_RE.test(u)) return m;     // трогаем только jpg/png/webp
      const next = joinPrefix(u);
      return `url(${q}${next}${q})`;
    }
  );
}

function rewriteHtmlImages(html) {
  let out = html;

  // img src
  out = out.replace(/\bsrc=(['"])([^'"]+)\1/gi, (m, q, v) => {
    if (isSkippable(v)) return m;
    if (!isRootRel(v)) return m;
    // тут можно НЕ проверять расширение — img обычно и так картинка,
    // но оставим правило "любое root-rel"
    return `src=${q}${joinPrefix(v)}${q}`;
  });

  // img/srcset + source/srcset
  out = out.replace(/\bsrcset=(['"])([\s\S]*?)\1/gi, (m, q, v) => {
    return `srcset=${q}${rewriteSrcset(v)}${q}`;
  });

  // video poster
  out = out.replace(/\bposter=(['"])([^'"]+)\1/gi, (m, q, v) => {
    if (isSkippable(v)) return m;
    if (!isRootRel(v)) return m;
    // poster — картинка, можно без проверки расширения
    return `poster=${q}${joinPrefix(v)}${q}`;
  });

  // inline style="...url('/x.webp')..."
  out = out.replace(/\bstyle=(['"])([\s\S]*?)\1/gi, (m, q, v) => {
    const next = rewriteCssUrls(v);
    return `style=${q}${next}${q}`;
  });

  // <style>...</style>
  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => {
    const nextCss = rewriteCssUrls(css);
    return m.replace(css, nextCss);
  });

  return out;
}

function listCmsHtmlFiles() {
  if (!fs.existsSync(CMS_DIR)) return [];
  return fs
    .readdirSync(CMS_DIR, {withFileTypes: true})
    .filter((d) => d.isFile() && d.name.endsWith(".html"))
    .map((d) => path.join(CMS_DIR, d.name));
}

const files = listCmsHtmlFiles();
if (files.length === 0) {
  console.log(`[rewrite-images] no html files in ${CMS_DIR}`);
  process.exit(0);
}

let changed = 0;

for (const file of files) {
  const prev = fs.readFileSync(file, "utf8");
  const next = rewriteHtmlImages(prev);

  if (next !== prev) {
    fs.writeFileSync(file, next);
    changed++;
    console.log(`[rewrite-images] updated: ${path.relative(ROOT, file)}`);
  } else {
    console.log(`[rewrite-images] unchanged: ${path.relative(ROOT, file)}`);
  }
}

console.log(
  `[rewrite-images] done. base="${BASE}", prefix="${REL_PREFIX}", changed=${changed}/${files.length}`
);
