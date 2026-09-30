import React from "react";
import ReactDOM from "react-dom/client";
import { MindMap, type MindNode } from "../src/components/MindMap";

const mk = (title: string, children: MindNode[] = []): MindNode => ({
  id: "d" + Math.random().toString(36).slice(2, 9),
  title,
  children,
});

// 4 层深树：根 → 一级（脊柱胶囊）→ 二级 → 三级 → 四级，均应为 11px
const root = mk("海鲜火锅 · 包厢预订系统（深树）", [
  mk("桌台域", [
    mk("包厢/散台模型", [mk("物理桌台"), mk("逻辑桌台"), mk("区域分组")]),
    mk("桌台状态机", [mk("空闲→预订"), mk("预订→开台"), mk("开台→结账"), mk("结账→清台")]),
    mk("并台 / 拆台", [mk("并台规则"), mk("拆台规则")]),
  ]),
  mk("预订域", [
    mk("预订规则", [mk("时段"), mk("最低消费"), mk("超时释放")]),
    mk("定金与退订", [mk("定金"), mk("退订")]),
    mk("渠道", [mk("电话"), mk("小程序"), mk("门店")]),
  ]),
  mk("对接 baseServ", [
    mk("桌台占用同步", [mk("轮询"), mk("推送")]),
    mk("开台消息（MQ）", [mk("生产者"), mk("消费者")]),
    mk("幂等与重试", [mk("幂等键"), mk("重试策略")]),
  ]),
]);
root.isRoot = true;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MindMap
      data={root}
      defaultConfig={{ structure: "timeline" }}
      showToolbar={false}
      fitOnMount
    />
  </React.StrictMode>
);
