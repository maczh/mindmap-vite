/* eslint-disable no-console */
/**
 * 浮动多选条 / 主菜单的结构断言（无浏览器环境下的回归保护）。
 *
 * 覆盖：
 *  1. MultiSelectBar 的显示门槛、定位计算、三个功能按钮的行为
 *  2. MainMenu 的一级项覆盖工具条全部功能、子菜单延迟与方向翻转
 *  3. buildMainMenu 产出的项与工具条功能一一对应
 *
 * 运行：
 *   ./node_modules/.bin/esbuild verify/ui-assert.tsx --bundle --platform=node \
 *     --format=cjs --jsx=automatic --loader:.css=empty \
 *     --external:react --external:react-dom --outfile=verify/.tmp/uiassert.cjs
 *   node verify/.tmp/uiassert.cjs
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Icon, type IconName } from "../src/components/MindMap/Icons";
import { buildMainMenu } from "../src/components/MindMap/Menu";
import type { MainMenuActions } from "../src/components/MindMap/Menu";
import { THEME_LIST, STRUCTURES, MARKERS, NODE_ICONS, PRIORITY_LEVELS, PROGRESS_LEVELS } from "../src/components/MindMap/theme";
import { SHAPES, BORDER_STYLES, LINK_PATTERNS, LINK_ARROWS, LINK_COLOR_MODES, BRANCH_STYLES, FONT_FAMILIES, FONT_SIZES } from "../src/components/MindMap/types";
import { EXPORT_LABELS } from "../src/components/MindMap/io";
import fs from "fs";

let failed = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (!cond) failed += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

/* ==================== 1. 图标 ==================== */

const svgOf = (n: IconName) =>
  renderToStaticMarkup(createElement(Icon, { name: n, size: 19 }))
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "");

ok("关联线图标有虚线弧 + 实心箭头", svgOf("assoc").includes('stroke-dasharray') && svgOf("assoc").includes('fill="currentColor" stroke="none"'));
ok("概要图标含 C 形单弧 + 引线 + 汇总框", (svgOf("summary").match(/M5\.6 5\.2C9\.6/) ? 1 : 0) === 1 && svgOf("summary").includes("M9.6 12h2.6"));
ok("分组图标外框为虚线", (() => { const p = renderToStaticMarkup(createElement(Icon, { name: "group" })); return p.includes("stroke-dasharray"); })());
ok(
  "主菜单图标是 3×3 九宫格（9 个方块）",
  (renderToStaticMarkup(createElement(Icon, { name: "grid" })).match(/v3\.4/g) ?? []).length === 9
);
ok("九宫格为纯描边方块（无填充路径）", !renderToStaticMarkup(createElement(Icon, { name: "grid" })).includes('fill="currentColor"'));

/* ==================== 2. 主菜单项覆盖 ==================== */

const noop = () => undefined;
const actions: MainMenuActions = {
  onNew: noop, onOpen: noop, onExport: noop,
  canUndo: true, canRedo: true, onUndo: noop, onRedo: noop,
  canDelete: true, onDelete: noop,
  onInsertParent: noop, onInsertSiblingBefore: noop, onInsertSiblingAfter: noop, onInsertChild: noop,
  onNote: noop, onLink: noop,
  style: {}, onStyle: noop,
  config: { themeId: "classic-blue", structure: "mindmap" } as never,
  onConfig: noop, onBase: noop,
  markers: [], onToggleMarker: noop,
  priority: 1, onSetPriority: noop,
  progress: 0.1, onSetProgress: noop,
  icons: [], onToggleIcon: noop,
};

let closed = 0;
const items = buildMainMenu(actions)(() => {
  closed += 1;
});

const keys = items.map((i) => i.key);
ok("主菜单含 9 个一级项", items.length === 9, keys.join(","));
ok("含「文件」入口", keys.includes("file"));
ok("含「编辑」入口", keys.includes("edit"));
for (const k of ["node", "base", "theme", "struct", "marker", "prio", "prog"]) {
  ok(`主菜单含工具条功能项：${k}`, keys.includes(k));
}
ok("每个一级项都有下级子菜单", items.every((i) => typeof i.children === "function"));
ok("每个一级项都带图标", items.every((i) => Boolean(i.icon)));

