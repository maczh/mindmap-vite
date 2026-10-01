# mindmap-vite

可编辑思维导图组件（Vite + React + TypeScript，零外部图形库）。
7 种结构 / 多主题 / 连线线型与箭头 / 节点补齐项（缩略图·标签·LaTeX 公式·外框·概要·关联线），支持
`.km` `.mm` `.smm` `.xmind` `.json` 导入与导出。

源码由寄海文库（haiku-wiki）思维导图模块导出：组件本身不依赖宿主项目，
既可 vendor 进任意 Vite/React 工程（寄海文库即如此接入），也可作为 npm 包消费。

## 安装

```bash
npm i mindmap-vite
# peerDependencies：react / react-dom（^18 || ^19）
# dependencies：jszip（读写 .xmind）、katex（渲染公式节点）
```

## 快速开始（React 18 / Vite 5）

```tsx
import { useRef } from "react";
import { MindMap, type MindMapApi, type MindNode, sampleTree } from "mindmap-vite";
import "mindmap-vite/style.css";
import "katex/dist/katex.min.css"; // 只有用到公式节点时才需要

export default function App() {
  const api = useRef<MindMapApi>(null);
  return (
    <div style={{ height: 720 }}>
      <MindMap
        ref={api}
        data={sampleTree()}
        editable
        showToolbar
        fitOnMount
        onChange={(tree) => console.log(tree)}
      />
    </div>
  );
}
```

> 样式必须显式引入 `mindmap-vite/style.css`（组件内的 `import "./MindMap.css"` 只在 vendor 进宿主的构建里生效）。
> `react-dom/server` 可对 `<MindMap />` 做 SSR 骨架渲染。

## Props

| 名称 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `data` | `MindNode` | — | 根节点数据（必填） |
| `width` / `height` | `number \| string` | `100%` | 容器尺寸 |
| `className` | `string` | — | 附加 class |
| `fitOnMount` | `boolean` | `true` | 挂载后自动适应屏幕 |
| `editable` | `boolean` | `true` | **只决定初值**，运行期切换走 `api.setMode()` |
| `showToolbar` | `boolean` | `true` | 是否渲染自带工具条 |
| `onChange` | `(tree: MindNode) => void` | — | 数据变更回调 |
| `defaultConfig` | `Partial<MindMapConfig>` | — | 初始配置（主题 / 结构 / 连线样式 / 基础样式） |
| `onScaleChange` | `(scale: number) => void` | — | 缩放变化回调 |
| `onSelectChange` | `(id: string \| null) => void` | — | 选中变化回调 |

## 命令式 API（ref）

```ts
const api: MindMapApi = ref.current!;
api.getTree();      // 取当前树
api.setTree(tree);
api.undo() / redo() / canUndo() / canRedo();
api.addChild() / addSibling() / addParent() / removeNode() / outdent();
api.select(id) / getSelectedId() / hasSelection();
api.setNodeStyle({ bold: true }) / getNodeStyle() / getTextDefaults() / setTextDefaults(p);
api.getConfig() / setConfig(patch) / setStructure(s) / setLineStyle(s) / setThemeId(t) / setBase(patch) / getBase();
api.getMode() / setMode("edit" | "readonly") / setWheelAction("zoom" | "move") / setFreeDrag(b);
api.zoomIn() / zoomOut() / fitView() / resetView() / centerRoot() / getScale() / getView() / setView({ scale, tx, ty });
api.expandAll() / collapseToDepth(d) / toggleCollapse(id);
api.setNote / getNote / setLink / getLink / setImage / getImage / setTags / getTags /
api.setFormula / getFormula / setFrame / getFrame / setGeneralization / getGeneralization /
api.setPriority / getPriority / setProgress / getProgress / getIcons / toggleIcon;
api.addAssocLine(fromId, toId, label?) / removeAssocLine(id) / getAssocLines();
api.getSvg();             // SvgPayload { svg, width, height }
api.exportPng() / exportAs(format);
api.getNodeBoxes();       // 节点几何，供宿主自定义浮层定位
```

`MindMapApi` 是宿主与组件之间**唯一**的交互面：`editable={false}` + `setMode("readonly")`
即可直接复用同一组件做「阅读 / 分享 / H5」渲染，且不渲染 `mm-ui-only` 选中环。

## 数据模型

