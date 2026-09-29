import { useMemo, useState } from "react";
import { MindMap, countNodes, sampleTree, type MindNode } from "./components/MindMap";
import { adaptYoudaoMindmap, type YoudaoMindmap } from "./data/adapter";
import raw from "./data/youdaoMindmap.raw.json";

/** 从有道云笔记抓取的真实思维导图数据 */
const youdaoTree = adaptYoudaoMindmap(raw as unknown as YoudaoMindmap);

const SOURCES = [
  { key: "sample", label: "示例导图（海鲜火锅包厢预订）" },
  { key: "youdao", label: "有道云笔记抓取的导图" },
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

export default function App() {
  const [source, setSource] = useState<SourceKey>("sample");
  const [seed, setSeed] = useState(0);

  const data = useMemo<MindNode>(
    () => (source === "sample" ? sampleTree() : youdaoTree),
    // seed 变化时重新生成示例树，便于一键还原
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, seed]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>思维导图编辑器</h1>
          <p>
            Vite + React 可编辑脑图组件 · 支持 Tab/Enter/双击编辑 · 读写
            .km / .mindmap / .mm / .smm / .xmind
          </p>
        </div>
        <div className="app-actions">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`app-tab ${source === s.key ? "is-on" : ""}`}
              onClick={() => {
                if (s.key === source) setSeed((v) => v + 1);
                else setSource(s.key);
              }}
            >
              {s.label}
            </button>
          ))}
          <span className="app-meta">{countNodes(data)} 个节点</span>
        </div>
      </header>
      <main className="app-main">
        <MindMap data={data} />
      </main>
    </div>
  );
}
