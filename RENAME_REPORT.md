# 仓库改名报告：youdao-mindmap-vite → mindmap-vite

## 一、改了什么

| 项目 | 原来 | 现在 |
| --- | --- | --- |
| 仓库目录 | `github.com/maczh/youdao-mindmap-vite/` | `github.com/maczh/mindmap-vite/` |
| npm 包名 | `youdao-mindmap-vite` | `mindmap-vite` |
| 版本号 | `0.1.0` | `0.2.0` |
| 本地主分支 | `main` | `mindmap-vite` |
| origin 远端 | `https://github.com/maczh/youdao-mindmap-vite.git` | `https://github.com/maczh/mindmap-vite.git` |
| 库产物 | `dist-lib/youdao-mindmap.{es,umd}.js` | `dist-lib/mindmap-vite.{es,umd}.js` |
| UMD 全局名 | `YoudaoMindMap` | `MindMapVite` |

`package.json` / `package-lock.json`（`name` + `version` + `packages[""]`）/ `vite.lib.config.ts` /
`README.md` 同步改完，`git` 工作区文件本身无重命名变动（`git status` 仍只显示 5 个内容修改项）。

## 二、其他项目怎么引用

```tsx
// 新的引用方式
import { MindMap, parseMindmapFile, type MindNode } from "mindmap-vite";

// 旧的 import 路径已失效（包名变更属于 breaking，故小版本 0.1.0 -> 0.2.0）
// import { MindMap } from "youdao-mindmap-vite";
```

## 三、需要你手动做的一步

本机没有 `gh` CLI，**GitHub 上的仓库名需要你在网页端改**：

> https://github.com/maczh/youdao-mindmap-vite →Settings → Rename repository → `mindmap-vite`

分支名同理：`main` 分支在远端也要改成 `mindmap-vite`（或在改动后执行
`git push -u origin mindmap-vite:mindmap-vite`）。**顺序建议**：先在 GitHub 上改仓库名，
再 push，否则 `git push` 会 404。

## 四、顺带清理

`_verify/` 下 8 个验证脚本里写死的旧绝对路径（原本指向旧的 WorkBuddy 临时目录，早已失效）已统一改为当前仓库路径：

- `_verify/run.sh`、`verify-font.sh`、`verify-interaction2.sh`、`capture.sh`、`capture-fb.sh`
- `_verify/fb-colors.py`、`fb-style-check.py`、`gen-fixtures.ts`

历史 `*_REPORT.md` 里出现的 `youdao-mindmap-vite` 标签是当时的记录，**未改动**。

## 五、过程中的一个坑（留给后续）

直接 `mv` 仓库目录会失败：`rename(2)` 对「某个进程的 cwd 所在目录」返回 `EBUSY`，
本机 WorkBuddy 的常驻进程（codebuddy 预热池、weixinpay / sheetagent MCP server、sandbox-cli）
cwd 都在该目录里。可行做法是「新建目录 → 逐项 `mv` 内容 → `rmdir` 旧目录」。

但删掉旧目录后，**本会话的 shell 会永久失效**——持久 cwd 指向已 unlink 的目录 inode，
此后任何终端命令（连 `cd /tmp`）都会被拦下，Grep 工具同理。
所以：**移动仓库目录必须是操作的最后一步**，之前该跑的命令、该跑的构建都先做完。
本次报告末尾的脚本修改因此改用文件编辑逐条完成。
