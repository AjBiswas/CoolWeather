import React, { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties, type FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

import { WeatherScene } from "./components/WeatherScene";
import { fallbackWeather } from "./data/mockWeather";
import {
  fetchLiveWeather,
  fetchLiveWeatherByCoords,
  fetchLiveWeatherByIp,
  fetchLocationSuggestions
} from "./lib/liveWeather";
import type { WeatherSnapshot, LocationSuggestion } from "./types";

gsap.registerPlugin(useGSAP);


const BASE_WIDGET_WIDTH = 300;
const BASE_WIDGET_HEIGHT = 260;
const EXPANDED_WIDGET_HEIGHT = 540;
const PREVIEW_CONDITIONS: WeatherSnapshot["condition"][] = [
  "clear",
  "mostly-sunny",
  "partly-cloudy",
  "cloudy",
  "haze",
  "rain",
  "storm",
  "snow",
  "sunset"
];
const zeroWeather: WeatherSnapshot = {
  ...fallbackWeather,
  city: "Location unavailable",
  region: "",
  temperatureC: 0,
  feelsLikeC: 0,
  humidity: 0,
  windKph: 0,
  uvIndex: 0,
  condition: "clear",
  summary: "Location unavailable.",
  updatedAt: "--",
  source: "Fallback",
  live: false,
  forecast: fallbackWeather.forecast.map((entry) => ({
    ...entry,
    temperatureC: 0
  })),
  hourlyDetails: fallbackWeather.hourlyDetails.map((entry) => ({
    ...entry,
    temperatureC: 0,
    windKph: 0,
    uvIndex: 0
  }))
};

function displayTemp(value: number, showPlaceholder = false) {
  if (showPlaceholder) {
    return "--";
  }

  return Math.round(value).toString();
}

function formatTemp(value: number, showPlaceholder = false) {
  return showPlaceholder ? "--" : `${Math.round(value)}°`;
}

function toFahrenheit(value: number) {
  return Math.round((value * 9) / 5 + 32);
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function displayConditionName(value: WeatherSnapshot["condition"], isNight: boolean = false) {
  const daySuffix = isNight ? " Night" : "";

  switch (value) {
    case "clear":
      return isNight ? "Clear Night" : "Clear Sky";
    case "cloudy":
      return `Cloudy${daySuffix}`;
    case "rain":
      return `Rainy${daySuffix}`;
    case "storm":
      return isNight ? "Stormy Night" : "Storm";
    case "snow":
      return isNight ? "Snowy Night" : "Snow";
    case "mostly-sunny":
      return isNight ? "Mostly Clear Night" : "Mostly Sunny";
    case "partly-cloudy":
      return `Partly Cloudy${daySuffix}`;
    case "haze":
      return isNight ? "Hazy Night" : "Haze";
    case "sunset":
      return "Sunset Glow";
    default: {
      const baseName = titleCase(value);
      return (isNight ? baseName.replace(/sunny/ig, "Clear") : baseName) + daySuffix;
    }
  }
}

function getUvLabel(value: number) {
  if (value >= 8) {
    return "Very high";
  }
  if (value >= 6) {
    return "High";
  }
  if (value >= 3) {
    return "Moderate";
  }
  return "Low";
}

function getCurrentPosition() {
  // Capacitor's Geolocation plugin handles the native Android permission
  // prompt itself and falls back to navigator.geolocation on web/Electron.
  return Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000 * 60 * 10
  });
}

const isNativeApp = Capacitor.isNativePlatform();

// On native mobile there's no OS window to drag/resize, so the widget card
// supports its own drag-to-move and drag-to-resize within the app screen,
// with the chosen position/size remembered between launches.
interface NativeCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NATIVE_CARD_STORAGE_KEY = "coolweather-native-card";
const NATIVE_CARD_MIN_WIDTH = 180;
const NATIVE_CARD_MIN_HEIGHT = 160;

