import React, { useState, useEffect } from "react";
import {
  Server,
  Play,
  Square,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  Bot,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useMcpStore } from "@/store/useMcpStore";
import { useProjectStore } from "@/store/useProjectStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface McpDropdownProps {
  className?: string;
}

export const McpDropdown: React.FC<McpDropdownProps> = ({ className }) => {
  const {
    port,
    status,
    error,
    setPort,
    startServer,
    stopServer,
    checkStatus,
  } = useMcpStore();

  const doc = useProjectStore((s) => s.document);
  const activeProjectName = doc.name ? `${doc.name}.mtn` : "project.mtn";
  const mcpScriptPath = "C:/Users/Sam/Documents/CODE/MOTION-STUDIO/mcp.js";

  const [isOpen, setIsOpen] = useState(false);
  const [portInput, setPortInput] = useState<string>(String(port));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"prompt" | "cursor" | "claude">("prompt");

  useEffect(() => {
    setPortInput(String(port));
  }, [port]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setPortInput(val);
  };

  const handleStart = async () => {
    const parsed = parseInt(portInput, 10);
    const validPort = !isNaN(parsed) && parsed >= 1024 && parsed <= 65535 ? parsed : 8765;
    setPort(validPort);
    await startServer(validPort);
  };

  const handleStop = async () => {
    await stopServer();
  };

  const markCopied = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sseUrl = `http://localhost:${port}/sse`;
  const httpUrl = `http://localhost:${port}/mcp`;

  const getClaudeConfig = () => {
    return JSON.stringify(
      {
        mcpServers: {
          "motion-studio": {
            command: "node",
            args: [mcpScriptPath, "--port", String(port)],
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
            url: sseUrl,
          },
        },
      },
      null,
      2
    );
  };

  const getAgentInstructionsPrompt = () => {
    return `Connect to Motion Studio via its Model Context Protocol (MCP) server running on port ${port}:
- SSE URL: ${sseUrl}
- HTTP RPC: ${httpUrl}
- Active Project: ${activeProjectName}

Available Tools:
- get_storyboard_state({ file })
- create_scene({ name, duration, mood })
- place_element({ sceneId, name, type, grid, enter, style })
- apply_animation({ layerId, preset, duration, easing, type })
- link_elements({ sourceId, targetId, mode })
- lint_storyboard({ file })`;
  };

  const isRunning = status === "running";
  const isStarting = status === "starting";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer select-none",
            isRunning
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              : isStarting
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
              : "bg-muted/70 hover:bg-muted border-border text-muted-foreground hover:text-foreground",
            className
          )}
          title="Motion Studio MCP Server Settings"
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0 transition-all",
              isRunning
                ? "bg-emerald-500 animate-pulse"
                : isStarting
                ? "bg-amber-500 animate-ping"
                : "bg-muted-foreground/50"
            )}
          />
          <span className="font-mono tracking-tight">
            {isRunning ? `MCP :${port}` : isStarting ? "MCP..." : "MCP: Off"}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[420px] p-4 bg-popover border border-border shadow-2xl rounded-xl text-popover-foreground z-50 text-xs font-sans"
      >
        <div className="space-y-3.5">
          {/* 1. Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Server className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-foreground">
                  MCP Server
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Connect AI agents to choreograph{" "}
                  <span className="font-mono text-foreground">{activeProjectName}</span>
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium font-mono border",
                isRunning
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isStarting
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {isRunning ? "Active" : isStarting ? "Starting..." : "Stopped"}
            </span>
          </div>

          {/* 2. Error Message banner */}
          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* 3. Port & Server Control Row */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border/60 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">Server Port:</span>
              <span className="text-muted-foreground text-[10px] font-mono">
                {isRunning ? "Stop server to change port" : "Recommended: 8765"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={portInput}
                  onChange={handlePortChange}
                  disabled={isRunning || isStarting}
                  placeholder="8765"
                  className={cn(
                    "w-full h-8 px-3 text-xs font-mono rounded-md border outline-none transition-colors",
                    isRunning
                      ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                      : "bg-background border-border focus:border-ring text-foreground"
                  )}
                />
              </div>

              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="h-8 px-3 rounded-md bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Server</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isStarting}
                  className="h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Server</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Endpoint Preview */}
            {isRunning && (
              <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <span className="text-emerald-500 font-bold">SSE:</span>
                  <span className="text-foreground">{sseUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => markCopied("sse_url", sseUrl)}
                  className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedKey === "sse_url" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === "sse_url" ? "Copied" : "Copy URL"}</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Agent Setup Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">
                Agent Configuration:
              </span>
            </div>

            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[10.5px] font-medium border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab("prompt")}
                className={cn(
                  "flex-1 py-1 rounded-md transition-all cursor-pointer text-center",
                  activeTab === "prompt"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Agent Prompt
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cursor")}
                className={cn(
                  "flex-1 py-1 rounded-md transition-all cursor-pointer text-center",
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
                  "flex-1 py-1 rounded-md transition-all cursor-pointer text-center",
                  activeTab === "claude"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Claude
              </button>
            </div>

            {/* Tab: Prompt */}
            {activeTab === "prompt" && (
              <div className="space-y-2">
                <div className="relative rounded-lg bg-muted/60 p-2 font-mono text-[10px] text-foreground border border-border/60 max-h-24 overflow-y-auto leading-relaxed select-text">
                  <pre className="whitespace-pre-wrap">{getAgentInstructionsPrompt()}</pre>
                </div>
                <button
                  type="button"
                  onClick={() => markCopied("prompt", getAgentInstructionsPrompt())}
                  className="w-full h-7 flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {copiedKey === "prompt" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Instructions for Agent</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab: Cursor */}
            {activeTab === "cursor" && (
              <div className="space-y-2">
                <div className="relative rounded-lg bg-muted/60 p-2 font-mono text-[10px] text-foreground border border-border/60 max-h-24 overflow-x-auto select-text">
                  <pre>{getCursorMcpJson()}</pre>
                </div>
                <button
                  type="button"
                  onClick={() => markCopied("cursor", getCursorMcpJson())}
                  className="w-full h-7 flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {copiedKey === "cursor" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
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
            )}

            {/* Tab: Claude */}
            {activeTab === "claude" && (
              <div className="space-y-2">
                <div className="relative rounded-lg bg-muted/60 p-2 font-mono text-[10px] text-foreground border border-border/60 max-h-24 overflow-x-auto select-text">
                  <pre>{getClaudeConfig()}</pre>
                </div>
                <button
                  type="button"
                  onClick={() => markCopied("claude", getClaudeConfig())}
                  className="w-full h-7 flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {copiedKey === "claude" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied Config!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Claude Config JSON</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
