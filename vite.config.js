import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // rutas RELATIVAS, sirven bien en GitHub Pages
  base: "./",
  plugins: [react()],
});
