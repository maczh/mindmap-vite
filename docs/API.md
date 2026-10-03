# mindmap-vite · API 手册

> 配套 [`README.md`](../README.md)（概览 / 安装 / 快速开始 / 交互速查）。
> **事实口径一律以 `src/` 代码为准**：凡与旧 README 冲突，以本手册为准。条目均标 `文件:行号`，便于复核。
> 本轮文档化时未修改 `src/` 下任何文件；已知的代码缺陷在 §11 与 §12 集中标注（改代码属后续独立任务）。
>
> 版本：v1.0.0（`package.json:4`）。

---

## 1 总览

### 1.1 包信息

| 字段 | 值 |
| --- | --- |
| 包名 / 版本 | `mindmap-vite` / `1.0.0` |
| 许可证 | MIT |
| `main` / `module` / `types` / `style` | `dist-lib/mindmap-vite.umd.js` / `.es.js` / `dist-lib/components/MindMap/index.d.ts` / `dist-lib/style.css` |
| `files` | `["dist-lib", "README.md"]` |
| peerDependencies | `react`、`react-dom`：`^18.0.0 \|\| ^19.0.0` |
| dependencies | `jszip ^3.10.1`（读写 `.xmind`，**动态** import）、`katex ^0.16.11`（公式，静态 import） |
| devDependencies | `@types/react@^18`、`@types/react-dom@^18`、`@vitejs/plugin-react@^4`、`typescript@^5.5`、`vite@^5.4` |

外部依赖：`react` / `react-dom` / `react/jsx-runtime` / `jszip`（`vite.lib.config.ts` 的 `external`）。

### 1.2 产物结构

```
dist-lib/
├── mindmap-vite.es.js         / .es.js.map      ESM
├── mindmap-vite.umd.js        / .umd.js.map     UMD（全局名 MindMapVite）
├── style.css                                    全部 mm- 样式
└── components/MindMap/*.d.ts                    tsc -p tsconfig.lib.json 生成
```

### 1.3 导出符号总表

图例：✅ 官方推荐（README 会写） / ⚙️ 高级 · 内部（普通调用方不需要） / 📦 `export *` 透出。

#### ✅ 组件与 UI 部件

| 导出 | 来源 | 类型 | 说明 |
| --- | --- | --- | --- |
| `MindMap` | `MindMap.tsx:528` | component | 主组件，`forwardRef<MindMapApi, MindMapProps>`（default 也导出 `MindMap.tsx:3037`） |
| `Toolbar` | `Toolbar.tsx:94` | component | 顶部工具条，可用 `mainMenu` 注入自定义九宫格 |
| `MultiSelectBar` | `MultiSelectBar.tsx:35` | component | 多选浮动条（关联线 / 概要 / 分组 / 清空），`createPortal` 挂 body |
| `MainMenu` | `Menu.tsx:65` | component | 九宫格主菜单（`maxRatio` 默认 `0.78`，自动避让视口） |
| `buildMainMenu` | `Menu.tsx:338` | function | 造菜单项数组，返回 `(close) => MainMenuItem[]` |
| `Dialog` | `Dialog.tsx:17` | component | 轻量模态框（备注 / 超链接） |
| `Icon` | `Icons.tsx:217` | component | 34 个 24×24 线性图标，`currentColor` 描边 |
| `NodeStylePanel` / `BaseStylePanel` / `ThemePanel` / `StructurePanel` / `MarkerPanel` / `PriorityPanel` / `ProgressPanel` / `IconPanel` | `panels.tsx:169/260/417/455/491/527/558/588` | component | 8 个配置面板 |
| `StructureThumb` / `ThemeSwatch` / `BranchThumb` | `panels.tsx:41/122/141` | component | 结构 / 主题 / 分支样式缩略图 |
| ⚙️ `PanelHint`（`panels.tsx:619`） | — | component | 面板底部提示行，**未**从 `index.ts` 再导出 |
| 类型 `ToolbarProps` / `MultiSelectBarProps` / `MainMenuItem` / `MainMenuProps` / `MainMenuActions` / `IconName` / `IconProps` | — | — | 自定义工具栏 / 菜单必备 |

#### ✅ 类型（共 **23** 个，`index.ts:27-51`）

`MindNode`、`MindNodeShape`、`MindNodeStyle`、`MindBorderStyle`、`MindNodeImage`、`MindNodeFrame`、`MindGeneralization`、`MindAssocLine`、`MindAssocArrow`、`MindSummaryGroup`、`MindFrameGroup`、`MindMapApi`、`MindMapProps`、`MindMapConfig`、`BaseStyle`、`CanvasCategory`、`LineStyle`、`StructureType`、`TextDefaults`、`LinkPattern`、`LinkArrow`、`LinkColorMode`、`BranchStyle`。

#### ✅ 常量（`index.ts:52-64`）

`DEFAULT_CONFIG`、`DEFAULT_TEXT`、`FONT_FAMILIES`、`FONT_SIZES`、`SHAPES`、`BORDER_STYLES`、`BORDER_DASH`、`LINK_PATTERNS`、`LINK_ARROWS`、`LINK_COLOR_MODES`、`BRANCH_STYLES`。

#### ✅ 主题 / 枚举（`index.ts:91-118`）

`THEME_LIST`、`THEME_MAP`、`THEME_CATEGORIES`（**别名 `THEME_GROUPS`，指向同一数组**，`index.ts:95`）、`DEFAULT_THEME_ID`、`STRUCTURES`、`BORDER_COLORS`、`STRUCTURE_MAP`、`MARKERS`、`MARKER_MAP`、`BRANCH_COLORS`、`TEXT_COLORS`、`HIGHLIGHT_COLORS`、`NODE_ICONS`、`NODE_ICON_MAP`、`PRIORITY_COLORS`、`PRIORITY_LEVELS`、`PROGRESS_LEVELS`、`PROGRESS_COLOR`、`PROGRESS_TRACK`、`buildBranchColors`；类型 `CanvasTheme`、`MarkerDef`、`NodeIconDef`。

#### ✅ 几何 / 布局 / 手绘

| 导出 | 说明 |
| --- | --- |
| `layoutTree` / `nodeSize` / `textCenterX` | 布局三件套 |
| `handLine` / `handCurve` / `handRect` / `handEllipse` | 手绘**单笔**兼容版（= `sketch*` 的第 0 笔） |
| `sketchLine` / `sketchCurve` / `sketchRect` / `sketchEllipse` / `sketchPath` / `sketchArrowHead` | 手绘**双笔触**版（返回 `string[]`） |
| `branchPath` | 分支样式路径生成 |
| `measureText` / `wrapText` | 纯字符宽度估算 / 换行（不依赖 canvas，SSR 可用） |
| ⚙️ 类型 `SketchOptions` / `BranchGeom` / `PositionedNode` / `MindLink` / `LayoutResult` / `SizedNode` / `TextMetrics` | 高级 |

#### 📦 树操作（`index.ts:123`，`export * from "./tree"`）

`uid`、`createNode`、`cloneTree`、`findNode`、`findParent`、`findPath`、`allNodes`、`visibleNodes`、`opAddChild`、`opAddSibling`、`opAddParent`、`opOutdent`、`opDelete`、`opUpdate`、`opMove`、`opToggleCollapse`、`countNodes`、`sampleTree`、`depthOf`；类型 `TreeOpResult`。

> ⚠️ 旧盘点稿漏了 `depthOf`（`tree.ts:119`，「根为 0、找不到返回 -1」），本版补上。

#### ✅ 导入导出（`index.ts:126-147`）

`mapFileStructure`、`parseMindmapFile`、`exportTree`、`downloadBlob`、`svgToPngBlob`、`EXPORT_LABELS`、`IMPORT_ACCEPT`；类型 `ParsedMindmap`、`ExportFormat`、`SvgPayload`、`ExportResult`、`FlatNode`；子模块 `parseMindmapJson` / `fromNested` / `fromFlat`、`parseFreeMind` / `exportFreeMind` / `parseKityMinderXml` / `exportYoudaoFlat` / `exportKityMinder` / `exportSmm` / `escapeXml`、`parseXmind` / `exportXmind`。

#### ✅ 数据适配（`index.ts:150-151`）

`adaptYoudaoMindmap`、类型 `YoudaoMindmap`、`YoudaoNode`。

#### ❌ 不对外导出（**不要**在文档/代码里承诺）

`extras.tsx` 全部（`ExtrasLayer`、`summaryGroupGeom`、`frameGroupGeom`、`extrasEditTarget`、`extrasHitTest`、`latexWidth`、`NodeImage`、`NodeTags`、`FormulaText` …）；`Minimap`、`Popover`（含 `PopLabel`）；`layout.ts` 的 `prefixWidth` / `textBlockWidth` / `rightBadgeWidth` / `measureTagWidth` / `defaultFontSizeForDepth` / `TEXT_LEFT_INSET` / `IMAGE_BOX` / `SizePad`；`theme.ts` 的 `FISHBONE_ACCENT`；`handdrawn.ts` 内部 helper。

---

## 2 Props（`MindMapProps`，11 个字段，`types.ts:342-365`）

默认值见 `MindMap.tsx:529-541`。

