# 节点字体层级 / 下划线风格 / 鱼骨图文字方向 —— 修改报告

## 需求

1. **字体字号（所有结构样式）**：根节点字号最大，一级节点次之，二级及以后（含叶子）字体最小；节点**无外边框**，采用**下划线风格**。
2. **鱼骨图**：文字内容不做旋转倾斜，保持正常从左到右。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `src/components/MindMap/layout.ts` | 新增 `defaultFontSizeForDepth()`；`nodeSize()` 增加层级参数；`makeSizer()` 接收层级映射；`layoutTree()` 预计算每个节点的层级；鱼骨图去掉节点旋转 |
| `src/components/MindMap/MindMap.tsx` | 默认形状改为 `underline`；渲染与内联编辑框按层级取默认字号；修正根节点在无底色块时的文字色 |

### 1. 按层级字号（根 > 一级 > 二级及叶子）

新增统一的层级字号规则，节点**未显式设置字号**时生效：

```ts
export function defaultFontSizeForDepth(depth: number): number {
  if (depth <= 0) return 24; // 根节点
  if (depth === 1) return 18; // 一级节点
  return 14;                  // 二级及以下 / 叶子节点
}
```

关键点：字号必须**同时**影响布局测量与渲染，否则根节点放大后会撑破按 14px 计算的文字框。
因此在 `layoutTree()` 里先遍历整棵树生成 `depthMap`（不改动节点数据），`makeSizer()` 用它决定每个节点的测量字号；渲染时 `MindMap.tsx` 用 `p.depth` 取同一套默认值，二者保持一致。

### 2. 无外边框 + 下划线风格（所有结构生效）

渲染逻辑中节点默认形状改为 `underline`：

```ts
const shape = eff.shape ?? "underline";
```

`underline` 形状下：`showRect = false`（不绘制矩形 → 无外边框、无填充底色），并绘制一条下划线（`line.mm-underline`，颜色沿用分支强调色）。对所有结构（逻辑图 / 思维导图 / 组织结构图 / 目录组织图 / 时间轴 / 鱼骨图）一致生效。

> 仍保留逐节点覆盖能力：若某节点显式设置过 `shape`（如矩形 / 胶囊 / 无）或 `fontSize`，仍以该节点自身设置为准，工具面板的编辑功能不受影响。

### 3. 连带修复：根节点文字不可见

原主题里根节点文字色 `theme.rootText` 是为「填充色块」配的对比色（经典蓝主题下是白色）。
改为下划线样式后不再绘制底色块，白字落在浅色画布上会**完全不可见**。因此根节点文字色在不绘制色块时回退到普通节点文字色：

```ts
const textColor =
  eff.color ??
  (isRoot && showRect
    ? base.nodeText ?? theme.rootText
    : base.nodeText ?? theme.nodeText);
```

### 4. 鱼骨图文字不旋转

鱼骨图原先给每个节点设置 `n.rot = boneRot`（沿骨头方向倾斜）。现改为 `n.rot = 0`，节点仍沿骨头方向**定位**（几何坐标不受影响），但文字框保持水平、正常从左到右。同时移除了不再使用的 `boneDeg` / `rotFor`。

## 验证结果（真实浏览器）

用 dev server（`vite --port 5179`）+ 浏览器自动化逐项断言：

**默认结构（思维导图）**
- 节点总数 20；字号分布 `{ 24: 1, 18: 5, 14: 14 }` —— 根节点 24px、一级 18px、二级及以下 14px ✓
- 所有节点 `rect.mm-rect` 均不存在（无外边框）✓
- 所有节点均存在 `line.mm-underline`（下划线）✓
- 根节点文字色由 `#ffffff`（不可见）修正为 `#1f2329` ✓

**鱼骨图结构**
- 全部 20 个节点 `transform` 中不含 `rotate(...)`（`anyRotate: false`）✓
- 字号层级沿用 `{ 24:1, 18:5, 14:14 }` ✓
- 文字水平排布，正常从左到右 ✓

`npx tsc -b` 类型检查通过（退出码 0）。

## 效果预览

- `node-style-shots/default-structure.png` —— 默认结构（下划线 + 层级字号）
- `node-style-shots/fishbone.png` —— 鱼骨图（文字不倾斜）
