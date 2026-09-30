#!/usr/bin/env bash
set -u
cd /home/macro/WorkBuddy/2026-09-29-22-26-44/youdao-mindmap-vite

# 本机 shell 无有效 HOME（解析到 /root 且无权限）→ agent-browser 无法建 socket 目录
export HOME=/home/macro
export XDG_RUNTIME_DIR=/tmp

ulimit -n 65535
export CHOKIDAR_USEPOLLING=true

PORT=5184
OUT=/home/macro/WorkBuddy/2026-09-29-22-26-44/youdao-mindmap-vite/fb-shots
mkdir -p "$OUT"

# ---- 启动 vite（同一条前台命令内，保证截图期间存活）----
npx vite --port $PORT --strictPort >/tmp/vite-fb.log 2>&1 &
VPID=$!
echo "vite pid=$VPID"

# 等待 HTTP 就绪
for i in $(seq 1 60); do
  if curl -sf "http://localhost:$PORT/" >/dev/null 2>&1; then echo "http ready after ${i}s"; break; fi
  sleep 1
done

wait_render () {
  local url="$1"; local label="$2"
  agent-browser open "$url" >/dev/null 2>&1
  local n=0
  for i in $(seq 1 60); do
    n=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
    if [ -n "$n" ] && [ "$n" -gt 0 ] 2>/dev/null; then echo "$label: rendered $n nodes after ${i}s"; return 0; fi
    sleep 1
  done
  echo "$label: WARN no .mm-node found (n='$n')"
  return 1
}

hide_chrome () {
  agent-browser eval "var s=document.createElement('style');s.textContent='.mm-dock-bl,.mm-hint{display:none!important}';document.head.appendChild(s);" >/dev/null 2>&1
}

wait_render "http://localhost:$PORT/_verify/fb-sample.html" "fishbone"
hide_chrome
sleep 2
agent-browser screenshot "$OUT/fishbone.png"
echo "saved fishbone.png"

# 收尾
kill $VPID 2>/dev/null
agent-browser close >/dev/null 2>&1
echo "DONE"
