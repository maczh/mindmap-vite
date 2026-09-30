#!/usr/bin/env bash
set -u
cd /home/macro/WorkBuddy/2026-09-29-22-26-44/youdao-mindmap-vite

export HOME=/home/macro
export XDG_RUNTIME_DIR=/tmp
ulimit -n 65535
export CHOKIDAR_USEPOLLING=true

PORT=5184
npx vite --port $PORT --strictPort >/tmp/vite2.log 2>&1 &
VPID=$!
for i in $(seq 1 60); do curl -sf "http://localhost:$PORT/" >/dev/null 2>&1 && break; sleep 1; done

agent-browser open "http://localhost:$PORT/_verify/tl-sample.html" >/dev/null 2>&1
for i in $(seq 1 60); do
  n=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
  [ -n "$n" ] && [ "$n" -gt 0 ] 2>/dev/null && { echo "rendered $n nodes after ${i}s"; break; }
  sleep 1
done
sleep 2

fs_of () { agent-browser eval "getComputedStyle($1.querySelector('text')).fontSize" 2>/dev/null | grep -oE '[0-9.]+px' | tail -1; }

echo "== 现有节点字号（默认 fit）=="
echo "root  = $(fs_of "document.querySelectorAll('.mm-node')[0]")   (期望 24px)"
echo "L1    = $(fs_of "document.querySelectorAll('.mm-node')[1]")   (期望 18px)"
echo "L2    = $(fs_of "Array.from(document.querySelectorAll('.mm-node')).filter(function(n){return n.textContent.indexOf('包厢/散台模型')>=0;})[0]")   (期望 11px)"

echo "== 新增节点字号（选中一级「待办」→ 按 Tab 新增子节点）=="
IDX1=$(agent-browser eval "Array.from(document.querySelectorAll('.mm-node')).findIndex(function(n){return n.textContent.indexOf('待办')>=0;})" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "L1 '待办' index = ${IDX1:-NA}"
agent-browser eval "document.querySelectorAll('.mm-node')[$IDX1].dispatchEvent(new MouseEvent('click',{bubbles:true}))" >/dev/null 2>&1
sleep 1
agent-browser eval "document.querySelector('.mm-stage').focus()" >/dev/null 2>&1
N0=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
agent-browser eval "document.querySelector('.mm-stage').dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}))" >/dev/null 2>&1
sleep 1
N1=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "Tab 新增后：$N0 -> $N1 个节点（期望 +1）"
echo "新节点(分支主题)字号 = $(fs_of "Array.from(document.querySelectorAll('.mm-node')).filter(function(n){return n.textContent.indexOf('分支主题')>=0;}).pop()")   (期望 11px)"

echo "== 编辑态按回车 → 新增同级 =="
ED=$(agent-browser eval "document.querySelectorAll('.mm-editor-input').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "编辑框数量 = ${ED:-NA}"
agent-browser eval "document.querySelector('.mm-editor-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))" >/dev/null 2>&1
sleep 1
N2=$(agent-browser eval "document.querySelectorAll('.mm-node').length" 2>/dev/null | grep -oE '[0-9]+' | head -1)
echo "回车后：$N1 -> $N2 个节点（期望 +1，证明回车新增同级）"

kill $VPID 2>/dev/null
agent-browser close >/dev/null 2>&1
echo DONE
