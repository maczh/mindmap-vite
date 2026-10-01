import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 消费方工程（验证「构建产物」真的能被第三方 Vite + React 项目 import 并渲染）。
 * main.tsx 通过包名 `mindmap-vite` 引入，node_modules/mindmap-vite 是指向包根目录的软链。
 */
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
});
