import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { setUpdateReady } from "./lib/sync";
import "./index.css";

// The offline-capable service worker is for the website and the Windows/desktop install. The Android app
// bundles its files, so it doesn't need one.
if (import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  const update = registerSW({ onNeedRefresh: () => setUpdateReady(() => update(true)) });
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