| 字段 | 类型 | 默认 | 语义 | 受控? | 备注 |
| --- | --- | --- | --- | --- | --- |
| `data` | `MindNode` | **必填** | 根节点数据 | **非受控**（内部 `useReducer` 持有副本） | 引用变化（`data !== lastExternal.current`）时组件自动 `dispatch reset`，`MindMap.tsx:570-574` |
| `width` | `number \| string` | `"100%"` | 容器宽度 | 半受控（直接写 style） | `MindMap.tsx:2011` |
| `height` | `number \| string` | `"100%"` | 容器高度 | 半受控 | 同上；**宿主必须给外层确定高度**，否则 `fit()` 因 `clientHeight = 0` 空转（`MindMap.tsx:726`） |
| `className` | `string` | — | 追加在 `.mm-wrap` 之后 | — | `MindMap.tsx:2011` |
| `fitOnMount` | `boolean` | `true` | 挂载后自动适应屏幕 | — | **仅挂载执行一次**（`useEffect(…, [])`，`MindMap.tsx:741-745`）；容器后续尺寸变化只会更新 stageSize，**不会**重新 fit |
| `editable` | `boolean` | `true` | **只是初值** | 否 | 运行期切换必须走 `api.setMode()`；`mode` 是独立 state（`MindMap.tsx:641`），`props.editable` 变更**不会回写** |
| `showToolbar` | `boolean` | `true` | 是否渲染自带工具条 | — | 与只读态**无关**（只读时仍会渲染 Toolbar） |
| `onChange` | `(tree: MindNode) => void` | — | 树变更回调 | — | **首次挂载不触发**（`firstChange` ref，`MindMap.tsx:559-566`）；`setTree()` 也会触发 |
| `defaultConfig` | `Partial<MindMapConfig>` | — | 初始配置（themeId / structure / lineStyle / base） | 否（只作初值） | 与 `DEFAULT_CONFIG` 一层浅合并（`{...DEFAULT_CONFIG, ...defaultConfig}`，`MindMap.tsx:576-579`）；运行期改配置走 `api.setConfig()` |
| `onScaleChange` | `(scale: number) => void` | — | 缩放变化回调 | — | `transform.scale` 每次变化都触发（`MindMap.tsx:661-663`） |
| `onSelectChange` | `(id: string \| null) => void` | — | 选中变化回调 | — | `doc.selectedId` 每次变化都触发（`MindMap.tsx:667-669`） |

**三条红线**

1. **`data` 不是受控源**：传新引用 = 内部 `reset`（清撤销历史 + 选中回根 + 触发 `onChange`）。持久化请在 `onChange` 里做，不要回写 `data`。
2. **`editable` 不是运行期开关**：只有 `api.setMode()` 能切模式；`props.editable` 改了没反应。
3. **`defaultConfig` 只是初值**：运行期改配置请走 `api.setConfig()` / `setStructure()` / `setLineStyle()` / `setThemeId()` / `setBase()`。

> `defaultConfig.base` 是「各字段单独回退」而非整块替换：`MindMap.tsx:687-694` 逐个 `base.X ?? theme.X`；`taper` 与 `dashed` 互斥、`branchStyle` 默认 `"default"`、`linkColorMode` 默认 `"auto"`。

---

## 3 命令式 API（`MindMapApi`，共 **71** 个方法）

声明面 `types.ts:372-487`；实现面 `MindMap.tsx:1811-1979`（依赖数组 `1980-2007`）。

```tsx
const api = useRef<MindMapApi>(null);
<MindMap ref={api} data={tree} />
api.current?.setMode("readonly");   // 切阅读态
```

图例：🔴 类型声明与实现不一致 / 🟡 有非直觉副作用 / ⚪ 纯读。

### 3.1 数据与历史

| 方法 | 签名 | 返回 | 行号 | 坑 |
| --- | --- | --- | --- | --- |
| `getTree()` | `() => MindNode` | `MindNode`（引用） | 1813 | ⚪ 走 `treeRef` |
| `setTree(tree)` | `(tree: MindNode) => void` | void | 1814 | 🟡 见下 |
| `undo()` | `() => void` | void | 1817 | `past` 空则无动作 |
| `redo()` | `() => void` | void | 1818 | `future` 空则无动作 |
| `canUndo()` | `() => boolean` | `doc.past.length > 0` | 1819 | ⚪ |
| `canRedo()` | `() => boolean` | `doc.future.length > 0` | 1820 | ⚪ |

- **`setTree()` 副作用**（🟡）：走 reducer 的 `reset` 分支（`MindMap.tsx:208-215`）——**清空 past 与 future（撤销 / 重做历史被抹掉）**、选中强制切到新根节点、多选集合重置为单选根；因 `doc.tree` 换了引用，**会触发一次 `onChange`**。
- `HISTORY_LIMIT = 80`（`MindMap.tsx:100`）：`commit` 时超上限丢最旧的 `past`。

```tsx
// 读 + 改 + 撤销
const tree = api.current!.getTree();
api.current!.setTree({ ...tree, title: "新标题" });
api.current!.undo();          // 可撤销 —— 前提：别用 setTree 写，用内部操作
console.log(api.current!.canUndo());
```

```tsx
// ⚠️ 这条会清掉整段历史：
api.current!.setTree(newTree);           // 之后 canUndo() === false
```

### 3.2 结构操作（全部作用于当前主选中项）

| 方法 | 签名 | 返回 | 行号 | 坑 |
| --- | --- | --- | --- | --- |
| `addChild()` | `() => void` | void | 1823 | 目标 = `doc.selectedId ?? doc.tree.id`；**只读态直接 return**；新节点标题固定「分支主题」并**立刻进入内联编辑**；按深度套默认字号 |
| `addSibling(before?)` | `(before?: boolean) => void` | void | 1824 | `before` 不传 → `undefined` → 插到**之后**；新节点同样进编辑态 |
| `addParent()` | `() => void` | void | 1825 | 包一层 wrapper 节点（根自身会无变化） |
| `removeNode()` | `() => void` | void | 1826 | **删根会被 toast「根节点不可删除」并拒绝**（`MindMap.tsx:905-908`） |
| `outdent()` | `() => void` | void | 1827 | 提升一层；已在根同级则无变化 |
| `select(id)` | `(id: string \| null) => boolean` | 目标不存在或 `null` → `false` | 1828-1836 | 传 `null` 走「清空选中」并返回 `false`；**会把多选收敛成单选** |
| `getSelectedId()` | `() => string \| null` | 主选中 id | 1837 | ⚪ |
| `hasSelection()` | `() => boolean` | `Boolean(selectedId)` | 1838 | ⚪ |

- 新建节点标题固定为「**分支主题**」（`tree.ts:12` 的 `createNode` 默认值），落地后 `setTimeout(0)` 进内联编辑。

```tsx
api.current?.select("n_abc");      // true / false
api.current?.select(null);         // 清空选中，返回 false
api.current?.addSibling(true);     // 在后面插入同级（默认）
api.current?.outdent();
```

### 3.3 多选（`Ctrl/Cmd + 左键`）

| 方法 | 签名 | 返回 | 行号 | 坑 |
| --- | --- | --- | --- | --- |
| `getSelectedIds()` | `() => string[]` | 主选中项所在数组 | 1841 | ⚠️ **单选时返回长度 1 的数组**；判多选请写 `.length >= 2` |
| `toggleSelect(id)` | `(id: string) => boolean` | 节点不存在 → `false` | 1842-1846 | 等价于 Ctrl/Cmd + 左键；取消选中时主选中项顺延到集合最后一个 |
| `clearSelect()` | `() => void` | void | 1847 | 只清选中态，不动树 |
| `addAssocBetween()` | `() => void` | void | 1848 | 链式连接：N 个节点 → **N-1 条**；<2 个 toast 报错；重复 from→to 跳过并提示「已存在关联线」 |
| `addSummaryFor()` | `() => void` | void | 1849 | 🔴 **声明是 `addSummaryFor(text: string)`（`types.ts:403`），实现零参、入参被忽略**；作用当前多选集合，文案固定 `SUMMARY_DEFAULT = "概要"`；落地后自动进内联编辑 |
| `addFrameFor()` | `() => void` | void | 1850 | 🔴 同上（`types.ts:405` 声明 `(label: string)`）；文案固定 `FRAME_DEFAULT = "分组"`；同样自动进内联编辑 |

> ⚠️ **这是本次盘点确认的签名过期点**：文档一律按**零参**写（`MindMap.tsx:1660/1681` 的 `addSummaryForSelected` / `addFrameForSelected`）。TypeScript 里调用 `addSummaryFor("我的概要")` 能通过编译但**不报错也不生效**（入参被丢弃）。改 d.ts 属后续独立任务；运行期请忽略传入参数，或先 `setTimeout` 再改文案 —— 正确姿势是落地后在画布上双击改文案。

```tsx
const ids = api.current!.getSelectedIds();
if (ids.length >= 2) {                 // ⚠️ 不要写成 ids.length === 0 判「没选」
  api.current!.addSummaryFor();        // 零参！
  api.current!.addFrameFor();          // 零参！
  api.current!.addAssocBetween();      // 生成 N-1 条关联线
}
```

