import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MindMap,
  exportSmm,
  mapFileStructure,
  parseFreeMind,
  parseMindmapFile,
  type MindMapApi,
  type MindNode,
  type StructureType,
} from "mindmap-vite";
import "mindmap-vite/style.css";
import "katex/dist/katex.min.css";

/** 覆盖节点补齐项：缩略图 / 标签 / 公式 / 外框 / 优先级 / 进度 / 备注 / 关联线 */
function fixture(): MindNode {
  return {
    id: "root",
    title: "导出验证中心",
    children: [
      {
        id: "c1",
        title: "缩略图节点",
        children: [],
        image: {
          url:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%234f6ef7'/></svg>",
          title: "图",
        },
        tags: ["P0", "重点"],
      },
      { id: "c2", title: "公式节点", children: [], formula: "E = mc^2" },
      {
        id: "c3",
        title: "外框节点",
        children: [{ id: "c3a", title: "子一", children: [] }],
        frame: { color: "#73c991", label: "本期" },
      },
      {
        id: "c4",
        title: "待办",
        children: [],
        priority: 1,
        progress: 5,
        note: "备注",
        link: "https://example.com",
      },
      { id: "c5", title: "叶子", children: [] },
    ],
    assocLines: [{ id: "al1", fromId: "c1", toId: "c5", label: "关联", color: "#f56" }],
  };
}

export const STRUCTURES: StructureType[] = [
  "mindmap",
  "logical-right",
  "logical-left",
  "org",
  "catalog",
  "timeline",
  "fishbone",
];

const errors: string[] = [];
window.addEventListener("error", (e) => errors.push(String(e.message)));
const origError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(" "));
  origError(...args);
};

function App() {
  const apiRef = useRef<MindMapApi | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [structure, setStructureState] = useState<StructureType>("mindmap");

  useEffect(() => {
    window.__probe = {
      ready: true,
      errors,
      readonly,
      structure,
      io: { exportSmm, parseFreeMind, parseMindmapFile, mapFileStructure },
      api: (apiRef.current as MindMapApi) ?? null,
      snapshot: () => {
        const svg = document.querySelector("svg.mm-svg");
        return {
          nodeCount: document.querySelectorAll(".mm-node").length,
          linkCount: document.querySelectorAll(".mm-link").length,
          toolbarButtons: document.querySelectorAll(".mm-tb-btn").length,
          // 结构卡类名跟着 panels.tsx 走：网格容器 + 卡片，两者都要数
          structureCards: document.querySelectorAll(".mm-structure-grid .mm-structure-card").length,
          uiOnly: document.querySelectorAll(".mm-ui-only").length,
          hasSvg: !!svg,
          pathCount: svg ? svg.querySelectorAll("path").length : 0,
          imageCount: svg ? svg.querySelectorAll("image").length : 0,
          foreignObjectCount: svg ? svg.querySelectorAll("foreignObject").length : 0,
          rectWithRx: svg
            ? Array.from(svg.querySelectorAll("rect")).filter((r) => r.getAttribute("rx")).length
            : 0,
          dashedRects: svg
            ? Array.from(svg.querySelectorAll("rect")).filter((r) => r.getAttribute("stroke-dasharray"))
                .length
            : 0,
          scale: apiRef.current?.getScale() ?? 0,
          treeNodes: apiRef.current ? countTree(apiRef.current.getTree()) : 0,
          structureNow: apiRef.current?.getConfig().structure ?? "",
          mode: apiRef.current?.getMode() ?? "",
        };
      },
    };
  }, [readonly, structure]);

  return (
    <div className="app">
      <header className="bar">
        <button
          id="btn-toggle"
          type="button"
          onClick={() => {
            // props.editable 只决定初值，运行期切换走 API（与宿主 MindmapView 一致）
            const next = !readonly;
            setReadonly(next);
            apiRef.current?.setMode(next ? "readonly" : "edit");
          }}
        >
          {readonly ? "阅读态" : "编辑态"}
        </button>
        <button
          id="btn-structure"
          type="button"
          onClick={() => {
            const next = STRUCTURES[(STRUCTURES.indexOf(structure) + 1) % STRUCTURES.length];
            apiRef.current?.setStructure(next);
            setStructureState(next);
          }}
        >
          切换结构：{structure}
        </button>
        <button id="btn-add" type="button" onClick={() => apiRef.current?.addChild()}>
          加子节点
        </button>
        <button id="btn-zoom" type="button" onClick={() => apiRef.current?.zoomIn()}>
          放大
        </button>
      </header>
      <main className="main">
        <MindMap
          ref={apiRef}
          data={fixture()}
          width="100%"
          height="720"
          fitOnMount
          showToolbar
          editable={!readonly}
          defaultConfig={{ structure }}
        />
      </main>
    </div>
  );
}

function countTree(n: MindNode): number {
  return 1 + n.children.reduce((a, c) => a + countTree(c), 0);
}

declare global {
  interface Window {
    __probe?: {
      ready: boolean;
      errors: string[];
      readonly: boolean;
      structure: string;
      api: MindMapApi | null;
      snapshot: () => Record<string, unknown>;
      io: Record<string, unknown>;
    };
  }
}

createRoot(document.getElementById("root")!).render(<App />);
