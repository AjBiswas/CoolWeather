import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appIconPath = path.join(process.cwd(), "assets", "coolweather.ico");

const COLLAPSED_SIZE = { width: 290, height: 240 };
const EXPANDED_SIZE = { width: 290, height: 580 };

console.log("Main process script started.");

function clampBoundsToDisplay(
  bounds: Electron.Rectangle,
  targetWidth: number,
  targetHeight: number,
  anchorY: "top" | "bottom"
) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  const width = Math.min(targetWidth, area.width);
  const height = Math.min(targetHeight, area.height);

  const x = Math.min(
    Math.max(bounds.x, area.x),
    area.x + area.width - width
  );

  const desiredY =
    anchorY === "bottom"
      ? bounds.y + bounds.height - height
      : bounds.y;

  const y = Math.min(
    Math.max(desiredY, area.y),
    area.y + area.height - height
  );

  return { x, y, width, height };
}

function createWindow() {
  console.log("Creating window...");
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const sessionToken = Math.random().toString(36).substring(2, 15);

  const preloadPath = path.join(__dirname, "preload.js");
  console.log(`Preload path: ${preloadPath}`);

  const win = new BrowserWindow({
    width: COLLAPSED_SIZE.width,
    height: COLLAPSED_SIZE.height,
    minWidth: COLLAPSED_SIZE.width,
    minHeight: COLLAPSED_SIZE.height,
    maxWidth: COLLAPSED_SIZE.width,
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
    hasShadow: false,
    icon: appIconPath
  });
  console.log("Window created.");

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

  let lastAnchorY: "top" | "bottom" = "top";
  let isAdjustingBounds = false;
  let moveClampTimer: NodeJS.Timeout | null = null;

  const setClampedBounds = (
    bounds: Electron.Rectangle,
    width: number,
    height: number,
    anchorY: "top" | "bottom",
  ) => {
    const nextBounds = clampBoundsToDisplay(bounds, width, height, anchorY);
    if (
      nextBounds.x === bounds.x &&
      nextBounds.y === bounds.y &&
      nextBounds.width === bounds.width &&
      nextBounds.height === bounds.height
    ) {
      return nextBounds;
    }

    isAdjustingBounds = true;
    win.setBounds(nextBounds);
    setTimeout(() => {
      isAdjustingBounds = false;
    }, 0);
    return nextBounds;
  };

  ipcMain.removeHandler("widget:set-size");
  ipcMain.handle("widget:set-size", (_event, mode: "small" | "large" | "toggle") => {
    if (moveClampTimer) {
      clearTimeout(moveClampTimer);
      moveClampTimer = null;
    }

    const bounds = win.getBounds();
    const isExpanded = bounds.height > COLLAPSED_SIZE.height + 20;
    const nextMode =
      mode === "toggle" ? (isExpanded ? "small" : "large") : mode;

    const target = nextMode === "large" ? EXPANDED_SIZE : COLLAPSED_SIZE;
    const display = screen.getDisplayMatching(bounds);
    const area = display.workArea;

    const anchorY: "top" | "bottom" =
      nextMode === "large" && bounds.y + target.height > area.y + area.height
        ? "bottom"
        : nextMode === "small"
        ? lastAnchorY
        : "top";

    setClampedBounds(bounds, target.width, target.height, anchorY);
    lastAnchorY = anchorY;

    return { anchorY };
  });

  win.on("move", () => {
    if (isAdjustingBounds) {
      return;
    }

    if (moveClampTimer) {
      clearTimeout(moveClampTimer);
    }

    // Avoid fighting the user's drag near screen edges; clamp after movement settles.
    moveClampTimer = setTimeout(() => {
      moveClampTimer = null;
      const bounds = win.getBounds();
      const clamped = clampBoundsToDisplay(bounds, bounds.width, bounds.height, lastAnchorY);
      if (
        clamped.x !== bounds.x ||
        clamped.y !== bounds.y
      ) {
        setClampedBounds(bounds, bounds.width, bounds.height, lastAnchorY);
      }
    }, 90);
  });
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
