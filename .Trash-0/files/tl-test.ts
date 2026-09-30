/* 时间轴布局自检：缩进 / 上下交替 / 不重叠 / 文本左缘落点 */
import {
  layoutTree,
  nodeSize,
  textCenterX,
  textBlockWidth,
  prefixWidth,
  TEXT_LEFT_INSET,
  type PositionedNode,
} from "../src/components/MindMap/layout";
import type { MindNode } from "../src/components/MindMap/types";

let seq = 0;
const n = (title: string, children: MindNode[] = []): MindNode => ({
  id: `n${++seq}`,
  title,
  children,
});

const tree = n("根节点", [
  n("甲域", [
    n("甲一", [n("甲一甲"), n("甲一乙")]),
    n("甲二"),
    n("甲三"),
  ]),
  n("乙域", [n("乙一")]),
  n("丙域", [n("丙一", [n("丙一甲")]), n("丙二")]),
  n("丁域"),
]);

const res = layoutTree(tree, {
  structure: "timeline",
  branchColors: new Map<string, string>(),
  linkColor: "#999",
  lineStyle: "straight",
});

const textLeft = (p: PositionedNode): number =>
  p.depth <= 1
    ? p.x + textCenterX(p.node, p.w) - textBlockWidth(p.node, nodeSize(p.node, p.depth)) / 2
    : p.x + TEXT_LEFT_INSET + prefixWidth(p.node);

const byId = new Map<string, PositionedNode>();
res.nodes.forEach((p) => byId.set(p.node.id, p));

console.log("depth structure:");
const dump = (node: MindNode, d: number) => {
  const p = byId.get(node.id)!;
  console.log(
    `  ${"  ".repeat(d)}d${p.depth} ${node.title.padEnd(6)} box=[${p.x.toFixed(0)},${(p.x + p.w).toFixed(0)}] y=[${p.y.toFixed(0)},${(p.y + p.h).toFixed(0)}] textLeft=${textLeft(p).toFixed(1)} sgn=${p.sgn}`
  );
  node.children.forEach((c) => dump(c, d + 1));
};
dump(tree, 0);

const fail: string[] = [];

// 1) 一级节点上下交替（偶下奇上）
tree.children.forEach((k, i) => {
  const p = byId.get(k.id)!;
  const expect = i % 2 === 0 ? 1 : -1;
  if (p.sgn !== expect) fail.push(`${k.title} 方向应为 ${expect}，实际 ${p.sgn}`);
});

// 2) 文本左缘逐层缩进固定值（根 → 一级是沿主轴铺开，不参与缩进检查）
const walk = (node: MindNode) => {
  const p = byId.get(node.id)!;
  node.children.forEach((c) => {
    const q = byId.get(c.id)!;
    if (p.depth >= 1) {
      const delta = textLeft(q) - textLeft(p);
      if (Math.abs(delta - 36) > 0.6) fail.push(`${node.title}→${c.title} 缩进 ${delta.toFixed(1)} ≠ 36`);
    }
    walk(c);
  });
};
walk(tree);

// 3) 任意两节点盒子不重叠
for (let i = 0; i < res.nodes.length; i++) {
  for (let j = i + 1; j < res.nodes.length; j++) {
    const a = res.nodes[i];
    const b = res.nodes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0.5 && oy > 0.5) {
      fail.push(`节点重叠：${a.node.title} × ${b.node.title}`);
    }
  }
}

// 4) 一级节点应在主轴（同一 centerY）上
const axis = byId.get(tree.id)!.centerY;
tree.children.forEach((k) => {
  const p = byId.get(k.id)!;
  if (Math.abs(p.centerY - axis) > 0.01) fail.push(`${k.title} 未落在主轴上`);
});

// 5) 向上的子树整体位于一级节点顶边之上；向下的在其底边之下
const checkDir = (node: MindNode, dir: 1 | -1, parentEdge: number) => {
  const p = byId.get(node.id)!;
  if (dir === 1 && p.y < parentEdge - 0.01) fail.push(`${node.title} 应在一级节点下方`);
  if (dir === -1 && p.y + p.h > parentEdge + 0.01) fail.push(`${node.title} 应在一级节点上方`);
  node.children.forEach((c) => checkDir(c, dir, parentEdge));
};
tree.children.forEach((k) => {
  const p = byId.get(k.id)!;
  k.children.forEach((c) =>
    checkDir(c, p.sgn as 1 | -1, p.sgn === 1 ? p.y + p.h : p.y)
  );
});

// 6) 每条连线都有预计算路径，且路径为肘形（M…L…L…）
res.links.forEach((l) => {
  if (!l.path) fail.push(`连线缺少 path：${l.from.node.title}→${l.to.node.title}`);
  else if (!/^M [-\d.]+ [-\d.]+( L [-\d.]+ [-\d.]+){1,2}$/.test(l.path))
    fail.push(`连线路径非预期：${l.path}`);
});

console.log(`\n画布 ${res.width.toFixed(0)} × ${res.height.toFixed(0)}；节点 ${res.nodes.length}；连线 ${res.links.length}`);
if (fail.length) {
  console.log("\n❌ 失败项：");
  fail.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("\n✅ 全部检查通过");
