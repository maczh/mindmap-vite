# mindmap-vite

**可编辑的 SVG 思维导图 React 组件** —— 零外部图形库，7 种结构 × 17 个主题 × 完整节点补齐项，开箱可导入导出。

v1.0.0 · MIT · React 18 / 19

---

## 1 项目定位

| | |
| --- | --- |
| **它是** | 一个 React 组件：给定一棵 `MindNode` 树，渲染成可点选 / 可编辑 / 可撤销 / 可导入导出的 SVG 导图，并通过 `ref` 暴露 71 个命令式方法给宿主驱动。 |
| **它不是** | 不是 B/S 前端框架之外的任何运行时服务；不自带后端与云同步；不打包 `katex` 的 CSS（公式节点需宿主自行引入）；不是图形库（连线 / 布局 / 手绘全部自己算）。 |
| **规模** | 组件目录 23 个文件 ≈ 1.2 万行（含 CSS），唯一入口 `src/components/MindMap/index.ts`。 |

组件不依赖宿主项目：既可 vendor 进任意 Vite/React 工程（组件内部已 `import "./MindMap.css"`，样式自带），也可作为 npm 包消费。

---

## 2 核心特性

| # | 特性 | 一句话 | 全量清单 |
| --- | --- | --- | --- |
| 1 | **7 种结构** | 思维导图 / 逻辑结构图（左右双向，同名靠缩略图区分）/ 组织结构图 / 目录组织图 / 时间轴 / 鱼骨图 | API 手册 §5.2 |
| 2 | **17 个主题** | 经典 / 深色 / 朴素 / 手绘 四分类，其中 3 个手绘主题走双笔触路径 | API 手册 §5.1 |
| 3 | **连线三件套** | 线型（实线 / 虚线 / 从粗到细）、箭头（无 / 向内 / 向外）、分支样式（括号 / 圆弧 / 花括号 / 分叉 / 钩形 …）三者正交可组合 | API 手册 §5.8–5.9 |
| 4 | **节点 / 多选补齐项** | 逐节点：缩略图、标签、LaTeX 公式、外框、子树概要、关联线，外加标记 / 优先级 / 进度 / emoji 前缀；多选：选中 ≥2 个 → 画布浮动条一键生成「关联线 / 概要 / 分组框」，落地后双击改文案 | API 手册 §3.3–3.4、§4.3–4.4 |
| 6 | **导入导出** | `.km` `.mm` `.smm` `.xmind` `.json` `.xml` `.txt` 导入；`png` `svg` `km` `mm` `smm` `json` `xmind` 导出；含 UTF-16 / GB18030 编码嗅探与结构还原 | API 手册 §6 |
| 7 | **撤销重做** | 画布焦点区 80 步历史，键盘 `Ctrl/Cmd+Z` / `Shift+Z` / `Ctrl+Y` | API 手册 §3.1 |
| 8 | **命令式 API** | `ref` 上 71 个方法：数据、结构、多选、样式、配置、模式、视图、几何、导出全覆盖 | API 手册 §3 |
| 9 | **UI 部件可拆** | `MainMenu` 九宫格菜单、`MultiSelectBar` 浮动条、8 个配置面板 + 3 类缩略图、`Dialog`、`Icon` 均为官方导出，可拿来拼自己的外层菜单 | API 手册 §1.3 |
| 10 | **确定性手绘** | 抖动只依赖「几何 + 种子」，不用 `Math.random()` —— 重渲染与导出 SVG 结果一致 | API 手册 §7.2 |
| 11 | **SSR 可骨架渲染** | `react-dom/server` 能出节点骨架；缩略图导航、公式宽度、Portal 浮层在服务端不可靠 | API 手册 §9 |

---

## 3 安装

### 3.1 npm（推荐）

```bash
npm i mindmap-vite
# peer：react / react-dom（^18.0.0 || ^19.0.0）
# deps ：jszip（读写 .xmind，动态 import）、katex（渲染公式节点）
```

