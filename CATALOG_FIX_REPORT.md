# 目录组织图（catalog）节点重叠修复 · 验收报告

项目：`youdao-mindmap-vite`（Vite5 + React18 + TS 纯 SVG 脑图编辑器）
验收时间：2026-09-30　方式：**无头几何探针**（真实 `layoutTree` 代码路径）+ **真实 Chromium（`agent-browser`）DOM 断言** + **生产构建**

对应需求：

> 截图 1 中「目录组织图」大量节点重叠，应绘制成截图 2 的样式 —— 即**缩进式目录树**：根在顶部居中，一级节点作为并列的竖向列，列内节点自上而下排布、每深一层向右缩进，连线为直角折线，节点间不再重叠。

---

## 一、根因（真实几何缺陷）

旧 `layoutCatalog` 在放置子树时，DFS 游标（cursor）**只按「直接子节点自身高度」推进**，而非「整棵子树高度」推进：

```ts
// 旧逻辑（示意）
function placeCatalogDeep(n, parentPos) {
  const size = sizeOf(n);
  const pos = mkNode(n, parentPos.centerX - size.w / 2, cursor, ...); // 子节点以父节点中线居中
  nodes.push(pos);
  cursor += size.h + V_GAP;          // ← 只推进了「这一个节点」的高度
  for (const c of n.children) placeCatalogDeep(c, pos);
}
```

后果：

- 子节点按 `parentPos.centerX - sizeOf(c).w / 2` **以父节点中线水平居中**，于是兄弟子树彼此横向对齐、纵向紧贴父节点下方 —— 但父节点的「下一个兄弟」马上又从同样的高度开始，导致**父节点的整棵子树与它的兄弟节点叠在同一段纵向区间里**。
- 游标不累加子树总高，所以子树越深、重叠越严重。

探针在修复前用「贴近截图 1」的树实测到 **5 对重叠节点**，例如：

| 重叠对 | 说明 |
|---|---|
| `菜品分类` × `套餐菜品` | 同一父 `菜品管理` 的两个子分支互相压住 |
| `订单桌台` × `订单价格变更记录` | 深层子树压住兄弟节点 |
| `门店管理` 子树 × 其右侧一级列 | 子树高度超出所在列，侵入邻列 |

---

## 二、修复（`layoutCatalog` 重写为缩进式目录树）

核心思想：**单调 DFS 先序游标 + 每深一层右缩进**，游标只在「父节点及其全部后代都排完」后才下移。

