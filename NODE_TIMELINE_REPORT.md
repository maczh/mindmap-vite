# 时间轴（Timeline）结构样式仿截图 — 改动报告

> 目标：让 `timeline` 结构的视觉完全贴合参考截图（奇海RIS 菜品模型）——根胶囊在左、水平主轴贯穿一级胶囊、一级子树上下交替、二级及以下为无框左对齐文字、肘形折线连接。

## 一、改动总览

| 文件 | 改动 |
| --- | --- |
| `src/components/MindMap/layout.ts` | 重写 `layoutTimeline()`；新增 `makeTimelineSizer()`（时间轴专用紧凑尺寸档位）；新增时间轴常量 `TL_COL_GAP / TL_INDENT / TL_TRUNK_DX / TL_STUB / TL_V_GAP`；导出共享常量 `TEXT_LEFT_INSET`。 |
| `src/components/MindMap/MindMap.tsx` | 时间轴结构下抑制「下划线轨道」（`isTimeline` 守卫）；`UNDER_LEFT` 复用 `layout.ts` 的 `TEXT_LEFT_INSET`，保证连线接入点与文字位置同源、不漂移。 |

## 二、视觉规格（对照参考截图）

1. **根节点**：实心胶囊，置于最左端；一条水平**主轴**从根右缘向右贯穿全部一级节点。
2. **主轴脊柱（本轮回填的关键）**：不是「逐胶囊分段」的线段，而是**一条从根右缘延伸到最后一个一级胶囊右缘的连续水平线**。它被一级胶囊的不透明底色遮住，视觉上是一根完整的脊柱——与参考截图一致（逐段画法会在胶囊之间留缝）。
3. **一级节点**：带描边的胶囊，直接挂主轴（`centerY` 对齐主轴），上下交替：
   - 偶数序号 → **向下**，奇数序号 → **向上**（`sgn` 交替）。
4. **二级及以下 / 叶子**：**无框、无下划线**，只有左对齐文字（引导交给肘形折线的短横头）。
5. **连接线（肘形折线）**：
   - 竖线落在**父节点文本左缘**（`TL_TRUNK_DX = 0`，仿截图）；
   - 末端短横头 `TL_STUB` 直达子节点文本左缘（不再留 12px 空隙）；
   - 每深一层整体向右缩进 `TL_INDENT`。
6. **无重叠**：子树用「单调游标」自上而下推进，结构上不可能出现兄弟节点重叠。

## 三、关键常量（即调参旋钮）

```ts
const TL_COL_GAP = 56; // 相邻一级列之间的间距
const TL_INDENT   = 36; // 每深一层，子节点文本向右缩进 ← 想要更松/更紧改这里
const TL_TRUNK_DX = 0;  // 子树竖线落在「父节点文本左缘」（仿截图）
const TL_STUB     = TL_INDENT - TL_TRUNK_DX; // 短横头直达子文本左缘
const TL_V_GAP    = 8;  // 同一列内的纵向行距
```

> 间距说明：`TL_INDENT = 36` 与参考截图成**比例**吻合（参考图本身缩放更大，绝对像素更大）。若你觉得当前缩进偏紧或偏松，直接调 `TL_INDENT` 即可；`TL_TRUNK_DX` 控制竖线相对父文本左缘的偏移（0 = 贴着文字，仿截图）。

## 四、验证结果

- `npx tsc -b` ✅ 通过。
- 布局冒烟测试（esbuild + node，20 节点 fixture）：
  - `nodes=20, links=16, width=813, height=385`
  - **连续脊柱存在**：`spine = M 128 157.5 L 794.8 157.5`（单条两点、同一 y）
  - **一级上下交替**：`L1 sgn = [1,-1,1,-1]`，且 `L1 on-axis = true`（全部对齐主轴）
  - **肘形连接**：15 条 v 轴连线，短横头末端 x 全部等于子节点文本左缘（`stubReachesText = 15`，无间隙）
  - **零重叠**：`box overlaps = 0`
- 其它结构（mindmap / org / catalog / fishbone）回归：未改动其布局/渲染，仅时间轴新增守卫，无副作用。

## 五、交付物 / 预览图

`timeline-shots/` 下四张图（已按本轮回填后的代码重新截图）：

| 文件 | 内容 |
| --- | --- |
| `compare-reference-vs-result.png` | 参考截图（上） vs 本次渲染（下）直接对照 |
| `deep-tree.png` | 时间轴完整渲染（奇海RIS 菜品模型式多级嵌套 fixture） |
| `elbow-detail.png` | 局部放大：一级子树肘形折线 + 连续脊柱细节 |
| `app-timeline.png` | 组件在示例树（海鲜火锅包厢预订）上的时间轴效果 |

## 六、文件清单

- 改动：`src/components/MindMap/layout.ts`、`src/components/MindMap/MindMap.tsx`
- 预览：`timeline-shots/*.png`
- 后续的「二级及以下 11px 字号 + 与一级交互完全一致」改动**作用于所有结构**，已单独记录于 `NODE_L2_FONT_INTERACTION_REPORT.md`。
- 保留了可复用的渲染/交互验证脚本：`_verify/tl-sample.*`、`_verify/tl-deep.*`、`_verify/capture.sh`、`_verify/verify-font.sh`（详见上述报告的第六节）。
