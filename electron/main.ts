import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appIconPath = path.join(process.cwd(), "assets", "coolweather.ico");
const APP_NAME = "Cool Weather";

const COLLAPSED_SIZE = { width: 300, height: 260 };
const EXPANDED_SIZE = { width: 300, height: 540 };

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
    title: APP_NAME,
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

  ipcMain.removeHandler("widget:sample-backdrop");
  ipcMain.handle("widget:sample-backdrop", async () => {
    try {
      const bounds = win.getBounds();
      const display = screen.getDisplayMatching(bounds);

      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 480, height: 480 }
      });
      if (sources.length === 0) {
        return null;
      }
      const source =
        sources.find((candidate) => candidate.display_id === String(display.id)) ?? sources[0];
      const thumb = source.thumbnail;
      const thumbSize = thumb.getSize();
      if (thumbSize.width === 0 || thumbSize.height === 0) {
        return null;
      }

      // Map the widget's on-screen rect to a fraction of the display, then apply
      // that same fraction to the thumbnail's own pixel size - avoids needing to
      // know the exact DPI scale factor between logical window bounds and the
      // captured thumbnail's resolution.
      const relX = (bounds.x - display.bounds.x) / display.bounds.width;
      const relY = (bounds.y - display.bounds.y) / display.bounds.height;
      const relW = bounds.width / display.bounds.width;
      const relH = bounds.height / display.bounds.height;

      // Only the bottom slice, where the condition label / location text sits -
      // a more relevant sample than averaging the whole cloud/number artwork.
      const sliceRelY = relY + relH * 0.62;
      const sliceRelH = relH * 0.38;

      const cropRect = {
        x: Math.max(0, Math.round(relX * thumbSize.width)),
        y: Math.max(0, Math.round(sliceRelY * thumbSize.height)),
        width: Math.max(1, Math.round(relW * thumbSize.width)),
        height: Math.max(1, Math.round(sliceRelH * thumbSize.height))
      };
      cropRect.width = Math.min(cropRect.width, thumbSize.width - cropRect.x);
      cropRect.height = Math.min(cropRect.height, thumbSize.height - cropRect.y);
      if (cropRect.width <= 0 || cropRect.height <= 0) {
        return null;
      }

      const cropped = thumb.crop(cropRect);
      const bitmap = cropped.toBitmap(); // BGRA
      if (bitmap.length === 0) {
        return null;
      }

      let total = 0;
      let count = 0;
      // Sample every 4th pixel - plenty for an average over a small region.
      for (let i = 0; i < bitmap.length; i += 16) {
        const b = bitmap[i];
        const g = bitmap[i + 1];
        const r = bitmap[i + 2];
        total += 0.299 * r + 0.587 * g + 0.114 * b;
        count += 1;
      }
      if (count === 0) {
        return null;
      }

      const avgLuminance = total / count;
      return { isDark: avgLuminance < 140 };
    } catch (error) {
      console.warn("Backdrop sampling failed:", error);
      return null;
    }
  });

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
  app.setName(APP_NAME);
  app.setAppUserModelId("com.coolweather.desktop");
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
