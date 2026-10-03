import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Icon } from "./Icons";
import { Popover, PopLabel } from "./Popover";
import {
  BORDER_STYLES,
  BRANCH_STYLES,
  FONT_FAMILIES,
  FONT_SIZES,
  LINK_ARROWS,
  LINK_COLOR_MODES,
  LINK_PATTERNS,
  SHAPES,
  type BaseStyle,
  type CanvasCategory,
  type MindMapConfig,
  type MindNodeStyle,
  type StructureType,
  type TextDefaults,
} from "./types";
import {
  BORDER_COLORS,
  HIGHLIGHT_COLORS,
  MARKERS,
  NODE_ICONS,
  PRIORITY_COLORS,
  PRIORITY_LEVELS,
  PROGRESS_LEVELS,
  STRUCTURES,
  TEXT_COLORS,
  THEME_CATEGORIES,
  THEME_LIST,
} from "./theme";
import {
  EXPORT_LABELS,
  IMPORT_ACCEPT,
  type ExportFormat,
} from "./io";

export interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canDelete: boolean;
  onInsertParent: () => void;
  onInsertSiblingBefore: () => void;
  onInsertSiblingAfter: () => void;
  onInsertChild: () => void;
  onDelete: () => void;
  /** 当前选中节点的标记 */
  markers: string[];
  onToggleMarker: (id: string) => void;
  /** 字号 / 字体（无选中时作为新建节点默认值） */
  defaults: TextDefaults;
  onDefaults: (patch: Partial<TextDefaults>) => void;
  /** 当前选中节点的文字样式 */
  style: MindNodeStyle;
  onStyle: (patch: Partial<MindNodeStyle>) => void;
  onNote: () => void;
  onLink: () => void;
  /** 整体配置（主题 / 结构 / 连线） */
  config: MindMapConfig;
  onConfig: (patch: Partial<MindMapConfig>) => void;
  /** 基础（默认）样式：影响新建节点与画布 */
  onBase: (patch: Partial<BaseStyle>) => void;
  /* ---- 多选聚合（关联线 / 概要 / 分组框） ---- */
  /** 当前选中节点数量（>1 时聚合面板可用） */
  selectedCount: number;
  onAddAssoc: () => void;
  onAddSummary: (text: string) => void;
  onAddFrame: (label: string) => void;
  onClearMultiSelect: () => void;
  /** 优先级 / 进度 / 图标前缀 */
  priority?: number;
  onSetPriority: (v: number | undefined) => void;
  progress?: number;
  onSetProgress: (v: number | undefined) => void;
  icons: string[];
  onToggleIcon: (id: string) => void;
  onImport: (file: File) => void;
  onExport: (format: ExportFormat) => void;
  onNew: () => void;
}

const SHORTCUTS: [string, string][] = [
  ["Tab", "新增子节点"],
  ["Enter", "结束编辑 / 新增同级"],
  ["Shift + Enter", "在前面插入同级"],
  ["Shift + Tab", "节点上移一层"],
  ["F2 / 双击", "编辑节点内容"],
  ["Delete", "删除节点"],
  ["空格", "折叠 / 展开"],
  ["方向键", "切换选中节点"],
  ["Ctrl / Cmd + 左键", "多选节点（配合「多选」面板建关联线 / 概要 / 分组框）"],
  ["Ctrl + Z", "撤销"],
  ["Ctrl + Shift + Z", "重做"],
  ["Ctrl + S", "保存 .km 文件"],
  ["Esc", "取消选中 / 退出编辑"],
];

/* ----------------------------- 缩略图预览 ----------------------------- */