function loadNativeCardRect(): NativeCardRect | null {
  try {
    const raw = window.localStorage.getItem(NATIVE_CARD_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.x === "number" &&
      typeof parsed?.y === "number" &&
      typeof parsed?.width === "number" &&
      typeof parsed?.height === "number"
    ) {
      return parsed;
    }
  } catch {
    // Ignore corrupt/unavailable storage - fall back to the default rect.
  }
  return null;
}

function saveNativeCardRect(rect: NativeCardRect) {
  try {
    window.localStorage.setItem(NATIVE_CARD_STORAGE_KEY, JSON.stringify(rect));
  } catch {
    // Ignore storage failures (e.g. private mode).
  }
}

function clampNativeCardRect(rect: NativeCardRect): NativeCardRect {
  const maxWidth = Math.min(window.innerWidth - 16, 520);
  const maxHeight = Math.min(window.innerHeight - 16, 720);
  const width = Math.min(Math.max(rect.width, NATIVE_CARD_MIN_WIDTH), Math.max(NATIVE_CARD_MIN_WIDTH, maxWidth));
  const height = Math.min(Math.max(rect.height, NATIVE_CARD_MIN_HEIGHT), Math.max(NATIVE_CARD_MIN_HEIGHT, maxHeight));
  const x = Math.min(Math.max(rect.x, 0), Math.max(0, window.innerWidth - width));
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, window.innerHeight - height));
  return { x, y, width, height };
}

function defaultNativeCardRect(): NativeCardRect {
  const width = BASE_WIDGET_WIDTH;
  const height = BASE_WIDGET_HEIGHT;
  return {
    x: Math.round((window.innerWidth - width) / 2),
    y: Math.round((window.innerHeight - height) / 2),
    width,
    height
  };
}

