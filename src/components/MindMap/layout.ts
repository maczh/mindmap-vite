import type { LineStyle, MindNode, StructureType } from "./types";
import { wrapText } from "./text";

export interface SizedNode {
  w: number;
  h: number;
  lines: string[];
  lineHeight: number;
  fontSize: number;
}

export interface PositionedNode {
  node: MindNode;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  /** 子节点延伸的主轴：h 水平 / v 垂直 */
  axis: "h" | "v";
  /** 延伸方向：h → 1 右 / -1 左；v → 1 下 / -1 上 */
  sgn: 1 | -1;
  centerX: number;
  centerY: number;
  /** 节点渲染旋转角度（度），鱼骨图节点沿骨头方向倾斜 */
  rot: number;
  /**
   * 子树「主干」竖线的 x 位置，**相对节点自身左上角**（节点局部坐标，与渲染时
   * `translate(${x},${y})` 之后的坐标系一致，故不受整体归一化平移影响）。
   * 折叠按钮以此为落点，使竖线看起来从折叠按钮向下伸出。
   */
  busX?: number;
}

export interface MindLink {
  from: PositionedNode;
  to: PositionedNode;
  color: string;
  curve: boolean;
  axis: "h" | "v" | "diag";
  sgn: 1 | -1;
  /** 预计算路径（时间轴 / 鱼骨图等复杂连线） */
  path?: string;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  links: MindLink[];
  width: number;
  height: number;
  byId: Map<string, PositionedNode>;
  rootPos: PositionedNode;
}

export interface LayoutOptions {
  structure: StructureType;
  branchColors: Map<string, string>;
  linkColor: string;
  lineStyle: LineStyle;
}

const H_GAP = 58; // 水平层间距
const V_GAP = 12; // 同一侧节点垂直间距
const V_LEVEL_GAP = 46; // 上下结构的层间距
const V_SIB_GAP = 22; // 上下结构同级节点水平间距
const PAD_X = 16;
const PAD_Y = 11;
const MAX_TEXT_W = 220;
const MIN_W = 72;
/** 单个标记图标的占位宽度 */
const MARKER_W = 19;
/** 优先级 / 进度 / 图标 前缀的占位宽度 */
const BADGE_W = 17;
const PREFIX_GAP = 3;
/** 备注 / 链接小图标的占位宽度 */
const RIGHT_BADGE_W = 15;

/** 文字左侧前缀（标记 + 优先级 + 进度 + 图标）总宽度 */
export function prefixWidth(node: MindNode): number {
  let w = (node.markers?.length ?? 0) * MARKER_W;
  if (node.priority) w += BADGE_W + PREFIX_GAP;
  if (node.progress != null) w += BADGE_W + PREFIX_GAP;
  w += (node.icons?.length ?? 0) * (BADGE_W + PREFIX_GAP);
  return w;
}

/** 右上角角标（备注 / 链接）占位宽度 */
export function rightBadgeWidth(node: MindNode): number {
  return (node.note ? RIGHT_BADGE_W : 0) + (node.link ? RIGHT_BADGE_W : 0);
}

/** 计算单个节点的渲染尺寸（含自动换行、前缀与角标占位）。 */
export function nodeSize(node: MindNode): SizedNode {
  const fontSize = node.style?.fontSize ?? 14;
  const bold = !!node.style?.bold;
  const m = wrapText(node.title || " ", fontSize, MAX_TEXT_W, bold);
  const pref = prefixWidth(node);
  const right = rightBadgeWidth(node);
  const extra = PAD_X * 2 + pref + right;
  const w = Math.min(Math.max(m.width + extra, MIN_W + pref + right), MAX_TEXT_W + extra);
  const h = Math.max(m.height + PAD_Y * 2, fontSize * 1.5 + PAD_Y * 2, 34);
  return { w, h, lines: m.lines, lineHeight: m.lineHeight, fontSize };
}

