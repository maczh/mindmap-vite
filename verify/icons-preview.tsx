/* eslint-disable no-console */
/**
 * 图标自检：把 Icons 里的关键图标按工具条实际尺寸渲成一张对照图。
 * 浏览器不可用时，用 esbuild + SSR + resvg 出图肉眼核对。
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon, type IconName } from "../src/components/MindMap/Icons";

const GROUPS: { title: string; items: { name: IconName; label: string }[] }[] = [
  {
    title: "多选聚合（浮动条实际使用）",
    items: [
      { name: "assoc", label: "关联线" },
      { name: "summary", label: "概要" },
      { name: "group", label: "分组" },
    ],
  },
  {
    title: "主菜单与文件",
    items: [
      { name: "grid", label: "主菜单" },
      { name: "folder", label: "文件" },
      { name: "save", label: "保存" },
      { name: "file-plus", label: "新建" },
    ],
  },
  {
    title: "工具条其余图标（隐藏文字后）",
    items: [
      { name: "undo", label: "撤销" },
      { name: "redo", label: "重做" },
      { name: "insert-parent", label: "插入上级" },
      { name: "insert-sibling-above", label: "同级上" },
      { name: "insert-sibling-below", label: "同级下" },
      { name: "insert-child", label: "子节点" },
      { name: "marker", label: "标记" },
      { name: "node-style", label: "节点样式" },
      { name: "base-style", label: "基础样式" },
      { name: "theme", label: "主题" },
      { name: "structure", label: "结构" },
      { name: "priority", label: "优先级" },
      { name: "progress", label: "进度" },
      { name: "icon", label: "图标" },
      { name: "note", label: "备注" },
      { name: "link", label: "链接" },
      { name: "keyboard", label: "快捷键" },
      { name: "trash", label: "删除" },
    ],
  },
];

const CELL = 66;
const COLS = 10;
let body = "";
let y = 16;
for (const g of GROUPS) {
  body += `<text x="16" y="${y + 12}" font-size="13" font-weight="700" fill="#1f2329">${g.title}</text>`;
  y += 24;
  g.items.forEach((it, i) => {
    const cx = 16 + (i % COLS) * CELL;
    const cy = y + Math.floor(i / COLS) * CELL;
    body +=
      `<rect x="${cx}" y="${cy}" width="54" height="54" rx="10" fill="#f6f7f9" stroke="#e2e5e9"/>` +
      `<g transform="translate(${cx + 15},${cy + 15})" color="#3c4453" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">` +
      renderToStaticMarkup(createElement(Icon, { name: it.name, size: 24 }))
        .replace(/^<svg[^>]*>/, "")
        .replace(/<\/svg>$/, "") +
      `</g>` +
      `<text x="${cx + 27}" y="${cy + 48}" font-size="9" fill="#8b95a5" text-anchor="middle">${it.label}</text>`;
  });
  y += Math.ceil(g.items.length / COLS) * CELL + 18;
}

const W = 16 + COLS * CELL + 16;
const H = y + 10;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${body}</svg>`;
console.log(`SVG_LENGTH ${svg.length}`);
process.stdout.write(svg);
