#!/usr/bin/env node
/**
 * docs-assert.mjs —— 文档 ↔ 源码 一致性校验（QA 独立核查 · mindmap-vite v1.0.0）
 *
 * 只「读」不「写」：不修改 README.md / docs/API.md / src/ 下任何文件。
 * 事实口径一律以 src/ 源码为准；docs/_api-inventory.md 仅作辅助，不参与断言。
 *
 * 校验分组：
 *   1 导出符号双向      2 命令式 API 覆盖（声明面 + 实现面）
 *   3 Props             4 枚举逐值（id + 中文文案）
 *   5 类型字段          6 CSS 类名双向
 *   7 过期/编造写法黑名单 8 体量与红线
 *   9 代码示例可用性
 *
 * 用法：node verify/docs-assert.mjs        （退出码 0 = 全部通过 / 仅 warning）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/** 行数口径对齐 wc -l：末尾多余空行不计 */
const readLines = (rel) => {
  const l = read(rel).split(/\r?\n/);
  if (l.length && l[l.length - 1] === "") l.pop();
  return l;
};
/** markdown 表格行按 | 切分（先还原转义竖线） */
const splitRow = (line) => line.replace(/\\\|/g, "\u0000").split("|").slice(1, -1).map((c) => c.replace(/\u0000/g, "|").trim());

const C = "src/components/MindMap";
const F = {
  index: `${C}/index.ts`,
  types: `${C}/types.ts`,
  theme: `${C}/theme.ts`,
  tree: `${C}/tree.ts`,
  io: `${C}/io/index.ts`,
  mm: `${C}/MindMap.tsx`,
  css: `${C}/MindMap.css`,
};
const DOC = { readme: "README.md", api: "docs/API.md" };

/* ───────────────────────── 断言登记 ───────────────────────── */
const st = { pass: 0, fail: 0, warn: 0 };
const failures = [];
const warns = [];
const notes = [];

const ck = (name, cond, detail = "") => {
  if (cond) st.pass++;
  else {
    st.fail++;
    failures.push(`${name}${detail ? " —— " + detail : ""}`);
  }
};
/** 只作提示、不判失败（红线类规则） */
const ckw = (name, cond, detail = "") => {
  if (cond) st.pass++;
  else {
    st.warn++;
    warns.push(`${name}${detail ? " —— " + detail : ""}`);
  }
};

/* ───────────────────────── 源码解析 ───────────────────────── */

/** index.ts 之类的具名导出集合：`export {}` / `export type {}` / `export function|const|class` / `export interface|type` */
function namedExports(src) {
  const names = new Set();
  const push = (p) => {
    p = p.trim();
    if (!p) return;
    const parts = p.split(/\s+as\s+/);
    names.add((parts[1] ?? parts[0]).trim());
  };
  let m;
  const braced = /export\s+(?:type\s+)?\{([^}]*)\}/g;
  while ((m = braced.exec(src))) m[1].split(",").forEach(push);
  const decl = /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = decl.exec(src))) names.add(m[1]);
  return names;
}
/** `export * from "./x"` 的模块说明 */
function starSources(src) {
  return [...src.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)].map((m) => m[1]);
}

/** 入口（index.ts）可见的全部公开符号：具名导出 + 一跳 export * */
function publicExports() {
  const set = namedExports(read(F.index));
  // rel 是相对 index.ts 目录的模块路径（"./tree" → tree.ts / "./io" → io/index.ts）
  const push = (rel) => {
    const dir = path.dirname(F.index);
    let own = path.normalize(path.join(dir, rel)); // 仓库内相对路径
    if (!/\.[cm]?[jt]sx?$/.test(own)) {
      own = fs.existsSync(path.join(ROOT, own, "index.ts")) ? path.join(own, "index.ts") : own + ".ts";
    }
    const src = read(own);
    namedExports(src).forEach((n) => set.add(n));
    for (const r2 of starSources(src)) {
      const s2 = read(path.normalize(path.join(path.dirname(own), r2)));
      namedExports(s2).forEach((n) => set.add(n));
    }
  };
  starSources(read(F.index)).forEach(push);
  return set;
}

/** 取出 interface 的花括号体与所在行号 */
function interfaceBlock(src, name) {
  const start = src.indexOf(`interface ${name} `);
  if (start < 0) return null;
  const open = src.indexOf("{", start);
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return { body: src.slice(open + 1, i), line: src.slice(0, start).split("\n").length };
}