> ⚠️ **`mindmap-vite/style.css` 必须显式引入**（否则画布没有尺寸与浮层样式）；组件内部的 `import "./MindMap.css"` 只在 vendor 进宿主构建的工程里生效。

```ts
import "mindmap-vite/style.css";
import "katex/dist/katex.min.css"; // 只有用到公式节点时才需要
```

### 3.2 vendor / 离线 UMD 两件套

把 `dist-lib` 整个目录拷进工程，用两个文件即可（UMD 全局名 `MindMapVite`）：

```
dist-lib/mindmap-vite.umd.js    <script> 直引
dist-lib/style.css              <link> 引样式
```

vendor 进源码工程时**不需要**引 CSS —— `MindMap.tsx:96` 已经 `import "./MindMap.css"`。

### 3.3 产物文件对照表

| `package.json` 字段 | 产物 | 说明 |
| --- | --- | --- |
| `main` | `dist-lib/mindmap-vite.umd.js` | UMD，全局 `MindMapVite` |
| `module` | `dist-lib/mindmap-vite.es.js` | ESM |
| `types` | `dist-lib/components/MindMap/index.d.ts` | `tsc -p tsconfig.lib.json` 生成的声明 |
| `style` | `dist-lib/style.css` | 全部 `mm-` 前缀样式 |
| `exports["./style.css"]` | `dist-lib/style.css` | 显式引入路径 |
| `exports["./dist-lib/*"]` | `dist-lib/*` | 子路径直取（vendor 场景常用） |
| `files` | `["dist-lib", "README.md"]` | 发布包内容 |

`react` / `react-dom` / `react/jsx-runtime` 是外部依赖，不进产物。

---

## 4 快速开始

```tsx
import { useRef } from "react";
import { MindMap, type MindMapApi, type MindNode, sampleTree } from "mindmap-vite";
import "mindmap-vite/style.css";
import "katex/dist/katex.min.css";

export default function App() {
  const api = useRef<MindMapApi>(null);

  // 用 ref 拿命令式 API
  const exportKm = () => api.current?.exportAs("km");
  const toReadonly = () => api.current?.setMode("readonly");

  return (
    <div style={{ height: 720 }}>
      <MindMap
        ref={api}
        data={sampleTree()}
        editable
        showToolbar
        fitOnMount
        onChange={(tree: MindNode) => console.log(tree.title, tree.children.length)}
      />
    </div>
  );
}
```

> ⚠️ **`props.data` 是「一次性初值」不是受控源**：传新引用 = 内部 `reset`（清空撤销 / 重做历史 + 选中切回根 + 触发一次 `onChange`），要持久化请在 `onChange` 里存、不要回写 `data`；运行期切只读态请用 `api.setMode("readonly")`（`props.editable` 只决定初值，改它不回写运行期模式）；宿主必须给外层一个**确定高度**，否则 `fit()` 会因 `clientHeight = 0` 空转。

---

## 5 交互速查

### 5.1 鼠标

| 操作 | 行为 |
| --- | --- |
| 单击节点 | 单选；按住 `Ctrl/Cmd` 再点 = 加入 / 移出多选集合 |
| 双击节点 | 进入标题内联编辑 |
| 右键节点 | 弹出环形功能菜单（仅编辑态） |
| 拖动画布空白 | 平移；滚轮默认以指针为锚点缩放（`setWheelAction("move")` 改为滚轮平移） |
| 双击概要 / 分组框标题 | 画布内联编辑文案（框内空白处压住节点时不命中） |
| 选中 ≥2 个节点 | 画布下方浮出浮动条：关联线 / 概要 / 分组框 / 清空 |

> ⚠️ **节点拖动默认关闭**，需 `api.setFreeDrag(true)` 后节点才能拖拽换父 / 排序（阈值 5px，根节点只能挂成子节点，且不能拖进自己的子孙）。

### 5.2 键盘（画布获得焦点时）

