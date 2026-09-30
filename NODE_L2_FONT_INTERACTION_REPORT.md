# 二级及下级 / 叶子节点：11px 字号 + 与一级节点交互完全一致 — 改动报告

> 本轮两项需求（**均作用于所有结构**，不限 timeline）：
> 1. **字号**：二级节点及下级节点以及叶子节点的字号设为 `11px`；**新增**的二级及以下 / 叶子节点同样是 `11px`。
> 2. **交互一致性**：二级及以下 / 叶子节点的鼠标与键盘响应与一级节点**完全相同**——单击选择、双击编辑、Enter 新增同级、Tab 新增下级、右键弹出浮动圆盘菜单；编辑后按 Enter 完成编辑并新增同级，选定当前节点。

---

## 一、需求 1：字号体系（按深度，全局生效）

统一的字号来源是 `layout.ts` 的 `defaultFontSizeForDepth(depth)`：

```ts
export function defaultFontSizeForDepth(depth: number): number {
  if (depth <= 0) return 24; // 根节点
  if (depth === 1) return 18; // 一级节点
  return 11;                 // 二级及以下 / 叶子节点  ← 由 14 改为 11
}
```

渲染层与测量层都以此为兜底：`fontSize = node.style?.fontSize ?? defaultFontSizeForDepth(depth)`。

### 1.1 新增节点也要 11px（本轮修复的真实缺陷）

「新增节点」有两条路径，修复前都会给新节点**写死一个 `fontSize`**（值为 `DEFAULT_TEXT.fontSize = 14`），从而**覆盖**上面的按深度兜底 —— 导致新建的二级节点是 14px、甚至新建的一级节点也是 14px（而应为 18px）。

| 路径 | 触发方式 | 位置 | 修复 |
| --- | --- | --- | --- |
| 全局快捷键 / 圆盘菜单 | 非编辑态按 Tab / Enter、右键菜单「下级 / 同级 / 上级」 | `withDefaults()`（`MindMap.tsx` L481） | `fontSize` 由「固定默认值」改为 `defaultFontSizeForDepth(depthOf(tree, id))` |
| 编辑态收尾 | 编辑中按 Enter / Tab | `endEdit()`（`MindMap.tsx` L693） | 新子/同级节点的 `fontSize` 同样按深度计算 |

新增 `depthOf(root, id)`（`tree.ts` L119）用于计算新节点深度（根为 0，找不到为 -1）。

> 结果：新建子节点时，其字号由**所在层级**决定 —— 挂到根下 → 18px（一级），挂到一级下或其下 → 11px（二级及以下）。用户显式设置的基础字号（`config.base.fontSize`）仍优先。

---

## 二、需求 2：交互与一级节点完全一致

### 2.1 鼠标：整节点区域可点（关键修复）

处理器（`onClick` 选中 / `onDoubleClick` 编辑 / `onContextMenu` 圆盘菜单 / `onMouseDown` 拖拽）本就挂在**每个节点**的 `<g class="mm-node">` 上，对任意深度都生效。真正的缺口是**命中区域**：

- 一级节点有实心胶囊 `<rect>`，整块区域都是命中区；
- 二级及以下节点是「无框文字」，只有文字字形可点，**点空白处会落空**。

修复：为 `!showRect`（无框）节点补一块**透明命中矩形** `mm-hit`，尺寸等于节点盒，`pointer-events: all`：

```tsx
{!showRect && (
  <rect className="mm-hit" x={0} y={0} width={p.w} height={p.h}
        fill="transparent" pointerEvents="all" />
)}
```

（`MindMap.tsx` L1396 附近。）这样二级及以下的整节点区域都可单击 / 双击 / 右键 / 拖拽，与一级完全一致。

### 2.2 键盘：Enter / Tab 语义对齐

| 场景 | Enter | Tab | Shift+Tab |
| --- | --- | --- | --- |
| 非编辑态（已选中某节点） | 新增**同级**（并进入编辑） | 新增**下级**（并进入编辑） | 升级为上级 |
| **编辑态（本轮调整）** | **完成编辑 + 新增同级**（新节点随即进入编辑） | **完成编辑 + 新增下级**（新节点随即进入编辑） | 仅完成编辑 |