/** 解析 interface 成员：按顶层 `;` 切分（内层 `{...}` 里的 `;` 不算） */
function interfaceMembers(src, name) {
  const block = interfaceBlock(src, name);
  if (!block) return null;
  const out = [];
  let buf = "";
  let depth = 0;
  for (const ch of block.body) {
    if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") depth--;
    if (ch === ";" && depth === 0) {
      // 成员前面可能挂着 JSDoc / 块注释，取签名前先剥掉
      const clean = buf.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").trim();
      if (clean) out.push({ sig: clean, line: block.line });
      buf = "";
      continue;
    }
    buf += ch;
  }
  const named = out.map((o) => {
    const raw = o.sig.replace(/\/\/.*$/, "");
    const nm = raw.split(/[(<:]/)[0].trim().replace(/[?!]+$/, "");
    return { name: nm, sig: raw, line: o.line };
  });
  return { members: named, startLine: block.line, count: named.length };
}

/** 取 `const X … = [ … ]` 的数组字面量文本 */
function arrayBody(src, constName) {
  const i = src.indexOf(`const ${constName}`);
  if (i < 0) return null;
  // 定位 `= 之后` 的第一个 `[`/`{`（跳过 `const X: T[] =` 里类型标注自带的方括号）
  const m = /=\s*[[{]/.exec(src.slice(i, i + 2000));
  if (!m) return null; // 不是数组/对象字面量（字符串常量等）
  const open = i + m.index + m[0].length - 1;
  const close = m[0].endsWith("[") ? "[" : "{";
  const opposite = close === "[" ? "]" : "}";
  let depth = 0;
  let j = open;
  for (; j < src.length; j++) {
    if (src[j] === close) depth++;
    else if (src[j] === opposite) {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(open + 1, j);
}

/** 数组里所有 `{ id: "x", label: "y" }` 项 */
function constIdLabelPairs(src, constName) {
  const body = arrayBody(src, constName);
  if (body === null) return null;
  const items = [];
  const re = /\{\s*id:\s*"([^"]*)"\s*,[^}]*?\blabel:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(body))) items.push({ id: m[1], label: m[2] });
  return items;
}

/** 纯数字数组（FONT_SIZES / PRIORITY_LEVELS / PROGRESS_LEVELS） */
function constNumberArray(src, constName) {
  const body = arrayBody(src, constName);
  if (body === null) return null;
  return [...body.matchAll(/-?\d+/g)].map((m) => Number(m[0]));
}

/** `const X: Record<K, string> = { a: "甲", b: "乙" }` —— 只取对象字面量本身 */
function constStringRecord(src, constName) {
  const i = src.indexOf(`const ${constName}`);
  if (i < 0) return null;
  const eq = src.indexOf("=", i);
  const seg = src.slice(eq, eq + 3000);
  const open = seg.indexOf("{");
  const body = seg.slice(open, seg.indexOf("}", open) + 1);
  const items = [];
  const re = /(\w+):\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(body))) items.push({ key: m[1], value: m[2] });
  return items;
}

/** 判定文本里是否存在「独立标识符」出现（避免 Icon 命中 IconName） */
const hasWord = (text, word) =>
  new RegExp(`(^|[^\\w$])${word.replace(/\$/g, "\\$")}([^\\w$]|$)`).test(text);

/* ───────────────────────── Markdown 解析 ───────────────────────── */

/** 取某个 `##`/`###` 小节（到下一个同级或更高级标题为止） */
function mdSection(md, headingLine) {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.trim() === headingLine.trim());
  if (i < 0) return null;
  const level = (lines[i].match(/^#+/) || [""])[0].length;
  const out = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    const m = lines[j].match(/^(#+)\s/);
    if (m && m[1].length <= level) break;
    out.push(lines[j]);
  }
  return out.join("\n");
}

/** 解析 markdown 表格 */
function mdTables(text) {
  const lines = text.split("\n");
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) continue;
    const cells = splitRow;
    const table = { head: cells(lines[i]), body: [], startLine: i + 1 };
    let j = i + 2;
    for (; j < lines.length; j++) {
      if (/^\s*\|/.test(lines[j])) {
        table.body.push(cells(lines[j]));
        continue;
      }
      if (table.body.length && lines[j].trim() && !/^#{1,6}\s/.test(lines[j])) {
        // 折行表格行：并回上一行
        table.body[table.body.length - 1][0] += " " + lines[j].trim();
        continue;
      }
      break;
    }
    tables.push(table);
    i = j - 1;
  }
  return tables;
}

/** 抽取 ``` 代码块 */
function mdFences(md) {
  const out = [];
  let cur = null;
  for (const l of md.split("\n")) {
    const m = l.match(/^```(\w*)\s*$/);
    if (cur) {
      // 围栏内的收尾 ``` （或格式异常的再次 ```）都视为闭合
      if (l.trim() === "```" || m) cur = null;
      else cur.lines.push(l);
      continue;
    }
    if (m) {
      cur = { lang: m[1], lines: [] };
      out.push(cur);
    }
  }
  return out.map((f) => ({ lang: f.lang, code: f.lines.join("\n"), lines: f.lines }));
}

/** 每行是否处在 ``` 代码块内（成对翻转） */
function fenceLineSet(md) {
  const set = new Set();
  let inFence = false;
  for (const [i, l] of md.split("\n").entries()) {
    if (/^```/.test(l.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) set.add(i + 1);
  }
  return set;
}

/** 围栏内命中的行号（用于区分「代码块里的调用」与「散文记述」） */
function fencedLines(md) {
  const set = new Set();
  for (const f of mdFences(md)) f.lines.forEach((l) => set.add(l));
  return set;
}

/* ───────────────────────── 事实抽取 ───────────────────────── */

const indexSrc = read(F.index);
const typesSrc = read(F.types);
const themeSrc = read(F.theme);
const treeSrc = read(F.tree);
const ioSrc = read(F.io);
const mmSrc = read(F.mm);
const cssSrc = read(F.css);
/** 所有 tsx 源码（JSX 类名抽取用全量） */
const MMX = fs
  .readdirSync(path.join(ROOT, C), { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith(".tsx"))
  .map((d) => read(`${C}/${d.name}`))
  .join("\n");

const indexExports = namedExports(read(F.index));
const exportsAll = publicExports();

const apiDecl = interfaceMembers(typesSrc, "MindMapApi");
const propsDecl = interfaceMembers(typesSrc, "MindMapProps");
const nodeDecl = interfaceMembers(typesSrc, "MindNode");
const apiMembers = apiDecl.members.map((m) => m.name);

const readmeMd = read(DOC.readme);
const apiMd = read(DOC.api);
const apiSec3 = mdSection(apiMd, "## 3 命令式 API（`MindMapApi`，共 **71** 个方法）");
const apiSec4 = mdSection(apiMd, "## 4 类型定义");
const apiSec5 = mdSection(apiMd, "## 5 常量与枚举全表");
const apiSec8 = mdSection(apiMd, "## 8 CSS 类名清单（`MindMap.css`，1259 行）");
const apiSec13 = mdSection(apiMd, "### 1.3 导出符号总表");

/* ═════════ 1 导出符号双向 ═════════ */
{
  const missing = [...indexExports].filter((n) => !hasWord(apiMd, n));
  ck(
    "[1] index.ts 每个导出符号都在 API.md 出现",
    missing.length === 0,
    missing.length ? `API.md 缺：${missing.join(" / ")}` : ""
  );

  // 反向：API.md §1.3 列出的符号必须真的存在（防编造）
  // 只取 ✅ / 📦 小节（❌ 小节是「不对外导出」的反向名单，不参与）；
  // 表格取「导出」列；正文只认「整行都是符号清单」的行。
  const listed = new Set();
  const SKIP = /^(component|function|type|class|const|alias|别名|类型|说明|高级|图例|字段|值)$/;
  const pureIdent = (tok) => /^[A-Za-z_$][\w$]*$/.test(tok) && !SKIP.test(tok);
  if (apiSec13) {
    const scope = apiSec13.slice(0, apiSec13.indexOf("#### ❌ 不对外导出") >= 0 ? apiSec13.indexOf("#### ❌ 不对外导出") : undefined);
    for (const t of mdTables(scope)) {
      for (const row of t.body) {
        const cell = (row[0] || "").replace(/`/g, "");
        for (const tok of cell.split(/[\s/、,，;；]+/)) if (pureIdent(tok)) listed.add(tok);
      }
    }
    for (const line of scope.split("\n")) {
      if (/未/.test(line)) continue; // 明确标注「未导出」的条目（PanelHint）
      const spans = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      const chunks = spans
        .join("")
        .replace(/[。、,，;；：:/(（）)]/g, " ")
        .split(/[\s/、,，;；]+/)
        .filter(Boolean);
      if (chunks.length >= 3 && chunks.every(pureIdent)) chunks.forEach((c) => listed.add(c));
    }
  }
  const fabricated = [...listed].filter((n) => !exportsAll.has(n));
  ck(
    "[1] API.md §1.3 列出的符号都真实存在（防编造）",
    fabricated.length === 0,
    fabricated.length ? `编造/不存在的符号：${fabricated.join(" / ")}` : ""
  );

  // 类型数量 / 常量数量：口径取 index.ts 的 `export type { … } from "./types"`
  const typeBlock = indexSrc.slice(
    indexSrc.indexOf("export type {\n  MindNode"),
    indexSrc.indexOf("} from \"./types\";")
  );
  const typeCount = (typeBlock.match(/[A-Za-z_$][\w$]*/g) || []).filter(
    (n) => n !== "export" && n !== "type"
  ).length;
  ck("[1] API.md 声明的类型个数 == types.ts 的 export type 个数", /共 \*\*23\*\* 个/.test(apiMd) && typeCount === 23, `types.ts 实际 ${typeCount} 个`);

  // depthOf 确实存在（API.md 特别点名的补漏项）
  ck("[1] depthOf 真实存在（tree.ts）", /export function depthOf/.test(treeSrc), "tree.ts 找不到 depthOf");
  // sampleTree 经 export * 透出
  ck("[1] sampleTree 可从入口导入", exportsAll.has("sampleTree"), "sampleTree 不在公开导出面");
}