### 3.4 节点样式 / 文字默认值

| 方法 | 签名 | 返回 | 行号 | 坑 |
| --- | --- | --- | --- | --- |
| `setNodeStyle(patch)` | `(patch: Partial<MindNodeStyle>) => void` | void | 1853 | 🟡 与 `applyStyle` 同一实现（`MindMap.tsx:923-943`）：**patch 里带 `fontSize`/`fontFamily` 会顺带更新 `textDefaults`**（即使只读态已 return，默认值也已改） |
| `getNodeStyle()` | `() => MindNodeStyle` | `MindNodeStyle` | 1854 | 无选中时返回 `{}` |
| `clearNodeStyles()` | `() => void` | void | 1855-1862 | ⚠️ **只把 `style.shape` 置 undefined**，不清 `fontSize` / `color` / `background` / `borderColor` 等；无选中静默 return，**不校验只读态** |
| `getTextDefaults()` | `() => TextDefaults` | `{ fontSize: 14, fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' }` | 1863 | ⚪ |
| `setTextDefaults(patch)` | `(patch: Partial<TextDefaults>) => void` | void | 1864 | 只改 state，**不写树**、不进撤销栈 |

```tsx
api.current?.setNodeStyle({ bold: true, fontSize: 18 });
// ⚠️ 这一句同时把「新建节点的默认字号」也改成 18
api.current?.clearNodeStyles();          // 只清形状，颜色字号还在
```

### 3.5 配置（主题 / 结构 / 连线 / 基础样式）

| 方法 | 签名 | 行号 | 坑 |
| --- | --- | --- | --- |
| `getConfig()` | `() => MindMapConfig` | 1872 | ⚠️ 必须走 `configRef` 而非闭包 —— 源码注释（`MindMap.tsx:1866-1871`）明确警告：本 handle 依赖数组里没有 `config`，闭包会指向首次渲染那份 |
| `setConfig(patch)` | `(patch: Partial<MindMapConfig>) => void` | 1873 | **一层浅合并**，不会删除未提及字段 |
| `setStructure(s)` | `(s: StructureType) => void` | 1874 | 🟡 **切换结构会自动触发一次 `fit()`**（`MindMap.tsx:754-760`） |
| `setLineStyle(s)` | `(s: LineStyle) => void` | 1875 | `curve` / `elbow` / `straight` |
| `setThemeId(t)` | `(t: string) => void` | 1876 | 主题 id 不存在时回退 `THEME_LIST[0]`（`THEME_MAP.get(id) ?? THEME_LIST[0]`） |
| `setBase(patch)` | `(patch: Partial<BaseStyle>) => void` | 1877 | `base` 是 `{...c.base, ...patch}`，**按字段合并** |
| `getBase()` | `() => BaseStyle` | 1878 | 走 `configRef`，无 `base` 时返回 `{}` |

```tsx
const base = api.current!.getBase();         // ⚠️ 走 configRef，拿到的是最新一份
api.current?.setBase({ ...base, linkWidth: 3 });
api.current?.setConfig({ themeId: "hand-forest" });
api.current?.setStructure("fishbone");       // 切完自动 fit 一次
```

### 3.6 运行期模式

| 方法 | 签名 | 行号 | 说明 |
| --- | --- | --- | --- |
| `getMode()` | `() => "edit" \| "readonly"` | 1881 | — |
| `setMode(m)` | `(m: "edit" \| "readonly") => void` | 1882 | **宿主切阅读态的唯一正解** |
| `setWheelAction(a)` | `(a: "zoom" \| "move") => void` | 1883 | `"zoom"`（默认）以指针为锚点缩放；`"move"` 滚轮平移画布（`tx -= deltaY, ty -= deltaX`） |
| `setFreeDrag(v)` | `(v: boolean) => void` | 1884 | 🟡 **默认 `false`** —— 不开启则节点**拖不动**；开启后 `beginNodeDrag` 才接管（`MindMap.tsx:1417`） |

> ⚠️ 节点拖拽：**默认关闭**（`beginNodeDrag` 首行 `if (!freeDragRef.current) return`，`MindMap.tsx:1414`）。阈值 5px、根节点只能挂成子节点、不能拖进自己的子孙。
> 画布上 `.mm-hint` 那句「拖动节点可排序 / 挂接」（`MindMap.tsx:3008`）在默认配置下是误导文案，本手册不照抄。

```tsx
api.current?.setFreeDrag(true);        // 想让宿主用户拖节点，必须开
api.current?.setMode("readonly");      // 分享 / H5 阅读态
api.current?.setWheelAction("move");   // 触控板习惯：滚轮平移
```

### 3.7 视图

| 方法 | 实际行为 | 行号 |
| --- | --- | --- |
| `zoomIn()` | `zoomBy(1.2)`，以容器中心为锚点 | 1887 |
| `zoomOut()` | `zoomBy(1 / 1.2)` | 1888 |
| `fitView()` | `fit()`：四边留 64px padding，scale 上限 1.3 | 1889（721-739） |
| `resetView()` | `setTransform({ scale: 1, tx: 0, ty: 0 })` | 1890 |
| `centerRoot()` | 保持当前 scale，把根节点中心移到容器中心 | 1891-1901 |
| `getScale()` | `transformRef.current.scale`（避免闭包旧值） | 1902 |
| `getView()` | `{ scale, tx, ty }`；内容坐标 → 屏幕：`s * scale + t` | 1903-1907 |
| `setView(v)` | `scale` 钳制到 `[MIN_SCALE 0.15, MAX_SCALE 3]`；`tx`/`ty` 缺省沿用 | 1908-1913 |

```tsx
api.current?.setView({
  scale: api.current!.getView().scale,   // 保 scale，只改 tx
  tx: 0,
});
api.current?.fitView();
```

### 3.8 展开 / 收起

| 方法 | 签名 | 行号 | 坑 |
| --- | --- | --- | --- |
| `expandAll()` | `() => void` | 1916（实现 1801） | `setCollapsedBelow(Number.MAX_SAFE_INTEGER)` |
| `collapseToDepth(d)` | `(d: number) => void` | 1917（实现 1802） | `depth >= d` 的**层级**整体收起，一次性 commit 整棵树（进撤销栈） |
| `toggleCollapse(id?)` | `(id?: string) => void` | 1918（实现 912-921） | 没子节点时静默 return |

```tsx
api.current?.expandAll();
api.current?.collapseToDepth(2);   // 第 2 层及以下收起
api.current?.toggleCollapse("n_abc");
```

### 3.9 节点补齐项（`set` / `get` 成对，只作用于主选中项）

`setNote/getNote`、`setLink/getLink`、`setImage/getImage`、`setTags/getTags`、`setFormula/getFormula`、`setFrame/getFrame`、`setGeneralization/getGeneralization`（1921-1934）。

- 全部经 `setNodeField` 落库（`MindMap.tsx:1571-1582`）：**只读态 return**、无选中 → toast「请先点击选中一个节点」。
- 空值统一归一成 `undefined`（`note: text || undefined` 等），因此导出文件里不会出现空串。
- 不进「多选」范围，只作用于 `selectedId`。

```tsx
api.current?.setNote("备注：这条待压测");   api.current?.getNote();
api.current?.setLink("https://example.com");
api.current?.setImage({ url: "/a.png", title: "架构图" });
api.current?.setTags(["P0", "设计"]);
api.current?.setFormula("\\frac{a}{b} + x^2");   // 不含 $
api.current?.setFrame({ label: "待评审", color: "#e34d59" });
api.current?.setGeneralization({ targetId: "n_deep", text: "汇总" });
```

### 3.10 优先级 · 进度 · 图标

`getPriority/setPriority`、`getProgress/setProgress`、`getIcons/toggleIcon`（1936-1942）。

- `priority` 建议 1-9、`progress` 建议 0-10；**两者都不校验范围**。
- `toggleIcon(id)` 切换 `icons` 数组；`MARKER_MAP` / `NODE_ICON_MAP` 里查不到的 id 会被**静默忽略**。

```tsx
api.current?.setPriority(3);
api.current?.setProgress(7);
api.current?.toggleIcon("fire");
```

### 3.11 关联线（统一挂在根节点的 `assocLines`）

| 方法 | 签名 | 行号 | 坑 |
| --- | --- | --- | --- |
| `addAssocLine(fromId, toId, label?)` | `(string, string, string?) => void` | 1945-1958 | `fromId`/`toId` 为空或相等 → 静默 return（无 toast）；**重复 from→to 静默 return**；生成 id 形如 `assoc-<base36>`；`arrow` 固定 `"out"`；**不校验只读态** |
| `removeAssocLine(id)` | `(id: string) => void` | 1959-1965 | 走 `commit`（进撤销栈）；**不校验只读态** |
| `getAssocLines()` | `() => MindAssocLine[]` | 1966 | 返回根节点 `assocLines ?? []` |

```tsx
api.current?.addAssocLine("n_a", "n_b", "依赖");
api.current?.getAssocLines().forEach((l) => api.current?.removeAssocLine(l.id));
```

### 3.12 导出

