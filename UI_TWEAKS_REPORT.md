# 三项 UI 调整 · 验收报告（思维导图左右间距 / 默认结构 / 位置预览面板）

项目：`youdao-mindmap-vite`（Vite5 + React18 + TS 纯 SVG 脑图编辑器）
验收时间：2026-09-30　方式：**无头几何探针**（真实 `sampleTree`）+ **真实 Chromium（`agent-browser`）DOM 断言**

对应需求：

1. 思维导图左边一级节点与根节点间距，调整为与右边一级节点间距相同。
2. 打开思维导图时，若脑图文件中没有设置默认结构类型，则默认为**思维导图**。
3. 位置预览面板移到**左下角、紧邻缩放面板右边**，并将面板宽度**缩减一半**。

---

## 一、需求 1 — 左右一级节点与根节点间距一致（Bug 修复）

### 根因（真几何缺陷）
`layout.ts` 的 `layoutSide(root, side, …)` 对左右两侧的「根副本」落点不同：

```ts
const x = side === 1 ? pitch[depth] : -pitch[depth] - w;
```

- 右侧（`side=1`）：根在 depth 0，`pitch[0]=0` → 根占据 `[0, rootW]`。
- 左侧（`side=-1`）：根 `x = -pitch[0] - rootW = -rootW` → 根占据 `[-rootW, 0]`。

`layoutBalanced` 把两次布局合并时，**只保留了右侧那份根**作为真正的根节点，且只对齐了 y（`dy`），**没有对齐 x**。于是左侧一级节点与「被保留的真实根」之间，凭空多出整整一个根节点宽度 `rootW`（示例树 `rootW = 188`），左支间距 = `H_GAP + rootW`，右支 = `H_GAP` —— 视觉上左支明显更空。

### 修复（`layoutBalanced` 内，与既有 y 对齐并列补上 x 对齐）
```ts
const dy = rR.root.y - rL.root.y;
const dx = rR.root.x - rL.root.x;   // 左侧根在 [-rootW,0]，右侧根在 [0,rootW]
for (const n of rL.nodes) {
  n.y += dy; n.centerY += dy;
  n.x += dx; n.centerX += dx;       // 平移后左右根重合，两侧间距天然对称
}
```
平移量 `dx` 恰好是 `rootW`（`0 - (-rootW)`），对齐后左右根重合、左侧各列间距与右侧完全镜像。

### 验证
**无头探针**（真实 `sampleTree`，`H_GAP = 58`）：

| 结构 | 根→一级 左/右间距 | 深层列间距 | 连线越界/悬空 |
|---|---|---|---|
| **mindmap** | **58 / 58** | 左 1→2 = 58，右 1→2 = 58 | 0 / 0 |
| logical-right | — / 58×5 | — | 0 / 0 |
| logical-left | 58×5 / — | — | 0 / 0 |
| org / catalog / timeline / fishbone | （非水平侧向布局，不作对称断言） | — | 0 / 0 |

修复前左侧间距为 `58 + 188 = 246`，修复后 **58 = 58**，7 种结构连线均为 0 越界 / 0 悬空。

**真实 Chromium 断言**（20 节点示例树）：根节点两侧一级节点与根的实际像素间距 **左 = [49.05, 49.05]、右 = [49.05, 49.05, 49.05]**（49.05 = 58 × 当前 `fit()` 缩放），完全一致。

---

## 二、需求 2 — 未指定结构时默认「思维导图」

两处落地：

| 位置 | 改动 |
|---|---|
| `types.ts` `DEFAULT_CONFIG` | `structure: "logical-right"` → **`"mindmap"`**（组件/新建文档的默认结构即思维导图） |
| `MindMap.tsx` `handleImport` | 打开文件后 `setConfig((c) => ({ ...c, structure: "mindmap" }))` —— 文件未携带结构类型时回到思维导图（同时也避免沿用上一份文件的旧结构） |

> 说明：当前支持的导入格式（有道扁平 `.km`、KityMinder、`.mm`、`.smm`、`.xmind`）中，只有 `.smm` 的 `layout`、KityMinder 的 `template`、`.xmind` 的 `structureClass` 可能携带结构语义，但本组件此前并未把它们映射进 `config.structure`。因此本次实现为：**导入后统一落到「思维导图」**，即需求所述「文件中没有设置默认结构类型 → 默认为思维导图」。若后续需要「尊重文件里显式声明的结构」，可另开一项做格式→`StructureType` 的映射。

### 验证
- **默认加载**：示例树打开后根两侧均有节点（左 8 / 右 11）→ 默认即思维导图 ✓
- **导入路径**：先切到「逻辑结构图」（断言 19 个节点全部在根右侧），再上传一份**不含任何结构声明**的 `.km`（根「导入测试根」+ 甲/乙/丙三个分支，内容为 `{"nodes":[…]}` 扁平 JSON）→ 导入后节点分布 **左 1 / 右 2**，即自动回到思维导图 ✓

