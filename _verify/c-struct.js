(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const trig = () =>
    Array.from(document.querySelectorAll(".mm-tb-combo-text")).find((e) =>
      (e.textContent || "").includes("结构")
    );
  let cards = document.querySelectorAll(".mm-structure-card");
  if (!cards.length) {
    trig()?.click();
    await sleep(400);
    cards = document.querySelectorAll(".mm-structure-card");
  }
  if (!cards.length) return "结构面板未打开（找不到 .mm-structure-card）";
  const arr = Array.from(cards);
  const idx = arr.findIndex((c) => c.classList.contains("is-on"));
  const label = idx >= 0 ? arr[idx].textContent.trim() : "(无选中)";
  return `结构 = ${label}（索引 ${idx}）`;
})();
