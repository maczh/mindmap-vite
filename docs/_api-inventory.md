# mindmap-vite 源码盘点 · API 面清单（内部分析稿）

> **本文件是分析产物，不是对外文档正文。** 供下游撰写 `README.md` / `docs/API.md` 时照抄/核对。
> 事实口径：**一律以 `src/` 代码为准**（凡与既有的 181 行旧 `README.md` 冲突，本文件标注「旧 README 过期」）。
> 所有条目均标注 `文件:行号`，便于复核。
>
> 盘点时间：v1.0.0（`package.json:4`）。组件主源码 12,214 行（含 CSS）。

---

## 0. 一句话定位

`mindmap-vite` = **一个零外部图形库的可编辑 SVG 思维导图 React 组件**：Vite 5 构建、React 18/19 peer、`7 种结构 × 17 个主题 × 线型/箭头/分支样式 × 节点补齐项（缩略图·标签·LaTeX·外框·概要·关联线）`，`.km/.mindmap/.mm/.smm/.xmind/.json/.xml/.txt` 可导入导出。

组件本身不依赖宿主项目：既可 vendor 进任意 Vite/React 工程，也可作 npm 包消费（`src/components/MindMap/index.ts` 是唯一入口）。

---

## 1. 模块职责矩阵

| # | 路径 | 行数 | 职责（一句话） | 是否被 index.ts 对外导出 | 关键导出名 |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/components/MindMap/MindMap.tsx` | 3037 | 组件主体：SVG 渲染 + 交互 + 撤销栈 + `useImperativeHandle` 命令式 API | 是（导出 `MindMap`） | `MindMap`（default 也导出，`MindMap.tsx:528/3037`） |
| 2 | `src/components/MindMap/MindMap.css` | 1259 | 全部 UI 样式，类名统一 `mm-` 前缀 | 否（但作为 `dist-lib/style.css` 产物发布） | — |
| 3 | `src/components/MindMap/extras.tsx` | 1092 | 补齐项渲染层：关联线 / 外框 / 概要 / 分组框 / 标签 / 缩略图 / katex 公式；`ExtrasLayer` 与几何计算 | 否（**高级/内部**） | `ExtrasLayer`、`buildAssocGeom`、`boundsOf`、`generalizationGeom`、`summaryGroupGeom`、`frameGroupGeom`、`commonAncestorCx`、`hasExtras`、`extrasEditTarget`、`extrasHitTest`、`ExtrasTarget`、`latexWidth`、`NodeImage`、`NodeTags`、`FormulaText` |
| 4 | `src/components/MindMap/layout.ts` | 1083 | 7 种结构的布局与节点尺寸度量 | 部分（导出 `layoutTree/nodeSize/textCenterX` + 4 类型） | `layoutTree`、`nodeSize`、`nodeSize`、`textCenterX`、`textBlockWidth`、`prefixWidth`、`rightBadgeWidth`、`measureTagWidth`、`defaultFontSizeForDepth`、`TEXT_LEFT_INSET`、`IMAGE_BOX`、类型 `SizedNode/PositionedNode/MindLink/LayoutResult/LayoutOptions/SizePad` |
| 5 | `src/components/MindMap/panels.tsx` | 621 | 9 个配置面板（节点/基础样式、主题、结构、标记、优先级、进度、图标 + 3 个缩略图） | 是（官方可复用于外层自定义菜单） | `NodeStylePanel`、`BaseStylePanel`、`ThemePanel`、`StructurePanel`、`MarkerPanel`、`PriorityPanel`、`ProgressPanel`、`IconPanel`、`StructureThumb`、`ThemeSwatch`、`BranchThumb`、`PanelHint` |
| 6 | `src/components/MindMap/handdrawn.ts` | 527 | 手绘「双笔触」路径生成（确定性，无 `Math.random`） | 是（手绘/几何 API） | 见 §10.2 |
| 7 | `src/components/MindMap/types.ts` | 487 | 全部公共类型 / 常量 / `MindMapProps` / `MindMapApi` 声明 | 是（类型 + 常量） | 见 §2 / §3 / §6 |
| 8 | `src/components/MindMap/Menu.tsx` | 462 | 九宫格主菜单（Portal + 环形九宫格）+ 菜单项建造器 | 是（官方推荐） | `MainMenu`、`buildMainMenu`、类型 `MainMenuItem/MainMenuProps/MainMenuActions` |
| 9 | `src/components/MindMap/theme.ts` | 450 | 17 个主题、7 种结构定义、标记/图标/优先级/进度/色盘 | 是 | 见 §6.1 / §6.8 |
| 10 | `src/components/MindMap/io/freemind.ts` | 354 | FreeMind XML / KityMinder XML / 有道扁平 / smm 的读写 | 经 `io/index.ts` 再导出 | `parseFreeMind`、`exportFreeMind`、`parseKityMinderXml`、`exportYoudaoFlat`、`exportKityMinder`、`exportSmm`、`escapeXml` |
| 11 | `src/components/MindMap/io/json.ts` | 349 | 扁平/嵌套 JSON ⇄ `MindNode` | 经 `io/index.ts` 再导出 | `parseMindmapJson`、`fromNested`、`fromFlat`、类型 `FlatNode` |
| 12 | `src/components/MindMap/Toolbar.tsx` | 341 | 顶部工具条：文件/编辑/标记/字号/字符/样式/主题/结构/优先级/进度/图标/快捷键/删除 | 是 | `Toolbar`、类型 `ToolbarProps` |
| 13 | `src/components/MindMap/io/index.ts` | 306 | 导入导出统一入口：格式嗅探、编码解码、blob 下载、SVG→PNG | 是 | 见 §9 |
| 14 | `src/components/MindMap/tree.ts` | 283 | 纯函数树操作（不可变、`cloneTree` 作基底） | 是（`export * from "./tree"`，`index.ts:123`） | 见 §10.4 |
| 15 | `src/components/MindMap/Icons.tsx` | 245 | 24×24 线性图标集（currentColor 描边） | 是 | `Icon`、类型 `IconName/IconProps` |
| 16 | `src/components/MindMap/io/xmind.ts` | 216 | `.xmind`（ZIP+content.json 或 content.xml）读写 | 经 `io/index.ts` 再导出 | `parseXmind`、`exportXmind` |
| 17 | `src/components/MindMap/Popover.tsx` | 175 | 通用浮层（面板容器 + `PopLabel`） | 否（内部，但与 panels 强耦合） | `Popover`、`PopLabel` |
| 18 | `src/components/MindMap/index.ts` | 151 | **公开入口 / 导出面唯一定义** | — | 见 §2 |
| 19 | `src/components/MindMap/MultiSelectBar.tsx` | 143 | 多选浮动条（关联线 / 概要 / 分组 / 清空），Portal 挂 body | 是（官方推荐） | `MultiSelectBar`、类型 `MultiSelectBarProps` |
| 20 | `src/components/MindMap/branchstyle.ts` | 136 | 分支样式（括号/圆弧/花括号/分叉/钩形）路径生成 | 是 | `branchPath`、类型 `BranchGeom` |
| 21 | `src/components/MindMap/Minimap.tsx` | 109 | 右下角/左下角缩略图导航 | 否（内部） | `Minimap` |
| 22 | `src/components/MindMap/text.ts` | 97 | 纯字符宽度估算 + 换行（不依赖 canvas，SSR/Node 可用） | 是 | `measureText`、`wrapText`、类型 `TextMetrics` |
| 23 | `src/components/MindMap/Dialog.tsx` | 84 | 轻量模态框（备注 / 超链接） | 是 | `Dialog`、类型 `DialogProps` |
| 24 | `src/data/adapter.ts` | 65 | 有道云笔记原始数据（扁平 nodes）⇄ `MindNode` | 是（`index.ts:150-151`） | `adaptYoudaoMindmap`、类型 `YoudaoMindmap/YoudaoNode` |
| 25 | `src/App.tsx` + `src/main.tsx` + `src/index.css` | 132 | demo 站点（非库代码） | 否 | — |
| 26 | `src/data/youdaoMindmap.raw.json` | — | demo 用有道原始数据 | 否 | — |

---

## 2. 公开导出全量清单（`src/components/MindMap/index.ts`，151 行）

图例：**✅ 官方推荐用**（README 应写） / **⚙️ 高级·内部暴露**（API 手册「内部/扩展」章节，普通调用方不需要） / **📦 经 `export *` 透出**（无显式列出但消费者可用）。

### 2.1 组件与 UI 部件

| 标记 | 导出 | 来源 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| ✅ | `MindMap` | `MindMap.tsx:528` | component | 主组件，`forwardRef<MindMapApi, MindMapProps>` |
| ✅ | `Toolbar` | `Toolbar.tsx:94` | component | 顶部工具条，可用 `mainMenu` 注入自定义九宫格 |
| ✅ | `MultiSelectBar` | `MultiSelectBar.tsx:35` | component | 多选浮动条（选中 ≥2 节点时由 `MindMap` 自动挂到内部） |
| ✅ | `MainMenu` | `Menu.tsx:65` | component | 九宫格主菜单（`maxRatio = 0.78`，自动避让视口） |
| ✅ | `buildMainMenu` | `Menu.tsx:338` | function | 造菜单项数组，返回 `(close) => MainMenuItem[]` |
| ✅ | `Dialog` | `Dialog.tsx:17` | component | 模态框 |
| ✅ | `Icon` | `Icons.tsx:217` | component | `IconName` 34 个图标（见 §6.9） |
| ✅ | `NodeStylePanel` | `panels.tsx:169` | component | 节点样式面板 |
| ✅ | `BaseStylePanel` | `panels.tsx:260` | component | 画布基础样式面板（含快捷键速查） |
| ✅ | `ThemePanel` | `panels.tsx:417` | component | 主题面板 |
| ✅ | `StructurePanel` | `panels.tsx:455` | component | 结构面板 |
| ✅ | `MarkerPanel` | `panels.tsx:491` | component | 标记面板 |
| ✅ | `PriorityPanel` | `panels.tsx:527` | component | 优先级面板 |
| ✅ | `ProgressPanel` | `panels.tsx:558` | component | 进度面板 |
| ✅ | `IconPanel` | `panels.tsx:588` | component | 图标前缀面板 |
| ✅ | `StructureThumb` | `panels.tsx:41` | component | 结构缩略图 |
| ✅ | `ThemeSwatch` | `panels.tsx:122` | component | 主题色卡 |
| ✅ | `BranchThumb` | `panels.tsx:141` | component | 分支样式缩略图 |
| ✅ | type `ToolbarProps` | `Toolbar.tsx:24` | — | 25 个字段 |
| ✅ | type `MultiSelectBarProps` | `MultiSelectBar.tsx:5` | — | 7 个字段 |
| ✅ | type `MainMenuItem` / `MainMenuProps` / `MainMenuActions` | `Menu.tsx:38/51/303` | — | 自定义菜单必备 |
| ✅ | type `IconName` / `IconProps` | `Icons.tsx:2/210` | — | |