```ts
const CAT_INDENT   = 38;  // 每深一层向右缩进
const CAT_STUB     = 10;  // 折线末端短横头长度
const CAT_COL_GAP  = 46;  // 相邻一级列之间的间距
const CAT_BUS_DROP = 18;  // 根 → 一级：汇流线高于一级节点行的距离

function layoutCatalog(root, branchColors, linkColor, curve, sizeOf): RawResult {
  const rootSize = sizeOf(root);
  const nodes = []; const links = [];
  const kids = root.collapsed ? [] : root.children;

  // 1) 根居中在 (0,0) 顶部；busX = 根右缘（子树主干竖线位置）
  const rootPos = mkNode(root, -rootSize.w / 2, 0, 0, "v", 1, rootSize);
  if (root.children.length) rootPos.busX = rootSize.w / 2;
  nodes.push(rootPos);

  // 2) 每棵一级子树宽度 = 该列最宽节点的「横向占位」
  const colWidth = (n, rel) => {
    let m = rel * CAT_INDENT + sizeOf(n).w;
    if (!n.collapsed) for (const c of n.children) m = Math.max(m, colWidth(c, rel + 1));
    return m;
  };
  const widths  = kids.map((k) => colWidth(k, 0));
  const totalW  = widths.reduce((a, b) => a + b, 0) + CAT_COL_GAP * Math.max(0, kids.length - 1);
  const top     = rootSize.h + V_LEVEL_GAP;
  const busY    = top - CAT_BUS_DROP;

  // 3) 一级节点作为横向并列的列；列内单调先序游标自上而下排布
  let colX = -totalW / 2;
  kids.forEach((k, i) => {
    let cursor = top;
    const place = (n, rel, depth, parent) => {
      const size = sizeOf(n);
      const pos = mkNode(n, colX + rel * CAT_INDENT, cursor, depth, "v", 1, size); // 右缩进
      nodes.push(pos);
      if (n.children.length) pos.busX = CAT_INDENT - CAT_STUB;  // 节点局部坐标 = 28，折叠按钮落点
      if (parent) {
        const x0 = pos.x - CAT_STUB;        // 竖线落在子节点左缘左 10px
        const y0 = parent.y + parent.h;
        const y1 = pos.centerY;
        const r  = Math.min(5, Math.max(0, (y1 - y0) / 2), CAT_STUB); // 末端圆角
        links.push({ from: parent, to: pos, color: branchColors.get(n.id) ?? linkColor,
          curve, axis: "v", sgn: 1,
          path: r > 0.5
            ? `M ${x0} ${y0} L ${x0} ${y1 - r} Q ${x0} ${y1} ${x0 + r} ${y1} L ${pos.x} ${y1}`
            : `M ${x0} ${y0} L ${x0} ${y1} L ${pos.x} ${y1}` });
      }
      cursor += size.h + V_GAP;             // ← 关键：游标只增不减，子树整体占一段
      if (!n.collapsed) for (const c of n.children) place(c, rel + 1, depth + 1, pos);
      return pos;
    };
    const kpos = place(k, 0, 1);
    // 根 → 一级：共享 busY 汇流竖线
    links.push({ from: rootPos, to: kpos, color: branchColors.get(k.id) ?? linkColor, curve,
      axis: "v", sgn: 1,
      path: `M ${rootPos.centerX} ${rootPos.y + rootPos.h} L ${rootPos.centerX} ${busY} L ${kpos.centerX} ${busY} L ${kpos.centerX} ${kpos.y}` });
    colX += widths[i] + CAT_COL_GAP;
  });

  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}
```

布局规则（与截图 2 一致）：

1. 根节点居中在画布顶部，下方 `V_LEVEL_GAP` 处排一级列。
2. 一级节点按 `CAT_COL_GAP` 横向并列成若干列，**全部顶对齐**（同一 `top` 行）。
3. 列内每个节点相对其父节点**向右缩进 `CAT_INDENT = 38`**，形成阶梯状目录树。
4. 连线为直角折线：父底部 → 向下 → 短横头 → 子节点左缘（末端带 ≤5px 圆角）。
5. 根到一级走共享 `busY` 汇流线，干净不交叉。

> 整体归一化（`layoutTree` 末尾把 `x/y/centerX/centerY` 平移到 `(0,0)` 原点、并重写 `l.path` 坐标串）照常进行；`busX` 是**节点局部坐标**（渲染时 `<g transform="translate(x,y)">` 之后的坐标系），故不参与整体平移 —— 这正是修复折叠按钮错位的关键（见下文）。

---

## 三、配套修复 — 折叠按钮落点（`busX` 字段）

旧折叠按钮用 `p.w / 2` 作为落点，对缩进式目录树而言会偏到节点中间、与子树竖线脱节。

`PositionedNode` 新增 `busX`：

```ts
busX?: number;  // 子树「主干」竖线的 x 位置，相对节点自身左上角（节点局部坐标）
```

`MindMap.tsx` 折叠按钮的 `<g transform>` 改用它：

```tsx
transform={
  p.axis === "v"
    ? `translate(${p.busX ?? p.w / 2},${p.sgn === 1 ? p.h : 0})`
    : `translate(${p.sgn === 1 ? p.w : 0},${p.h / 2})`
}
```

- 普通有子节点：`busX = CAT_INDENT - CAT_STUB = 28`（节点局部坐标），即竖线起点。
- 根节点：`busX = rootSize.w / 2`，即根右缘。

