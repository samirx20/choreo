import React, { useState } from "react";
import {
  Film,
  Bot,
  Copy,
  Check,
  Minus,
  Square,
  X,
  Sparkles,
  FileCode,
} from "lucide-react";
import { useMcpStore } from "@/store/useMcpStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";
import { isTauriEnvironment } from "@/services/fileAdapter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const DesktopTitleBar: React.FC = () => {
  const isMcpEnabled = useMcpStore((s) => s.isMcpEnabled);
  const toggleMcp = useMcpStore((s) => s.toggleMcp);
  const currentView = useProjectRegistryStore((s) => s.currentView);
  const doc = useProjectStore((s) => s.document);

  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Native Tauri Window Handlers
  const handleMinimize = async () => {
    if (isTauriEnvironment()) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().minimize();
      } catch (err) {
        console.warn("Failed to minimize window:", err);
      }
    }
  };

  const handleToggleMaximize = async () => {
    if (isTauriEnvironment()) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().toggleMaximize();
      } catch (err) {
        console.warn("Failed to toggle maximize:", err);
      }
    }
  };

  const handleClose = async () => {
    if (isTauriEnvironment()) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
      } catch (err) {
        console.warn("Failed to close window:", err);
      }
    }
  };

  const getMcpConfigSnippet = () => {
    return JSON.stringify(
      {
        mcpServers: {
          "motion-studio": {
            command: "node",
            args: ["./mcp.js"],
          },
        },
      },
      null,
      2
    );
  };

  const getAgentInstructionsPrompt = () => {
    return `You have direct access to Motion Studio through the "motion-studio" MCP server.
You can create and edit product showcase animations tool-by-tool on the active .mtn project file.
Available tools:
- create_scene: Creates a narrative beat with duration, mood, and camera framing.
- place_element: Places text, shapes, icons, counters, or 3D mockups onto the modular grid.
- apply_animation: Applies entrance (pop, drawOn, fade, slide) or action transitions.
- link_elements: Binds elements with reactive hugging, reflow spacing, or tracking pins.
- get_storyboard_state: Inspects the current project hierarchy, layers, and contact sheet.
- lint_storyboard: Pre-flight validator ensuring 0 black frames, valid layout, and high aesthetic fidelity.
Always work iteratively tool-by-tool to construct the storyboard.`;
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(getMcpConfigSnippet());
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(getAgentInstructionsPrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <header
      data-tauri-drag-region
      className="h-8 w-full bg-card border-b border-border flex items-center justify-between px-3 select-none shrink-0 z-50 text-xs font-sans"
    >
      {/* 1. Left: Branding & Active Project File */}
      <div data-tauri-drag-region className="flex items-center gap-2 min-w-0">
        <Film className="w-3.5 h-3.5 text-foreground shrink-0" />
        <span className="font-semibold text-foreground tracking-tight shrink-0">
          Motion Studio
        </span>
        {currentView !== "workspace" && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-muted-foreground truncate max-w-[200px]">
              {doc.name ? `${doc.name}.mtn` : "Untitled.mtn"}
            </span>
          </>
        )}
      </div>

      {/* 2. Center / Draggable Filler */}
      <div data-tauri-drag-region className="flex-1 h-full mx-2" />

      {/* 3. Right: MCP Controls & Native Window Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* MCP Toggle Switch */}
        <button
          type="button"
          onClick={toggleMcp}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all cursor-pointer",
            isMcpEnabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
          )}
          title={isMcpEnabled ? "MCP Agent Server Active (Click to disable)" : "MCP Agent Server Disabled (Click to enable)"}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              isMcpEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
            )}
          />
          <span>{isMcpEnabled ? "MCP: Active" : "MCP: Off"}</span>
        </button>

        {/* Copy Agent Setup Popover */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy Agent MCP Configuration & Instructions"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Agent Setup</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-84 p-3 bg-popover border border-border shadow-xl rounded-lg text-popover-foreground"
          >
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Agent MCP Setup
                  </h4>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                    stdio
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Connect Claude Desktop, Cursor, or your local agent to edit your <span className="font-mono text-foreground">.mtn</span> files tool-by-tool.
                </p>
              </div>

              {/* Config Code Box */}
              <div className="relative rounded-md bg-muted/60 p-2 font-mono text-[10px] text-foreground border border-border/60 overflow-x-auto">
                <pre>{getMcpConfigSnippet()}</pre>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyConfig}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {copiedConfig ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied JSON!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Config</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-foreground hover:bg-muted/80 py-1.5 px-2.5 rounded-md text-[11px] font-medium border border-border transition-colors cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3 h-3" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Vertical Divider */}
        <div className="h-3.5 w-px bg-border/60 mx-0.5" />

        {/* Native Window Controls */}
        <div className="flex items-center -mr-1">
          <button
            type="button"
            onClick={handleMinimize}
            className="w-7 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-7 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-6 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-destructive rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