| 方法 | 签名 | 行号 | 行为 |
| --- | --- | --- | --- |
| `getSvg()` | `() => SvgPayload` | 1969 | 🔴 **声明是 `getSvg(): unknown`（`types.ts:481`），实现返回 `{ svg, width, height }`**。实现见 `buildSvgPayload`（1270-1297）：外扩 32px padding、注入背景 rect、剥掉 `.mm-ui-only`、带 `<?xml?>` 头；`svgRef` 未就绪时 **throw `Error("画布尚未就绪")`** |
| `exportPng()` | `() => void` | 1970 | `handleExport("png")`（2 倍图） |
| `exportAs(f)` | `(f: string) => void` | 1971 | `handleExport(f as ExportFormat)`；非法格式在 `exportTree` 抛「不支持的导出格式：`${format}`」；导出文件名固定前缀 `"mindmap"` |

```tsx
const { svg, width, height } = api.current!.getSvg() as SvgPayload;  // 类型声明偏保守，需要 as
api.current?.exportPng();
api.current?.exportAs("xmind");
```

> 需要拿到 Blob 而非直接下载，请走 §6 的 `exportTree()` / `svgToPngBlob()`，把上面的 `getSvg` 当回调传进去。

### 3.13 几何

`getNodeBoxes(): Record<string, { x, y, w, h }>`（1974-1978）—— 返回的是**画布（世界）坐标**的节点包围盒，供宿主做浮层定位；**不是屏幕坐标**（屏幕坐标 = `x * scale + tx`）。

```tsx
const boxes = api.current?.getNodeBoxes() ?? {};
const { scale, tx, ty } = api.current!.getView();
const screenX = boxes["n_abc"].x * scale + tx;
```

---

## 4 类型定义

### 4.1 `MindNode`（`types.ts:127-176`，共 **21** 个字段）

| 字段 | 类型 | 语义 | 渲染位置 |
| --- | --- | --- | --- |
| `id` | `string` | 唯一标识（必填） | — |
| `title` | `string` | 标题（必填） | `text`（`MindMap.tsx:2498-2515`）；`\n` 显式换行 |
| `children` | `MindNode[]` | 子节点（必填，可为空数组） | — |
| `collapsed` | `boolean?` | 收起（不渲染子树） | 折叠按钮 `±`，`MindMap.tsx:2632-2665` |
| `color` | `string?` | 分支强调色，等价于 `style.borderColor` 的快捷方式 | 描边 / 连线（`MindMap.tsx:2261-2267`） |
| `style` | `MindNodeStyle?` | 扩展样式，见 §4.2 | — |
| `note` | `string?` | 备注（右上角小图标 + `<title>` tooltip） | `MindMap.tsx:2606-2616`；`Ctrl+Enter` 保存 |
| `link` | `string?` | 超链接（右上角小图标） | `MindMap.tsx:2617-2629` |
| `markers` | `string[]?` | 标记 id 列表（12 种，见 §5.10） | 圆底单字徽标，占位 19px / 个 |
| `isRoot` | `boolean?` | 是否为根（导入时组件自动置 true） | `parseMindmapFile` 各分支都会 `tree.isRoot = true` |
| `priority` | `number?` | 优先级 1-9，前缀圆形徽标 | 配色 `PRIORITY_COLORS` |
| `progress` | `number?` | 进度 0-10（每级 10%），前缀饼图 | `PROGRESS_COLOR` |
| `icons` | `string[]?` | emoji 图标前缀（24 种，见 §5.11） | `MindMap.tsx:2573-2589` |
| `image` | `MindNodeImage?` | 缩略图（40×40 方框内等比裁切） | `extras.tsx:84-100` |
| `tags` | `string[]?` | 标签小色块（宽度按字符稳定派生色） | `extras.tsx:103-132` |
| `formula` | `string?` | LaTeX（**不含 `$`**），有值时正文渲染为公式 | `extras.tsx:144-164`（`foreignObject` + katex） |
| `frame` | `MindNodeFrame?` | 外框：框住该节点及**全部可见后代** | `extras.tsx:772-787` |
| `generalization` | `MindGeneralization?` | 逐节点概要：指向 `targetId`，虚线连到右侧小框 | `extras.tsx:785-790` |
| **`assocLines`** | `MindAssocLine[]?` | **根专属**：关联线集合 | §5.3 |
| **`summaryGroups`** | `MindSummaryGroup[]?` | **根专属**：多选概要 | §5.4 |
| **`frameGroups`** | `MindFrameGroup[]?` | **根专属**：多选分组框 | §5.5 |

### 4.2 `MindNodeStyle`（`types.ts:27-50`）

`fontSize?`（默认 14）/ `fontFamily?` / `bold?` / `italic?` / `underline?` / `strike?` / `color?` / `background?` / `borderColor?` / `borderWidth?` / `borderStyle?`（`MindBorderStyle`）/ `borderRadius?`（按宽高一半内敛）/ `shape?`（`MindNodeShape`）。

### 4.3 补齐项小结构

```ts
interface MindNodeImage      { url: string; title?: string; width?: number; height?: number; custom?: boolean }
interface MindNodeFrame      { color?: string; label?: string }
interface MindGeneralization { targetId: string; text?: string }
interface MindAssocLine      { id: string; fromId: string; toId: string; label?: string; color?: string; arrow?: MindAssocArrow }
type    MindAssocArrow       = "none" | "in" | "out"
interface MindSummaryGroup   { id: string; nodeIds: string[]; /* ≥2 */ text: string; color?: string }
interface MindFrameGroup     { id: string; nodeIds: string[]; /* ≥1 */ label?: string; color?: string }
type    MindNodeShape        = "rect" | "rounded" | "capsule" | "underline" | "none"
type    MindBorderStyle      = "solid" | "dashed" | "dotted" | "dashdot"
type    MindMapConfig        { themeId: string; structure: StructureType; lineStyle: LineStyle; base: BaseStyle }
interface BaseStyle          { fontFamily?; fontSize?; background?; linkColor?; linkWidth?;
                               linkPattern?; linkArrow?; linkColorMode?; radius?; strokeWidth?;
                               nodeFill?; nodeText?; branchStyle? }
interface TextDefaults       { fontSize: number; fontFamily: string }
```

### 4.4 五种「框 / 线」的关系速记

| | 宿主字段 | 作用对象 | 最小节点数 | 默认文案 |
| --- | --- | --- | --- | --- |
| 关联线 | `root.assocLines` | 任意两节点 | 2 | 无（`label` 可选） |
| 多选概要 | `root.summaryGroups` | 任意一组节点 | 2 | `"概要"` |
| 多选分组框 | `root.frameGroups` | 任意一组节点 | 1 | `"分组"` |
| 子树外框 | `node.frame` | 子树 | 1（自身） | 无 |
| 子树概要 | `node.generalization` | 子树 → 最深节点 | 1 | `"概要"` |

```ts
// 只存 id 集合 + 文案，几何每次从当前布局实时算：
root.summaryGroups = [{ id: uid("sum"), nodeIds: ["n1", "n5"], text: "汇总", color: "#2f6fed" }];
```

---

## 5 常量与枚举全表

### 5.1 `THEME_LIST`（`theme.ts:98-274`，共 **17** 个）

| # | id | 中文名 | 分类 | 手绘 |
| --- | --- | --- | --- | --- |
| 1 | `classic-blue` | 经典蓝 | classic | —（**默认主题** `DEFAULT_THEME_ID`） |
| 2 | `classic-green` | 经典绿 | classic | — |
| 3 | `classic-orange` | 经典橙 | classic | — |
| 4 | `classic-gold` | 经典金 | classic | — |
| 5 | `classic-red` | 经典红 | classic | — |
| 6 | `classic-purple` | 经典紫 | classic | — |
| 7 | `dark-blue` | 深色蓝 | dark | — |
| 8 | `dark-green` | 深色绿 | dark | — |
| 9 | `dark-purple` | 深色紫 | dark | — |
| 10 | `dark-gray` | 深色灰 | dark | —（`useBranchColor: false`） |
| 11 | `plain-gray` | 朴素灰 | plain | —（`lineStyle: "elbow"`） |
| 12 | `plain-blue` | 朴素蓝 | plain | —（`lineStyle: "elbow"`） |
| 13 | `plain-green` | 素雅绿 | plain | —（`lineStyle: "elbow"`） |
| 14 | `plain-minimal` | 极简 | plain | —（`nodeBorder: false`、`radius 0`、`strokeWidth 0`） |
| 15 | `hand-colorful` | 手绘彩色 | hand | ✅ `handJitter: 1.1` |
| 16 | `hand-blueprint` | 手绘蓝图 | hand | ✅ `handJitter: 0.9`（`useBranchColor: false`） |
| 17 | `hand-forest` | 手绘森野 | hand | ✅ `handJitter: 1.3` |

`THEME_CATEGORIES`（`theme.ts:66-71`）：`classic 经典` / `dark 深色` / `plain 朴素` / `hand 手绘`。
⚠️ **`THEME_CATEGORIES` 与 `THEME_GROUPS` 是同一数组的两个名字**（`index.ts:95` 的别名导出），改一个等于改另一个。
`CanvasTheme` 字段（`theme.ts:26-63`）：`id / name / category / background / rootFill / rootText / nodeFill / nodeText / nodeStroke / radius / strokeWidth / linkColor / linkWidth / useBranchColor / nodeBorder / lineStyle / handDrawn? / handJitter?`。

