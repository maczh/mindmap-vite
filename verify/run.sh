#!/usr/bin/env bash
# ============================================================
# mindmap-vite 组件包回归测试（npm run verify）
#
#   0. 类型检查（tsc -b）
#   1. 库构建（ESM + UMD + CSS + d.ts）
#   2. 逻辑断言（树 / 布局 / 主题 / io 往返 / 有道适配，纯 Node）
#   3. 产物静态校验（文件齐全 + exports 自洽 + 关键导出）
#   4. 产物消费校验（react-dom/server 直接 import dist-lib 渲染）
#   5. 浏览器回归（真实 Chrome 打开消费方工程，含截图）
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

# playwright-core 走 NODE_PATH（ESM 不认 PATH，需要显式指到 node_modules）
DEFAULT_NODE=/Users/macro/.workbuddy/binaries/node/versions/22.22.2-3/bin/node
NODE=${NODE:-$(command -v node || echo "$DEFAULT_NODE")}
export NODE_PATH=${NODE_PATH:-}
export PATH="$(dirname "$NODE"):$PATH"
export TMPDIR=${TMPDIR:-/tmp}
mkdir -p verify/.tmp verify/shots verify/consumer/node_modules

step() { printf "\n\033[1m%s\033[0m\n" "$1"; }
fail() { printf "\n\033[31m✗ %s\033[0m\n" "$1"; exit 1; }

step "STEP 0 · 清理旧产物"
rm -rf dist-lib verify/consumer/dist verify/.tmp/logic.cjs verify/.tmp/ssr.cjs

step "STEP 1 · 类型检查（tsc -b）"
./node_modules/.bin/tsc -b --force || fail "tsc 类型检查失败"

step "STEP 2 · 构建库产物（build:lib）"
npm run build:lib --silent || fail "build:lib 失败"

step "STEP 3 · 逻辑断言（Node）"
./node_modules/.bin/esbuild verify/logic.entry.ts \
  --bundle --platform=node --format=cjs --target=node18 \
  --loader:.css=empty --outfile=verify/.tmp/logic.cjs --log-level=error \
  || fail "logic.entry.ts 打包失败"
"$NODE" verify/.tmp/logic.cjs || fail "逻辑断言失败"

step "STEP 4 · 产物静态校验"
"$NODE" verify/artifacts.mjs || fail "产物校验失败"

step "STEP 5 · 构建产物消费（react-dom/server）"
./node_modules/.bin/esbuild verify/ssr.entry.tsx \
  --bundle --platform=node --format=cjs --target=node18 --jsx=automatic \
  --alias:mindmap-vite=./dist-lib/mindmap-vite.es.js \
  --external:react --external:react-dom --external:react/jsx-runtime \
  --loader:.css=empty --outfile=verify/.tmp/ssr.cjs --log-level=error \
  || fail "ssr.entry.tsx 打包失败"
"$NODE" verify/.tmp/ssr.cjs || fail "SSR 消费断言失败"

step "STEP 6 · 构建消费方工程"
ln -sfn "$(pwd)" verify/consumer/node_modules/mindmap-vite
for d in react react-dom react-dom/client react/jsx-runtime scheduler katex jszip; do
  [ -e "node_modules/$d" ] && ln -sfn "$(pwd)/node_modules/$d" "verify/consumer/node_modules/$d"
done
./node_modules/.bin/vite build --config verify/consumer/vite.config.ts --logLevel warn \
  || fail "消费方工程构建失败"

step "STEP 7 · 浏览器回归（Chrome 无头）"
"$NODE" verify/browser.mjs || fail "浏览器回归失败"

step "回归全部通过 ✅"
