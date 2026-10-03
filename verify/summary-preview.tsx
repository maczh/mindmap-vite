/* eslint-disable no-console */
/**
 * 概要（summary）几何视觉自检：SSR 渲染一张仿用户截图 1 的导图 → 落地 SVG。
 * 左边一组、右边一组，验证括号是否「贯穿整组 + 腰部朝概要框 + 框贴住腰部」。
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MindMap } from "../src/components/MindMap";
import type { MindNode } from "../src/components/MindMap/types";

const n = (id: string, title: string, color: string, children: MindNode[] = []): MindNode => ({
  id,
  title,
  color,
  style: { shape: "rect" },
  children,
});

const tree: MindNode = {
  id: "root",
  title: "海鲜火锅 · 包厢预订系统",
  color: "#5b4bb5",
  style: { shape: "capsule" },
  children: [
    n("reserve", "预订域", "#2f9e63", [
      n("r1", "预订规则：时段、最低消费、超时释放", "#2f9e63"),
      n("r2", "定金与退订", "#2f9e63"),
      n("r3", "渠道：电话 / 小程序 / 门店", "#2f9e63"),
    ]),
    n("tech", "技术选型", "#e04a5f", [
      n("t1", "Go + Gin", "#e04a5f"),
      n("t2", "Redis 分布式锁", "#e04a5f"),
      n("t3", "MySQL 分表", "#e04a5f"),
    ]),
    n("table", "桌台域", "#2f6fed", [
      n("d1", "包厢/散台模型", "#2f6fed"),
      n("d2", "桌台状态说明", "#2f6fed"),
      n("d3", "并台 / 拆台", "#2f6fed"),
    ]),
    n("srv", "对接 baseServ", "#e07b2c", [
      n("s1", "桌台占用同步", "#e07b2c"),
      n("s2", "开台消息（MQ）", "#e07b2c"),
      n("s3", "幂等与重试", "#e07b2c"),
    ]),
    n("todo", "待办", "#8b5cf6", [n("w1", "压测：高峰期并发预订", "#8b5cf6"), n("w2", "对账：定金流水", "#8b5cf6")]),
  ],
  summaryGroups: [
    // 左侧一组（技术选型 的子节点，父节点在其右）→ 概要应继续往**左**外侧（用户截图 1）
    { id: "sg-l", nodeIds: ["t1", "t2", "t3"], text: "概要" },
    // 右侧一组（桌台域 的子节点，父节点在其左）→ 概要应继续往**右**外侧（用户截图 2 的镜像）
    { id: "sg-r", nodeIds: ["d1", "d2", "d3"], text: "概要" },
  ],
};

const theme = process.argv[2] || "classic-blue";
const markup = renderToStaticMarkup(
  createElement(MindMap as never, {
    data: tree,
    width: 1280,
    height: 560,
    editable: false,
    showToolbar: false,
    defaultConfig: { themeId: theme },
  })
);

const m = markup.match(/<svg[\s\S]*<\/svg>/);
if (!m) {
  console.log("NO_SVG");
  process.exit(1);
}
console.log(`SVG_LENGTH ${m[0].length}`);
process.stdout.write(m[0]);