function StructureThumb({ kind }: { kind: string }) {
  const colors = ["#00a870", "#f0a020", "#e34d59", "#2f6fed"];
  const root = (x: number, y: number, w = 14, h = 8) => (
    <rect x={x} y={y} width={w} height={h} rx={2} fill="#2f6fed" />
  );
  const rightBranches = (
    <>
      {[5, 16, 27].map((y, i) => (
        <g key={i}>
          <path d={`M17 18 C 24 18, 24 ${y + 3}, 31 ${y + 3}`} fill="none" stroke={colors[i]} strokeWidth={1.3} />
          <rect x={31} y={y} width={18} height={6} rx={2} fill="#fff" stroke={colors[i]} strokeWidth={1} />
        </g>
      ))}
    </>
  );
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" aria-hidden="true">
      {/* 逻辑结构图（右） */}
      {kind === "logical-right" && (<>{root(3, 14)}{rightBranches}</>)}
      {/* 逻辑结构图（左）：整体镜像 */}
      {kind === "logical-left" && (
        <g transform="translate(52,0) scale(-1,1)">{root(3, 14)}{rightBranches}</g>
      )}
      {/* 思维导图：根居中，左右均衡 */}
      {kind === "mindmap" && (
        <>
          {root(19, 14)}
          {[6, 22].map((y, i) => (
            <g key={`r${i}`}>
              <path d={`M33 18 C 38 18, 36 ${y + 3}, 38 ${y + 3}`} fill="none" stroke={colors[i]} strokeWidth={1.3} />
              <rect x={38} y={y} width={12} height={6} rx={2} fill="#fff" stroke={colors[i]} strokeWidth={1} />
            </g>
          ))}
          {[6, 22].map((y, i) => (
            <g key={`l${i}`}>
              <path d={`M19 18 C 14 18, 16 ${y + 3}, 14 ${y + 3}`} fill="none" stroke={colors[i + 2]} strokeWidth={1.3} />
              <rect x={2} y={y} width={12} height={6} rx={2} fill="#fff" stroke={colors[i + 2]} strokeWidth={1} />
            </g>
          ))}
        </>
      )}
      {/* 组织结构图：顶级横向铺开（梳状） */}
      {kind === "org" && (
        <>
          {root(19, 3, 14, 7)}
          <path d={`M26 10 L26 20 L14 20`} fill="none" stroke={colors[0]} strokeWidth={1.2} />
          <path d={`M26 20 L38 20`} fill="none" stroke={colors[1]} strokeWidth={1.2} />
          <rect x={6} y={20} width={16} height={6} rx={1.5} fill="#fff" stroke={colors[0]} strokeWidth={1} />
          <rect x={30} y={20} width={16} height={6} rx={1.5} fill="#fff" stroke={colors[1]} strokeWidth={1} />
        </>
      )}
      {/* 目录组织图：顶级横向，深层垂直堆叠（竖向列表） */}
      {kind === "catalog" && (
        <>
          {root(19, 3, 14, 7)}
          <path d={`M26 10 L26 16`} fill="none" stroke={colors[0]} strokeWidth={1.2} />
          <rect x={19} y={13} width={14} height={6} rx={1.5} fill="#fff" stroke={colors[0]} strokeWidth={1} />
          <path d={`M26 19 L29 22`} fill="none" stroke={colors[1]} strokeWidth={1.2} />
          <rect x={23} y={22} width={12} height={5} rx={1.5} fill="#fff" stroke={colors[1]} strokeWidth={1} />
          <path d={`M29 27 L29 29`} fill="none" stroke={colors[2]} strokeWidth={1.2} />
          <rect x={23} y={29} width={12} height={5} rx={1.5} fill="#fff" stroke={colors[2]} strokeWidth={1} />
        </>
      )}
      {/* 时间轴：根在左，节点位于同一水平线 */}
      {kind === "timeline" && (
        <>
          {root(3, 15, 11, 7)}
          <path d={`M14 18.5 L48 18.5`} fill="none" stroke="#8b95a5" strokeWidth={1.4} />
          {[18, 30, 42].map((x, i) => (
            <rect key={i} x={x} y={15} width={11} height={7} rx={2} fill="#fff" stroke={colors[i]} strokeWidth={1} />
          ))}
        </>
      )}
      {/* 鱼骨图：脊柱 + 上下交替的骨头 */}
      {kind === "fishbone" && (
        <>
          {root(40, 15, 11, 7)}
          <path d={`M45 18.5 L8 18.5`} fill="none" stroke="#8b95a5" strokeWidth={1.4} />
          <path d={`M30 18.5 L24 7`} fill="none" stroke={colors[0]} strokeWidth={1.2} />
          <rect x={18} y={4} width={12} height={6} rx={1.5} fill="#fff" stroke={colors[0]} strokeWidth={1} />
          <path d={`M16 18.5 L16 30`} fill="none" stroke={colors[1]} strokeWidth={1.2} />
          <rect x={10} y={27} width={12} height={6} rx={1.5} fill="#fff" stroke={colors[1]} strokeWidth={1} />
        </>
      )}
    </svg>
  );
}