### 5.2 `STRUCTURES`（`theme.ts:281-294`，7 种）

| id | label | thumb |
| --- | --- | --- |
| `logical-right` | 逻辑结构图 | `logical-right` |
| `logical-left` | 逻辑结构图 | `logical-left` |
| `mindmap` | 思维导图 | `mindmap` |
| `org` | 组织结构图 | `org` |
| `catalog` | 目录组织图 | `catalog` |
| `timeline` | 时间轴 | `timeline` |
| `fishbone` | 鱼骨图 | `fishbone` |

> ⚠️ `logical-left` / `logical-right` 的 label **同为「逻辑结构图」**（`theme.ts:287-288`），UI 上靠 `StructureThumb` 缩略图区分 —— 否则容易误以为只有 6 种。
> `DEFAULT_CONFIG.structure = "mindmap"`（`types.ts:300`）。

### 5.3 根专属① `assocLines`（`types.ts:64-78`）

- **约束**：挂在根节点上（`getAssocLines()` 读的就是 `root.assocLines`）；`fromId`/`toId` 必须存在，`findNode` 找不到时该条几何被跳过。
- **走线**：同侧节点 → 从右侧绕一个弧再回到目标（`bulgeX = max(aRight, bRight) + 46`）；跨侧 → 走下方弧（`dropY = max(底部) + 40`）。
- **箭头语义**：`out` 在目标端（默认）、`in` 在来源端、`none` 不画。`addAssocBetween()` 生成的永远是 `"out"`。
- 都走 `commit`，进撤销栈。

### 5.4 根专属② `summaryGroups`（`types.ts:89-96`）

- **约束**：`nodeIds.length >= 2`（少于 2 个 toast 拒绝）。
- **语义**：一个右侧括号把若干任意节点（可跨分支）括起来，再用一条水平引线连到一个圆角概要框。
- **弧线方向判据**：`commonAncestorCx`（`extras.tsx:560-597`）求被选集的**最低公共祖先中心 x** 作锚点 —— 被选组在锚点**左**侧 → 概要去**左**外侧；右侧 → 去右外侧；找不到公共祖先（跨子树乱选 / id 不全）才退回「画布中心」判据。
- **持久化只存 id 集合**，几何由 `summaryGroupGeom` 每次从当前布局实时算（拖拽 / 缩放后自动贴合）。
- **避让**：概要框若压到「组外节点」，整体沿摆放方向外推（最多 6 次，每次 +26px）。

### 5.5 根专属③ `frameGroups`（`types.ts:102-109`）

- **约束**：`nodeIds.length >= 1`。
- **语义**：包围盒外扩 `pad = label ? 20 : 14` 的虚线圆角框（`rx = 16`），左上角一个白底胶囊标签。
- 与逐节点 `frame` 并存：一个「多选成组」，一个「框住子树」。

### 5.6 `BORDER_STYLES` / `BORDER_DASH`（`types.ts:11-24`）

`solid 实线` / `dashed 虚线` / `dotted 点线` / `dashdot 点划线`；`BORDER_DASH` 映射：`solid → undefined`、`dashed → "7 4"`、`dotted → "2 3"`、`dashdot → "9 3 2 3"`。仅根节点与带框节点生效。

### 5.7 `SHAPES`（`types.ts:334-340`，5 种）

`rect 矩形` / `rounded 圆角矩形` / `capsule 胶囊` / `underline 下划线` / `none 无边框`。
默认形状规则（`MindMap.tsx:2236-2237`）：`depth <= 1 → "capsule"`，其余 → `"underline"`；节点显式 `style.shape` 优先。

### 5.8 连线三件套（`types.ts:239-256`，200-206）

| 常量 | 项 |
| --- | --- |
| `LINK_PATTERNS` | `solid 实线` / `dashed 虚线` / `taper 从粗到细` |
| `LINK_ARROWS` | `none 无箭头` / `inward 向内箭头` / `outward 向外箭头` |
| `LINK_COLOR_MODES` | `auto 彩色`（按分支主题色）/ `single 单色`（统一 `linkColor`） |

**语义**（`types.ts:200-206`）：

- `inward` = 箭头画在**父端**，尖端朝向父 / 根节点（朝画布中心收）。
- `outward` = 箭头画在**子端**，尖端朝向子 / 叶子节点（朝外发散）。
- `taper` 是两端宽度渐变**填充带**（粗端 `TAPER_THICK_W = 8`、细端 `TAPER_THIN_W = 2`），**与 dashed 互斥**（填充带无法用 dasharray 表现）；手绘主题下 taper 改用手绘中心线填充。
- 箭头尺寸跟随所在端线宽：taper 时 inward 用 8、outward 用 2。
- 手绘主题下箭头是空心「V」（`sketchArrowHead`），其余实心三角。

### 5.9 `BRANCH_STYLES`（`types.ts:274-283`，8 种）

`default 默认` / `bracket-left 左括号` / `bracket-right 右括号` / `brace 花括号` / `arc-right 右圆弧` / `arc-left 左圆弧` / `fork 分叉` / `hook 钩形`。

- 与 `lineStyle` **正交**：`lineStyle` 决定基础骨架，`branchStyle` 在其上再套一层外壳。
- `branchPath(style, geom, depth = 18)`（`branchstyle.ts:44`），进深 `dep = clamp(depth, 8, dist * 0.45)`；`default` 在 cubic 时保留贝塞尔形态，否则 `null`。

### 5.10 `MARKERS`（`theme.ts:309-322`，12 个）

| id | label | char | bg |
| --- | --- | --- | --- |
| `priority-1` / `priority-2` / `priority-3` | 优先级 1/2/3 | `1` / `2` / `3` | `#e34d59` / `#f0a020` / `#2f6fed` |
| `flag-red` / `flag-blue` / `flag-green` | 红旗 / 蓝旗 / 绿旗 | `⚑` | `#e34d59` / `#2f6fed` / `#00a870` |
| `star` | 星标 | `★` | `#f0a020` |
| `check` | 已完成 | `✓` | `#00a870` |
| `question` | 待确认 | `?` | `#8b5cf6` |
| `smiley` | 笑脸 | `☺` | `#f0a020` |
| `heart` | 心动 | `♥` | `#ec4899` |
| `idea` | 灵感 | `!` | `#14b8a6` |

### 5.11 优先级 / 进度 / 图标 / 字体

- `PRIORITY_LEVELS = [1..9]`（`theme.ts:341`）；`PRIORITY_COLORS`：1 `#e5484d` / 2 `#2f6fed` / 3 `#17a34a` / 4 `#e08b2a` / 5 `#8b5cf6` / 6-9 `#9aa4b2`。
- `PROGRESS_LEVELS = [0..10]`（`theme.ts:344`）；`PROGRESS_COLOR = "#8bc34a"`、`PROGRESS_TRACK = "#f0efd8"`。
- `NODE_ICONS`（`theme.ts:358-383`，**24 个**）：`star⭐ flag🚩 fire🔥 bulb💡 pin📌 target🎯 rocket🚀 check✅ cross❌ warn⚠️ question❓ bang❗ thumbup👍 clap👏 clock⏰ bubble💬 pen📝 link🔗 lock🔒 gift🎁 money💰 book📚 user👤 heart❤️`。
- `FONT_FAMILIES`（`types.ts:317-328`，10 项）：微软雅黑 / 苹方 / 宋体 / 黑体 / 楷体 / 仿宋 / 思源黑体 / Arial / Times / Consolas。
- `FONT_SIZES`（`types.ts:331`）：`[12,14,16,18,20,22,24,26,28,32,36,40,48]`。
- 色盘（各 10 支）：`BRANCH_COLORS`（`theme.ts:12-23`）、`TEXT_COLORS`（390-401）、`HIGHLIGHT_COLORS`（404-415）、`BORDER_COLORS`（418-429）。
- `IconName` 共 **34** 个（`Icons.tsx:2-33`）：`undo redo insert-parent insert-sibling-above insert-sibling-below insert-child marker note link style node-style base-style theme structure priority progress icon fit zoom-in zoom-out chevron folder save trash copy check brush file-plus keyboard grid assoc summary group`。
- `buildBranchColors(root)`（`theme.ts:435-450`）：根节点每个一级分支按 `BRANCH_COLORS[i % 10]` 取色并向下继承；节点自身有 `color` / `style.borderColor` 时保留自定义色。
- 鱼骨图强制单色骨架 `FISHBONE_ACCENT = "#73a1bf"`（`theme.ts:9`，不导出），仅节点自身显式设色时例外。
- 折叠按钮半径 8.5、图标 `+` / `−`。

---

## 6 IO · 导入导出

### 6.1 统一入口（`io/index.ts`）

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

> ⚠️ 旧 README 的导入格式清单漏了 `.xml`（FreeMind / KityMinder）与 `.txt`（嗅探兜底），本表为实际值。

**导入嗅探顺序**（`io/index.ts:140-196`）：

