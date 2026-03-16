import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  envPrefix: "POCKT_",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Pockt",
        short_name: "Pockt",
        description: "Save and organize your bookmarks for offline reading",
        id: "/",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "any",
        dir: "ltr",
        lang: "en",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "utilities"],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: "navigate-existing",
        },
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
        screenshots: [
          {
            src: "screenshots/desktop-wide.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Pockt desktop view",
          },
          {
            src: "screenshots/mobile-narrow.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "Pockt mobile view",
          },
        ],
        shortcuts: [
          {
            name: "Add Bookmark",
            short_name: "Add",
            url: "/add",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Settings",
            short_name: "Settings",
            url: "/settings",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
        ],
        share_target: {
          action: "/add",
          method: "GET",
          enctype: "application/x-www-form-urlencoded",
          params: {
            url: "url",
            title: "title",
            text: "text",
          },
        },
      } as any,
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
