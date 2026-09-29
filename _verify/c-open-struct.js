(() => {
  const trig = Array.from(document.querySelectorAll(".mm-tb-combo-text, .mm-tb-combo, button")).find(
    (e) => (e.textContent || "").includes("结构")
  );
  if (!trig) return "未找到「结构」入口；工具栏按钮：" + Array.from(document.querySelectorAll(".mm-tb-combo-text")).map((e) => e.textContent.trim()).join("/");
  trig.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  trig.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  trig.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return "已点击「结构」入口";
})();
