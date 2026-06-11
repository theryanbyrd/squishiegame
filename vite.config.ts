import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // iPod touch 6 maxes out at iOS 12 Safari, which can't parse
    // ES2020 syntax like optional chaining — downlevel the bundle
    target: "safari12",
  },
});
