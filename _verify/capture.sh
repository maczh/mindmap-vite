#!/usr/bin/env bash
set -u
cd /home/macro/Work/js/src/github.com/maczh/mindmap-vite

# 本机 shell 无有效 HOME（解析到 /root 且无权限）→ agent-browser 无法建 socket 目录
export HOME=/home/macro
export XDG_RUNTIME_DIR=/tmp

ulimit -n 65535
export CHOKIDAR_USEPOLLING=true

PORT=5183
OUT=/home/macro/Work/js/src/github.com/maczh/mindmap-vite/timeline-shots
mkdir -p "$OUT"

# ---- 启动 vite（同一条前台命令内，保证截图期间存活）----
npx vite --port $PORT --strictPort >/tmp/vite.log 2>&1 &
VPID=$!
echo "vite pid=$VPID"

# 等待 HTTP 就绪
for i in $(seq 1 60); do
  if curl -sf "http://localhost:$PORT/" >/dev/null 2>&1; then echo "http ready after ${i}s"; break; fi
  sleep 1
done

# 等待页面真正渲染出节点（避免冷启动 transform 未完成的空白截图）
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

# ---- 1) 完整时间轴（sampleTree）----
wait_render "http://localhost:$PORT/_verify/tl-sample.html" "app-timeline"
hide_chrome
sleep 2
agent-browser screenshot "$OUT/app-timeline.png"
echo "saved app-timeline.png"

# ---- 2) 深树（4 层）----
wait_render "http://localhost:$PORT/_verify/tl-deep.html" "deep-tree"
hide_chrome
sleep 2
agent-browser screenshot "$OUT/deep-tree.png"
echo "saved deep-tree.png"

# ---- 3) 交互一致性实测：对二级节点单击选中 + 右键弹出浮动圆盘菜单 ----
wait_render "http://localhost:$PORT/_verify/tl-sample.html" "interaction"
hide_chrome
sleep 1
# 找一个二级节点（按其文字内容定位）
IDX=$(agent-browser eval "Array.from(document.querySelectorAll('.mm-node')).findIndex(function(n){return n.textContent.indexOf('包厢/散台模型')>=0;})" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "L2 node index = ${IDX:-NA}"
if [ -n "$IDX" ] && [ "$IDX" -ge 0 ] 2>/dev/null; then
  # 单击 → 选中（应出现 .mm-ui-only 虚线框）
  agent-browser eval "document.querySelectorAll('.mm-node')[$IDX].dispatchEvent(new MouseEvent('click',{bubbles:true}))" >/dev/null 2>&1
  sleep 1
  SEL=$(agent-browser eval "document.querySelectorAll('.mm-node')[$IDX].querySelector('.mm-ui-only')!==null" 2>/dev/null | grep -oE '(true|false)' | head -1)
  echo "L2 click -> selected(dashed box) = ${SEL:-NA}"
  agent-browser screenshot "$OUT/elbow-detail.png"
  echo "saved elbow-detail.png (L2 selected)"
  # 右键 → 浮动圆盘菜单
  agent-browser eval "document.querySelectorAll('.mm-node')[$IDX].dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:200,clientY:200}))" >/dev/null 2>&1
  sleep 1
  RAD=$(agent-browser eval "document.querySelectorAll('.mm-radial').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
  echo "L2 right-click -> .mm-radial count = ${RAD:-NA}"
  agent-browser screenshot "$OUT/interaction-l2.png"
  echo "saved interaction-l2.png (radial menu on L2)"
else
  echo "SKIP interaction test (no L2 node found)"
fi

# ---- 收尾 ----
kill $VPID 2>/dev/null
agent-browser close >/dev/null 2>&1
echo "DONE"
