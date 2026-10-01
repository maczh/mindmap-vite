# mindmap-vite 回归测试

`npm run verify`（即 `bash verify/run.sh`）依次跑完 8 个阶段，任一阶段失败即整体失败：

| 阶段 | 脚本 | 内容 |
| --- | --- | --- |
| 1 | `tsc -b --force` | 源码类型检查（strict + noUnusedLocals） |
| 2 | `npm run build:lib` | 库产物：ESM + UMD + style.css + d.ts |
| 3 | `logic.entry.ts`（esbuild → node） | 纯逻辑断言：树操作 / 布局 / 主题常量 / 导入导出 / 有道适配 |
| 4 | `artifacts.mjs` | 产物静态校验：文件齐全、`exports` 自洽、关键导出、d.ts 声明 |
| 5 | `ssr.entry.tsx`（esbuild → node） | 用 `react-dom/server` 直接 import **dist-lib** 渲染，验证产物可被外部 React 消费 |
| 6 | `vite build --config verify/consumer/vite.config.ts` | 构建消费方工程（main.tsx 以包名 `mindmap-vite` 引入 dist-lib） |
| 7 | `browser.mjs` | 无头 Chrome 打开消费方工程：渲染、7 种结构、- 编辑/缩放、只读态、工具条面板、导入导出、导出 SVG、运行时 0 报错，并截图到 `verify/shots/consumer.png` |
| 8 | 汇总 | 全部通过 |

## 运行前提

- Node 18+，已 `npm i`
- 浏览器阶段：`playwright-core`（本机或 `NODE_PATH` 指向已装 playwright-core 的 node_modules）
  + 本机 Chrome（`/Applications/Google Chrome.app/...`，可用 `PLAYWRIGHT_CHROME` 覆盖，
  也可回落到 playwright 自带 chromium）
- `PORT`（默认 5199）未被占用

## 单独跑某一步

```bash
export PATH=/Users/macro/.workbuddy/binaries/node/versions/22.22.2-3/bin:$PATH
node verify/artifacts.mjs
node verify/.tmp/logic.cjs            # 需先 esbuild 打包（见 run.sh）
NODE_PATH=<含 playwright-core 的 node_modules> node verify/browser.mjs
```

## 断言口径

- 节点数 / 连线数按「根 + 5 个分支 + 1 个子孙 = 7 节点 / 6 连线」计算（见 `consumer/main.tsx` 的 fixture）。
- 补齐项断言：缩略图 `<image>` ×1、katex `foreignObject` ×1、圆角 `rect` ≥1。
- 7 种结构渲染出来的签名互不相同，防止「结构切换其实没生效」。
- 运行时错误同时检查 `pageerror` + `console.error` + 组件内 `window.onerror` 兜底收集。
