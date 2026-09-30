/* 时间轴样式可视预览（临时验证用，验收后删除） */
import React from "react";
import { createRoot } from "react-dom/client";
import { MindMap } from "../src/components/MindMap";
import type { MindNode } from "../src/components/MindMap/types";
import "../src/components/MindMap/MindMap.css";

let seq = 0;
const n = (title: string, children: MindNode[] = []): MindNode => ({
  id: `p${++seq}`,
  title,
  children,
});

// 仿参考截图：多层级、含中文长文本与三级嵌套
const tree = n("奇海RIS菜品模型", [
  n("菜品分类", [
    n("StoreId", [n("总店(模板)值为TEMPLATE")]),
    n("CategoryId"),
    n("Name"),
    n("Sort"),
    n("Image0", [n("未选择时图标")]),
    n("Image1", [n("被选择时图标")]),
    n("Hide"),
  ]),
  n("菜品", [
    n("Sort"),
    n("ComboId", [n("套餐ID")]),
    n("Pinyin", [n("拼音")]),
    n("Required", [n("是否必点菜")]),
    n("Price", [n("标准参考基础价格")]),
    n("UnitName"),
    n("DishType", [n("SINGLE-单品"), n("COMBO-套餐")]),
  ]),
  n("套餐", [
    n("菜品套餐", [
      n("ComboId"),
      n("Name", [n("套餐名称")]),
      n("Price", [n("套餐价格/底价")]),
      n("PriceType", [n("套餐价格类型", [n("FIXED", [n("固定价格-促销套餐")]), n("PRICE_ADD", [n("价格叠加")])])]),
    ]),
  ]),
]);

createRoot(document.getElementById("root")!).render(
  <MindMap
    data={tree}
    showToolbar={false}
    defaultConfig={{ structure: "timeline", lineStyle: "straight" }}
  />
);