### 2.2 类型（`index.ts:27-51`，22 个）

`MindNode`、`MindNodeShape`、`MindNodeStyle`、`MindBorderStyle`、`MindNodeImage`、`MindNodeFrame`、`MindGeneralization`、`MindAssocLine`、`MindAssocArrow`、`MindSummaryGroup`、`MindFrameGroup`、`MindMapApi`、`MindMapProps`、`MindMapConfig`、`BaseStyle`、`CanvasCategory`、`LineStyle`、`StructureType`、`TextDefaults`、`LinkPattern`、`LinkArrow`、`LinkColorMode`、`BranchStyle`。

> ⚠️ 注意 `MindGeneralization`、`MindAssocArrow` 虽是类型，但**旧 README 的数据模型章节未列**，属补齐项。

### 2.3 常量（`index.ts:52-64`）

`DEFAULT_CONFIG`、`DEFAULT_TEXT`、`FONT_FAMILIES`、`FONT_SIZES`、`SHAPES`、`BORDER_STYLES`、`BORDER_DASH`、`LINK_PATTERNS`、`LINK_ARROWS`、`LINK_COLOR_MODES`、`BRANCH_STYLES`。

### 2.4 几何 / 布局 / 手绘

| 标记 | 导出 | 说明 |
| --- | --- | --- |
| ✅ | `layoutTree`、`nodeSize`、`textCenterX` | 布局三件套 |
| ⚙️ | type `PositionedNode`/`MindLink`/`LayoutResult`/`SizedNode` | 布局结果类型 |
| ✅ | `handLine`/`handCurve`/`handRect`/`handEllipse` | 手绘单笔兼容版（= `sketch*` 的第 0 笔） |
| ✅ | `sketchLine`/`sketchCurve`/`sketchRect`/`sketchEllipse`/`sketchPath`/`sketchArrowHead` | 手绘双笔触版 |
| ⚙️ | type `SketchOptions` | `{ amp?, gap?, passes?, overshoot?, segments? }` |
| ✅ | `branchPath` | 分支样式路径 |
| ⚙️ | type `BranchGeom` | 端点/切向/控制点 |
| ✅ | `measureText`、`wrapText` | 文本量算 |
| ⚙️ | type `TextMetrics` | — |

### 2.5 主题 / 枚举（`index.ts:91-118`）

`THEME_LIST`、`THEME_MAP`、`THEME_CATEGORIES`（**另有别名导出 `THEME_GROUPS`，指向同一数组**，`index.ts:95`）、`DEFAULT_THEME_ID`、`STRUCTURES`、`BORDER_COLORS`、`STRUCTURE_MAP`、`MARKERS`、`MARKER_MAP`、`BRANCH_COLORS`、`TEXT_COLORS`、`HIGHLIGHT_COLORS`、`NODE_ICONS`、`NODE_ICON_MAP`、`PRIORITY_COLORS`、`PRIORITY_LEVELS`、`PROGRESS_LEVELS`、`PROGRESS_COLOR`、`PROGRESS_TRACK`、`buildBranchColors`；类型 `CanvasTheme`、`MarkerDef`、`NodeIconDef`。

### 2.6 树操作（`index.ts:123`，`export * from "./tree"`）（📦）

`uid`、`createNode`、`cloneTree`、`findNode`、`findParent`、`findPath`、`allNodes`、`visibleNodes`、`opAddChild`、`opAddSibling`、`opAddParent`、`opOutdent`、`opDelete`、`opUpdate`、`opMove`、`opToggleCollapse`、`countNodes`、`sampleTree`、类型 `TreeOpResult`。

> 旧 README 已列这些名字 ✅，但漏了 `uid` 与类型 `TreeOpResult`。

### 2.7 导入导出（`index.ts:126-147`）

`mapFileStructure`、`parseMindmapFile`、`exportTree`、`downloadBlob`、`svgToPngBlob`、`EXPORT_LABELS`、`IMPORT_ACCEPT`；类型 `ParsedMindmap`、`ExportFormat`、`SvgPayload`、`ExportResult`；
`parseMindmapJson`、`fromNested`、`fromFlat`、类型 `FlatNode`；
`parseFreeMind`、`exportFreeMind`、`parseKityMinderXml`、`exportYoudaoFlat`、`exportKityMinder`、`exportSmm`、`escapeXml`、`parseXmind`、`exportXmind`。

### 2.8 数据适配（`index.ts:150-151`）

`adaptYoudaoMindmap`、类型 `YoudaoMindmap`、`YoudaoNode`。

### 2.9 ❌ **不对外导出**（极易写错，务必不要在文档里承诺）

`extras.tsx` 全部（`ExtrasLayer`/`summaryGroupGeom`/`frameGroupGeom`/`extrasEditTarget`/`extrasHitTest`/`latexWidth`/`NodeImage`/`NodeTags`/`FormulaText`…）；`Minimap`、`Popover`（含 `PopLabel`）；`layout.ts` 的 `prefixWidth`/`textBlockWidth`/`rightBadgeWidth`/`measureTagWidth`/`defaultFontSizeForDepth`/`TEXT_LEFT_INSET`/`IMAGE_BOX`/`SizePad`；`theme.ts` 的 `FISHBONE_ACCENT`；`handdrawn.ts` 内部所有 helper。

---

## 3. 组件 Props 全量（`types.ts:342-365`，默认值见 `MindMap.tsx:529-541`）

| 字段 | 类型 | 默认 | 语义 | 受控? | 备注 |
| --- | --- | --- | --- | --- | --- |
| `data` | `MindNode` | **必填** | 根节点数据 | **非受控**（内部 `useReducer` 持有副本） | 引用变化（`data !== lastExternal.current`）时组件自动 `dispatch reset`，`MindMap.tsx:570-574` |
| `width` | `number \| string` | `"100%"` | 容器宽度 | 半受控（直接写 style） | `MindMap.tsx:2011` |
| `height` | `number \| string` | `"100%"` | 容器高度 | 半受控 | 同上；**宿主必须给外层一个确定高度**，否则 `fit()` 会因 `clientHeight=0` 空转（`MindMap.tsx:726`） |
| `className` | `string` | — | 附加 class，追加在 `.mm-wrap` 后 | — | `MindMap.tsx:2011` |
| `fitOnMount` | `boolean` | `true` | 挂载后自动适应屏幕 | — | **仅挂载执行一次**（`useEffect(…, [])`，`MindMap.tsx:741-745`）；容器后续尺寸变化**不会**重新 fit（只更新 stageSize） |
| `editable` | `boolean` | `true` | **只是初值** | 否 | 运行期切换必须走 `api.setMode()`。`mode` 是独立 state（`MindMap.tsx:641`），`props.editable` 变更**不会回写** `mode` |
| `showToolbar` | `boolean` | `true` | 是否渲染自带工具条 | — | 与只读态**无关**（只读时仍会渲染 Toolbar） |
| `onChange` | `(tree: MindNode) => void` | — | 树变更回调 | — | **首次挂载不触发**（`firstChange` ref，`MindMap.tsx:559-566`）；`setTree()` 也会触发 |
| `defaultConfig` | `Partial<MindMapConfig>` | — | 初始配置（themeId/structure/lineStyle/base） | 否（只作初值） | 与 `DEFAULT_CONFIG` 一层浅合并（`{...DEFAULT_CONFIG, ...defaultConfig}`，`MindMap.tsx:576-579`）；运行期改配置走 `api.setConfig()` |
| `onScaleChange` | `(scale: number) => void` | — | 缩放变化回调 | — | 每次 `transform.scale` 变化都触发（`MindMap.tsx:661-663`） |
| `onSelectChange` | `(id: string \| null) => void` | — | 选中变化回调 | — | 每次 `doc.selectedId` 变化触发（`MindMap.tsx:667-669`） |

> **`defaultConfig.base` 是「各字段单独回退」语义，不是整块替换**：`MindMap.tsx:687-694` 逐个 `base.X ?? theme.X`，且 `taper` 与 `dashed` 互斥、`branchStyle` 默认 `"default"`、`linkColorMode` 默认 `"auto"`。

---

## 4. 命令式 API 全量（`useImperativeHandle`，`MindMap.tsx:1809-1979`）

> **共 71 个方法**。声明面见 `types.ts:372-487`；实现面见 `MindMap.tsx:1811-1979`（依赖数组 `1980-2007`）。
> 图例：**🔴 类型/实现不一致** | **🟡 有副作用坑** | **⚪ 纯读**

### 4.1 数据与历史

| 方法 | 实际签名 | 返回 | 行号 | 副作用 / 坑 |
| --- | --- | --- | --- | --- |
| `getTree()` | `() => MindNode` | 当前树（引用） | 1813 | ⚪ 走 `treeRef` |
| `setTree(tree)` | `(tree: MindNode) => void` | void | 1814 | 🟡 **走 `docReducer` 的 `reset` 分支**（`MindMap.tsx:208-215`）：**清空 past 与 future（撤销/重做历史被抹掉）**、选中强制切到新根节点、多选集合重置为单选根节点；因 `doc.tree` 换了引用，**会触发一次 `onChange`** |
| `undo()` | `() => void` | void | 1817 | 走 reducer `undo`；`past` 空则无动作 |
| `redo()` | `() => void` | void | 1818 | 走 reducer `redo` |
| `canUndo()` | `() => boolean` | `doc.past.length > 0` | 1819 | ⚪ |
| `canRedo()` | `() => boolean` | `doc.future.length > 0` | 1820 | ⚪ |

> `HISTORY_LIMIT = 80`（`MindMap.tsx:100`）：`commit` 时超上限丢最旧的 `past`。

### 4.2 结构操作（**全部无参、作用于当前主选中项**）

| 方法 | 实际签名 | 返回 | 行号 | 坑 |
| --- | --- | --- | --- | --- |
| `addChild()` | `() => void` | void | 1823 | 目标 = `doc.selectedId ?? doc.tree.id`；**只读态直接 return**；新节点标题固定「分支主题」并**立刻进入内联编辑**；按深度套默认字号（`withDefaults`，`MindMap.tsx:821-830`） |
| `addSibling(before?)` | `(before?: boolean) => void` | void | 1824 | `before` 不传 → `undefined` → 插到**之后**；新节点同样进编辑态 |
| `addParent()` | `() => void` | void | 1825 | 包一层 wrapper 节点 |
| `removeNode()` | `() => void` | void | 1826 | **删根会被 toast「根节点不可删除」并拒绝**（`MindMap.tsx:905-908`） |
| `outdent()` | `() => void` | void | 1827 | 提升一层；已是根的同级则无变化 |
| `select(id)` | `(id: string \| null) => boolean` | 目标不存在或 id 为 null → `false` | 1828-1836 | 传 `null` 走「清空选中」并返回 `false`；**会把多选收敛成单选** |
| `getSelectedId()` | `() => string \| null` | 主选中 id | 1837 | ⚪ |
| `hasSelection()` | `() => boolean` | `Boolean(selectedId)` | 1838 | ⚪ |

