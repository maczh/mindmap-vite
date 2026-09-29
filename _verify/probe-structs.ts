/**
 * 结构绘制自检（复现「思维导图 / 时间轴」绘制错误）：
 * 用一棵贴近截图 2 的「海鲜点餐小程序接口」树（~10 个一级分支 + 多个深链子树），
 * 对 7 种结构逐一跑 layoutTree，统计：
 *   1) 节点矩形两两相交（重叠）对数，并打印前若干对（含标题）
 *   2) 连线端点越界 / NaN
 *   3) 时间轴 / 思维导图 的一级节点 y 分布（判断是否被挤到同一行）
 */
import { layoutTree } from "../src/components/MindMap/layout";
import type { MindNode, StructureType } from "../src/components/MindMap/types";

let n = 0;
const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "q" + ++n,
  title,
  children,
});
const chain = (titles: string[]): MindNode => {
  let node: MindNode | undefined;
  for (let i = titles.length - 1; i >= 0; i--) node = mk(titles[i], node ? [node] : []);
  return node!;
};

/** 一级分支下再分叉，且「非末位子节点」带子树 —— 正是挤占兄弟空间的触发形态 */
const TALL =
  "SINGLE DISH, COMBO DISH, BUFFET_MEAL, VOUCHER, 自助餐, 打包盒, 套餐, 套餐子菜品, 单点菜";
const root = mk("海鲜点餐小程序接口", [
  mk("点餐页", [
    mk("入境"),
    chain(["出境", "table", "dishCategories", "dishes", "order", "cart", "cartId"]),
    chain(["名称", "categoryId"]),
  ]),
  mk("提交购物车", [
    mk("入境"),
    chain(["出境", "成功", "storedId", "tableId", "dishId", "dishType", "subDishes", "skuId", "num"]),
  ]),
  mk("确认下单"),
  mk("订单详情"),
  mk("模型", [
    chain(["购物车", "cartItem购物车菜品单条明细", "cartItemVo输出模型", "订单", "菜品", "id", "did", "ld"]),
    mk(TALL),
    mk("套餐类型"),
  ]),
  chain(["websocket", "cartInfo", "order"]),
  mk("套餐"),
  mk("套餐分组菜品"),
  mk("Combold"),
  mk("分组类型"),
]);

const STRUCTS: StructureType[] = [
  "logical-right",
  "logical-left",
  "mindmap",
  "org",
  "catalog",
  "timeline",
  "fishbone",
];

function overlapPairs(nodes: { x: number; y: number; w: number; h: number; node: MindNode }[]) {
  const out: string[] = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 1 && iy > 1) out.push(`${a.node.title} × ${b.node.title}  (${ix.toFixed(0)}×${iy.toFixed(0)})`);
    }
  return out;
}

console.log(`测试树节点数 ${n}\n`);
const fail: string[] = [];

for (const s of STRUCTS) {
  const L = layoutTree(root, {
    structure: s,
    branchColors: new Map<string, string>(),
    linkColor: "#7f8ea3",
    lineStyle: "curve",
  });
  const ov = overlapPairs(L.nodes as never);
  let oob = 0;
  let nan = 0;
  for (const nd of L.nodes)
    if (![nd.x, nd.y, nd.w, nd.h, nd.centerX, nd.centerY].every(Number.isFinite)) nan++;
  for (const l of L.links) {
    if (!l.path) continue;
    const pts = l.path.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g) ?? [];
    for (const pt of pts) {
      const [x, y] = pt.split(/\s+/).map(Number);
      if (x < -1 || y < -1 || x > L.width + 1 || y > L.height + 1) oob++;
    }
  }
  console.log(`── ${s} ──`);
  console.log(`   节点 ${L.nodes.length}  重叠 ${ov.length} 对  越界端点 ${oob}  NaN ${nan}  画布 ${L.width.toFixed(0)}×${L.height.toFixed(0)}`);
  if (ov.length) {
    for (const o of ov.slice(0, 6)) console.log(`     ⚠ ${o}`);
    if (ov.length > 6) console.log(`     … 其余 ${ov.length - 6} 对`);
  }
  // 一级节点 y 分布
  const lvl1 = L.nodes.filter((p) => p.depth === 1).map((p) => +p.y.toFixed(1));
  if (lvl1.length) {
    const uniq = [...new Set(lvl1)].sort((a, b) => a - b);
    console.log(`   一级节点 y：${lvl1.join(", ")}  → 取值 ${uniq.length} 个`);
  }
  if (ov.length) fail.push(`${s} 重叠 ${ov.length} 对`);
  if (oob) fail.push(`${s} 越界端点 ${oob}`);
  if (nan) fail.push(`${s} NaN ${nan}`);
  console.log();
}

console.log(fail.length ? "FAIL\n" + fail.map((f) => "  - " + f).join("\n") : "ALL PASS");
