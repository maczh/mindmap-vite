(() => {
  const cards = Array.from(document.querySelectorAll(".mm-structure-card"));
  const t = cards.find((c) => (c.textContent || "").includes("时间轴"));
  if (!t) return "未找到「时间轴」卡片，共 " + cards.length + " 个：「" + cards.map((c) => (c.textContent || "").trim()).join("/") + "」";
  t.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return "已点击「时间轴」";
})();