### 4.3 多选（`Ctrl/Cmd + 左键`）

| 方法 | 实际签名 | 返回 | 行号 | 坑 |
| --- | --- | --- | --- | --- |
| `getSelectedIds()` | `() => string[]` | 主选中项所在数组 | 1841 | ⚠️ **单选时也返回长度 1 的数组**；单选 ≠ 空 |
| `toggleSelect(id)` | `(id: string) => boolean` | 节点不存在 → `false` | 1842-1846 | 等价于 Ctrl/Cmd + 左键点该节点；取消选中时主选中项顺延到集合最后一个（reducer `toggleSelect`，`MindMap.tsx:187-203`） |
| `clearSelect()` | `() => void` | void | 1847 | 只清选中态，不动树 |
| `addAssocBetween()` | `() => void` | void | 1848 | 链式连接：N 个节点 → **N-1 条**关联线；<2 个 → toast 报错；重复 fromId→toId 会跳过并 toast「已存在关联线」 |
| `addSummaryFor()` | `() => void` | void | 1849 | 🔴 **声明是 `addSummaryFor(text: string)`（`types.ts:403`），实现是 `addSummaryForSelected()` 零参（`MindMap.tsx:1660`），入参被忽略**；文案固定 `SUMMARY_DEFAULT = "概要"`（`MindMap.tsx:102`）；落地后 `setTimeout(0)` 自动进入内联编辑 |
| `addFrameFor()` | `() => void` | void | 1850 | 🔴 同上：`types.ts:405` 声明 `(label: string)`，实现零参（`MindMap.tsx:1681`）；文案固定 `FRAME_DEFAULT = "分组"`（`MindMap.tsx:103`）；同样自动进入内联编辑 |

> 旧 README 的 `api.addSummaryFor(text)` / `addFrameFor(label)` **此处已过期**（写成了带参）。

### 4.4 节点样式 / 文字默认值

| 方法 | 实际签名 | 行号 | 坑 |
| --- | --- | --- | --- |
| `setNodeStyle(patch)` | `(patch: Partial<MindNodeStyle>) => void` | 1853 | 与 `applyStyle` 同一实现（`MindMap.tsx:923-943`）：**patch 里带 `fontSize`/`fontFamily` 会顺带更新 `textDefaults`**（即使只读态已 return，默认值也已改） |
| `getNodeStyle()` | `() => MindNodeStyle` | 1854 | 无选中时返回 `{}` |
| `clearNodeStyles()` | `() => void` | 1855-1862 | ⚠️ **实现只把 `style.shape` 置 undefined**（`opUpdate(..., { shape: undefined })`），**不清 fontSize/color/background 等其它 style 字段**；且无选中时静默 return、**不校验只读态** |
| `getTextDefaults()` | `() => TextDefaults` | 1863 | `{ fontSize: 14, fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' }` |
| `setTextDefaults(patch)` | `(patch: Partial<TextDefaults>) => void` | 1864 | 只改 state，**不写树**、不进撤销栈 |

### 4.5 配置（主题 / 结构 / 连线 / 基础样式）

| 方法 | 实际签名 | 行号 | 坑 |
| --- | --- | --- | --- |
| `getConfig()` | `() => MindMapConfig` | 1872 | ⚠️ 必须走 `configRef` 而非闭包 —— 源码注释（`MindMap.tsx:1866-1871`）明确警告：本 handle 依赖数组里没有 `config`，闭包会指向首次渲染那份，宿主做 `{...api.getBase(), ...patch}` 时会拿到空旧 base |
| `setConfig(patch)` | `(patch: Partial<MindMapConfig>) => void` | 1873 | **一层浅合并**，不会删除未提及字段 |
| `setStructure(s)` | `(s: StructureType) => void` | 1874 | 🟡 **切换结构会自动触发一次 `fit()`**（`MindMap.tsx:754-760`） |
| `setLineStyle(s)` | `(s: LineStyle) => void` | 1875 | `curve`/`elbow`/`straight` |
| `setThemeId(t)` | `(t: string) => void` | 1876 | 主题 id 不存在时回退 `THEME_LIST[0]`（`MindMap.tsx:671`：`THEME_MAP.get(id) ?? THEME_LIST[0]`） |
| `setBase(patch)` | `(patch: Partial<BaseStyle>) => void` | 1877 | `base` 是 `{...c.base, ...patch}`，**按字段合并** |
| `getBase()` | `() => BaseStyle` | 1878 | 走 `configRef`，无 `base` 时返回 `{}` |

### 4.6 运行期模式

| 方法 | 行号 | 说明 |
| --- | --- | --- |
| `getMode()` | 1881 | `"edit" \| "readonly"` |
| `setMode(m)` | 1882 | 切只读/编辑；**宿主切阅读态的唯一正解** |
| `setWheelAction(a)` | 1883 | `"zoom"`（默认）以指针为锚点缩放 / `"move"` 滚轮平移画布（`tx -= deltaY，ty -= deltaX`） |
| `setFreeDrag(v)` | 1884 | 🟡 **默认 `false`** —— 不开启则节点**不能拖**；开启后 `beginNodeDrag` 才接管（`MindMap.tsx:1417`） |

### 4.7 视图

| 方法 | 实际行为 | 行号 |
| --- | --- | --- |
| `zoomIn()` | `zoomBy(1.2)`，以容器中心为锚点 | 1887 |
| `zoomOut()` | `zoomBy(1/1.2)` | 1888 |
| `fitView()` | `fit()`：四边留 64px padding，scale 上限 1.3 | 1889（721-739） |
| `resetView()` | `setTransform({scale:1,tx:0,ty:0})` | 1890 |
| `centerRoot()` | 保持当前 scale，把根节点中心移到容器中心 | 1891-1901 |
| `getScale()` | `transformRef.current.scale`（**避免闭包旧值**，同 `getView`） | 1902 |
| `getView()` | `{ scale, tx, ty }`，内容坐标 → 屏幕：`s*scale + t` | 1903-1907 |
| `setView(v)` | `scale` 会被钳制到 `[MIN_SCALE 0.15, MAX_SCALE 3]`；`tx/ty` 缺省沿用 | 1908-1913 |
| `expandAll()` | `setCollapsedBelow(Number.MAX_SAFE_INTEGER)` | 1901/1916 |
| `collapseToDepth(d)` | `depth >= d` 的**层级**整体收起（一次性 commit 整棵树，进撤销栈） | 1917/1792-1799 |
| `toggleCollapse(id?)` | 没有子节点时静默 return | 1918/912-921 |

### 4.8 节点补齐项字段（set/get 成对）

`setNote/getNote`、`setLink/getLink`、`setImage/getImage`、`setTags/getTags`、`setFormula/getFormula`、`setFrame/getFrame`、`setGeneralization/getGeneralization`（1921-1934）。

- 全部经 `setNodeField` 落库（`MindMap.tsx:1571-1582`）：**只读态 return**、无选中 → toast「请先点击选中一个节点」。
- 空值统一归一成 `undefined`（`note: text || undefined` 等），因此导出文件里不会出现空串。
- 不进「多选」范围，只作用于 `selectedId`。

优先级 / 进度 / 图标：`getPriority/setPriority`、`getProgress/setProgress`、`getIcons/toggleIcon`（1936-1942）。

- `setPriority`/`setProgress` **不校验范围**（`priority` 建议 1-9、`progress` 建议 0-10）。
- `toggleIcon(id)` 切换 `icons` 数组；`MARKER_MAP`/`NODE_ICON_MAP` 里查不到的 id 会被**静默忽略**（`MindMap.tsx:2520/2574`）。

### 4.9 关联线（统一挂在根节点的 `assocLines`）

| 方法 | 行号 | 坑 |
| --- | --- | --- |
| `addAssocLine(fromId, toId, label?)` | 1945-1958 | `fromId/toId` 为空或相等 → 静默 return（无 toast）；**重复 from→to 静默 return**；生成 id 形如 `assoc-<base36>`；`arrow` 固定 `"out"`；**不校验只读态** |
| `removeAssocLine(id)` | 1959-1965 | 走 `commit`（进撤销栈）；**不校验只读态** |
| `getAssocLines()` | 1966 | 返回根节点 `assocLines ?? []` |

### 4.10 导出

| 方法 | 行号 | 行为 |
| --- | --- | --- |
| `getSvg()` | 1969 | 🔴 声明 `getSvg(): unknown`（`types.ts:481`），**实现返回 `SvgPayload`**（`buildSvgPayload`，1270-1297：`{ svg, width, height }`，外扩 32px padding、注入背景 rect、剥离 `.mm-ui-only`、带 `<?xml?>` 头）；`svgRef` 未就绪时 **throw `Error("画布尚未就绪")`** |
| `exportPng()` | 1970 | `handleExport("png")`（2 倍图） |
| `exportAs(f: string)` | 1971 | `handleExport(f as ExportFormat)`；非法格式在 `exportTree` 抛「不支持的导出格式」；导出文件名固定前缀 `"mindmap"`（`handleExport`，1299-1315） |

### 4.11 几何

`getNodeBoxes(): Record<string, {x,y,w,h}>`（1974-1978）—— 返回**画布（世界）坐标**的节点包围盒，供宿主做浮层定位；不是屏幕坐标（屏幕坐标需 `x*scale+tx`）。

### 4.12 命令式 API 使用示例（可直接搬进文档）

```tsx
const api = useRef<MindMapApi>(null);
api.current?.setMode("readonly");       // 切阅读态
api.current?.setFreeDrag(true);         // 开启节点拖拽（默认关）
api.current?.setView({ scale: api.current.getView().scale, tx: 0 });
const boxes = api.current?.getNodeBoxes();
const { svg, width, height } = api.current!.getSvg() as SvgPayload;
```

---

## 5. 数据模型

### 5.1 `MindNode`（`types.ts:127-176`）

