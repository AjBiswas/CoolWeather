import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Main process script started.");

function createWindow() {
  console.log("Creating window...");
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const sessionToken = Math.random().toString(36).substring(2, 15);

  const preloadPath = path.join(__dirname, "preload.js");
  console.log(`Preload path: ${preloadPath}`);

  const win = new BrowserWindow({
    width: 560,
    height: 420,
    minWidth: 320,
    minHeight: 280,
    maxWidth: Math.round(width * 0.8),
    maxHeight: Math.round(height * 0.8),
    title: "CoolWeather",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    show: false,
    hasShadow: false
  });
  console.log("Window created.");

  win.setAspectRatio(560 / 420);

  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["X-Session-Token"] = sessionToken;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  console.log("Loading content...");
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log(`Dev mode: loading from ${process.env.VITE_DEV_SERVER_URL}`);
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "../renderer/index.html");
    console.log(`Production mode: loading from ${indexPath}`);
    win.loadFile(indexPath);
  }
  console.log("Content loaded.");

  win.once("ready-to-show", () => {
    console.log("Window ready to show.");
    win.show();
  });

  // Fallback in case ready-to-show doesn't fire quickly
  setTimeout(() => {
    if (!win.isVisible()) {
      console.warn("Window not visible by timeout, forcing show.");
      win.show();
    }
  }, 3000);
}

app.whenReady().then(() => {
  console.log("App is ready.");
  createWindow();
});

app.on("window-all-closed", () => {
  console.log("All windows closed.");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  console.log("App activated.");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});