1. `.xmind` → `parseXmind` + `detectXmindStructure`（读 `content.json` 的 `rootTopic.structureClass`，兜底 `content.xml` 的 `template`）。
2. 其余：先按内容首字符判断 `looksJson`（`{`/`[`）/ `looksXml`（`<`），然后 **json ⇄ xml 互备一圈**（`tryJson() ?? tryXml()` 或反之）。
3. `json` → `parseMindmapJson`（结构标记取 `layout` 或 `template`）；`xml` → 先 `parseFreeMind`，失败再 `parseKityMinderXml`。
4. 全失败 → `throw new Error("无法解析文件 …")`。

**编码处理**（`decodeText`，`io/index.ts:20-39`）：UTF-8 BOM / UTF-16 LE / UTF-16 BE / XML 里声明 `gb2312|gbk|gb18030` → 用 `gb18030` 解码。

**`EXPORT_LABELS` 全表**：

| key | label |
| --- | --- |
| `png` | 图片 PNG |
| `svg` | 矢量 SVG |
| `json` | 有道/KM 扁平 JSON |
| `km` | KityMinder 脑图 .km |
| `mm` | FreeMind 文档 .mm |
| `smm` | SimpleMindMap .smm |
| `xmind` | XMind 工作簿 .xmind |

**`mapFileStructure` 判定顺序**（`io/index.ts:60-75`，**先命中即返回**）：

| 序 | 条件 | 返回 |
| --- | --- | --- |
| 1 | 含 `fishbone` | `fishbone` |
| 2 | 含 `timeline` | `timeline` |
| 3 | 含 `catalog` 或 `spreadsheet` | `catalog` |
| 4 | 含 `both` / `balance` / `map` / `mindmap` | `mindmap` |
| 5 | 严格 `=== "default"` | `mindmap` |
| 6 | 含 `left` | `logical-left` |
| 7 | 含 `right` 或 **`logic`** | `logical-right` |
| 8 | 含 **`org`** 或 `structure` | `org` |
| — | 其它 | `undefined`（调用方回落 `mindmap`） |

> 例：`mapFileStructure("logicalStructure")` → 命中第 7 条（`includes("logic")`）→ **`logical-right`**。
> 反例（易踩）：`mapFileStructure("structure")` → 命中第 8 条 → **`org`**（不是 `mindmap`）；`mapFileStructure("logicChart")` 同理落在 `logic` → `logical-right`。

### 6.2 各格式读写

| 文件 | 函数 | 行号 | 说明 |
| --- | --- | --- | --- |
| json | `parseMindmapJson(raw)` | `json.ts:326` | 统一 JSON 入口 |
| json | `fromNested(raw, isRoot?)` | `json.ts:141` | 嵌套原始 ⇄ `MindNode` |
| json | `fromFlat(nodes)` | `json.ts:273` | 有道扁平数组（`FlatNode`）⇄ `MindNode` |
| json | 类型 `FlatNode` | `json.ts:11` | `{ id, topic, isroot?, expanded?, parentid?, customStyle?, style?, … }` |
| freemind | `parseFreeMind(xml)` | `freemind.ts:19` | FreeMind XML |
| freemind | `exportFreeMind(root)` | `freemind.ts:154` | → `.mm` XML |
| freemind | `parseKityMinderXml(xml)` | `freemind.ts:162` | KityMinder `.km` XML（失败返回 `null`） |
| freemind | `exportYoudaoFlat(root)` | `freemind.ts:216` | 有道扁平 JSON（导出 `json`） |
| freemind | `exportKityMinder(root)` | `freemind.ts:258` | → `.km` |
| freemind | `exportSmm(root)` | `freemind.ts:306` | simple-mind-map 契约 `.smm` |
| freemind | `escapeXml(s)` | `freemind.ts:6` | XML 转义 |
| xmind | `parseXmind(data)` | `xmind.ts:92` | `(ArrayBuffer) => Promise<MindNode>` |
| xmind | `exportXmind(root)` | `xmind.ts:190` | `(MindNode) => Promise<Blob>` |

- `jszip` **动态 import**（`io/index.ts:105-110`），仅在读写 `.xmind` / 探测 xmind 结构时加载，不进首屏。
- `katex` 静态 import（`extras.tsx:9`）——**公式节点的 CSS 需宿主自行引入** `katex/dist/katex.min.css`。

### 6.3 用法示例

```ts
import { parseMindmapFile, exportTree, downloadBlob, mapFileStructure } from "mindmap-vite";

const buf = await file.arrayBuffer();
const { tree, structure } = await parseMindmapFile(file.name, buf);
console.log(mapFileStructure("logicalStructure"));        // "logical-right"

const { blob, filename } = await exportTree(tree, "smm", () => api.current!.getSvg() as SvgPayload, "我的导图");
downloadBlob(blob, filename);
```

---

## 7 几何 · 手绘 · 文本 · 树工具

### 7.1 `layout.ts`

| 导出 | 签名 | 行号 |
| --- | --- | --- |
| `layoutTree(root, opts)` | `(MindNode, LayoutOptions) => LayoutResult` | 1013 |
| `nodeSize(node, depth = 0, pad = DEFAULT_PAD)` | `(MindNode, number?, SizePad?) => SizedNode` | 159 |
| `textCenterX(node, w)` | `(MindNode, number) => number` | 193 |
| ⚙️ `textBlockWidth(node, size)` | `(MindNode, SizedNode) => number` | 184 |
| ⚙️ `prefixWidth(node)` | `(MindNode) => number` | 112 |
| ⚙️ `rightBadgeWidth(node)` | `(MindNode) => number` | 125 |
| ⚙️ `measureTagWidth(text)` | `(string) => number` | 105 |
| ⚙️ `defaultFontSizeForDepth(depth)` | `(number) => number` → 24 / 18 / 11 | 135 |
| ⚙️ `TEXT_LEFT_INSET = 12`、`IMAGE_BOX = 40` | — | 86 / 95 |

- `LayoutOptions { structure, branchColors: Map, linkColor: string, lineStyle }`（`layout.ts:67-72`）；`LayoutResult { nodes, links, width, height, byId: Map, rootPos }`（58-65）。
- `PositionedNode` 关键扩展：`axis("h"|"v")`、`sgn`、`rot`（鱼骨图倾斜）、`busX?`、`dotDX/dotDY?`（折叠按钮锚点）。
- `MindLink` 关键字段：`from/to`、`color`、`curve`、`axis("h"|"v"|"diag")`、`sgn`、`path?`（时间轴 / 目录 / 鱼骨预计算路径）、`straight?`（由 `lineStyle` 回填）。
- 布局常量：`H_GAP 58`、`V_GAP 12`、`V_LEVEL_GAP 46`、`V_SIB_GAP 22`、`PAD_X 16`、`PAD_Y 11`、`MIN_W 72`；目录图 `CAT_INDENT 38 / CAT_STUB 10 / CAT_COL_GAP 46 / CAT_BUS_DROP 18`；时间轴 `TL_COL_GAP 56 / TL_INDENT 36 / TL_TRUNK_DX 0 / TL_STUB / TL_V_GAP 8`；鱼骨 `FB_*`。
- 归一化：`layoutTree` 出口把所有坐标平移到 `(0,0)` 起点，并同步平移 `l.path` 里的数字。

### 7.2 手绘双笔触（`handdrawn.ts`）

| 导出 | 返回 | 行号 |
| --- | --- | --- |
| `sketchRect(x, y, w, h, r, seed, o?)` | `string[]`（2 条闭合笔触） | 319 |
| `sketchEllipse(cx, cy, rx, ry, seed, o?)` | `string[]` | 337 |
| `sketchLine(x1, y1, x2, y2, seed, o?)` | `string[]` | 356 |
| `sketchCurve(p0, c1, c2, p1, seed, o?)` | `string[]` | 376 |
| `sketchPath(d, seed, o?)`（`d` 形如 `M…` / `M…L…` / `M…C…`） | `string[]` | 412 |
| `sketchArrowHead(tip, dir, size, halfW, seed, o?)` | `string[]`（空心 V） | 456 |
| `handLine` / `handCurve` / `handRect` / `handEllipse` | `string`（单笔，取第 0 笔） | 483 / 495 / 506 / 518 |
| ⚙️ type `SketchOptions` | `{ amp?, gap?, passes?, overshoot?, segments? }`，默认 `1.2 / 2.1 / 2 / 0 / 12` | 119 / 132-138 |

> **确定性硬约束**：抖动只依赖「几何 + 种子」，不用 `Math.random()`（`handdrawn.ts:19-22`）—— 否则每次重渲染 / 导出 SVG 线条都会变样。
> `sketchEllipse` 内部把 `gap` 乘 1.35；`sketchArrowHead` 内部把 `gap` 置 0。

```ts
import { sketchRect, sketchPath } from "mindmap-vite";
const strokes = sketchRect(0, 0, 120, 40, 10, "seed-1");   // ["M…", "M…"]
const [a, b] = strokes;
```

### 7.3 `branchstyle.ts` / `text.ts`