| 字段 | 类型 | 语义 | 渲染位置 |
| --- | --- | --- | --- |
| `id` | `string` | 唯一标识（必填） | — |
| `title` | `string` | 标题（必填） | `text`（`MindMap.tsx:2498-2515`）；`\n` 显式换行 |
| `children` | `MindNode[]` | 子节点（必填，可为空数组） | — |
| `collapsed` | `boolean?` | 收起（不渲染子树） | 折叠按钮 `±`，`MindMap.tsx:2632-2665` |
| `color` | `string?` | 分支强调色，等价于 `style.borderColor` 快捷方式 | 描边/连线（`MindMap.tsx:2261-2267`） |
| `style` | `MindNodeStyle?` | 扩展样式，见 §5.2 | — |
| `note` | `string?` | 备注（右上角小图标 + `<title>` tooltip） | `MindMap.tsx:2606-2616`；`Ctrl+Enter` 保存（`Dialog.tsx:54`） |
| `link` | `string?` | 超链接（右上角小图标） | `MindMap.tsx:2617-2629` |
| `markers` | `string[]?` | 标记 id 列表（12 种，见 §6.7） | 圆底单字徽标，占位 19px/个（`MindMap.tsx:2519-2537`） |
| `isRoot` | `boolean?` | 是否为根（导入时组件自动置 true） | `parseMindmapFile` 各分支都会 `tree.isRoot = true` |
| `priority` | `number?` | 优先级 1-9，前缀圆形徽标 | `MindMap.tsx:2540-2558`；配色 `PRIORITY_COLORS` |
| `progress` | `number?` | 进度 0-10（每级 10%），前缀饼图 | `MindMap.tsx:2561-2569`；`piePath`，`PROGRESS_COLOR/#8bc34a` |
| `icons` | `string[]?` | emoji 图标前缀（24 种，见 §6.8） | `MindMap.tsx:2573-2589` |
| `image` | `MindNodeImage?` | 缩略图（40×40 方框内等比裁切） | `NodeImage`，`extras.tsx:84-100` |
| `tags` | `string[]?` | 标签小色块（宽度按字符稳定派生色） | `NodeTags`，`extras.tsx:103-132` |
| `formula` | `string?` | LaTeX（**不含 `$`**），有值时正文渲染为公式 | `FormulaText` → `foreignObject` + katex，`extras.tsx:144-164` |
| `frame` | `MindNodeFrame?` | 外框：框住该节点及**全部可见后代** | `ExtrasLayer`，`extras.tsx:772-787` |
| `generalization` | `MindGeneralization?` | 逐节点概要：指向 `targetId`，画一条虚线连到右侧小框 | `extras.tsx:785-790` |
| **`assocLines`** | `MindAssocLine[]?` | **根专属**：关联线集合 | 见 §5.3 |
| **`summaryGroups`** | `MindSummaryGroup[]?` | **根专属**：多选概要 | 见 §5.4 |
| **`frameGroups`** | `MindFrameGroup[]?` | **根专属**：多选分组框 | 见 §5.5 |

### 5.2 `MindNodeStyle`（`types.ts:27-50`）

`fontSize?`(默认 14) / `fontFamily?` / `bold?` / `italic?` / `underline?` / `strike?` / `color?` / `background?` / `borderColor?` / `borderWidth?` / `borderStyle?`(`MindBorderStyle`) / `borderRadius?`（按宽高一半内敛）/ `shape?`(`MindNodeShape`)。
`BORDER_DASH`（`types.ts:11-16`）映射：`solid→undefined`、`dashed→"7 4"`、`dotted→"2 3"`、`dashdot→"9 3 2 3"`。

### 5.3 根专属 ① `assocLines`（`types.ts:64-78`）

```ts
interface MindAssocLine { id: string; fromId: string; toId: string; label?: string; color?: string; arrow?: MindAssocArrow }
type MindAssocArrow = "none" | "in" | "out";
```
- **约束**：挂在根节点上（`getAssocLines()` 读的就是 `root.assocLines`）；`fromId/toId` 必须存在，`findNode` 找不到时该条几何被跳过（`extras.tsx:206-210`）。
- **走线**：同侧节点 → 从右侧绕一个弧再回到目标（`bulgeX = max(aRight,bRight)+46`，`extras.tsx:230-245`）；跨侧 → 走下方弧（`dropY = max(底部)+40`，`246-260`）。
- **箭头方向语义**：`out` 在目标端（默认）；`in` 在来源端；`none` 不画。
- 关联线**不参与撤销栈之外**：`addAssocLine/removeAssocLine` 都走 `commit`。

### 5.4 根专属 ② `summaryGroups`（`types.ts:89-96`）

```ts
interface MindSummaryGroup { id: string; nodeIds: string[]; /* ≥2 */ text: string; color?: string }
```
- **约束**：`nodeIds.length >= 2`（`addSummaryForSelected` 少于 2 个直接 toast 拒绝，`MindMap.tsx:1663-1666`）。
- **语义**：一个右侧括号把若干任意节点（可跨分支）括起来，再用一条水平引线连到一个圆角概要框。
- **弧线方向判据**（关键）：`commonAncestorCx`（`extras.tsx:560-597`）求被选集的**最低公共祖先中心 x** 作锚点 —— 被选组在锚点**左**侧 → 概要去**左**外侧；右侧 → 去右外侧。找不到公共祖先（跨子树乱选 / id 不全）才退回「画布中心」判据。
- **持久化只存 id 集合**，几何由 `summaryGroupGeom` 每次从当前布局实时算出（拖拽/缩放后自动贴合）。
- **避让**：概要框若压到「组外节点」，整体沿摆放方向外推（最多 6 次，每次 +26px，`extras.tsx:472-477`）。

### 5.5 根专属 ③ `frameGroups`（`types.ts:102-109`）

```ts
interface MindFrameGroup { id: string; nodeIds: string[]; /* ≥1 */ label?: string; color?: string }
```
- **约束**：`nodeIds.length >= 1`（少于 1 个 toast 拒绝，`MindMap.tsx:1683-1686`）。
- **语义**：包围盒外扩 `pad = label ? 20 : 14` 的虚线圆角框（`rx=16`），左上角一个白底胶囊标签。
- 与逐节点 `frame`（`types.ts:112-116`）并存：一个是「多选成组」，一个是「框住子树」。

### 5.6 三者关系速记

| | 宿主字段 | 作用对象 | 最小节点数 | 默认文案 |
| --- | --- | --- | --- | --- |
| 关联线 | `root.assocLines` | 任意两节点 | 2 | 无（label 可选） |
| 概要 | `root.summaryGroups` | 任意一组节点 | 2 | `"概要"` |
| 分组框 | `root.frameGroups` | 任意一组节点 | 1 | `"分组"` |
| 子树外框 | `node.frame` | 子树 | 1（自身） | 无 |
| 子树概要 | `node.generalization` | 子树 → 最深节点 | 1 | `"概要"` |

---

## 6. 枚举与可选项全量

### 6.1 `THEME_LIST`（`theme.ts:98-274`，共 **17** 个）

| # | id | 中文名 | 分类 | handDrawn | 备注 |
| --- | --- | --- | --- | --- | --- |
| 1 | `classic-blue` | 经典蓝 | classic | — | **默认主题**（`DEFAULT_THEME_ID = THEME_LIST[0].id`） |
| 2 | `classic-green` | 经典绿 | classic | — | |
| 3 | `classic-orange` | 经典橙 | classic | — | |
| 4 | `classic-gold` | 经典金 | classic | — | |
| 5 | `classic-red` | 经典红 | classic | — | |
| 6 | `classic-purple` | 经典紫 | classic | — | |
| 7 | `dark-blue` | 深色蓝 | dark | — | |
| 8 | `dark-green` | 深色绿 | dark | — | |
| 9 | `dark-purple` | 深色紫 | dark | — | |
| 10 | `dark-gray` | 深色灰 | dark | — | `useBranchColor: false` |
| 11 | `plain-gray` | 朴素灰 | plain | — | `lineStyle: "elbow"` |
| 12 | `plain-blue` | 朴素蓝 | plain | — | `lineStyle: "elbow"` |
| 13 | `plain-green` | 素雅绿 | plain | — | `lineStyle: "elbow"` |
| 14 | `plain-minimal` | 极简 | plain | — | `nodeBorder: false`、`radius 0`、`strokeWidth 0` |
| 15 | `hand-colorful` | 手绘彩色 | hand | ✅ `handDrawn:true, handJitter:1.1` | 节点走双笔触路径 |
| 16 | `hand-blueprint` | 手绘蓝图 | hand | ✅ `handJitter:0.9` | `useBranchColor:false` |
| 17 | `hand-forest` | 手绘森野 | hand | ✅ `handJitter:1.3` | |

`THEME_CATEGORIES`（`theme.ts:66-71`）：`classic 经典` / `dark 深色` / `plain 朴素` / `hand 手绘`（别名 `THEME_GROUPS`）。
`CanvasTheme` 字段（`theme.ts:26-63`）：`id/name/category/background/rootFill/rootText/nodeFill/nodeText/nodeStroke/radius/strokeWidth/linkColor/linkWidth/useBranchColor/nodeBorder/lineStyle/handDrawn?/handJitter?`。

### 6.2 `STRUCTURES`（`theme.ts:281-294`，7 种）

| id | label | thumb |
| --- | --- | --- |
| `logical-right` | 逻辑结构图 | `logical-right` |
| `logical-left` | 逻辑结构图 | `logical-left` |
| `mindmap` | 思维导图 | `mindmap` |
| `org` | 组织结构图 | `org` |
| `catalog` | 目录组织图 | `catalog` |
| `timeline` | 时间轴 | `timeline` |
| `fishbone` | 鱼骨图 | `fishbone` |

> ⚠️ `logical-left` / `logical-right` 的 label **都是「逻辑结构图」**（`theme.ts:287-288`），UI 上靠 `StructureThumb` 缩略图区分 —— 文档必须注明，否则用户以为只有 6 种。
> `DEFAULT_CONFIG.structure = "mindmap"`（`types.ts:300`）。
> `layoutTree` 的 case 映射（`layout.ts:1026-1051`）：`logical-left→layoutSide(-1)`、`mindmap→layoutBalanced`、`org→layoutVertical(center)`、`catalog→layoutCatalog`、`timeline→layoutTimeline(紧凑尺寸档)`、`fishbone→layoutFishbone(专用尺寸档)`、其余→`layoutSide(+1)`。

### 6.3 `BORDER_STYLES` / `BORDER_DASH`（`types.ts:11-24`）

`solid 实线` / `dashed 虚线` / `dotted 点线` / `dashdot 点划线`；`dash` 值见 §5.2。仅根节点与带框节点生效（`MindMap.tsx:2300-2301`）。

### 6.4 `SHAPES`（`types.ts:334-340`）

`rect 矩形` / `rounded 圆角矩形` / `capsule 胶囊` / `underline 下划线` / `none 无边框`。
默认形状规则（`MindMap.tsx:2236-2237`）：`depth<=1 → "capsule"`，其余 → `"underline"`；节点显式 `style.shape` 优先。

### 6.5 `LINK_PATTERNS` / `LINK_ARROWS` / `LINK_COLOR_MODES`（`types.ts:239-256`）

| 常量 | 项 |
| --- | --- |
| `LINK_PATTERNS` | `solid 实线` / `dashed 虚线` / `taper 从粗到细` |
| `LINK_ARROWS` | `none 无箭头` / `inward 向内箭头` / `outward 向外箭头` |
| `LINK_COLOR_MODES` | `auto 彩色`（按分支主题色）/ `single 单色`（统一 `linkColor`） |

**语义（`types.ts:200-206`）**：
- `inward` = 箭头画在**父端**，尖端朝向父/根节点（朝画布中心收）。
- `outward` = 箭头画在**子端**，尖端朝向子/叶子节点（朝外发散）。
- `taper` 是两端宽度渐变**填充带**（粗端 `TAPER_THICK_W = 8`，细端 `TAPER_THIN_W = 2`，`MindMap.tsx:428-429`），**与 dashed 互斥**（填充带无法用 dasharray 表现）；手绘主题下 taper 改用手绘中心线填充（`handTaperFill`）。
- 箭头尺寸跟随所在端线宽：taper 时 inward 用 8、outward 用 2（`MindMap.tsx:2150-2154`）。
- 手绘主题下箭头是**空心「V」**（`sketchArrowHead`），其余实心三角（`MindMap.tsx:2185-2216`）。

