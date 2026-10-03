/* eslint-disable no-console */
/**
 * 概要几何回归断言（对齐用户参考截图 3 / 4 的形状 + 截图 1 / 2 的方向）。
 * 运行：
 *   ./node_modules/.bin/esbuild verify/summary-geom.ts --bundle --platform=node \
 *     --format=cjs --outfile=verify/.tmp/sumgeom.cjs
 *   node verify/.tmp/sumgeom.cjs
 */
import { commonAncestorCx, summaryGroupGeom } from "../src/components/MindMap/extras";
import type { Box } from "../src/components/MindMap/extras";

let failed = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (!cond) failed += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

interface Pt {
  x: number;
  y: number;
}
interface N {
  id: string;
  children: N[];
}

/** 解析 `M/L/C` 路径：锚点（断点）与贝塞尔控制点分开返回 */
function parsePath(d: string): { anchors: Pt[]; ctrl: Pt[] } {
  const anchors: Pt[] = [];
  const ctrl: Pt[] = [];
  const re = /([MLC])\s*(-?[\d.,\se-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1].toUpperCase();
    const n = (m[2].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (cmd === "C") {
      ctrl.push({ x: n[0], y: n[1] }, { x: n[2], y: n[3] });
      anchors.push({ x: n[4], y: n[5] });
    } else {
      anchors.push({ x: n[0], y: n[1] });
    }
  }
  return { anchors, ctrl };
}

const bx = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const n = (id: string, children: N[] = []): N => ({ id, children });

/* =================================================================== *
 * 1. 方向判据：commonAncestorCx
 * =================================================================== */

/* 仿用户截图：root → tech(左) → t1/t2/t3 ；root → srv(右) → s1/s2/s3 */
const tree: N = n("root", [
  n("tech", [n("t1"), n("t2"), n("t3")]),
  n("srv", [n("s1"), n("s2"), n("s3")]),
]);
const boxes = new Map<string, Box>([
  ["root", bx(400, 200, 160, 50)],
  ["tech", bx(180, 120, 120, 44)], // 父节点在右侧
  ["t1", bx(20, 60, 120, 40)],
  ["t2", bx(20, 120, 120, 40)],
  ["t3", bx(20, 180, 120, 40)],
  ["srv", bx(640, 240, 140, 44)], // 父节点在左侧
  ["s1", bx(840, 190, 140, 40)],
  ["s2", bx(840, 240, 140, 40)],
  ["s3", bx(840, 290, 140, 40)],
]);

ok("LCA(技术选型的子节点) = tech 中心", commonAncestorCx(tree, ["t1", "t2", "t3"], boxes) === 240);
ok("LCA(baseServ 的子节点) = srv 中心", commonAncestorCx(tree, ["s1", "s2"], boxes) === 710);
ok(
  "LCA(跨左右两大组) = root 中心",
  commonAncestorCx(tree, ["t1", "s1"], boxes) === 480
);
ok("LCA(单个节点) = 其父节点", commonAncestorCx(tree, ["t1"], boxes) === 240);
ok("id 不在树里 → null", commonAncestorCx(tree, ["nope"], boxes) === null);
ok("空集合 → null", commonAncestorCx(tree, [], boxes) === null);
ok(
  "选「父 + 自己的子」→ 锚点上浮一级（不会被自己锚住）",
  commonAncestorCx(tree, ["tech", "t1", "t2"], boxes) === 480
);

/* =================================================================== *
 * 2. 方向：朝分支外侧延伸（用户截图 1 / 2）
 * =================================================================== */

const L = summaryGroupGeom(["t1", "t2", "t3"], boxes, "概要", "#000", boxes, 240)!;
ok("父节点在右 → 被选组在左 → side=-1（概要去左侧外侧）", L.side === -1, `side=${L.side}`);
ok("概要框落在被选组左缘之外", L.box.x + L.box.w < 20, `boxRight=${L.box.x + L.box.w}`);
ok(
  "概要框不会压到父节点 tech",
  L.box.x + L.box.w < 180,
  `boxRight=${L.box.x + L.box.w} techLeft=180`
);

const R = summaryGroupGeom(["s1", "s2", "s3"], boxes, "概要", "#000", boxes, 710)!;
ok("父节点在左 → 被选组在右 → side=1（概要去右侧外侧）", R.side === 1, `side=${R.side}`);
ok("概要框落在被选组右缘之外", R.box.x > 980, `boxLeft=${R.box.x}`);
ok(
  "概要框不会压到父节点 srv",
  R.box.x > 780,
  `boxLeft=${R.box.x} srvRight=780`
);

/* 不传 parentCx 时退回画布中心判据（画布 0..980，中心 490） */
const C = summaryGroupGeom(["s1", "s2", "s3"], boxes, "概要", "#000", boxes, null)!;
ok("parentCx=null → 退回画布中心，右侧组仍朝右外侧", C.side === 1, `side=${C.side}`);

/* =================================================================== *
 * 3. 形状（对齐参考截图 3 / 4）
 * =================================================================== */

const rp = parsePath(R.brace);
const rTipX = rp.anchors[0].x;
const rBellyX = Math.max(...rp.anchors.concat(rp.ctrl).map((p) => p.x));
ok("括号尖端贴在节点组外缘之外（右侧）", rTipX > 980, `tipX=${rTipX}`);
ok("弧线腰部朝概要框鼓出（更靠右）", rBellyX > rTipX, `belly=${rBellyX} tip=${rTipX}`);
ok("弧线两端点（尖端）朝向被选节点一侧", rTipX < rBellyX);
ok("括号贯穿整组：上尖=首节点中心 210，下尖=末节点中心 310", Math.abs(rp.anchors[0].y - 210) < 1 && Math.abs(rp.anchors[2].y - 310) < 1, `y0=${rp.anchors[0].y} y1=${rp.anchors[2].y}`);
// 「一条单弧」的关键：腰部中点必须**落在鼓包处**，不能内凹回尖端
ok("腰部中点 = 鼓包位置（单弧，非双瓣）", Math.abs(rp.anchors[1].x - rBellyX) < 0.01, `mid=${rp.anchors[1].x} belly=${rBellyX}`);
ok("引线连着概要文字：框内边缘 = 腰部 + 20", Math.abs(R.box.x - rBellyX - 20) < 0.01);
ok("概要框垂直居中于括号", Math.abs(R.box.y + R.box.h / 2 - 260) < 0.01);

const lp = parsePath(L.brace);
const lTipX = lp.anchors[0].x;
const lBellyX = Math.min(...lp.anchors.concat(lp.ctrl).map((p) => p.x));
ok("括号尖端贴在节点组外缘之外（左侧）", lTipX < 20, `tipX=${lTipX}`);
ok("弧线腰部朝概要框鼓出（更靠左）", lBellyX < lTipX, `belly=${lBellyX} tip=${lTipX}`);
ok("弧线两端点（尖端）朝向被选节点一侧", lTipX > lBellyX);
ok("腰部中点 = 鼓包位置（单弧，非双瓣）", Math.abs(lp.anchors[1].x - lBellyX) < 0.01, `mid=${lp.anchors[1].x} belly=${lBellyX}`);
ok(
  "括号贯穿整组：上尖=80，下尖=200",
  Math.abs(lp.anchors[0].y - 80) < 1 && Math.abs(lp.anchors[2].y - 200) < 1,
  `y0=${lp.anchors[0].y} y1=${lp.anchors[2].y}`
);
ok("引线连着概要文字：框外边缘 = 腰部 - 20", Math.abs(lBellyX - (L.box.x + L.box.w) - 20) < 0.01);
ok("概要框垂直居中于括号", Math.abs(L.box.y + L.box.h / 2 - 140) < 0.01);

/* 单节点退化 */
const S = summaryGroupGeom(["s2"], boxes, "概要", "#000", boxes, 710)!;
const sp = parsePath(S.brace);
ok("单节点组不返回 null", !!S);
ok(
  "单节点组括号高度 ≈ 24",
  Math.abs(sp.anchors[2].y - sp.anchors[0].y - 24) < 0.01,
  `h=${sp.anchors[2].y - sp.anchors[0].y}`
);

/* 确定性 & 健壮性 */
const R2 = summaryGroupGeom(["s1", "s2", "s3"], boxes, "概要", "#000", boxes, 710)!;
ok(
  "确定性：同输入两次调用完全一致",
  R.brace === R2.brace && R.box.x === R2.box.x && R.box.y === R2.box.y
);
ok("空组返回 null", summaryGroupGeom([], boxes, "概要", "#000", boxes, 240) === null);
ok("不存在的 id 返回 null", summaryGroupGeom(["zzz"], boxes, "概要", "#000", boxes, 240) === null);
ok("不传 allPos（无避让表）也能算", !!summaryGroupGeom(["t1", "t2"], boxes, "概要", "#000", undefined, 240));

console.log(failed ? `\n${failed} 项失败` : "\n全部通过");
process.exit(failed ? 1 : 0);
