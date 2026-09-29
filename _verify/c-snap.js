(async () => {
  const out = [];
  const nodeEls = () => Array.from(document.querySelectorAll(".mm-root .mm-node"));
  const cards = () => Array.from(document.querySelectorAll(".mm-structure-card"));
  const structIdx = () => cards().findIndex((c) => c.classList.contains("is-on"));
  const structLabel = () => (cards()[structIdx()]?.textContent || "").trim();

  const rects = nodeEls()
    .map((g) => {
      const m = /translate\(\s*(-?[\d.eE+]+)[ ,]+(-?[\d.eE+]+)/.exec(g.getAttribute("transform") || "");
      let bb = { width: 0, height: 0 };
      try { bb = g.getBBox(); } catch (e) {}
      const title = (g.querySelector(".mm-text")?.textContent || "").trim();
      return m ? { x: +m[1], y: +m[2], w: bb.width, h: bb.height, title } : null;
    })
    .filter(Boolean);

  const pairs = [];
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 1 && iy > 1)
        pairs.push(`${a.title.slice(0, 14)}×${b.title.slice(0, 14)}`);
    }

  const lvl1 = rects.filter((r) => r.y !== undefined);
  const ys = [...new Set(rects.map((r) => Math.round(r.y)))];

  out.push(`节点数 ${nodeEls().length}`);
  out.push(`结构 = ${structLabel()}（索引 ${structIdx()}）`);
  out.push(`重叠对 ${pairs.length}${pairs.length ? "：" + pairs.slice(0, 8).join("; ") : ""}`);
  out.push(`独立 y 行数 ${ys.length}`);
  return out.join("\n");
})();
