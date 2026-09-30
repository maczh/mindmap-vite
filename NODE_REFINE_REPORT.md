# 节点样式精修（第 3 轮）— 胶囊外框 + 禁止自动换行

## 需求
1. 根节点与一级节点的外框样式设为**胶囊（capsule / 药丸）**样式。
2. 各节点内容**不允许自动换行**（含叶子节点）。

在第 2 轮「根 / 一级加框、二级及以下用下划线」的基础上精修。

## 实现

### 1. 根 / 一级改为胶囊
`src/components/MindMap/MindMap.tsx` 节点渲染处，层级默认形状由 `rect` 改为 `capsule`：

```ts
const defaultShape = p.depth <= 1 ? "capsule" : "underline";
const shape = eff.shape ?? defaultShape;
```

胶囊由既有的 `rx = p.h / 2` 分支实现（`shape === "capsule"`），实测根节点
`rx=29 / h=58`、一级节点 `rx=24.5 / h=49`，均为标准药丸形。逐节点显式设置的
`style.shape` 仍然优先。

### 2. 禁止自动换行
换行只发生在 `layout.ts` 的 `nodeSize()` 一处（`wrapText` 全仓库仅此一调用）。
改为传入极大宽度关闭「按宽度折行」，并去掉原来的宽度上限 `MAX_TEXT_W`，
节点宽度随内容自适应：

```ts
const m = wrapText(node.title || " ", fontSize, Number.POSITIVE_INFINITY, bold);
const w = Math.max(m.width + extra, MIN_W + pref + right);   // 不再 Math.min 到 220+extra
```

- **仍保留用户显式输入的换行符 `\n`**（`wrapText` 内部按 `\n` 分行）——只禁「自动」换行。
- 删除常量 `MAX_TEXT_W`（已无引用）。
- 尺寸仍在同一处计算，渲染与测量共用，故布局与连线自动随之适配。

## 验证（真实浏览器实测，agent-browser）
| 结构 | 节点 | 带框 | 其中胶囊 | 最大文本行数 |
| --- | --- | --- | --- | --- |
| 默认（思维导图） | 20 | 6 | 6 | **1** |
| 鱼骨图 | 20 | 6 | 6 | **1** |
| 时间轴 | 20 | 6 | 6 | **1** |

- 6 个带框节点 = 根 + 5 个一级节点，且 `rx === height / 2` → 全部为胶囊。
- `maxLines = 1` → 全部节点均为单行，确认无自动换行（含叶子节点）。
- 叶子节点维持第 2 轮的「左对齐 + 下划线轨道、连线自轨道两端接入」样式。
- `npx tsc -b` 类型检查通过（退出码 0）。

## 改动文件
- `src/components/MindMap/MindMap.tsx`
  - 层级默认形状 `depth <= 1` 由 `rect` → `capsule`；`isUnderlineNode()` 同步。
- `src/components/MindMap/layout.ts`
  - `nodeSize()` 关闭自动换行（`Infinity` 折行宽度 + 去掉 `MAX_TEXT_W` 上限）；删除 `MAX_TEXT_W` 常量。

## 效果预览
- `node-style-shots/default-structure.png` — 默认结构（胶囊 + 下划线叶子）
- `node-style-shots/fishbone.png` — 鱼骨图
- `node-style-shots/timeline.png` — 时间轴

## 注意
关闭自动换行后，超长标题会让节点变宽、整图随之变大（不再折行压缩）。如果某些结构
下希望恢复「仅对超长文本折行」，可把 `nodeSize()` 的折行宽度从 `Infinity` 改回一个
阈值（例如 220）。