export default function App() {
  const [weather, setWeather] = useState<WeatherSnapshot>(fallbackWeather);
  const [status, setStatus] = useState("Loading location...");
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App starting", { weather, status });
    if (isNativeApp) {
      document.body.classList.add("is-native-app");
    }
  }, []);

  if (appError) {
    return (
      <main
        style={{
          width: "100%",
          height: "100%",
          background: "#11263d",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
      >
        <div>
          <h1>App initialization error</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>{appError}</pre>
        </div>
      </main>
    );
  }

  const [widgetSize, setWidgetSize] = useState({ width: BASE_WIDGET_WIDTH, height: BASE_WIDGET_HEIGHT });
  const [nativeCardRect, setNativeCardRect] = useState<NativeCardRect | null>(() =>
    isNativeApp ? loadNativeCardRect() ?? defaultNativeCardRect() : null
  );
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeStateRef = useRef<{ pointerId: number; startX: number; startY: number; originWidth: number; originHeight: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandAnchorY, setExpandAnchorY] = useState<"top" | "bottom">("top");
  // Desktop-only: whether the real desktop behind the transparent widget is dark
  // there, so the condition label / location text can flip to stay legible.
  const [backdropIsDark, setBackdropIsDark] = useState(true);

  const widgetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isNativeApp) {
      return;
    }

    const handleViewportResize = () => {
      setNativeCardRect((prev) => (prev ? clampNativeCardRect(prev) : prev));
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  const handleCardPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!isNativeApp || isExpanded || !nativeCardRect) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".poster-number-button") || target.closest(".poster-resize-handle")) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: nativeCardRect.x,
      originY: nativeCardRect.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCardPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setNativeCardRect((prev) =>
      prev ? clampNativeCardRect({ ...prev, x: drag.originX + dx, y: drag.originY + dy }) : prev
    );
  };

  const endCardDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }
    dragStateRef.current = null;
    setNativeCardRect((prev) => {
      if (prev) {
        saveNativeCardRect(prev);
      }
      return prev;
    });
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!isNativeApp || isExpanded || !nativeCardRect) {
      return;
    }
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: nativeCardRect.width,
      originHeight: nativeCardRect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const resize = resizeStateRef.current;
    if (!resize || resize.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    // Locked to the card's original aspect ratio - resizing width/height
    // independently left the 3D scene (which scales by the more restrictive
    // of the two ratios) unable to fill the wider dimension, showing as a
    // big empty strip down the side. Using whichever axis implies the
    // bigger change keeps the drag feeling responsive in every direction.
    const widthScale = (resize.originWidth + dx) / resize.originWidth;
    const heightScale = (resize.originHeight + dy) / resize.originHeight;
    const scale = Math.max(widthScale, heightScale);
    setNativeCardRect((prev) =>
      prev
        ? clampNativeCardRect({
            ...prev,
            width: resize.originWidth * scale,
            height: resize.originHeight * scale
          })
        : prev
    );
  };

  const endCardResize = (event: React.PointerEvent<HTMLElement>) => {
    if (!resizeStateRef.current || resizeStateRef.current.pointerId !== event.pointerId) {
      return;
    }
    resizeStateRef.current = null;
    setNativeCardRect((prev) => {
      if (prev) {
        saveNativeCardRect(prev);
      }
      return prev;
    });
  };

  useGSAP(() => {
    // Animate the cloud layer from right to left with soft edge fades.
    const cloudTl = gsap.timeline({ repeat: -1 });
    cloudTl.fromTo('.poster-scene [class*="cloud"], .poster-scene [class*="Cloud"]',
      { x: 120, opacity: 0 },
      { x: 60, opacity: 1, duration: 6, ease: "none" }
    ).to('.poster-scene [class*="cloud"], .poster-scene [class*="Cloud"]',
      { x: -60, opacity: 1, duration: 12, ease: "none" }
    ).to('.poster-scene [class*="cloud"], .poster-scene [class*="Cloud"]',
      { x: -120, opacity: 0, duration: 6, ease: "none" }
    );

    gsap.to('.poster-scene [class*="sun"], .poster-scene [class*="Sun"], .poster-scene [class*="moon"], .poster-scene [class*="Moon"]', {
      y: -4,
      scale: 1.02,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      transformOrigin: "center"
    });
  }, { scope: widgetRef, dependencies: [weather.condition, weather.isNight] });

  useEffect(() => {

    const element = widgetRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setWidgetSize({
        width: Math.max(280, Math.round(width)),
        height: Math.max(BASE_WIDGET_HEIGHT, Math.round(height))
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const expandPanel = () => {
    setIsExpanded(true);
    setIsScrolled(false);
    setIsScrolling(false);
  };

// Expand the panel vertically without changing its width or position.
// On native mobile there is no OS window to resize - the app already fills the
// screen and the detail panel is just an overlay, so this is Electron-only.
    useEffect(() => {
      if (isNativeApp) {
        return;
      }

      let cancelled = false;

      const syncWindowSize = async () => {
        try {
          const result = await window.coolWeatherDesktop?.setWidgetSize?.(isExpanded ? "large" : "small");
          if (!cancelled && result?.anchorY) {
            setExpandAnchorY(result.anchorY);
          }
        } catch {
          if (!cancelled) {
            if (isExpanded) {
              window.resizeTo(BASE_WIDGET_WIDTH, EXPANDED_WIDGET_HEIGHT);
            } else {
              window.resizeTo(BASE_WIDGET_WIDTH, BASE_WIDGET_HEIGHT);
            }
            setExpandAnchorY("top");
          }
        }
      };

      void syncWindowSize();

      return () => {
        cancelled = true;
      };
    }, [isExpanded]);

  // Desktop-only: periodically sample the real desktop behind the widget so the
  // label/location text can switch between light and dark styling to stay
  // readable, regardless of what's on the user's wallpaper/windows behind it.
  useEffect(() => {
    if (isNativeApp || !window.coolWeatherDesktop?.sampleBackdrop) {
      return;
    }

    let cancelled = false;

    const sample = async () => {
      try {
        const result = await window.coolWeatherDesktop?.sampleBackdrop?.();
        if (!cancelled && result) {
          setBackdropIsDark(result.isDark);
        }
      } catch {
        // Keep the last known value on failure.
      }
    };

    void sample();
    const intervalId = window.setInterval(sample, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      if (manualQuery) {
        try {
          const liveWeather = await fetchLiveWeather(manualQuery);
          if (active) {
            setWeather(liveWeather);
            setStatus(`${liveWeather.city}`);
            setPanelMessage(null);
          }
        } catch {
          if (active) {
            setPanelMessage("Could not find that place.");
          }
        }
        return;
      }

      try {
        const position = await getCurrentPosition();
        const liveWeather = await fetchLiveWeatherByCoords(position.coords.latitude, position.coords.longitude);
        if (active) {
          setWeather(liveWeather);
          setStatus(`${liveWeather.city}`);
          setPanelMessage(null);
        }
        return;
      } catch {
        if (active) {
          setStatus("Geolocation failed, trying IP...");
        }
      }

      try {
        const liveWeather = await fetchLiveWeatherByIp();
        if (active) {
          setWeather(liveWeather);
          setStatus(`${liveWeather.city}`);
          setPanelMessage(null);
        }
      } catch (error) {
        if (active) {
          setWeather(zeroWeather);
          setStatus("Location unavailable");
          setPanelMessage("Search a city to load live details.");
          if (error instanceof Error) {
            setAppError(error.message);
          } else {
            setAppError(String(error));
          }
          console.error("loadWeather catch:", error);
        }
      }
    };

    void loadWeather();
    const timer = window.setInterval(() => {
      void loadWeather();
    }, 1000 * 60 * 5);

    // Mobile OSes suspend JS timers while the app is backgrounded, so the 5-minute
    // interval above won't fire while away - refresh explicitly when the app
    // comes back to the foreground instead.
    let removeAppStateListener: (() => void) | undefined;
    if (isNativeApp) {
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          void loadWeather();
        }
      }).then((handle) => {
        removeAppStateListener = () => {
          void handle.remove();
        };
      });
    }

    return () => {
      active = false;
      window.clearInterval(timer);
      removeAppStateListener?.();
    };
  }, [manualQuery]);

  const showTempPlaceholder = weather.source === "Fallback";
  const temperatureDisplay = displayTemp(weather.temperatureC, showTempPlaceholder);
  const usesDarkNumber =
  ["clear", "cloudy", "sunset", "snow"].includes(weather.condition) &&
  !weather.isNight;
  const historicalData = weather.historicalData ?? [];

  // Dev-only scene preview override: #test=storm-night forces the WeatherScene
  // into a specific condition/day-night combo regardless of live weather, so
  // each look can be reviewed and tuned in isolation. Driven by the <select>
  // rendered near the bottom of this component when running `npm run dev`.
  const [testHash, setTestHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setTestHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const testMatch = testHash.match(/test=([a-z-]+)-(day|night)/);
  const displayCondition = (testMatch ? testMatch[1] : weather.condition) as WeatherSnapshot["condition"];
  const displayIsNight = testMatch ? testMatch[2] === "night" : Boolean(weather.isNight);
  const previewValue = testMatch ? `${testMatch[1]}-${testMatch[2]}` : "";
  const handlePreviewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    window.location.hash = event.target.value ? `test=${event.target.value}` : "";
  };

  // NOTE: the storm lightning-strike -> temperature-number burn/ash/regen
  // effect that used to live here was wired to the old 2D-canvas
  // TemperatureNumber. It's being re-built directly inside WeatherScene now
  // that the digits are real 3D meshes in that same scene (see the TODO at
  // the strike-decision point in WeatherScene.tsx) - not ported yet.

  const layout = useMemo(() => {
    const widthRatio = widgetSize.width / BASE_WIDGET_WIDTH;
    const heightRatio = widgetSize.height / BASE_WIDGET_HEIGHT;
    // Desktop caps at 1x since its window only ever varies slightly from the base
    // widget size. Native mobile lets the user freely resize the card larger via the
    // resize handle, so the scene needs to scale up past 1x to fill it.
    const sceneScale = isNativeApp ? Math.min(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio, 1);
    const numberFontSize = Math.round(Math.min(widgetSize.width * 0.32, widgetSize.height * 0.42));
    const numberWidth = Math.round(numberFontSize * 1.34);
    const numberHeight = Math.round(numberFontSize * 1.46);
    const numberTop = Math.round(widgetSize.height * 0.28);
    // The temperature digits render as real 3D geometry inside WeatherScene
    // now, not this canvas box, and they sit lower in the frame than this
    // box does (closer to the rain) - push the label down near the bottom
    // of that box instead of pulling it up into it, or it overlaps the
    // digits' real on-screen position.
    const labelTop = numberTop + numberHeight + Math.round(widgetSize.height * 0.05);
    const labelFontSize = Math.max(14, Math.round(numberFontSize * 0.16));
    const locationTop = labelTop + Math.max(18, Math.round(labelFontSize * 1.3));
    const locationFontSize = Math.max(10, Math.round(labelFontSize * 0.62));

    return {
      sceneScale,
      numberFontSize,
      numberWidth,
      numberHeight,
      numberTop,
      labelTop,
      labelFontSize,
      locationTop,
      locationFontSize
    };
  }, [widgetSize.height, widgetSize.width]);

  const sceneFrameStyle: CSSProperties = {
    width: `${BASE_WIDGET_WIDTH}px`,
    height: `${BASE_WIDGET_HEIGHT}px`,
    transform: `translateX(-50%) scale(${layout.sceneScale})`
  };

  const numberWrapStyle = {
    top: `${layout.numberTop}px`,
    width: `${layout.numberWidth}px`,
    height: `${layout.numberHeight}px`
  } as CSSProperties;

  // Desktop-only adaptive contrast (native mobile has its own opaque
  // background, so it always stays on the light-text styling below).
  const useDarkText = !isNativeApp && !backdropIsDark;

  const labelStyle = {
    top: `${layout.labelTop}px`,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    fontSize: `${layout.labelFontSize}px`,
    color: useDarkText ? "rgba(18, 20, 28, 0.92)" : "rgba(245, 248, 255, 0.94)",
    textShadow: useDarkText ? "0 1px 3px rgba(255, 255, 255, 0.5)" : "0 1px 3px rgba(0, 0, 0, 0.4)"
  } as CSSProperties;

  const locationStyle = {
    top: `${layout.locationTop}px`,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    fontSize: `${layout.locationFontSize}px`,
    color: useDarkText ? "rgba(18, 20, 28, 0.68)" : "rgba(238, 242, 248, 0.68)",
    textShadow: useDarkText ? "0 1px 3px rgba(255, 255, 255, 0.5)" : "0 1px 3px rgba(0, 0, 0, 0.4)"
  } as CSSProperties;

  // Desktop-only: while the OS window is expanding and the desktop widget should
  // stay pinned to the bottom of the taller window, override its anchoring.
  const widgetAnchorStyle = !isNativeApp && isExpanded && expandAnchorY === "bottom"
    ? ({
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0
      } as CSSProperties)
    : undefined;

  // Native mobile: the card is user-positioned/resized (drag + resize handle)
  // rather than centered by CSS, so it needs explicit absolute placement.
  const nativeWidgetStyle: CSSProperties | undefined =
    isNativeApp && nativeCardRect
      ? {
          position: "absolute",
          left: `${nativeCardRect.x}px`,
          top: `${nativeCardRect.y}px`,
          width: `${nativeCardRect.width}px`,
          height: `${nativeCardRect.height}px`,
          touchAction: "none"
        }
      : undefined;

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) {
      return;
    }

    setIsSearching(true);
    setPanelMessage(null);
    setShowSuggestions(false);

    try {
      const liveWeather = await fetchLiveWeather(query);
      setWeather({
        ...liveWeather,
        updatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      });
      setStatus(`${liveWeather.city}`);
      setManualQuery(query);
      setSearchValue("");
      setSuggestions([]);
    } catch {
      setPanelMessage("Could not find that location.");
    } finally {
      setIsSearching(false);
    }
  };