function ThemeSwatch({ id }: { id: string }) {
  const t = THEME_LIST.find((x) => x.id === id);
  if (!t) return null;
  return (
    <span
      className="mm-theme-swatch"
      style={{
        background: t.nodeFill,
        borderColor: t.nodeStroke,
        boxShadow: `inset 6px 0 0 ${t.rootFill}`,
      }}
    />
  );
}

/* ----------------------------- 分支样式缩略图 ----------------------------- */

/**
 * 分支样式缩略图（截图 1）。
 * 每个缩略图就是该样式真实绘制的连线形态 —— 图标与画布同源，所见即所得。
 */
function BranchThumb({ kind }: { kind: string }) {
  const c = "#5b6472";
  const common = {
    fill: "none",
    stroke: c,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" aria-hidden="true">
      {kind === "default" && (
        <path d="M4 12 C 14 12, 18 12, 30 12" {...common} />
      )}
      {kind === "bracket-left" && (
        <path d="M4 6 L 14 6 L 14 18 L 30 18" {...common} />
      )}
      {kind === "bracket-right" && (
        <path d="M4 18 L 20 18 L 20 6 L 30 6" {...common} />
      )}
      {kind === "brace" && (
        <path
          d="M4 4 C 12 4, 9 11, 4 12 C 9 13, 12 20, 4 20 M4 12 L 30 12"
          {...common}
        />
      )}
      {kind === "arc-right" && (
        <path d="M4 12 Q 17 2, 30 12" {...common} />
      )}
      {kind === "arc-left" && (
        <path d="M4 12 Q 17 22, 30 12" {...common} />
      )}
      {kind === "fork" && (
        <path d="M4 12 L 16 12 M 16 5 L 30 12 M 16 19 L 30 12" {...common} />
      )}
      {kind === "hook" && (
        <path d="M4 8 L 13 8 L 13 16 L 30 16 M 30 16 L 30 10" {...common} />
      )}
    </svg>
  );
}

/* ----------------------------- 工具栏主体 ----------------------------- */

