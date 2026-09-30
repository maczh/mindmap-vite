"use strict";

// src/components/MindMap/text.ts
function charWidth(ch) {
  const code = ch.codePointAt(0) ?? 0;
  if (code === 32 || code === 9) return 0.3;
  if (code >= 4352 && code <= 4447 || code >= 11904 && code <= 42191 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65072 && code <= 65135 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510) {
    return 1;
  }
  if ("iljtfrI.,:;'|!()[]{}".includes(ch)) return 0.32;
  if ("mwMW@".includes(ch)) return 0.88;
  return 0.56;
}
function measureText(text, fontSize, bold = false) {
  let w = 0;
  for (const ch of text) w += charWidth(ch);
  return w * fontSize * (bold ? 1.06 : 1);
}
function wrapText(text, fontSize, maxWidth, bold = false) {
  const lineHeight = Math.round(fontSize * 1.45);
  const explicit = String(text ?? "").split("\n");
  const lines = [];
  for (const raw of explicit) {
    if (raw === "") {
      lines.push("");
      continue;
    }
    if (measureText(raw, fontSize, bold) <= maxWidth) {
      lines.push(raw);
      continue;
    }
    const words = raw.split(/(?<=\s)/);
    let cur = "";
    const pushCur = () => {
      if (cur !== "") lines.push(cur.replace(/\s+$/, ""));
      cur = "";
    };
    for (const word of words) {
      if (measureText(cur + word, fontSize, bold) <= maxWidth) {
        cur += word;
        continue;
      }
      pushCur();
      if (measureText(word, fontSize, bold) <= maxWidth) {
        cur = word;
        continue;
      }
      let chunk = "";
      for (const ch of word) {
        if (measureText(chunk + ch, fontSize, bold) <= maxWidth) {
          chunk += ch;
        } else {
          lines.push(chunk);
          chunk = ch;
        }
      }
      cur = chunk;
    }
    pushCur();
  }
  if (lines.length === 0) lines.push("");
  const width = Math.max(...lines.map((l) => measureText(l, fontSize, bold)), 0);
  return { lines, width, height: lines.length * lineHeight, lineHeight };
}