| 键 | 行为 | 键 | 行为 |
| --- | --- | --- | --- |
| `Ctrl/Cmd + Z` | 撤销 | `Tab` / `Shift+Tab` | 新增子节点 / 提升一层 |
| `Ctrl/Cmd + Shift+Z`、`Ctrl+Y` | 重做 | `Enter` / `Shift+Enter` | 插入同级（后 / 前） |
| `Ctrl/Cmd + S` | 导出 `.km` | `F2` | 编辑标题 |
| `Ctrl/Cmd + B/I/U` | 粗体 / 斜体 / 下划线 | `Delete` `Backspace` `空格` | 删除（根拒绝）/ 折叠展开 |
| `Alt + ↑ / ↓` | 同级前移 / 后移 | `Esc` | 关菜单 + 清空选中 |

> 只读态（`setMode("readonly")`）下**键盘快捷键整体失效**（画布 `tabIndex = -1`，拿不到焦点），但平移 / 缩放 / 缩略图导航仍可用；输入框内：`Enter` 提交并新增同级、`Tab` 提交并新增子节点、`Esc` 丢弃。

---

## 6 配置与主题

**只列代表项**（全量：每个主题的色值、全部 8 种分支样式、CSS 全类名 → [docs/API.md](docs/API.md)）：

| 维度 | 代表值 | 怎么改 |
| --- | --- | --- |
| 主题 | `classic-blue`（默认）、`dark-blue`、`hand-colorful` | `defaultConfig={{ themeId }}` / `api.setThemeId(id)` |
| 结构 | `mindmap`（默认，左右均衡）、`org`、`timeline` | `defaultConfig={{ structure }}` / `api.setStructure(id)` |
| 连线 | `lineStyle: "curve" \| "elbow" \| "straight"`、`taper` 与 `dashed` 互斥 | `api.setLineStyle(s)` / `api.setBase({ linkPattern })` |
| 基础样式 | `base` 内 13 个字段（字体 / 字号 / 背景 / 连线色宽线型 / 箭头 / 配色 / 圆角 / 描边 / 填充 / 分支样式 …） | `api.setBase(patch)`（按字段合并） |

```tsx
<MindMap data={sampleTree()} defaultConfig={{ themeId: "dark-blue", structure: "org", lineStyle: "elbow" }} />
```

`MindMapProps` 共 11 个字段（`data` / `width` / `height` / `className` / `fitOnMount` / `editable` / `showToolbar` / `onChange` / `defaultConfig` / `onScaleChange` / `onSelectChange`）与「命令式 API 全量 71 个方法签名」，见 API 手册 §2、§3。

---

## 7 数据结构速览

```ts
interface MindNode {
  id: string;              // 唯一
  title: string;           // 标题，显式 \n 换行
  children: MindNode[];    // 子节点（可为空数组）
  collapsed?: boolean;     // 收起子树
  style?: MindNodeStyle;   // 字号/字体/粗斜体/下划线/删除线/颜色/填充/描边/线型/圆角/形状
  note?: string;           // 备注（图标 + tooltip）
  link?: string;           // 超链接
  priority?: number;       // 1-9 前缀徽标
  progress?: number;       // 0-10 进度饼
  markers?: string[];      // 标记 id
  icons?: string[];        // emoji 前缀 id
  /* 补齐项 */
  image?: MindNodeImage; tags?: string[]; formula?: string;   // LaTeX，不含 $
  frame?: MindNodeFrame; generalization?: MindGeneralization;
  /* 根节点专属（只有 root 上的这些字段会被读取） */
  assocLines?: MindAssocLine[];      // 关联线：任意两节点之间的曲线
  summaryGroups?: MindSummaryGroup[];// 多选概要：右侧括号 + 引线 + 概要框
  frameGroups?: MindFrameGroup[];    // 多选分组：虚线圆角框 + 左上标签
}
```

