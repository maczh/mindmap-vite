(async () => {
  const out = [];
  const ok = (n, c, extra) =>
    out.push((c ? "PASS " : "FAIL ") + n + (extra ? " :: " + extra : ""));

  const gs = [...document.querySelectorAll("g.mm-node")];
  const titleOf = (g) => (g.querySelector("title")?.textContent || "").trim();
  const cx = (g) => {
    const r = g.getBoundingClientRect();
    return r.x + r.width / 2;
  };

  out.push("— 当前画布节点数 = " + gs.length);
  out.push("— 节点标题 = " + gs.map(titleOf).join(" / "));
  out.push("— 文件输入框存在 = " + !!document.querySelector(".mm-file-input"));

  const root = gs.find((g) => titleOf(g).includes("根节点"));
  ok("导入后存在根节点", !!root, root ? titleOf(root) : "NOT-FOUND");
  if (!root) return out.join("\n");

  const kids = gs.filter((g) => g !== root);
  const EXPECT_TOTAL = { SMM根节点: 4, "KM-R根节点": 4, "KM-D根节点": 5 };
  const want = EXPECT_TOTAL[titleOf(root)];
  ok(
    "旧脑图已被清空（节点数 = " + want + "，非叠加）",
    gs.length === want,
    "total=" + gs.length
  );

  const rc = cx(root);
  const L = kids.filter((g) => cx(g) < rc).length;
  const R = kids.filter((g) => cx(g) > rc).length;

  const name = titleOf(root);
  const EXP = {
    SMM根节点: { mode: "L", desc: ".smm layout=logicalLeft → 左向逻辑结构图" },
    "KM-R根节点": { mode: "R", desc: ".km template=right → 右向逻辑结构图" },
    "KM-D根节点": { mode: "B", desc: ".km template=default → 双向思维导图" },
  }[name];

  ok("识别到用例：" + name, !!EXP);
  if (EXP) {
    const pass =
      EXP.mode === "L"
        ? L === kids.length && R === 0
        : EXP.mode === "R"
        ? R === kids.length && L === 0
        : L > 0 && R > 0;
    ok("按文件声明的结构绘制（" + EXP.desc + "）", pass, "左=" + L + " 右=" + R);
  }

  return out.join("\n");
})()
