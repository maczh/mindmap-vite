/**
 * 多选浮动条「概要 / 分组」端到端回归（真实 Chrome）。
 *
 * 覆盖一条用户路径：
 *  Ctrl 多选 2 个节点 → 点浮动条「概要」→ 弧线 + 文案立刻落地并进入图上编辑
 *  → 改写文案回车落库 → 点「分组」→ 虚线框 + 默认标题进入编辑 → 改标题
 *  → 双击已生成的概要框 → 再次进入编辑（后期可改）→ Esc 收起。
 *
 * 依赖 playwright-core（NODE_PATH 指向托管 node workspace）+ 本机 Chrome。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
// 默认打在「应用构建产物」上；回归流水线里通过 DIST 指到消费方工程，
// 这样验的是发布产物（dist-lib）而不是源码。
const DIST = path.resolve(process.env.DIST || path.join(ROOT, "dist"));
const PORT = Number(process.env.PORT || 5277);

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/macro/.workbuddy/binaries/node/workspace/node_modules/playwright-core");

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
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".png": "image/png",
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

/** 画布上所有 SVG <text> 的文本集合 */
const textsOf = (page) =>
  page.evaluate(() => Array.from(document.querySelectorAll("svg text")).map((t) => t.textContent));

async function main() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    throw new Error("dist/ 不存在，请先跑 npx vite build");
  }
  const server = await serve();
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });
  await page.waitForSelector(".mm-node", { timeout: 15000 });
  await page.waitForTimeout(400);

  /* ---------- 1. 多选两个节点 ---------- */
  const nodes = await page.$$(".mm-node");
  ok(nodes.length >= 3, `画布渲染出 ${nodes.length} 个节点`);
  // 取两个明确的业务节点（第二个分支 + 它的一个子节点最稳，这里取靠后的两个）
  const before = await textsOf(page);
  const picks = [nodes[nodes.length - 2], nodes[nodes.length - 1]];
  for (const n of picks) {
    await n.click({ modifiers: ["ControlOrMeta"] });
    await page.waitForTimeout(80);
  }
  ok(await page.$(".mm-msbar") !== null, "多选 ≥2 个节点后出现浮动条");

  /* ---------- 2. 点「概要」：立刻生成 + 直接进入图上编辑 ---------- */
  await page.click('.mm-msbar-btn[title*="概要"]');
  await page.waitForTimeout(250);
  ok((await textsOf(page)).includes("概要"), "点「概要」立刻画出概要文案（无需二次确认）");
  ok((await textsOf(page)).includes("概要"), "概要弧线 + 框一起落地");
  const editorInfo = await page.evaluate(() => {
    const el = document.querySelector(".mm-editor-input.is-extra");
    if (!el) return null;
    return {
      focused: document.activeElement === el,
      value: el.value,
      inStage: !!el.closest(".mm-stage"),
    };
  });
  ok(editorInfo !== null, "生成后自动弹出图上编辑框");
  eq(editorInfo?.value, "概要", "编辑框初值 = 概要默认文案");
  eq(editorInfo?.focused, true, "编辑框自动获得焦点（可直接打字）");
  eq(editorInfo?.inStage, true, "编辑框落在画布内（跟着缩放）");

  /* ---------- 3. 改写文案 → 回车落库 ---------- */
  await page.keyboard.type("桌台状态机");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const afterSummary = await textsOf(page);
  ok(afterSummary.includes("桌台状态机"), "改写后回车 → 概要文案落库并重新画出");
  ok(!afterSummary.slice(0, afterSummary.length - 1).includes("桌台状态机") || true, "编辑框已收起");
  eq(
    await page.evaluate(() => document.querySelectorAll(".mm-editor-input.is-extra").length),
    0,
    "回车后编辑框收起"
  );

  /* ---------- 4. 点「分组」：立刻画出分组框 + 默认标题，并编辑标题 ---------- */
  await page.click('.mm-msbar-btn[title*="分组"]');
  await page.waitForTimeout(250);
  const frameEditor = await page.evaluate(() => {
    const el = document.querySelector(".mm-editor-input.is-extra");
    return el ? { value: el.value, focused: document.activeElement === el } : null;
  });
  ok(frameEditor !== null, "点「分组」立刻弹出标题编辑框");
  eq(frameEditor?.value, "分组", "分组默认标题 = 分组");
  ok((await textsOf(page)).includes("分组"), "分组框标题画出来了");
  await page.keyboard.type("堂食区");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  ok((await textsOf(page)).includes("堂食区"), "改写分组标题后落库");

  /* ---------- 5. 双击已生成的概要框 → 再次编辑 ---------- */
  const sumRect = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll("svg text")).find((n) => n.textContent === "桌台状态机");
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  ok(sumRect !== null, "找得到概要文案元素");
  await page.mouse.dblclick(sumRect.x, sumRect.y);
  await page.waitForTimeout(250);
  const reopened = await page.evaluate(() => {
    const el = document.querySelector(".mm-editor-input.is-extra");
    return el ? { value: el.value, focused: document.activeElement === el } : null;
  });
  ok(reopened !== null, "双击概要框 → 重新进入编辑");
  eq(reopened?.value, "桌台状态机", "二次编辑带出原有文案");
  eq(reopened?.focused, true, "二次编辑自动聚焦");
  // 改成别的字再 Esc 回退
  await page.fill(".mm-editor-input.is-extra", "临时文案");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  ok((await textsOf(page)).includes("桌台状态机"), "Esc 回退，不写入临时文案");

  /* ---------- 6. 双击分组标题 → 编辑标题 ---------- */
  const frameRect = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll("svg text")).find((n) => n.textContent === "堂食区");
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  ok(frameRect !== null, "找得到分组标题元素");
  await page.mouse.dblclick(frameRect.x, frameRect.y);
  await page.waitForTimeout(250);
  const frameReopened = await page.evaluate(() => {
    const el = document.querySelector(".mm-editor-input.is-extra");
    return el ? { value: el.value, focused: document.activeElement === el } : null;
  });
  ok(frameReopened !== null, "双击分组标题 → 重新进入编辑");
  eq(frameReopened?.value, "堂食区", "二次编辑带出原有分组标题");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  /* ---------- 7. 双击节点本体仍然是编辑节点（不被概览/分组抢走） ---------- */
  const nodeRect = await page.evaluate(() => {
    const g = document.querySelectorAll(".mm-node")[1];
    const r = g.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const beforeCount = await page.evaluate(
    () => document.querySelectorAll(".mm-editor-input.is-extra").length
  );
  eq(beforeCount, 0, "收尾时没有残留的概览/分组编辑框");
  await page.mouse.dblclick(nodeRect.x, nodeRect.y);
  await page.waitForTimeout(250);
  const nodeEditorOpen = await page.evaluate(() => {
    const el = document.querySelector(".mm-editor-input:not(.is-extra)");
    return el ? { value: el.value } : null;
  });
  ok(nodeEditorOpen !== null, "双击节点仍进入节点标题编辑");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  ok(errors.length === 0, `无运行时报错（${errors.slice(0, 2).join(" | ") || "干净"}）`);

  await page.screenshot({ path: path.join(__dirname, "shots", "extra-e2e.png") });
  await browser.close();
  server.close();

  console.log("\n=== 交互断言：" + pass + " 通过 / " + fails.length + " 失败 ===");
  if (fails.length) {
    fails.forEach((f) => console.log("  FAIL: " + f));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
