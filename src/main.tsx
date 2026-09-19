import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <App />
      </TooltipProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
