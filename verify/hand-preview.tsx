/* eslint-disable no-console */
/**
 * 手绘（双笔触）风格视觉自检：SSR 渲染一张仿参考截图的导图 → 落地 SVG。
 * 供 /tmp 下的 resvg 脚本转成 PNG 肉眼核对，不参与 npm run verify。
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MindMap } from "../src/components/MindMap";
import type { MindNode } from "../src/components/MindMap/types";

const node = (
  id: string,
  title: string,
  color: string,
  style: MindNode["style"] = {}
): MindNode => ({ id, title, color, style, children: [] });

/**
 * 仿参考截图：紫色双笔椭圆根 → 绿色「定价策略」→ 两个黄色虚线虚框；
 * 另有橙色「渠道投放」挂在一级，以及一条从根直连的关联线。
 */
const tree: MindNode = {
  id: "root",
  title: "新品发布规划",
  color: "#5b4bb5",
  style: { shape: "capsule" },
  children: [
    {
      id: "g1",
      title: "定价策略",
      color: "#2f9e63",
      style: { shape: "rect", borderStyle: "solid" },
      children: [
        node("t1", "目标客群", "#b8912a", { shape: "rect", borderStyle: "dashed" }),
        node("t2", "优惠策略", "#b8912a", { shape: "rect", borderStyle: "dashed" }),
      ],
    },
    node("c1", "渠道投放", "#e07b2c", { shape: "rect", borderStyle: "solid" }),
  ],
};

const markup = renderToStaticMarkup(
  createElement(MindMap as never, {
    data: tree,
    width: 1000,
    height: 620,
    editable: false,
    showToolbar: false,
    defaultConfig: {
      themeId: "hand-colorful",
      base: {
        linkColorMode: "single",
        borderStyle: "solid",
        linkPattern: "solid",
        linkArrow: "outward",
        branchStyle: "default",
        radius: 14,
        strokeWidth: 1.8,
        linkWidth: 1.4,
      },
    },
  })
);

const m = markup.match(/<svg[\s\S]*<\/svg>/);
if (!m) {
  console.log("NO_SVG");
  process.exit(1);
}
console.log(`SVG_LENGTH ${m[0].length}`);
process.stdout.write(m[0]);
