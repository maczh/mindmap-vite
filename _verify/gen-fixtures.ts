/**
 * 生成导入夹具：把「海鲜点餐小程序接口」树导出为 .mm / .smm（多种 layout 标记），
 * 用于浏览器端复现「打开非 .km 文件」的绘制结果。
 */
import { writeFileSync } from "node:fs";
import { exportFreeMind, exportSmm } from "../src/components/MindMap/io/freemind";
import type { MindNode } from "../src/components/MindMap/types";

let n = 0;
const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "h" + ++n,
  title,
  children,
});
const chain = (titles: string[]): MindNode => {
  let node: MindNode | undefined;
  for (let i = titles.length - 1; i >= 0; i--) node = mk(titles[i], node ? [node] : []);
  return node!;
};
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
root.isRoot = true;

const dir = "/home/macro/Work/js/src/github.com/maczh/mindmap-vite/_verify";

writeFileSync(`${dir}/hxdd.mm`, exportFreeMind(root));

// .smm：结构标记分别写成 mindMap / timeline
const smmObj = JSON.parse(exportSmm(root)) as Record<string, unknown>;
const withLayout = (layout: string) => JSON.stringify({ ...smmObj, layout }, null, 2);
writeFileSync(`${dir}/hxdd-mindmap.smm`, withLayout("mindMap"));
writeFileSync(`${dir}/hxdd-timeline.smm`, withLayout("timeline"));

let count = 0;
const walk = (x: MindNode) => {
  count++;
  x.children.forEach(walk);
};
walk(root);
console.log(`生成夹具完成：${count} 个节点`);
console.log("  _verify/hxdd.mm             (FreeMind，无结构标记 → 兜底 mindmap)");
console.log("  _verify/hxdd-mindmap.smm    (layout=mindMap)");
console.log("  _verify/hxdd-timeline.smm   (layout=timeline)");
