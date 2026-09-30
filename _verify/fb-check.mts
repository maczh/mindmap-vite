/**
 * 鱼骨图布局几何自检（纯 node，无浏览器）。
 * 运行：npx esbuild _verify/fb-check.mts --bundle --platform=node --format=esm --outfile=_verify/fb-check.mjs && node _verify/fb-check.mjs
 */
import { layoutTree } from "../src/components/MindMap/layout";
import { buildBranchColors } from "../src/components/MindMap/theme";
import type { MindNode } from "../src/components/MindMap/types";

const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "n" + Math.random().toString(36).slice(2, 9),
  title,
  children,
});

// 5 层：根 → 骨（一级）→ 骨上文字（二级）→ 括号（三级）→ 括号（四级）
const root = mk("海鲜火锅 · 包厢预订系统", [
  mk("桌台域", [
    mk("包厢/散台模型", [mk("物理桌台"), mk("逻辑桌台"), mk("区域分组")]),
    mk("桌台状态机", [mk("空闲→预订", [mk("兜底超时")]), mk("预订→开台"), mk("开台→结账")]),
    mk("并台 / 拆台", [mk("并台规则"), mk("拆台规则")]),
    mk("桌台标签", [mk("标签组")]),
  ]),
  mk("预订域", [
    mk("预订规则", [mk("时段"), mk("最低消费"), mk("超时释放")]),
    mk("定金与退订", [mk("定金"), mk("退订")]),
  ]),
  mk("对接 baseServ", [
    mk("桌台占用同步", [mk("轮询"), mk("推送", [mk("长连接")])]),
    mk("开台消息（MQ）"),
  ]),
  mk("技术选型", [mk("Go + Gin"), mk("Redis 分布式锁"), mk("MySQL 分表")]),
  mk("待办", [mk("压测")]),
]);
root.isRoot = true;

const branchColors = buildBranchColors(root);
const res = layoutTree(root, {
  structure: "fishbone",
  branchColors,
  linkColor: "#c4c9d1",
  lineStyle: "curve",
});

