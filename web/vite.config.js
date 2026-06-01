import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the local Trove backend so the UI can use relative paths.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
