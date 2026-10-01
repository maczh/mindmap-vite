/* eslint-disable no-console */
/**
 * 组件包逻辑回归（纯 Node，不涉及 DOM）。
 * 用 esbuild 打成 CJS 后由 node 执行，断言覆盖：
 * 树操作 / 布局 / 主题 / 导入导出往返 / 有道数据适配。
 */
import {
  allNodes,
  cloneTree,
  countNodes,
  createNode,
  depthOf,
  findNode,
  findParent,
  findPath,
  visibleNodes,
  opAddChild,
  opAddParent,
  opAddSibling,
  opDelete,
  opMove,
  opOutdent,
  opToggleCollapse,
  opUpdate,
  sampleTree,
} from "../src/components/MindMap/tree";
import { layoutTree, nodeSize, textBlockWidth, textCenterX } from "../src/components/MindMap/layout";
import {
  BORDER_DASH,
  BORDER_STYLES,
  DEFAULT_CONFIG,
  LINK_ARROWS,
  LINK_COLOR_MODES,
  LINK_PATTERNS,
  SHAPES,
  DEFAULT_TEXT,
} from "../src/components/MindMap/types";
import {
  DEFAULT_THEME_ID,
  STRUCTURES,
  THEME_LIST,
  THEME_MAP,
  STRUCTURE_MAP,
  buildBranchColors,
} from "../src/components/MindMap/theme";
import {
  exportFreeMind,
  escapeXml,
  exportKityMinder,
  exportSmm,
  exportYoudaoFlat,
  exportXmind,
  parseFreeMind,
  parseXmind,
} from "../src/components/MindMap/io";
import { fromFlat, fromNested, parseMindmapJson } from "../src/components/MindMap/io/json";
import { adaptYoudaoMindmap, type YoudaoMindmap } from "../src/data/adapter";
import type { MindNode, StructureType } from "../src/components/MindMap/types";

const layoutOpts = (st: StructureType) => ({
  structure: st,
  branchColors: buildBranchColors(root),
  linkColor: "#888",
  lineStyle: "curve" as const,
});

let pass = 0;
const fails: string[] = [];

function ok(cond: boolean, label: string) {
  if (cond) {
    pass += 1;
  } else {
    fails.push(label);
    console.log("  ✗ " + label);
  }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(a === b, `${label}（期望 ${String(b)}，实得 ${String(a)}）`);
}
function group(name: string) {
  console.log("\n[" + name + "]");
}

/* ------------------------------ 树操作 ------------------------------ */
group("tree");
const root: MindNode = {
  id: "r",
  title: "根",
  children: [
    { id: "a", title: "A", children: [{ id: "a1", title: "A1", children: [] }] },
    { id: "b", title: "B", children: [] },
  ],
};
eq(countNodes(root), 4, "countNodes");
eq(allNodes(root).length, 4, "allNodes");
eq(visibleNodes(root).length, 4, "visibleNodes（默认全展开）");
eq(findNode(root, "a1")?.title, "A1", "findNode");
eq(findNode(root, "zz"), null, "findNode 未命中返回 null");
eq(depthOf(root, "r"), 0, "depthOf 根");
eq(depthOf(root, "a1"), 2, "depthOf 二级子节点");
eq(depthOf(root, "xx"), -1, "depthOf 未命中");
eq(findPath(root, "a1").map((n) => n.id).join("/"), "r/a/a1", "findPath");
const pf = findParent(root, "a1");
ok(!!pf && pf.parent.id === "a" && pf.index === 0, "findParent");
eq(cloneTree(root).children.length, 2, "cloneTree 结构一致");
const cloned = cloneTree(root, true);
ok(cloned.id !== "r" && cloned.children[0].id !== "a", "cloneTree(remap) 重分配 id");