let fail = 0;
const ok = (cond: boolean, label: string, extra = "") => {
  if (!cond) fail++;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log(`nodes=${res.nodes.length} links=${res.links.length} canvas=${res.width.toFixed(0)}x${res.height.toFixed(0)}`);

/* ---------- 1. 脊柱：一条水平线，起点 = 根节点右缘 ---------- */
const spine = res.links.find((l) => l.axis === "h" && l.path?.startsWith("M "));
ok(!!spine, "存在脊柱连线");
if (spine?.path) {
  const m = spine.path.match(/^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/);
  ok(!!m, "脊柱是水平两点直线", spine.path);
  if (m) {
    const [, x1, y1, x2, y2] = m.map(Number);
    ok(Math.abs(y1 - y2) < 0.01, "脊柱水平（两端 y 相同）", `y=${y1}/${y2}`);
    const rootRight = res.rootPos.x + res.rootPos.w;
    ok(Math.abs(x1 - rootRight) < 0.01, "脊柱起点 = 根节点右缘", `${x1} vs ${rootRight.toFixed(2)}`);
    ok(x2 > x1, "脊柱向右延伸", `len=${(x2 - x1).toFixed(0)}`);
  }
}

/* ---------- 2. 每根斜骨：斜率恰为 ±1 ----------
 * layoutTree 会对全部坐标做归一化（整体平移 -minX/-minY），故骨线第一点 y 未必为 0。
 * 这里只匹配「两点 + 任意 y」，斜率在归一化后仍为 ±1。 */
const bones = res.links.filter(
  (l) => l.axis === "diag" && /^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/.test(l.path ?? "")
);
ok(bones.length > 0, "存在斜骨", `count=${bones.length}`);
let upBones = 0;
let downBones = 0;
const parseBone = (p: string) => {
  const m = p.match(/^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/);
  if (!m) return null;
  const [_, jx, y0, tx, ty] = m.map(Number);
  return { jx, y0, tx, ty, s: (ty - y0) / (tx - jx) };
};
for (const b of bones) {
  const g = parseBone(b.path!);
  if (!g) {
    ok(false, "斜骨路径格式", b.path!);
    continue;
  }
  ok(Math.abs(Math.abs(g.s) - 1) < 1e-6, "斜骨斜率为 ±1（45°）", `slope=${g.s.toFixed(4)}`);
  if (g.ty < g.y0) upBones++;
  else downBones++;
}
ok(upBones === Math.ceil(root.children.length / 2), "向上骨数量 = 一级节点中的偶数位", `up=${upBones}`);
ok(downBones === Math.floor(root.children.length / 2), "向下骨数量 = 一级节点中的奇数位", `down=${downBones}`);

/* ---------- 3. 二级节点锚点全部落在所属斜骨上 ---------- */
const byDepth = (d: number) => res.nodes.filter((n) => n.depth === d);
const l2 = byDepth(2);
ok(l2.length > 0, "存在二级节点", `count=${l2.length}`);
let onBone = 0;
for (const n of l2) {
  if (n.dotDX === undefined || n.dotDY === undefined) continue;
  const ax = n.x + n.dotDX;
  const ay = n.y + n.dotDY;
  const hit = bones.some((b) => {
    const g = parseBone(b.path!);
    if (!g) return false;
    return Math.abs(ay - (g.y0 + g.s * (ax - g.jx))) < 0.51;
  });
  if (hit) onBone++;
}
ok(onBone === l2.length, "二级节点锚点均在斜骨上", `${onBone}/${l2.length}`);

/* ---------- 4. 一级节点盒被斜骨穿过左侧 1/4 ----------
 * 骨在「盒子中心高度」y = n.y + h/2 处的 x 应等于 盒左缘 + 0.25w。 */
const l1 = byDepth(1);
ok(l1.length === root.children.length, "一级节点数量 = 骨头数量", `${l1.length}`);
for (const n of l1) {
  const m = bones
    .map((b) => parseBone(b.path!)!)
    .filter(Boolean)
    .find((g) => Math.abs(g.y0 + g.s * (n.x + n.w * 0.25 - g.jx) - (n.y + n.h / 2)) < 2);
  ok(!!m, `一级「${n.node.title}」的斜骨穿过盒左 1/4`, `x=${n.x.toFixed(1)} w=${n.w.toFixed(1)}`);
}

/* ---------- 5. 括号子树：短横头 + 竖线，且逐层右缩 ---------- */
const bracket = res.links.filter((l) =>
  /^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/.test(l.path ?? "")
);
ok(bracket.length > 0, "存在括号连线（竖线 + 短横头）", `count=${bracket.length}`);
let nested = 0;
for (const n of byDepth(4)) {
  const parent = byDepth(3).find((p) => p.node.children.some((c) => c.id === n.node.id));
  if (parent && n.x > parent.x) nested++;
}
ok(nested === byDepth(4).length, "四级节点相对三级继续右缩", `${nested}/${byDepth(4).length}`);

/* ---------- 6. 兄弟节点盒不重叠（同一骨内 / 括号内） ---------- */
let overlaps = 0;
for (let i = 0; i < res.nodes.length; i++) {
  for (let j = i + 1; j < res.nodes.length; j++) {
    const a = res.nodes[i];
    const b = res.nodes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 1 && oy > 1) {
      overlaps++;
      if (overlaps <= 5) console.log(`      overlap: ${a.node.title} <-> ${b.node.title}`);
    }
  }
}
ok(overlaps === 0, "节点盒两两不重叠", `overlaps=${overlaps}`);

/* ---------- 7. 其它结构无回归 ---------- */
for (const s of ["logical-right", "logical-left", "mindmap", "org", "catalog", "timeline"] as const) {
  const r = layoutTree(root, { structure: s, branchColors, linkColor: "#c4c9d1", lineStyle: "curve" });
  ok(r.nodes.length === res.nodes.length && r.width > 0, `${s} 仍正常出图`, `${r.nodes.length} nodes ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
}

console.log(fail === 0 ? "\nALL PASS" : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