// src/components/MindMap/layout.ts
var H_GAP = 58;
var V_GAP = 12;
var V_LEVEL_GAP = 46;
var V_SIB_GAP = 22;
var PAD_X = 16;
var PAD_Y = 11;
var MIN_W = 72;
var TEXT_LEFT_INSET = 12;
var MARKER_W = 19;
var BADGE_W = 17;
var PREFIX_GAP = 3;
var RIGHT_BADGE_W = 15;
function prefixWidth(node) {
  let w = (node.markers?.length ?? 0) * MARKER_W;
  if (node.priority) w += BADGE_W + PREFIX_GAP;
  if (node.progress != null) w += BADGE_W + PREFIX_GAP;
  w += (node.icons?.length ?? 0) * (BADGE_W + PREFIX_GAP);
  return w;
}
function rightBadgeWidth(node) {
  return (node.note ? RIGHT_BADGE_W : 0) + (node.link ? RIGHT_BADGE_W : 0);
}
function defaultFontSizeForDepth(depth) {
  if (depth <= 0) return 24;
  if (depth === 1) return 18;
  return 14;
}
var DEFAULT_PAD = { padX: PAD_X, padY: PAD_Y, minW: MIN_W, minH: 34 };
function nodeSize(node, depth = 0, pad = DEFAULT_PAD) {
  const fontSize = node.style?.fontSize ?? defaultFontSizeForDepth(depth);
  const bold = !!node.style?.bold;
  const m = wrapText(node.title || " ", fontSize, Number.POSITIVE_INFINITY, bold);
  const pref = prefixWidth(node);
  const right = rightBadgeWidth(node);
  const extra = pad.padX * 2 + pref + right;
  const w = Math.max(m.width + extra, pad.minW + pref + right);
  const h = Math.max(m.height + pad.padY * 2, fontSize * 1.5 + pad.padY * 2, pad.minH);
  return { w, h, lines: m.lines, lineHeight: m.lineHeight, fontSize };
}
function textBlockWidth(node, size) {
  const bold = !!node.style?.bold;
  let w = 0;
  for (const l of size.lines) w = Math.max(w, measureText(l || " ", size.fontSize, bold));
  return w;
}
function textCenterX(node, w) {
  const pref = prefixWidth(node);
  return pref + (w - pref - rightBadgeWidth(node)) / 2;
}
function makeSizer(depthMap) {
  const cache = /* @__PURE__ */ new Map();
  return (n2) => {
    let s = cache.get(n2.id);
    if (!s) {
      s = nodeSize(n2, depthMap.get(n2.id) ?? 0);
      cache.set(n2.id, s);
    }
    return s;
  };
}
function makeTimelineSizer(depthMap) {
  const cache = /* @__PURE__ */ new Map();
  return (n2) => {
    let s = cache.get(n2.id);
    if (!s) {
      const d = depthMap.get(n2.id) ?? 0;
      s = d <= 1 ? nodeSize(n2, d, { padX: PAD_X, padY: 4, minW: MIN_W, minH: 32 }) : nodeSize(n2, d, { padX: 10, padY: 3, minW: 0, minH: 22 });
      cache.set(n2.id, s);
    }
    return s;
  };
}
var mkNode = (node, x, y, depth, axis2, sgn, size, rot = 0) => ({
  node,
  x,
  y,
  w: size.w,
  h: size.h,
  depth,
  axis: axis2,
  sgn,
  centerX: x + size.w / 2,
  centerY: y + size.h / 2,
  rot
});
function bounds(nodes) {
  return {
    minX: Math.min(...nodes.map((n2) => n2.x)),
    minY: Math.min(...nodes.map((n2) => n2.y)),
    maxX: Math.max(...nodes.map((n2) => n2.x + n2.w)),
    maxY: Math.max(...nodes.map((n2) => n2.y + n2.h))
  };
}
function layoutSide(root, side, branchColors, linkColor, curve, sizeOf, baseDepth = 0) {
  const getW = (n2) => sizeOf(n2).w;
  const getH = (n2) => sizeOf(n2).h;
  const yTop = /* @__PURE__ */ new Map();
  let cursor = 0;
  const computeY = (n2) => {
    const kids2 = n2.collapsed ? [] : n2.children;
    if (!kids2.length) {
      const y = cursor;
      cursor += getH(n2) + V_GAP;
      yTop.set(n2.id, y);
      return;
    }
    const ys = kids2.map((c) => {
      computeY(c);
      return yTop.get(c.id);
    });
    const firstC = ys[0] + getH(kids2[0]) / 2;
    const lastC = ys[ys.length - 1] + getH(kids2[kids2.length - 1]) / 2;
    yTop.set(n2.id, (firstC + lastC) / 2 - getH(n2) / 2);
  };
  computeY(root);
  const nodes = [];
  const links = [];
  const kids = root.collapsed ? [] : root.children;
  const branches = kids.map((b2) => {
    const widths = [];
    const walk2 = (n2, rd) => {
      widths[rd] = Math.max(widths[rd] ?? 0, getW(n2));
      if (!n2.collapsed) n2.children.forEach((c) => walk2(c, rd + 1));
    };
    walk2(b2, 0);
    return { node: b2, widths };
  });
  const rootW = getW(root);
  const rootX = side === 1 ? 0 : -rootW;
  const rootPos = mkNode(root, rootX, yTop.get(root.id), baseDepth, "h", side, sizeOf(root));
  nodes.push(rootPos);
  const rootEdge = side === 1 ? rootX + rootW : rootX;
  for (const br of branches) {
    const place = (n2, rd, parent) => {
      const w = getW(n2);
      let x;
      if (side === 1) {
        x = rd === 0 ? rootEdge + H_GAP : parent.x + br.widths[rd - 1] + H_GAP;
      } else {
        if (rd === 0) x = rootEdge - H_GAP - w;
        else x = parent.x + parent.w - br.widths[rd - 1] - H_GAP - w;
      }
      const pos = mkNode(n2, x, yTop.get(n2.id), baseDepth + 1 + rd, "h", side, sizeOf(n2));
      nodes.push(pos);
      if (parent) {
        links.push({
          from: parent,
          to: pos,
          color: branchColors.get(n2.id) ?? linkColor,
          curve,
          axis: "h",
          sgn: side
        });
      }
      if (!n2.collapsed) n2.children.forEach((c) => place(c, rd + 1, pos));
    };
    place(br.node, 0, rootPos);
  }
  const b = bounds(nodes);
  return { nodes, links, ...b, root: nodes[0] };
}
function splitBalanced(root) {
  const weight = (n2) => n2.collapsed ? 1 : n2.children.length ? n2.children.reduce((a, c) => a + weight(c), 0) : 1;
  const left = [];
  const right = [];
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
function layoutBalanced(root, branchColors, linkColor, curve, sizeOf) {
  const { left, right } = splitBalanced(root);
  const rightTree = { ...root, children: right };
  const leftTree = { ...root, children: left };
  const rR = layoutSide(rightTree, 1, branchColors, linkColor, curve, sizeOf);
  const rL = layoutSide(leftTree, -1, branchColors, linkColor, curve, sizeOf);
  const dy = rR.root.y - rL.root.y;
  const dx = rR.root.x - rL.root.x;
  for (const n2 of rL.nodes) {
    n2.y += dy;
    n2.centerY += dy;
    n2.x += dx;
    n2.centerX += dx;
  }
  const rootPos = rR.root;
  const leftChildren = rL.nodes.filter((n2) => n2.node.id !== root.id);
  const nodes = [...rR.nodes, ...leftChildren];
  const links = [
    ...rR.links,
    ...rL.links.map((l) => l.from === rL.root ? { ...l, from: rootPos } : l)
  ];
  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}
function layoutVertical(root, branchColors, linkColor, curve, align, sizeOf) {
  const swCache = /* @__PURE__ */ new Map();
  const sw = (n2) => {
    const cached = swCache.get(n2.id);
    if (cached != null) return cached;
    const size = sizeOf(n2);
    const kids = n2.collapsed ? [] : n2.children;
    let v;
    if (!kids.length) v = size.w;
    else {
      const kidsW = kids.reduce((a, k) => a + sw(k), 0) + V_SIB_GAP * (kids.length - 1);
      v = Math.max(size.w, kidsW);
    }
    swCache.set(n2.id, v);
    return v;
  };
  const xOf = /* @__PURE__ */ new Map();
  const placeX = (n2, left) => {
    const size = sizeOf(n2);
    const span = sw(n2);
    const kids = n2.collapsed ? [] : n2.children;
    if (!kids.length) {
      xOf.set(n2.id, left + (align === "center" ? (span - size.w) / 2 : 0));
      return;
    }
    const kidsW = kids.reduce((a, k) => a + sw(k), 0) + V_SIB_GAP * (kids.length - 1);
    let cx = left + (align === "center" ? (span - kidsW) / 2 : 0);
    kids.forEach((k) => {
      placeX(k, cx);
      cx += sw(k) + V_SIB_GAP;
    });
    xOf.set(n2.id, align === "center" ? left + (span - size.w) / 2 : left);
  };
  placeX(root, 0);
  const levelH = [];
  const walkD = (n2, d) => {
    levelH[d] = Math.max(levelH[d] ?? 0, sizeOf(n2).h);
    if (!n2.collapsed) n2.children.forEach((c) => walkD(c, d + 1));
  };
  walkD(root, 0);
  const levelY = [];
  let acc = 0;
  for (let d = 0; d < levelH.length; d++) {
    levelY[d] = acc;
    acc += levelH[d] + V_LEVEL_GAP;
  }
  const nodes = [];
  const links = [];
  const place = (n2, depth, parent) => {
    const size = sizeOf(n2);
    const y = levelY[depth] + (levelH[depth] - size.h) / 2;
    const pos = mkNode(n2, xOf.get(n2.id), y, depth, "v", 1, size);
    nodes.push(pos);
    if (parent) {
      links.push({
        from: parent,
        to: pos,
        color: branchColors.get(n2.id) ?? linkColor,
        curve,
        axis: "v",
        sgn: 1
      });
    }
    if (!n2.collapsed) n2.children.forEach((c) => place(c, depth + 1, pos));
  };
  place(root, 0);
  const b = bounds(nodes);
  return { nodes, links, ...b, root: nodes[0] };
}
var CAT_INDENT = 38;
var CAT_STUB = 10;
var CAT_COL_GAP = 46;
var CAT_BUS_DROP = 18;
function layoutCatalog(root, branchColors, linkColor, curve, sizeOf) {
  const rootSize = sizeOf(root);
  const nodes = [];
  const links = [];
  const kids = root.collapsed ? [] : root.children;
  const rootPos = mkNode(root, -rootSize.w / 2, 0, 0, "v", 1, rootSize);
  if (root.children.length) rootPos.busX = rootSize.w / 2;
  nodes.push(rootPos);
  const colWidth = (n2, rel) => {
    let m = rel * CAT_INDENT + sizeOf(n2).w;
    if (!n2.collapsed) for (const c of n2.children) m = Math.max(m, colWidth(c, rel + 1));
    return m;
  };
  const widths = kids.map((k) => colWidth(k, 0));
  const totalW = widths.reduce((a, b2) => a + b2, 0) + CAT_COL_GAP * Math.max(0, kids.length - 1);
  const top = rootSize.h + V_LEVEL_GAP;
  const busY = top - CAT_BUS_DROP;
  let colX = -totalW / 2;
  kids.forEach((k, i) => {
    let cursor = top;
    const place = (n2, rel, depth, parent) => {
      const size = sizeOf(n2);
      const pos = mkNode(n2, colX + rel * CAT_INDENT, cursor, depth, "v", 1, size);
      nodes.push(pos);
      if (n2.children.length) pos.busX = CAT_INDENT - CAT_STUB;
      if (parent) {
        const x0 = pos.x - CAT_STUB;
        const y0 = parent.y + parent.h;
        const y1 = pos.centerY;
        const r = Math.min(5, Math.max(0, (y1 - y0) / 2), CAT_STUB);
        links.push({
          from: parent,
          to: pos,
          color: branchColors.get(n2.id) ?? linkColor,
          curve,
          axis: "v",
          sgn: 1,
          path: r > 0.5 ? `M ${x0} ${y0} L ${x0} ${y1 - r} Q ${x0} ${y1} ${x0 + r} ${y1} L ${pos.x} ${y1}` : `M ${x0} ${y0} L ${x0} ${y1} L ${pos.x} ${y1}`
        });
      }
      cursor += size.h + V_GAP;
      if (!n2.collapsed) for (const c of n2.children) place(c, rel + 1, depth + 1, pos);
      return pos;
    };
    const kpos = place(k, 0, 1);
    links.push({
      from: rootPos,
      to: kpos,
      color: branchColors.get(k.id) ?? linkColor,
      curve,
      axis: "v",
      sgn: 1,
      path: `M ${rootPos.centerX} ${rootPos.y + rootPos.h} L ${rootPos.centerX} ${busY} L ${kpos.centerX} ${busY} L ${kpos.centerX} ${kpos.y}`
    });
    colX += widths[i] + CAT_COL_GAP;
  });
  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}
var TL_COL_GAP = 56;
var TL_TRUNK_DX = 10;
var TL_STUB = 14;
var TL_GAP = 12;
var TL_INDENT = TL_TRUNK_DX + TL_STUB + TL_GAP;
var TL_V_GAP = 8;
function layoutTimeline(root, branchColors, linkColor, curve, sizeOf) {
  const rootSize = sizeOf(root);
  const kids = root.collapsed ? [] : root.children;
  const nodes = [];
  const links = [];
  const subH = (n2) => {
    const h = sizeOf(n2).h;
    const cs = n2.collapsed ? [] : n2.children;
    if (!cs.length) return h;
    let t = h + TL_V_GAP;
    cs.forEach((c, i) => {
      t += subH(c);
      if (i < cs.length - 1) t += TL_V_GAP;
    });
    return t;
  };
  const rootPos = mkNode(root, 0, -rootSize.h / 2, 0, "h", 1, rootSize);
  nodes.push(rootPos);
  const rRight = rootPos.x + rootPos.w;
  const AXIS_Y = 0;
  let x = rRight + TL_COL_GAP;
  kids.forEach((k, i) => {
    const ksize = sizeOf(k);
    const dir = i % 2 === 0 ? 1 : -1;
    const kpos = mkNode(k, x, AXIS_Y - ksize.h / 2, 1, "v", dir, ksize);
    const kTextLeft = kpos.x + textCenterX(k, ksize.w) - textBlockWidth(k, ksize) / 2;
    kpos.busX = kTextLeft - kpos.x + TL_TRUNK_DX;
    nodes.push(kpos);
    links.push({
      from: rootPos,
      to: kpos,
      color: branchColors.get(k.id) ?? linkColor,
      curve,
      axis: "h",
      sgn: 1,
      path: `M ${rRight} ${AXIS_Y} L ${kpos.x} ${AXIS_Y}`
    });
    const placeDeep = (parent, parentTextLeft, depth, d) => {
      const cs = parent.node.collapsed ? [] : parent.node.children;
      if (!cs.length) return;
      const childTextLeft = parentTextLeft + TL_INDENT;
      const trunkX = parentTextLeft + TL_TRUNK_DX;
      const parentEdgeY = d === 1 ? parent.y + parent.h : parent.y;
      let cursor = d === 1 ? parent.y + parent.h + TL_V_GAP : parent.y - TL_V_GAP;
      for (const c of cs) {
        const csize = sizeOf(c);
        const cx = childTextLeft - TEXT_LEFT_INSET - prefixWidth(c);
        const cy = d === 1 ? cursor : cursor - csize.h;
        const cpos = mkNode(c, cx, cy, depth, "v", d, csize);
        cpos.busX = TEXT_LEFT_INSET + prefixWidth(c) + TL_TRUNK_DX;
        nodes.push(cpos);
        links.push({
          from: parent,
          to: cpos,
          color: branchColors.get(c.id) ?? linkColor,
          curve,
          axis: "v",
          sgn: d,
          // 肘形折线：父节点边沿 → 沿竖线下行 / 上行 → 短横头收在子节点文本左前方
          path: `M ${trunkX} ${parentEdgeY} L ${trunkX} ${cpos.centerY} L ${trunkX + TL_STUB} ${cpos.centerY}`
        });
        placeDeep(cpos, childTextLeft, depth + 1, d);
        if (d === 1) cursor += subH(c) + TL_V_GAP;
        else cursor = cy - (subH(c) - csize.h) - TL_V_GAP;
      }
    };
    placeDeep(kpos, kTextLeft, 2, dir);
    const maxRight = nodes.reduce((m, n2) => Math.max(m, n2.x + n2.w), 0);
    x = maxRight + TL_COL_GAP;
  });
  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}
function layoutFishbone(root, branchColors, linkColor, curve, sizeOf) {
  const rootSize = sizeOf(root);
  const kids = root.collapsed ? [] : root.children;
  const nodes = [];
  const links = [];
  const THETA = 32 * Math.PI / 180;
  const COS = Math.cos(THETA);
  const SIN = Math.sin(THETA);
  const subs = kids.map((k) => layoutSide(k, 1, branchColors, linkColor, curve, sizeOf, 1));
  let maxLat = 0;
  for (const sub of subs) {
    const lat = (sub.maxX - sub.minX) * COS;
    if (lat > maxLat) maxLat = lat;
  }
  const BONE_STEP = Math.ceil(maxLat) + 150;
  const anchorX0 = -(rootSize.w + 90);
  const rootPos = mkNode(root, 0, -rootSize.h / 2, 0, "h", -1, rootSize);
  nodes.push(rootPos);
  const rootLeft = rootPos.x;
  kids.forEach((k, i) => {
    const up = i % 2 === 0;
    const dir = up ? -1 : 1;
    const ux = -COS;
    const uy = dir * SIN;
    const vx = -uy;
    const vy = ux;
    const anchorX = anchorX0 - i * BONE_STEP;
    const sub = subs[i];
    const y0 = sub.nodes.find((n2) => n2.node.id === k.id).y;
    for (const n2 of sub.nodes) {
      n2.y = y0 + (n2.y - y0) * 1.7;
      n2.centerY = n2.y + n2.h / 2;
      n2.rot = 0;
    }
    const D = 82;
    const target = sub.nodes.find((n2) => n2.node.id === k.id);
    const lyRoot = target.y;
    const ox = anchorX + D * ux - vx * lyRoot;
    const oy = D * uy - vy * lyRoot;
    for (const n2 of sub.nodes) {
      const lx = n2.x;
      const ly = n2.y;
      n2.x = ox + ux * lx + vx * ly;
      n2.y = oy + uy * lx + vy * ly;
      n2.centerX = n2.x + n2.w / 2;
      n2.centerY = n2.y + n2.h / 2;
    }
    for (const l of sub.links) {
      l.axis = "diag";
      l.path = void 0;
    }
    nodes.push(...sub.nodes);
    links.push(...sub.links);
    const tpos = sub.nodes.find((n2) => n2.node.id === k.id);
    links.push({
      from: rootPos,
      to: tpos,
      color: branchColors.get(k.id) ?? linkColor,
      curve,
      axis: "diag",
      sgn: 1,
      path: `M ${rootLeft} 0 L ${anchorX} 0 L ${tpos.centerX} ${tpos.centerY}`
    });
  });
  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}
function layoutTree(root, opts) {
  const depthMap = /* @__PURE__ */ new Map();
  const walkDepth = (n2, d) => {
    depthMap.set(n2.id, d);
    for (const c of n2.children) walkDepth(c, d + 1);
  };
  walkDepth(root, 0);
  const sizeOf = makeSizer(depthMap);
  const { branchColors, linkColor, lineStyle, structure } = opts;
  const curve = lineStyle === "curve";
  let raw;
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
      raw = layoutTimeline(root, branchColors, linkColor, curve, makeTimelineSizer(depthMap));
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
  const minX = raw.minX;
  const minY = raw.minY;
  for (const n2 of nodes) {
    n2.x -= minX;
    n2.y -= minY;
    n2.centerX -= minX;
    n2.centerY -= minY;
  }
  for (const l of links) {
    if (l.path) {
      l.path = l.path.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_m, a, b) => {
        const x = parseFloat(a) - minX;
        const y = parseFloat(b) - minY;
        return `${+x.toFixed(2)} ${+y.toFixed(2)}`;
      });
    }
  }
  const width = Math.max(...nodes.map((n2) => n2.x + n2.w));
  const height = Math.max(...nodes.map((n2) => n2.y + n2.h));
  const byId2 = new Map(nodes.map((n2) => [n2.node.id, n2]));
  return { nodes, links, width, height, byId: byId2, rootPos: raw.root };
}

