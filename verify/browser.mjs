/**
 * 浏览器端回归：用构建产物（dist-lib）在真实 Chrome 里跑消费方工程。
 * 依赖 playwright-core（通过 NODE_PATH 指向托管 node workspace 即可）。
 *
 * 环境探测顺序（按顺序取第一个存在的）：
 *   1. PLAYWRIGHT_CHROME 环境变量
 *   2. /Applications/Google Chrome.app/Contents/MacOS/Google Chrome（macOS）
 *   3. ~/Library/Caches/ms-playwright/chrome 下的 chrome 可执行文件（linux）
 *   4. playwright-core 自带的 chromium 执行路径
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(__dirname, "consumer", "dist");
const PORT = Number(process.env.PORT || 5199);

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
function eq(a, b, label) {
  ok(a === b, `${label}（期望 ${b}，实得 ${a}）`);
}

const MIME = {
  ".html": "text/html;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".mjs": "text/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".map": "application/json;charset=utf-8",
};

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(DIST, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, "index.html");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

function findChrome() {
  if (process.env.PLAYWRIGHT_CHROME && fs.existsSync(process.env.PLAYWRIGHT_CHROME))
    return process.env.PLAYWRIGHT_CHROME;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(mac)) return mac;
  const linuxRoot = path.join(os.homedir(), "Library/Caches/ms-playwright/chrome");
  if (fs.existsSync(linuxRoot)) {
    const hit = fs.readdirSync(linuxRoot).map((d) => path.join(linuxRoot, d, "chrome")).find((p) => fs.existsSync(p));
    if (hit) return hit;
  }
  return undefined; // 交给 playwright-core 自带浏览器
}

const server = await serve();
// playwright-core 是 CJS 入口，chromium 既可能在具名导出上，也可能挂在默认实例上
async function loadPlaywright() {
  const candidates = [
    "playwright-core",
    path.join(os.homedir(), ".workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js"),
  ];
  for (const c of candidates) {
    try {
      const mod = await import(c);
      const pw = mod.chromium ? mod : mod.default;
      if (pw && pw.chromium) return pw.chromium;
    } catch {
      /* 换下一个候选 */
    }
  }
  console.error("缺少 playwright-core，请设置 NODE_PATH 指向含有 playwright-core 的 node_modules");
  process.exit(1);
}
const chromium = await loadPlaywright();

const exe = findChrome();
const browser = await chromium.launch({
  headless: true,
  executablePath: exe,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e.message)));
