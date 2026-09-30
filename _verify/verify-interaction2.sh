#!/usr/bin/env bash
set -u
cd /home/macro/Work/js/src/github.com/maczh/mindmap-vite

export HOME=/home/macro
export XDG_RUNTIME_DIR=/tmp
ulimit -n 65535
export CHOKIDAR_USEPOLLING=true

PORT=5185
npx vite --port $PORT --strictPort >/tmp/vite3.log 2>&1 &
VPID=$!
for i in $(seq 1 60); do curl -sf "http://localhost:$PORT/" >/dev/null 2>&1 && break; sleep 1; done

agent-browser open "http://localhost:$PORT/_verify/tl-sample.html" >/dev/null 2>&1
for i in $(seq 1 60); do
  n=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
  [ -n "$n" ] && [ "$n" -gt 0 ] 2>/dev/null && { echo "rendered $n nodes after ${i}s"; break; }
  sleep 1
done
sleep 2

IDX2=$(agent-browser eval "Array.from(document.querySelectorAll('.mm-node')).findIndex(function(n){return n.textContent.indexOf('包厢/散台模型')>=0;})" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "L2 '包厢/散台模型' index = ${IDX2:-NA}"

echo "== 双击 L2 节点 → 进入编辑 =="
agent-browser eval "document.querySelectorAll('.mm-node')[$IDX2].dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))" >/dev/null 2>&1
sleep 1
ED=$(agent-browser eval "document.querySelectorAll('.mm-editor-input').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "双击后编辑框数量 = ${ED:-0}  (期望 1，证明 L2 可双击编辑)"

echo "== 选定 L2 节点 → Tab 新增下级（L3，应 11px）=建制"
agent-browser eval "document.querySelector('.mm-editor-input') && document.querySelector('.mm-editor-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))" >/dev/null 2>&1
sleep 0.5
agent-browser eval "document.querySelectorAll('.mm-node')[$IDX2].dispatchEvent(new MouseEvent('click',{bubbles:true}))" >/dev/null 2>&1
sleep 0.5
agent-browser eval "document.querySelector('.mm-stage').focus()" >/dev/null 2>&1
N0=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
agent-browser eval "document.querySelector('.mm-stage').dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}))" >/dev/null 2>&1
sleep 1
N1=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "Tab(从L2)后：节点 $N0 -> $N1（期望 +1，新节点为 L3）"
NEWFS=$(agent-browser eval "getComputedStyle(Array.from(document.querySelectorAll('.mm-node')).filter(function(n){return n.textContent.indexOf('分支主题')>=0;}).pop().querySelector('text')).fontSize" 2>/dev/null | grep -oE '[0-9.]+px' | tail -1)
echo "新 L3 节点字号 = ${NEWFS:-NA}  (期望 11px)"

echo "== 选定 L2 节点 → Enter 新增同级（L2 同级）=建制"
agent-browser eval "document.querySelector('.mm-editor-input') && document.querySelector('.mm-editor-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))" >/dev/null 2>&1
sleep 0.5
agent-browser eval "document.querySelectorAll('.mm-node')[$IDX2].dispatchEvent(new MouseEvent('click',{bubbles:true}))" >/dev/null 2>&1
sleep 0.5
agent-browser eval "document.querySelector('.mm-stage').focus()" >/dev/null 2>&1
N2=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
agent-browser eval "document.querySelector('.mm-stage').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))" >/dev/null 2>&1
sleep 1
N3=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "Enter(从L2)后：节点 $N2 -> $N3（期望 +1，新增 L2 同级）"

kill $VPID 2>/dev/null
agent-browser close >/dev/null 2>&1
echo DONE