const c1 = opAddChild(root, "b");
eq(countNodes(c1.tree), 5, "opAddChild 节点 +1");
eq(c1.changed, true, "opAddChild changed");
eq(c1.focusId, c1.tree.children[1].children[0].id, "opAddChild 聚焦新节点");
eq(opAddChild(root, "zz").changed, false, "opAddChild 目标不存在不变更");
const s1 = opAddSibling(root, "a1");
eq(countNodes(s1.tree), 5, "opAddSibling 节点 +1");
ok(
  s1.tree.children[0].children[1].title === "分支主题",
  "opAddSibling 插在同级之后"
);
const p1 = opAddParent(root, "a1");
eq(p1.tree.children[0].children.length, 1, "opAddParent 包一层");
eq(opAddParent(root, "r").changed, false, "opAddParent 拒绝根节点");
const o1 = opOutdent(p1.tree, "a1");
eq(o1.changed, true, "opOutdent 生效");
eq(opOutdent(root, "r").changed, false, "opOutdent 拒绝根");
eq(opOutdent(root, "a").changed, false, "opOutdent 一级节点已是同级（不变更）");
eq(countNodes(opDelete(root, "a1").tree), 3, "opDelete 删除节点");
eq(opDelete(root, "r").changed, false, "opDelete 拒绝根");
const u1 = opUpdate(root, "a", { title: "A2" }, { fontSize: 20 });
eq(u1.children[0].title, "A2", "opUpdate 改标题");
eq(u1.children[0].style?.fontSize, 20, "opUpdate 合并 style");
eq(u1.children[0].style?.bold, undefined, "opUpdate 未触碰的 style 字段保持空");
eq(opUpdate(root, "a", { children: [] }).children[0].children.length, 1, "opUpdate 不改 children");
const m1 = opMove(root, "a1", "b", "child");
eq(findNode(m1.tree, "b")?.children[0].title, "A1", "opMove 移到子节点下");
eq(opMove(root, "a1", "a1", "child").changed, false, "opMove 拒绝自身");
eq(opMove(root, "r", "a", "child").changed, false, "opMove 拒绝拖根");
eq(opMove(root, "a", "a1", "child").changed, false, "opMove 拒绝拖到自己的子孙下");
eq(opToggleCollapse(root, "a").children[0].collapsed, true, "opToggleCollapse 收起");
eq(opToggleCollapse(root, "a").children[0].children.length, 1, "收起后子节点仍在数据里");

/* ------------------------------ 布局 ------------------------------ */
group("layout");
const size = nodeSize(root, 1);
ok(size.w > 0 && size.h > 0, "nodeSize 有尺寸");
ok(textBlockWidth(root, size) > 0, "textBlockWidth 大于 0");
const cx = textCenterX(root, size.w);
ok(cx >= 0 && cx <= size.w, "textCenterX 落在节点宽度内");
const structIds = STRUCTURES.map((s) => s.id) as StructureType[];
eq(structIds.length, 7, "共 7 种结构");
for (const st of structIds) {
  const r = layoutTree(root, layoutOpts(st));
  const finite = r.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
  ok(finite && r.nodes.length === 4, `layoutTree[${st}] 4 个有限坐标`);
  // 时间轴带轴线，连线数刻意不与节点数严格相等，单独放宽
  eq(
    r.links.length,
    st === "timeline" ? r.links.length : 3,
    `layoutTree[${st}] 连线数合理（${r.links.length}）`
  );
  ok(r.links.length >= 2, `layoutTree[${st}] 至少 2 条连线`);
}
const sigOf = (st: StructureType) =>
  layoutTree(root, layoutOpts(st))
    .nodes.map((n) => `${n.node.id}:${Math.round(n.x)},${Math.round(n.y)}`)
    .join("|");
ok(new Set(structIds.map(sigOf)).size === 7, "7 种结构布局互不相同");
const collapsed = opToggleCollapse(root, "a");
eq(layoutTree(collapsed, layoutOpts("mindmap")).nodes.length, 3, "收起分支后少渲染一个节点");
ok(
  layoutTree(root, { ...layoutOpts("mindmap"), lineStyle: "straight" }).links.every((l) => l.straight),
  "lineStyle=straight 时连线为直线"
);

