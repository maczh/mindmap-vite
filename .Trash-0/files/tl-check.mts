import { layoutTree } from "../src/components/MindMap/layout";

let uid = 0;
const n = (title: string, children: any[] = []): any => ({
  id: "n" + uid++,
  title,
  children,
});

// 仿「奇海RIS 菜品模型」式时间轴：根 + 4 个一级 + 各自二级 + 部分三级
const root = n("菜品模型", [
  n("菜品分类", [
    n("海鲜类", [n("StoreId"), n("名称"), n("单价")]),
    n("肉类"),
    n("蔬菜类"),
  ]),
  n("套餐", [n("双人套餐", [n("含菜品"), n("价格")]), n("家庭套餐")]),
  n("做法", [n("清蒸"), n("红烧"), n("麻辣")]),
  n("备注", [n("辣度"), n("忌口")]),
]);

const res = layoutTree(root, {
  structure: "timeline",
  branchColors: new Map(),
  linkColor: "#9aa4b2",
  lineStyle: "straight",
});

const fails: string[] = [];
const ok: string[] = [];

// 1) 节点 / 连线基本数量
ok.push(`nodes=${res.nodes.length} links=${res.links.length} width=${Math.round(res.width)} height=${Math.round(res.height)}`);

// 2) 连续主轴脊柱：存在一条 axis==="h" 且 path 为「M x y L x2 y」（两点、同 y）的连线
const spine = res.links.find(
  (l) => l.axis === "h" && l.path && (l.path.match(/L/g) || []).length === 1
);
if (spine) ok.push(`spine present: ${spine.path}`);
else fails.push("缺少连续主轴脊柱连线");

// 3) 一级节点上下交替：偶数序号向下(sgn=1)、奇数序号向上(sgn=-1)
const l1 = res.nodes.filter((p) => p.depth === 1);
l1.forEach((p, i) => {
  const expect = i % 2 === 0 ? 1 : -1;
  if (p.sgn !== expect) fails.push(`L1#${i} sgn=${p.sgn} 期望 ${expect}`);
});
ok.push(`L1 count=${l1.length} sgn=[${l1.map((p) => p.sgn).join(",")}]`);

// 4) 深层连线均为肘形折线（3 点：M..L..L..），短横头末端 x == 子节点文本左缘
let elbow = 0;
let stubOk = 0;
for (const l of res.links) {
  if (l.axis !== "v") continue;
  const m = l.path?.match(/-?\d+(?:\.\d+)?/g);
  if (!m || m.length !== 6) continue; // M x y  L x y  L x y
  elbow++;
  const [x0, y0, x1, y1, x2, y2] = m.map(Number);
  // 肘形：竖线 x 相同(x0==x1)，横头 y 相同(y1==y2)，横头末端 x2==子文本左缘
  const trunkVert = Math.abs(x0 - x1) < 0.5;
  const stubHoriz = Math.abs(y1 - y2) < 0.5;
  const to = l.to;
  const childTextLeft = to.x + 12 + (to.node.markers?.length ?? 0) * 19; // TEXT_LEFT_INSET=12
  const stubReaches = Math.abs(x2 - childTextLeft) < 1.5;
  if (trunkVert && stubHoriz && stubReaches) stubOk++;
  else fails.push(`肘形异常: trunkVert=${trunkVert} stubHoriz=${stubHoriz} stubReaches=${stubReaches} path=${l.path}`);
}
ok.push(`elbow links=${elbow} stubReachesText=${stubOk}`);

// 5) 无节点盒子重叠（含一级胶囊与二级文字左对齐盒子）
const boxes = res.nodes.map((p) => ({ id: p.node.id, x: p.x, y: p.y, w: p.w, h: p.h }));
let overlap = 0;
for (let i = 0; i < boxes.length; i++)
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i],
      b = boxes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0.5 && oy > 0.5) overlap++;
  }
ok.push(`box overlaps=${overlap}`);
if (overlap > 0) fails.push(`存在 ${overlap} 处节点重叠`);

// 6) 一级胶囊全部 centerY 对齐（落在主轴）
const y0 = l1[0]?.centerY;
const onAxis = l1.every((p) => Math.abs(p.centerY - y0) < 0.5);
ok.push(`L1 on-axis=${onAxis} (centerY=${y0})`);
if (!onAxis) fails.push("一级胶囊未对齐到主轴");

console.log("OK:\n  " + ok.join("\n  "));
if (fails.length) {
  console.log("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
} else {
  console.log("\nALL CHECKS PASSED");
}