### 6.6 `BRANCH_STYLES`（`types.ts:274-283`，8 种）

`default 默认` / `bracket-left 左括号` / `bracket-right 右括号` / `brace 花括号` / `arc-right 右圆弧` / `arc-left 左圆弧` / `fork 分叉` / `hook 钩形`。
- 与 `lineStyle` **正交**：`lineStyle` 决定基础骨架，`branchStyle` 在其上再套一层外壳（`types.ts:258-263`）。
- `branchPath(style, geom, depth = 18)`（`branchstyle.ts:44`），进深 `dep = clamp(depth, 8, dist*0.45)`（`branchstyle.ts:55`）；`default` 在 cubic 时返回保留贝塞尔形态，否则 `null`。

### 6.7 `MARKERS`（`theme.ts:309-322`，12 个）

| id | label | char | bg |
| --- | --- | --- | --- |
| `priority-1/2/3` | 优先级 1/2/3 | `1`/`2`/`3` | `#e34d59`/`#f0a020`/`#2f6fed` |
| `flag-red` / `flag-blue` / `flag-green` | 红旗/蓝旗/绿旗 | `⚑` | `#e34d59`/`#2f6fed`/`#00a870` |
| `star` | 星标 | `★` | `#f0a020` |
| `check` | 已完成 | `✓` | `#00a870` |
| `question` | 待确认 | `?` | `#8b5cf6` |
| `smiley` | 笑脸 | `☺` | `#f0a020` |
| `heart` | 心动 | `♥` | `#ec4899` |
| `idea` | 灵感 | `!` | `#14b8a6` |

### 6.8 `PRIORITY_LEVELS` / `PROGRESS_LEVELS` / `NODE_ICONS` / 色盘

- `PRIORITY_LEVELS = [1..9]`（`theme.ts:341`）；`PRIORITY_COLORS`（`theme.ts:329-339`）：1 红 `#e5484d` / 2 蓝 `#2f6fed` / 3 绿 `#17a34a` / 4 橙 `#e08b2a` / 5 紫 `#8b5cf6` / 6-9 灰 `#9aa4b2`。
- `PROGRESS_LEVELS = [0..10]`（`theme.ts:344`）；`PROGRESS_COLOR = "#8bc34a"`、`PROGRESS_TRACK = "#f0efd8"`。
- `NODE_ICONS`（`theme.ts:358-383`，**24 个**）：`star⭐ flag🚩 fire🔥 bulb💡 pin📌 target🎯 rocket🚀 check✅ cross❌ warn⚠️ question❓ bang❗ thumbup👍 clap👏 clock⏰ bubble💬 pen📝 link🔗 lock🔒 gift🎁 money💰 book📚 user👤 heart❤️`。
- `FONT_FAMILIES`（`types.ts:317-328`，10 项）：微软雅黑 / 苹方 / 宋体 / 黑体 / 楷体 / 仿宋 / 思源黑体 / Arial / Times / Consolas。
- `FONT_SIZES`（`types.ts:331`）：`[12,14,16,18,20,22,24,26,28,32,36,40,48]`。
- 色盘：`BRANCH_COLORS`（10 支，`theme.ts:12-23`）、`TEXT_COLORS`（10 支，`theme.ts:390-401`）、`HIGHLIGHT_COLORS`（10 支，`theme.ts:404-415`）、`BORDER_COLORS`（10 支，`theme.ts:418-429`）。

### 6.9 其它常量级事实

- `IconName` 共 34 个（`Icons.tsx:2-33`）：`undo redo insert-parent insert-sibling-above insert-sibling-below insert-child marker note link style node-style base-style theme structure priority progress icon fit zoom-in zoom-out chevron folder save trash copy check brush file-plus keyboard grid assoc summary group`。
- `buildBranchColors(root)`（`theme.ts:435-450`）：根节点每个一级分支按 `BRANCH_COLORS[i % 10]` 取色并向下继承；节点自身有 `color`/`style.borderColor` 时保留自定义色。
- 鱼骨图强制单色骨架 `FISHBONE_ACCENT = "#73a1bf"`（`theme.ts:9`），仅节点自身显式设色时例外。
- 折叠按钮半径 8.5、图标 `+`/`−`（`MindMap.tsx:2649-2663`）。

---

## 7. 交互与快捷键

### 7.1 鼠标

| 操作 | 区域 | 行为 | 行号 |
| --- | --- | --- | --- |
| 单击 | 节点 | `Ctrl/Cmd + 左键` → `toggleSelect`（多选）；否则 `select`（单选） | 2331-2341 |
| 双击 | 节点 | 若有概要/分组编辑框开着 → 先 `commitExtraEdit()`；再 `startEdit(node)` 进标题编辑 | 2350-2355 |
| 双击 | 画布（捕获阶段） | `extrasHitTest` 命中概要框 / 分组标题 → `preventDefault + stopPropagation` 进入文案内联编辑；**未命中则冒泡到节点编辑** | 1770-1785 |
| 右键 | 节点 | `preventDefault + select + setMenuId(node.id)` → 弹出**环形菜单**（仅 `editableNow`） | 2342-2349 |
| 右键 | 空白 | 屏蔽浏览器原生菜单 + 关闭环形菜单 | 2110-2114 |
| 左键按下 | 空白 | 开始平移画布（`dragRef`），位移 > 3px 判为 moved | 1497-1515 / 1517-1524 |
| 左键抬起 | 空白（未移动 & 不在 `.mm-node/.mm-collapse`） | `clearSelect`（多选集合一并清空） | 1526-1533 |
| 节点拖拽 | 节点 | 需 `api.setFreeDrag(true)`；阈值 5px 才进入拖拽；落点 `rel < -0.28 → before`、`> 0.28 → after`、否则 `child`；**根节点只能 child**；**不能拖进自己的子孙** | 1414-1475 / 1388-1412 |
| 滚轮 | 画布 | 默认**以指针为锚点缩放**（factor 1.1，钳制 `[0.15, 3]`，`e.preventDefault()` + `{passive:false}`，因此浏览器页面缩放不生效）；`setWheelAction("move")` 后为平移（`tx -= deltaY, ty -= deltaX`） | 772-795 |
| 折叠按钮 | 节点 | `toggleCollapse(node.id)` | 2644-2647 |
| 缩略图 | 左下 | 点击/拖拽导航（`onNavigate`） | 2995-3003 |
| 缩放控件 | 左下竖向 | `+` / `-` / 百分比（点击=适应屏幕）/ 适应屏幕图标 | 2955-2993 |
| 多选浮动条 | body（Portal） | 关联线 / 概要 / 分组 / 清空；位置优先放选区下方，放不下翻上方 | `MultiSelectBar.tsx:48-74` |

> ⚠️ **交互陷阱（务必写进文档）**：节点拖拽**默认关闭**。而 `mm-hint` 提示文案（`MindMap.tsx:3008`）无条件写着「拖动节点可排序 / 挂接」—— 默认配置下用户拖不动，文案是误导。正确姿势：`api.setFreeDrag(true)`。

### 7.2 键盘（画布 focus 时，`MindMap.tsx:1153-1247`）

| 键 | 行为 |
| --- | --- |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | 重做 |
| `Ctrl/Cmd + S` | 导出 `.km` 文件 |
| `Ctrl/Cmd + B` / `I` / `U` | 切换 粗体 / 斜体 / 下划线 |
| `Tab` | 新增子节点（`addChild`） |
| `Shift + Tab` | 节点上移一层（`outdent`） |
| `Enter` | 新增同级节点（`addSibling(false)`） |
| `Shift + Enter` | 在**前**面插入同级（`addSibling(true)`） |
| `F2` | 编辑当前节点标题 |
| `Delete` / `Backspace` | 删除节点（根节点被拒） |
| `空格` | 折叠 / 展开 |
| `Escape` | 关闭环形菜单 + 清空选中 |
| `↑ / ↓` | `Alt+↑/↓` → 同级前移/后移；否则上下方向导航 |
| `← / →` | 左右方向导航（`navigate`，按 `primary + perp*1.7` 打分选最近节点） |

**优先级与短路**：
1. `extraEdit`（概要/分组文案）开着 → 只响应 `Escape` 收起（`MindMap.tsx:1157-1163`）。
2. `editing`（节点标题）开着 → 快捷键全部让位给输入框（`MindMap.tsx:1165`）。
3. 输入框内（`MindMap.tsx:2884-2903`）：`Enter`（无 Shift、非输入法组合中）→ 提交并新增同级；`Tab` → 提交并新增子节点；`Shift+Tab` → 仅提交关闭；`Esc` → 丢弃。
4. 概要/分组输入框（`MindMap.tsx:2936-2949`）：`Enter` / `Tab` → 提交；`Esc` → 放弃。
5. 空文案兜底：概要 → `"概要"`；分组 → 标签置空（只剩虚线框）（`MindMap.tsx:1703-1722`）。
6. 备注模态框（`Dialog.tsx:51-68`）：多行 `Ctrl+Enter` 保存 / `Esc` 取消；单行 `Enter` 直接确认。
7. 环形菜单打开时，`Escape` 另有 window 级兜底监听（`MindMap.tsx:1478-1485`）。

### 7.3 只读态（`editableNow === false`）差异

| 项 | 只读态表现 |
| --- | --- |
| 选中环 | 不画（`.mm-ui-only` 仅在 `isSelected && editableNow` 时渲染，`MindMap.tsx:2364-2378`） |
| 多选提示环 | 不画（同上，`2379-2395`） |
| 拖拽落点提示 / 幻影 | 全在 `mm-ui-only` 组里，不渲染 |
| 节点 cursor | `default`（编辑态为 `pointer`） |
| 右键环形菜单 | 不弹出（`if (!editableNow) return`） |
| 内联编辑 | `startEdit` 直接 return；`onStageDoubleClickCapture` return |
| `window` 快捷键 | **整体失效** —— `stage` 的 `tabIndex = editableNow ? 0 : -1`（`MindMap.tsx:2103`），键盘事件挂在这个 div 上；只读态无法获得焦点 |
| 多选浮动条 | 不渲染（`editableNow && <MultiSelectBar>`，`MindMap.tsx:2833`） |
| 平移 / 缩放 / 缩略图 | **仍可用**（视图操作不判只读） |

### 7.4 概要与分组标题的双击内联编辑规则（`extras.tsx:687-726`）

命中分档（自上而下，先看概要再分组）：

1. **概要框整体命中**：`summaryGroups` 里每个框外扩 4px 的矩形内 → 直接返回（框本来就画在节点之外，不会误伤）。
2. **分组框 · 标题胶囊**：`extrasEditTarget` 给出的标签矩形外扩 3px → 命中。
3. **分组框 · 框内空白处**：几何在框内，但**必须不压住任何节点**（遍历 `boxes` 反查），否则**不命中**（双击会落到「编辑节点标题」）。
4. 都不中 → `null`，事件继续冒泡到节点。

