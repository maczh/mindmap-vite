/**
 * 验证「思维导图」的左/右单侧布局是否采用「全局按深度对齐的列」：
 *   pitch[d] = Σ_{dd<d} (该深度的最大节点宽 + H_GAP)
 * 若成立，则**任一深度的某个超宽节点**会把该深度之后的所有列整体推远，
 * 使其它分支的深层节点被动产生巨大水平间隙 → 长弧线扫过、画布过宽。
 */
import { layoutTree, nodeSize } from "../src/components/MindMap/layout";
import type { MindNode } from "../src/components/MindMap/types";

let n = 0;
const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "c" + ++n,
  title,
  children,
});
const chain = (titles: string[]): MindNode => {
  let node: MindNode | undefined;
  for (let i = titles.length - 1; i >= 0; i--) node = mk(titles[i], node ? [node] : []);
  return node!;
};

const WIDE = "resource/path/{id}/{path}/{id}/{name}/{type}/getResource?index=change_log";
const root1 = mk("根", [chain(["A", "a1", "a2", "a3", "a4"]), chain(["B", "b1", "b2", "b3", "b4"])]);
const root2 = mk("根", [
  chain(["A", "a1", "a2", "a3", "a4"]),
  mk("W", [mk(WIDE)]),
  chain(["B", "b1", "b2", "b3", "b4"]),
]);

function report(tag: string, root: MindNode) {
  const L = layoutTree(root, {
    structure: "mindmap",
    branchColors: new Map<string, string>(),
    linkColor: "#000",
    lineStyle: "curve",
  });
  const byDepth = new Map<number, number[]>();
  for (const p of L.nodes) (byDepth.get(p.depth) ?? byDepth.set(p.depth, []).get(p.depth)!).push(p);
  console.log(`── ${tag} ──  画布 ${L.width.toFixed(0)}×${L.height.toFixed(0)}`);
  for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
    const list = byDepth.get(d)!;
    const xs = [...new Set(list.map((p) => Math.round(p.x)))];
    const titles = list.map((p) => p.node.title.slice(0, 8));
    const maxW = Math.max(...list.map((p) => nodeSize(p.node).w));
    console.log(
      `  深度 ${d}: 节点×${list.length}  x 取值 ${JSON.stringify(xs)}  本层最宽 ${maxW.toFixed(0)}  「${titles.join(" / ")}」`
    );
  }
  console.log();
}

report("无超宽节点", root1);
report("含 1 个超宽节点（W 的分支）", root2);
