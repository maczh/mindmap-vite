#!/bin/bash
export HOME=${HOME:-/home/macro}
cd /home/macro/Work/js/src/github.com/maczh/mindmap-vite || exit 1
P=$(pwd)
V=$P/_verify
SHOTS=$P/shots-interaction

/home/macro/.workbuddy/binaries/python/versions/3.13.12/bin/python3 -m http.server 8123 --directory "$P/dist" >/tmp/static.log 2>&1 &
SRV=$!
for i in $(seq 1 40); do curl -sf -o /dev/null http://localhost:8123/ && break; sleep 0.25; done
echo "http=$(curl -s -o /dev/null -w %{http_code} http://localhost:8123/)"

agent-browser close >/dev/null 2>&1
agent-browser open http://localhost:8123 >/dev/null 2>&1
sleep 3

echo "===== P1 右键环形菜单圆底透明度 ====="
agent-browser eval --stdin < $V/r1-radial.js 2>&1 | tail -25
agent-browser screenshot $SHOTS/07-radial-menu-80pct-transparent.png >/dev/null 2>&1 && echo "shot: 07-radial-menu-80pct-transparent.png"

for f in smm-left.smm km-right.km km-default.km; do
  echo "===== 导入 $f ====="
  agent-browser upload ".mm-file-input" "$V/$f" >/dev/null 2>&1
  sleep 1.4
  agent-browser eval --stdin < $V/r2-import.js 2>&1 | tail -14
done
agent-browser screenshot $SHOTS/08-import-structure.png >/dev/null 2>&1 && echo "shot: 08-import-structure.png"

echo "===== 控制台错误 ====="
agent-browser console 2>&1 | grep -iE "error|uncaught" | head -10 || echo "(none)"

agent-browser close >/dev/null 2>&1
kill $SRV 2>/dev/null
echo "===== DONE ====="
