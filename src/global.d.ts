export {};

declare global {
  interface Window {
    coolWeatherDesktop?: {
      platform: string;
      fetchJson?: (url: string) => Promise<unknown>;
      fetchText?: (url: string) => Promise<string>;
      setWidgetSize?: (mode: "small" | "large" | "toggle") => Promise<{ anchorY: "top" | "bottom" }>;
    };
  }
}
