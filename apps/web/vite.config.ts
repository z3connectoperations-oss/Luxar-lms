import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the Firebase Google sign-in popup be closed by its opener
    // (avoids the "Cross-Origin-Opener-Policy would block window.close" warning).
    headers: { "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
  },
});
