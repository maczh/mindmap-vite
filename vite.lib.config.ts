import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// 库构建：把 MindMap 组件打包成可分发/可发布的 npm 包（ESM + UMD + CSS）。
// React 作为外部依赖不打包进产物（由 peerDependencies 提供）。
//
// 产物约定（与 package.json 的 main/module/types/style 一一对应）：
//   dist-lib/mindmap-vite.es.js     ESM
//   dist-lib/mindmap-vite.umd.js    UMD（全局名 MindMapVite）
//   dist-lib/style.css              组件自带样式（MindMap.tsx 里 import "./MindMap.css"）
//   dist-lib/components/MindMap/index.d.ts（由 tsc -p tsconfig.lib.json 生成）
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-lib",
    // tsc 会先把 .d.ts 输出到该目录，关闭自动清空以免被冲掉
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/components/MindMap/index.ts"),
      name: "MindMapVite",
      formats: ["es", "umd"],
      fileName: (format) => `mindmap-vite.${format}.js`,
    },
    rollupOptions: {
      // jszip 仅在读写 .xmind 时被动态引入，作为外部依赖交给使用方安装
      external: ["react", "react-dom", "react/jsx-runtime", "jszip"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
          jszip: "JSZip",
        },
      },
    },
  },
});
