/**
 * 目录组织图（catalog）几何自检：
 *   1) 任意两个节点矩形不得相交（重叠）
 *   2) 缩进式目录树：子节点左缘必须严格右于父节点左缘
 *   3) 所有一级节点顶对齐（同一行）
 *   4) 连线端点不得越界 / 悬空
 * 用一棵「贴近截图1」的树（多子节点 + 深层子树）跑。
 */
import { layoutTree } from "../src/components/MindMap/layout";
import type { MindNode } from "../src/components/MindMap/types";

let n = 0;
const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "n" + ++n,
  title,
  children,
});

const root = mk("RIS功能需求与数据模型", [
  mk("门店管理", [
    mk("餐厅门店", [
      mk("区域管理", [
        mk("桌台管理", [
          mk("员工管理", [
            mk("岗位/角色管理", [
              mk("客户端类型管理", [mk("终端管理", [mk("角色权限管理", [mk("岗位id")])])]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]),
  mk("菜品管理", [
    mk("菜品分类"),
    mk("菜品属性"),
    mk("菜品管理"),
    mk("套餐管理", [
      mk("套餐分组", [mk("菜品分类"), mk("菜品价格"), mk("定义")]),
      mk("套餐菜品"),
      mk("套餐销售配置"),
    ]),
  ]),
  mk("餐盘管理", [
    mk("餐盘分类"),
    mk("分店餐盘库存"),
    mk("餐盘菜品管理"),
    mk("id"),
    mk("分店id"),
    mk("装盘时间"),
  ]),
  mk("订单管理", [
    mk("功能需求"),
    mk("模型"),
    mk("订单基本信息", [mk("订单桌台"), mk("订单菜品"), mk("合单记录")]),
    mk("订单价格变更记录"),
  ]),
  mk("排队管理", [mk("菜品分类"), mk("菜品价格"), mk("定义")]),
  mk("预约管理", [mk("电话预约"), mk("网上预约")]),
  mk("桌台预留管理", [mk("菜品分类"), mk("全局菜品属性"), mk("菜品信息")]),
  mk("从旧版变更需求", [
    mk("菜品分类", [
      mk("全局菜品属性", [mk("菜品价格"), mk("定义")]),
      mk("整单不参与套餐价下架", [mk("套餐定义"), mk("定售价")]),
    ]),
  ]),
]);
root.isRoot = true;

const layout = layoutTree(root, {
  structure: "catalog",
  branchColors: new Map<string, string>(),
  linkColor: "#7f8ea3",
  lineStyle: "curve",
});

const fail: string[] = [];
const nodes = layout.nodes;

// 1) 重叠检测
let overlaps = 0;
const samples: string[] = [];
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i];
    const b = nodes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0.5 && oy > 0.5) {
      overlaps++;
      if (samples.length < 6) {
        samples.push(
          `「${a.node.title}」(d${a.depth}) × 「${b.node.title}」(d${b.depth}) ` +
            `重叠 ${ox.toFixed(1)}×${oy.toFixed(1)}px`
        );
      }
    }
  }
}
console.log(`节点总数 ${nodes.length}，重叠对数 ${overlaps}`);
samples.forEach((s) => console.log("   " + s));
if (overlaps) fail.push(`catalog 存在 ${overlaps} 对节点重叠`);

// 2) 缩进：一级以下（列内）子节点左缘必须严格右于父节点左缘
//    注意：根的直接子节点按「列」横向并列，不属于缩进层级，故从 depth>=2 起校验
const byId = layout.byId;
const walk = (p: MindNode) => {
  for (const c of p.children) {
    const cp = byId.get(c.id);
    const pp = byId.get(p.id);
    if (cp && pp && cp.depth >= 2 && !(cp.x > pp.x + 0.5)) {
      fail.push(`缩进异常：「${c.title}」(x=${cp.x.toFixed(1)}) 未右于父「${p.title}」(x=${pp.x.toFixed(1)})`);
    }
    walk(c);
  }
};
walk(root);

// 2b) 缩进必须是「同一固定步长」的整齐阶梯（菜品管理 → 套餐管理 → 套餐分组 → 菜品分类）
const at = (title: string, depth: number) =>
  nodes.find((x) => x.node.title === title && x.depth === depth);
const chain = [
  at("菜品管理", 1),
  at("套餐管理", 2),
  at("套餐分组", 3),
  at("菜品分类", 4),
];
if (chain.every(Boolean)) {
  const xs = chain.map((p) => p!.x);
  const steps = [xs[1] - xs[0], xs[2] - xs[1], xs[3] - xs[2]];
  console.log(`缩进阶梯 x = [${xs.map((v) => v.toFixed(0)).join(" → ")}]，步长 = [${steps.map((v) => v.toFixed(1)).join(", ")}]`);
  if (steps.some((s) => Math.abs(s - 38) > 0.01)) fail.push(`缩进步长不齐：${steps.join(", ")}`);
} else {
  fail.push("缩进阶梯取样失败");
}

// 3) 一级节点顶对齐
const l1 = nodes.filter((x) => x.depth === 1);
const y1 = [...new Set(l1.map((x) => +x.y.toFixed(2)))];
console.log(`一级节点 ${l1.length} 个，y 值集合 = [${y1.join(", ")}]`);
if (y1.length !== 1) fail.push(`一级节点未顶对齐，y 值有 ${y1.length} 种`);

// 4) 连线端点越界 / 悬空
const inSet = new Set(nodes.map((x) => x.node.id));
let dangling = 0;
let oob = 0;
for (const l of layout.links) {
  if (!inSet.has(l.from.node.id) || !inSet.has(l.to.node.id)) dangling++;
  const pts = (l.path ?? "").match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g) ?? [];
  for (const pt of pts) {
    const [x, y] = pt.split(/\s+/).map(Number);
    if (x < -1 || y < -1 || x > layout.width + 1 || y > layout.height + 1) oob++;
  }
}
console.log(`连线 ${layout.links.length} 条，悬空 ${dangling}，越界端点 ${oob}`);
if (dangling) fail.push(`连线悬空 ${dangling} 条`);
if (oob) fail.push(`连线越界端点 ${oob} 个`);

// 6) busX（折叠按钮 / 子树竖线落点，节点局部坐标）：
//    非根节点 = 下一层缩进 - 短横头 = 28；根节点 = 底边中点 w/2；无子节点者必须为 undefined
let busBad = 0;
let busMissing = 0;
for (const p of nodes) {
  const expect = p.depth === 0 ? p.w / 2 : 28;
  if (p.node.children.length) {
    if (p.busX == null) busMissing++;
    else if (Math.abs(p.busX - expect) > 0.01) busBad++;
  } else if (p.busX != null) {
    busBad++;
  }
}
console.log(`busX 校验：缺失 ${busMissing}，偏差 ${busBad}（应均为 0）`);
if (busMissing) fail.push(`有子节点的节点缺 busX：${busMissing}`);
if (busBad) fail.push(`busX 不等于 子节点左缘-10：${busBad} 处`);

console.log(`画布尺寸 ${layout.width.toFixed(0)} × ${layout.height.toFixed(0)}`);

// 5) 7 结构回归：坐标有限、连线端点不越界（本次改动只碰 catalog，其余结构须无变化）
const STRUCTS = ["logical-right", "logical-left", "mindmap", "org", "catalog", "timeline", "fishbone"] as const;
for (const s of STRUCTS) {
  const L = layoutTree(root, {
    structure: s,
    branchColors: new Map<string, string>(),
    linkColor: "#7f8ea3",
    lineStyle: "curve",
  });
  let bad = 0;
  let nan = 0;
  for (const nd of L.nodes) {
    if (![nd.x, nd.y, nd.w, nd.h, nd.centerX, nd.centerY].every(Number.isFinite)) nan++;
  }
  for (const l of L.links) {
    if (!l.path) continue;
    const pts = l.path.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g) ?? [];
    for (const pt of pts) {
      const [x, y] = pt.split(/\s+/).map(Number);
      if (x < -1 || y < -1 || x > L.width + 1 || y > L.height + 1) bad++;
    }
  }
  console.log(`  ${s.padEnd(14)} 节点 ${String(L.nodes.length).padStart(3)}  越界端点 ${bad}  NaN ${nan}`);
  if (bad) fail.push(`${s} 连线越界端点 ${bad}`);
  if (nan) fail.push(`${s} 存在非有限坐标 ${nan}`);
}

console.log(fail.length ? "\nFAIL\n" + fail.map((f) => "  - " + f).join("\n") : "\nALL PASS");
process.exit(fail.length ? 1 : 0);
