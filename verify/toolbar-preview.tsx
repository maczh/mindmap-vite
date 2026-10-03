/* eslint-disable no-console */
/**
 * 工具条 / 多选浮动条 / 主菜单的视觉自检页。
 * 挂到 index.html 上由 headless Chrome 截图（浏览器不可用时退回 SSR+resvg）。
 */
import { useState } from "react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MindMap } from "../src/components/MindMap";
import type { MindNode } from "../src/components/MindMap/types";
import { MultiSelectBar } from "../src/components/MindMap/MultiSelectBar";
import { MainMenu, buildMainMenu } from "../src/components/MindMap/Menu";
import "../src/components/MindMap/MindMap.css";

const n = (id: string, title: string, color: string, children: MindNode[] = []): MindNode => ({
  id,
  title,
  color,
  style: { shape: "rect" },
  children,
});

const tree: MindNode = {
  id: "root",
  title: "产品规划",
  color: "#5b4bb5",
  style: { shape: "capsule" },
  children: [
    n("a", "技术选型", "#e04a5f", [
      n("a1", "Go + Gin", "#e04a5f"),
      n("a2", "Redis 分布式锁", "#e04a5f"),
      n("a3", "MySQL 分表", "#e04a5f"),
    ]),
    n("b", "桌台域", "#2f6fed", [
      n("b1", "包厢 / 散台模型", "#2f6fed"),
      n("b2", "并台 / 拆台", "#2f6fed"),
      n("b3", "桌台状态同步", "#2f6fed"),
    ]),
  ],
};

/** 1) 正常工具条（含九宫格主菜单触发器） */
function ToolbarCase() {
  return createElement(MindMap, {
    data: tree,
    width: 1180,
    height: 300,
    editable: true,
    showToolbar: true,
    defaultConfig: { themeId: "classic-blue" },
  } as never);
}

/** 2) 多选浮动条：直接给定包围盒与变换，验证定位与三个图标 */
function MultiBarCase() {
  return createElement(
    "div",
    { style: { position: "relative", width: 560, height: 240, background: "#f7f8fa", overflow: "hidden" } },
    createElement(
      "div",
      {
        style: {
          position: "absolute",
          left: 40,
          top: 60,
          padding: "10px 14px",
          borderRadius: 8,
          background: "#fff",
          border: "1.5px dashed #2f6fed",
          color: "#1f2329",
          font: "13px sans-serif",
        },
      },
      "Redis 分布式锁（被选中）"
    ),
    createElement(
      "div",
      {
        style: {
          position: "absolute",
          left: 40,
          top: 120,
          padding: "10px 14px",
          borderRadius: 8,
          background: "#fff",
          border: "1.5px dashed #2f6fed",
          color: "#1f2329",
          font: "13px sans-serif",
        },
      },
      "MySQL 分表（被选中）"
    ),
    createElement(MultiSelectBar, {
      bounds: { x: 40, y: 55, w: 200, h: 105 },
      transform: { tx: 0, ty: 0, scale: 1 },
      onAddAssoc: () => undefined,
      onAddSummary: () => undefined,
      onAddFrame: () => undefined,
      onClear: () => undefined,
    } as never)
  );
}

/** 3) 九宫格主菜单：静态展开态（含一个二级面板），验证层级与排版 */
function MenuCase() {
  const [open] = useState(true);
  void open;
  return createElement(
    "div",
    { style: { position: "relative", width: 720, height: 430, background: "#f7f8fa" } },
    createElement(
      "div",
      { className: "mm-pop", style: { position: "absolute", left: 24, top: 16 } },
      createElement("button", { className: "mm-tb-btn is-open", title: "主菜单" }, "▦"),
      createElement(
        "div",
        {
          className: "mm-pop-panel mm-menu",
          role: "menu",
          style: { position: "absolute", top: 46, left: 0, width: 200 },
        },
        ...buildMainMenu({
          onNew: () => undefined,
          onOpen: () => undefined,
          onExport: () => undefined,
          canUndo: true,
          canRedo: false,
          onUndo: () => undefined,
          onRedo: () => undefined,
          canDelete: true,
          onDelete: () => undefined,
          onInsertParent: () => undefined,
          onInsertSiblingBefore: () => undefined,
          onInsertSiblingAfter: () => undefined,
          onInsertChild: () => undefined,
          onNote: () => undefined,
          onLink: () => undefined,
          style: {},
          onStyle: () => undefined,
          config: { themeId: "classic-blue", structure: "mindmap" } as never,
          onConfig: () => undefined,
          onBase: () => undefined,
          markers: [],
          onToggleMarker: () => undefined,
          priority: 2,
          onSetPriority: () => undefined,
          progress: 0.4,
          onSetProgress: () => undefined,
          icons: [],
          onToggleIcon: () => undefined,
        })(() => undefined).map((it) =>
          it.key === "-"
            ? createElement("div", { key: it.key, className: "mm-menu-sep" })
            : createElement(
                "button",
                {
                  key: it.key,
                  type: "button",
                  className: `mm-menu-item ${it.key === "node" ? "is-active" : ""}`,
                },
                createElement("span", null, `▤ ${it.label}`),
                it.children ? createElement("span", { className: "mm-menu-arrow" }, "›") : null
              )
        )
      )
    ),
    // 二级面板示例
    createElement(
      "div",
      {
        className: "mm-pop-panel mm-submenu",
        style: { position: "absolute", top: 60, left: 232, width: 244 },
      },
      createElement("div", { className: "mm-pop-label" }, "形状"),
      createElement(
        "div",
        { className: "mm-shape-grid" },
        ...["矩形", "圆角", "胶囊", "椭圆", "下划线", "无边框"].map((s) =>
          createElement(
            "button",
            { key: s, type: "button", className: `mm-shape-chip ${s === "圆角" ? "is-on" : ""}` },
            s
          )
        )
      ),
      createElement("div", { className: "mm-pop-label" }, "外框线型"),
      createElement(
        "div",
        { className: "mm-seg" },
        ...["实线", "虚线", "点线", "点划线"].map((s) =>
          createElement(
            "button",
            { key: s, type: "button", className: `mm-seg-btn ${s === "虚线" ? "is-on" : ""}` },
            createElement("span", { className: "mm-seg-cap" }, s)
          )
        )
      )
    )
  );
}

const CASES = {
  toolbar: ToolbarCase,
  multibar: MultiBarCase,
  menu: MenuCase,
} as const;

type Mode = keyof typeof CASES;

/** 浏览器预览入口：挂到 #root 上（Portal 浮层必须在真实浏览器里才渲染得出来）。 */
export function mount(mode: Mode): void {
  const el = document.getElementById("root");
  if (!el) return;
  createRoot(el).render(createElement(CASES[mode] ?? ToolbarCase));
}

if (typeof window !== "undefined") {
  (window as unknown as { __render__: (m: Mode) => void }).__render__ = mount;
}

/* eslint-disable no-console */
console.log(renderToStaticMarkup(createElement(CASES[(process.argv[2] || "toolbar") as Mode] ?? ToolbarCase)));
