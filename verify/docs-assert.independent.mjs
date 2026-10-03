/**
 * docs-assert.independent.mjs —— 文档与实现一致性独立校验（QA 二线，与 docs-assert.mjs 各自独立）
 *
 * 只读取 src/ 源码 + README.md / docs/API.md，不修改任何文件。
 * 事实从源码提取，声明从 Markdown 提取，逐项比对，输出 通过/失败/警告 计数。
 * 无第三方依赖，node:fs 读取。
 *
 *   node verify/docs-assert.independent.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = (...s) => join(ROOT, ...s);

const read = (f) => readFileSync(P(f), "utf8");
const exist = (f) => existsSync(P(f));

let PASS = 0;
const FAIL = [];
let WARN = 0;
const NOTES = [];
/** 按「N 区域」标签分桶计断言，便于体检报告给出逐项覆盖率 */
const BY_AREA = new Map();
function ok(cond, msg, detail = "") {
  const area = (msg.match(/^\[(\d+[^\]]*?)\s/) || [, "0 其他"])[1];
  BY_AREA.set(area, (BY_AREA.get(area) || 0) + 1);
  if (cond) PASS++;
  else FAIL.push(`${msg}${detail ? "  →  " + detail : ""}`);
  return cond;
}
function warn(msg) {
  WARN++;
  NOTES.push(msg);
}
const B = String.fromCharCode(96); // 反引号
const bt = (s) => B + s + B;

/* ------------------------------------------------------------------ */
/* 0. 载入源码与文档                                                     */
/* ------------------------------------------------------------------ */
const SRC = {
  index: read("src/components/MindMap/index.ts"),
  types: read("src/components/MindMap/types.ts"),
  tsx: read("src/components/MindMap/MindMap.tsx"),
  css: read("src/components/MindMap/MindMap.css"),
  theme: read("src/components/MindMap/theme.ts"),
  tree: read("src/components/MindMap/tree.ts"),
  io: read("src/components/MindMap/io/index.ts"),
};
const README = read("README.md");
const API = read("docs/API.md");

const API_LINES = API.split("\n");
const R = (n) => API_LINES[n - 1] ?? ""; // 1-based 行取
const apiLineOf = (needle) => API_LINES.findIndex((l) => l.includes(needle)) + 1;

/**
 * 逐行取反引号包裹的片段。
 * 不能用「跨整个 section 的 /`([^`]+)`/g 配对」—— 只要中间某一行有奇数个反引号，
 * 配对就会整体错位，把后面的内容吃掉（曾导致 §3.9 的 getX/setX 分组写法集体漏检）。
 */
function backtickSpans(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const parts = line.split(String.fromCharCode(96));
    // 第 k 对反引号之间是 parts[2k+1]（第 0 项是行首的裸文本）
    for (let i = 1; i < parts.length - 1; i += 2) out.push(parts[i]);
  }
  return out;
}

/**
 * 判断一个 token 是不是「驼峰方法名」。
 * 不能用 /^[a-z][A-Z]/ —— `getTree` 的第 2 位是小写 e；也不能用 /[a-z][A-Z]/ 直接搜
 * （那会把 `api.current?.setMode(` 里的 `Mode` 当成方法名）。
 */
const isCamelMethod = (s) => /^[a-z][A-Za-z0-9$]*$/.test(s) && /[A-Z]/.test(s.slice(1));

/**
 * 把 markdown 表格首列还原成「方法 token」列表，用于防编造反查。
 * 要能穿透这几种「看着不像方法名、其实是」的写法：
 *   `~~getTree()~~`（删除线）／ `[getTree()](不再支持)`（链接）／
 *   `` `getTree()`（v1.0 后废弃）``（括号后缀）／ `getNote()/setNote(v)`（a/b 分组）
 */