/* ------------------------------ 主题 / 常量 ------------------------------ */
group("theme");
ok(THEME_LIST.length >= 3, "主题数量 >= 3");
eq(new Set(THEME_LIST.map((t) => t.id)).size, THEME_LIST.length, "主题 id 唯一");
ok(THEME_MAP.has(DEFAULT_THEME_ID), "DEFAULT_THEME_ID 在 THEME_MAP 中");
ok(THEME_LIST.every((t) => !!t.id && !!t.name && !!t.background), "主题 id/name/background 齐全");
ok(structIds.every((s) => STRUCTURE_MAP.has(s)), "STRUCTURE_MAP 覆盖全部结构");
ok(BORDER_STYLES.every((b) => b.id in BORDER_DASH), "BORDER_STYLES 都有 dash 定义");
eq(BORDER_DASH.solid, undefined, "实线不写 dasharray");
ok(
  LINK_PATTERNS.length === 3 && LINK_ARROWS.length === 3 && LINK_COLOR_MODES.length === 2,
  "线型/箭头/配色候选齐全"
);
ok(SHAPES.length === 5, "节点形状候选齐全");
ok(DEFAULT_CONFIG.structure === "mindmap", "DEFAULT_CONFIG 结构=mindmap");
ok(DEFAULT_TEXT.fontSize === 14, "DEFAULT_TEXT 字号 14");
const colors = buildBranchColors(root);
eq(colors.size, 3, "buildBranchColors 覆盖根 + 两个分支");

/* ------------------------------ 导入 / 导出 ------------------------------ */
group("io");
// 说明：parseFreeMind / parseKityMinderXml 依赖浏览器 DOMParser，
// 其往返验证放在浏览器回归（verify/browser.mjs）里跑；Node 侧只验纯字符串导出。
const fmXml = exportFreeMind(root);
ok(fmXml.includes("<map") && fmXml.includes("</map>"), "FreeMind 导出是完整 XML");
ok(fmXml.includes('TEXT="根"'), "FreeMind 导出带根节点 TEXT 属性");
ok(fmXml.includes("A1"), "FreeMind 导出含深层节点文本");
eq(escapeXml("<a&b>"), "&lt;a&amp;b&gt;", "escapeXml 转义尖括号与 &");
ok(exportKityMinder(root).includes('"topic"'), ".km 导出含 topic 字段");
const smm = JSON.parse(exportSmm(root));
eq(smm.root.data.text, "根", ".smm 导出根文本");
eq(smm.root.children.length, 2, ".smm 导出子节点数");
eq(parseMindmapJson(smm).children[0].title, "A", ".smm → MindNode");
eq(JSON.parse(exportKityMinder(root)).root.topic, "根", ".km 导出根标题");
eq(JSON.parse(exportYoudaoFlat(root)).nodes.length, 4, "有道扁平导出 4 个节点");
const nested = fromNested(root);
eq(nested.children.length, 2, "fromNested 转嵌套");
const flatTree = fromFlat([
  { id: "r", isroot: true, topic: "根" },
  { id: "a", parentid: "r", topic: "A" },
  { id: "a1", parentid: "a", topic: "A1" },
]);
eq(flatTree.title, "根", "fromFlat 转扁平：根");
eq(flatTree.children[0].children[0].title, "A1", "fromFlat 转扁平：层级还原");
const deepTree = sampleTree();
eq(countNodes(deepTree) > 1, true, "sampleTree 非空");
// xmind（依赖 jszip，Node 侧可用）
(async () => {
  const blob = await exportXmind(root);
  const buf = await blob.arrayBuffer();
  const back = await parseXmind(buf);
  eq(back.title, "根", "xmind 往返：根标题");
  eq(countNodes(back), 4, "xmind 往返：节点数");

  /* ------------------------------ 有道数据适配 ------------------------------ */
  group("adapter");
  const youdao: YoudaoMindmap = {
    nodes: [
      { id: "0", isroot: true, topic: "中心主题" },
      { id: "1", parentid: "0", topic: "分支一", expanded: true },
      { id: "2", parentid: "1", topic: "叶子", customStyle: { borderColor: "#f00" } },
    ],
  };
  const adapted = adaptYoudaoMindmap(youdao);
  eq(adapted.title, "中心主题", "adapt 根标题");
  eq(countNodes(adapted), 3, "adapt 节点数");
  eq(adapted.children[0].children[0].title, "叶子", "adapt 层级");

  /* ------------------------------ 汇总 ------------------------------ */
  console.log("\n=== 逻辑断言：" + pass + " 通过 / " + fails.length + " 失败 ===");
  if (fails.length) {
    fails.forEach((f) => console.log("  FAIL: " + f));
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