/** 节点内文本区域水平居中位置（左侧给前缀留位，右侧给角标留位） */
export function textCenterX(node: MindNode, w: number): number {
  const pref = prefixWidth(node);
  return pref + (w - pref - rightBadgeWidth(node)) / 2;
}

type Sizer = (n: MindNode) => SizedNode;

function makeSizer(): Sizer {
  const cache = new Map<string, SizedNode>();
  return (n: MindNode): SizedNode => {
    let s = cache.get(n.id);
    if (!s) {
      s = nodeSize(n);
      cache.set(n.id, s);
    }
    return s;
  };
}

interface RawResult {
  nodes: PositionedNode[];
  links: MindLink[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  root: PositionedNode;
}

const mkNode = (
  node: MindNode,
  x: number,
  y: number,
  depth: number,
  axis: "h" | "v",
  sgn: 1 | -1,
  size: SizedNode,
  rot = 0
): PositionedNode => ({
  node,
  x,
  y,
  w: size.w,
  h: size.h,
  depth,
  axis,
  sgn,
  centerX: x + size.w / 2,
  centerY: y + size.h / 2,
  rot,
});

function bounds(nodes: PositionedNode[]) {
  return {
    minX: Math.min(...nodes.map((n) => n.x)),
    minY: Math.min(...nodes.map((n) => n.y)),
    maxX: Math.max(...nodes.map((n) => n.x + n.w)),
    maxY: Math.max(...nodes.map((n) => n.y + n.h)),
  };
}

/* ------------------------------------------------------------------ */
/* 水平单侧布局（逻辑结构图 / 思维导图单侧）                            */
/* ------------------------------------------------------------------ */

function layoutSide(
  root: MindNode,
  side: 1 | -1,
  branchColors: Map<string, string>,
  linkColor: string,
  curve: boolean,
  sizeOf: Sizer,
  baseDepth = 0
): RawResult {
  const getW = (n: MindNode) => sizeOf(n).w;
  const getH = (n: MindNode) => sizeOf(n).h;

  const yTop = new Map<string, number>();
  let cursor = 0;
  const computeY = (n: MindNode): void => {
    const kids = n.collapsed ? [] : n.children;
    if (!kids.length) {
      const y = cursor;
      cursor += getH(n) + V_GAP;
      yTop.set(n.id, y);
      return;
    }
    const ys = kids.map((c) => {
      computeY(c);
      return yTop.get(c.id)!;
    });
    const firstC = ys[0] + getH(kids[0]) / 2;
    const lastC = ys[ys.length - 1] + getH(kids[kids.length - 1]) / 2;
    yTop.set(n.id, (firstC + lastC) / 2 - getH(n) / 2);
  };
  computeY(root);

  const nodes: PositionedNode[] = [];
  const links: MindLink[] = [];

  // 每个一级分支独立计算「列宽」：某分支深层出现一个超宽节点时，只向外撑宽
  // 该分支自己的列，而不会把其它分支的整列都推远。旧实现用全局 depth 列宽
  // （所有分支在同深度共享 pitch[d]），一个宽节点会让所有分支同深度列一起膨胀，
  // 画布被拉得极宽 → fit() 缩放到极小 → 视觉上像「零散的长链」而非紧凑的思维导图。
  interface Branch { node: MindNode; widths: number[]; }
  const kids = root.collapsed ? [] : root.children;
  const branches: Branch[] = kids.map((b) => {
    const widths: number[] = [];
    const walk = (n: MindNode, rd: number) => {
      widths[rd] = Math.max(widths[rd] ?? 0, getW(n));
      if (!n.collapsed) n.children.forEach((c) => walk(c, rd + 1));
    };
    walk(b, 0);
    return { node: b, widths };
  });

  const rootW = getW(root);
  const rootX = side === 1 ? 0 : -rootW;
  const rootPos = mkNode(root, rootX, yTop.get(root.id)!, baseDepth, "h", side, sizeOf(root));
  nodes.push(rootPos);
  // 右向：根右缘作为一级列起点；左向：根左缘
  const rootEdge = side === 1 ? rootX + rootW : rootX;

  for (const br of branches) {
    const place = (n: MindNode, rd: number, parent?: PositionedNode): void => {
      const w = getW(n);
      let x: number;
      if (side === 1) {
        // 右向：子节点在父节点右侧，按「父所在相对深度的最大宽度」推进，列宽仅限本分支。
        // 同级兄弟共享同一左缘（列对齐），但只取本分支内该深度的最大宽，不会因其它分支的
        // 宽节点而被推远。
        x = rd === 0 ? rootEdge + H_GAP : (parent as PositionedNode).x + br.widths[rd - 1] + H_GAP;
      } else {
        // 左向：按「右缘」对齐每一列 —— 子节点右缘 = 父右缘 - (父相对深度最大宽) - H_GAP。
        // 必须用父相对深度的最大宽而非子自身宽来定位，否则当某个子节点比父还宽时，
        // 其子树的右缘会越过父节点的左缘，与父节点（连同折叠按钮）水平重叠。
        if (rd === 0) x = rootEdge - H_GAP - w;
        else x = (parent as PositionedNode).x + (parent as PositionedNode).w - br.widths[rd - 1] - H_GAP - w;
      }
      const pos = mkNode(n, x, yTop.get(n.id)!, baseDepth + 1 + rd, "h", side, sizeOf(n));
      nodes.push(pos);
      if (parent) {
        links.push({
          from: parent,
          to: pos,
          color: branchColors.get(n.id) ?? linkColor,
          curve,
          axis: "h",
          sgn: side,
        });
      }
      if (!n.collapsed) n.children.forEach((c) => place(c, rd + 1, pos));
    };
    place(br.node, 0, rootPos);
  }

  const b = bounds(nodes);
  return { nodes, links, ...b, root: nodes[0] };
}

/* ------------------------------------------------------------------ */
/* 平衡布局（思维导图）                                                 */
/* ------------------------------------------------------------------ */

function splitBalanced(root: MindNode): { left: MindNode[]; right: MindNode[] } {
  const weight = (n: MindNode): number =>
    n.collapsed ? 1 : n.children.length ? n.children.reduce((a, c) => a + weight(c), 0) : 1;
  const left: MindNode[] = [];
  const right: MindNode[] = [];
  let L = 0;
  let R = 0;
  for (const c of root.children) {
    if (R <= L) {
      right.push(c);
      R += weight(c);
    } else {
      left.push(c);
      L += weight(c);
    }
  }
  return { left, right };
}

function layoutBalanced(
  root: MindNode,
  branchColors: Map<string, string>,
  linkColor: string,
  curve: boolean,
  sizeOf: Sizer
): RawResult {
  const { left, right } = splitBalanced(root);
  const rightTree: MindNode = { ...root, children: right };
  const leftTree: MindNode = { ...root, children: left };
  const rR = layoutSide(rightTree, 1, branchColors, linkColor, curve, sizeOf);
  const rL = layoutSide(leftTree, -1, branchColors, linkColor, curve, sizeOf);
  // layoutSide 对两侧「根副本」的落点不同：右侧根占据 [0, rootW]，左侧根占据
  // [-rootW, 0]。这里保留了右侧根作为真正的根节点，因此必须把左侧整体在 x 上
  // 对齐（对齐量正好是一个根节点宽度 rootW）—— 否则左侧一级节点与根之间的间距
  // 会比右侧多出整整一个 rootW，左右不对称。
  const dy = rR.root.y - rL.root.y;
  const dx = rR.root.x - rL.root.x;
  for (const n of rL.nodes) {
    n.y += dy;
    n.centerY += dy;
    n.x += dx;
    n.centerX += dx;
  }
  // 左右两次布局各自生成了一个「根节点副本」，这里只保留右侧那份，
  // 左侧副本随即被丢弃 —— 因此左侧分支的连线必须改指到真正的根节点上，
  // 否则会引用一个既不参与归一化、也不参与渲染的坐标（连线会被画到画布外）。
  // 根节点的收起按钮朝向右侧
  const rootPos = rR.root;
  const leftChildren = rL.nodes.filter((n) => n.node.id !== root.id);
  const nodes = [...rR.nodes, ...leftChildren];
  const links: MindLink[] = [
    ...rR.links,
    ...rL.links.map((l) => (l.from === rL.root ? { ...l, from: rootPos } : l)),
  ];
  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}

/* ------------------------------------------------------------------ */
/* 上下布局（组织结构图 / 目录组织图）                                  */
/* ------------------------------------------------------------------ */

function layoutVertical(
  root: MindNode,
  branchColors: Map<string, string>,
  linkColor: string,
  curve: boolean,
  align: "center" | "left",
  sizeOf: Sizer
): RawResult {
  const swCache = new Map<string, number>();
  const sw = (n: MindNode): number => {
    const cached = swCache.get(n.id);
    if (cached != null) return cached;
    const size = sizeOf(n);
    const kids = n.collapsed ? [] : n.children;
    let v: number;
    if (!kids.length) v = size.w;
    else {
      const kidsW = kids.reduce((a, k) => a + sw(k), 0) + V_SIB_GAP * (kids.length - 1);
      v = Math.max(size.w, kidsW);
    }
    swCache.set(n.id, v);
    return v;
  };

  const xOf = new Map<string, number>();
  const placeX = (n: MindNode, left: number) => {
    const size = sizeOf(n);
    const span = sw(n);
    const kids = n.collapsed ? [] : n.children;
    if (!kids.length) {
      xOf.set(n.id, left + (align === "center" ? (span - size.w) / 2 : 0));
      return;
    }
    const kidsW = kids.reduce((a, k) => a + sw(k), 0) + V_SIB_GAP * (kids.length - 1);
    let cx = left + (align === "center" ? (span - kidsW) / 2 : 0);
    kids.forEach((k) => {
      placeX(k, cx);
      cx += sw(k) + V_SIB_GAP;
    });
    xOf.set(n.id, align === "center" ? left + (span - size.w) / 2 : left);
  };
  placeX(root, 0);

  const levelH: number[] = [];
  const walkD = (n: MindNode, d: number) => {
    levelH[d] = Math.max(levelH[d] ?? 0, sizeOf(n).h);
    if (!n.collapsed) n.children.forEach((c) => walkD(c, d + 1));
  };
  walkD(root, 0);
  const levelY: number[] = [];
  let acc = 0;
  for (let d = 0; d < levelH.length; d++) {
    levelY[d] = acc;
    acc += levelH[d] + V_LEVEL_GAP;
  }

  const nodes: PositionedNode[] = [];
  const links: MindLink[] = [];
  const place = (n: MindNode, depth: number, parent?: PositionedNode) => {
    const size = sizeOf(n);
    const y = levelY[depth] + (levelH[depth] - size.h) / 2;
    const pos = mkNode(n, xOf.get(n.id)!, y, depth, "v", 1, size);
    nodes.push(pos);
    if (parent) {
      links.push({
        from: parent,
        to: pos,
        color: branchColors.get(n.id) ?? linkColor,
        curve,
        axis: "v",
        sgn: 1,
      });
    }
    if (!n.collapsed) n.children.forEach((c) => place(c, depth + 1, pos));
  };
  place(root, 0);

  const b = bounds(nodes);
  return { nodes, links, ...b, root: nodes[0] };
}

/* ------------------------------------------------------------------ */
/* 目录组织图（缩进式目录树）                                          */
/*   根节点居中于顶部；一级节点横向并列成「列」；列内按 DFS 前序自上而下   */
/*   依次落位，每深一层向右缩进一级；连线为肘形折线                    */
/*   （父底部 → 竖向下行 → 短横头 → 子节点左缘）。                      */
/*                                                                   */
/*   关键：列内使用一个自上而下「单调推进」的游标，父节点先于其全部子孙   */
/*   落位、游标只增不减，因此从结构上不可能出现节点重叠 —— 旧实现只按      */
/*   直接子节点自身高度推进游标，兄弟节点会落进前一个兄弟的子树区域造成    */
/*   大面积重叠。                                                      */
/* ------------------------------------------------------------------ */

const CAT_INDENT = 38; // 每深一层向右缩进
const CAT_STUB = 10; // 折线末端短横头长度
const CAT_COL_GAP = 46; // 相邻一级列之间的间距
const CAT_BUS_DROP = 18; // 根 → 一级：汇流线高于一级节点行的距离

function layoutCatalog(
  root: MindNode,
  branchColors: Map<string, string>,
  linkColor: string,
  curve: boolean,
  sizeOf: Sizer
): RawResult {
  const rootSize = sizeOf(root);
  const nodes: PositionedNode[] = [];
  const links: MindLink[] = [];
  const kids = root.collapsed ? [] : root.children;

  // 根节点居中于顶部
  const rootPos = mkNode(root, -rootSize.w / 2, 0, 0, "v", 1, rootSize);
  // 根的子树竖线从底边中点垂下（与其汇流连线起点一致），而非左侧缩进位
  if (root.children.length) rootPos.busX = rootSize.w / 2;
  nodes.push(rootPos);

  // 子树相对本列左缘的最大横向占宽（含逐层缩进），决定列宽
  const colWidth = (n: MindNode, rel: number): number => {
    let m = rel * CAT_INDENT + sizeOf(n).w;
    if (!n.collapsed) for (const c of n.children) m = Math.max(m, colWidth(c, rel + 1));
    return m;
  };

  const widths = kids.map((k) => colWidth(k, 0));
  const totalW = widths.reduce((a, b) => a + b, 0) + CAT_COL_GAP * Math.max(0, kids.length - 1);
  const top = rootSize.h + V_LEVEL_GAP; // 一级节点所在行
  const busY = top - CAT_BUS_DROP; // 根到一级的汇流线高度

  let colX = -totalW / 2;
  kids.forEach((k, i) => {
    // 列内游标：DFS 前序自上而下单调推进，保证同列节点纵向互不重叠
    let cursor = top;

    const place = (n: MindNode, rel: number, depth: number, parent?: PositionedNode): PositionedNode => {
      const size = sizeOf(n);
      const pos = mkNode(n, colX + rel * CAT_INDENT, cursor, depth, "v", 1, size);
      nodes.push(pos);

      // 有子节点时，子树竖线落在「下一层缩进位置」再左移一个短横头（相对本节点左缘）
      if (n.children.length) pos.busX = CAT_INDENT - CAT_STUB;

      if (parent) {
        const x0 = pos.x - CAT_STUB;
        const y0 = parent.y + parent.h;
        const y1 = pos.centerY;
        // 拐角做小圆角，避免生硬的直角
        const r = Math.min(5, Math.max(0, (y1 - y0) / 2), CAT_STUB);
        links.push({
          from: parent,
          to: pos,
          color: branchColors.get(n.id) ?? linkColor,
          curve,
          axis: "v",
          sgn: 1,
          path:
            r > 0.5
              ? `M ${x0} ${y0} L ${x0} ${y1 - r} Q ${x0} ${y1} ${x0 + r} ${y1} L ${pos.x} ${y1}`
              : `M ${x0} ${y0} L ${x0} ${y1} L ${pos.x} ${y1}`,
        });
      }

      cursor += size.h + V_GAP;
      if (!n.collapsed) for (const c of n.children) place(c, rel + 1, depth + 1, pos);
      return pos;
    };

    const kpos = place(k, 0, 1);

    // 根 → 一级：竖直下行至汇流线，横穿至本列，再下落到一级节点顶部
    links.push({
      from: rootPos,
      to: kpos,
      color: branchColors.get(k.id) ?? linkColor,
      curve,
      axis: "v",
      sgn: 1,
      path: `M ${rootPos.centerX} ${rootPos.y + rootPos.h} L ${rootPos.centerX} ${busY} L ${kpos.centerX} ${busY} L ${kpos.centerX} ${kpos.y}`,
    });

    colX += widths[i] + CAT_COL_GAP;
  });

  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}

/* ------------------------------------------------------------------ */
/* 时间轴                                                              */
/* ------------------------------------------------------------------ */

function layoutTimeline(
  root: MindNode,
  branchColors: Map<string, string>,
  linkColor: string,
  curve: boolean,
  sizeOf: Sizer
): RawResult {
  const rootSize = sizeOf(root);
  const kids = root.collapsed ? [] : root.children;
  const nodes: PositionedNode[] = [];
  const links: MindLink[] = [];

  const TIMELINE_INDENT = 34; // 深层节点相对父节点向右缩进

  // 子树竖直跨度（含全部子孙），用于单调游标推进 —— 旧实现只按直接子节点自身高度
  // 推进游标，导致兄弟节点落进前一个兄弟的子树区域，大面积重叠（与旧目录图同问题）。
  const subH = (n: MindNode): number => {
    const h = sizeOf(n).h;
    const cs = n.collapsed ? [] : n.children;
    if (!cs.length) return h;
    let t = h + V_LEVEL_GAP;
    cs.forEach((c, i) => {
      t += subH(c);
      if (i < cs.length - 1) t += V_LEVEL_GAP;
    });
    return t;
  };

  // 子树水平跨度（含逐层缩进），用于决定一级列宽，避免深层纵向树越过相邻列
  const subW = (n: MindNode, rel: number): number => {
    let m = rel * TIMELINE_INDENT + sizeOf(n).w;
    if (!n.collapsed) for (const c of n.children) m = Math.max(m, subW(c, rel + 1));
    return m;
  };

  // 根节点置于最左侧，垂直居中于时间轴（centerY = 0）
  const rootPos = mkNode(root, 0, -rootSize.h / 2, 0, "h", 1, rootSize);
  nodes.push(rootPos);
  const rRight = rootPos.x + rootPos.w;

  const AXIS_Y = 0; // 时间轴水平线（世界坐标）

  // 一级节点沿时间轴横向铺开，全部位于同一水平线（centerY = 0）
  let x = rRight + H_GAP;
  kids.forEach((k) => {
    const kx = x;
    const ky = AXIS_Y - sizeOf(k).h / 2; // centerY = 0，与根同一水平线
    const kpos = mkNode(k, kx, ky, 1, "v", 1, sizeOf(k)); // 其子节点向下延伸(vertical)
    nodes.push(kpos);
    // 根 → 一级：沿时间轴水平走线
    links.push({
      from: rootPos,
      to: kpos,
      color: branchColors.get(k.id) ?? linkColor,
      curve,
      axis: "h",
      sgn: 1,
      path: `M ${rRight} ${AXIS_Y} L ${kpos.x} ${AXIS_Y}`,
    });
    // 一级节点之下：以 kpos 为根、向右逐层缩进的「竖直树」；游标单调推进、按整棵子树
    // 高度推进，保证深层子树不压住兄弟节点，也不越过本列边界。
    const placeDeep = (n: MindNode, parentPos: PositionedNode, depth: number): void => {
      const cs = n.collapsed ? [] : n.children;
      let cy = parentPos.y + parentPos.h + V_LEVEL_GAP;
      for (const c of cs) {
        const csize = sizeOf(c);
        const cx = parentPos.x + TIMELINE_INDENT;
        const cpos = mkNode(c, cx, cy, depth, "v", 1, csize);
        nodes.push(cpos);
        const y0 = parentPos.y + parentPos.h;
        const ymid = (y0 + cpos.y) / 2;
        // 正交折线连接器：父底中心 → 竖直下行 → 横向到子中心 → 竖直到子顶
        links.push({
          from: parentPos,
          to: cpos,
          color: branchColors.get(c.id) ?? linkColor,
          curve,
          axis: "v",
          sgn: 1,
          path: `M ${parentPos.centerX} ${y0} L ${parentPos.centerX} ${ymid} L ${cpos.centerX} ${ymid} L ${cpos.centerX} ${cpos.y}`,
        });
        placeDeep(c, cpos, depth + 1);
        cy += subH(c) + V_LEVEL_GAP;
      }
    };
    placeDeep(k, kpos, 2);

    x += subW(k, 0) + V_SIB_GAP;
  });

  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}

/* ------------------------------------------------------------------ */
/* 鱼骨图                                                              */
/* ------------------------------------------------------------------ */

function layoutFishbone(
  root: MindNode,
  branchColors: Map<string, string>,
  linkColor: string,
  curve: boolean,
  sizeOf: Sizer
): RawResult {
  const rootSize = sizeOf(root);
  const kids = root.collapsed ? [] : root.children;
  const nodes: PositionedNode[] = [];
  const links: MindLink[] = [];
  const THETA = (32 * Math.PI) / 180;
  const COS = Math.cos(THETA);
  const SIN = Math.sin(THETA);

  // 预排版每根骨头的子树（右向水平布局，depth 从 1 起）
  const subs = kids.map((k) => layoutSide(k, 1, branchColors, linkColor, curve, sizeOf, 1));
  // 骨头间距：按最宽子树的横向投影 + 缓冲（避免固定步长对宽节点失效）
  let maxLat = 0;
  for (const sub of subs) {
    const lat = (sub.maxX - sub.minX) * COS;
    if (lat > maxLat) maxLat = lat;
  }
  const BONE_STEP = Math.ceil(maxLat) + 150;

  const anchorX0 = -(rootSize.w + 90);
  // 根节点（效应）置于脊柱右端，居中于脊柱
  const rootPos = mkNode(root, 0, -rootSize.h / 2, 0, "h", -1, rootSize);
  nodes.push(rootPos);
  const rootLeft = rootPos.x; // 0，脊柱起点（朝左延伸）

  // 骨头主线倾斜角（度），节点标签沿此方向倾斜
  const boneDeg = (Math.atan2(SIN, -COS) * 180) / Math.PI; // ≈ -32
  const rotFor = (dir: number) => {
    // dir=-1 向上(标签逆时针倾斜)，dir=1 向下(顺时针倾斜)，均映射到可读范围
    const raw = dir * boneDeg;
    if (raw > 90) return raw - 180;
    if (raw < -90) return raw + 180;
    return raw;
  };

  kids.forEach((k, i) => {
    const up = i % 2 === 0; // 偶数骨头向上、奇数向下 —— 脊柱两侧交替
    const dir = up ? -1 : 1; // SVG 坐标 y 向下为正，故「上」为负
    const ux = -COS; // 沿骨头主线方向（向左）
    const uy = dir * SIN; // 主线垂直分量（上 / 下）
    const vx = -uy; // 子树侧向（兄弟间距）方向
    const vy = ux; // = -COS
    const anchorX = anchorX0 - i * BONE_STEP;
    const sub = subs[i];
    const boneRot = rotFor(dir);
    // 拉伸子树垂直间距，减少旋转后同骨节点的水平重叠
    const y0 = sub.nodes.find((n) => n.node.id === k.id)!.y;
    for (const n of sub.nodes) {
      n.y = y0 + (n.y - y0) * 1.7;
      n.centerY = n.y + n.h / 2;
      n.rot = boneRot;
    }
    // 让子树根（主题节点）落在脊柱 anchorX 处，并沿骨头外移一段距离（确保骨头明显倾斜）
    const D = 82;
    const target = sub.nodes.find((n) => n.node.id === k.id)!;
    const lyRoot = target.y; // 子树根在子布局中的 top-left y（layoutSide 根 x=0）
    const ox = anchorX + D * ux - vx * lyRoot;
    const oy = D * uy - vy * lyRoot;
    for (const n of sub.nodes) {
      const lx = n.x;
      const ly = n.y;
      n.x = ox + ux * lx + vx * ly;
      n.y = oy + uy * lx + vy * ly;
      n.centerX = n.x + n.w / 2;
      n.centerY = n.y + n.h / 2;
    }
    for (const l of sub.links) {
      l.axis = "diag";
      l.path = undefined;
    }
    nodes.push(...sub.nodes);
    links.push(...sub.links);
    const tpos = sub.nodes.find((n) => n.node.id === k.id)!;
    // 脊柱连线：沿脊柱水平到 anchor，再沿骨头到主题节点
    links.push({
      from: rootPos,
      to: tpos,
      color: branchColors.get(k.id) ?? linkColor,
      curve,
      axis: "diag",
      sgn: 1,
      path: `M ${rootLeft} 0 L ${anchorX} 0 L ${tpos.centerX} ${tpos.centerY}`,
    });
  });

  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */

export function layoutTree(root: MindNode, opts: LayoutOptions): LayoutResult {
  const sizeOf = makeSizer();
  const { branchColors, linkColor, lineStyle, structure } = opts;
  const curve = lineStyle === "curve";

  let raw: RawResult;
  switch (structure) {
    case "logical-left":
      raw = layoutSide(root, -1, branchColors, linkColor, curve, sizeOf);
      break;
    case "mindmap":
      raw = layoutBalanced(root, branchColors, linkColor, curve, sizeOf);
      break;
    case "org":
      raw = layoutVertical(root, branchColors, linkColor, curve, "center", sizeOf);
      break;
    case "catalog":
      raw = layoutCatalog(root, branchColors, linkColor, curve, sizeOf);
      break;
    case "timeline":
      raw = layoutTimeline(root, branchColors, linkColor, curve, sizeOf);
      break;
    case "fishbone":
      raw = layoutFishbone(root, branchColors, linkColor, curve, sizeOf);
      break;
    case "logical-right":
    default:
      raw = layoutSide(root, 1, branchColors, linkColor, curve, sizeOf);
      break;
  }

  const nodes = raw.nodes;
  const links = raw.links;

  // 归一化：整体平移到 (0,0) 起点
  const minX = raw.minX;
  const minY = raw.minY;
  for (const n of nodes) {
    n.x -= minX;
    n.y -= minY;
    n.centerX -= minX;
    n.centerY -= minY;
  }
  // 注意：raw.root 已是 nodes 中的元素（各布局均把根节点放入 nodes），上面的循环已经平移过它，
  // 这里不能再平移一次，否则根节点会被重复偏移（minX<0 时尤其明显，会把思维导图/鱼骨图的根推出去压住分支）。
  for (const l of links) {
    if (l.path) {
      l.path = l.path.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_m, a: string, b: string) => {
        const x = parseFloat(a) - minX;
        const y = parseFloat(b) - minY;
        return `${+x.toFixed(2)} ${+y.toFixed(2)}`;
      });
    }
  }

  const width = Math.max(...nodes.map((n) => n.x + n.w));
  const height = Math.max(...nodes.map((n) => n.y + n.h));
  const byId = new Map(nodes.map((n) => [n.node.id, n]));

  return { nodes, links, width, height, byId, rootPos: raw.root };
}