> 为什么走**捕获阶段**（`onDoubleClickCapture`，`MindMap.tsx:1770`）：节点组上有一块比外框更大的透明命中区 `rect.mm-hit`（`MindMap.tsx:2444-2452`），分组框标题胶囊常压在它下面，冒泡阶段的画布监听器收不到 dblclick（事件已被节点吃去「编辑节点标题」）。故在捕获阶段拦下并 `stopPropagation`。

---

## 8. CSS 类名清单（`MindMap.css`，1259 行）

> 全部类名以 `mm-` 前缀开头，**宿主可安全覆盖**（不会误伤宿主样式）；全部在 `dist-lib/style.css` 中。
> 图例：〔结构〕容器/画布 〔工具条〕 〔主菜单/浮层〕 〔面板〕 〔多选条〕 〔环形菜单〕 〔画布内〕 〔编辑/提示〕

| 分类 | 类名 | 作用 | 可被宿主覆盖 |
| --- | --- | --- | --- |
| 结构 | `.mm-wrap` | 根容器（宽高来自 props） | ✅ |
| 结构 | `.mm-stage` | 画布容器，`overflow:hidden`，`cursor:grab` | ✅ |
| 结构 | `.mm-stage.is-editable` | 焦点外框样式 | ⚠️ **永远匹配不到**（见 §13.4） |
| 结构 | `.mm-svg` / `.mm-root` / `.mm-link` / `.mm-extras` | SVG 与 `<g>` 分组 | ✅ |
| 结构 | `.mm-node` / `.mm-rect` / `.mm-text` / `.mm-underline` / `.mm-hit` / `.mm-image` / `.mm-tags` | 节点图形元素 | ✅ |
| 结构 | `.mm-collapse` / `.mm-collapse-dot` | 折叠按钮 | ✅ |
| 结构 | `.mm-ui-only` | **导出时会被剥离的 UI 辅助层**（选中环/落点提示/拖拽幻影） | ✅ |
| 工具条 | `.mm-toolbar`、`.mm-tb-group`、`.mm-tb-sep`、`.mm-tb-btn`、`.mm-tb-letter`、`.mm-tb-select`、`.mm-tb-size`、`.mm-tb-font`、`.mm-tb-combo`、`.mm-color-trigger`、`.mm-color-letter`、`.mm-color-bar` | 工具条与下拉/色板 | ✅ |
| 工具条 | `.mm-file-input` | 隐藏的 `<input type=file>`（主菜单「打开」用） | ✅ |
| 工具条 | `.mm-zoom`、`.mm-zoom.is-vertical`、`.mm-zoom-btn`、`.mm-zoom-value`、`.mm-zoom-sep` | 左下竖向缩放控件 | ✅ |
| 工具条 | `.mm-minimap`、`.mm-minimap-svg`、`.mm-minimap.is-hover`、`.mm-minimap-tip` | 缩略图 | ✅ |
| 工具条 | `.mm-dock-bl` | 左下停靠区（缩放 + 缩略图） | ✅ |
| 多选条 | `.mm-msbar`、`.mm-msbar-row`、`.mm-msbar-btn`（+ `.is-on` / `.is-ghost`）、`.mm-msbar-sep` | 多选浮动条（Portal，fixed 定位） | ✅ |
| 主菜单 | `.mm-menu`、`.mm-menu-item`、`.mm-menu-sep`、`.mm-menu-head`、`.mm-menu-arrow`、`.mm-submenu`、`.mm-submenu.is-left` | 九宫格菜单与子菜单 | ✅ |
| 浮层 | `.mm-pop`、`.mm-pop-panel`、`.mm-pop-label`、`.mm-pop-tip`、`.mm-pop-action`、`.mm-pop-row`、`.mm-pop-select`、`.mm-pop-range`、`.mm-pop-input` | 通用浮层 | ✅ |
| 面板 | `.mm-marker-grid`、`.mm-marker-chip`、`.mm-swatches`、`.mm-swatch`（`.is-on`/`.is-none`）、`.mm-shape-grid`、`.mm-shape-chip`、`.mm-theme-grid`、`.mm-theme-card`、`.mm-theme-swatch`、`.mm-structure-grid`、`.mm-structure-card`、`.mm-branch-grid`、`.mm-branch-card`、`.mm-prio-grid`、`.mm-prio-chip`、`.mm-prog-grid`、`.mm-prog-chip`、`.mm-icon-grid`、`.mm-icon-chip`、`.mm-icon-emoji`、`.mm-canvas-styles`、`.mm-canvas-card`、`.mm-layout-list`、`.mm-check-row`、`.mm-seg`、`.mm-seg-btn`、`.mm-seg-cap`、`.mm-badge`、`.mm-shortcuts`、`.mm-shortcut-row` | 9 个面板内部控件 | ✅ |
| 环形菜单 | `.mm-radial`、`.mm-radial-ring`、`.mm-radial-btn`、`.mm-radial-center`、`.is-disabled` | 右键环形菜单 | ✅ |
| 编辑框 | `.mm-editor`、`.mm-editor-input`、`.mm-editor.is-extra`、`.mm-editor-input.is-extra` | 节点标题 textarea / 画布内联 input | ✅ |
| 提示 | `.mm-hint`（操作提示条）、`.mm-toast`、`.mm-toast.is-err` | 提示 | ✅ |
| 模态 | `.mm-modal-mask`、`.mm-modal`、`.mm-modal-title`、`.mm-modal-input`、`.mm-modal-actions`、`.mm-btn-ghost`、`.mm-btn-primary` | 备注/链接模态框 | ✅ |

---

## 9. IO / 导入导出（`io/index.ts` + `io/*`）

### 9.1 统一入口（`io/index.ts`）

| 导出 | 签名 | 行号 |
| --- | --- | --- |
| `IMPORT_ACCEPT` | `".km,.mindmap,.mm,.smm,.xmind,.json,.xml,.txt"` | 18 |
| `parseMindmapFile(fileName, buffer)` | `(string, ArrayBuffer) => Promise<ParsedMindmap>` | 140 |
| `ParsedMindmap` | `{ tree: MindNode; structure?: StructureType }` | 50 |
| `mapFileStructure(token)` | `(string \| undefined) => StructureType \| undefined` | 60 |
| `EXPORT_LABELS` | `Record<ExportFormat, string>` | 200 |
| `ExportFormat` | `"png" \| "svg" \| "smm" \| "km" \| "json" \| "mm" \| "xmind"` | 198 |
| `SvgPayload` | `{ svg: string; width: number; height: number }` | 210 |
| `ExportResult` | `{ blob: Blob; filename: string }` | 254 |
| `exportTree(root, format, getSvg, baseName?)` | `(MindNode, ExportFormat, () => SvgPayload, baseName = "mindmap") => Promise<ExportResult>` | 260 |
| `downloadBlob(blob, filename)` | `(Blob, string) => void` | 217 |
| `svgToPngBlob(payload, scale?)` | `(SvgPayload, scale = 2) => Promise<Blob>` | 229 |

**导入嗅探顺序**（`parseMindmapFile`，`io/index.ts:140-196`）：
1. `.xmind` → `parseXmind` + `detectXmindStructure`（读 `content.json` 的 `rootTopic.structureClass`，兜底 `content.xml` 的 `template`）。
2. 其余：先按内容首字符判断 `looksJson` / `looksXml`，然后 **json ⇄ xml 互备一圈**（`tryJson() ?? tryXml()` 或反之）。
3. `json` → `parseMindmapJson`（结构标记取 `layout` 或 `template`）；`xml` → 先 `parseFreeMind`，失败再 `parseKityMinderXml`。
4. 全失败 → `throw new Error("无法解析文件 …")`。

**编码处理**（`decodeText`，`io/index.ts:20-39`）：UTF-8 BOM / UTF-16 LE / UTF-16 BE / XML 里声明 `gb2312|gbk|gb18030` → 用 `gb18030` 解码。

**`EXPORT_LABELS` 全表**：

| key | label（菜单显示文案） |
| --- | --- |
| `png` | 图片 PNG |
| `svg` | 矢量 SVG |
| `json` | 有道/KM 扁平 JSON |
| `km` | KityMinder 脑图 .km |
| `mm` | FreeMind 文档 .mm |
| `smm` | SimpleMindMap .smm |
| `xmind` | XMind 工作簿 .xmind |

**`mapFileStructure` 判定顺序**（`io/index.ts:60-75`，**注意顺序有坑**：先命中的赢）：

| 顺序 | 条件 | 返回 |
| --- | --- | --- |
| 1 | 含 `fishbone` | `fishbone` |
| 2 | 含 `timeline` | `timeline` |
| 3 | 含 `catalog` 或 `spreadsheet` | `catalog` |
| 4 | 含 `both`/`balance`/`map`/`mindmap` | `mindmap` |
| 5 | 严格 `=== "default"` | `mindmap` |
| 6 | 含 `left` | `logical-left` |
| 7 | 含 `right` 或 **`logic`** | `logical-right` |
| 8 | 含 **`org`** 或 `structure` | `org` |
| — | 其它 | `undefined`（调用方回落 `mindmap`） |

> 例：`mapFileStructure("logicalStructure")` → 命中第 7 条（`includes("logic")`）→ **`logical-right`**（旧 README 正确 ✅）。
> 但 `mapFileStructure("structure")` → 命中第 8 条 → `org`（而非 mindmap），**属易踩的坑，建议文档点名**。

### 9.2 各格式读写

| 文件 | 函数 | 行号 | 说明 |
| --- | --- | --- | --- |
| json | `parseMindmapJson(raw)` | `json.ts:326` | 统一 JSON 入口 |
| json | `fromNested(raw, isRoot?)` | `json.ts:141` | 嵌套原始 ⇄ `MindNode` |
| json | `fromFlat(nodes)` | `json.ts:273` | 有道扁平数组（`FlatNode`）⇄ `MindNode` |
| json | 类型 `FlatNode` | `json.ts:11` | `{ id, topic, isroot?, expanded?, parentid?, customStyle?, style?, ...}` |
| freemind | `parseFreeMind(xml)` | `freemind.ts:19` | FreeMind XML |
| freemind | `exportFreeMind(root)` | `freemind.ts:154` | → `.mm` XML |
| freemind | `parseKityMinderXml(xml)` | `freemind.ts:162` | KityMinder `.km` XML（失败返回 `null`） |
| freemind | `exportYoudaoFlat(root)` | `freemind.ts:216` | 有道扁平 JSON（导出 `json`） |
| freemind | `exportKityMinder(root)` | `freemind.ts:258` | → `.km` |
| freemind | `exportSmm(root)` | `freemind.ts:306` | simple-mind-map 契约 `.smm` |
| freemind | `escapeXml(s)` | `freemind.ts:6` | XML 转义 |
| xmind | `parseXmind(data)` | `xmind.ts:92` | `(ArrayBuffer) => Promise<MindNode>`（ZIP + `content.json`） |
| xmind | `exportXmind(root)` | `xmind.ts:190` | `(MindNode) => Promise<Blob>` |

