import React, { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

export const WindowControls: React.FC = () => {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const isDesktop =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
    setIsTauri(isDesktop);

    if (!isDesktop) return;

    // Dynamically check window maximized state if available
    const checkMaximized = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      } catch {
        // Fallback
      }
    };
    checkMaximized();

    const interval = setInterval(checkMaximized, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("minimize_window");
    } catch {
      // In web preview fallback
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("toggle_maximize_window");
      setIsMaximized((prev) => !prev);
    } catch {
      // In web preview fallback
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_window");
    } catch {
      // In web preview fallback
    }
  };

  // Only render window caption buttons in desktop / Tauri context
  if (!isTauri) return null;

  return (
    <div className="flex items-center h-full select-none ml-2 shrink-0" data-tauri-drag-region="false">
      {/* Minimize */}
      <button
        type="button"
        onClick={handleMinimize}
        className="w-10 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
        title="Minimize"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* Maximize / Restore */}
      <button
        type="button"
        onClick={handleToggleMaximize}
        className="w-10 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <Copy className="w-3 h-3 rotate-180" />
        ) : (
          <Square className="w-3 h-3" />
        )}
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        className="w-10 h-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-red-500 transition-colors cursor-pointer rounded-tr-md"
        title="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