// _verify/tl-test.ts
var seq = 0;
var n = (title, children = []) => ({
  id: `n${++seq}`,
  title,
  children
});
var tree = n("\u6839\u8282\u70B9", [
  n("\u7532\u57DF", [
    n("\u7532\u4E00", [n("\u7532\u4E00\u7532"), n("\u7532\u4E00\u4E59")]),
    n("\u7532\u4E8C"),
    n("\u7532\u4E09")
  ]),
  n("\u4E59\u57DF", [n("\u4E59\u4E00")]),
  n("\u4E19\u57DF", [n("\u4E19\u4E00", [n("\u4E19\u4E00\u7532")]), n("\u4E19\u4E8C")]),
  n("\u4E01\u57DF")
]);
var res = layoutTree(tree, {
  structure: "timeline",
  branchColors: /* @__PURE__ */ new Map(),
  linkColor: "#999",
  lineStyle: "straight"
});
var textLeft = (p) => p.depth <= 1 ? p.x + textCenterX(p.node, p.w) - textBlockWidth(p.node, nodeSize(p.node, p.depth)) / 2 : p.x + TEXT_LEFT_INSET + prefixWidth(p.node);
var byId = /* @__PURE__ */ new Map();
res.nodes.forEach((p) => byId.set(p.node.id, p));
console.log("depth structure:");
var dump = (node, d) => {
  const p = byId.get(node.id);
  console.log(
    `  ${"  ".repeat(d)}d${p.depth} ${node.title.padEnd(6)} box=[${p.x.toFixed(0)},${(p.x + p.w).toFixed(0)}] y=[${p.y.toFixed(0)},${(p.y + p.h).toFixed(0)}] textLeft=${textLeft(p).toFixed(1)} sgn=${p.sgn}`
  );
  node.children.forEach((c) => dump(c, d + 1));
};
dump(tree, 0);
var fail = [];
tree.children.forEach((k, i) => {
  const p = byId.get(k.id);
  const expect = i % 2 === 0 ? 1 : -1;
  if (p.sgn !== expect) fail.push(`${k.title} \u65B9\u5411\u5E94\u4E3A ${expect}\uFF0C\u5B9E\u9645 ${p.sgn}`);
});
var walk = (node) => {
  const p = byId.get(node.id);
  node.children.forEach((c) => {
    const q = byId.get(c.id);
    if (p.depth >= 1) {
      const delta = textLeft(q) - textLeft(p);
      if (Math.abs(delta - 36) > 0.6) fail.push(`${node.title}\u2192${c.title} \u7F29\u8FDB ${delta.toFixed(1)} \u2260 36`);
    }
    walk(c);
  });
};
walk(tree);
for (let i = 0; i < res.nodes.length; i++) {
  for (let j = i + 1; j < res.nodes.length; j++) {
    const a = res.nodes[i];
    const b = res.nodes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0.5 && oy > 0.5) {
      fail.push(`\u8282\u70B9\u91CD\u53E0\uFF1A${a.node.title} \xD7 ${b.node.title}`);
    }
  }
}
var axis = byId.get(tree.id).centerY;
tree.children.forEach((k) => {
  const p = byId.get(k.id);
  if (Math.abs(p.centerY - axis) > 0.01) fail.push(`${k.title} \u672A\u843D\u5728\u4E3B\u8F74\u4E0A`);
});
var checkDir = (node, dir, parentEdge) => {
  const p = byId.get(node.id);
  if (dir === 1 && p.y < parentEdge - 0.01) fail.push(`${node.title} \u5E94\u5728\u4E00\u7EA7\u8282\u70B9\u4E0B\u65B9`);
  if (dir === -1 && p.y + p.h > parentEdge + 0.01) fail.push(`${node.title} \u5E94\u5728\u4E00\u7EA7\u8282\u70B9\u4E0A\u65B9`);
  node.children.forEach((c) => checkDir(c, dir, parentEdge));
};
tree.children.forEach((k) => {
  const p = byId.get(k.id);
  k.children.forEach(
    (c) => checkDir(c, p.sgn, p.sgn === 1 ? p.y + p.h : p.y)
  );
});
res.links.forEach((l) => {
  if (!l.path) fail.push(`\u8FDE\u7EBF\u7F3A\u5C11 path\uFF1A${l.from.node.title}\u2192${l.to.node.title}`);
  else if (!/^M [-\d.]+ [-\d.]+( L [-\d.]+ [-\d.]+){1,2}$/.test(l.path))
    fail.push(`\u8FDE\u7EBF\u8DEF\u5F84\u975E\u9884\u671F\uFF1A${l.path}`);
});
console.log(`
\u753B\u5E03 ${res.width.toFixed(0)} \xD7 ${res.height.toFixed(0)}\uFF1B\u8282\u70B9 ${res.nodes.length}\uFF1B\u8FDE\u7EBF ${res.links.length}`);
if (fail.length) {
  console.log("\n\u274C \u5931\u8D25\u9879\uFF1A");
  fail.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("\n\u2705 \u5168\u90E8\u68C0\u67E5\u901A\u8FC7");
