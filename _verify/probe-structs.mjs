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
var MAX_TEXT_W = 220;
var MIN_W = 72;
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
function nodeSize(node) {
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
function makeSizer() {
  const cache = /* @__PURE__ */ new Map();
  return (n2) => {
    let s = cache.get(n2.id);
    if (!s) {
      s = nodeSize(n2);
      cache.set(n2.id, s);
    }
    return s;
  };
}
var mkNode = (node, x, y, depth, axis, sgn, size, rot = 0) => ({
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
function layoutSide(root2, side, branchColors, linkColor, curve, sizeOf, baseDepth = 0) {
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
  computeY(root2);
  const nodes = [];
  const links = [];
  const kids = root2.collapsed ? [] : root2.children;
  const branches = kids.map((b2) => {
    const widths = [];
    const walk = (n2, rd) => {
      widths[rd] = Math.max(widths[rd] ?? 0, getW(n2));
      if (!n2.collapsed) n2.children.forEach((c) => walk(c, rd + 1));
    };
    walk(b2, 0);
    return { node: b2, widths };
  });
  const rootW = getW(root2);
  const rootX = side === 1 ? 0 : -rootW;
  const rootPos = mkNode(root2, rootX, yTop.get(root2.id), baseDepth, "h", side, sizeOf(root2));
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
function splitBalanced(root2) {
  const weight = (n2) => n2.collapsed ? 1 : n2.children.length ? n2.children.reduce((a, c) => a + weight(c), 0) : 1;
  const left = [];
  const right = [];
  let L = 0;
  let R = 0;
  for (const c of root2.children) {
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
function layoutBalanced(root2, branchColors, linkColor, curve, sizeOf) {
  const { left, right } = splitBalanced(root2);
  const rightTree = { ...root2, children: right };
  const leftTree = { ...root2, children: left };
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
  const leftChildren = rL.nodes.filter((n2) => n2.node.id !== root2.id);
  const nodes = [...rR.nodes, ...leftChildren];
  const links = [
    ...rR.links,
    ...rL.links.map((l) => l.from === rL.root ? { ...l, from: rootPos } : l)
  ];
  const b = bounds(nodes);
  return { nodes, links, ...b, root: rootPos };
}
function layoutVertical(root2, branchColors, linkColor, curve, align, sizeOf) {
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
  placeX(root2, 0);
  const levelH = [];
  const walkD = (n2, d) => {
    levelH[d] = Math.max(levelH[d] ?? 0, sizeOf(n2).h);
    if (!n2.collapsed) n2.children.forEach((c) => walkD(c, d + 1));
  };
  walkD(root2, 0);
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
  place(root2, 0);
  const b = bounds(nodes);
  return { nodes, links, ...b, root: nodes[0] };
}
var CAT_INDENT = 38;
var CAT_STUB = 10;
var CAT_COL_GAP = 46;
var CAT_BUS_DROP = 18;
function layoutCatalog(root2, branchColors, linkColor, curve, sizeOf) {
  const rootSize = sizeOf(root2);
  const nodes = [];
  const links = [];
  const kids = root2.collapsed ? [] : root2.children;
  const rootPos = mkNode(root2, -rootSize.w / 2, 0, 0, "v", 1, rootSize);
  if (root2.children.length) rootPos.busX = rootSize.w / 2;
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
function layoutTimeline(root2, branchColors, linkColor, curve, sizeOf) {
  const rootSize = sizeOf(root2);
  const kids = root2.collapsed ? [] : root2.children;
  const nodes = [];
  const links = [];
  const TIMELINE_INDENT = 34;
  const subH = (n2) => {
    const h = sizeOf(n2).h;
    const cs = n2.collapsed ? [] : n2.children;
    if (!cs.length) return h;
    let t = h + V_LEVEL_GAP;
    cs.forEach((c, i) => {
      t += subH(c);
      if (i < cs.length - 1) t += V_LEVEL_GAP;
    });
    return t;
  };
  const subW = (n2, rel) => {
    let m = rel * TIMELINE_INDENT + sizeOf(n2).w;
    if (!n2.collapsed) for (const c of n2.children) m = Math.max(m, subW(c, rel + 1));
    return m;
  };
  const rootPos = mkNode(root2, 0, -rootSize.h / 2, 0, "h", 1, rootSize);
  nodes.push(rootPos);
  const rRight = rootPos.x + rootPos.w;
  const AXIS_Y = 0;
  let x = rRight + H_GAP;
  kids.forEach((k) => {
    const kx = x;
    const ky = AXIS_Y - sizeOf(k).h / 2;
    const kpos = mkNode(k, kx, ky, 1, "v", 1, sizeOf(k));
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
    const placeDeep = (n2, parentPos, depth) => {
      const cs = n2.collapsed ? [] : n2.children;
      let cy = parentPos.y + parentPos.h + V_LEVEL_GAP;
      for (const c of cs) {
        const csize = sizeOf(c);
        const cx = parentPos.x + TIMELINE_INDENT;
        const cpos = mkNode(c, cx, cy, depth, "v", 1, csize);
        nodes.push(cpos);
        const y0 = parentPos.y + parentPos.h;
        const ymid = (y0 + cpos.y) / 2;
        links.push({
          from: parentPos,
          to: cpos,
          color: branchColors.get(c.id) ?? linkColor,
          curve,
          axis: "v",
          sgn: 1,
          path: `M ${parentPos.centerX} ${y0} L ${parentPos.centerX} ${ymid} L ${cpos.centerX} ${ymid} L ${cpos.centerX} ${cpos.y}`
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
function layoutFishbone(root2, branchColors, linkColor, curve, sizeOf) {
  const rootSize = sizeOf(root2);
  const kids = root2.collapsed ? [] : root2.children;
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
  const rootPos = mkNode(root2, 0, -rootSize.h / 2, 0, "h", -1, rootSize);
  nodes.push(rootPos);
  const rootLeft = rootPos.x;
  const boneDeg = Math.atan2(SIN, -COS) * 180 / Math.PI;
  const rotFor = (dir) => {
    const raw = dir * boneDeg;
    if (raw > 90) return raw - 180;
    if (raw < -90) return raw + 180;
    return raw;
  };
  kids.forEach((k, i) => {
    const up = i % 2 === 0;
    const dir = up ? -1 : 1;
    const ux = -COS;
    const uy = dir * SIN;
    const vx = -uy;
    const vy = ux;
    const anchorX = anchorX0 - i * BONE_STEP;
    const sub = subs[i];
    const boneRot = rotFor(dir);
    const y0 = sub.nodes.find((n2) => n2.node.id === k.id).y;
    for (const n2 of sub.nodes) {
      n2.y = y0 + (n2.y - y0) * 1.7;
      n2.centerY = n2.y + n2.h / 2;
      n2.rot = boneRot;
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
function layoutTree(root2, opts) {
  const sizeOf = makeSizer();
  const { branchColors, linkColor, lineStyle, structure } = opts;
  const curve = lineStyle === "curve";
  let raw;
  switch (structure) {
    case "logical-left":
      raw = layoutSide(root2, -1, branchColors, linkColor, curve, sizeOf);
      break;
    case "mindmap":
      raw = layoutBalanced(root2, branchColors, linkColor, curve, sizeOf);
      break;
    case "org":
      raw = layoutVertical(root2, branchColors, linkColor, curve, "center", sizeOf);
      break;
    case "catalog":
      raw = layoutCatalog(root2, branchColors, linkColor, curve, sizeOf);
      break;
    case "timeline":
      raw = layoutTimeline(root2, branchColors, linkColor, curve, sizeOf);
      break;
    case "fishbone":
      raw = layoutFishbone(root2, branchColors, linkColor, curve, sizeOf);
      break;
    case "logical-right":
    default:
      raw = layoutSide(root2, 1, branchColors, linkColor, curve, sizeOf);
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
  const byId = new Map(nodes.map((n2) => [n2.node.id, n2]));
  return { nodes, links, width, height, byId, rootPos: raw.root };
}

// _verify/probe-structs.ts
var n = 0;
var mk = (title, children = []) => ({
  id: "q" + ++n,
  title,
  children
});
var chain = (titles) => {
  let node;
  for (let i = titles.length - 1; i >= 0; i--) node = mk(titles[i], node ? [node] : []);
  return node;
};
var TALL = "SINGLE DISH, COMBO DISH, BUFFET_MEAL, VOUCHER, \u81EA\u52A9\u9910, \u6253\u5305\u76D2, \u5957\u9910, \u5957\u9910\u5B50\u83DC\u54C1, \u5355\u70B9\u83DC";
var root = mk("\u6D77\u9C9C\u70B9\u9910\u5C0F\u7A0B\u5E8F\u63A5\u53E3", [
  mk("\u70B9\u9910\u9875", [
    mk("\u5165\u5883"),
    chain(["\u51FA\u5883", "table", "dishCategories", "dishes", "order", "cart", "cartId"]),
    chain(["\u540D\u79F0", "categoryId"])
  ]),
  mk("\u63D0\u4EA4\u8D2D\u7269\u8F66", [
    mk("\u5165\u5883"),
    chain(["\u51FA\u5883", "\u6210\u529F", "storedId", "tableId", "dishId", "dishType", "subDishes", "skuId", "num"])
  ]),
  mk("\u786E\u8BA4\u4E0B\u5355"),
  mk("\u8BA2\u5355\u8BE6\u60C5"),
  mk("\u6A21\u578B", [
    chain(["\u8D2D\u7269\u8F66", "cartItem\u8D2D\u7269\u8F66\u83DC\u54C1\u5355\u6761\u660E\u7EC6", "cartItemVo\u8F93\u51FA\u6A21\u578B", "\u8BA2\u5355", "\u83DC\u54C1", "id", "did", "ld"]),
    mk(TALL),
    mk("\u5957\u9910\u7C7B\u578B")
  ]),
  chain(["websocket", "cartInfo", "order"]),
  mk("\u5957\u9910"),
  mk("\u5957\u9910\u5206\u7EC4\u83DC\u54C1"),
  mk("Combold"),
  mk("\u5206\u7EC4\u7C7B\u578B")
]);
var STRUCTS = [
  "logical-right",
  "logical-left",
  "mindmap",
  "org",
  "catalog",
  "timeline",
  "fishbone"
];
function overlapPairs(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 1 && iy > 1) out.push(`${a.node.title} \xD7 ${b.node.title}  (${ix.toFixed(0)}\xD7${iy.toFixed(0)})`);
    }
  return out;
}
console.log(`\u6D4B\u8BD5\u6811\u8282\u70B9\u6570 ${n}
`);
var fail = [];
for (const s of STRUCTS) {
  const L = layoutTree(root, {
    structure: s,
    branchColors: /* @__PURE__ */ new Map(),
    linkColor: "#7f8ea3",
    lineStyle: "curve"
  });
  const ov = overlapPairs(L.nodes);
  let oob = 0;
  let nan = 0;
  for (const nd of L.nodes)
    if (![nd.x, nd.y, nd.w, nd.h, nd.centerX, nd.centerY].every(Number.isFinite)) nan++;
  for (const l of L.links) {
    if (!l.path) continue;
    const pts = l.path.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g) ?? [];
    for (const pt of pts) {
      const [x, y] = pt.split(/\s+/).map(Number);
      if (x < -1 || y < -1 || x > L.width + 1 || y > L.height + 1) oob++;
    }
  }
  console.log(`\u2500\u2500 ${s} \u2500\u2500`);
  console.log(`   \u8282\u70B9 ${L.nodes.length}  \u91CD\u53E0 ${ov.length} \u5BF9  \u8D8A\u754C\u7AEF\u70B9 ${oob}  NaN ${nan}  \u753B\u5E03 ${L.width.toFixed(0)}\xD7${L.height.toFixed(0)}`);
  if (ov.length) {
    for (const o of ov.slice(0, 6)) console.log(`     \u26A0 ${o}`);
    if (ov.length > 6) console.log(`     \u2026 \u5176\u4F59 ${ov.length - 6} \u5BF9`);
  }
  const lvl1 = L.nodes.filter((p) => p.depth === 1).map((p) => +p.y.toFixed(1));
  if (lvl1.length) {
    const uniq = [...new Set(lvl1)].sort((a, b) => a - b);
    console.log(`   \u4E00\u7EA7\u8282\u70B9 y\uFF1A${lvl1.join(", ")}  \u2192 \u53D6\u503C ${uniq.length} \u4E2A`);
  }
  if (ov.length) fail.push(`${s} \u91CD\u53E0 ${ov.length} \u5BF9`);
  if (oob) fail.push(`${s} \u8D8A\u754C\u7AEF\u70B9 ${oob}`);
  if (nan) fail.push(`${s} NaN ${nan}`);
  console.log();
}
console.log(fail.length ? "FAIL\n" + fail.map((f) => "  - " + f).join("\n") : "ALL PASS");