**依赖说明**：`jszip` **动态 import**（`io/index.ts:105-110`），仅在读写 `.xmind` / 探测 xmind 结构时加载，不进首屏；`katex` 静态 import（`extras.tsx:9`），公式节点需要宿主显式引入 `katex/dist/katex.min.css`。

---

## 10. 几何 / 手绘 / 文本工具

### 10.1 `layout.ts`

| 导出 | 签名 | 行号 |
| --- | --- | --- |
| `layoutTree(root, opts)` | `(MindNode, LayoutOptions) => LayoutResult` | 1013 |
| `nodeSize(node, depth = 0, pad = DEFAULT_PAD)` | `(MindNode, number?, SizePad?) => SizedNode` | 159 |
| `textCenterX(node, w)` | `(MindNode, number) => number` | 193 |
| `textBlockWidth(node, size)` | `(MindNode, SizedNode) => number` | 184 |
| `prefixWidth(node)` | `(MindNode) => number` | 112 |
| `rightBadgeWidth(node)` | `(MindNode) => number` | 125 |
| `measureTagWidth(text)` | `(string) => number` | 105 |
| `defaultFontSizeForDepth(depth)` | `(number) => number` → 24 / 18 / 11 | 135 |
| `TEXT_LEFT_INSET` | `12` | 86 |
| `IMAGE_BOX` | `40` | 95 |

- `LayoutOptions { structure, branchColors: Map, linkColor: string, lineStyle }`（`layout.ts:67-72`）。
- `LayoutResult { nodes, links, width, height, byId: Map, rootPos }`（`layout.ts:58-65`）。
- `PositionedNode` 关键扩展字段：`axis("h"\|"v")`、`sgn`、`rot`（鱼骨图倾斜）、`busX?`、`dotDX/dotDY?`（折叠按钮锚点，`layout.ts:33-39`）。
- `MindLink` 关键字段：`from/to`、`color`、`curve`、`axis("h"\|"v"\|"diag")`、`sgn`、`path?`（时间轴/目录/鱼骨的预计算路径）、`straight?`（由 `lineStyle` 统一回填，`layout.ts:1068`）。
- 布局常量：`H_GAP 58`、`V_GAP 12`、`V_LEVEL_GAP 46`、`V_SIB_GAP 22`、`PAD_X 16`、`PAD_Y 11`、`MIN_W 72`；目录图 `CAT_INDENT 38 / CAT_STUB 10 / CAT_COL_GAP 46 / CAT_BUS_DROP 18`；时间轴 `TL_COL_GAP 56 / TL_INDENT 36 / TL_TRUNK_DX 0 / TL_STUB / TL_V_GAP 8`；鱼骨 `FB_*` 见 `layout.ts:783-804`。
- 归一化：`layoutTree` 出口把所有坐标平移到 `(0,0)` 起点，并同步平移 `l.path` 里的数字（`layout.ts:1056-1076`）。

### 10.2 `handdrawn.ts`

| 导出 | 签名 | 返回 | 行号 |
| --- | --- | --- | --- |
| `sketchRect(x,y,w,h,r,seed,o?)` | — | `string[]`（2 条闭合笔触） | 319 |
| `sketchEllipse(cx,cy,rx,ry,seed,o?)` | — | `string[]` | 337 |
| `sketchLine(x1,y1,x2,y2,seed,o?)` | — | `string[]` | 356 |
| `sketchCurve(p0,c1,c2,p1,seed,o?)` | — | `string[]` | 376 |
| `sketchPath(d, seed, o?)` | `d` 形如 `M…` / `M…L…` / `M…C…` | `string[]` | 412 |
| `sketchArrowHead(tip, dir, size, halfW, seed, o?)` | — | `string[]`（空心 V，2 条） | 456 |
| `handLine/handCurve/handRect/handEllipse` | 同 sketch\*，第 3/4 位带 `amp` 默认 1.5/1.6 | `string`（单笔） | 483 / 495 / 506 / 518 |
| type `SketchOptions` | `{ amp?, gap?, passes?, overshoot?, segments? }` | 默认 `1.2 / 2.1 / 2 / 0 / 12` | 119 / 132-138 |

> **确定性硬约束**：抖动只依赖「几何 + 种子」，不用 `Math.random()`（`handdrawn.ts:19-22`），否则每次重渲染/导出 SVG 线条都会变样。
> `sketchEllipse` 内部把 `gap` 乘 1.35（`handdrawn.ts:346`）；`sketchArrowHead` 内部把 `gap` 置 0（两笔本身即分叉）。

### 10.3 `branchstyle.ts` / `text.ts`

- `branchPath(style, g: BranchGeom, depth = 18): string | null`（`branchstyle.ts:44`）；`BranchGeom { p0,p1,v0,v1,cubic,c1?,c2? }`（`branchstyle.ts:12-24`），由 `MindMap.tsx:329-343 的 toBranchGeom` 从 `linkPath` 产出。
- `measureText(text, fontSize, bold = false): number`（`text.ts:24`）—— 纯字符宽度表，**不依赖 canvas**。
- `wrapText(text, fontSize, maxWidth, bold = false): TextMetrics`（`text.ts:43`）—— 中文逐字断行、西文按空格断词、尊重显式 `\n`；`lineHeight = round(fontSize*1.45)`。
- `TextMetrics { lines, width, height, lineHeight }`（`text.ts:30-37`）。

### 10.4 `tree.ts` 全量导出（`export *`，`index.ts:123`）

`uid(prefix="n")`、`createNode(title="分支主题")`、`cloneTree(node, remapIds=false)`、`findNode(root,id)`、`findParent(root,id): {parent,index}|null`、`findPath(root,id): MindNode[]`、`allNodes(root)`、`visibleNodes(root)`、`opAddChild(root,selectedId)`、`opAddSibling(root,selectedId,before=false)`、`opAddParent(root,selectedId)`、`opDelete(root,selectedId)`、`opUpdate(root,id,patch,stylePatch?)`、`opMove(root,dragId,targetId,position)`、`opOutdent(root,selectedId)`、`opToggleCollapse(root,id)`、`countNodes(node)`、`sampleTree()`；类型 `TreeOpResult { tree, focusId, changed }`。
所有 `op*` 都基于 `cloneTree` 做不可变更新，返回新树。

---

## 11. 构建与回归流水线

### 11.1 `package.json`（v1.0.0）

| 字段 | 值 |
| --- | --- |
| `main` | `./dist-lib/mindmap-vite.umd.js` |
| `module` | `./dist-lib/mindmap-vite.es.js` |
| `types` | `./dist-lib/components/MindMap/index.d.ts` |
| `style` | `./dist-lib/style.css` |
| `exports` | `"."` → types/import(es)/require(umd)；`"./style.css"`；`"./dist-lib/*"` |
| `files` | `["dist-lib", "README.md"]` |
| `sideEffects` | `["./dist-lib/style.css"]` |
| peerDeps | `react` / `react-dom` `^18.0.0 \|\| ^19.0.0` |
| deps | `jszip ^3.10.1`、`katex ^0.16.11` |
| devDeps | `@types/react@^18`、`@types/react-dom@^18`、`@vitejs/plugin-react@^4`、`typescript@^5.5`、`vite@^5.4` |

### 11.2 scripts

```bash
npm run dev         # vite（demo 站点）
npm run build       # tsc -b && vite build（demo 生产构建）
npm run build:lib   # vite build --config vite.lib.config.ts && tsc -p tsconfig.lib.json
npm run verify      # bash verify/run.sh
npm run preview     # vite preview
```

### 11.3 构建配置

- `vite.config.ts`（8 行）：仅 `plugins:[react()]`。
- `vite.lib.config.ts`：`outDir dist-lib`、`emptyOutDir:false`（防止 tsc 先写的 `.d.ts` 被冲掉）、`sourcemap:true`、`lib.entry = src/components/MindMap/index.ts`、`name = "MindMapVite"`、`formats ["es","umd"]`、`fileName = mindmap-vite.{format}.js`；`external: react / react-dom / react/jsx-runtime / jszip`；globals `React / ReactDOM / jsxRuntime / JSZip`。
- `tsconfig.json`：`strict`、`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`、`jsx:react-jsx`、`moduleResolution: bundler`、`noEmit:true`、`include:["src"]`，`references:` `tsconfig.node.json`。
- `tsconfig.lib.json`：`emitDeclarationOnly`、`declaration`、`outDir dist-lib`、`rootDir src`、`include: ["src/components/MindMap", "src/data/adapter.ts"]`。
- `tsconfig.node.json`：composite，include 仅 `vite.config.ts`。

### 11.4 产物结构

```
dist-lib/
  mindmap-vite.es.js / .es.js.map        ESM
  mindmap-vite.umd.js / .umd.js.map      UMD（全局名 MindMapVite）
  style.css                              组件样式（18 KB）
  components/MindMap/*.d.ts              tsc -p tsconfig.lib.json 生成（index/types/MindMap/... 共 18 项 + io/）
```

### 11.5 `npm run verify` 流水线（`verify/run.sh`）

| STEP | 内容 | 命令 |
| --- | --- | --- |
| STEP 0 | 清理旧产物 | `rm -rf dist-lib verify/consumer/dist verify/.tmp/logic.cjs verify/.tmp/ssr.cjs` |
| STEP 1 | 类型检查 | `tsc -b --force` |
| STEP 2 | 库构建 | `npm run build:lib` |
| STEP 3 | 逻辑断言（纯 Node） | esbuild 打包 `verify/logic.entry.ts` → `verify/.tmp/logic.cjs` → node 执行；断言覆盖 树操作 / 布局 / 主题常量 / 导入导出往返 / 有道适配 |
| STEP 4 | 产物静态校验 | `node verify/artifacts.mjs`（文件齐全 / `exports` 自洽 / 关键导出 / d.ts 声明） |
| STEP 5 | 产物 SSR 消费 | esbuild 打包 `verify/ssr.entry.tsx`（`--alias:mindmap-vite=./dist-lib/mindmap-vite.es.js`，react/react-dom 外部）→ node + `react-dom/server` 渲染并断言 |
| STEP 6 | 构建消费方工程 | `ln -sfn` 软链 `mindmap-vite` / `react` / `react-dom` / `scheduler` / `katex` / `jszip` 到 `verify/consumer/node_modules`，再 `vite build --config verify/consumer/vite.config.ts` |
| STEP 7 | 浏览器回归（真 Chrome） | `node verify/browser.mjs`，默认 `PORT 5199`，截图 `verify/shots/consumer.png` |
| STEP 8 | 多选浮动条交互回归（打**消费方产物**，`DIST` 环境变量） | `node verify/extra-e2e.mjs`，默认 `PORT 5277` |
| 收尾 | 全通过打印「回归全部通过 ✅」 | 任一 `fail` 即 `exit 1` |

