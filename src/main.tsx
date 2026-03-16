import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Register service worker for PWA (production only — disabled in dev)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const { registerSW } = await import("virtual:pwa-register");
      registerSW({
        onOfflineReady() {
          console.log("Pockt ready for offline use");
        },
      });
    } catch {
      // PWA registration not available in dev
    }
  });
}
