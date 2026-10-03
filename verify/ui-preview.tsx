/* eslint-disable no-console */
/**
 * 浮动多选条 / 主菜单的视觉自检：输出**纯 HTML 片段**（含工具条真实 CSS）。
 * 与 toolbar-preview 的区别：这里不依赖 React 运行时，
 * 便于在浏览器不可用时用 resvg / 静态渲染核对排版。
 */
import fs from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Icon } from "../src/components/MindMap/Icons";
import "../src/components/MindMap/MindMap.css";

/* ---------------- 1) 多选浮动条 ---------------- */

const BAR_BTN = (name: Parameters<typeof Icon>[0]["name"], label: string, extra = "") =>
  `<button type="button" class="mm-msbar-btn ${extra}"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg><span>${label}</span></button>`;

/** 复用真实 Icon 组件渲染成字符串，避免两处手抄路径 */
const ICONS: Record<string, string> = Object.fromEntries(
  (["assoc", "summary", "group", "check"] as const).map((n) => [
    n,
    renderToStaticMarkup(createElement(Icon, { name: n, size: 19 }))
      .replace(/^<svg[^>]*>/, "")
      .replace(/<\/svg>$/, ""),
  ])
);

/* MultiSelectBar 走 Portal，SSR 下不产生输出，因此这里用等价静态标记
   （类名 / 图标 / 文案全部取自真实组件源码）供排版核对。 */
const barStatic = `<div class="mm-msbar" style="top:165px;left:44px">
  <div class="mm-msbar-row">
    ${BAR_BTN("assoc", "关联线")}
    ${BAR_BTN("summary", "概要")}
    ${BAR_BTN("group", "分组")}
    <i class="mm-msbar-sep"></i>
    ${BAR_BTN("check", "", "is-ghost").replace("<span></span>", "")}
  </div>
  <div class="mm-msbar-panel">
    <label class="mm-msbar-field"><span>概要文案</span><input class="mm-msbar-input" value="概要"></label>
    <button type="button" class="mm-msbar-cta">添加概要</button>
    <label class="mm-msbar-field"><span>分组名称</span><input class="mm-msbar-input" placeholder="可留空"></label>
    <button type="button" class="mm-msbar-cta">添加分组框</button>
  </div>
</div>`;

const barShell = `<div style="position:relative;width:600px;height:300px;background:#f7f8fa;overflow:hidden;font-family:-apple-system,'PingFang SC',sans-serif">
  <div style="position:absolute;left:44px;top:60px;padding:9px 14px;border-radius:8px;background:#fff;border:1.5px dashed #2f6fed;font-size:13px;color:#1f2329">Redis 分布式锁</div>
  <div style="position:absolute;left:44px;top:120px;padding:9px 14px;border-radius:8px;background:#fff;border:1.5px dashed #2f6fed;font-size:13px;color:#1f2329">MySQL 分表</div>
  ${barStatic}
</div>`;

/* ---------------- 2) 主菜单（含二级面板） ---------------- */

const MENU_ICON = (n: string) =>
  renderToStaticMarkup(createElement(Icon, { name: n as never, size: 16 }))
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "");

const ITEMS: { key: string; label: string; icon: string }[] = [
  { key: "file", label: "文件", icon: "folder" },
  { key: "edit", label: "编辑", icon: "undo" },
  { key: "node", label: "节点样式", icon: "node-style" },
  { key: "base", label: "基础样式", icon: "base-style" },
  { key: "theme", label: "主题", icon: "theme" },
  { key: "struct", label: "结构", icon: "structure" },
  { key: "marker", label: "标记与图标", icon: "marker" },
  { key: "prio", label: "优先级", icon: "priority" },
  { key: "prog", label: "进度", icon: "progress" },
];

const menuHtml = `<div class="mm-pop-panel mm-menu" style="position:absolute;top:52px;left:20px;width:200px">
  ${ITEMS.map(
    (it) =>
      `<button type="button" class="mm-menu-item ${it.key === "node" ? "is-active" : ""}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${MENU_ICON(it.icon)}</svg>
        <span>${it.label}</span>
        <svg class="mm-menu-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${MENU_ICON("chevron")}</svg>
      </button>`
  ).join("")}
</div>`;

const subHtml = `<div class="mm-pop-panel mm-submenu" style="position:absolute;top:96px;left:224px;width:244px">
  <div class="mm-pop-label">形状</div>
  <div class="mm-shape-grid">
    ${["矩形", "圆角", "胶囊", "椭圆", "下划线", "无边框"]
      .map((s) => `<button type="button" class="mm-shape-chip ${s === "圆角" ? "is-on" : ""}">${s}</button>`)
      .join("")}
  </div>
  <div class="mm-pop-label">文字颜色</div>
  <div class="mm-swatches">
    ${["#1f2329", "#e34d59", "#f0a020", "#00a870", "#2f6fed", "#8b5cf6", "#1f2329", "#8b95a5"]
      .map((c, i) => `<button type="button" class="mm-swatch ${i === 0 ? "is-on" : ""}" style="background:${c}"></button>`)
      .join("")}
  </div>
  <div class="mm-pop-label">外框线型</div>
  <div class="mm-seg">
    ${["实线", "虚线", "点线", "点划线"]
      .map(
        (s) =>
          `<button type="button" class="mm-seg-btn ${s === "虚线" ? "is-on" : ""}">
            <svg width="26" height="8" viewBox="0 0 26 8"><line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="${s === "实线" ? "" : s === "虚线" ? "5 3" : s === "点线" ? "1 3" : "6 2.5 1 2.5"}"/></svg>
            <span class="mm-seg-cap">${s}</span>
          </button>`
      )
      .join("")}
  </div>
</div>`;

const menuShell = `<div style="position:relative;width:520px;height:420px;background:#f7f8fa;font-family:-apple-system,'PingFang SC',sans-serif">
  <div class="mm-pop" style="position:absolute;left:20px;top:14px">
    <button type="button" class="mm-tb-btn is-open"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${MENU_ICON("grid")}</svg></button>
  </div>
  ${menuHtml}
  ${subHtml}
</div>`;

/* ---------------- 输出 ---------------- */

const mode = process.argv[2] || "bar";
const shell = mode === "menu" ? menuShell : barShell;
const css = fs.readFileSync("src/components/MindMap/MindMap.css", "utf8");
const m = /position:relative;width:(\d+)px;height:(\d+)px/.exec(shell);
const W = Number(m?.[1] ?? 600);
const H = Number(m?.[2] ?? 320);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}</style><style>${css}</style></head><body>${shell}</body></html>`;
fs.writeFileSync(`verify/.tmp/ui-${mode}.html`, html);
console.log(`W=${W} H=${H} FILE=verify/.tmp/ui-${mode}.html`);
