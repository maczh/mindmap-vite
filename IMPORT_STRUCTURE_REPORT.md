# 导入即按文件结构绘制 · 验收报告

> 日期：2026-09-30
> 关联需求：打开文件时，先清空当前画布中的原脑图，再载入新脑图文件，按文件中设定的结构绘制。

## 需求拆解

1. **清空画布再载入** —— `dispatch({ type: "reset", tree })` 整体替换文档树，并清空撤销/重做栈（`past:[]`、`future:[]`）、把选中重置为新根节点，原脑图内容不再残留。
2. **按文件中设定的结构绘制** —— 上一轮为「未声明结构时默认思维导图」刻意统一回落 `mindmap`，本轮回正为：**尊重文件显式声明的结构**；仅当文件完全未声明结构时才回落到 `mindmap`。

## 改动文件

| 文件 | 改动 |
| --- | --- |
| `src/components/MindMap/io/index.ts` | `parseMindmapFile` 返回类型由 `MindNode` 改为 `ParsedMindmap { tree; structure?: StructureType }`；新增 `mapFileStructure()` 与各格式结构探测助手；新增导出类型 `ParsedMindmap` |
| `src/components/MindMap/MindMap.tsx` | `handleImport` 解构 `{ tree, structure }`，`setConfig` 设为 `structure ?? "mindmap"`（先 `reset` 清画布，再按文件结构重排） |
| `src/components/MindMap/index.ts` | 重新导出类型 `ParsedMindmap`（公共 API 兼容对齐） |

> 各底层解析器（`parseMindmapJson` / `parseFreeMind` / `parseKityMinderXml` / `parseXmind`）**签名保持不变**，对外仍是 `MindNode`，仅在 `parseMindmapFile` 这一统一入口上附加结构推断 —— 不影响 `dist-lib` 既有使用方。

## 结构推断映射

`mapFileStructure(token)` 对以下来源做大小写无关的子串归一化：

| 来源格式 | 字段 | 示例值 → 内部 `StructureType` |
| --- | --- | --- |
| simple-mind-map `.smm` | `layout` | `logicalStructure`/`logicalRight` → `logical-right`；`logicalLeft` → `logical-left`；`mindmapBalance` → `mindmap`；`catalogOrganization` → `catalog`；`timeline` → `timeline`；`fishbone` → `fishbone` |
| KityMinder `.km`（嵌套 JSON） | `template` | `right` → `logical-right`；`left` → `logical-left`；`both`/`balance`/`default` → `mindmap`；`structure` → `org`；`timeline` → `timeline`；`fishbone` → `fishbone` |
| KityMinder `.km`（XML） | 根 `<topic template="…">` | 同上 |
| XMind `.xmind` | 根 topic `structureClass` | `org.xmind.ui.logic.right` → `logical-right`；`…logic.left` → `logical-left`；`…logic.both`/`…map` → `mindmap`；`…org`/`…org-chart` → `org`；`…spreadsheet` → `catalog`；`…timeline` → `timeline`；`…fishbone` → `fishbone` |
| FreeMind `.mm` | 无结构概念 | `undefined` → 回落 `mindmap` |
| 有道扁平 JSON / `.mindmap` | 无 `layout`/`template` | `undefined` → 回落 `mindmap` |

- 无法识别的标记返回 `undefined`，由调用方回落到 `mindmap`（与「未声明结构默认思维导图」一致）。
- XMind 路径会按需动态加载 `jszip` 读取 `content.json`（失败则回退 `content.xml`），不增加非 XMind 场景的体积。

## 关键代码（io/index.ts）

```ts
export async function parseMindmapFile(
  fileName: string, buffer: ArrayBuffer
): Promise<ParsedMindmap> {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "xmind") {
    const tree = await parseXmind(buffer);
    const structure = await detectXmindStructure(buffer);
    tree.isRoot = true;
    return { tree, structure };
  }
  const text = decodeText(buffer).trim();
  // … tryJson / tryXml 在解析同时分别调用 detectJsonStructure / detectKmXmlStructure …
}
```

```ts
const { tree, structure } = await parseMindmapFile(file.name, buffer);
dispatch({ type: "reset", tree });                 // 先清空画布
setConfig((c) => ({ ...c, structure: structure ?? "mindmap" })); // 再按文件结构（或默认）
setPendingFit(true);
```

## 验证状态（已完成）

> 2026-09-30 补测：`Bash` 工具已恢复，构建与真实浏览器实测均已完成。

**构建**：`npm run build` 与 `npm run build:lib` 全绿
（`dist` css 15.09 kB / js 231.86 kB；`dist-lib` es 134.95 kB + umd 88.20 kB）。`tsc -b` 与 `tsc -p tsconfig.lib.json` 均通过。

**真实浏览器实测**（Chromium，静态托管已构建 `dist/`，3 个 fixture 各 4 条断言 = 12/12 通过，0 控制台错误）：

| 导入文件 | 声明 | 画布结果 | 结论 |
| --- | --- | --- | --- |
| `smm-left.smm` | `.smm` `layout:"logicalLeft"` | 节点数 3→**4**（清空后载入，非叠加）；子节点 **左 3 / 右 0** | 左向逻辑结构图 ✅ |
| `km-right.km` | `.km` 根 `template="right"` | 节点数 4；子节点 **左 0 / 右 3** | 右向逻辑结构图 ✅ |
| `km-default.km` | `.km` 根 `template="default"` | 节点数 4→**5**；子节点 **左 2 / 右 2** | 双向思维导图 ✅ |

- 「先清空再载入」得到直接证据：每次导入后的节点数都**恰好等于新文件**（4 / 4 / 5），而非旧树 + 新树叠加。
- 每次导入后根节点标题即为新文件根主题（`SMM根节点` / `KM-R根节点` / `KM-D根节点`），确认旧树已被整体替换。

**本轮顺带回正的一处映射**：KityMinder 的 `template="default"` 原被映射为 `logical-right`，
但它其实是 KityMinder 的默认双向布局（其 `kityminder.config.js` 中 `defaultTemplate = "default"`，
对应 `src/layout/mind.js` 的经典双向布局），也与本项目「无声明即思维导图」的默认一致，
故改为 `mindmap`。上表已同步。

## 回归提示

- 上一轮「未声明结构默认思维导图」的行为保留：文件无结构字段 → 仍回落 `mindmap`。
- 本次仅增强「声明时尊重声明」，不影响其余 6 种结构、拖放、右键环形菜单、左下角预览面板等既有功能。
- 可复跑的验证脚本与 fixtures 保留在 `_verify/`：`bash _verify/run.sh`（需先 `npm run build`）。