const debounce = (fn: Function, delay: number) => {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedFetchSuggestions = useCallback(debounce(async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const results = await fetchLocationSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, 300), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setPanelMessage(null);
    debouncedFetchSuggestions(value);
  };

  const handleSelectSuggestion = async (suggestion: LocationSuggestion) => {
    const query = `${suggestion.name}, ${suggestion.country}`;
    setSearchValue(query);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(true);
    try {
      const liveWeather = await fetchLiveWeather(query);
      setWeather({
        ...liveWeather,
        updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      setStatus(liveWeather.city);
      setManualQuery(query);
      setPanelMessage(null);
    } catch (error) {
      console.error("Suggestion fetch error:", error);
      setPanelMessage("Could not fetch weather for selected location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleUseCurrentLocation = () => {
    setManualQuery(null);
    setPanelMessage(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const displayHourlyDetails = useMemo(() => {
    if (!weather.hourlyDetails) {
      return [];
    }

    return weather.hourlyDetails
      .filter((item) => item.label?.toLowerCase().trim() !== "now")
      .slice(0, 5);
  }, [weather.hourlyDetails]);

  const handlePanelScroll = (e: React.UIEvent<HTMLElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
    setIsScrolling(true);

    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 2000);
  };

  return (
    <>
      <style>
        {`
          .detail-panel::-webkit-scrollbar,
          .detail-overlay::-webkit-scrollbar {
            width: 6px;
          }
          .detail-panel::-webkit-scrollbar-track,
          .detail-overlay::-webkit-scrollbar-track {
            background: transparent;
          }
          .detail-panel::-webkit-scrollbar-thumb,
          .detail-overlay::-webkit-scrollbar-thumb {
            background-color: transparent;
            border-radius: 10px;
          }
          .detail-panel.is-scrolling::-webkit-scrollbar-thumb,
          .detail-overlay.is-scrolling::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.4);
          }
        `}
      </style>
    <main
        className={`poster-shell condition-${weather.condition}${isNativeApp ? " is-native-app" : ""}`}
        style={
          isNativeApp
            ? { position: "relative", width: "100vw", height: "100dvh", overflow: "hidden" }
            : {
                position: "relative",
                width: `${BASE_WIDGET_WIDTH}px`,
                height: isExpanded ? `${EXPANDED_WIDGET_HEIGHT}px` : `${BASE_WIDGET_HEIGHT}px`,
                overflow: "hidden"
              }
        }
      >
      <section
        className="poster-widget"
        ref={widgetRef}
        style={{ ...widgetAnchorStyle, ...nativeWidgetStyle, visibility: isExpanded ? "hidden" : "visible" }}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={endCardDrag}
        onPointerCancel={endCardDrag}
      >
        <div className="poster-frame poster-scene-frame" style={sceneFrameStyle}>
          <div className="poster-scene">
            <WeatherScene
              condition={displayCondition}
              isNight={displayIsNight}
              numberText={temperatureDisplay}
            />
          </div>
        </div>

        {isNativeApp && !isExpanded ? (
          <div
            className="poster-resize-handle"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={endCardResize}
            onPointerCancel={endCardResize}
          />
        ) : null}

        <div className="poster-hero">
          {/*
            The digits themselves now render as real 3D geometry inside
            WeatherScene (the WebGL canvas behind this), not here - this
            button just keeps the same click-to-expand hit target and
            accessibility label at the number's on-screen position.
          */}
          <button
            type="button"
            className={`poster-number-wrap poster-number-button${showTempPlaceholder ? " is-placeholder" : ""}`}
            style={numberWrapStyle}
            aria-label={showTempPlaceholder ? "Temperature unavailable" : `${Math.round(weather.temperatureC)} degrees`}
            onClick={expandPanel}
          />

          <div className="poster-label" style={labelStyle}>
            {displayConditionName(weather.condition, Boolean(weather.isNight))}
          </div>

          {!showTempPlaceholder && (weather.specificLocation || weather.city) && (
            <div className="poster-location" style={locationStyle}>
              {weather.specificLocation || weather.city}
            </div>
          )}
        </div>
      </section>

        {isExpanded ? (
          <div
            className={`detail-overlay ${isScrolling ? "is-scrolling" : ""}`}
            onClick={() => setIsExpanded(false)}
            onScroll={handlePanelScroll}
          >
<section 
  className={`detail-panel ${isScrolling ? "is-scrolling" : ""}`}
  onClick={(event) => event.stopPropagation()}
  onScroll={handlePanelScroll}
  style={{
    width: '100%',
    boxSizing: 'border-box' as CSSProperties['boxSizing'],
    wordBreak: 'break-word' as CSSProperties['wordBreak'],
    padding: 0 // Remove panel padding so the header aligns with the panel edges.
  }}
>
              <section 
                className="live-weather-header-section"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backdropFilter: isScrolled ? "blur(12px)" : "none",
                  WebkitBackdropFilter: isScrolled ? "blur(12px)" : "none",
                  transition: "backdrop-filter 0.2s ease, -webkit-backdrop-filter 0.2s ease",
                  padding: "24px 24px 12px 24px",
                  borderTopLeftRadius: 'inherit', // Match the parent corner radius.
                  borderTopRightRadius: 'inherit',
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                <p className="detail-kicker" style={{ margin: 0 }}>Live Weather Forecast</p>
              </section>
              <div className="detail-panel-content" style={{ padding: "0 24px 24px 24px" }}>
              <header className="detail-topbar">
                <div>
                  <h2 className="detail-place">{weather.city}</h2>
                  <p className="detail-region">
                    {weather.region || weather.summary}
                    {weather.timezone ? ` • ${weather.timezone}` : ""}
                  </p>
                </div>
                <button type="button" className="detail-close" onClick={() => setIsExpanded(false)}>
                  Back
                </button>
              </header>

              <section className="detail-stage" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box', padding: '0 12px' }}>
                <div className="detail-glow detail-glow-left" />
                <div className="detail-glow detail-glow-right" />
                <div className="detail-hero-core" style={{ textAlign: 'center', fontSize: '0.95em' }}>
                  <div className="detail-temp-display" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: '0 12px' }}>
                    <span className="detail-temp-c">{formatTemp(weather.temperatureC, showTempPlaceholder)}<span className="temp-unit">C</span></span>
                    <span className="detail-temp-f">{showTempPlaceholder ? "--" : `${toFahrenheit(weather.temperatureC)}°`}<span className="temp-unit">F</span></span>
                  </div>
                  <div className="detail-tone-pill">{displayConditionName(weather.condition, Boolean(weather.isNight))}</div>
                  <p className="detail-summary-text">{weather.summary}</p>
                </div>

                <div className="detail-orbit-strip detail-orbit-strip-top" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', width: '100%', gap: '8px', marginTop: '12px' }}>
                  <div className="orbit-metric">
                    <span className="orbit-label">Feels</span>
                    <strong>{formatTemp(weather.feelsLikeC, showTempPlaceholder)}</strong>
                  </div>
                  <div className="orbit-metric">
                    <span className="orbit-label">Wind</span>
                    <strong>{Math.round(weather.windKph)} km/h</strong>
                  </div>
                  <div className="orbit-metric">
                    <span className="orbit-label">Humidity</span>
                    <strong>{Math.round(weather.humidity)}%</strong>
                  </div>
                </div>

                <div className="detail-orbit-strip detail-orbit-strip-bottom" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">UV</span>
                    <strong>{weather.uvIndex.toFixed(1)}</strong>
                    <em>{getUvLabel(weather.uvIndex)}</em>
                  </div>
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">AQI</span>
                    <strong>{weather.aqi !== undefined ? weather.aqi : "--"}</strong>
                    <em>{weather.aqiStatus || "Unknown"}</em>
                  </div>
                  <div className="orbit-metric orbit-metric-wide">
                    <span className="orbit-label">Updated</span>
                    <strong>
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </strong>
                    <em>{status}</em>
                  </div>
                </div>
              </section>

              <section className="detail-ribbon-zone">
                <div className="detail-section-head">
                  <span>Next Hours</span>
                  <span>{displayConditionName(weather.condition, Boolean(weather.isNight))}</span>
                </div>
                <div className="detail-ribbon-scroll">
                  {displayHourlyDetails
                    .map((item) => (
                  <article key={item.label} className="forecast-pill" style={{ flex: '0 0 auto' }}>

                        <span className="forecast-time">{item.label}</span>
                        <span className="forecast-meta">Wind</span>

                        <strong className="forecast-temp">
                          {formatTemp(item.temperatureC)}
                        </strong>
                        <span className="forecast-meta">
                          {Math.round(item.windKph)} km/h
                        </span>

                        <span className="forecast-state">
                          {displayConditionName(item.condition, item.isNight)}
                        </span>
                        <span className="forecast-meta">
                          UV {item.uvIndex.toFixed(1)}
                        </span>

                      </article>
                    ))}
                </div>
              </section>

              {weather.specificLocation && (
                <section className="detail-location-info">
                  <div className="detail-section-head">
                    <span>Specific Location</span>
                  </div>
                  <div className="location-detail">
                    <p className="location-text">{weather.specificLocation}</p>
                  </div>
                </section>
              )}

              <section className="detail-astronomy-zone">
                <div className="detail-section-head">
                  <span>Astronomy</span>
                </div>
                <div className="astronomy-grid">
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌅 Sunrise</span>
                    <span className="astronomy-value">{weather.sunrise ?? "--"}</span>
                  </div>
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌇 Sunset</span>
                    <span className="astronomy-value">{weather.sunset ?? "--"}</span>
                  </div>
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌙 Moonrise</span>
                    <span className="astronomy-value">{weather.moonrise ?? "--"}</span>
                  </div>
                  <div className="astronomy-card">
                    <span className="astronomy-label">🌙 Moonset</span>
                    <span className="astronomy-value">{weather.moonset ?? "--"}</span>
                  </div>
                </div>
              </section>

              {historicalData.length > 0 && (
                <section className="detail-historical-zone">
                  <div className="detail-section-head">
                    <span>Last 10 Days</span>
                  </div>
                  <div className="historical-grid">
                    {historicalData.map((item) => (
                      <article key={item.date} className="historical-card">
                        <span className="historical-date">
                          {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <div className="historical-temps">
                          <span className="temp-max">{Math.round(item.temperatureMaxC)}°</span>
                          <span className="temp-min">{Math.round(item.temperatureMinC)}°</span>
                        </div>
                        <span className="historical-condition">{displayConditionName(item.condition)}</span>
                        {item.precipitationMm > 0 && (
                          <span className="historical-precip">↓ {item.precipitationMm.toFixed(1)}mm</span>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="detail-search-dock">
                <form className="search-glass" onSubmit={handleSearch}>
                  <input
                    className="search-glass-input"
                    type="text"
                    placeholder="Search a location"
                    value={searchValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    autoComplete="off"
                  />
                  <button className="search-glass-button" type="submit" disabled={isSearching}>
                    {isSearching ? "Finding" : "Search"}
                  </button>
                  {showSuggestions && (
                    <ul className="suggestions-dropdown" role="listbox">
                      {suggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion.latitude}-${suggestion.longitude}`}
                          className="suggestion-item"
                          onMouseDown={() => handleSelectSuggestion(suggestion)}
                          role="option"
                          aria-selected={false}
                        >
                          {suggestion.name}, {suggestion.region || suggestion.country}
                        </li>
                      ))}
                    </ul>
                  )}
                </form>
                <button type="button" className="search-current" onClick={handleUseCurrentLocation}>
                  Current location
                </button>
                {panelMessage ? <p className="panel-message">{panelMessage}</p> : null}
              </section>
            </div>
            </section>
          </div>
        ) : null}
    </main>
    {import.meta.env.DEV ? (
      <select
        value={previewValue}
        onChange={handlePreviewChange}
        title="Preview a weather scene without live data"
        style={{
          position: "fixed",
          top: 4,
          left: 4,
          zIndex: 9999,
          maxWidth: "132px",
          fontSize: "10px",
          background: "rgba(10, 12, 18, 0.75)",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          padding: "2px 3px"
        }}
      >
        <option value="">Live weather</option>
        {PREVIEW_CONDITIONS.flatMap((condition) => [
          <option key={`${condition}-day`} value={`${condition}-day`}>
            {condition} (day)
          </option>,
          <option key={`${condition}-night`} value={`${condition}-night`}>
            {condition} (night)
          </option>
        ])}
      </select>
    ) : null}
    </>
  );
}
