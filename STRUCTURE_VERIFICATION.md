# 结构布局补齐 · 验收报告

> 项目：`youdao-mindmap-vite`（Vite + React 可编辑脑图组件）
> 日期：2026-09-30
> 目标：确保 7 种结构（逻辑结构图左/右、思维导图、组织结构图、目录组织图、时间轴、鱼骨图）在**真实渲染**下连线与坐标都正确，节点互不重叠。

## 结论

7 种结构全部通过真实浏览器（Chromium）渲染验证：

| 结构 | 节点 | 连线 | 重叠 | diag 连线 | 状态 |
|------|------|------|------|-----------|------|
| 逻辑结构图（右） | 20 | 19 | 0 | 0 | ✅ |
| 逻辑结构图（左） | 20 | 19 | 0 | 0 | ✅ |
| 思维导图 | 20 | 19 | 0 | 0 | ✅ |
| 组织结构图 | 20 | 19 | 0 | 0 | ✅ |
| 目录组织图 | 20 | 19 | 0 | 0 | ✅ |
| 时间轴 | 20 | 19 | 0 | 5 | ✅ |
| 鱼骨图 | 20 | 19 | 0 | 19 | ✅ |

- 节点数 = 20（根 + 19 子），连线数 = 节点 − 1 = 19，符合预期。
- 重叠（节点矩形 `getBoundingClientRect` 相交）全部为 **0**。
- 鱼骨图 19 条连线均为 `M … L …` 直线（diag），证明斜向骨头连线渲染正确。

## 本轮修复的三个根因

### 1. 思维导图根节点被重复平移（已修）
`layoutTree` 归一化时本已对 `nodes[]` 整体平移，但旧代码又对 `raw.root` 再平移一次。
`raw.root` 已是 `nodes` 元素，导致 `minX<0` 时根节点被额外右推、压住右侧分支（mindmap overlap=2）。
**修复**：删除对 `raw.root` 的二次平移块（仅保留一次整体平移）。

### 2. 鱼骨图骨头间距固定步长失效（已修）
旧 `BONE_STEP = 130` 且相邻骨头按 `j=floor(i/2)` 共享锚点。对宽子树，固定步长无法隔开相邻骨头，
重叠在 8→3→1 间反复修不好。
**修复**：逐根骨头错开锚点（`anchorX = anchorX0 − i*BONE_STEP`），并按最宽子树的**横向投影**动态求步长
`BONE_STEP = ceil((sub.maxX−sub.minX)·cosθ) + 120`。

### 3. 鱼骨图旋转后宽节点压住同骨头兄弟/父子（本轮新修，overlap=2）
`layoutSide` 用很小的 `V_GAP`/`H_GAP` 把兄弟、父子按轴对齐方式堆叠。鱼骨图把每根骨头的子树整体旋转 32°，
旋转把**垂直间隔压缩**到原来的 `cosθ≈0.85`，而宽节点（如「桌台状态机：空闲→预订→开台→结账→清台」252px、
「渠道：电话 / 小程序 / 门店」204px）的盒子会扫入相邻兄弟/父子。

真实浏览器实测最初复现该问题（重叠 2 处）：
- `包厢/散台模型` ↔ `桌台状态机…`（同属「桌台域」骨头的两个兄弟）
- `预订域`（骨头主题节点）↔ `渠道…`（其直接子节点）

**修复**：在 `layoutFishbone` 排版完成后、计算包围盒前，新增一轮**去重叠**（新增 `resolveFishboneOverlaps`）：
对每对相交节点，沿重叠更小的轴把两者各推开半个重叠量，迭代至无相交（≤80 轮）。
连线由 `centerX/Y` 重算，节点被推开后仍正确相连。该做法对任意标题宽度都收敛——
无头压力测试（每根骨头挂 2×超长标题，21 节点）结果 **overlap=0**。

## 验证方法（可复用）

1. **无头布局校验**：esbuild 把 `layout.ts` + 真实 `sampleTree()` 打包为 Node ESM，跑 7 结构 × overlap 断言；
   额外用超宽标题树做压力测试。优点：秒级、可断言 NaN/坐标/重叠/path 合法性。
2. **真实浏览器渲染校验**：`agent-browser` 起 Vite dev server（已加 `ulimit -n 65535` + `CHOKIDAR_USEPOLLING=true`
   绕过 EMFILE），用 `agent-browser eval --stdin`（heredoc，避免 shell 转义）遍历 `.mm-node`/`.mm-root > path`，
   计算屏幕矩形相交与 diag 连线数。

> 调试经验：早期 `eval` 全部返回空，根因是**选择器写错**（结构按钮是 `<button>结构</button>`，工具栏容器并非 `.mm-toolbar`），
> 并非 shell 转义；改用按 `button` 文本精确匹配 + `--stdin` heredoc 后即稳定。另外每个 `eval` 前需 `open` 一次以避开陈旧页面态。

## 构建状态

- `npm run build`：54 模块，dist 产物正常，tsc 0 error。
- `npm run build:lib`：18 模块，dist-lib（es/umd）正常。
- 清理：删除临时校验脚本（`_fishcheck.ts`/`_layoutcheck.*`/`_dump*.{ts,mjs}`/`_verify/`）。

## 交付物

- 截图证据：`structure-shots/{logical-right,logical-left,mindmap,org,catalog,timeline,fishbone}.png`
- 本报告：`STRUCTURE_VERIFICATION.md`
