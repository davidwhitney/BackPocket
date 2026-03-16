import { useState, useEffect, useCallback } from "react";
import { AppConfig } from "../types/index.ts";
import { loadConfig, saveConfig } from "../services/config.ts";

export function useConfig() {
  const [config, setConfigState] = useState<AppConfig>(loadConfig);

  const setConfig = useCallback((update: Partial<AppConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...update };
      saveConfig(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const isDark =
      config.darkMode === true ||
      (config.darkMode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [config.darkMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (config.darkMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [config.darkMode]);

  return { config, setConfig };
}
