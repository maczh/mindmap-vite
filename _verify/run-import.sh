#!/bin/bash
export HOME=${HOME:-/home/macro}
cd /home/macro/WorkBuddy/2026-09-29-22-26-44/youdao-mindmap-vite || exit 1
P=$(pwd); V=$P/_verify; SHOTS=$P/shots-interaction

/home/macro/.workbuddy/binaries/python/versions/3.13.12/bin/python3 -m http.server 8126 --directory "$P/dist" >/tmp/static4.log 2>&1 &
SRV=$!
for i in $(seq 1 40); do curl -sf -o /dev/null http://localhost:8126/ && break; sleep 0.25; done
echo "http=$(curl -s -o /dev/null -w %{http_code} http://localhost:8126/)"

agent-browser close >/dev/null 2>&1
agent-browser open http://localhost:8126 >/dev/null 2>&1
sleep 3

echo "===== ① 初始 ====="
agent-browser eval --stdin < $V/c-struct.js 2>&1 | tail -1
agent-browser eval --stdin < $V/c-snap.js 2>&1 | tail -4

echo "===== ② 导入 hxdd-timeline.smm（layout=timeline，复现时间轴绘制错误）====="
agent-browser upload ".mm-file-input" "$V/hxdd-timeline.smm" >/dev/null 2>&1
sleep 1.8
agent-browser eval --stdin < $V/c-struct.js 2>&1 | tail -1
agent-browser eval --stdin < $V/c-snap.js 2>&1 | tail -4
agent-browser screenshot $SHOTS/13-timeline-bug.png >/dev/null 2>&1 && echo "shot: 13-timeline-bug.png"

echo "===== ③ 导入 hxdd-mindmap.smm（layout=mindMap）====="
agent-browser upload ".mm-file-input" "$V/hxdd-mindmap.smm" >/dev/null 2>&1
sleep 1.8
agent-browser eval --stdin < $V/c-struct.js 2>&1 | tail -1
agent-browser eval --stdin < $V/c-snap.js 2>&1 | tail -4
agent-browser screenshot $SHOTS/14-import-smm.png >/dev/null 2>&1 && echo "shot: 14-import-smm.png"

echo "===== ④ 导入 hxdd.mm（FreeMind，无结构标记）====="
agent-browser upload ".mm-file-input" "$V/hxdd.mm" >/dev/null 2>&1
sleep 1.8
agent-browser eval --stdin < $V/c-struct.js 2>&1 | tail -1
agent-browser eval --stdin < $V/c-snap.js 2>&1 | tail -4
agent-browser screenshot $SHOTS/12-import-mm.png >/dev/null 2>&1 && echo "shot: 12-import-mm.png"

echo "===== 控制台错误 ====="
agent-browser console 2>&1 | grep -iE "error|uncaught" | head -8 || echo "(none)"

agent-browser close >/dev/null 2>&1
kill $SRV 2>/dev/null
echo "===== DONE ====="