```ts
interface MindNode {
  id: string;
  title: string;
  children: MindNode[];
  collapsed?: boolean;
  color?: string;                 // 分支强调色
  style?: MindNodeStyle;          // 字号/字体/粗斜体/下划线/删除线/颜色/填充/描边/线型/圆角/形状
  note?: string; link?: string;
  markers?: string[];             // 图标标记
  priority?: number;              // 1-9 前缀图标
  progress?: number;              // 0-10 进度饼
  icons?: string[];               // emoji 图标前缀
  /* 补齐项 */
  image?: { url: string; title?: string; width?: number; height?: number; custom?: boolean };
  tags?: string[];
  formula?: string;               // LaTeX（不含 $）
  frame?: { color?: string; label?: string };
  generalization?: { targetId: string; text?: string };
  assocLines?: { id: string; fromId: string; toId: string; label?: string; color?: string }[]; // 挂在根
}
```

其它常用导出：`layoutTree` `nodeSize` `textCenterX` `THEME_LIST` `STRUCTURES` `BORDER_DASH`
`LINK_PATTERNS` `LINK_ARROWS` `LINK_COLOR_MODES` `buildBranchColors` `measureText` `wrapText`，
以及树操作 `createNode` `cloneTree` `findNode` `findParent` `findPath` `allNodes` `visibleNodes`
`opAddChild` `opAddSibling` `opAddParent` `opDelete` `opUpdate` `opMove` `opOutdent`
`opToggleCollapse` `countNodes` `sampleTree`。

## 导入 / 导出

```ts
import { parseMindmapFile, exportTree, mapFileStructure, EXPORT_LABELS } from "mindmap-vite";

const { tree, structure } = await parseMindmapFile("a.smm", buffer);   // .km/.mm/.smm/.xmind/.json
const { blob, filename } = await exportTree(tree, "smm", api.getSvg, "我的导图");
mapFileStructure("logicalStructure"); // → "logical-right"，按文件声明的结构绘制
```

- 导入：`.km` `.mindmap`（有道扁平 / KityMinder）`.mm`（FreeMind）`.smm`（simple-mind-map 契约）
  `.xmind`（Zen / 8）`.json`
- 导出：`smm` `km` `json` `mm` `xmind` `svg` `png`
- `.xmind` 读写需要 `jszip`（动态 import，不进首屏）；公式渲染需要 `katex`

## 开发

```bash
npm i
npm run dev        # 自带 demo 站点（样例 + 有道抓取数据）
npm run build      # tsc -b + demo 生产构建
npm run build:lib  # 产出 dist-lib（ESM + UMD + style.css + d.ts）
```

库产物（与 `package.json` 的 `main/module/types/style/exports` 一一对应）：

```
dist-lib/mindmap-vite.es.js       ESM
dist-lib/mindmap-vite.umd.js      UMD（全局名 MindMapVite）
dist-lib/style.css                组件样式
dist-lib/components/MindMap/*.d.ts（tsc -p tsconfig.lib.json 生成）
```

`react` / `react-dom` / `react/jsx-runtime` 为外部依赖（peerDependencies），不进产物。

源码目录：

```
src/components/MindMap/   组件主体（MindMap.tsx / Toolbar / Popover / Dialog / Icons / Minimap / extras）
                          layout.ts 布局与度量 · theme.ts 主题 · types.ts 类型 · tree.ts 树操作
                          text.ts 文本量算 · io/ 导入导出（json / freemind / xmind）
src/data/adapter.ts       有道云笔记原始数据 ⇄ MindNode 适配
src/main.tsx + App.tsx    demo 站点
verify/                   回归测试（见下）
```

## 回归测试

```bash
npm run verify
```

自包含回归流水线：类型检查 → 库构建 → 逻辑断言（树/布局/主题/导入导出/适配，Node）
→ 产物静态校验 → 产物 SSR 消费（react-dom/server import dist-lib）→ 消费方工程构建
→ 真实 Chrome 交互（渲染/结构切换/编辑/只读/导出，附截图）。
浏览器阶段需要 `playwright-core`（`npm i -g playwright-core` 或设 `NODE_PATH`）与本机 Chrome，
可用 `PORT` 覆盖端口。

## 已知约定

- `props.editable` 只是初值：切阅读态请用 `api.setMode("readonly")`，否则只读态会残留选中环。
- 只读态不渲染 `mm-ui-only` 选中环与节点描边高亮。
- `lineStyle: "straight"` 只影响连线绘制，折点仍由布局决定。
- 时间轴结构额外含一条轴线，连线数不等于「节点数 - 1」，属预期。
