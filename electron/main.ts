import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const isDev = !app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SMALL_SIZE = { width: 420, height: 360 };
const LARGE_SIZE = { width: 560, height: 420 };

function getMainWindow() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

function setWidgetSize(mode: "small" | "large" | "toggle") {
  const window = getMainWindow();
  if (!window) {
    return;
  }

  const [currentWidth] = window.getSize();
  const next =
    mode === "small"
      ? SMALL_SIZE
      : mode === "large"
        ? LARGE_SIZE
        : currentWidth <= SMALL_SIZE.width + 20
          ? LARGE_SIZE
          : SMALL_SIZE;

  window.setSize(next.width, next.height, true);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 400,
    height: 300,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    window.loadFile("index.html"); // 🔥 SAFE
  }
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "geolocation";
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "geolocation");
  });

  ipcMain.handle("widget:set-size", (_event, mode: "small" | "large" | "toggle") => {
    setWidgetSize(mode);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