- `branchPath(style, g: BranchGeom, depth = 18): string | null`（`branchstyle.ts:44`）；`BranchGeom { p0, p1, v0, v1, cubic, c1?, c2? }`。
- `measureText(text, fontSize, bold = false): number`（`text.ts:24`）—— 纯字符宽度表，**不依赖 canvas**。
- `wrapText(text, fontSize, maxWidth, bold = false): TextMetrics`（`text.ts:43`）—— 中文逐字断行、西文按空格断词、尊重显式 `\n`；`lineHeight = round(fontSize * 1.45)`。
- `TextMetrics { lines, width, height, lineHeight }`（`text.ts:30-37`）。

### 7.4 `tree.ts` 全量（`export *`，`index.ts:123`）

`uid(prefix = "n")` / `createNode(title = "分支主题")` / `cloneTree(node, remapIds = false)` / `findNode(root, id)` / `findParent(root, id): { parent, index } | null` / `findPath(root, id): MindNode[]` / `allNodes(root)` / `visibleNodes(root)` / `opAddChild(root, selectedId)` / `opAddSibling(root, selectedId, before = false)` / `opAddParent(root, selectedId)` / `opDelete(root, selectedId)` / `opUpdate(root, id, patch, stylePatch?)` / `opMove(root, dragId, targetId, position)` / `opOutdent(root, selectedId)` / `opToggleCollapse(root, id)` / `countNodes(node)` / `sampleTree()` / **`depthOf(root, id)`**；类型 `TreeOpResult { tree, focusId, changed }`。

> 所有 `op*` 都基于 `cloneTree` 做不可变更新，返回新树；`depthOf` 根为 0、找不到返回 `-1`。

### 7.5 `buildBranchColors`

`buildBranchColors(root)`（`theme.ts:435-450`）返回 `Map<nodeId, color>`：根节点每个一级分支按 `BRANCH_COLORS[i % 10]` 取色并向下继承；节点自身有 `color` / `style.borderColor` 时保留自定义色。

```ts
import { buildBranchColors, sampleTree } from "mindmap-vite";
const colors = buildBranchColors(sampleTree());   // Map<id, "#2f6fed" | …>
```

---

## 8 CSS 类名清单（`MindMap.css`，1259 行）

全部以 `mm-` 前缀开头，**宿主可安全覆盖**（无 CSS Modules、无 Shadow DOM、不会误伤宿主样式），全部打进 `dist-lib/style.css`。

⚠️ 两条硬事实：

1. **`.mm-ui-only` 是导出剥离标记**：`buildSvgPayload` 会 `querySelectorAll(".mm-ui-only").forEach(el => el.remove())`（`MindMap.tsx:1279`）—— 用它做选中环 / 落点提示 / 拖拽幻影，别指望它出现在导出的 SVG 里。
2. **`.mm-stage.is-editable` 永不命中**：CSS 选择器写的是 `.mm-stage.is-editable:focus-visible`（`MindMap.css:563`），但 JSX 输出的是 `is-editableNow`（`MindMap.tsx:2101`）→ 该规则**永远匹配不到**，不要承诺「只读态焦点框」这种样式。

| 分组 | 类名 | 作用 | 可覆盖 |
| --- | --- | --- | --- |
| 结构 | `.mm-wrap` | 根容器（宽高来自 props） | ✅ |
| 结构 | `.mm-stage` / `.mm-stage.is-editableNow` | 画布容器（`overflow:hidden` / 实际输出现代类名） | ✅ |
| 结构 | `.mm-svg` / `.mm-root` / `.mm-link` / `.mm-extras` | SVG 与 `<g>` 分组（后三者仅作 DOM 标记，CSS 无规则） | ✅ |
| 结构 | `.mm-node` / `.mm-rect` / `.mm-text` / `.mm-hit` / `.mm-image` / `.mm-tags` / `.mm-underline` | 节点图形元素（仅 `.mm-node` / `.mm-rect` / `.mm-text` 有 CSS 规则） | ✅ |
| 结构 | `.mm-collapse` / `.mm-collapse-dot` | 折叠按钮 | ✅ |
| 结构 | `.mm-ui-only` | 导出时被剥离的 UI 辅助层 | ✅ |
| 工具条 | `.mm-toolbar`、`.mm-tb-group`、`.mm-tb-sep`、`.mm-tb-btn`、`.mm-tb-letter`、`.mm-tb-select`、`.mm-tb-size`、`.mm-tb-font`、`.mm-tb-combo`、`.mm-color-trigger`、`.mm-color-letter`、`.mm-color-bar`、`.mm-dot`、`.mm-tb-combo-text` | 工具条与下拉 / 色板 | ✅ |
| 工具条 | `.mm-file-input` | 隐藏 `<input type=file>` | ✅ |
| 左下停靠 | `.mm-dock-bl`、`.mm-zoom`、`.mm-zoom.is-vertical`、`.mm-zoom-btn`、`.mm-zoom-value`、`.mm-zoom-sep`、`.mm-minimap`、`.mm-minimap-svg`、`.mm-minimap.is-hover`、`.mm-minimap-tip` | 缩放控件 + 缩略图导航 | ✅ |
| 多选条 | `.mm-msbar`、`.mm-msbar-row`、`.mm-msbar-btn`（+ `.is-on` / `.is-ghost`）、`.mm-msbar-sep` | 多选浮动条（Portal，`position: fixed`） | ✅ |
| 主菜单 | `.mm-menu`、`.mm-menu-item`、`.mm-menu-sep`、`.mm-menu-head`、`.mm-menu-arrow`、`.mm-submenu`、`.mm-submenu.is-left` | 九宫格菜单与子菜单 | ✅ |
| 浮层 | `.mm-pop`、`.mm-pop-panel`、`.mm-pop-label`、`.mm-pop-tip`、`.mm-pop-action`、`.mm-pop-row`、`.mm-pop-select`、`.mm-pop-range`、`.mm-pop-input` | 通用浮层与面板控件 | ✅ |
| 面板 | `.mm-marker-grid`、`.mm-marker-chip`、`.mm-swatches`、`.mm-swatch`（`.is-on` / `.is-none`）、`.mm-shape-grid`、`.mm-shape-chip`、`.mm-theme-grid`、`.mm-theme-card`、`.mm-theme-swatch`、`.mm-structure-grid`、`.mm-structure-card`、`.mm-branch-grid`、`.mm-branch-card`、`.mm-prio-grid`、`.mm-prio-chip`、`.mm-prog-grid`、`.mm-prog-chip`、`.mm-icon-grid`、`.mm-icon-chip`、`.mm-icon-emoji`、`.mm-canvas-styles`、`.mm-canvas-card`、`.mm-layout-list`、`.mm-check-row`、`.mm-seg`、`.mm-seg-btn`、`.mm-seg-cap`、`.mm-badge`、`.mm-shortcuts`、`.mm-shortcut-row` | 8 个面板内部控件 | ✅ |
| 环形菜单 | `.mm-radial`、`.mm-radial-ring`、`.mm-radial-btn`、`.mm-radial-center`、`.is-disabled` | 右键环形菜单 | ✅ |
| 编辑框 | `.mm-editor`、`.mm-editor-input`、`.mm-editor.is-extra`、`.mm-editor-input.is-extra` | 节点标题 textarea / 画布内联 input | ✅ |
| 提示 | `.mm-hint`、`.mm-toast`、`.mm-toast.is-err` | 操作提示 / toast | ✅ |
| 模态 | `.mm-modal-mask`、`.mm-modal`、`.mm-modal-title`、`.mm-modal-input`、`.mm-modal-actions`、`.mm-btn-ghost`、`.mm-btn-primary` | 备注 / 链接模态框 | ✅ |

---

## 9 SSR（`react-dom/server`）

| 能力 | SSR 表现 |
| --- | --- |
| 节点骨架 / 文本 / 连线 | ✅ 能出（布局与文本量算不依赖 DOM，`text.ts` 是纯字符表） |
| 缩略图（`NodeImage` / `NodeTags` / `FormulaText`） | ⚠️ 宽度靠 `katex` 在**隐藏 DOM 实测**（`extras.tsx:32-64`），无 DOM 时按比例估算 → **公式精确宽度不可靠** |
| 外框 / 概要 / 分组框 | ⚠️ 依赖布局，位置基本可信；但概要避让有可能偏 |
| 缩略图导航（`Minimap`） | ❌ 依赖 `stageSize`（`clientWidth > 0` 才渲染，`MindMap.tsx:2995`），SSR 不渲染 |
| `fit()` | ❌ `clientWidth = 0` 时直接 return，SSR 下不会自动适配 |
| Portal 浮层（`MultiSelectBar` / `MainMenu` / `Popover`） | ❌ **不输出**：这些用 `createPortal(…, document.body)`，服务端没有 `document.body` 可挂 → **SSR 下没有多选浮动条** |

> 旧 README 那句「Portal 浮层 SSR 渲不出来」里提到「port 渲染概念」的部分**是错的**：`src/` 里没有「port 渲染」这个概念，只有 `react-dom` 的 `createPortal`。保留的事实是：**Portal 浮层在 `react-dom/server` 下不输出**。

---

## 10 集成示例

### 10.1 npm + TypeScript + Vite