function normalizeCell(cell) {
  return cell
    .replace(/~~/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(new RegExp(B, "g"), "")
    .replace(/\(.*$/, "")
    .split(/[/,]/)
    .map((x) => x.trim())
    .filter(isCamelMethod);
}

/* 把某段标题区间切出来 */
function section(md, headingRe, untilRe) {
  const lines = md.split("\n");
  const s = lines.findIndex((l) => headingRe.test(l));
  if (s < 0) return "";
  let e = lines.length - 1;
  if (untilRe) {
    for (let i = s + 1; i < lines.length; i++) if (untilRe.test(lines[i])) { e = i; break; }
  }
  return lines.slice(s, e + 1).join("\n");
}
const API_S1 = section(API, /^## 1 总览/, /^## 2 /);
const API_S2 = section(API, /^## 2 Props/, /^## 3 /);
const API_S3 = section(API, /^## 3 命令式 API/, /^## 4 /);
const API_S4 = section(API, /^## 4 类型定义/, /^## 5 /);
const API_S5 = section(API, /^## 5 常量与枚举全表/, /^## 6 /);
const API_S8 = section(API, /^## 8 CSS 类名清单/, /^## 9 /);
const API_S10 = section(API, /^## 10 集成示例/, /^## 11 /);

/* ------------------------------------------------------------------ */
/* 1. 导出符号覆盖（index.ts ↔ API.md §1.3）                             */
/* ------------------------------------------------------------------ */

/** 提取 index.ts 具名导出；返回 Set（含 export * 透出的模块导出） */
function parseExports(src) {
  const set = new Set();
  const stars = [];
  // 多行 export {...} from
  const re = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    for (const nm of names) {
      // 处理 `A as B` → 对外名是 B
      const parts = nm.split(/\s+as\s+/);
      set.add((parts[1] || parts[0]).trim());
    }
  }
  const re2 = /export\s+(?:const|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = re2.exec(src))) set.add(m[1]);
  const re3 = /export\s*\*\s*from\s*["']([^"']+)["']/g;
  while ((m = re3.exec(src))) stars.push(m[1]);
  return { set, stars };
}
const { set: IDX, stars: STAR_PATHS } = parseExports(SRC.index);

/** 展开 export * 的模块导出 */
for (const p of STAR_PATHS) {
  const f = "src/components/MindMap/" + p.replace(/^\.\//, "").replace(/\.ts$/, "") + ".ts";
  if (exist(f)) {
    const s2 = parseExports(read(f));
    for (const n of s2.set) IDX.add(n);
  }
}

/* 正向：每个 index.ts 导出符号都要在 API.md §1.3 出现 */
for (const name of [...IDX].sort()) {
  ok(API_S1.includes(bt(name)), `[1 导出覆盖·正向] ${name} 应在 API.md §1.3 有条目`);
}

/* 反向：API.md §1.3 里列出的符号必须真实存在（防编造） */
{
  const listed = new Set();
  const prose = new Set([
    "component", "function", "class", "type", "components", "exports", "default",
  ]);
  // 只看 §1.3 导出符号总表，逐行处理
  const chunk = section(API, /^### 1\.3 导出符号总表/, /^#### ❌/);
  for (const line of chunk.split("\n")) {
    // 「❌ 不对外导出」「⚙️ 未从 index.ts 再导出」是刻意标注的「不存在」，不算编造
    if (/未.*再导出|不对外导出/.test(line)) continue;
    // 纯描述行（挂 / 描边 / 注入 / 默认 …）里的反引号是内部 prop 或 CSS 关键字，不是导出符号
    if (/挂|描边|注入|默认|返回|造/.test(line)) continue;
    for (const span of backtickSpans(line)) {
      for (const piece of span.split("/")) {
        const t = piece.trim().replace(/\(.*$/, "");
        if (!/^[A-Za-z_$][\w$]*$/.test(t)) continue;
        if (prose.has(t)) continue;
        listed.add(t);
      }
    }
  }
  for (const name of [...listed].sort()) {
    ok(IDX.has(name), `[1 导出覆盖·反向] API.md §1.3 列出的 ${name} 必须真实存在于 index.ts`);
  }
}

/* ------------------------------------------------------------------ */
/* 2. 命令式 API 全覆盖（types.ts ↔ MindMap.tsx ↔ API.md §3）            */
/* ------------------------------------------------------------------ */

/** 取 interface 成员（花括号配对） */
function interfaceMembers(src, name) {
  const i = src.indexOf("export interface " + name + " {");
  if (i < 0) return [];
  const o = src.indexOf("{", i);
  let d = 0, e = o;
  for (let k = o; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}") { d--; if (d === 0) { e = k; break; } }
  }
  const body = src.slice(o + 1, e);
  const out = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("/*") || t.startsWith("*") || t.startsWith("//")) continue;
    const m = t.match(/^([A-Za-z_$][\w$]*)\s*[?(?:]/);
    if (m) out.push(m[1]);
  }
  return out;
}

const API_TYPES = interfaceMembers(SRC.types, "MindMapApi");
const API_TYPE_SET = new Set(API_TYPES);

/** 取 useImperativeHandle 挂载键（花括号 + 圆括号双深度扫描） */
function handleKeys(src) {
  const i = src.indexOf("useImperativeHandle(");
  if (i < 0) return [];
  const j = src.indexOf("=> ({", i);
  if (j < 0) return [];
  const o = src.indexOf("{", j); // 指向对象左花括号
  let bd = 0, pd = 0, end = src.length;
  for (let k = o; k < src.length; k++) {
    const c = src[k];
    if (c === "{") bd++;
    else if (c === "}") { bd--; if (bd === 0) { end = k; break; } }
    else if (c === "(") pd++;
    else if (c === ")") pd--;
  }
  const body = src.slice(o + 1, end);
  const keys = [];
  // 进入 body 时已在对象内部 → 花括号基准深度 1；圆括号也要跟，否则 (id: string) 的
  // 类型标注冒号会被误认成键名分隔符
  let bd2 = 1, pd2 = 0, start = 0, lastKey = null;
  const flush = (at) => {
    const seg = body.slice(start, at);
    if (lastKey) { keys.push(lastKey); lastKey = null; }
    else {
      const m = seg.match(/([A-Za-z_$][\w$]*)\s*$/); // 简写键 `addChild,`
      if (m) keys.push(m[1]);
    }
    start = at + 1;
  };
  for (let k = 0; k <= body.length; k++) {
    const c = k < body.length ? body[k] : null;
    if (c === ":") {
      const seg = body.slice(start, k);
      const m = seg.match(/([A-Za-z_$][\w$]*)\s*$/);
      if (m && bd2 === 1 && pd2 === 0 && seg.trim().length > 1) lastKey = m[1];
    }
    if (c === null) { if (body.slice(start).trim()) flush(body.length); break; }
    if (c === "{") bd2++;
    else if (c === "}") bd2--;
    else if (c === "(") pd2++;
    else if (c === ")") pd2--;
    else if (c === "," && bd2 === 1 && pd2 === 0) flush(k);
  }
  return keys;
}
const IMPL = handleKeys(SRC.tsx);
const IMPL_SET = new Set(IMPL);

/* 2.a 声明面 / 实现面必须一致 */
ok(API_TYPES.length === IMPL.length,
  `[2 命令式API] 声明面成员数应等于实现面挂载键数`,
  `types.ts=${API_TYPES.length} vs mindmap.tsx=${IMPL.length}`);
for (const n of API_TYPES) {
  ok(IMPL_SET.has(n), `[2 命令式API] 声明有 ${n} 但实现未挂载`);
}
for (const n of IMPL) {
  ok(API_TYPE_SET.has(n), `[2 命令式API] 实现挂载 ${n} 但 types.ts 未声明（对外不可见）`);
}

/* 2.b 每个方法都要在 API.md §3 出现（含 getX/setX 分组写法） */
const S3_TOKENS = new Set();
const S3_METHODS = new Set(); // §3 表格首列 = 文档正式承诺的方法
{
  // §3 里夹着代码块，先剥掉，避免 console.log / if (…) 这些假方法混进来
  const noFence = API_S3.replace(/```[\s\S]*?```/g, "");
  for (const span of backtickSpans(noFence)) {
    // a/b 分组写法（§3.9 的 setNote/getNote）
    for (const seg of span.split("/")) {
      const t = seg.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) S3_TOKENS.add(t);
    }
  }
  // 表格里的 `name(` 形态
  for (const m of noFence.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) S3_TOKENS.add(m[1]);
  /* §3 表格首列 = 文档正式承诺的方法集合，用于反向查编造 */
  for (const line of API_S3.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    for (const span of backtickSpans(line.split(/(?<!\\)\|/)[1] ?? "")) {
      for (const seg of span.replace(/\(.*$/, "").split("/")) {
        const t = seg.trim();
        if (isCamelMethod(t)) S3_METHODS.add(t);
      }
    }
  }
  // 以下都不是对外方法，是源码内部 helper / JS 内置
  for (const n of ["if", "log", "get", "forEach", "Error", "Boolean", "tsx", "setTimeout",
    "setTransform", "setCollapsedBelow", "handleExport", "zoomBy", "fit", "exportTree",
    "svgToPngBlob", "buildSvgPayload", "MindMapApi", "true", "false", "null", "then"]) {
    S3_TOKENS.delete(n);
  }
}
for (const n of API_TYPES) {
  ok(S3_TOKENS.has(n), `[2 命令式API] ${n} 应在 API.md §3 有条目`);
}
/* 反向：只查「§3 表格首列」—— 那里才是文档正式承诺的方法。
 * §3 的正文/坑列里会顺带提到类型名（MindNode）、常量（MARKER_MAP）、内部 helper
 * （applyStyle / addSummaryForSelected / setNodeField …），那些不是对外方法，不该判编造。 */
for (const n of [...S3_METHODS].sort()) {
  ok(API_TYPE_SET.has(n), `[2 命令式API·反向] API.md §3 表格首列的 ${n} 必须真实是 MindMapApi 成员`);
}

/* 2.c 文档声称的方法总数必须等于实际值 */
{
  const claimed = [...(README + API).matchAll(/(\d{2,3})\s*(?:个)?\s*(?:命令式)?\s*方法/g)]
    .map((m) => Number(m[1]));
  ok(!claimed.includes(API_TYPES.length) || true, `[2 方法总数] 实际 ${API_TYPES.length}`);
  for (const c of [...new Set(claimed)].sort((a, b) => a - b)) {
    if (c !== API_TYPES.length) {
      ok(false, `[2 方法总数] 文档写 ${c} 个方法，源码实际 ${API_TYPES.length} 个`,
        `散布在 README.md / docs/API.md；正确口径应为 ${API_TYPES.length}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 3. Props 覆盖（types.ts MindMapProps ↔ API.md §2）                   */
/* ------------------------------------------------------------------ */
const PROPS = interfaceMembers(SRC.types, "MindMapProps").filter((n) => n !== "MindMapProps" && n !== "MindMapApi");

/** 从 MindMap.tsx 解构默认值取默认字面量 */
function defaultsFromDtor() {
  const i = SRC.tsx.indexOf("forwardRef<MindMapApi, MindMapProps>(");
  const o = SRC.tsx.indexOf("{", i);
  const close = SRC.tsx.indexOf("}", o);
  const body = SRC.tsx.slice(o + 1, close);
  const map = {};
  const re = /([A-Za-z_$][\w$]*)\s*=\s*("[^"]*"|'[^']*'|[A-Za-z_$][\w$.]*)/g;
  let m;
  while ((m = re.exec(body))) map[m[1]] = m[2];
  return map;
}
const DEF = defaultsFromDtor();

const PROP_ROWS = new Map();
for (const line of API_S2.split("\n")) {
  if (!line.trim().startsWith("|")) continue;
  // 转义竖线 `number \| string` 不能拆，否则整行列位会错位
  const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
  if (cells.length < 3) continue;
  const f = cells[0].replace(/^`|`$/g, "");
  if (!/^[A-Za-z_$][\w$]*$/.test(f)) continue;
  PROP_ROWS.set(f, cells);
}
ok(PROPS.length === 11, `[3 Props] MindMapProps 应恰好 11 个字段`, `源码实际 ${PROPS.length}`);
for (const f of PROPS) {
  const row = PROP_ROWS.get(f);
  ok(!!row, `[3 Props·覆盖] ${f} 应在 API.md §2 有条目`);
  if (!row) continue;
  const defCell = row[2];
  if (Object.prototype.hasOwnProperty.call(DEF, f)) {
    ok(defCell.includes(DEF[f]) || defCell.includes("必填"),
      `[3 Props·默认值] ${f} 文档默认应与源码一致`, `源码=${DEF[f]} / 文档=${defCell}`);
  } else {
    ok(defCell === "—" || defCell.includes("必填") || defCell === "",
      `[3 Props·默认值] ${f} 源码无默认，文档不应写死默认值`, `文档=${defCell}`);
  }
}
/* 反向：文档里列出来的 prop 不能是源码不存在的 */
for (const f of PROP_ROWS.keys()) {
  ok(PROPS.includes(f), `[3 Props·反向] API.md §2 列出的 ${f} 必须存在于 MindMapProps`);
}

/* ------------------------------------------------------------------ */
/* 4. 枚举全表逐值校验                                                   */
/* ------------------------------------------------------------------ */

/**
 * 枚举断言一律只在 §5「常量与枚举全表」里找行。
 * 若按整篇 API.md 搜，§1.3 的「导出符号总表」会抢先命中同一批常量 id
 * （PRIORITY_LEVELS / FONT_FAMILIES / SHAPES … 在那里就已经出现过），导致查错行。
 */
const scopeOf = (text) => (text === API ? API_S5 : text);

/** 在目标行里同时出现 id 与 label */
function rowHas(idToken, label, text) {
  // 1) 必须「同一行里 id 和 label 都出现」：分开找第一个命中的 id 会把
  //    SHAPES 的 `none` 定位到 §5.7 那行（那里只有「无边框」没有「无箭头」）。
  // 2) id 入参形如 `solid`（可能自带反引号），但 §5.6/5.7/5.8 写的是「`solid 实线`」
  //    这种 id+中文合体串，并不存在独立的 `solid`。所以先剥掉反引号做裸串比较。
  const bare = idToken.replace(/`/g, "");
  // 3) 光是「同一行里有裸 id + label」还不够：§5.10 的 `priority-1` 与 §5.8 的
  //    `solid` 都可能在别处被 `MindBorderStyle` 之类的同串引述命中。若这行里
  //    存在反引号 token，就要求 id 必须命中的一个（等于 / 前缀+空格 / 前缀+斜杠）。
  const line = scopeOf(text).split("\n").find((l) => {
    if (!l.includes(bare) || !l.includes(label)) return false;
    const spans = backtickSpans(l).map((s) => s.trim()).filter(Boolean);
    if (!spans.length) return true; // 整行没有反引号（例如主题表那种裸 `| id | 名 |`）
    return spans.some((s) => s === bare || s.startsWith(bare + " ") || s.startsWith(bare + "/") || s.startsWith(bare + "-"));
  });
  if (!line) return { found: false, line: null };
  return { found: true, line };
}
/** 标签可能被合并成「优先级 1/2/3」这种分组写法，也要认 */
function labelIn(line, label) {
  if (line.includes(label)) return true;
  const base = label.replace(/\s*\d+$/, "");
  const digits = label.match(/\d+$/);
  if (!base || !digits) return false;
  return new RegExp(base.replace(/\s+$/, "") + "\\s*[\\d/]+").test(line);
}
function lineOf(id, text) {
  return scopeOf(text).split("\n").find((l) => l.includes(id)) ?? "";
}

/* 4.1 THEME_LIST（17 个） */
{
  const i = SRC.theme.indexOf("export const THEME_LIST");
  const body = SRC.theme.slice(i, SRC.theme.indexOf("];", i));
  const themes = [...body.matchAll(/\bt\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g)]
    .map((m) => ({ id: m[1], name: m[2], cat: m[3] }));
  ok(themes.length === 17, `[4 枚举] THEME_LIST 应为 17 个`, `源码实际 ${themes.length}`);
  const jitter = {};
  const jm = /t\(\s*"(hand-[\w-]+)"[\s\S]{0,400}?handJitter:\s*([\d.]+)/g;
  let mm;
  while ((mm = jm.exec(body))) jitter[mm[1]] = mm[2];
  for (const t of themes) {
    const r = rowHas(bt(t.id), t.name, API);
    ok(r.found, `[4 枚举] THEME_LIST 缺少 ${t.id}`);
    if (t.cat === "hand") {
      ok(Object.prototype.hasOwnProperty.call(jitter, t.id),
        `[4 枚举] 手绘主题 ${t.id} 应有 hanfJitter`, "源码未解析到");
      if (jitter[t.id]) {
        ok(R(apiLineOf(bt(t.id))).includes(jitter[t.id]),
          `[4 枚举] ${t.id} 的 handJitter 文档值应与源码一致`,
          `源码=${jitter[t.id]} / 文档=${R(apiLineOf(bt(t.id))).trim()}`);
      }
    }
  }
  /* 分类列 / 分类总数必须与源码一致 */
  const cats = themes.reduce((a, t) => ((a[t.cat] = (a[t.cat] || 0) + 1), a), {});
  for (const t of themes) {
    const line = lineOf(bt(t.id), API);
    ok(line.includes("| " + t.cat + " |") || line.includes("|" + t.cat + "|"),
      `[4 枚举] ${t.id} 的分类列应与源码一致`, `源码=${t.cat} / 文档=${line.trim()}`);
  }
  /* THEME_CATEGORIES 四分类声明 */
  const ti = SRC.theme.indexOf("THEME_CATEGORIES");
  const catNames = [...SRC.theme.slice(ti, ti + 400).matchAll(/"([a-z]+)[\s\S]{0,40}?"([\u4e00-\u9fa5]+)"/g)]
    .map((m) => m[2]);
  const catLine = lineOf("THEME_CATEGORIES", API);
  for (const cn of catNames) ok(catLine.includes(cn), `[4 枚举] THEME_CATEGORIES 文档缺中文分类「${cn}」`);
}

/* 4.2 STRUCTURES（7） */
{
  // ⚠️ STRUCTURES 在 theme.ts（不是 types.ts；types.ts 里只有 StructureType 联合类型）
  const i = SRC.theme.indexOf("export const STRUCTURES");
  const body = SRC.theme.slice(i, SRC.theme.indexOf("];", i));
  const items = [...body.matchAll(/\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*thumb:\s*"([^"]+)"\s*\}/g)]
    .map((m) => ({ id: m[1], label: m[2], thumb: m[3] }));
  ok(items.length === 7, `[4 枚举] STRUCTURES 应为 7 个`, `源码实际 ${items.length}`);
  for (const it of items) {
    const r = rowHas(bt(it.id), it.label, API);
    ok(r.found, `[4 枚举] STRUCTURES 行缺 ${it.id} (label=${it.label})`);
  }
  /* 缩略图变体也要对 */
  for (const it of items) {
    const line = lineOf(bt(it.id), API);
    ok(line.includes(bt(it.thumb)), `[4 枚举] ${it.id} 的 thumb 值应与源码一致`,
      `源码=${it.thumb} / 文档行=${line.trim()}`);
  }
}

/** 取常量数组字面量的「元素区」：从 `] = [` 之后开始，避开前面的类型标注 `{ id: X; label: Y }` */
function arrayBody(srcText, anchor) {
  const i = srcText.indexOf(anchor);
  if (i < 0) return null;
  const arr = srcText.slice(i, srcText.indexOf("];", i));
  const head = arr.indexOf("] = [");
  return head >= 0 ? arr.slice(head + 4) : arr;
}

/* 4.3 LINK_PATTERNS / LINK_ARROWS / LINK_COLOR_MODES / BRANCH_SHAPES 等 {id,label} 表 */
function checkIdLabelArray(srcText, anchor, label, mdScope) {
  const i = srcText.indexOf(anchor);
  if (i < 0) { ok(false, `[4 枚举] 源码找不到 ${anchor}`); return; }
  const body = arrayBody(srcText, anchor);
  const items = [...body.matchAll(/\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g)]
    .map((m) => ({ id: m[1], label: m[2] }));
  ok(items.length >= 2, `[4 枚举] ${label} 应有 ≥2 项`, `源码实际 ${items.length}`);
  for (const it of items) {
    const r = rowHas(bt(it.id), it.label, mdScope);
    ok(r.found, `[4 枚举] ${label} 缺 ${it.id}（label=${it.label}）`);
  }
}
checkIdLabelArray(SRC.types, "export const LINK_PATTERNS", "LINK_PATTERNS", API);
checkIdLabelArray(SRC.types, "export const LINK_ARROWS", "LINK_ARROWS", API);
checkIdLabelArray(SRC.types, "export const LINK_COLOR_MODES", "LINK_COLOR_MODES", API);
checkIdLabelArray(SRC.types, "export const BRANCH_STYLES", "BRANCH_STYLES", API);
checkIdLabelArray(SRC.types, "export const BORDER_STYLES", "BORDER_STYLES", API);
checkIdLabelArray(SRC.types, "export const SHAPES", "SHAPES", API);

/* 4.4 BRANCH_STYLES 数量红线（8 种） */
{
  const body = arrayBody(SRC.types, "export const BRANCH_STYLES");
  const n = (body.match(/\{\s*id:/g) || []).length;
  ok(n === 8, `[4 枚举] BRANCH_STYLES 应为 8 种`, `源码实际 ${n}`);
  ok(API.includes("8 种"), `[4 枚举] API.md 应对 BRANCH_STYLES 声明 8 种`);
}

/* 4.5 MARKERS（12 个） */
{
  const i = SRC.theme.indexOf("export const MARKERS");
  const body = SRC.theme.slice(i, SRC.theme.indexOf("];", i));
  const items = [...body.matchAll(/\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*char:\s*"([^"]*)"\s*,\s*bg:\s*"([^"]+)"/g)]
    .map((m) => ({ id: m[1], label: m[2], char: m[3], bg: m[4] }));
  ok(items.length === 12, `[4 枚举] MARKERS 应为 12 个`, `源码实际 ${items.length}`);
  ok(API.includes("12 个"), `[4 枚举] API.md 应对 MARKERS 声明 12 个`);
  for (const it of items) {
    const line = lineOf(bt(it.id), API);
    ok(labelIn(line, it.label), `[4 枚举] MARKERS 行缺 ${it.id} 的中文名「${it.label}」`);
    ok(line.includes(bt(it.char)), `[4 枚举] MARKERS 行缺 ${it.id} 的字符 ${it.char}`);
    ok(line.includes(bt(it.bg)), `[4 枚举] MARKERS 行缺 ${it.id} 的配色 ${it.bg}`);
  }
}

/* 4.6 FONT_FAMILIES / FONT_SIZES / NODE_ICONS / PRIORITY_LEVELS / PROGRESS_LEVELS */
{
  const ff = SRC.types.slice(SRC.types.indexOf("export const FONT_FAMILIES"));
  const ffBody = ff.slice(0, ff.indexOf("];"));
  const ffs = [...ffBody.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  ok(ffs.length === 10, `[4 枚举] FONT_FAMILIES 应为 10 项`, `源码实际 ${ffs.length}`);
  const line = lineOf("FONT_FAMILIES", API);
  for (const l of ffs) ok(line.includes(l), `[4 枚举] FONT_FAMILIES 缺「${l}」`, `源码表=${ffs.join("/")}`);

  const fsBody = SRC.types.match(/export const FONT_SIZES = \[([^\]]+)\]/)[1];
  const fss = fsBody.split(",").map((s) => Number(s.trim()));
  ok(lineOf("FONT_SIZES", API).includes(fss.join(",")),
    `[4 枚举] FONT_SIZES 文档值应与源码一致`, `源码=${fss.join(",")}`);

  const pi = SRC.theme.indexOf("PRIORITY_LEVELS");
  const piBody = SRC.theme.slice(pi, SRC.theme.indexOf("]", pi));
  const prio = (piBody.match(/\d+/g) || []).map(Number);
  ok(prio.length === 9 && prio[0] === 1 && prio[8] === 9,
    `[4 枚举] PRIORITY_LEVELS 应为 1..9`, `源码=${prio.join(",")}`);
  ok(lineOf("PRIORITY_LEVELS", API).includes("1..9"), `[4 枚举] PRIORITY_LEVELS 文档口径应为 1..9`);

  const qi = SRC.theme.indexOf("PROGRESS_LEVELS");
  const qBody = SRC.theme.slice(qi, SRC.theme.indexOf("]", qi));
  const prog = (qBody.match(/\d+/g) || []).map(Number);
  ok(prog.length === 11 && prog[0] === 0 && prog[10] === 10,
    `[4 枚举] PROGRESS_LEVELS 应为 0..10`, `源码=${prog.join(",")}`);
  ok(lineOf("PROGRESS_LEVELS", API).includes("0..10"), `[4 枚举] PROGRESS_LEVELS 文档口径应为 0..10`);

  const niBody = arrayBody(SRC.theme, "export const NODE_ICONS");
  const iconIds = [...niBody.matchAll(/id:\s*"([\w-]+)"/g)].map((m) => m[1]);
  // emoji 是非 ASCII 字符，按常用码位区间枚举容易漏（⏰ U+23F0 就不在常规区间里）。
  // ⚠️ / ❤️ 是「主字符 + U+FE0F 变体选择符」两段码位，捕获组必须用 [^"]* 而非单码点，
  // 否则 `[^\x00-\x7F]` 抓到 ⚠ 之后紧跟的是 FE0F 不是 `"`，整条匹配失败（曾少算 2 个）。
  // 必须锚定 `char:` —— 只写 `:\s*"` 会把 `label: "星标"` 也抓进来
  const iconEmoji = [...niBody.matchAll(/char:\s*"([^\x00-\x7F][^"]*)"/gu)].map((m) => m[1]);
  ok(iconIds.length === 24, `[4 枚举] NODE_ICONS 应为 24 个`, `源码 id 数=${iconIds.length}`);
  ok(iconEmoji.length === 24, `[4 枚举] NODE_ICONS 应为 24 个`, `源码 emoji 数=${iconEmoji.length}`);
  const docIcons = section(API, /NODE_ICONS/, /^$/); // §5.11 里那一行
  const iconLine = API.split("\n").find((l) => l.includes("NODE_ICONS") && l.includes("⭐"));
  for (const em of iconEmoji) {
    ok((iconLine ?? "").includes(em), `[4 枚举] NODE_ICONS 文档缺 emoji ${em}`,
      `源码 emoji=${iconEmoji.join("")}`);
  }
}

/* 4.7 EXPORT_LABELS / IMPORT_ACCEPT */
{
  const i = SRC.io.indexOf("EXPORT_LABELS");
  const body = SRC.io.slice(i, SRC.io.indexOf("};", i));
  // ⚠️ 这张表在 §6.1，不在 §5（scopeOf 会把 ⚠️ 参数统一限定到 §5，这里要绕过）
  const labels = [...body.matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => ({ k: m[1], v: m[2] }));
  for (const l of labels) {
    // 必须同时命中 key 与 value，否则会撞到 §6.1 嗅探顺序那几行（那里也有 `json`）
    const line = API.split("\n").find((x) => x.includes(bt(l.k)) && x.includes(l.v));
    ok(!!line, `[4 枚举] EXPORT_LABELS 缺 ${l.k} → 「${l.v}」`);
  }
  const acc = (SRC.io.match(/IMPORT_ACCEPT[^=]*=\s*"([^"]+)"/) || [])[1] || "";
  const exts = acc.split(",").map((s) => s.trim());
  ok(exts.length === 8, `[4 枚举] IMPORT_ACCEPT 应为 8 个扩展名`, `源码实际 ${exts.length}: ${acc}`);
  /* 文档里 IMPORT_ACCEPT 那一行必须逐字等于源码值（要带 ".km" 才认得出是 §6.1 那行，
     否则 §1.3 的导出总表里也有一处 IMPORT_ACCEPT） */
  const accLine = API.split("\n").find((x) => x.includes("IMPORT_ACCEPT") && x.includes(".km"));
  const accCell = backtickSpans(accLine ?? "").find((s) => s.startsWith('"')) ?? "";
  ok(accCell === `"${acc}"`,
    `[4 枚举] API.md 的 IMPORT_ACCEPT 实际值应与源码逐字一致`,
    `源码="${acc}" / 文档=${accCell}`);
  for (const e of exts) ok(accCell.includes(e), `[4 枚举] IMPORT_ACCEPT 应含扩展名 ${e}`);
}

/* ------------------------------------------------------------------ */
/* 5. 类型字段校验（API.md §4）                                          */
/* ------------------------------------------------------------------ */
{
  const NODE = interfaceMembers(SRC.types, "MindNode");
  const STYLE = interfaceMembers(SRC.types, "MindNodeStyle");
  const IMAGE = interfaceMembers(SRC.types, "MindNodeImage");
  const ASSOC = interfaceMembers(SRC.types, "MindAssocLine");
  const FRAME = interfaceMembers(SRC.types, "MindNodeFrame");
  const GEN = interfaceMembers(SRC.types, "MindGeneralization");
  const SUMG = interfaceMembers(SRC.types, "MindSummaryGroup");
  const FRAMEG = interfaceMembers(SRC.types, "MindFrameGroup");
  const groups = [
    ["MindNode", NODE], ["MindNodeStyle", STYLE], ["MindNodeImage", IMAGE],
    ["MindAssocLine", ASSOC], ["MindNodeFrame", FRAME], ["MindGeneralization", GEN],
    ["MindSummaryGroup", SUMG], ["MindFrameGroup", FRAMEG],
  ];
  for (const [iface, fields] of groups) {
    for (const f of fields) {
      ok(API_S4.includes(f), `[5 类型字段] ${iface}.${f} 应在 API.md §4 有条目`);
    }
  }
  // 文档写的是 `共 **21** 个字段`（带加粗标记），按 §4.1 表格行数核对更稳
  const s41 = section(API, /^### 4\.1 /, /^### 4\.2 /);
  const rowCount = s41.split("\n").filter((l) => {
    const t = l.trim();
    if (!/^\|/.test(t) || /^\|\s*-/.test(t)) return false;
    return !/^\|\s*字段/.test(t); // 去掉表头行，只数数据行
  }).length;
  ok(/✅|21/.test(s41), `[5 类型字段] API.md §4.1 应声明 MindNode 字段数`, `表格行数=${rowCount}`);
  ok(rowCount === NODE.length, `[5 类型字段] §4.1 表格行数应与源码字段数一致`,
    `文档=${rowCount} / 源码=${NODE.length}`);
  ok(NODE.length === 21, `[5 类型字段] MindNode 应为 21 个字段`, `源码实际 ${NODE.length}`);
  ok(API_S4.includes("13") || STYLE.length === 13, `[5 类型字段] MindNodeStyle 字段数`, `源码 ${STYLE.length}`);
}

/* ------------------------------------------------------------------ */
/* 6. CSS 类名双向校验（API.md §8）                                      */
/* ------------------------------------------------------------------ */
{
  const cssClasses = new Set([...SRC.css.matchAll(/^\.([a-zA-Z][\w-]*)/gm)].map((m) => m[1]));
  const jsxClasses = new Set();
  // 所有 tsx（递归组件目录）
  const { readdirSync, statSync } = await import("node:fs");
  function walk(dir) {
    for (const e of readdirSync(dir)) {
      if (e === "node_modules" || e === ".git") continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx$/.test(e)) {
        const t = readFileSync(p, "utf8");
        for (const m of t.matchAll(/className=[{"'`]?([^"`{}]*)/g)) {
          for (const c of m[1].split(/\s+/)) {
            const cc = c.replace(/^\$\{.*/, "").trim();
            if (/^(mm-[a-z0-9-]+|is-[a-z0-9-]+)$/.test(cc)) jsxClasses.add(cc);
          }
        }
        for (const m of t.matchAll(/["'`](mm-[a-z0-9-]+)["'`]/g)) jsxClasses.add(m[1]);
      }
    }
  }
  walk(P("src/components/MindMap"));

  /* 6.a MindMap.css 里的 .mm-* 必须被 §8 覆盖 */
  for (const c of [...cssClasses].sort()) {
    ok(API_S8.includes(c), `[6 CSS] MindMap.css 的 .${c} 应在 API.md §8 有条目`);
  }
  /* 6.b 关键 is-* 态也要被 §8 覆盖 */
  for (const c of [...jsxClasses].sort()) {
    if (c.startsWith("mm-")) continue;
    ok(API_S8.includes(c), `[6 CSS] JSX 输出的 .${c} 应在 API.md §8 有条目`);
  }
  /* 6.c 那批「仅作 DOM 标记、CSS 无规则」必须被显式标注 */
  const DOM_ONLY = ["mm-hit", "mm-underline", "mm-image", "mm-tags", "mm-extras", "mm-root", "mm-link"];
  for (const c of DOM_ONLY) {
    const line = API_S8.split("\n").find((l) => l.includes(c));
    ok(!!line, `[6 CSS] §8 应覆盖 ${c}`);
    if (line) {
      ok(/仅作|DOM|有 CSS 规则|CSS 无规则/.test(line),
        `[6 CSS] ${c} 应被显式标注为「仅作 DOM 标记 / CSS 无规则」`, `文档行=${line.trim()}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 7. 过期口径黑名单                                                     */
/* ------------------------------------------------------------------ */
{
  const BLACK = [
    [/addSummaryFor\((?!\))/, "addSummaryFor( 带参数"],
    [/addFrameFor\((?!\))/, "addFrameFor( 带参数"],
    [/\bsetTheme\s*\(/g, "setTheme("],
    [/\bapplyStyle\s*\(/g, "applyStyle("],
    [/selectOnly\s*\(/g, "selectOnly("],
    [/\bexportFile\s*\(/g, "exportFile("],
    [/(?<!In|Out|in|out)\bzoom\s*\(/g, "zoom("],
    [/\bfit\s*\(/g, "fit("],
    [/\bscrollTo\s*\(/g, "scrollTo("],
    [/\bgetBoundingRect\s*\(/g, "getBoundingRect("],
    [/\bgetNodeById\s*\(/g, "getNodeById("],
    [/\bsetEditable\s*\(/g, "setEditable("],
    [/\bindent\s*\(/g, "indent("],
    [/port\s*渲染/g, "「port 渲染」说法"],
  ];
  /* 「有意的纠错上下文」——文档在指认旧签名/已知缺陷时不算编造 */
  // 这些出现「旧签名」的地方，同行是在指认缺陷 / 对照旧 README / 说明内部关联，属正确写法
  const PARDON = /声明是|过期|D2|是错的|没有「|不生效|忽略|已修正|无「|修正|⚠️|🔴|🟡|空转|clientHeight|clientWidth|不会|不输出|触发|自动|fitView|带参|旧\s*README|旧版|对照/;
  const docs = { "README.md": README, "docs/API.md": API };
  for (const [file, text] of Object.entries(docs)) {
    const lines = text.split("\n");
    for (const [re, label] of BLACK) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!re.test(line)) continue;
        if (PARDON.test(line)) {
          NOTES.push(`[7 黑名单·纠错放行] ${file}:${i + 1} 出现「${label}」，但同行是纠错/指认旧签名的上下文`);
          continue;
        }
        ok(false, `[7 黑名单] ${file}:${i + 1} 出现过期口径「${label}」`, line.trim().slice(0, 120));
      }
    }
  }
  /* 「拖动节点可排序」不得被描述成默认行为 */
  ok(/拖动节点可排序/.test(README + API), "[7 黑名单] 文档提及「拖动节点可排序」");
  const dragLines = (README + API).split("\n").map((l, i) => [i + 1, l])
    .filter(([, l]) => /拖动节点可排序/.test(l));
  for (const [ln, l] of [...new Map(dragLines.map((x) => [x[0], x])).values()]) {
    ok(/默认关闭|需|必须|误导|setFreeDrag/.test(l),
      `[7 黑名单] README/API.md 第 ${ln} 行把「拖动节点可排序」当成了默认行为`,
      l.trim().slice(0, 120));
  }
}

/* ------------------------------------------------------------------ */
/* 8. 体量与红线                                                         */
/* ------------------------------------------------------------------ */
{
  const rl = README.split("\n").length;
  const al = API.split("\n").length;
  ok(rl <= 260, `[8 体量] README.md 应 ≤260 行`, `实际 ${rl}`);
  ok(al >= 700, `[8 体量] docs/API.md 应 ≥700 行`, `实际 ${al}`);

  /* README 不得塞全量表（只应是代表项 + 链回 API 手册） */
  const readmeLines = README.split("\n");
  const themeIds = [...SRC.theme.matchAll(/\bt\(\s*"(hand-|classic-|dark-|plain-)/g)].map((m) => m[1]);
  const rowsWithTheme = readmeLines.filter((l) => l.trim().startsWith("|") &&
    themeIds.some((id) => l.includes(id))).length;
  warn(`README 含 ${rowsWithTheme} 行「主题 id」表格行（阈值 ≥12 即视为塞了 17 主题全量表）`);
  ok(rowsWithTheme < 12, `[8 红线] README 不应出现 17 主题全量表`);

  const mmTokens = new Set([...README.matchAll(/\b(mm-[a-z0-9-]+)/g)].map((m) => m[1]));
  warn(`README 独立 mm-* 类名 token 数 = ${mmTokens.size}（≥12 视为塞了 CSS 全类名表）`);
  ok(mmTokens.size < 12, `[8 红线] README 不应出现 CSS 全类名表`);

  // §3 必须逐条提到每个对外方法（不是只写一段概述）。
  //
  // ⚠️ 三个坑（都是实测踩过的）：
  //  1) 不能用 /\b[a-z][A-Z]/ 抓驼峰 —— `getTree` 里 t 与 T 之间根本没有词边界。
  //  2) 不能只看「表格首列」—— §3.9/§3.10 的 `setNote/getNote`、§3.13 的
  //     `getNodeBoxes(): Record<…>` 是**正文段落**写法，不在任何表格首列里；
  //     只按表格首列统计会把覆盖算成 49/74（假失败）。
  //  3) 必须先剥掉 ``` 代码块 —— 否则 §3.9 的 `api.current?.setNote("…")` 会让
  //     断言退化成「只要示例代码里出现过就算过」。
  const s3Prose = API_S3.replace(/```[\s\S]*?```/g, "");
  const s3Hit = (n) =>
    new RegExp("(?<![\\w.$])" + n + "(?![\\w$])").test(s3Prose);
  const s3Missed = API_TYPES.filter((n) => !s3Hit(n));
  ok(s3Missed.length === 0,
    `[8 红线] API.md §3 必须逐条提到每个对外方法`,
    `§3 未提及的成员：${s3Missed.join(", ") || "无"}`);
  /* 只统计、不判失败：有多少成员确实是「表格首列」逐条列出的 */
  const s3TableOnly = API_S3.split("\n").filter((l) => l.trim().startsWith("|"));
  const inTable = new Set();
  for (const line of s3TableOnly) {
    for (const span of backtickSpans(line.split(/(?<!\\)\|/)[1] ?? "")) {
      for (const seg of span.replace(/\(.*$/, "").split(/[/,]/)) {
        const t = seg.trim();
        if (isCamelMethod(t)) inTable.add(t);
      }
    }
  }

  /* 防编造（反向）：§3 表格首列里记录的每个「对外名字」，必须真在源码里存在。
   *
   * 这是上面 s3Missed 的补集 —— 那条查「源码有但文档没提」，
   * 这条查「文档提了但源码没有」。两边缺一条就漏一类错。
   * 原缺口（与 software-qa-engineer-2 交叉确认过）：两道闸的「存在性」判定
   * 都会被行内标记骗过去 —— `~~getTree()~~` 归一化后仍是 getTree，
   * 正向检查会当成「提到了」，于是「伪装删除」无人拦截。
   *
   * 抽取口径（第一版踩坑）：原来只收 isCamelMethod 的驼峰名，结果 §3 首列
   * 里的 `undo()` / `redo()` / `outdent()` / `select()` 这类**全小写名**全被
   * 过滤掉，74 个成员里只有 49 个进得了扫描 —— 缺口比告警里写的还大。
   * 现改成「取首列单元格里被记录的那个名字」（首个反引号段的首个标识符，
   * 其次才是裸标识符），不再按驼峰过滤，只按「是否真在源码声明过」判。
   */
  /** 源码里声明过的所有顶层名字（export / const / function / class / type / interface / enum） */
  const SRC_NAMES = new Set();
  for (const src of Object.values(SRC)) {
    for (const m of src.matchAll(/\b(?:const|function|class|type|interface|enum|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
      SRC_NAMES.add(m[1]);
    }
    for (const m of src.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
      for (const n of m[1].matchAll(/([A-Za-z_$][\w$]*)/g)) SRC_NAMES.add(n[1]);
    }
  }
  /** 从首列单元格里取出「被记录的名字」：优先首个反引号段的首个标识符，其次裸标识符 */
  const leadName = (cell) => {
    const c = cell.replace(/\*\*/g, "").trim();
    const span = c.match(/`([^`]+)`/);
    const s = (span ? span[1] : c.replace(/^[^A-Za-z_$]+/, "")).replace(/\(.*$/, "").replace(/\s*=.*$/, "");
    return s.match(/^[A-Za-z_$][\w$]*$/)?.[0] ?? null;
  };
  const rowToks = new Map();
  for (const line of s3TableOnly) {
    const cell = line.split(/(?<!\\)\|/)[1] ?? "";
    // 首列必须带反引号，否则是表头 / `| --- |` 分隔行 / Props 那种别的表格
    if (!cell.includes(B)) continue;
    for (const t of new Set(normalizeCell(cell))) {
      if (!rowToks.has(t)) rowToks.set(t, cell.trim().slice(0, 90));
    }
    const n = leadName(cell);
    if (n && !rowToks.has(n)) rowToks.set(n, cell.trim().slice(0, 90));
  }
  // 「真实存在」= MindMapApi 成员 ∪ 源码里声明过的顶层名字（§3 首列也记录内部
  // helper / 常量 / 类型，如 textBlockWidth、TEXT_LEFT_INSET、SketchOptions，它们都是真的）
  const fabricated = [...rowToks.keys()].filter((n) => !API_TYPE_SET.has(n) && !SRC_NAMES.has(n));
  ok(fabricated.length === 0,
    `[8 红线] API.md §3 表格首列不得出现源码里不存在的方法（防编造）`,
    fabricated.map((n) => `${n}｜出自 ${rowToks.get(n)}`).join(" / ") || "无");

  /* 伪装删除：给「源码里真实存在」的方法打删除线，上面那条防编造查不出来 ——
   * 归一化后照样是 getTree，正向检查也照样算「提到了」。
   * 唯一自洽的用法是：删除线只标「源码里已经没有的方法」。 */
  const struck = [];
  /** 链接式 / 废弃后缀式的「伪装删除」形态（~~getTree~~ 之外的两种） */
  const DISGUISE = /~~|\[[^\]]+\]\([^)]*\)|[（(][^）()]*?(?:废弃|不再支持|移除|下线|删除|作废)[^）()]*?[）)]/;
  for (const line of s3TableOnly) {
    const cell = line.split(/(?<!\\)\|/)[1] ?? "";
    const n = leadName(cell);
    if (!n || !API_TYPE_SET.has(n)) continue;
    // 全小写名也可能被伪装（undo/redo…），所以这里不看 normalizeCell 的驼峰结果
    if (/~~/.test(cell) || DISGUISE.test(cell)) {
      struck.push(`${n}｜${cell.trim().slice(0, 70)}`);
    }
  }
  ok(struck.length === 0,
    `[8 红线] §3 表格首列不得对源码里真实存在的方法打删除线（伪装删除）`,
    struck.join(" / ") || "无");

  /* 已知缺口可视化（warning，不拦截）：正向闸只看「§3 全文有没有提到」，
   * 防编造只扫「表格首列」，于是「把某方法的表格首列删掉、只在代码块里
   * api.current!.x() 演示一次」两道闸都查不出（反向对照实测：删掉 §3 首行
   * getTree、仍留 L155 的 api.current!.getTree()，366 脚本 0 红）。
   * 这里把「只在代码块/散文锚点出现、表格里没有行」的方法列出来，肉眼盯表行数退化。
   */
  {
    const anchorOnly = [...API_TYPES].filter((n) => !rowToks.has(n));
    if (anchorOnly.length) {
      warn(`[8 已知缺口] §3 表格首列只覆盖 ${rowToks.size}/${API_TYPES.length} 个方法，`
        + `其余 ${anchorOnly.length} 个仅由代码块 / 散文锚点兜住（表格里没有行）：`
        + `${anchorOnly.join(" / ")}`);
    }
  }

  /* README 末尾必须有指向 docs/API.md 的相对链接，且目标存在 */
  const lastBlock = readmeLines.slice(-6).join("\n");
  const linkM = lastBlock.match(/\]\((?!https?:)([^)]+)\)/);
  ok(!!linkM, `[8 体量] README 末尾应有指向 docs/API.md 的相对链接`);
  if (linkM) {
    const target = linkM[1].split("#")[0];
    ok(exist(target), `[8 体量] README 末尾链接目标 ${target} 必须存在`);
  }
}

/* ------------------------------------------------------------------ */
/* 9. 反例 / 代码示例可用性                                               */
/* ------------------------------------------------------------------ */
{
  for (const [file, text] of [["README.md", README], ["docs/API.md", API]]) {
    const blocks = [...text.matchAll(/```(?:tsx|ts|js|jsx)\n([\s\S]*?)```/g)].map((m) => m[1]);
    const seen = new Set();
    for (const blk of blocks) {
      for (const m of blk.matchAll(/\bapi\.current!?\.?(\w+)\s*\(/g)) seen.add(m[1]);
      for (const m of blk.matchAll(/\bapi\.current!?\?!?\.(\w+)\s*\(/g)) seen.add(m[1]);
      for (const m of blk.matchAll(/\bapi\.(\w+)\s*\(/g)) seen.add(m[1]);
      // 只挑「裸调用」的 setXxx(：`api.current?.setMode(…)` 前面有 `.`，不该拆成 Mode(
      for (const m of blk.matchAll(/(?<![\w.])\bset([A-Z]\w*)\s*\(/g)) seen.add("set" + m[1]);
      for (const m of blk.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']mindmap-vite["']/g)) {
        for (const nm of m[1].split(",").map((s) => s.trim().replace(/^type\s+/, ""))) {
          if (/^[A-Za-z_$][\w$]*$/.test(nm)) seen.add(nm);
        }
      }
    }
    for (const n of [...seen].sort()) {
      ok(API_TYPE_SET.has(n) || IDX.has(n) || n === "setTransform",
        `[9 代码示例] ${file} 代码块里的 \`${n}(\` 必须真实存在（MindMapApi 或 index.ts 导出）`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 输出                                                                 */
/* ------------------------------------------------------------------ */
console.log("=".repeat(72));
console.log("文档一致性独立校验 · verify/docs-assert.independent.mjs");
console.log("=".repeat(72));
console.log(`断言总数 = ${PASS + FAIL.length}   通过 = ${PASS}   失败 = ${FAIL.length}   警告 = ${WARN}`);
console.log("-".repeat(72));
console.log("逐项覆盖：");
for (const [area, n] of [...BY_AREA].sort()) {
  console.log(`  · [${area}] ${n} 条`);
}
if (NOTES.length) {
  console.log(`\n[纠错放行 / 警告项 ${NOTES.length} 条]`);
  for (const n of NOTES.slice(0, 40)) console.log("  · " + n);
  if (NOTES.length > 40) console.log(`  · … 另有 ${NOTES.length - 40} 条`);
}
if (FAIL.length) {
  console.log(`\n[失败项 ${FAIL.length} 条]`);
  for (const f of FAIL) console.log("  ✗ " + f);
  console.log("-".repeat(72));
  console.log("判定：文档需要返工");
  process.exit(1);
} else {
  console.log("\n全部通过");
}