page.on("console", (m) => {
  if (m.type() === "error") pageErrors.push("console.error: " + m.text());
});

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__probe && window.__probe.ready, null, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll(".mm-node").length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(900); // fitOnMount 的双次延时

  console.log("\n[渲染]");
  const s0 = await page.evaluate(() => window.__probe.snapshot());
  eq(s0.hasSvg, true, "渲染出 svg.mm-svg");
  eq(s0.nodeCount, 7, "节点数 = 7（根 + 5 分支 + 1 子孙）");
  eq(s0.linkCount, 6, "连线数 = 6");
  ok(s0.toolbarButtons >= 10, `工具栏按钮 ${s0.toolbarButtons} 个（>=10）`);
  eq(s0.imageCount, 1, "缩略图 <image> 渲染 1 个");
  eq(s0.foreignObjectCount, 1, "katex 公式 foreignObject 渲染 1 个");
  ok(s0.rectWithRx >= 1, `圆角矩形 ${s0.rectWithRx} 个`);
  eq(s0.mode, "edit", "初始为编辑态");
  ok(s0.scale > 0, `fitOnMount 后 scale=${Number(s0.scale).toFixed(2)}`);

  console.log("\n[结构切换]");
  const sigs = [];
  for (let i = 0; i < 7; i += 1) {
    await page.click("#btn-structure");
    await page.waitForTimeout(450);
    const s = await page.evaluate(() => window.__probe.snapshot());
    sigs.push(`${s.structureNow}:${s.nodeCount}:${s.pathCount}`);
    ok(
      !!s.structureNow && s.structureNow !== "" && s.hasSvg,
      `结构 ${s.structureNow} 渲染正常`
    );
  }
  ok(new Set(sigs).size >= 5, `7 种结构渲染互不相同（去重 ${new Set(sigs).size} 种）`);

  console.log("\n[编辑 / API]");
  const beforeAdd = await page.evaluate(() => window.__probe.snapshot());
  await page.click("#btn-add");
  await page.waitForTimeout(400);
  const afterAdd = await page.evaluate(() => window.__probe.snapshot());
  eq(afterAdd.treeNodes, beforeAdd.treeNodes + 1, "addChild 后节点数 +1");
  await page.click("#btn-zoom");
  await page.waitForTimeout(300);
  const afterZoom = await page.evaluate(() => window.__probe.snapshot());
  ok(afterZoom.scale > 0.01, `zoomIn 后 scale=${Number(afterZoom.scale).toFixed(2)}`);

  console.log("\n[只读 / 选中态]");
  const editUi = await page.evaluate(() => window.__probe.snapshot());
  await page.click("#btn-toggle");
  await page.waitForTimeout(600);
  const readOnly = await page.evaluate(() => window.__probe.snapshot());
  eq(readOnly.mode, "readonly", "切到只读渲染");
  eq(readOnly.uiOnly, 0, "只读态没有 mm-ui-only 选中环");
  eq(editUi.uiOnly >= 0, true, "编辑态记录到选中环");
  await page.click("#btn-toggle");
  await page.waitForTimeout(500);
  const backEdit = await page.evaluate(() => window.__probe.snapshot());
  eq(backEdit.mode, "edit", "切回编辑态");
  ok(backEdit.uiOnly >= 1, `编辑态出现选中环 ${backEdit.uiOnly} 个`);

  console.log("\n[工具栏交互]");
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll(".mm-tb-combo-text")).find((e) =>
      (e.textContent || "").includes("结构")
    );
    el?.click();
  });
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => window.__probe.snapshot());
  ok(panel.structureCards >= 5, `结构面板展开出 ${panel.structureCards} 张结构卡`);
  await page.keyboard.press("Escape");

  console.log("\n[导入导出]");
  const io = await page.evaluate(() => {
    const io = window.__probe.io;
    const tree = window.__probe.api.getTree();
    const smm = JSON.parse(io.exportSmm(tree));
    const xml = `<?xml version="1.0"?><map version="1.0.1"><node TEXT="导入根"><node TEXT="子一"/></node></map>`;
    const fm = io.parseFreeMind(xml);
    return {
      smmRoot: smm.root.data.text,
      smmChildren: smm.root.children.length,
      fmRoot: fm.title,
      fmChildren: fm.children[0].title,
      mapFishbone: io.mapFileStructure("fishbone"),
      mapLogical: io.mapFileStructure("logicalStructure"),
      mapUnknown: io.mapFileStructure("zzz"),
    };
  });
  eq(io.smmRoot, "导出验证中心", ".smm 导出根文本");
  ok(io.smmChildren >= 5, ".smm 导出子节点齐全");
  eq(io.fmRoot, "导入根", "FreeMind 导入根");
  eq(io.fmChildren, "子一", "FreeMind 导入子节点");
  eq(io.mapFishbone, "fishbone", "mapFileStructure(fishbone)");
  eq(io.mapLogical, "logical-right", "mapFileStructure(logicalStructure)");
  eq(io.mapUnknown, undefined, "mapFileStructure 未知值返回 undefined");

  console.log("\n[导出 SVG]");
  const svg = await page.evaluate(() => {
    const p = window.__probe.api.getSvg();
    return { isObject: !!p, len: String(p && p.svg ? p.svg.length : 0), hasNode: String(p && p.svg).includes("mm-node") };
  });
  ok(svg.isObject && svg.len > 1000, `getSvg 产出 ${svg.len} 字符`);
  ok(svg.hasNode, "导出 SVG 内含 mm-node");

  console.log("\n[运行时错误]");
  const probeErrors = await page.evaluate(() => window.__probe.errors);
  eq(pageErrors.length, 0, "页面控制台/异常 0 条" + (pageErrors.length ? "：" + pageErrors.join(" | ") : ""));
  eq(probeErrors.length, 0, "组件内捕获的错误 0 条" + (probeErrors.length ? "：" + probeErrors.join(" | ") : ""));

  fs.mkdirSync(path.join(__dirname, "shots"), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, "shots", "consumer.png"), fullPage: false });
} finally {
  await browser.close();
  server.close();
}

console.log("\n=== 浏览器断言：" + pass + " 通过 / " + fails.length + " 失败 ===");
if (fails.length) {
  fails.forEach((f) => console.log("  FAIL: " + f));
  process.exit(1);
}
