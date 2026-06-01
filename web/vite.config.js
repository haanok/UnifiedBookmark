import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app loads correctly over file:// in Electron.
  base: "./",
  server: {
    port: 5173,
    // Proxy API calls to the local Trove backend so the UI can use relative paths.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