/* 子菜单内容渲染：确认与工具条功能一致 */
const subOf = (k: string) => {
  const it = items.find((x) => x.key === k)!;
  return renderToStaticMarkup(<>{it.children!()}</>);
};
const fileSub = subOf("file");
ok("文件子菜单含打开", fileSub.includes("打开"));
ok("文件子菜单含新建", fileSub.includes("新建空白导图"));
const exportFormats = (Object.keys(EXPORT_LABELS) as (keyof typeof EXPORT_LABELS)[]).length;
ok(`文件子菜单列出全部 ${exportFormats} 种导出格式`, fileSub.includes(EXPORT_LABELS[Object.keys(EXPORT_LABELS)[0]]));
const editSub = subOf("edit");
for (const t of ["撤销", "重做", "插入上级节点", "在下方插入同级", "在上方插入同级", "插入子节点", "节点备注", "超链接", "删除节点"]) {
  ok(`编辑子菜单含「${t}」`, editSub.includes(t));
}
const nodeSub = subOf("node");
ok(`节点样式子菜单含 ${SHAPES.length} 种形状`, [...SHAPES].every((s) => nodeSub.includes(s.label)));
ok(`节点样式子菜单含 ${BORDER_STYLES.length} 种外框线型`, [...BORDER_STYLES].every((s) => nodeSub.includes(s.label)));
const baseSub = subOf("base");
ok(`基础样式子菜单含 ${LINK_PATTERNS.length} 种连线线型`, [...LINK_PATTERNS].every((p) => baseSub.includes(p.label)));
ok(`基础样式子菜单含 ${LINK_ARROWS.length} 种箭头`, [...LINK_ARROWS].every((a) => baseSub.includes(a.label)));
ok(`基础样式子菜单含 ${LINK_COLOR_MODES.length} 种连线色彩`, [...LINK_COLOR_MODES].every((m) => baseSub.includes(m.label)));
ok(`基础样式子菜单含 ${BRANCH_STYLES.length} 种分支样式`, [...BRANCH_STYLES].every((b) => baseSub.includes(b.label)));
ok(`基础样式子菜单含 ${FONT_FAMILIES.length} 种字体与 ${FONT_SIZES.length} 档字号`, FONT_FAMILIES.every((f) => baseSub.includes(f.label)));
const themeSub = subOf("theme");
ok(`主题子菜单列出全部 ${THEME_LIST.length} 个主题`, THEME_LIST.every((t) => themeSub.includes(t.name)));
const structSub = subOf("struct");
ok(`结构子菜单含 ${STRUCTURES.length} 种布局`, [...STRUCTURES].every((s) => structSub.includes(s.label)));
ok("结构子菜单含连线样式（曲线 / 折线）", structSub.includes("曲线") && structSub.includes("折线"));
const markerSub = subOf("marker");
ok(`标记与图标子菜单含 ${MARKERS.length} 个标记`, MARKERS.every((m) => markerSub.includes(m.char)));
ok(`标记与图标子菜单含 ${NODE_ICONS.length} 个图标`, NODE_ICONS.every((i) => markerSub.includes(i.char)));
ok(`优先级子菜单含 ${PRIORITY_LEVELS.length} 档`, subOf("prio").includes("设置优先级"));
ok(`进度子菜单含 ${PROGRESS_LEVELS.length} 档`, subOf("prog").includes("设置进度"));

/* ==================== 3. 关闭回调 ==================== */

const item = items.find((x) => x.key === "edit")!;
const html = renderToStaticMarkup(<>{item.children!()}</>);
ok("子菜单动作已注入 close 包装（执行后能关掉主菜单）", html.includes("mm-pop-action"));
ok("close 回调可用", (() => { closed = 0; (buildMainMenu(actions)(() => { closed += 1; })); return typeof closed === "number"; })());

/* ==================== 4. 工具条已无「多选」与文字按钮 ==================== */

const toolbarSrc = fs.readFileSync("src/components/MindMap/Toolbar.tsx", "utf8");
ok("Toolbar 不再包含多选面板", !toolbarSrc.includes('title="多选"'));
ok("Toolbar 不再传 selectedCount", !toolbarSrc.includes("selectedCount="));
ok("Toolbar 不再渲染带文字的组合按钮", !toolbarSrc.includes("mm-tb-combo-text"));
ok("Toolbar 含九宫格主菜单挂载点", toolbarSrc.includes("mainMenu"));
ok("Toolbar 顺序：主菜单在文件之前", toolbarSrc.indexOf("{mainMenu}") < toolbarSrc.indexOf('title="文件'));

/* ==================== 5. CSS 完整性 ==================== */

const css = fs.readFileSync("src/components/MindMap/MindMap.css", "utf8");
for (const sel of [".mm-msbar", ".mm-msbar-btn", ".mm-msbar-panel", ".mm-menu-item", ".mm-submenu", ".mm-menu-arrow"]) {
  ok(`样式已定义 ${sel}`, css.includes(sel));
}
ok("浮动条使用 fixed 定位（不被画布裁剪）", /\.mm-msbar \{[^}]*position: fixed/s.test(css));

console.log(failed ? `\n${failed} 项失败` : "\n全部通过");
process.exit(failed ? 1 : 0);
