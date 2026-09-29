/* 目录组织图：真实浏览器断言（返回文本日志，eval 只显示 return 值） */
(async () => {
  const out = [];
  const ok = (n, c, e) => out.push((c ? "PASS" : "FAIL") + " | " + n + (e ? " | " + e : ""));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 打开「结构」面板 → 选「目录组织图」
  const trig = [...document.querySelectorAll(".mm-tb-combo-text")].find(
    (e) => e.textContent.trim() === "结构"
  );
  ok("找到「结构」入口", !!trig);
  if (!trig) return out.join("\n");
  trig.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  trig.click();
  await sleep(350);

  const card = [...document.querySelectorAll(".mm-structure-card")].find((b) =>
    b.textContent.includes("目录组织图")
  );
  ok("结构面板含「目录组织图」", !!card);
  if (!card) return out.join("\n");
  card.click();
  await sleep(450);

  const on = [...document.querySelectorAll(".mm-structure-card.is-on")].map((e) =>
    e.textContent.trim()
  );
  ok("当前结构 = 目录组织图", on.length === 1 && on[0].includes("目录组织图"), on.join(","));

  // 适应屏幕，便于截图
  const fitBtn = [...document.querySelectorAll(".mm-zoom-btn")].find(
    (b) => b.getAttribute("title") === "适应屏幕"
  );
  if (fitBtn) fitBtn.click();
  await sleep(500);

  const nodes = [...document.querySelectorAll(".mm-node")];
  const cards = [...document.querySelectorAll(".mm-node .mm-rect")];
  ok("节点数 = 56", nodes.length === 56, "n=" + nodes.length);
  ok("每节点均有卡片矩形", cards.length === nodes.length, "cards=" + cards.length);

  // ① 重叠检测（屏幕坐标，含 0.5px 容差）
  const rs = cards.map((r) => r.getBoundingClientRect());
  let ov = 0;
  const sp = [];
  for (let i = 0; i < rs.length; i++) {
    for (let j = i + 1; j < rs.length; j++) {
      const ox = Math.min(rs[i].right, rs[j].right) - Math.max(rs[i].left, rs[j].left);
      const oy = Math.min(rs[i].bottom, rs[j].bottom) - Math.max(rs[i].top, rs[j].top);
      if (ox > 0.5 && oy > 0.5) {
        ov++;
        if (sp.length < 4) sp.push(i + "×" + j);
      }
    }
  }
  ok("节点卡片零重叠", ov === 0, "overlaps=" + ov + (sp.length ? " " + sp.join(" ") : ""));

  const rootG = document.querySelector(".mm-root");

  // ② 一级节点顶对齐 + 按列递增（读 transform 真值，避免缩放动画干扰）
  const byTitle = (t) =>
    nodes.find(
      (n) => (n.querySelector("title")?.textContent || "").split("\n")[0].trim() === t
    );
  // 节点真值：<g class="mm-node" transform="translate(x,y)">，x/y 即布局 user unit
  const uv = (el) => {
    const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)/.exec(el.getAttribute("transform") || "");
    return m ? { x: +m[1], y: +m[2] } : null;
  };
  const L1Titles = ["门店管理", "菜品管理", "餐盘管理", "订单管理", "排队管理", "预约管理", "桌台预留管理", "从旧版变更需求"];
  const L1 = L1Titles.map(byTitle).filter(Boolean);
  const L1uv = L1.map(uv).filter(Boolean);
  ok(
    "8 个一级节点顶对齐（y 均为 89）",
    L1.length === 8 && new Set(L1uv.map((v) => v.y)).size === 1,
    "y=" + JSON.stringify([...new Set(L1uv.map((v) => v.y))])
  );
  ok(
    "一级节点按列从左到右严格递增",
    L1uv.every((v, i) => i === 0 || v.x > L1uv[i - 1].x),
    "x=" + L1uv.map((v) => v.x).join(" < ")
  );

  // ③ 缩进阶梯：一条 10 层深的唯一标题链，每层左缘恰好右移 38（user unit）
  const chain = [
    "门店管理",
    "餐厅门店",
    "区域管理",
    "桌台管理",
    "员工管理",
    "岗位/角色管理",
    "客户端类型管理",
    "终端管理",
    "角色权限管理",
    "岗位id",
  ];
  const els = chain.map(byTitle);
  const hits = chain.map(
    (t) =>
      nodes.filter(
        (n) => (n.querySelector("title")?.textContent || "").split("\n")[0].trim() === t
      ).length
  );
  ok("深链 10 个节点全部唯一命中", els.every(Boolean) && hits.every((h) => h === 1), "hits=" + JSON.stringify(hits));
  if (els.every(Boolean)) {
    const ps = els.map(uv);
    const dxs = ps.slice(1).map((p, i) => +(p.x - ps[i].x).toFixed(2));
    const dys = ps.slice(1).map((p, i) => +(p.y - ps[i].y).toFixed(2));
    ok("缩进步长恒为 38（user unit）", dxs.every((d) => Math.abs(d - 38) < 0.01), "dx=" + JSON.stringify(dxs));
    ok("纵向步长恒定（不重叠）", new Set(dys).size === 1 && dys[0] > 0, "dy=" + JSON.stringify([...new Set(dys)]));
    ok(
      "深链 10 层不超出内容高度",
      ps[ps.length - 1].y + 43 <= (rootG ? rootG.getBBox().height : 1e9) + 0.5,
      "lastY=" + ps[ps.length - 1].y
    );
  }

  // ④ 连线：路径无 NaN，全部落在内容 bbox 内
  const paths = [...document.querySelectorAll(".mm-root > path")].map(
    (p) => p.getAttribute("d") || ""
  );
  ok("连线数量 = 55", paths.length === 55, "links=" + paths.length);
  ok("连线无 NaN", paths.every((d) => !/NaN|undefined/.test(d)));
  const cb = rootG ? rootG.getBBox() : null;
  let oob = 0;
  for (const d of paths) {
    const pts = d.match(/-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/g) || [];
    for (const pt of pts) {
      const [x, y] = pt.split(/\s+/).map(Number);
      if (
        cb &&
        (x < cb.x - 20 || y < cb.y - 20 || x > cb.x + cb.width + 20 || y > cb.y + cb.height + 20)
      )
        oob++;
    }
  }
  ok("连线端点均在内容 bbox 内", oob === 0, "outOfBounds=" + oob);

  // ⑤ 折叠按钮落点 = 子树竖线起点（节点局部坐标：普通节点 28、根 w/2）
  const uvOf = (el) => {
    const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)/.exec(el.getAttribute("transform") || "");
    return m ? { x: +m[1], y: +m[2] } : null;
  };
  const dotRows = [];
  let dotBad = 0;
  for (const n of nodes) {
    const dot = n.querySelector(".mm-collapse");
    const rect = n.querySelector(".mm-rect");
    if (!dot || !rect) continue;
    const d = uvOf(dot);
    const isRoot = n === nodes[0];
    const want = isRoot ? +rect.getAttribute("width") / 2 : 28;
    const wantY = +rect.getAttribute("height");
    const good = Math.abs(d.x - want) < 0.01 && Math.abs(d.y - wantY) < 0.01;
    if (!good) {
      dotBad++;
      if (dotRows.length < 3) dotRows.push(n.querySelector("title").textContent.trim() + "=" + JSON.stringify(d));
    }
  }
  const dotTotal = nodes.filter((n) => n.querySelector(".mm-collapse")).length;
  ok("折叠按钮落在子树竖线起点", dotBad === 0, "checked=" + dotTotal + " bad=" + dotBad + " " + dotRows.join(" "));

  return out.join("\n");
})()
