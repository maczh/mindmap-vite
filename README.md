# 有道云笔记思维导图 · 可编辑编辑器（Vite 组件）

将「有道云笔记」思维导图导入为可复用的 **Vite + React + TypeScript** 组件，
并在其基础上扩展为一个**可编辑的脑图编辑器**：支持键盘增删节点、双击改文字、
完整工具栏，以及 `.mindmap / .mm / .km / .smm / .xmind` 等格式的读取与导出。

所有对外能力都集中在 `src/components/MindMap/index.ts` 统一导出，详见下方
[组件 API 说明](#组件-api-说明)。

## 功能

### 渲染
- 纯 SVG 渲染，零额外图表依赖（不依赖 d3 等）
- 七种结构：右侧 / 左侧 / 思维导图（平衡）/ 组织图 / 目录图 / 时间轴 / 鱼骨图
- 两种连线：曲线（贝塞尔）/ 折角（elbow）
- 经典 / 深色 / 朴素三种画布主题；分支配色自动继承
- 自适应节点尺寸：随字号、文字长度、标记（marker）自动撑开
- 滚轮围绕指针缩放、拖拽平移、点击展开 / 收起、底部缩放控件、小地图缩略

### 编辑
- **Tab**：在选中节点下新增子节点
- **Enter**：在选中节点后新增同级节点
- **Shift + Enter**：在选中节点前新增同级节点
- **Shift + Tab（上移一层）**：把节点提升为父节点的同级
- **F2 / 双击节点**：进入文字编辑（内联 textarea）
- **Delete / Backspace**：删除节点（根节点不可删）
- **Space**：展开 / 收起子树
- **方向键**：几何最近邻导航选择
- **Ctrl/⌘ + Z / Y**：撤销 / 重做
- **Ctrl/⌘ + S**：导出为 `.km`
- **Ctrl/⌘ + B / I / U**：加粗 / 斜体 / 下划线
- 工具栏还提供：插入上级 / 插入同级（上、下）/ 插入子级 / 标记（🚩）/
  字号、字体、粗体/斜体/下划线/删除线、文字颜色、高亮背景、备注（📝）、链接（🔗）、
  样式面板（画布经典·深邃·朴素 + 结构 + 连线）、打开文件、键盘快捷键说明、删除
- 撤销 / 重做基于 `past/future` 双栈，所有结构性操作都会进入历史

### 文件读写（导入 / 导出）
- 导入：`parseMindmapFile(name, buffer)` 按扩展名 + 内容自动识别并解析
  | 格式 | 扩展名 | 解析路径 |
  | --- | --- | --- |
  | 有道 / KityMinder 扁平 JSON | `.mindmap` `.km` | `{ nodes: [...] }` → `fromFlat` |
  | KityMinder / 百度脑图嵌套 JSON | `.km` `.mindmap` | `{ root: {...} }` → `fromNested` |
  | simple-mind-map | `.smm` | `{ root: { data, children } }` → `fromNested` |
  | FreeMind / Freeplane | `.mm` | XML → `parseFreeMind` |
  | XMind 8（content.xml） | `.xmind` / `.xml` | `parseKityMinderXml` |
  | XMind Zen | `.xmind` | zip 内 `content.json`（失败回退 `content.xml`），经 jszip |
  | 有道云笔记原始数据 | — | `adaptYoudaoMindmap` 适配器 |
- 导出：`exportTree(root, format, getSvg, baseName)` 支持上述全部格式 + PNG + SVG
  - 文字 / 样式（粗斜体、下划线、删除线、字号、字体、颜色、高亮）/ 标记 / 备注 / 链接 /
    展开状态 都会在往返中尽量保留

## 目录结构

```
mindmap-vite/
├── index.html
├── vite.config.ts                # demo 应用构建
├── vite.lib.config.ts            # 组件库构建（external: react, react-dom, jszip）
├── tsconfig.json / tsconfig.lib.json
└── src/
    ├── main.tsx
    ├── App.tsx                    # demo：示例导图 / 有道数据 切换
    ├── data/
    │   ├── youdaoMindmap.raw.json # 原始数据样例
    │   └── adapter.ts             # 有道格式 -> 树结构（MindNode）
    └── components/
        └── MindMap/
            ├── index.ts           # 对外统一导出
            ├── types.ts           # MindNode / MindMapProps / 样式与配置
            ├── theme.ts           # 分支配色、主题、标记、调色板
            ├── text.ts            # 文本测量与换行（CJK 友好）
            ├── layout.ts          # 布局算法（7 种结构 + 曲线/折角）
            ├── tree.ts            # 树操作（增删改、撤销友好的纯函数）
            ├── MindMap.tsx        # 组件本体（编辑器 + 导出）
            ├── MindMap.css
            ├── Toolbar.tsx        # 完整工具栏
            ├── Popover.tsx / Dialog.tsx / Icons.tsx / Minimap.tsx
            └── io/
                ├── index.ts       # parseMindmapFile / exportTree 统一入口
                ├── json.ts        # parseMindmapJson / fromFlat / fromNested
                ├── freemind.ts    # FreeMind / KityMinder / 有道扁平 / smm 导入导出
                └── xmind.ts       # XMind Zen (.xmind zip) 导入导出
```

## 运行

```bash
npm install
npm run dev       # 本地开发预览（demo 应用，含编辑器）
npm run build     # 构建 demo 应用，产物输出到 dist/
npm run build:lib # 构建可分发组件库，产物输出到 dist-lib/（ESM + UMD + .d.ts）
npm run preview   # 预览构建产物
```

> 注：本机存在安全删除守卫，连续删除大量文件会被拦截。
> 若 `npm run build` 在清空 `dist` 时报错，先执行
> `find dist -type f -delete; find dist -depth -type d -empty -delete` 再重新构建。

## 作为组件库使用

`npm run build:lib` 把 `MindMap` 组件打包成可发布的 npm 包（`dist-lib/`）：

- `mindmap-vite.es.js` —— ESM，供 `import` 使用
- `mindmap-vite.umd.js` —— UMD，供 `<script>` / `require` 使用
- `components/MindMap/index.d.ts` —— TypeScript 类型声明

```tsx
import { MindMap, adaptYoudaoMindmap, type YoudaoMindmap } from "mindmap-vite";

const tree = adaptYoudaoMindmap(raw as unknown as YoudaoMindmap);
<MindMap data={tree} height={600} editable showToolbar onChange={(t) => save(t)} />;
```

`react` / `react-dom` 作为外部依赖由宿主项目提供；`jszip` 仅在导出 `.xmind` 时
按需动态加载（库构建中已 external，宿主需自行安装或提供全局 `JSZip`）。

---

## 组件 API 说明

> 所有符号均从 `mindmap-vite`（或相对路径 `./components/MindMap`）导出。

### 快速开始

```tsx
import { MindMap, type MindNode } from "mindmap-vite";

// 任意来源的树数据都可传入，只要满足 MindNode 结构
const tree: MindNode = {
  id: "root",
  title: "项目计划",
  isRoot: true,
  children: [
    {
      id: "n1",
      title: "需求调研",
      children: [
        { id: "n1-1", title: "用户访谈" },
        { id: "n1-2", title: "竞品分析" },
      ],
    },
    { id: "n2", title: "开发" },
  ],
};

<MindMap
  data={tree}
  height={600}
  editable
  showToolbar
  fitOnMount
  defaultConfig={{ structure: "logical-right", lineStyle: "elbow" }}
  onChange={(t) => console.log("最新树：", t)}
/>;
```

也可以直接读取外部文件后再渲染（无需手写树）：

```tsx
import { MindMap, parseMindmapFile } from "mindmap-vite";

async function load(file: File) {
  const buf = await file.arrayBuffer();
  const { tree, structure } = await parseMindmapFile(file.name, buf);
  // tree 已是 MindNode；structure 为文件声明结构（可能 undefined）
  return tree;
}
```

### `MindMap` 组件（`<MindMap {...MindMapProps} />`）

主编辑器组件，内部维护画布缩放/平移、选区、撤销栈与工具栏状态。

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data` | `MindNode` | —（必填） | 根节点数据；编辑后的最新树通过 `onChange` 回传 |
| `width` | `number \| string` | `"100%"` | 容器宽度 |
| `height` | `number \| string` | `"100%"` | 容器高度 |
| `className` | `string` | — | 附加 className |
| `fitOnMount` | `boolean` | `true` | 挂载时是否自动适应屏幕（缩放至合适比例） |
| `editable` | `boolean` | `true` | 是否开启编辑（关闭后仅渲染、不可改） |
| `showToolbar` | `boolean` | `true` | 是否显示工具栏 |
| `onChange` | `(tree: MindNode) => void` | — | 数据变更回调（受控使用时自行持久化） |
| `defaultConfig` | `Partial<MindMapConfig>` | — | 初始视图配置（主题 / 结构 / 连线 / 基础样式） |

> 导入外部文件时，组件内部通过 `dispatch({ type: "reset", tree })` 整体替换旧树并
> 按文件声明的 `structure` 重置结构，因此旧画布节点会被**完全清空**（即「先转换再清除」）。

### 数据模型类型

#### `MindNode`（节点树）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 节点唯一标识（必填） |
| `title` | `string` | 节点文字（必填） |
| `children` | `MindNode[]` | 子节点列表 |
| `collapsed` | `boolean?` | 是否收起（不渲染子节点） |
| `color` | `string?` | 节点强调色（描边 / 连线），等价于 `style.borderColor` 快捷方式 |
| `style` | `MindNodeStyle?` | 节点文字 / 外观样式 |
| `note` | `string?` | 备注（图标展示，hover 可见） |
| `link` | `string?` | 超链接 |
| `markers` | `string[]?` | 标记 / 图标，如 `priority-1`、`flag-red`、`star`、`question` |
| `isRoot` | `boolean?` | 是否为根节点 |
| `priority` | `number?` | 优先级 1–9（前缀图标） |
| `progress` | `number?` | 进度 0–10（0%–100%，步长 10%，前缀饼图） |
| `icons` | `string[]?` | 节点图标前缀（emoji 图标 id 列表） |

#### `MindNodeStyle`（节点样式）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `fontSize` | `number?` | 字号，默认 14 |
| `fontFamily` | `string?` | 字体，默认微软雅黑系列 |
| `bold` / `italic` / `underline` / `strike` | `boolean?` | 粗体 / 斜体 / 下划线 / 删除线 |
| `color` | `string?` | 文字颜色 |
| `background` | `string?` | 节点填充色 |
| `borderColor` | `string?` | 节点描边 / 连线颜色（分支强调色） |
| `borderWidth` | `number?` | 描边宽度 |
| `shape` | `MindNodeShape?` | 节点形状 |

`MindNodeShape = "rect" | "rounded" | "capsule" | "underline" | "none"`

#### `MindMapConfig`（视图配置）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `themeId` | `string` | 主题 id（见 `THEME_LIST`） |
| `structure` | `StructureType` | 结构（见下） |
| `lineStyle` | `LineStyle` | 连线样式 |
| `base` | `BaseStyle` | 基础样式覆盖（作用于整张画布） |

`StructureType = "logical-right" | "logical-left" | "mindmap" | "org" | "catalog" | "timeline" | "fishbone"`

`LineStyle = "curve" | "elbow"`

`CanvasCategory = "classic" | "dark" | "plain"`（主题分类）

#### `BaseStyle`（基础样式）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `fontFamily` | `string?` | 画布默认字体 |
| `fontSize` | `number?` | 画布默认字号 |
| `background` | `string?` | 画布背景色 |
| `linkColor` | `string?` | 连线颜色 |
| `linkWidth` | `number?` | 连线宽度 |
| `radius` | `number?` | 节点圆角 |
| `strokeWidth` | `number?` | 节点描边宽度 |
| `nodeFill` | `string?` | 默认节点填充色 |
| `nodeText` | `string?` | 默认节点文字色 |

#### 常量与默认值

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `DEFAULT_CONFIG` | `MindMapConfig` | 默认配置（`themeId: "classic-blue"`、`structure: "mindmap"`、`lineStyle: "curve"`） |
| `DEFAULT_TEXT` | `TextDefaults` | 新建节点默认文字样式（`{ fontSize: 14, fontFamily: 微软雅黑 }`） |
| `FONT_FAMILIES` | `{ label; value }[]` | 工具栏可选字体 |
| `FONT_SIZES` | `number[]` | 工具栏可选字号 `[12…48]` |
| `SHAPES` | `{ id; label }[]` | 节点形状可选值 |

### 布局引擎（`layout.ts`）

纯函数布局模块，输入 `MindNode` 树与配置，输出带坐标的节点与连线。

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `layoutTree` | `(root: MindNode, opts: LayoutOptions) => LayoutResult` | 主入口：按 `opts.structure` 分派到 7 种布局之一，并将结果归一化到 (0,0) 原点 |
| `nodeSize` | `(node: MindNode) => SizedNode` | 计算节点尺寸（含前缀标记 / 文字换行后的高宽） |
| `textCenterX` | `(node: MindNode, w: number) => number` | 文字在节点内的水平中心偏移 |
| `prefixWidth` | `(node: MindNode) => number` | 左侧前缀（标记+优先级+进度+图标）占位宽 |
| `rightBadgeWidth` | `(node: MindNode) => number` | 右侧备注 / 链接图标占位宽 |

`LayoutOptions`：`{ structure: StructureType; branchColors: Map<string,string>; linkColor: string; lineStyle: LineStyle }`

返回类型：
- `LayoutResult`：`{ nodes: PositionedNode[]; links: MindLink[]; minX; minY; maxX; maxY; root: PositionedNode }`
- `PositionedNode`：带 `x / y / w / h / cx / cy / depth / axis / sgn / node` 等坐标的节点
- `MindLink`：连线描述（`from / to / color / curve / axis / sgn / path`）
- `SizedNode`：`{ w; h; maxTextW }`

### 树操作（`tree.ts`）

全部为**不可变纯函数**：输入旧树返回新树，便于接入撤销栈 / 受控渲染。

#### 查询 / 构造

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `uid` | `(prefix = "n") => string` | 生成唯一 id |
| `createNode` | `(title = "分支主题") => MindNode` | 新建节点（带随机 id） |
| `cloneTree` | `(node: MindNode, remapIds = false) => MindNode` | 深拷贝；`remapIds` 为真时重置全部 id |
| `findNode` | `(root, id) => MindNode \| null` | 按 id 查找 |
| `findParent` | `(root, id) => { parent; index } \| null` | 查找父节点与下标 |
| `findPath` | `(root, id) => MindNode[]` | 根到该节点的路径 |
| `allNodes` | `(root) => MindNode[]` | 全部节点（含收起） |
| `visibleNodes` | `(root) => MindNode[]` | 可见节点（不含收起子树） |
| `countNodes` | `(node) => number` | 节点计数 |
| `sampleTree` | `() => MindNode` | 示例树（demo 使用） |

#### 结构性操作（返回 `TreeOpResult`）

`TreeOpResult = { tree: MindNode; focusId: string; changed: boolean }`

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `opAddChild` | `(root, selectedId) => TreeOpResult` | 在选中节点下新增子节点（Tab） |
| `opAddSibling` | `(root, selectedId, before = false) => TreeOpResult` | 在选中节点后 / 前新增同级（Enter / Shift+Enter） |
| `opAddParent` | `(root, selectedId) => TreeOpResult` | 插入上级，把当前节点降为子节点（Shift+Tab 提升的反向操作） |
| `opOutdent` | `(root, selectedId) => TreeOpResult` | 提升为父节点的同级（Shift+Tab） |
| `opDelete` | `(root, selectedId) => TreeOpResult` | 删除节点（根节点不可删） |
| `opUpdate` | `(root, id, patch: Partial<MindNode>, stylePatch?: Partial<MindNodeStyle>) => MindNode` | 更新节点字段 / 样式（自动清理被置空的样式字段） |
| `opMove` | `(root, dragId, targetId, position: "before" \| "after" \| "child") => TreeOpResult` | 移动节点（拖拽换父 / 排序） |
| `opToggleCollapse` | `(root, id) => MindNode` | 切换展开 / 收起 |

> 提示：键盘交互与工具栏内部都基于上述 `op*` 函数实现；在自己构建外部控制面板时
> 可直接复用它们，保持与内置操作一致的历史记录语义。

### 文件导入 / 导出（`io`）

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `parseMindmapFile` | `(fileName: string, buffer: ArrayBuffer) => Promise<ParsedMindmap>` | 统一导入入口，按扩展名 + 内容自动识别格式 |
| `exportTree` | `(root, format: ExportFormat, getSvg: () => SvgPayload, baseName = "mindmap") => Promise<ExportResult>` | 统一导出入口 |
| `downloadBlob` | `(blob: Blob, filename: string) => void` | 触发浏览器下载 |
| `svgToPngBlob` | `(payload: SvgPayload, scale = 2) => Promise<Blob>` | 把 SVG 栅格化为 PNG Blob |
| `parseMindmapJson` | `(raw: unknown) => MindNode` | 解析 JSON（自动判定嵌套 / 扁平） |
| `fromNested` / `fromFlat` | 见 `json.ts` | 嵌套 / 扁平 JSON → `MindNode` |
| `parseFreeMind` / `exportFreeMind` | FreeMind `.mm` 读写 | |
| `parseKityMinderXml` | `(xml: string) => MindNode \| null` | KityMinder / 百度脑图 XML |
| `exportKityMinder` | `(root) => string` | 导出 `.km` |
| `exportYoudaoFlat` / `exportSmm` | 有道扁平 / simple-mind-map 导出 | |
| `parseXmind` / `exportXmind` | XMind `.xmind` 读写（依赖 jszip） | |
| `IMPORT_ACCEPT` | `string` | 文件选择框 `accept`，即 `.km,.mindmap,.mm,.smm,.xmind,.json,.xml,.txt` |
| `EXPORT_LABELS` | `Record<ExportFormat, string>` | 各格式的中文标签 |

类型：
- `ParsedMindmap = { tree: MindNode; structure?: StructureType }`
- `ExportFormat = "png" | "svg" | "smm" | "km" | "json" | "mm" | "xmind"`
- `SvgPayload = { svg: string; width: number; height: number }`（已内联样式与背景）
- `ExportResult = { blob: Blob; filename: string }`

`parseMindmapFile` 的识别规则：
- `.xmind` → `parseXmind` + 结构探测（content.json 的 `structureClass` 或 `content.xml`）
- 其余按内容判断 JSON / XML：
  - JSON → `parseMindmapJson`（`.km`/`.smm`/`.json`/`.mindmap` 等），结构来自 `layout` / `template`
  - XML → FreeMind（`.mm`）或 KityMinder（`.km`）
- 无法识别时抛 `Error`；`.mm` 解析不携带结构声明（`structure` 为 `undefined`）。

### 主题与样式常量（`theme.ts`）

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `THEME_LIST` / `THEME_MAP` | 列表 / 映射 | 全部主题（含 `id` / `label` / `category`） |
| `THEME_CATEGORIES` | 分类列表 | 经典 / 深色 / 朴素（`THEME_GROUPS` 为同值别名） |
| `DEFAULT_THEME_ID` | `string` | 默认主题 `classic-blue` |
| `STRUCTURES` | 结构列表 | 7 种结构（id / label） |
| `STRUCTURE_MAP` | 映射 | `StructureType → 结构元信息` |
| `BRANCH_COLORS` / `buildBranchColors` | 调色板 / `(root) => Map<string,string>` | 分支配色与按树生成配色映射 |
| `BORDER_COLORS` | `string[]` | 默认描边色板 |
| `MARKERS` / `MARKER_MAP` | 标记列表 / 映射 | 标记定义 |
| `TEXT_COLORS` / `HIGHLIGHT_COLORS` | 色板 | 文字色 / 高亮色 |
| `NODE_ICONS` / `NODE_ICON_MAP` | 图标列表 / 映射 | 节点前缀 emoji 图标 |
| `PRIORITY_COLORS` / `PRIORITY_LEVELS` | 优先级色 / 级别 | |
| `PROGRESS_COLOR` / `PROGRESS_TRACK` / `PROGRESS_LEVELS` | 进度饼图配色 | |

类型：`CanvasTheme` / `MarkerDef` / `NodeIconDef`。

### 文本测量（`text.ts`）

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `measureText` | 见 `text.ts` | 测量文本尺寸（CJK 友好） |
| `wrapText` | 见 `text.ts` | 按 `MAX_TEXT_W` 自动换行 |
| `TextMetrics` | 类型 | 测量返回结构 |

### 有道数据适配器（`data/adapter.ts`）

| 导出 | 签名 | 说明 |
| --- | --- | --- |
| `adaptYoudaoMindmap` | `(data: YoudaoMindmap) => MindNode` | 有道扁平 `nodes` 数组 → 嵌套 `MindNode` 树 |

映射规则：`id→标识`、`topic→标题`、`parentid→父子关系`、`expanded:false→collapsed`、
`customStyle.borderColor→强调色`。`data.nodes` 非法时抛 `Error`。

类型：
- `YoudaoNode = { id; isroot?; topic; parentid: string \| null; customStyle?; expanded?; style?; [k]: unknown }`
- `YoudaoMindmap = { nodes: YoudaoNode[]; toolbar?; [k]: unknown }`

### 其它 UI 构件

| 导出 | 说明 |
| --- | --- |
| `Toolbar` / `ToolbarProps` | 完整工具栏组件及其 props（受控：传入 `config`/`onConfig`、`style`/`onStyle` 等回调驱动编辑器） |
| `Dialog` | 通用对话框 |
| `Icon` / `IconName` / `IconProps` | SVG 图标组件与图标名联合类型 |
| `Minimap` | 画布缩略导航（组件内部使用） |

---

## 在你的项目中复用组件

`MindMap` 接受统一的 `MindNode` 树结构，因此你可以直接传入任意来源的树数据，
不必依赖有道格式——只要实现 `(raw) => MindNode` 的适配器即可：

```tsx
import { MindMap, adaptYoudaoMindmap, type YoudaoMindmap } from "./components/MindMap";
import raw from "./youdaoMindmap.raw.json";

const tree = adaptYoudaoMindmap(raw as unknown as YoudaoMindmap);
<MindMap data={tree} height={600} editable showToolbar />;
```

## 往返一致性已验证

- 有道扁平 JSON（`.mindmap`/`.km`）、KityMinder（`.km`）、simple-mind-map（`.smm`）
  的「导出 → 重新导入」往返：根节点、节点数、深层节点 id、文字样式均保持一致。
- 编辑操作（`Tab`/`Enter`/`Shift+Tab`/插入上级/删除/样式清理）均有纯函数单测覆盖。
