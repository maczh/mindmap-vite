/**
 * 构建产物静态校验： packaged 产物齐全 + exports 字段自洽 + 关键导出存在。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist-lib");

let pass = 0;
const fails = [];
function ok(cond, label) {
  if (cond) {
    pass += 1;
    console.log("  ✓ " + label);
  } else {
    fails.push(label);
    console.log("  ✗ " + label);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const must = [
  "mindmap-vite.es.js",
  "mindmap-vite.umd.js",
  "style.css",
  "components/MindMap/index.d.ts",
  "components/MindMap/types.d.ts",
  "components/MindMap/MindMap.d.ts",
];
must.forEach((f) => ok(fs.existsSync(path.join(DIST, f)), `产物存在 ${f}`));

ok(pkg.main.includes("umd"), "main 指向 UMD");
ok(pkg.module.includes(".es.js"), "module 指向 ESM");
ok(!!pkg.types && fs.existsSync(path.join(ROOT, pkg.types)), "types 指向真实 d.ts");
ok(!!pkg.style && fs.existsSync(path.join(ROOT, pkg.style)), "style 指向真实 CSS");
ok(!!pkg.exports["."] && !!pkg.exports["./style.css"], "exports 含 . 与 ./style.css");

const es = fs.readFileSync(path.join(DIST, "mindmap-vite.es.js"), "utf8");
const umd = fs.readFileSync(path.join(DIST, "mindmap-vite.umd.js"), "utf8");
[
  ["ESM", path.join(ROOT, pkg.module)],
  ["UMD", path.join(ROOT, pkg.main)],
].forEach(([tag, file]) => {
  const f = fs.readFileSync(file, "utf8");
  ok(!/MindMap\.css/.test(f), `${tag} 产物未内联源样式 import（CSS 单独输出）`);
});
["MindMap", "layoutTree", "THEME_LIST", "parseFreeMind", "adaptYoudaoMindmap"].forEach((name) => {
  ok(es.includes(name), `ESM 产物含导出 ${name}`);
});
ok(umd.includes("MindMapVite"), "UMD 使用全局名 MindMapVite");
ok(/"react"|'react'/.test(es), "ESM 将 react 作为外部依赖");
const cssOut = fs.readFileSync(path.join(DIST, "style.css"), "utf8");
ok(cssOut.length > 5000, `style.css 有 ${cssOut.length} 字节`);
ok(cssOut.includes(".mm-wrap") && cssOut.includes(".mm-node"), "style.css 含组件核心样式类");

const dts = fs.readFileSync(path.join(DIST, "components/MindMap/types.d.ts"), "utf8");
["MindMapProps", "MindMapApi", "MindNode", "BaseStyle", "LinkPattern", "MindNodeImage"].forEach((n) =>
  ok(dts.includes(n), `d.ts 声明 ${n}`)
);
const indexDts = fs.readFileSync(path.join(DIST, "components/MindMap/index.d.ts"), "utf8");
ok(indexDts.includes("MindMap"), "index.d.ts 导出 MindMap 组件");

const cssFiles = fs.readdirSync(DIST).filter((f) => f.endsWith(".css"));
ok(cssFiles.length === 1, `dist-lib 只有 1 个 CSS 产物（${cssFiles.join(",")}）`);

console.log("\n=== 产物校验：" + pass + " 通过 / " + fails.length + " 失败 ===");
if (fails.length) process.exit(1);