这三者都是「**只存 id 集合 + 文案**」，几何每次从当前布局实时算，缩放 / 拖拽后自动贴合；可以跨分支汇总，正是普通 `frame`（框住子树）/ `generalization`（子树汇总）做不到的事。剩下 18 个字段（含 `MindNodeStyle` / `MindNodeImage` 等补齐项结构）与这 5 种「框」的关系对照，见 API 手册 §4。

---

## 8 目录结构

```
src/
├── components/MindMap/          组件目录（23 文件含 io/，≈1.2 万行含 CSS）
│   ├── MindMap.tsx 3037 主体：SVG 渲染 / 交互 / 撤销栈 / 命令式 API
│   ├── MindMap.css 1259 全部 UI 样式（类名统一 mm- 前缀）
│   ├── extras.tsx 1092 补齐项：关联线 / 外框 / 概要 / 分组 / 标签 / 缩略图 / 公式
│   ├── layout.ts 1083 7 种结构布局 + 节点尺寸度量     panels.tsx 621 配置面板
│   ├── handdrawn.ts 527 双笔触手绘（确定性）  types.ts 487 类型与常量
│   ├── Menu.tsx 462 九宫格主菜单    theme.ts 450 主题 / 结构 / 色盘
│   ├── Toolbar.tsx 341 工具条   tree.ts 283 不可变树操作（op*）
│   ├── Icons.tsx 245 / Popover.tsx 175 / MultiSelectBar.tsx 143（Portal）
│   ├── branchstyle.ts 136 / Minimap.tsx 109 / text.ts 97 / Dialog.tsx 84
│   ├── index.ts 151 公开入口（导出面唯一定义）     └── io/ 导入导出（index + json + freemind + xmind）
├── data/adapter.ts 65   有道云笔记数据 ⇄ MindNode
└── App.tsx / main.tsx / index.css   demo 站点（非库代码）
verify/                       回归测试流水线（见 §10）
```

---

## 9 开发调试

```bash
npm i
npm run dev         # vite：自带 demo 站点
npm run build       # tsc -b && vite build：demo 生产构建
npm run build:lib   # 产出 dist-lib/：ESM + UMD + style.css + tsc 生成的 .d.ts
npm run preview     # 预览 demo 构建产物
```
---

## 10 回归测试

```bash
npm run verify   # bash verify/run.sh
```

自包含流水线，**任一阶段非零退出即整体失败**（实际是「清理 + STEP 1..8」共 9 段）：

| 段 | 内容 | 环境 |
| --- | --- | --- |
| STEP 0 | 清理旧产物 | — |
| STEP 1 / 2 | 类型检查 `tsc -b --force` → 库构建 `build:lib` | Node 18+ |
| STEP 3 | 逻辑断言（树操作 / 布局 / 主题常量 / io 往返 / 有道适配） | 纯 Node |
| STEP 4 / 5 | 产物静态校验 + `react-dom/server` 直引 `dist-lib` 的 SSR 消费断言 | Node |
| STEP 6 | 构建消费方工程（`verify/consumer` 软链 + `vite build`） | Node |
| STEP 7 | 真实 Chrome 交互回归（7 结构 / 编辑 / 只读 / 导出 / 0 报错，附截图） | `playwright-core` + 本机 Chrome |
| STEP 8 | 多选浮动条交互回归（跑**消费方产物**：多选 → 概要 → 改文案 → 分组 → 双击复查） | 同上 |

浏览器阶段可用 `PORT` / `PLAYWRIGHT_CHROME` 覆盖，截图落在 `verify/shots/`；任一 `fail` 即 `exit 1`。

---

## 11 延伸阅读

**[docs/API.md](docs/API.md) —— 完整 API 手册**：导出符号总表、`MindMapProps` 全量、`MindMapApi` 71 个方法逐个签名与坑、全部类型定义、枚举常量全表、IO 导入导出、几何 / 手绘 / 文本工具、CSS 类名清单、SSR 说明、集成示例与已知缺陷。
