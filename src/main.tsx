import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global renderer error:", { message, source, lineno, colno, error });
  return false;
};

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
