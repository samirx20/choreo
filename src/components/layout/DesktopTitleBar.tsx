import React, { useState } from "react";
import {
  Film,
  Bot,
  Copy,
  Check,
  Sparkles,
  FileCode,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMcpStore } from "@/store/useMcpStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";
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

  const [activeTab, setActiveTab] = useState<"agent" | "cursor" | "claude">("agent");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const activeProjectName = doc.name ? `${doc.name}.mtn` : "project.mtn";
  const mcpScriptPath = "C:/Users/Sam/Documents/CODE/MOTION-STUDIO/mcp.js";

  const markCopied = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getClaudeConfig = () => {
    return JSON.stringify(
      {
        mcpServers: {
          "motion-studio": {
            command: "node",
            args: [mcpScriptPath],
          },
        },
      },
      null,
      2
    );
  };

  const getCursorMcpJson = () => {
    return JSON.stringify(
      {
        mcpServers: {
          "motion-studio": {
            command: "node",
            args: [mcpScriptPath],
          },
        },
      },
      null,
      2
    );
  };

  const getCursorCommand = () => {
    return `node "${mcpScriptPath}"`;
  };

  const getAgentInstructionsPrompt = () => {
    return `Connect to Motion Studio via its Model Context Protocol (MCP) server so you can create, inspect, and choreograph animations tool-by-tool.

### 1. How to Connect / Configure MCP Server:
- Server Name: motion-studio
- Command: node
- Script Path: ${mcpScriptPath}

JSON snippet for your MCP settings file (claude_desktop_config.json, .cursor/mcp.json, or agent settings):
${getClaudeConfig()}

### 2. Active Project:
- Target File: ${activeProjectName}
- Working Directory: Project root (or pass the full path to ${activeProjectName} in the "file" argument)

### 3. Your Available Tools:
Once connected, you will have access to the Motion Studio tools:
- get_storyboard_state({ file }): Read the scenes, layers, hierarchy, and bounds.
- create_scene({ name, duration, mood }): Add a scene with timing and aesthetic mood.
- place_element({ sceneId, name, type, grid, enter, style }): Place elements onto the modular grid with entrance physics.
- apply_animation({ layerId, preset, duration, easing, type }): Add transitions and motion effects.
- link_elements({ sourceId, targetId, mode }): Relational bindings (hugging, reflow, pins).
- lint_storyboard({ file }): Pre-flight check verifying 0 black frames and physical momentum.

Please register/connect this MCP server, inspect the active project with get_storyboard_state, and let me know when you are ready to begin choreographing!`;
  };

  // Native window actions via Rust invoke commands (with Window API fallback)
  const handleMinimize = async () => {
    try {
      await invoke("minimize_window");
    } catch {
      try {
        const win = getCurrentWindow();
        await win?.minimize();
      } catch (err) {
        console.error("Failed to minimize window:", err);
      }
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await invoke("toggle_maximize_window");
    } catch {
      try {
        const win = getCurrentWindow();
        await win?.toggleMaximize();
      } catch (err) {
        console.error("Failed to toggle maximize:", err);
      }
    }
  };

  const handleClose = async () => {
    try {
      await invoke("close_window");
    } catch {
      try {
        const win = getCurrentWindow();
        await win?.close();
      } catch (err) {
        console.error("Failed to close window:", err);
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-9 w-full bg-card border-b border-border flex items-center justify-between pl-3 pr-0 select-none shrink-0 z-50 text-xs font-sans"
    >
      {/* 1. Left: Branding + Project File + MCP & Agent Setup */}
      <div data-tauri-drag-region className="flex items-center gap-2.5 min-w-0">
        {/* App Wordmark */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Film className="w-3.5 h-3.5 text-foreground shrink-0" />
          <span className="font-semibold text-foreground tracking-tight shrink-0">
            Motion Studio
          </span>
        </div>

        {/* Project Name Breadcrumb */}
        {currentView !== "workspace" && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-muted-foreground/40 shrink-0">/</span>
            <span className="text-muted-foreground truncate max-w-[160px] font-mono text-[11px]">
              {doc.name ? `${doc.name}.mtn` : "Untitled.mtn"}
            </span>
          </div>
        )}

        {/* Subtle Vertical Divider */}
        <div className="h-3.5 w-px bg-border/60 mx-1 shrink-0" />

        {/* MCP Toggle Switch on the LEFT */}
        <button
          type="button"
          onClick={toggleMcp}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all cursor-pointer shrink-0",
            isMcpEnabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
          )}
          title={
            isMcpEnabled
              ? "MCP Agent Server Active (Click to disable)"
              : "MCP Agent Server Disabled (Click to enable)"
          }
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              isMcpEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
            )}
          />
          <span>{isMcpEnabled ? "MCP: Active" : "MCP: Off"}</span>
        </button>

        {/* Copy Agent Setup Popover on the LEFT */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 border border-border/60"
              title="Agent MCP Connection Guide"
            >
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>Agent Setup</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[480px] p-4 bg-popover border border-border shadow-2xl rounded-xl text-popover-foreground z-50"
          >
            <div className="space-y-3.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-foreground">
                      Connect MCP to Your AI Agent
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Give Cursor, Claude Desktop, or your AI agent direct control over{" "}
                      <span className="font-mono text-foreground">{activeProjectName}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                  stdio (zero-port)
                </span>
              </div>

              {/* Client Selection Tabs */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[11px] font-medium border border-border/50">
                <button
                  type="button"
                  onClick={() => setActiveTab("agent")}
                  className={cn(
                    "flex-1 py-1 px-2.5 rounded-md transition-all cursor-pointer text-center",
                    activeTab === "agent"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Prompt for Agent
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cursor")}
                  className={cn(
                    "flex-1 py-1 px-2.5 rounded-md transition-all cursor-pointer text-center",
                    activeTab === "cursor"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Cursor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("claude")}
                  className={cn(
                    "flex-1 py-1 px-2.5 rounded-md transition-all cursor-pointer text-center",
                    activeTab === "claude"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Claude Desktop
                </button>
              </div>

              {/* Tab 1: Prompt for Agent (Antigravity, Cursor Agent, Cline, Windsurf) */}
              {activeTab === "agent" && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Paste this directly into your agent's chat. It tells the agent how to configure the MCP server, run <span className="font-mono text-foreground">mcp.js</span>, and start editing <span className="font-mono text-foreground">{activeProjectName}</span>:
                  </p>
                  <div className="relative rounded-lg bg-muted/60 p-2.5 font-mono text-[10px] text-foreground border border-border/60 max-h-36 overflow-y-auto leading-relaxed select-text">
                    <pre className="whitespace-pre-wrap">{getAgentInstructionsPrompt()}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => markCopied("agent_prompt", getAgentInstructionsPrompt())}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedKey === "agent_prompt" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Instructions for Agent!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Agent Instructions Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Cursor Setup */}
              {activeTab === "cursor" && (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>
                      <strong>Option A:</strong> In Cursor, go to <span className="font-medium text-foreground">Settings → Features → MCP → Add New MCP Server</span>:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                      <li>Name: <span className="font-mono text-foreground">motion-studio</span></li>
                      <li>Type: <span className="font-mono text-foreground">command</span></li>
                      <li>Command: <span className="font-mono text-foreground">{getCursorCommand()}</span></li>
                    </ul>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <p>
                      <strong>Option B:</strong> Or save to <span className="font-mono text-foreground">.cursor/mcp.json</span>:
                    </p>
                  </div>
                  <div className="relative rounded-lg bg-muted/60 p-2 font-mono text-[10px] text-foreground border border-border/60 overflow-x-auto">
                    <pre>{getCursorMcpJson()}</pre>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markCopied("cursor_cmd", getCursorCommand())}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-foreground hover:bg-muted/80 py-1.5 px-2.5 rounded-lg text-[11px] font-medium border border-border transition-colors cursor-pointer"
                    >
                      {copiedKey === "cursor_cmd" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied Command!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => markCopied("cursor_json", getCursorMcpJson())}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedKey === "cursor_json" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied JSON!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy .cursor/mcp.json</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Claude Desktop Setup */}
              {activeTab === "claude" && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Paste this into your <span className="font-mono text-foreground">claude_desktop_config.json</span>:
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-mono">
                    Windows: %APPDATA%\Claude\claude_desktop_config.json<br />
                    macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
                  </p>
                  <div className="relative rounded-lg bg-muted/60 p-2 font-mono text-[10px] text-foreground border border-border/60 overflow-x-auto">
                    <pre>{getClaudeConfig()}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => markCopied("claude_json", getClaudeConfig())}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedKey === "claude_json" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Claude Config JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Claude Config JSON</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Active Project Footer Banner */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  Target: <strong className="font-mono text-foreground">{activeProjectName}</strong>
                </span>
                <span className="font-mono">stdio · node mcp.js</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 2. Center: Draggable Window Strip */}
      <div data-tauri-drag-region className="flex-1 h-full mx-2" />

      {/* 3. Right: Native Window Action Buttons (Windows 11 standard 46px click targets) */}
      <div className="flex items-stretch h-full shrink-0">
        {/* Minimize Button */}
        <button
          type="button"
          onClick={handleMinimize}
          className="w-[46px] h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted transition-colors cursor-pointer"
          title="Minimize"
          aria-label="Minimize Window"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          className="w-[46px] h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted transition-colors cursor-pointer"
          title="Maximize"
          aria-label="Maximize Window"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10">
            <rect x="0.6" y="0.6" width="8.8" height="8.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        {/* Close Button (Windows standard red hover) */}
        <button
          type="button"
          onClick={handleClose}
          className="w-[46px] h-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-[#e81123] active:bg-[#c4101e] transition-colors cursor-pointer"
          title="Close"
          aria-label="Close Window"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10">
            <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </header>
  );
};
