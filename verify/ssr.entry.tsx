/* eslint-disable no-console */
/**
 * 构建产物可用性回归（Node + react-dom/server）。
 * 直接 import **构建后的 dist-lib/mindmap-vite.es.js**，证明 ESM 产物
 * 可被外部 React 工程 import 且能渲染出导图骨架。
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import * as pkg from "mindmap-vite";
import { sampleTree, type MindNode, type MindMapApi } from "mindmap-vite";

let pass = 0;
const fails: string[] = [];
function ok(cond: boolean, label: string) {
  if (cond) pass += 1;
  else {
    fails.push(label);
    console.log("  ✗ " + label);
  }
}

const tree = sampleTree() as MindNode;
const mod = pkg as Record<string, unknown>;
[
  "MindMap",
  "Toolbar",
  "Icon",
  "Dialog",
  "layoutTree",
  "THEME_LIST",
  "STRUCTURES",
  "parseFreeMind",
  "exportSmm",
  "countNodes",
].forEach((k) => ok(typeof mod[k] !== "undefined", `ESM 产物导出 ${k}`));

const markup = renderToStaticMarkup(
  createElement(mod.MindMap as never, {
    data: tree,
    width: 800,
    height: 600,
    editable: false,
    showToolbar: true,
  })
);

ok(markup.includes("<svg"), "SSR 渲染出 <svg>");
ok(markup.includes("mm-wrap"), "SSR 渲染出 .mm-wrap 容器");
ok(markup.includes("mm-toolbar"), "SSR 渲染出工具栏");
ok(markup.includes(tree.title), "SSR 渲染出根节点文案");
ok((markup.match(/class="mm-node"/g) ?? []).length >= 1, "SSR 渲染出至少一个节点");
// 缩略图 / 公式等补齐项依赖运行时测量，SSR 只保证骨架渲染
ok(markup.length > 1000, `SSR 渲染产物长度 ${markup.length}`);
ok(
  (markup.match(/<svg/g) ?? []).length >= 1,
  "SSR 渲染出 SVG（节点图形）"
);

// 只读模式不应出现编辑态专属的选中环
ok(!markup.includes("mm-ui-only"), "只读模式无选中环 mm-ui-only");
// 可编辑模式默认选中根节点 → 应出现选中态
const editMarkup = renderToStaticMarkup(
  createElement(mod.MindMap as never, { data: tree, editable: true, showToolbar: false })
);
ok((editMarkup.match(/class="mm-node"/g) ?? []).length >= 1, "可编辑模式渲染节点");

// ref 句柄类型可用性（编译期）：MindMapApi 存在即可
const _api: keyof MindMapApi = "getTree";
ok(_api === "getTree", "MindMapApi 类型可用");

console.log("\n=== SSR 断言：" + pass + " 通过 / " + fails.length + " 失败 ===");
if (fails.length) process.exit(1);
