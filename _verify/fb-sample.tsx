import React from "react";
import ReactDOM from "react-dom/client";
import { MindMap, type MindNode } from "../src/components/MindMap";

const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "f" + Math.random().toString(36).slice(2, 9),
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MindMap
      data={root}
      defaultConfig={{ structure: "fishbone" }}
      showToolbar={false}
      fitOnMount
    />
  </React.StrictMode>
);