---

## 三、需求 3 — 位置预览面板：左下角紧邻缩放面板右侧 + 宽度减半

### 改动
| 文件 | 改动 |
|---|---|
| `MindMap.tsx` | 新增左下角停靠容器 `<div className="mm-dock-bl">`，把「竖向缩放控件」与 `<Minimap>` 包成一个整体（DOM 结构：缩放面板在左、缩略图紧邻其右） |
| `MindMap.css` | 新增 `.mm-dock-bl`（`position:absolute; left:16px; bottom:16px; display:flex; align-items:flex-end; gap:10px`，容器 `pointer-events:none`、子元素 `auto`）；`.mm-zoom` 与 `.mm-minimap` 移除各自的 `position/left/right/bottom/z-index`（改为停靠区内的静态成员） |
| `Minimap.tsx` | `MM_W: 190 → 95`（宽度减半；高度 `MM_H = 124` 不变） |

### 验证（真实 Chromium 实测）
| 断言 | 实测 |
|---|---|
| 缩略图紧邻缩放面板**右侧** | 间隙 **10.0px**（= 停靠区 `gap`）✓ |
| 与缩放面板**底部对齐** | 两者 `bottom` 均为 **542.0** ✓ |
| 位置在**左下角**（不在右下角） | 缩略图 `left = 107` < 视口半宽 640；`bottom = 542` > 视口 60% ✓ |
| 面板宽度**约为原来一半** | 面板 **109px**（= 95 + 2×6 padding + 2 border），内部 svg **95px**（原 190 / 面板约 204）✓ |

截图证据：`shots-interaction/05-mindmap-default-minimap-bottomleft.png`（默认思维导图 + 左下角停靠的缩放/预览）、`shots-interaction/06-after-import-mindmap.png`（打开无结构文件后回到思维导图）。

---

## 四、浏览器断言汇总（真实 Chromium）

**Phase 1（默认视图）9/9 通过**
- 节点渲染 20 个；默认结构 = 思维导图（左 8 / 右 11）；一级节点齐全；
- 左右一级节点与根间距相同（49.05 / 49.05）；
- 缩略图与缩放面板存在、间隙 10px、底部对齐、位于左下角、宽度约为原一半（109px / svg 95px）。

**Phase 2（切结构）4/4 通过**：结构面板 7 张卡片，切「逻辑结构图」后 19 个节点全部位于根右侧。

**Phase 3（导入无结构 .km）2/2 通过**：导入根「导入测试根」加载成功；结构回到思维导图（左 1 / 右 2）。

**合计 15/15 断言通过，无控制台报错。**

---

## 五、构建状态

- `npm run build`：`tsc -b` 0 错误，54 模块，`dist/`（index.html / css 15.04KB / js 230.15KB / jszip 97.42KB）✓
- `npm run build:lib`：`dist-lib/`（es 132.86KB / umd 86.52KB / style.css 14.14KB）✓

> 环境坑（复用）：本机 `npm run dev` 的 chokidar 文件监听会因 inotify 上限报 `EMFILE: watch`（`max_user_instances=128`），无法直接起 dev server。改用**静态托管已构建的 `dist/`**（`python3 -m http.server --directory dist`）即绕开监听器，且顺带验证了生产构建。另：后台服务进程会在两次工具调用之间被回收，**起服务与跑浏览器断言必须放在同一条命令里**。

---

## 六、改动文件清单

| 文件 | 改动 |
|---|---|
| `src/components/MindMap/layout.ts` | `layoutBalanced` 增加左侧分支 x 对齐（`dx`），使左右一级节点与根间距一致 |
| `src/components/MindMap/types.ts` | `DEFAULT_CONFIG.structure` 默认改为 `"mindmap"` |
| `src/components/MindMap/MindMap.tsx` | 导入文件后结构回落为 `"mindmap"`；渲染改用 `.mm-dock-bl` 停靠容器包裹缩放面板与缩略图 |
| `src/components/MindMap/Minimap.tsx` | 缩略图宽度 `190 → 95`（减半） |
| `src/components/MindMap/MindMap.css` | 新增 `.mm-dock-bl`；`.mm-zoom` / `.mm-minimap` 去绝对定位 |

清理：临时探针/测试脚本（`_probe3.*`、`/tmp/mm*.js`、测试 `.km`）已删除；根目录 `*.timestamp-*.mjs` 临时文件已清理。

**结论：三项 UI 调整全部完成并在真实浏览器中实测通过（15/15），无头几何探针确认左右间距完全对称，两处构建全绿。**
