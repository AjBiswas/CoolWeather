import { contextBridge, ipcRenderer } from "electron";

async function fetchRemote(url: string, kind: "json" | "text") {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Remote fetch failed: ${response.status}`);
  }

  return kind === "json" ? response.json() : response.text();
}

contextBridge.exposeInMainWorld("coolWeatherDesktop", {
  platform: process.platform,
  fetchJson: (url: string) => fetchRemote(url, "json"),
  fetchText: (url: string) => fetchRemote(url, "text"),
  setWidgetSize: (mode: "small" | "large" | "toggle") => ipcRenderer.invoke("widget:set-size", mode) as Promise<{ anchorY: "top" | "bottom" }>
});
