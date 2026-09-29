/** 节点形状 */
export type MindNodeShape = "rect" | "rounded" | "capsule" | "underline" | "none";

/** 单个节点的文字 / 外观样式。 */
export interface MindNodeStyle {
  /** 字号，默认 14 */
  fontSize?: number;
  /** 字体，默认 Microsoft YaHei 系列 */
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** 文字颜色 */
  color?: string;
  /** 节点填充色 */
  background?: string;
  /** 节点描边 / 连线颜色（分支强调色） */
  borderColor?: string;
  /** 描边宽度 */
  borderWidth?: number;
  /** 节点形状 */
  shape?: MindNodeShape;
}

/** 思维导图节点（嵌套树结构，组件内部统一使用）。 */
export interface MindNode {
  id: string;
  title: string;
  children: MindNode[];
  /** 是否收起（不渲染子节点） */
  collapsed?: boolean;
  /** 节点强调色（描边 / 连线颜色），等价于 style.borderColor 的快捷方式 */
  color?: string;
  /** 扩展样式 */
  style?: MindNodeStyle;
  /** 备注（图标形式展示，hover 可见） */
  note?: string;
  /** 超链接 */
  link?: string;
  /** 标记 / 图标，如 priority-1、flag-red、star、question */
  markers?: string[];
  /** 是否为根节点 */
  isRoot?: boolean;
  /** 优先级 1 - 9（作为前缀图标渲染） */
  priority?: number;
  /** 进度 0 - 10（0% ~ 100%，步长 10%；作为前缀饼图渲染） */
  progress?: number;
  /** 节点图标前缀（emoji 图标 id 列表） */
  icons?: string[];
}

/** 主题分类：经典 / 深色 / 朴素 */
export type CanvasCategory = "classic" | "dark" | "plain";
/** 连线样式 */
export type LineStyle = "curve" | "elbow";
/** 结构（对应「结构」面板） */
export type StructureType =
  | "logical-right"
  | "logical-left"
  | "mindmap"
  | "org"
  | "catalog"
  | "timeline"
  | "fishbone";

/** 全局「基础样式」覆盖（作用于整张画布） */
export interface BaseStyle {
  fontFamily?: string;
  fontSize?: number;
  /** 画布背景色 */
  background?: string;
  /** 连线颜色 */
  linkColor?: string;
  /** 连线宽度 */
  linkWidth?: number;
  /** 节点圆角 */
  radius?: number;
  /** 节点描边宽度 */
  strokeWidth?: number;
  /** 默认节点填充色 */
  nodeFill?: string;
  /** 默认节点文字色 */
  nodeText?: string;
}

/** 全局视图配置（对应工具栏 4 个面板）。 */
export interface MindMapConfig {
  /** 主题 id（见 THEME_LIST） */
  themeId: string;
  /** 结构 */
  structure: StructureType;
  /** 连线样式 */
  lineStyle: LineStyle;
  /** 基础样式覆盖 */
  base: BaseStyle;
}

export const DEFAULT_CONFIG: MindMapConfig = {
  themeId: "classic-blue",
  // 未指定结构时默认「思维导图」（左右均衡），而非逻辑结构图
  structure: "mindmap",
  lineStyle: "curve",
  base: {},
};

/** 新建节点时继承的默认文字样式（工具栏无选中时即为默认值）。 */
export interface TextDefaults {
  fontSize: number;
  fontFamily: string;
}

export const DEFAULT_TEXT: TextDefaults = {
  fontSize: 14,
  fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
};

/** 工具栏可选的字体列表 */
export const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "微软雅黑", value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: "苹方", value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { label: "宋体", value: '"SimSun", "Songti SC", serif' },
  { label: "黑体", value: '"SimHei", "Heiti SC", sans-serif' },
  { label: "楷体", value: '"KaiTi", "Kaiti SC", serif' },
  { label: "仿宋", value: '"FangSong", serif' },
  { label: "思源黑体", value: '"Source Han Sans SC", "Noto Sans SC", sans-serif' },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times", value: '"Times New Roman", Times, serif' },
  { label: "Consolas", value: 'Consolas, "Courier New", monospace' },
];

/** 工具栏可选字号 */
export const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48];

/** 节点形状可选值 */
export const SHAPES: { id: MindNodeShape; label: string }[] = [
  { id: "rect", label: "矩形" },
  { id: "rounded", label: "圆角矩形" },
  { id: "capsule", label: "胶囊" },
  { id: "underline", label: "下划线" },
  { id: "none", label: "无边框" },
];

export interface MindMapProps {
  /** 根节点数据 */
  data: MindNode;
  /** 容器宽度，默认 100% */
  width?: number | string;
  /** 容器高度，默认 100% */
  height?: number | string;
  /** 附加 className */
  className?: string;
  /** 挂载时是否自动适应屏幕，默认 true */
  fitOnMount?: boolean;
  /** 是否可编辑，默认 true */
  editable?: boolean;
  /** 是否显示工具栏，默认 true */
  showToolbar?: boolean;
  /** 数据变更回调（受控使用时可自行持久化） */
  onChange?: (tree: MindNode) => void;
  /** 初始视图配置 */
  defaultConfig?: Partial<MindMapConfig>;
}