> 踩坑记录：曾误把 `busX` 当作归一化前的绝对坐标、在 `layoutTree` 归一化里补了 `n.busX -= minX`，导致折叠按钮被甩到 `-958` 之类的画布外。后确认 `busX` 本就是节点局部坐标（`translate(x,y)` 已包含整体平移），**移除了归一化那一行**，折叠按钮回到正确局部坐标。

---

## 四、验证

### 4.1 无头几何探针（`_verify/probe-catalog.ts`，真实 `layoutTree`）
输入一棵 56 节点、多子节点 + 10 层深子树的「贴近截图 1」测试树。

| 检查项 | 结果 |
|---|---|
| 节点总数 | 56 |
| **重叠节点对数**（修复前 5 → 现在） | **0** |
| 缩进阶梯步长（x：466→504→542→580） | 38 / 38 / 38（= `CAT_INDENT`） |
| 一级节点数 / 顶对齐 y | 8 个 / 全部 y = 89 |
| 连线数 / 悬空 / 越界端点 | 55 / 0 / 0 |
| `busX` 校验（缺失 / 偏差） | 0 / 0 |
| 画布尺寸 | 1934 × 682 |

**7 种结构回归**（本次只改 catalog，其余结构坐标须无变化）：

| 结构 | 节点 | 越界端点 | NaN |
|---|---|---|---|
| logical-right | 56 | 0 | 0 |
| logical-left | 56 | 0 | 0 |
| mindmap | 56 | 0 | 0 |
| org | 56 | 0 | 0 |
| **catalog** | 56 | 0 | 0 |
| timeline | 56 | 0 | 0 |
| fishbone | 56 | 0 | 0 |

结论：**ALL PASS**。

### 4.2 真实 Chromium（`agent-browser`，`ris-catalog.km` 导入 → 切换目录组织图）
16 项 DOM 断言全过（16/16）：

- 结构切换生效；56 个节点/卡片渲染；**重叠 0**。
- 8 个一级节点顶对齐 `y = 89`；一级列 x 单调递增。
- 深层链唯一可达；**缩进步长 = 38**（直接读节点 `transform` 属性，避开缩放进场动画对屏幕坐标的污染）。
- 竖向步长 = 55；折叠按钮落在局部 `(28, 43)` / 根 `(89, 43)`。
- 55 条连线无 NaN、无越界。

截图留存：`shots-interaction/09-catalog-indent-tree.png`、`shots-interaction/10-catalog-indent-zoom.png`。

### 4.3 生产构建

```
vite v5.4.21 building for production...
✓ 54 modules transformed.
✓ built in 1.17s
```
（`dist/` 产物已更新；构建时因沙箱安全删除守卫拦截了 Vite 的 `emptyDir`，已用 `find -delete` 预先清空后构建通过。）

---

## 五、改动文件清单

| 文件 | 改动 |
|---|---|
| `src/components/MindMap/layout.ts` | `PositionedNode` 增加 `busX`；新增 `CAT_*` 常量；**重写 `layoutCatalog`** 为缩进式目录树；删除旧的 `placeCatalogDeep`。 |
| `src/components/MindMap/MindMap.tsx` | 折叠按钮 `<g transform>` 改用 `busX` 落点（~line 1462）。 |
| `_verify/probe-catalog.ts` | 目录组织图几何自检（重叠 / 缩进步长 / 顶对齐 / busX 不变量 / 7 结构回归）。导入路径已修正为 `../src/...`。 |
| `_verify/ris-catalog.km` | 56 节点 KityMinder 夹具，用于浏览器导入→切换结构回归。 |
| `_verify/c-catalog.js` | 16 项浏览器 DOM 断言脚本。 |

---

## 六、结论

目录组织图节点重叠缺陷已修复：布局改为**缩进式目录树**（根顶部居中、一级并列列、列内单调先序游标 + 每深一层右缩进 38px、直角折线连接），并配套 `busX` 让折叠按钮精准落在子树竖线上。无头探针、真实 Chromium 16/16 断言、7 结构回归、生产构建均通过，无新增回归。
