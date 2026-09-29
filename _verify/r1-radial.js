(async () => {
  const out = [];
  const ok = (n, c, extra) =>
    out.push((c ? "PASS " : "FAIL ") + n + (extra ? " :: " + extra : ""));

  const nodes = [...document.querySelectorAll("g.mm-node")];
  ok("脑图节点已渲染", nodes.length > 1, "count=" + nodes.length);

  const titleOf = (g) => (g.querySelector("title")?.textContent || "").trim();
  const target =
    nodes.find((g) => titleOf(g).includes("桌台域")) || nodes[1];
  ok("定位到目标节点", !!target, titleOf(target));

  const r = target.getBoundingClientRect();
  target.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: r.x + r.width / 2,
      clientY: r.y + r.height / 2,
    })
  );
  await new Promise((res) => setTimeout(res, 260));

  const menu = document.querySelector(".mm-radial");
  ok("右键后环形菜单弹出", !!menu);

  const ring = document.querySelector(".mm-radial-ring");
  ok("圆盘底衬存在", !!ring);

  const cs = ring ? getComputedStyle(ring) : null;
  ok(
    "圆盘整体 opacity = 0.2（即 80% 透明度）",
    !!cs && cs.opacity === "0.2",
    cs ? "opacity=" + cs.opacity : "n/a"
  );

  const bg = cs ? cs.backgroundImage : "";
  const m = bg.match(/rgba?\(\s*64\s*,\s*69\s*,\s*80\s*,\s*([\d.]+)\s*\)/);
  ok(
    "核心色标仍为 0.96（透明度由 opacity 统一控制）",
    !!m && Math.abs(parseFloat(m[1]) - 0.96) < 1e-6,
    m ? "alpha=" + m[1] : "no-match"
  );
  const eff = m ? 0.96 * 0.2 : null;
  ok(
    "等效核心不透明度 ≈ 0.192",
    eff != null && Math.abs(eff - 0.192) < 0.005,
    "eff=" + eff
  );

  const btns = [...document.querySelectorAll(".mm-radial-btn")];
  ok("功能按钮数量 = 6", btns.length === 6, "n=" + btns.length);
  const center = document.querySelector(".mm-radial-center");
  ok("中心「编辑 F2」按钮存在", !!center);

  const bcs = btns.length ? getComputedStyle(btns[0]) : null;
  ok(
    "按钮自身不透明度不受影响（= 1，仍为实心）",
    !!bcs && bcs.opacity === "1",
    bcs ? "opacity=" + bcs.opacity : "n/a"
  );
  ok(
    "按钮仍为白底实心",
    !!bcs && bcs.backgroundColor === "rgb(255, 255, 255)",
    bcs ? bcs.backgroundColor : "n/a"
  );
  ok(
    "按钮可交互（pointer-events = auto）",
    !!bcs && bcs.pointerEvents === "auto",
    bcs ? bcs.pointerEvents : "n/a"
  );

  const mr = menu ? getComputedStyle(menu) : null;
  ok(
    "菜单空白区可穿透（.mm-radial pointer-events = none）",
    !!mr && mr.pointerEvents === "none",
    mr ? mr.pointerEvents : "n/a"
  );
  ok(
    "菜单尺寸仍为 260×260",
    !!menu && Math.round(menu.getBoundingClientRect().width) === 260,
    menu ? "w=" + Math.round(menu.getBoundingClientRect().width) : "n/a"
  );

  // 命中测试：圆盘正上方（12 点方向，无按钮处）应打到画布而不是菜单
  const box = menu.getBoundingClientRect();
  const hit = document.elementFromPoint(box.x + box.width / 2, box.y + 12);
  ok(
    "圆盘空白处命中测试穿透到菜单之外",
    !!hit && !hit.closest(".mm-radial"),
    hit ? (hit.tagName + "." + (hit.getAttribute("class") || "")).trim() : "null"
  );

  out.push("— 失败数 = " + out.filter((l) => l.startsWith("FAIL")).length);
  return out.join("\n");
})()