export function Toolbar(props: ToolbarProps) {
  const {
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    canDelete,
    onInsertParent,
    onInsertSiblingBefore,
    onInsertSiblingAfter,
    onInsertChild,
    onDelete,
    markers,
    onToggleMarker,
    defaults,
    onDefaults,
    style,
    onStyle,
    onNote,
    onLink,
    config,
    onConfig,
    onBase,
    selectedCount,
    onAddAssoc,
    onAddSummary,
    onAddFrame,
    onClearMultiSelect,
    priority,
    onSetPriority,
    progress,
    onSetProgress,
    icons,
    onToggleIcon,
    onImport,
    onExport,
    onNew,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);
  const base = config.base ?? {};
  /** 概要 / 分组框的文案输入（受控于本面板，打开时保留上次输入） */
  const [summaryText, setSummaryText] = useState("概要");
  const [frameLabel, setFrameLabel] = useState("");
  /** 多选是否达到可用的下限（关联线 / 概要至少要 2 个节点） */
  const canGroup = selectedCount >= 2;

  /** 除表单控件外，阻止按钮抢走画布焦点（保证键盘快捷键一直可用） */
  const guard = (e: ReactMouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("select, input, textarea")) return;
    e.preventDefault();
  };

  const sizeOptions = FONT_SIZES.includes(defaults.fontSize)
    ? FONT_SIZES
    : [...FONT_SIZES, defaults.fontSize].sort((a, b) => a - b);
  const fontValue = FONT_FAMILIES.some((f) => f.value === defaults.fontFamily)
    ? defaults.fontFamily
    : FONT_FAMILIES[0].value;

  const themesByCat: { cat: CanvasCategory; label: string; items: typeof THEME_LIST }[] =
    THEME_CATEGORIES.map((c) => ({
      cat: c.id,
      label: c.label,
      items: THEME_LIST.filter((t) => t.category === c.id),
    }));

  return (
    <div className="mm-toolbar" onMouseDown={guard}>
      {/* 撤销 / 重做 */}
      <div className="mm-tb-group">
        <button type="button" className="mm-tb-btn" title="撤销 (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
          <Icon name="undo" />
        </button>
        <button type="button" className="mm-tb-btn" title="重做 (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
          <Icon name="redo" />
        </button>
      </div>

      <i className="mm-tb-sep" />

      {/* 结构编辑 */}
      <div className="mm-tb-group">
        <button type="button" className="mm-tb-btn" title="插入上级节点" onClick={onInsertParent}>
          <Icon name="insert-parent" />
        </button>
        <button type="button" className="mm-tb-btn" title="在下方插入同级节点 (Enter)" onClick={onInsertSiblingAfter}>
          <Icon name="insert-sibling-below" />
        </button>
        <button type="button" className="mm-tb-btn" title="在上方插入同级节点 (Shift+Enter)" onClick={onInsertSiblingBefore}>
          <Icon name="insert-sibling-above" />
        </button>
        <button type="button" className="mm-tb-btn" title="插入子节点 (Tab)" onClick={onInsertChild}>
          <Icon name="insert-child" />
        </button>
        <Popover
          title="标记"
          width={224}
          trigger={() => (
            <span className="mm-tb-combo">
              <Icon name="marker" />
              {markers.length > 0 && <b className="mm-dot" />}
            </span>
          )}
        >
          {(close) => (
            <>
              <PopLabel>标记（可多选）</PopLabel>
              <div className="mm-marker-grid">
                {MARKERS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`mm-marker-chip ${markers.includes(m.id) ? "is-on" : ""}`}
                    title={m.label}
                    style={{ background: m.bg, color: m.fg }}
                    onClick={() => onToggleMarker(m.id)}
                  >
                    {m.char}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mm-pop-action"
                onClick={() => {
                  markers.forEach((m) => onToggleMarker(m));
                  close();
                }}
              >
                <Icon name="trash" size={14} /> 清除全部标记
              </button>
            </>
          )}
        </Popover>
      </div>

      <i className="mm-tb-sep" />

      {/* 字号 / 字体 */}
      <select
        className="mm-tb-select mm-tb-size"
        title="字号"
        value={defaults.fontSize}
        onChange={(e) => onDefaults({ fontSize: Number(e.target.value) })}
      >
        {sizeOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        className="mm-tb-select mm-tb-font"
        title="字体"
        value={fontValue}
        onChange={(e) => onDefaults({ fontFamily: e.target.value })}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </select>

      <i className="mm-tb-sep" />

      {/* 字符样式 */}
      <div className="mm-tb-group">
        <button type="button" className={`mm-tb-btn mm-tb-letter ${style.bold ? "is-on" : ""}`} title="加粗 (Ctrl+B)" style={{ fontWeight: 800 }} onClick={() => onStyle({ bold: !style.bold })}>B</button>
        <button type="button" className={`mm-tb-btn mm-tb-letter ${style.italic ? "is-on" : ""}`} title="斜体 (Ctrl+I)" style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }} onClick={() => onStyle({ italic: !style.italic })}>I</button>
        <button type="button" className={`mm-tb-btn mm-tb-letter ${style.underline ? "is-on" : ""}`} title="下划线 (Ctrl+U)" style={{ textDecoration: "underline" }} onClick={() => onStyle({ underline: !style.underline })}>U</button>
        <button type="button" className={`mm-tb-btn mm-tb-letter ${style.strike ? "is-on" : ""}`} title="删除线" style={{ textDecoration: "line-through" }} onClick={() => onStyle({ strike: !style.strike })}>S</button>
      </div>

      <i className="mm-tb-sep" />

      {/* 备注 / 链接 */}
      <div className="mm-tb-group">
        <button type="button" className="mm-tb-btn" title="节点备注" onClick={onNote}>
          <Icon name="note" />
        </button>
        <button type="button" className="mm-tb-btn" title="超链接" onClick={onLink}>
          <Icon name="link" />
        </button>
      </div>

      <i className="mm-tb-sep" />

      {/* ===== 节点样式 ===== */}
      <Popover
        title="节点样式"
        align="left"
        width={236}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="node-style" size={17} />
            <span>节点样式</span>
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>形状</PopLabel>
            <div className="mm-shape-grid">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`mm-shape-chip ${style.shape === s.id ? "is-on" : ""}`}
                  onClick={() => onStyle({ shape: style.shape === s.id ? undefined : s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <PopLabel>文字颜色</PopLabel>
            <div className="mm-swatches">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" className={`mm-swatch ${style.color === c ? "is-on" : ""}`} style={{ background: c }} title={c} onClick={() => onStyle({ color: style.color === c ? undefined : c })} />
              ))}
            </div>
            <PopLabel>填充背景</PopLabel>
            <div className="mm-swatches">
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c} type="button" className={`mm-swatch ${(style.background ?? "transparent") === c ? "is-on" : ""} ${c === "transparent" ? "is-none" : ""}`} style={{ background: c === "transparent" ? "#fff" : c }} title={c === "transparent" ? "无填充" : c} onClick={() => onStyle({ background: c === "transparent" ? undefined : c })} />
              ))}
            </div>
            <PopLabel>边框颜色</PopLabel>
            <div className="mm-swatches">
              {BORDER_COLORS.map((c) => (
                <button key={c} type="button" className={`mm-swatch ${style.borderColor === c ? "is-on" : ""}`} style={{ background: c }} title={c} onClick={() => onStyle({ borderColor: style.borderColor === c ? undefined : c })} />
              ))}
            </div>
            <PopLabel>外框线型</PopLabel>
            <div className="mm-seg">
              {BORDER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`mm-seg-btn ${(style.borderStyle ?? "solid") === s.id ? "is-on" : ""}`}
                  title={s.label}
                  onClick={() =>
                    onStyle({
                      borderStyle:
                        (style.borderStyle ?? "solid") === s.id ? undefined : s.id,
                    } as Partial<MindNodeStyle>)
                  }
                >
                  {/* 线型示意：用一段对应 dash 的横线，视觉上直接看出实/虚/点/点划 */}
                  <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden="true">
                    <line
                      x1="1"
                      y1="4"
                      x2="25"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeDasharray={
                        s.id === "solid"
                          ? undefined
                          : s.id === "dashed"
                          ? "5 3"
                          : s.id === "dotted"
                          ? "1 3"
                          : "6 2.5 1 2.5"
                      }
                    />
                  </svg>
                  <span className="mm-seg-cap">{s.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Popover>

      {/* ===== 基础样式 ===== */}
      <Popover
        title="基础样式"
        align="left"
        width={236}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="base-style" size={17} />
            <span>基础样式</span>
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>默认字体</PopLabel>
            <select className="mm-pop-select" value={base.fontFamily ?? ""} onChange={(e) => onBase({ fontFamily: e.target.value || undefined })}>
              <option value="">（跟随系统）</option>
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <PopLabel>默认字号</PopLabel>
            <select className="mm-pop-select" value={base.fontSize ?? ""} onChange={(e) => onBase({ fontSize: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">（默认）</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <PopLabel>连线颜色</PopLabel>
            <div className="mm-swatches">
              {BORDER_COLORS.map((c) => (
                <button key={c} type="button" className={`mm-swatch ${base.linkColor === c ? "is-on" : ""}`} style={{ background: c }} title={c} onClick={() => onBase({ linkColor: base.linkColor === c ? undefined : c })} />
              ))}
            </div>

            {/* ---- 连线线型：实线 / 虚线 / 从粗到细（8px → 2px） ---- */}
            <PopLabel>连线线型</PopLabel>
            <div className="mm-seg">
              {LINK_PATTERNS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`mm-seg-btn ${(base.linkPattern ?? "solid") === p.id ? "is-on" : ""}`}
                  title={p.label}
                  onClick={() =>
                    onBase({
                      linkPattern:
                        (base.linkPattern ?? "solid") === p.id ? undefined : p.id,
                    } as Partial<BaseStyle>)
                  }
                >
                  <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
                    {p.id === "taper" ? (
                      /* 从粗到细：左端 8px、右端 2px 的渐窄带 */
                      <path d="M2 1 L32 4.2 L32 5.8 L2 9 Z" fill="currentColor" />
                    ) : (
                      <line
                        x1="2"
                        y1="5"
                        x2="32"
                        y2="5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeDasharray={p.id === "dashed" ? "5 3" : undefined}
                      />
                    )}
                  </svg>
                  <span className="mm-seg-cap">{p.label}</span>
                </button>
              ))}
            </div>

            {/* ---- 连线箭头：无 / 向外 / 向内 ---- */}
            <PopLabel>连线箭头</PopLabel>
            <div className="mm-seg">
              {LINK_ARROWS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`mm-seg-btn ${(base.linkArrow ?? "none") === a.id ? "is-on" : ""}`}
                  title={a.label}
                  onClick={() =>
                    onBase({
                      linkArrow:
                        (base.linkArrow ?? "none") === a.id ? undefined : a.id,
                    } as Partial<BaseStyle>)
                  }
                >
                  <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
                    <line x1="4" y1="5" x2="30" y2="5" stroke="currentColor" strokeWidth="1.6" />
                    {a.id === "outward" && (
                      /* 向外：箭头在右端（子节点侧），尖端朝右 */
                      <polygon points="34,5 27,1.6 27,8.4" fill="currentColor" />
                    )}
                    {a.id === "inward" && (
                      /* 向内：箭头在左端（父节点侧），尖端朝左 */
                      <polygon points="0,5 7,1.6 7,8.4" fill="currentColor" />
                    )}
                  </svg>
                  <span className="mm-seg-cap">{a.label}</span>
                </button>
              ))}
            </div>

            {/* ---- 连线色彩：彩色（按分支）/ 单色 ---- */}
            <PopLabel>连线色彩</PopLabel>
            <div className="mm-seg">
              {LINK_COLOR_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mm-seg-btn ${(base.linkColorMode ?? "auto") === m.id ? "is-on" : ""}`}
                  title={m.label}
                  onClick={() =>
                    onBase({
                      linkColorMode:
                        (base.linkColorMode ?? "auto") === m.id ? undefined : m.id,
                    } as Partial<BaseStyle>)
                  }
                >
                  <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
                    {m.id === "auto" ? (
                      /* 彩色：三段分色，暗示按分支取主题色 */
                      <>
                        <line x1="2" y1="5" x2="13" y2="5" stroke="#2f6fed" strokeWidth="2" strokeLinecap="round" />
                        <line x1="14" y1="5" x2="24" y2="5" stroke="#00a870" strokeWidth="2" strokeLinecap="round" />
                        <line x1="25" y1="5" x2="32" y2="5" stroke="#f0a020" strokeWidth="2" strokeLinecap="round" />
                      </>
                    ) : (
                      <line x1="2" y1="5" x2="32" y2="5" stroke="#5b6472" strokeWidth="2" strokeLinecap="round" />
                    )}
                  </svg>
                  <span className="mm-seg-cap">{m.label}</span>
                </button>
              ))}
            </div>

            {/* ---- 分支样式（截图 1）：括号 / 圆弧 / 分叉等 ---- */}
            <PopLabel>分支样式</PopLabel>
            <div className="mm-branch-grid">
              {BRANCH_STYLES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`mm-branch-card ${(base.branchStyle ?? "default") === b.id ? "is-on" : ""}`}
                  title={b.label}
                  onClick={() =>
                    onBase({
                      branchStyle:
                        (base.branchStyle ?? "default") === b.id ? undefined : b.id,
                    } as Partial<BaseStyle>)
                  }
                >
                  <BranchThumb kind={b.id} />
                  <span>{b.label}</span>
                </button>
              ))}
            </div>

            <PopLabel>连线粗细 · {base.linkWidth ?? "默认"}</PopLabel>
            <input className="mm-pop-range" type="range" min={1} max={5} step={1} value={base.linkWidth ?? 2} onChange={(e) => onBase({ linkWidth: Number(e.target.value) })} />
            <PopLabel>圆角 · {base.radius ?? "默认"}</PopLabel>
            <input className="mm-pop-range" type="range" min={0} max={20} step={1} value={base.radius ?? 10} onChange={(e) => onBase({ radius: Number(e.target.value) })} />
            <PopLabel>默认填充</PopLabel>
            <div className="mm-swatches">
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c} type="button" className={`mm-swatch ${(base.nodeFill ?? "transparent") === c ? "is-on" : ""} ${c === "transparent" ? "is-none" : ""}`} style={{ background: c === "transparent" ? "#fff" : c }} title={c === "transparent" ? "无" : c} onClick={() => onBase({ nodeFill: c === "transparent" ? undefined : c })} />
              ))}
            </div>
            <PopLabel>默认文字色</PopLabel>
            <div className="mm-swatches">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" className={`mm-swatch ${base.nodeText === c ? "is-on" : ""}`} style={{ background: c }} title={c} onClick={() => onBase({ nodeText: base.nodeText === c ? undefined : c })} />
              ))}
            </div>
          </>
        )}
      </Popover>

      {/* ===== 多选聚合：关联线 / 概要 / 分组框 ===== */}
      <Popover
        title="多选"
        align="left"
        width={252}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="multi" size={17} />
            <span>多选</span>
            {selectedCount > 1 && <b className="mm-badge" style={{ background: "#2f6fed" }}>{selectedCount}</b>}
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <div className="mm-pop-tip">
              按住 <kbd>Ctrl</kbd>（macOS 为 <kbd>Cmd</kbd>）+ 鼠标左键可连续点选多个节点。
              {selectedCount > 0 ? ` 当前已选 ${selectedCount} 个节点。` : ""}
            </div>

            <PopLabel>关联线（按选中顺序依次连接）</PopLabel>
            <button
              type="button"
              className="mm-pop-action"
              disabled={!canGroup}
              title={canGroup ? "为所选节点添加关联线" : "至少选中 2 个节点"}
              onClick={() => onAddAssoc()}
            >
              <Icon name="link" size={15} /> 添加关联线
            </button>
            <svg width="100%" height="34" viewBox="0 0 220 34" aria-hidden="true" style={{ display: "block", margin: "2px 0 6px" }}>
              <rect x="6" y="4" width="52" height="16" rx="5" fill="#eef4ff" stroke="#2f6fed" strokeWidth="1.2" />
              <text x="32" y="15.5" fontSize="9" fill="#2f6fed" textAnchor="middle">节点 A</text>
              <rect x="6" y="16" width="52" height="14" rx="5" fill="#eef4ff" stroke="#2f6fed" strokeWidth="1.2" />
              <text x="32" y="26" fontSize="9" fill="#2f6fed" textAnchor="middle">节点 B</text>
              <path d="M58 12 C 110 12, 130 23, 186 23" fill="none" stroke="#2f6fed" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
              <polygon points="194,23 186,19.5 186,26.5" fill="#2f6fed" />
            </svg>

            <PopLabel>概要（汇总所选节点）</PopLabel>
            <input
              className="mm-pop-input"
              value={summaryText}
              placeholder="概要文案"
              onChange={(e) => setSummaryText(e.target.value)}
            />
            <button
              type="button"
              className="mm-pop-action"
              disabled={!canGroup}
              title={canGroup ? "把所选节点汇总为一个概要" : "至少选中 2 个节点"}
              onClick={() => onAddSummary(summaryText)}
            >
              <Icon name="summary" size={15} /> 添加概要
            </button>

            <PopLabel>分组框（圈住所选节点）</PopLabel>
            <input
              className="mm-pop-input"
              value={frameLabel}
              placeholder="分组名称（可留空）"
              onChange={(e) => setFrameLabel(e.target.value)}
            />
            <button
              type="button"
              className="mm-pop-action"
              disabled={selectedCount < 1}
              title={selectedCount > 0 ? "把所选节点圈成分组框" : "请先选中节点"}
              onClick={() => onAddFrame(frameLabel)}
            >
              <Icon name="group" size={15} /> 添加分组框
            </button>

            <button
              type="button"
              className="mm-pop-action"
              disabled={selectedCount < 1}
              onClick={onClearMultiSelect}
            >
              <Icon name="check" size={15} /> 取消多选
            </button>
          </>
        )}
      </Popover>

      {/* ===== 主题 ===== */}
      <Popover
        title="主题"
        align="left"
        width={252}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="theme" size={17} />
            <span>主题</span>
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            {themesByCat.map((g) => (
              <div key={g.cat}>
                <PopLabel>{g.label}</PopLabel>
                <div className="mm-theme-grid">
                  {g.items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`mm-theme-card ${config.themeId === t.id ? "is-on" : ""}`}
                      onClick={() => onConfig({ themeId: t.id })}
                    >
                      <ThemeSwatch id={t.id} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </Popover>

      {/* ===== 结构 ===== */}
      <Popover
        title="结构"
        align="left"
        width={236}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="structure" size={17} />
            <span>结构</span>
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>布局结构</PopLabel>
            <div className="mm-structure-grid">
              {STRUCTURES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`mm-structure-card ${config.structure === s.id ? "is-on" : ""}`}
                  onClick={() => onConfig({ structure: s.id as StructureType })}
                >
                  <StructureThumb kind={s.id} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
            <PopLabel>连线样式</PopLabel>
            <div className="mm-seg">
              {([["curve", "曲线"], ["elbow", "折线"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`mm-seg-btn ${config.lineStyle === k ? "is-on" : ""}`}
                  onClick={() => onConfig({ lineStyle: k })}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </Popover>

      <i className="mm-tb-sep" />

      {/* ===== 优先级 ===== */}
      <Popover
        title="优先级"
        align="left"
        width={208}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="priority" size={17} />
            <span>优先级</span>
            {priority != null && <b className="mm-badge" style={{ background: PRIORITY_COLORS[priority] }}>{priority}</b>}
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>设置优先级（1–9）</PopLabel>
            <div className="mm-prio-grid">
              {PRIORITY_LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={`mm-prio-chip ${priority === lv ? "is-on" : ""}`}
                  style={{ background: priority === lv ? PRIORITY_COLORS[lv] : undefined, color: priority === lv ? "#fff" : PRIORITY_COLORS[lv] }}
                  onClick={() => onSetPriority(priority === lv ? undefined : lv)}
                >
                  {lv}
                </button>
              ))}
            </div>
            <button type="button" className="mm-pop-action" onClick={() => onSetPriority(undefined)}>
              <Icon name="trash" size={14} /> 清除优先级
            </button>
          </>
        )}
      </Popover>

      {/* ===== 进度 ===== */}
      <Popover
        title="进度"
        align="left"
        width={208}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="progress" size={17} />
            <span>进度</span>
            {progress != null && <b className="mm-badge" style={{ background: "#8bc34a" }}>{progress * 10}%</b>}
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>设置进度（0–100%，每档 10%）</PopLabel>
            <div className="mm-prog-grid">
              {PROGRESS_LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={`mm-prog-chip ${progress === lv ? "is-on" : ""}`}
                  onClick={() => onSetProgress(progress === lv ? undefined : lv)}
                >
                  {lv * 10}
                </button>
              ))}
            </div>
            <button type="button" className="mm-pop-action" onClick={() => onSetProgress(undefined)}>
              <Icon name="trash" size={14} /> 清除进度
            </button>
          </>
        )}
      </Popover>

      {/* ===== 图标 ===== */}
      <Popover
        title="图标"
        align="left"
        width={236}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="icon" size={17} />
            <span>图标</span>
            {icons.length > 0 && <b className="mm-dot" />}
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>添加图标前缀（可多选）</PopLabel>
            <div className="mm-icon-grid">
              {NODE_ICONS.map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  className={`mm-icon-chip ${icons.includes(ic.id) ? "is-on" : ""}`}
                  title={ic.label}
                  onClick={() => onToggleIcon(ic.id)}
                >
                  <span className="mm-icon-emoji">{ic.char}</span>
                </button>
              ))}
            </div>
            <button type="button" className="mm-pop-action" onClick={() => icons.forEach((id) => onToggleIcon(id))}>
              <Icon name="trash" size={14} /> 清除全部图标
            </button>
          </>
        )}
      </Popover>

      <i className="mm-tb-sep" />

      {/* ===== 文件：打开 / 保存(.km) / 导出 ===== */}
      <Popover
        title="文件"
        align="right"
        width={244}
        trigger={() => (
          <span className="mm-tb-combo mm-tb-combo-text">
            <Icon name="folder" size={17} />
            <span>文件</span>
            <Icon name="chevron" size={13} />
          </span>
        )}
      >
        {(close) => (
          <>
            <button type="button" className="mm-pop-action" onClick={() => fileRef.current?.click()}>
              <Icon name="folder" size={15} /> 打开…
            </button>
            <button type="button" className="mm-pop-action" onClick={() => { onExport("km"); close(); }}>
              <Icon name="save" size={15} /> 保存（.km）
            </button>
            <PopLabel>导出为</PopLabel>
            {(Object.keys(EXPORT_LABELS) as ExportFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                className="mm-pop-action"
                onClick={() => { onExport(f); close(); }}
              >
                <Icon name="save" size={15} /> {EXPORT_LABELS[f]}
              </button>
            ))}
            <div className="mm-pop-tip">默认打开 / 保存格式为 .km</div>
            <PopLabel>其他</PopLabel>
            <button type="button" className="mm-pop-action" onClick={() => { onNew(); close(); }}>
              <Icon name="file-plus" size={15} /> 新建空白导图
            </button>
          </>
        )}
      </Popover>

      {/* 快捷键说明 */}
      <Popover
        title="快捷键"
        align="right"
        width={252}
        trigger={() => (
          <span className="mm-tb-combo">
            <Icon name="keyboard" size={17} />
          </span>
        )}
      >
        {() => (
          <>
            <PopLabel>编辑快捷键</PopLabel>
            <div className="mm-shortcuts">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="mm-shortcut-row">
                  <kbd>{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Popover>

      <i className="mm-tb-sep" />

      <div className="mm-tb-group">
        <button type="button" className="mm-tb-btn" title="删除节点 (Delete)" disabled={!canDelete} onClick={onDelete}>
          <Icon name="trash" />
        </button>
      </div>

      <input
        ref={fileRef}
        className="mm-file-input"
        type="file"
        accept={IMPORT_ACCEPT}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default Toolbar;
