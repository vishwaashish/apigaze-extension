import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { watchDevtoolsTheme } from "./applyTheme";
import "./styles.css";

watchDevtoolsTheme();

const root = document.getElementById("root");

if (!root) {
  throw new Error("APIGaze panel root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