调整点：编辑框 `onKeyDown`（`MindMap.tsx` L1783）由「Enter → 仅提交」改为「Enter → `endEdit("sibling")`」，与右键圆盘菜单中标注的 `Enter=同级 / Tab=下级` 保持一致；`endEdit` 在创建出新节点后同时 `setEditing(新节点)`，实现连续录入。Shift+Enter 仍为换行（多行文本）。

---

## 三、改动文件

| 文件 | 改动 |
| --- | --- |
| `src/components/MindMap/layout.ts` | `defaultFontSizeForDepth`：二级及以下 / 叶子 `14 → 11`（L103-107） |
| `src/components/MindMap/tree.ts` | 新增 `depthOf(root, id)`（L119） |
| `src/components/MindMap/MindMap.tsx` | `withDefaults()` 按深度设字号（L481）；`endEdit()` 按深度设字号 + 新节点进入编辑（L693）；无框节点透明命中区 `mm-hit`（L1396）；编辑框 Enter → `endEdit("sibling")`（L1783） |

---

## 四、验证（真实浏览器实测，agent-browser + Chromium）

`npx tsc -b` ✅ 通过。以下为在 `_verify/tl-sample.html`（timeline 结构）中的实测值：

**字号（现有节点）**
```
root  = 24px   ✅
L1    = 18px   ✅
L2    = 11px   ✅
```

**新增节点字号（选中一级「待办」→ 按 Tab 新增子节点）**
```
节点数 20 -> 21（+1）✅
新节点(分支主题) 字号 = 11px   ✅   ← 需求 1 达成
```

**编辑态按回车 → 新增同级**
```
编辑框数量 = 1
回车后节点数 21 -> 22（+1）✅   ← 需求 2：回车完成编辑并新增同级
```

**二级节点交互一致性（在时间轴二级节点「包厢/散台模型」上实测）**
```
单击   -> 出现选中虚线框(.mm-ui-only) = true   ✅
双击   -> 编辑框 .mm-editor-input 数量 = 1     ✅
右键   -> 浮动圆盘菜单 .mm-radial 数量 = 1     ✅
选中后 Tab   -> 节点 20 -> 21（新增下级 L3），新节点字号 = 11px  ✅
选中后 Enter -> 节点 21 -> 22（新增同级 L2）                     ✅
```

> 结论：二级节点的鼠标（单击 / 双击 / 右键）与键盘（Enter 同级 / Tab 下级）行为与一级节点**完全一致**，且新增的二级/三级节点字号均为 11px。

---

## 五、交付物 / 预览图

`timeline-shots/` 下：

| 文件 | 内容 |
| --- | --- |
| `app-timeline.png` | 完整时间轴（示例树）：可见二级文字为 11px、连续脊柱 + 肘形连接 |
| `deep-tree.png` | 4 层深树：二级 / 三级 / 四级文字均为 11px，逐层缩进 |
| `interaction-l2.png` | **二级节点右键 → 浮动圆盘菜单**（并带选中虚线框），直接证明交互一致性 |
| `elbow-detail.png` | 时间轴局部：二级节点被单击选中（虚线框） |
| `compare-reference-vs-result.png` | 参考截图（上） vs 本次渲染（下）对照 |

## 六、可复用的验证脚本

保留在 `_verify/`（后续改字号 / 交互可一键复跑）：

- `_verify/tl-sample.{html,tsx}`：示例树 + `structure:"timeline"` 的独立渲染页。
- `_verify/tl-deep.{html,tsx}`：4 层深树渲染页。
- `_verify/capture.sh`：启 vite → **轮询 `.mm-node` 确认渲染完成**再截图（规避「curl 200 但页面尚未渲染」导致的空白图），并实测二级节点单击 / 右键。
- `_verify/verify-font.sh`：断言各层级字号、新增节点 11px、编辑态回车新增同级。
- `_verify/verify-interaction2.sh`：断言二级节点双击进入编辑、选中后 Tab 新增下级（L3）/ Enter 新增同级。

> 提示：本机 shell 无有效 `HOME`（解析到 `/root` 无权限），agent-browser 会因无法创建 socket 目录而失败——脚本已内置 `export HOME=/home/macro; export XDG_RUNTIME_DIR=/tmp`。
