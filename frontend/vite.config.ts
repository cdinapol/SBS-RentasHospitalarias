import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "/SBS-RentasHospitalarias/" en build (GitHub Pages); "/" en dev.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/SBS-RentasHospitalarias/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
}));