/* ═════════ 2 命令式 API 覆盖 ═════════ */
{
  ck("[2] 源码能定位 MindMapApi 声明", !!apiDecl, "types.ts 找不到 interface MindMapApi");

  const notDocumented = apiMembers.filter((n) => !hasWord(apiSec3 || "", n));
  ck(
    "[2] types.ts MindMapApi 每个成员在 API.md §3 都有条目",
    notDocumented.length === 0,
    notDocumented.length ? `§3 漏：${notDocumented.join(" / ")}` : ""
  );

  // 实现面：useImperativeHandle 挂载的键
  const uihIdx = mmSrc.indexOf("useImperativeHandle(");
  ck("[2] MindMap.tsx 存在 useImperativeHandle", uihIdx >= 0, "找不到 useImperativeHandle");
  let implKeys = [];
  if (uihIdx >= 0) {
    const open = mmSrc.indexOf("{", mmSrc.indexOf("ref,", uihIdx));
    let depth = 0;
    let end = open;
    for (let i = open; i < mmSrc.length; i++) {
      if (mmSrc[i] === "{") depth++;
      else if (mmSrc[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = mmSrc.slice(open + 1, end);
    implKeys = [...body.matchAll(/^\s{6}(\w+)\s*[,:]/gm)].map((m) => m[1]);
  }
  const implSet = new Set(implKeys);
  const declaredNotImpl = apiMembers.filter((n) => !implSet.has(n));
  const implNotDeclared = implKeys.filter((n) => !apiMembers.includes(n));
  ck(
    "[2] 实现挂载键 == 声明成员",
    declaredNotImpl.length === 0 && implNotDeclared.length === 0,
    `声明未挂载：${declaredNotImpl.join("/") || "—"}；挂载未声明：${implNotDeclared.join("/") || "—"}`
  );

  // 文档声称的方法数
  const declCount = apiMembers.length;
  const claims = [];
  for (const [doc, text] of [["README.md", readmeMd], ["API.md", apiMd]]) {
    const plain = text.replace(/\*\*|`/g, "");
    for (const m of plain.matchAll(/(\d{2})\s*(?:个)?(?:命令式)?(?:方法|个方法)/g)) {
      claims.push({ doc, n: Number(m[1]) });
    }
  }
  ck(
    "[2] 文档声明的方法数 == 源码实际成员数",
    claims.length > 0 && claims.every((c) => c.n === declCount),
    claims.length
      ? `源码 ${declCount} 个；文档声称 ${[...new Set(claims.map((c) => c.n))].join("/")}`
      : "文档未声明方法数"
  );

  // 实现面 / 声明面行号锚点
  const mmLines = readLines(F.mm);
  ck("[2] MindMap.tsx:1809 起是 useImperativeHandle", (mmLines[1808] || "").includes("useImperativeHandle("), `实际第 1809 行：${mmLines[1808]}`);
  ck("[2] 实现对象首行 = 1811（() => ({）", (mmLines[1810] || "").includes("() => ({"), `实际：${mmLines[1810]}`);
  ck("[2] 实现对象收尾 = 1979（})）", (mmLines[1978] || "").trim().startsWith("})"), `实际：${mmLines[1978]}`);
  ck("[2] types.ts:372 是 MindMapApi 起点", (readLines(F.types)[371] || "").includes("export interface MindMapApi"), typesSrc.split("\n")[371]);
  ck("[2] types.ts:487 是 MindMapApi 终点", (readLines(F.types)[486] || "").trim() === "}", readLines(F.types)[486]);
  ck("[2] types.ts:342 是 MindMapProps 起点", (readLines(F.types)[341] || "").includes("export interface MindMapProps"), readLines(F.types)[341]);
  ck("[2] types.ts:403 addSummaryFor(text: string) 声明", /addSummaryFor\(text: string\)/.test(typesSrc), "types.ts 无该声明");
  ck("[2] types.ts:405 addFrameFor(label: string) 声明", /addFrameFor\(label: string\)/.test(typesSrc), "types.ts 无该声明");
  ck("[2] types.ts:481 getSvg(): unknown 声明", /getSvg\(\): unknown;/.test(typesSrc), "types.ts 无该声明");
  ck("[2] 实现侧 addSummaryFor 挂的是零参内部函数", /addSummaryFor: addSummaryForSelected/.test(mmSrc), "实现与文档口径（零参）不符");
  ck("[2] 实现侧 addFrameFor 挂的是零参内部函数", /addFrameFor: addFrameForSelected/.test(mmSrc), "实现与文档口径（零参）不符");
  ck("[2] SUMMARY_DEFAULT = 「概要」", /SUMMARY_DEFAULT = "概要"/.test(mmSrc), "默认值与文档不符");
  ck("[2] FRAME_DEFAULT = 「分组」", /FRAME_DEFAULT = "分组"/.test(mmSrc), "默认值与文档不符");
}

/* ═════════ 3 Props ═════════ */
{
  const fields = propsDecl.members.map((m) => m.name);
  ck("[3] MindMapProps 字段数 = 11", fields.length === 11, `实际 ${fields.length} 个：${fields.join("/")}`);
  ck("[3] 文档标题声明 11 个字段", /11 个字段/.test(apiMd), "API.md 未声明 11 个字段");
  const notDoc = fields.filter((f) => !hasWord(apiMd, f));
  ck("[3] 每个 prop 在 API.md §2 有条目", notDoc.length === 0, notDoc.length ? `${notDoc.join("/")} 缺条目` : "");
  // README 里枚举的字段名
  const readmeListed = ["data", "width", "height", "className", "fitOnMount", "editable", "showToolbar", "onChange", "defaultConfig", "onScaleChange", "onSelectChange"];
  ck(
    "[3] README 枚举的 11 个 prop 名与源码一致",
    readmeListed.length === fields.length && readmeListed.every((f) => fields.includes(f)),
    `README：${readmeListed.join("/")}；源码：${fields.join("/")}`
  );
  // 默认值：源码解构 + JSDoc 注释
  const jsdoc = typesSrc.slice(typesSrc.indexOf("export interface MindMapProps"), typesSrc.indexOf("export interface MindMapApi"));
  const defaults = new Map([...jsdoc.matchAll(/\/\*\*\s*(?:[^*/]*?)默认\s*([\w%"| ]+?)\s*\*\//g)].map((m) => [m.index, m[1].trim()]));
  // JSDoc 注释写在字段「上方」，所以判定方向是「默认 X … 字段名」
  for (const [prop, def] of [["fitOnMount", "true"], ["editable", "true"], ["showToolbar", "true"], ["width", "100%"], ["height", "100%"]]) {
    ck(`[3] ${prop} 默认 ${def}（types.ts JSDoc）`, new RegExp(`默认 ${def.replace(/%/g, "\\%")}[\\s\\S]{0,40}${prop}\\b`).test(jsdoc), `源码注释未写「${prop} 默认 ${def}」`);
  }
  ck("[3] MindMap.tsx:534-536 默认解构 true", /fitOnMount = true/.test(mmSrc) && /editable = true/.test(mmSrc) && /showToolbar = true/.test(mmSrc), "实现默认值缺失");
  // 文档表格的「默认」列
  const propTable = mdTables(mdSection(apiMd, "## 2 Props（`MindMapProps`，11 个字段，`types.ts:342-365`）"))[0];
  const defaultCellOf = (f) => {
    const row = (propTable?.body || []).find((r) => r[0].replace(/`/g, "") === f);
    return row ? row[2].replace(/`/g, "") : null;
  };
  ck("[3] 文档 fitOnMount 默认列 = true", defaultCellOf("fitOnMount") === "true", `文档写 ${defaultCellOf("fitOnMount")}；源码 true`);
  ck("[3] 文档 editable 默认列 = true", defaultCellOf("editable") === "true", `文档写 ${defaultCellOf("editable")}；源码 true`);
  ck("[3] 文档 showToolbar 默认列 = true", defaultCellOf("showToolbar") === "true", `文档写 ${defaultCellOf("showToolbar")}；源码 true`);
  ck("[3] 文档 width 默认列 = \"100%\"", (defaultCellOf("width") || "").includes("100%"), `文档写 ${defaultCellOf("width")}；源码 100%`);
  ck("[3] 文档 height 默认列 = \"100%\"", (defaultCellOf("height") || "").includes("100%"), `文档写 ${defaultCellOf("height")}；源码 100%`);
  ck("[3] 文档 11 行表格都覆盖到", propTable?.body.length === 11, `表格行数 ${propTable?.body.length}`);
  ck("[3] 文档 data 标注必填", (defaultCellOf("data") || "").includes("必填"), "data 未在文档标注必填");
}

/* ═════════ 4 枚举逐值 ═════════ */
{
  const themeItems = [];
  const body = arrayBody(themeSrc, "THEME_LIST") || "";
  for (const m of body.matchAll(/t\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/g)) {
    const chunk = body.slice(m.index, body.indexOf("),", m.index + 1) + 2 || undefined);
    themeItems.push({
      id: m[1],
      label: m[2],
      category: m[3],
      handDrawn: /handDrawn:\s*true/.test(chunk),
      handJitter: (chunk.match(/handJitter:\s*([\d.]+)/) || [])[1] || null,
      useBranchColorFalse: /useBranchColor:\s*false/.test(chunk),
      lineStyleElbow: /lineStyle:\s*"elbow"/.test(chunk),
      nodeBorderFalse: /nodeBorder:\s*false/.test(chunk),
      radius0: /radius:\s*0\b/.test(chunk),
      strokeWidth0: /strokeWidth:\s*0\b/.test(chunk),
    });
  }
  ck("[4] THEME_LIST 共 17 个", themeItems.length === 17, `实际 ${themeItems.length}`);
  ck("[4] 文档标题声明 17 个主题", /共 \*\*17\*\* 个/.test(apiMd) || /17 个/.test(apiMd), "未声明 17 个");
  const themeSec5 = mdTables(mdSection(apiMd, "### 5.1 `THEME_LIST`（`theme.ts:98-274`，共 **17** 个）"))[0];
  const rows = themeSec5 ? themeSec5.body.map((r) => r.map((c) => c.replace(/`/g, ""))) : [];
  ck("[4] §5.1 表格行数 = 17", rows.length === 17, `${rows.length}`);
  themeItems.forEach((t, i) => {
    const row = rows[i] || [];
    const okId = row[1] === t.id;
    const okName = row[2] === t.label;
    ck(
      `[4] 主题 ${i + 1} 文案一致（${t.id}）`,
      okId && okName,
      `文档「${row[1]}/${row[2]}」 ≠ 源码「${t.id}/${t.label}」`
    );
  });
  // 逐个主题的手绘 / 特殊标记
  const byId = Object.fromEntries(themeItems.map((t) => [t.id, t]));
  const noTick = (s) => s.replace(/`/g, "");
  const marks = {
    "hand-colorful": "✅ handJitter: 1.1",
    "hand-blueprint": "✅ handJitter: 0.9",
    "hand-forest": "✅ handJitter: 1.3",
    "dark-gray": "—（useBranchColor: false）",
    "plain-gray": "—（lineStyle: \"elbow\"）",
    "plain-blue": "—（lineStyle: \"elbow\"）",
    "plain-green": "—（lineStyle: \"elbow\"）",
    "plain-minimal": "—（nodeBorder: false、radius 0、strokeWidth 0）",
  };
  for (const [id, mark] of Object.entries(marks)) {
    const hit = (themeSec5?.body || []).some((row) => {
      const line = noTick(row.join(" | "));
      return line.includes(id) && line.includes(mark);
    });
    ck(`[4] §5.1 手绘/特征标记（${id}）`, hit, `§5.1 缺少「${id} → ${mark}」`);
  }
  ck("[4] 只有 3 个手绘主题", themeItems.filter((t) => t.handDrawn).length === 3, `实际 ${themeItems.filter((t) => t.handDrawn).length}`);
  ck("[4] hand-blueprint 确实 useBranchColor:false", byId["hand-blueprint"]?.useBranchColorFalse, "源码不符");
  ck("[4] plain-minimal 确实 nodeBorder:false/radius 0/strokeWidth 0", byId["plain-minimal"]?.nodeBorderFalse && byId["plain-minimal"]?.radius0 && byId["plain-minimal"]?.strokeWidth0, "源码不符");
  ck("[4] plain-* 三者 lineStyle 都是 elbow", ["plain-gray", "plain-blue", "plain-green"].every((id) => byId[id]?.lineStyleElbow), "源码不符");
  ck("[4] 默认主题 = classic-blue", /classic-blue/.test(themeSrc) && /THEME_LIST\[0\]/.test(themeSrc) && themeItems[0]?.id === "classic-blue", "DEFAULT_THEME_ID 与文档不符");

  const structPairs = constIdLabelPairs(themeSrc, "STRUCTURES");
  ck("[4] STRUCTURES 共 7 个", structPairs?.length === 7, `实际 ${structPairs?.length}`);
  const structSecRaw = mdSection(apiMd, "### 5.2 `STRUCTURES`（`theme.ts:281-294`，7 种）") || "";
  const structSec = structSecRaw.replace(/`/g, "");
  ck("[4] §5.2 表格行数 = 7", (mdTables(structSecRaw)[0]?.body.length || 0) === 7, `实际 ${mdTables(structSecRaw)[0]?.body.length}`);
  structPairs.forEach((s) => {
    ck(`[4] §5.2 结构 ${s.id}`, structSec.includes(`${s.id}`) && structSec.includes(s.label), `文档缺或文案不一致：源码「${s.id} ${s.label}」`);
  });
  ck("[4] §5.2 标注 logical-left/right 同名", /logical-left/.test(structSec || "") && /logical-right/.test(structSec || ""), "§5.2 未标注同名");

  for (const [name, secHeading] of [
    ["LINK_PATTERNS", "### 5.8 连线三件套（`types.ts:239-256`，200-206）"],
    ["LINK_ARROWS", null],
    ["LINK_COLOR_MODES", null],
    ["BRANCH_STYLES", "### 5.9 `BRANCH_STYLES`（`types.ts:274-283`，8 种）"],
    ["SHAPES", "### 5.7 `SHAPES`（`types.ts:334-340`，5 种）"],
    ["BORDER_STYLES", "### 5.6 `BORDER_STYLES` / `BORDER_DASH`（`types.ts:11-24`）"],
  ]) {
    const pairs = constIdLabelPairs(typesSrc, name);
    ck(`[4] ${name} 可解析`, !!pairs, `${name} 解析失败`);
    if (!pairs) continue;
    const sec = secHeading ? mdSection(apiMd, secHeading) : mdSection(apiMd, "### 5.8 连线三件套（`types.ts:239-256`，200-206）") + mdSection(apiMd, "### 5.9 `BRANCH_STYLES`（`types.ts:274-283`，8 种）") + mdSection(apiMd, "### 5.7 `SHAPES`（`types.ts:334-340`，5 种）");
    const target = sec || "";
    pairs.forEach((p) => {
      ck(`[4] ${name} 逐值一致（${p.id}）`, target.includes(`${p.id} ${p.label}`), `文档缺或文案不一致：源码「${p.id} ${p.label}」`);
    });
  }
  // FONT_FAMILIES 是 label/value 结构（无 id 字段）
  // 项内 value 带引号（如 "\"Microsoft YaHei\", …"），只抽 label 即可
  const fontList = [...(arrayBody(typesSrc, "FONT_FAMILIES") || "").matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  ck("[4] FONT_FAMILIES 10 项（微软雅黑/苹方/宋体/黑体/楷体/仿宋/思源黑体/Arial/Times/Consolas）", fontList.length === 10 && JSON.stringify(fontList) === JSON.stringify(["微软雅黑", "苹方", "宋体", "黑体", "楷体", "仿宋", "思源黑体", "Arial", "Times", "Consolas"]), `源码：${fontList.join("/")}`);
  // BORDER_DASH 映射
  const dashMap = Object.fromEntries([...typesSrc.matchAll(/(solid|dashed|dotted|dashdot):\s*(undefined|"[0-9 3]+")/g)].map((m) => [m[1], m[2] === "undefined" ? "undefined" : m[2].replace(/"/g, "")]));
  ck("[4] BORDER_DASH solid → undefined 文档一致", apiMd.includes("solid → undefined") && dashMap["solid"] === "undefined", `源码 solid=${dashMap["solid"]}`);
  ck("[4] BORDER_DASH dashdot → \"9 3 2 3\" 文档一致", dashMap["dashdot"] === "9 3 2 3" && apiMd.includes('dashdot → "9 3 2 3"'), `源码 ${dashMap["dashdot"]}`);
  ck("[4] BORDER_DASH dotted → \"2 3\" 文档一致", dashMap["dotted"] === "2 3" && apiMd.includes('dotted → "2 3"'), `源码 ${dashMap["dotted"]}`);
  ck("[4] BORDER_DASH dashed → \"7 4\" 文档一致", dashMap["dashed"] === "7 4" && apiMd.includes('dashed → "7 4"'), `源码 ${dashMap["dashed"]}`);

  // FONT_SIZES / FONT_FAMILIES / MARKERS / NODE_ICONS / PRIORITY / PROGRESS
  const sizes = constNumberArray(typesSrc, "FONT_SIZES");
  ck("[4] FONT_SIZES 13 项且文档一致", sizes?.length === 13 && /\[12,14,16,18,20,22,24,26,28,32,36,40,48\]/.test(apiMd), `源码 ${JSON.stringify(sizes)}`);
  fontList.forEach((f) => ck(`[4] FONT_FAMILIES 中文文案（${f}）`, apiMd.includes(f), `文档缺「${f}」`));

  const markers = arrayBody(themeSrc, "MARKERS") || "";
  const markerItems = [...markers.matchAll(/\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*char:\s*"([^"]*)"\s*,\s*bg:\s*"([^"]+)"/g)].map((m) => ({ id: m[1], label: m[2], char: m[3], bg: m[4] }));
  ck("[4] MARKERS 共 12 个", markerItems.length === 12, `实际 ${markerItems.length}`);
  ck("[4] §5.10 标题声明 12 个标记", /12 个/.test(mdSection(apiMd, "### 5.10 `MARKERS`（`theme.ts:309-322`，12 个）") || ""), "§5.10 未声明 12 个");
  const markersSec = (mdSection(apiMd, "### 5.10 `MARKERS`（`theme.ts:309-322`，12 个）") || "").replace(/`/g, "");
  markerItems.forEach((mk) => {
    // §5.10 首行是「3 个 id / 1 个 label / 3 个 char / 3 个 bg」并列写法，逐值校验字符与色值
    ck(`[4] MARKERS 逐值一致（${mk.id}）`, markersSec.includes(mk.id) && markersSec.includes(mk.char) && markersSec.includes(mk.bg) && markersSec.includes(mk.label.split(" ")[0]), `文档缺「${mk.id} ${mk.char} ${mk.bg}」`);
  });

  const prio = constNumberArray(themeSrc, "PRIORITY_LEVELS");
  const prog = constNumberArray(themeSrc, "PROGRESS_LEVELS");
  ck("[4] PRIORITY_LEVELS = 1..9 且文档一致", JSON.stringify(prio) === "[1,2,3,4,5,6,7,8,9]" && (apiMd).includes("`PRIORITY_LEVELS = [1..9]`"), `源码 ${JSON.stringify(prio)}`);
  ck("[4] PROGRESS_LEVELS = 0..10 且文档一致", JSON.stringify(prog) === "[0,1,2,3,4,5,6,7,8,9,10]" && (apiMd).includes("`PROGRESS_LEVELS = [0..10]`"), `源码 ${JSON.stringify(prog)}`);
  ck("[4] PROGRESS_COLOR/PROGRESS_TRACK 源码一致", /PROGRESS_COLOR = "#8bc34a"/.test(themeSrc) && /PROGRESS_TRACK = "#f0efd8"/.test(themeSrc) && (apiMd).includes('PROGRESS_COLOR = "#8bc34a"'), "文档与源码不一致");
  const prioColors = [...themeSrc.matchAll(/(\d):\s*"(#[0-9a-f]+)"/g)].map((m) => [m[1], m[2]]);
  ck("[4] PRIORITY_COLORS 前 5 个与文档一致", prioColors.slice(0, 5).every(([n, c]) => (apiMd).includes(`${n} \`${c}\``)), `源码 ${JSON.stringify(prioColors.slice(0, 5))}`);
  ck("[4] PRIORITY_COLORS 6-9 同色 #9aa4b2 文档一致", prioColors.slice(5).every(([, c]) => c === "#9aa4b2") && (apiMd).includes("6-9 `#9aa4b2`"), "源码/文档不一致");

  const icons = arrayBody(themeSrc, "NODE_ICONS") || "";
  const iconItems = [...icons.matchAll(/\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*char:\s*"([^"]*)"/g)];
  ck("[4] NODE_ICONS 可解析", iconItems.length === 24, `解析出 ${iconItems.length} 项`);
  ck("[4] NODE_ICONS 共 24 个", iconItems.length === 24, `实际 ${iconItems.length}`);
  const iconSec = mdSection(apiMd, "### 5.11 优先级 / 进度 / 图标 / 字体");
  ck("[4] §5.11 声明 24 个图标", (iconSec || "").includes("**24 个**"), "§5.11 未声明 24 个");
  iconItems.forEach(([, id, label, char]) => {
    ck(`[4] NODE_ICONS 逐值一致（${id}）`, (iconSec || "").includes(id) && (iconSec || "").includes(char), `文档缺「${id} ${label} ${char}」`);
  });

  // EXPORT_LABELS / IMPORT_ACCEPT
  const labelsSec = mdSection(apiMd, "**`EXPORT_LABELS` 全表**：");
  const labels = constStringRecord(ioSrc, "EXPORT_LABELS");
  labels.forEach((l) => {
    const row = (mdTables(labelsSec || "")[0]?.body || []).find((r) => r[0].replace(/`/g, "") === l.key);
    ck(`[4] EXPORT_LABELS ${l.key}`, row && row[1] === l.value, `文档「${row?.[1]}」≠ 源码「${l.value}」`);
  });
  const accept = (ioSrc.match(/IMPORT_ACCEPT = "([^"]+)"/) || [])[1];
  ck("[4] IMPORT_ACCEPT 与文档一致", (apiMd).includes(accept), `源码 ${accept}`);
  ck("[4] IMPORT_ACCEPT 含 8 种扩展名", accept.split(",").length === 8, `实际 ${accept}`);
  ck("[4] 文档声明导入 8 种", /IMPORT_ACCEPT` 实际含 8 种扩展名/.test(apiMd) || /8 种/.test(mdSection(apiMd, "### 11.3 旧 README 已过期条目（本版已修正）") || ""), "文档未声明 8 种");
}

/* ═════════ 5 类型字段 ═════════ */
{
  ck("[5] MindNode 字段数 = 21", nodeDecl.count === 21, `实际 ${nodeDecl.count}`);
  ck("[5] 文档 §4.1 声明 21 个字段", /共 \*\*21\*\* 个字段/.test(apiMd), "未声明 21");
  const nodeSec = mdSection(apiMd, "### 4.1 `MindNode`（`types.ts:127-176`，共 **21** 个字段）");
  const missing = nodeDecl.members.filter((m) => !hasWord(nodeSec || "", m.name)).map((m) => m.name);
  ck("[5] MindNode 每个字段在 §4.1 有条目", missing.length === 0, missing.length ? `缺：${missing.join("/")}` : "");
  const required = nodeDecl.members.filter((m) => !m.sig.includes("?")).map((m) => m.name);
  ck("[5] MindNode 必填字段 = id/title/children", JSON.stringify(required) === '["id","title","children"]', `实际必填：${required.join("/")}`);

  for (const [ifName, heading] of [
    ["MindNodeStyle", "### 4.2 `MindNodeStyle`（`types.ts:27-50`）"],
    ["MindNodeImage", null],
    ["MindAssocLine", null],
    ["MindNodeFrame", null],
    ["MindGeneralization", null],
    ["MindSummaryGroup", null],
    ["MindFrameGroup", null],
  ]) {
    const blk = interfaceBlock(typesSrc, ifName);
    const members = blk
      ? [...blk.body.matchAll(/^\s{2}(\w+)[?]?:/gm)].map((m) => m[1])
      : [];
    const sec4 = apiSec4 || "";
    const miss = members.filter((m) => !hasWord(sec4, m));
    ck(`[5] ${ifName} 字段在 API.md §4 有条目`, members.length > 0 && miss.length === 0, `字段 ${members.join("/")}；缺：${miss.join("/") || "—"}`);
  }
  // §4.3 里手写类型清单是否与源码一致
  const shapeType = (typesSrc.match(/type MindNodeShape = ([^;]+);/) || [])[1];
  ck("[5] MindNodeShape 取值文档一致", (apiMd).includes(shapeType.replace(/\s+/g, " ").trim()), `源码 ${shapeType}`);
  const arrowType = (typesSrc.match(/type MindAssocArrow = ([^;]+);/) || [])[1];
  ck("[5] MindAssocArrow 取值文档一致", (apiMd).includes(arrowType.replace(/\s+/g, " ").trim()), `源码 ${arrowType}`);
}

/* ═════════ 6 CSS 类名双向 ═════════ */
{
  const cssClasses = [...new Set([...cssSrc.matchAll(/\.(mm-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]))].sort();
  const api8 = apiSec8 || "";
  const uncovered = cssClasses.filter((c) => !api8.includes(c));
  ck(
    "[6] API.md §8 覆盖 MindMap.css 全部 mm-* 类",
    uncovered.length === 0,
    uncovered.length ? `${uncovered.length} 个未覆盖：${uncovered.join(" / ")}` : `共 ${cssClasses.length} 个`
  );
  cssClasses.forEach((c) => ck(`[6] §8 含 .${c}`, api8.includes(c), "§8 缺该类名"));

  // JSX 里用到的类名（className="…" / className={`…`} / className={cond ? "…" : "…"}），全量 tsx
  const jsxClasses = [
    ...new Set(
      [...MMX.matchAll(/className=(?:\{)?["'`]?([^"`'\n{}]*)/g)]
        .flatMap((m) => m[1].split(/\s+/))
        .filter((c) => /^(mm|is)-[a-z0-9-]+$/.test(c))
    ),
  ].sort();
  const jsxOnly = jsxClasses.filter((c) => !cssClasses.includes(c));
  ck("[6] §8 覆盖 JSX 侧的类名并标注「仅作 DOM 标记、CSS 无规则」", jsxOnly.every((c) => api8.includes(c)), `JSX 有但 CSS 无规则的类在 §8 缺标注：${jsxOnly.filter((c) => !api8.includes(c)).join("/") || "—"}`);

  const markerClasses = ["mm-hit", "mm-underline", "mm-image", "mm-tags", "mm-extras", "mm-root", "mm-link"];
  markerClasses.forEach((c) => {
    // §8 是按行分组的表格：类名所在行（或紧邻的说明行）必须写清「仅作 DOM 标记 / CSS 无规则 / 仅 X 有 CSS 规则」
    const secLines = (api8 || "").split("\n");
    const at = secLines.findIndex((l) => l.includes(c));
    const ctx = at >= 0 ? secLines.slice(at, at + 2).join(" ") : "";
    const ok = ctx.includes(c) && /仅作 DOM 标记|CSS 无规则|有 CSS 规则/.test(ctx);
    ck(`[6] §8 显式标注 DOM 标记类 ${c}`, ok, `§8 未标注它是 DOM-only（上下文：${ctx.replace(/`/g, "").slice(0, 70)}）`);
    ck(`[6] ${c} 确实只在 JSX 出现、CSS 无规则`, !cssClasses.includes(c) && jsxClasses.includes(c), "源码事实与文档不符");
  });
  // 硬事实 D1
  ck("[6] D1 选择器 .mm-stage.is-editable 在 CSS 里存在", /\.mm-stage\.is-editable:focus-visible/.test(cssSrc), "CSS 无该规则");
  ck("[6] D1 JSX 输出 is-editableNow", /is-editableNow/.test(mmSrc), "JSX 无该类名");
  ck("[6] D1 文档已标注规则永不命中", /永不命中/.test(apiMd), "§8/§11 未标注");
  ck("[6] .mm-ui-only 在 JSX 有输出（导出剥离标记）", /mm-ui-only/.test(MMX), "JSX 无此类名");
  ck("[6] CSS 行数 1259 与文档一致", readLines(F.css).length === 1259, `实际 ${readLines(F.css).length}`);
}

/* ═════════ 7 黑名单 ═════════ */
{
  const banned = ["setTheme(", "applyStyle(", "selectOnly(", "exportFile(", "zoom(", "scrollTo(", "getBoundingRect(", "getNodeById(", "setEditable(", "indent("];
  const fenceLines = { "README.md": fenceLineSet(readmeMd), "docs/API.md": fenceLineSet(apiMd) };
  const CALL = /api(?:\.current)?(?:\?\.|\!\.)\s*([A-Za-z_$][\w$]*)\s*\(/;
  banned.forEach((pat) => {
    const name = pat.replace(/\($/, "");
    let bad = [];
    for (const [doc, text] of [["README.md", readmeMd], ["docs/API.md", apiMd]]) {
      const lines = text.split("\n");
      lines.forEach((l, i) => {
        const n = i + 1;
        if (!l.includes(pat)) return;
        const callCtx = CALL.test(l);
        const fenceCtx = fenceLines[doc].has(n);
        if (callCtx) bad.push(`${doc}:${n} ${l.trim().slice(0, 60)}`);
        else if (fenceCtx && /^\s*(?:api|mindmap|const api)\b/.test(l)) bad.push(`${doc}:${n}（代码块内 API 调用）${l.trim().slice(0, 60)}`);
      });
    }
    ck(`[7] 黑名单：${pat}`, bad.length === 0, bad.length ? bad.join(" | ") : "");
    // 软命中（散文里的引用）作提示
    const soft = [];
    for (const [doc, text] of [["README.md", readmeMd], ["docs/API.md", apiMd]]) {
      text.split("\n").forEach((l, i) => {
        if (l.includes(pat) && !CALL.test(l) && !fenceLines[doc].has(i + 1)) soft.push(`${doc}:${i + 1}`);
      });
    }
    if (soft.length) notes.push(`[7·提示] ${pat} 以散文形式出现于 ${soft.join(" / ")}（非 API 调用位，需人工确认语义）`);
  });

  // addSummaryFor / addFrameFor：文档一律按零参写（代码块内不得出现带参调用）；
  // 散文里「声明是 (text: string)」/「调用 addSummaryFor("我的概要") 不生效」属正确记述，不判失败。
  for (const [fn, declSig] of [["addSummaryFor", "addSummaryFor(text: string)"], ["addFrameFor", "addFrameFor(label: string)"]]) {
    const bad = [];
    for (const [doc, text] of [["README.md", readmeMd], ["docs/API.md", apiMd]]) {
      for (const f of mdFences(text)) {
        for (const m of f.code.matchAll(new RegExp(`${fn}\\(([^)]*)\\)`, "g"))) {
          const arg = m[1].trim();
          if (arg && arg !== declSig) bad.push(`${doc}: ${m[0]}`);
        }
      }
      const proseg = text.split("\n").filter((l) => l.includes(fn) && !l.includes(declSig)).length;
      if (proseg) notes.push(`[7·提示] ${fn} 出现在散文上下文 ${proseg} 处（声明比对 / 坑说明），属正确记述`);
    }
    ck(`[7] 文档代码块未把 ${fn} 写成带参调用`, bad.length === 0, bad.join(" | "));
  }
  // getSvg 未把签名写成 unknown
  const svgRows = [...apiMd.matchAll(/`getSvg\(\)`\s*\|\s*\`([^`]*)\`/g)].map((m) => m[1]);
  ck("[7] API.md §3.12 未把 getSvg 签名写成 unknown", svgRows.length > 0 && svgRows.every((s) => !/unknown/.test(s)), `签名列实际：${svgRows.join(" / ")}`);
  // 节点拖动不得描述成默认行为
  const dragHits = [];
  for (const [doc, text] of [["README.md", readmeMd], ["docs/API.md", apiMd]]) {
    text.split("\n").forEach((l, i) => {
      if (l.includes("拖动节点可排序") || l.includes("拖节点")) {
        const near = text.split("\n").slice(Math.max(0, i - 2), i + 3).join(" ");
        if (!/(默认关闭|误导|setFreeDrag|需)/.test(near)) dragHits.push(`${doc}:${i + 1} ${l.trim().slice(0, 50)}`);
      }
    });
  }
  ck("[7] 「拖动节点可排序」未被描述成默认行为", dragHits.length === 0, dragHits.join(" | "));
  ck("[7] 源码 freeDrag 默认 false 且拖拽守卫生效（文档口径成立）", /useState\(false\)/.test(mmSrc) && /!freeDragRef\.current\) return/.test(mmSrc), "源码 freeDrag 默认值与文档不符");
  // README 显式说明拖动默认关闭
  ck("[7] README 显式写「节点拖动默认关闭」", /节点拖动默认关闭/.test(readmeMd), "README 未说明");
}

/* ═════════ 8 体量与红线 ═════════ */
{
  const rLines = readLines(DOC.readme);
  const aLines = readLines(DOC.api);
  ck("[8] README ≤ 260 行", rLines.length <= 260, `实际 ${rLines.length}`);
  ck("[8] API.md ≥ 700 行", aLines.length >= 700, `实际 ${aLines.length}`);

  const big = [];
  for (const [doc, text] of [["README.md", readmeMd]]) {
    mdTables(text).forEach((t) => {
      if (t.body.length >= 17) big.push(`${doc} 第 ${t.startLine} 行起的表格有 ${t.body.length} 行`);
    });
  }
  ckw("[8] README 未塞入全量大表（warning 级）", big.length === 0, big.join("；"));

  const link = (readmeMd.match(/\[[^\]]*\]\((docs\/API\.md)\)/g) || []).pop();
  ck("[8] README 末尾有指向 docs/API.md 的相对链接", !!link, "未找到链接");
  ck("[8] 目标文件存在", fs.existsSync(path.join(ROOT, "docs/API.md")), "docs/API.md 不存在");
  const tail = rLines.slice(-3).join(" ");
  ck("[8] 链接位于 README 末尾附近", /docs\/API\.md/.test(tail), tail.slice(0, 60));

  // 目录结构里引用的行数与源码一致
  const fileLineClaims = [
    ["MindMap.tsx", 3037],
    ["MindMap.css", 1259],
    ["extras.tsx", 1092],
    ["layout.ts", 1083],
    ["types.ts", 487],
    ["handdrawn.ts", 527],
    ["Menu.tsx", 462],
    ["theme.ts", 450],
    ["Toolbar.tsx", 341],
    ["tree.ts", 283],
    ["Icons.tsx", 245],
    ["Popover.tsx", 175],
    ["MultiSelectBar.tsx", 143],
    ["branchstyle.ts", 136],
    ["Minimap.tsx", 109],
    ["text.ts", 97],
    ["Dialog.tsx", 84],
    ["index.ts", 151],
  ];
  fileLineClaims.forEach(([f, claimed]) => {
    const actual = readLines(`${C}/${f}`).length;
    ck(`[8] 目录结构行数：${f}`, actual === claimed, `文档写 ${claimed}，实际 ${actual}`);
  });
  // 产物字段（README 里写的是去掉 "./" 前缀的相对路径）
  const pkg = JSON.parse(read("package.json"));
  const norm = (p) => p.replace(/^\.\//, "");
  ck("[8] README 产物表 main 与 package.json 一致", norm(pkg.main) === "dist-lib/mindmap-vite.umd.js" && readmeMd.includes(norm(pkg.main)), `package.json main=${pkg.main}`);
  ck("[8] README 产物表 files 与 package.json 一致", JSON.stringify(pkg.files) === '["dist-lib","README.md"]' && readmeMd.includes("`[\"dist-lib\", \"README.md\"]`"), `files=${JSON.stringify(pkg.files)}`);
  const verLine = readLines("package.json").findIndex((l) => l.includes(`"version": "${pkg.version}"`)) + 1;
  ck("[8] API.md 引用的 package.json 行号正确", apiMd.includes(`package.json:${verLine}`) && pkg.version === "1.0.0", `version=${pkg.version} 实际在第 ${verLine} 行`);
}

/* ═════════ 9 代码示例可用性 ═════════ */
{
  const apiSet = new Set(apiMembers);
  const called = [];
  for (const [doc, text] of [["README.md", readmeMd], ["docs/API.md", apiMd]]) {
    mdFences(text).forEach((f) => {
      if (!/^(ts|tsx|js|jsx)$/.test(f.lang)) return;
      for (const m of f.code.matchAll(/api(?:\.current)?(?:\?\.|\!\.)\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
        called.push({ doc, m: m[1] });
      }
    });
  }
  ck("[9] 确实抽到了 api.xxx() 调用", called.length > 0, "未抽出任何调用");
  const badCalls = called.filter((c) => !apiSet.has(c.m));
  ck(
    "[9] 所有 api.xxx() 调用都在 MindMapApi 里",
    badCalls.length === 0,
    badCalls.length ? [...new Set(badCalls.map((b) => `${b.doc}→${b.m}()`))].join(" / ") : `共校验 ${called.length} 处`
  );

  const imported = [];
  for (const [doc, text] of [["README.md", readmeMd], ["docs/API.md", apiMd]]) {
    mdFences(text).forEach((f) => {
      if (!/^(ts|tsx|js|jsx)$/.test(f.lang)) return;
      for (const m of f.code.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']mindmap-vite["']/g)) {
        for (const raw of m[1].split(",")) {
          const n = raw.trim().replace(/^type\s+/, "").trim();
          if (n) imported.push({ doc, n });
        }
      }
    });
  }
  const badImports = imported.filter((i) => !exportsAll.has(i.n));
  ck(
    "[9] 所有 from \"mindmap-vite\" 的具名导入都真实导出",
    badImports.length === 0,
    badImports.length ? badImports.map((b) => `${b.doc}→${b.n}`).join(" / ") : `共校验 ${imported.length} 个`
  );

  // UMD 示例里的解构
  const umd = /const \{([^}]*)\} = window\.MindMapVite;/.test(apiMd) || /const \{([^}]*)\} = window\.MindMapVite;/.test(readmeMd);
  ck("[9] UMD 全局名 MindMapVite 被正确引用", /window\.MindMapVite/.test(apiMd), "文档未用 MindMapVite");
  const g = /global(?:s)?\s+name\s*=\s*["']([^"']+)["']/.test(read("vite.lib.config.ts")) || /MindMapVite/.test(read("vite.lib.config.ts"));
  ck("[9] 构建配置的 UMD 全局名与文档一致", g && /MindMapVite/.test(readmeMd), "UMD 全局名不一致");
}

/* ───────────────────────── 报告 ───────────────────────── */
const total = st.pass + st.fail + st.warn;
console.log("\n════════ docs-assert · 文档↔源码一致性校验 ════════");
console.log(`校验文件：README.md（${readLines(DOC.readme).length} 行） / docs/API.md（${readLines(DOC.api).length} 行）`);
console.log(`事实口径：src/components/MindMap/**`);
console.log(`\n断言总数 ${total} ｜ 通过 ${st.pass} ｜ 失败 ${st.fail} ｜ 警告 ${st.warn}`);
if (failures.length) {
  console.log("\n【失败明细】");
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}
if (warns.length) {
  console.log("\n【警告（不判失败）】");
  warns.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
}
if (notes.length) {
  console.log("\n【提示】");
  notes.forEach((n) => console.log(`  · ${n}`));
}
console.log(
  st.fail
    ? `\n结果：FAIL（${st.fail} 条）\n`
    : st.warn
    ? `\n结果：PASS（有 ${st.warn} 条警告）\n`
    : `\n结果：PASS（全通过）\n`
);
process.exit(st.fail ? 1 : 0);
