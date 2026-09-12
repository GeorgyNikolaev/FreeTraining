import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Node 22+ предоставляет собственный глобальный `localStorage` (Web Storage API),
    // который перекрывает реализацию jsdom и не имеет методов вроде `clear()`.
    // Отключаем эту экспериментальную функцию Node для процессов-воркеров тестов.
    execArgv: ["--no-experimental-webstorage"],
  },
});