```tsx
// 正确写法
import { useRef, useState } from "react";
import { MindMap, type MindMapApi, type MindNode, sampleTree } from "mindmap-vite";
import "mindmap-vite/style.css";        // ⚠️ 必须
import "katex/dist/katex.min.css";      // 用到公式节点时才需要

export default function App() {
  const api = useRef<MindMapApi>(null);
  const [tree, setTree] = useState<MindNode>(() => sampleTree());

  return (
    <div style={{ height: "80vh" }}>
      <MindMap
        ref={api}
        data={tree}
        defaultConfig={{ themeId: "classic-blue", structure: "mindmap" }}
        editable
        showToolbar
        fitOnMount
        onChange={setTree}              // 受控写法：存快照，别回写 data
      />
    </div>
  );
}
```

### 10.2 vendor / UMD（无构建工具）

```html
<link rel="stylesheet" href="vendor/mindmap-vite/style.css" />
<div id="root" style="height:720px"></div>
<script src="vendor/mindmap-vite/mindmap-vite.umd.js"></script>
<script>
  const { MindMap, sampleTree } = window.MindMapVite;
  // React 18 自行 createRoot 挂载 <MindMap data={sampleTree()} />
</script>
```

vendor 进源码工程时**不引** CSS（组件内部已 `import "./MindMap.css"`）；用 UMD 时才需要 `<link>`。

### 10.3 受控 vs 非受控

| 用法 | 写法 | 注意 |
| --- | --- | --- |
| **非受控**（推荐） | `data` 只给一次，持久化写在 `onChange` | 组件内部 `useReducer` 持有副本，交互流畅 |
| **受控** | `onChange` 里 `setTree(v)` | ⚠️ 只要把新树回写成新的 `data` 引用，就会触发内部 `reset`（**清撤销历史 + 选中回根**）。要做受控持久化，请把快照存在**另一个 state**（如上面的 `tree` 与 `onChange={setTree}`），或只在需要时写入 N 步去抖 |

### 10.4 切阅读态 / 导出

```tsx
const api = useRef<MindMapApi>(null);
const setReadonly = () => api.current?.setMode("readonly");

async function exportPng() {
  const payload = api.current!.getSvg() as SvgPayload;   // d.ts 声明是 unknown，需 as
  const blob = await svgToPngBlob(payload, 2);
  downloadBlob(blob, "我的导图.png");
}
```

---

## 11 迁移与已知约定

### 11.1 代码级已知缺陷（**本次不改代码**，文档按真实行为描述，勿依赖错误行为）

| # | 位置 | 问题 | 文档口径 |
| --- | --- | --- | --- |
| D1 | `MindMap.css:563` vs `MindMap.tsx:2101` | CSS 选择器是 `.mm-stage.is-editable`，JSX 输出 `is-editableNow` → **该规则永不命中** | 不承诺「只读态焦点框」样式 |
| D2 | `types.ts:403 / 405` | `addSummaryFor(text: string)` / `addFrameFor(label: string)` 签名**过期** | 实现是零参、入参被忽略 → 按零参写，见 §3.3 |
| D3 | `types.ts:481` | `getSvg(): unknown` | 实现返回 `SvgPayload` → 调用方 `as SvgPayload`，见 §3.12 |

> 修 D1/D2/D3 属后续独立任务，需同步改 `src/` 并跑 `npm run verify`。

### 11.2 交互与行为约定（17 条）

| # | 约定 | 影响 |
| --- | --- | --- |
| 1 | **`style.css` 必须显式引入** | npm 消费方不引 → 画布无尺寸与浮层样式；vendor 进宿主工程则自带 |
| 2 | **`editable` 只是初值** | 运行期切只读 / 编辑必须 `api.setMode()`；改 `props.editable` 无反应 |
| 3 | **`lineStyle: "straight"` 只影响绘制** | 折点仍由布局决定（`linkPath` 里 `straight` 时直接 `M…L…`） |
| 4 | **时间轴 / 鱼骨有额外轴线** | 时间轴贯穿主轴、鱼骨有脊柱 → `links.length ≠ nodes.length - 1` 属预期 |
| 5 | **节点不自动换行** | `nodeSize` 向 `wrapText` 传 `Number.POSITIVE_INFINITY`，只保留显式 `\n`；宽度全靠字符表估算 |
| 6 | **SSR 只出骨架** | 无缩略图位置、无公式精确宽度；`fit()` 空转；Portal 浮层不输出 |
| 7 | **节点拖拽默认关闭** | `api.setFreeDrag(true)` 才拖得动；`.mm-hint` 的「拖动节点可排序」文案误导 |
| 8 | **`setTree()` 清撤销历史** | 还会把选中重置到根、触发一次 `onChange` |
| 9 | **`clearNodeStyles()` 只清 `style.shape`** | 颜色 / 字号 / 边框 / 填充都还在 |
| 10 | **只读态键盘快捷键整体失效** | `stage` `tabIndex = -1` 拿不到焦点；但平移 / 缩放 / 缩略图仍可用 |
| 11 | **缩放钳制 `[0.15, 3]`** | 滚轮以指针为锚点 + `preventDefault()` → 浏览器页面缩放不生效 |
| 12 | **撤销栈上限 80** | 超上限丢弃最早的 `past` |
| 13 | **`taper` 与 `dashed` 互斥** | 填充带无法用 dasharray 表现；手绘主题下 taper 改用手绘中心线填充 |
| 14 | **`props.onChange` 首次挂载不触发** | `data` 引用变化会自动 reset 内部树 |
| 15 | **宿主必须给容器确定高度** | 否则 `fit()` 空转、画布不居中 |
| 16 | **`THEME_CATEGORIES` / `THEME_GROUPS` 同一数组** | 改一个等于改另一个 |
| 17 | **公式节点需宿主引入 katex CSS** | `katex` 是静态 import，`extras.tsx` 不带 CSS |

### 11.3 旧 README 已过期条目（本版已修正）

| 旧 README | 实际情况 |
| --- | --- |
| `api.addSummaryFor(text)` / `addFrameFor(label)` 带参 | **零参**，作用于当前 Ctrl/Cmd 多选集合，文案固定「概要」/「分组」，落地自动进内联编辑 |
| 缺多选浮动条 `MultiSelectBar` | 工具条已无多选面板，改为画布浮动条（关联线 / 概要 / 分组 / 清空） |
| 缺九宫格主菜单 `MainMenu` | 有 `MainMenu` + `buildMainMenu`，可注入 `Toolbar` |
| 缺手绘路径 API | 有 `sketch*` 双笔触 + `hand*` 单笔 + `branchPath` |
| 缺概要 / 分组一键生成与双击内联编辑 | 支持；多选 → 浮动条一键生成 → 画布双击改文案 |
| 缺键鼠交互与快捷键 | 见 README §5 与本手册 §3（旧版无键盘表） |
| 缺 CSS 类名清单 | 见 §8 |
| 几处 API 签名错 | 主要是上述两条 + `getSvg()` |
| 「Portal 浮层 SSR 渲不出来」里的 port 概念 | `src/` 无「port 渲染」概念，已按 `createPortal` 事实改写 |
| 导入格式清单漏 `.xml` / `.txt` | `IMPORT_ACCEPT` 实际含 8 种扩展名 |

---

## 12 版本说明

**v1.0.0** = 当前对外版本（`package.json:4`）。

本轮文档化动作：重写 `README.md`（≤250 行，概览口径）、新建 `docs/API.md`（本文件，全量口径），**未修改 `src/` 下任何文件、未修改 `docs/_api-inventory.md`**，仅用 `src/` 代码交叉校验事实。

与旧 README 的差异汇总（一句话版）：

| 维度 | 旧 README | v1.0.0 本版 |
| --- | --- | --- |
| 篇幅 | 181 行 | `README.md` 概览 + `docs/API.md` 全量 |
| `addSummaryFor` / `addFrameFor` | 带参 | **零参**，作用于多选集合，文案固定「概要」/「分组」 |
| `getSvg()` | 返回 `SvgPayload`（✅） | 实现确实如此；但 `types.ts:481` 声明 `unknown`，调用方需 `as` |
| `MindMapApi` 方法数 | 未列全 | 71 个，逐个签名 + 副作用 + 坑 |
| 多选入口 | 未提 | `MultiSelectBar`（Portal 浮动条） |
| 主菜单 | 未提 | `MainMenu` / `buildMainMenu` |
| 手绘 API | 未提 | `sketch*` / `hand*` / `SketchOptions` / `branchPath` |
| 内联编辑 | 未提 | 双击节点标题编辑、双击概要 / 分组文案编辑 |
| 键盘 | 未提 | README §5.2 + §3 交互章节 |
| CSS 类名 | 未提 | §8 全量分组表 |
| 导入格式 | 6 种 | 8 种（补 `.xml` / `.txt`） |
| 只读态 | 「不渲染 `mm-ui-only` 选中环」 | 补充：**键盘快捷键整体失效**，平移 / 缩放 / 缩略图仍可用 |
| 节点拖拽 | 未提 | **默认关闭**，需 `setFreeDrag(true)` |
| 已知缺陷 | 未提 | §11.1 列出 D1 / D2 / D3 三处 |