- `verify/` 下各脚本职责：`logic.entry.ts`（纯逻辑断言）、`artifacts.mjs`（产物静态校验）、`browser.mjs`（Chrome 渲染/7 结构/编辑/只读/工具条/导入导出/导出 SVG/运行时 0 报错）、`extra-e2e.mjs`（多选 → 概要 → 改文案 → 分组 → 改标题 → 双击复查 → Esc，共截图 6 张）、`ssr.entry.tsx`（产物 SSR 消费）、`ui-preview/toolbar-preview/summary-preview/hand-preview/icons-preview`（可视化预览页）、`summary-geom.ts`（概要几何探针）、`consumer/`（消费方工程）。
- 通过标准：**任一 step 非零退出 → 整体失败**；用例口径「7 节点 / 6 连线」（`consumer/main.tsx` fixture）；补齐项断言：`<image>` ×1、katex `foreignObject` ×1、`rect` ≥1。
- 环境前提：Node 18+；浏览器阶段需 `playwright-core`（`NODE_PATH` 或自带 chromium）+ 本机 Chrome（`PLAYWRIGHT_CHROME` 可覆盖）；`PORT` 未被占用。
- ⚠️ 编号口径：run.sh 实际是「STEP 0 + STEP 1..8」共 9 段，`verify/README.md` 表格写的是 1..8（`browser.mjs` 为第 7 段）。**文档别写成「8 步」时与 run.sh 输出对不上**，建议写「8 个阶段（含清理步骤共 9 段）」。

---

## 12. 已知约定 / 陷阱

1. **`style.css` 必须显式引入**：组件内 `import "./MindMap.css"`（`MindMap.tsx:96`）只在 vendor 进宿主的构建里生效；npm 消费方必须 `import "mindmap-vite/style.css"`。
2. **`editable` 只是初值**，运行期用 `api.setMode()`；`props.editable` 变更不会回写 `mode`。
3. **`lineStyle: "straight"` 只影响绘制**（`types.ts:182-184`），折点仍由布局决定；`linkPath` 里 `straight` 时直接 `M…L…` 连两端点（`MindMap.tsx:311-312`）。
4. **时间轴/鱼骨结构会有额外轴线连线**：时间轴有一条贯穿主轴（`layout.ts:765-773`）、鱼骨有一条脊柱（`layout.ts:996-1004`），因此 `links.length ≠ nodes.length - 1` 属预期。
5. **节点不自动换行**：`nodeSize` 向 `wrapText` 传 `Number.POSITIVE_INFINITY`（`layout.ts:162`），只保留显式 `\n`；所有宽度靠 `measureText` 的字符表估算。
6. **SSR 只出骨架**：公式宽度靠 `katex` 在隐藏 DOM 实测（`extras.tsx:32-64`），无 DOM 时按比例估算；缩略图/外框/概要依赖布局；`fit()` 在 `clientWidth=0` 时直接 return。**因此 SSR 输出不含缩略图位置与公式精确宽度**。
7. **Portal 内容在 SSR 不渲染**：`MultiSelectBar` 用 `createPortal(..., document.body)`（`MultiSelectBar.tsx:96-140`），SSR 无多选条；`Minimap` 依赖 `stageSize`（`clientWidth>0` 才渲染，`MindMap.tsx:2995`）。
8. **节点拖拽默认关闭**，需 `api.setFreeDrag(true)`；而 `mm-hint` 文案无条件提示「拖动节点可排序 / 挂接」（文案与默认行为不符）。
9. **`setTree()` 会清撤销历史**并触发 `onChange`，还会把选中重置到根节点。
10. **`clearNodeStyles()` 只清 `style.shape`**，不清其它样式字段。
11. **只读态键盘快捷键整体失效**（`stage` `tabIndex=-1`），但视图操作（平移 / 缩放 / 缩略图）仍可用。
12. **缩放钳制**：`MIN_SCALE 0.15` / `MAX_SCALE 3`（`MindMap.tsx:98-99`）；滚轮以指针为锚点、`e.preventDefault()`，浏览器页面缩放不生效。
13. **撤销栈上限 80**，超出丢弃最早的 `past`。
14. **`taper` 与 `dashed` 互斥**（填充带无法用 dasharray）；手绘主题下 `taper` 改用手绘中心线填充。
15. **`props.onChange` 首次挂载不触发**；`data` 引用变化会自动 reset 内部树。
16. **宿主必须给容器确定高度**，否则 `fit()` 空转、画布不居中。
17. **`THEME_CATEGORIES` 与 `THEME_GROUPS` 是同一对象**（别名导出），改一个等于改另一个。
18. **`logical-left` / `logical-right` 的中文 label 相同**（都是「逻辑结构图」），靠缩略图区分。
19. **公式节点需要宿主额外引入 `katex/dist/katex.min.css`**。

---

## 13. 三方不一致清单（**实现 / 类型声明 / 旧 README**，下游最需要）

> 排序：影响面从大到小。

| # | 类别 | 不一致点 | 实现（以代码为准） | 类型声明 | 旧 README | 建议文档口径 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **命令式 API 签名** | `addSummaryFor` / `addFrameFor` 的入参 | 零参、作用于当前多选集合、入参被忽略；文案固定 `"概要"` / `"分组"` 并**立即进入内联编辑**（`MindMap.tsx:1660/1681/1849/1850`） | `types.ts:403/405` 声明 `addSummaryFor(text: string)` / `addFrameFor(label: string)`（**已编译进 d.ts**） | 写成了带参 | **API 手册按「无参」写并附类型修正建议**；同时建议在代码层收敛（把声明改成无参 + 提供 `addSummaryFor(text?)` 覆盖默认文案，或让实现接受可选文案） |
| 2 | **命令式 API 返回类型** | `getSvg()` | 返回 `SvgPayload { svg, width, height }`（`MindMap.tsx:1969` → `buildSvgPayload` 1270-1297）；`svgRef` 未就绪时 **throw** | `types.ts:481` 声明 `: unknown` | 写 `SvgPayload { svg, width, height }`（✅） | API 手册写 `SvgPayload`，并**标注类型声明偏保守，需要 `as SvgPayload` 或修正 d.ts** |
| 3 | **交互默认是关闭的** | 节点拖拽 | 需 `api.setFreeDrag(true)`；`beginNodeDrag` 第一行就 `if (!freeDragRef.current) return`（`MindMap.tsx:1417`） | `setFreeDrag(v: boolean)` 存在 | 未提 | README「交互速查」必须写「拖动排序/挂接需先 `setFreeDrag(true)`」；并建议修 `mm-hint` 文案 |
| 4 | **CSS 选择器失效** | `.mm-stage.is-editable` | JSX 实际输出 `is-editableNow`（`MindMap.tsx:2101`） | — | 未提 | 文档不要承诺「只读态焦点框」；建议顺手改 CSS 选择器或 JSX 类名 |
| 5 | **方法语义与命名不符** | `clearNodeStyles()` | 只把 `style.shape` 置 undefined（`MindMap.tsx:1855-1862`） | 无注释 | 未提 | API 手册写明「仅清除形状，不重置颜色/字号等」 |
| 6 | **历史被静默清理** | `setTree()` | 走 `reset`，清 `past/future`、选中切根、触发 `onChange` | 注释「直接替换树」 | 未提 | API 手册标 🟡「会清空撤销历史并触发 onChange」 |
| 7 | **只读态键盘失效** | stage `tabIndex` | `editableNow ? 0 : -1`（`MindMap.tsx:2103`） | — | README 只说「不渲染 mm-ui-only 选中环」（部分正确） | README 补「只读态不支持键盘快捷键，但保留缩放/平移」 |
| 8 | **导入格式清单不全** | `.xml` / `.txt` | `IMPORT_ACCEPT = ".km,.mindmap,.mm,.smm,.xmind,.json,.xml,.txt"`（`io/index.ts:18`） | — | 导入清单漏 `.xml` / `.txt` | README/API 补上 `.xml`（FreeMind/KityMinder）与 `.txt`（嗅探兜底） |
| 9 | **工具条「多选面板」已下线** | 多选入口 | 改为画布浮动条 `MultiSelectBar`（`MindMap.tsx:2832-2842`），工具条不再含多选 | `MultiSelectBar` 导出 | 未提 | README 加「交互速查」一节点到浮动条 |
| 10 | **导出面遗漏项** | extras / layout 的部分函数 | 未导出（见 §2.9） | — | 未提 | API 手册「内部/扩展」章节声明「以下不保证稳定」 |
| 11 | **`getSelectedIds()` 语义** | 单选时也返回长度 1 的数组 | `selectOnly(id)`（`MindMap.tsx:160-162`） | — | 未提 | API 手册注明「单选≠空数组；判断多选请用 `length >= 2`」 |
| 12 | **别名导出易误用** | `THEME_CATEGORIES` / `THEME_GROUPS` | 同一数组的两个名字（`index.ts:95`） | — | 未提 | API 手册注明二者等价 |
| 13 | **结构 label 重复** | `logical-left` / `logical-right` | 中文 label 同为「逻辑结构图」（`theme.ts:287-288`） | — | 未提 | 主题/结构表加脚注 |
| 14 | **`mapFileStructure` 顺序坑** | 含 `logic` 即判 `logical-right`，含 `structure` 判 `org` | `io/index.ts:60-75` | — | 示例 `mapFileStructure("logicalStructure") → "logical-right"` **是对的** | 建议补一句「判定按固定优先级，命中即返回」 |
| 15 | **新增节点标题固定** | `addChild/addSibling/addParent` 新建节点 | 标题一律「分支主题」，并立刻进编辑态（`MindMap.tsx:862/869/877`、`tree.ts:12`） | — | 未提 | API 手册注明 |
| 16 | **`setNodeStyle` 的副作用** | 传 `fontSize`/`fontFamily` | 会顺带改写 `textDefaults`，即使只读态已 return（`MindMap.tsx:925-930`） | — | 未提 | API 手册标 🟡 |

---

## 附录 A：文档结构设计（完整章节树见回传给 team-lead 的消息）

- `README.md`：**短**（≤250 行），面向 npm / GitHub 读者 —— 定位 / 特性 / 安装 / 快速开始 / 交互速查 / 配置与主题（各给 2-3 个代表）/ 数据结构速览 / 目录结构 / 开发调试 / 回归测试 / 跳转 API 手册。
- `docs/API.md`：**长**（≥700 行），面向调用方/集成方 —— 导出符号总表 / Props / 命令式 API（分组 + 每方法一行表格 + 示例）/ 类型（MindNode 及所有补齐项）/ 常量枚举全表 / IO / 几何·手绘·文本 / CSS 类名 / SSR / 集成示例（vendor vs npm）/ 迁移与已知约定 / 版本说明。
- 分工红线：**全量表只进 API 手册**（17 个主题、24 个图标、12 个标记、8 种分支样式、CSS 全类名）；README 只给代表项 + 一句「完整清单见 API 手册」。
