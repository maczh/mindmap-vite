# 结构布局「图形混乱」+ 结构面板图标错误 · 修复验收报告

项目：`youdao-mindmap-vite`（Vite5 + React18 + TS 纯 SVG 脑图编辑器）
方式：**无头几何探针**（用真实 `sampleTree` 跑 7 种结构，断言坐标）+ **真实 Chromium 交互断言**（`agent-browser` 切结构、读 DOM）
验收时间：2026-09-29

---

## 一、问题

- **Bug A（图形混乱）**：切换结构类型时，思维导图 / 目录组织图 / 鱼骨图 / 时间轴的图形与结构类型不对应——目录组织图与组织结构图长得一样、时间轴一级节点不在同一行、鱼骨图骨头不上下交替。
- **Bug B（图标错误）**：结构下拉面板缩略图中，`org` 与 `catalog` 用同一模板（看起来一样），`fishbone` 仅两条同向骨头（无上下交替），`mindmap` 只画了单侧分支。
- **附加根因**：`fit()` 仅在挂载时调用，**切换结构不重新适配视图**，不同结构尺寸差异会让图形看起来错位 / 缩放异常。

---

## 二、修复内容

| 文件 | 改动 |
|---|---|
| `src/components/MindMap/layout.ts` | 新增 `layoutCatalog`（根子节点横向铺开、**深层垂直堆叠居中于父**，区别于 org）；重写 `layoutTimeline`（根子节点**同一水平线**，深层垂直堆叠）；重写 `layoutFishbone`（脊柱 + **上下交替骨头**，节点标签沿骨头倾斜，移除失效的 `resolveFishboneOverlaps`）；`PositionedNode` 增加 `rot` 字段 |
| `src/components/MindMap/MindMap.tsx` | 节点 `<g>` 应用 `rot` 旋转（鱼骨图标签沿骨头倾斜）；新增「切换结构后自动 `fit()`」effect |
| `src/components/MindMap/Toolbar.tsx` | 重写 `StructureThumb`：逻辑左/右、思维导图（左右均衡）、组织结构图（梳状）、目录组织图（竖向列表）、时间轴（水平轴）、鱼骨图（脊柱+交替骨头），**org ≠ catalog** |

> 参考形状来自 Simple Mind Map（CatalogOrganization / OrganizationStructure / Timeline / Fishbone）与有道云笔记思维导图显示。

---

## 三、无头几何探针（7 结构 × 20 节点，`sampleTree`）

| 结构 | 关键判定 | 结果 |
|---|---|---|
| logical-right / left | 水平单侧 | ✓ overlap=0 |
| mindmap | 一级左右均衡（2 / 3） | ✓ overlap=0 |
| org | 全部横向铺开（同 centerX 组=0） | ✓ overlap=0 |
| **catalog** | 深层垂直堆叠（同 centerX 组=**5**） | ✓ overlap=0，已与 org 区分 |
| **timeline** | 一级同水平线（centerY 种类=**1**） | ✓ overlap=0 |
| **fishbone** | 脊柱上下交替（上 **3** / 下 **2**） | ✓ overlap=3（同骨对角轻微重叠，见遗留） |

---

## 四、浏览器实测（真实 Chromium，20 节点，0 console error）

切换结构后读取根节点 `transform`（即布局坐标），与探针一致：

| 结构 | 根节点 transform | 说明 |
|---|---|---|
| 鱼骨图 | `translate(2386,197)` | 根（效应）位于脊柱**右端** ✓ |
| 目录组织图 | `translate(414,0)` | 顶部居中，深层竖向列表 ✓ |
| 时间轴 | `translate(0,0)` | 根在最左、与子节点同一水平线 ✓ |
| 思维导图 | `translate(634,220)` | 根居中、左右均衡 ✓ |
| 组织结构图 | `translate(1051,0)` | 顶部居中、全横向铺开 ✓ |

- 每次切换节点数恒为 **20**，无报错；切换结构触发 `fit()`，视图正确适配。

---

## 五、构建

- `npm run build`：`tsc -b` 0 错误，54 模块 ✓
- `npm run build:lib`：`dist-lib/` ESM + UMD + style.css ✓

---

## 六、遗留（非阻塞）

- 鱼骨图同骨兄弟节点因文本较宽 + 骨头角度较浅（32°），旋转后 AABB 仍有 3 处轻微对角重叠；真实视觉为错位对角摆放，并非真正压盖。若需彻底消除，可进一步旋转连线或限制节点文本宽度。
- 结构面板 org / catalog 的标签均为「逻辑结构图」「组织结构图」等（见 `theme.ts` 的 `STRUCTURES`），其中 logical-right 与 logical-left 共用标签「逻辑结构图」属既有设定，未改动。

**结论：四类结构图形已对应各自结构类型；结构面板图标已修正（org≠catalog，鱼骨上下交替，思维导图左右均衡）；构建全绿，浏览器实测通过。**
