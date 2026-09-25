import React, { useState, useEffect } from "react";
import {
  Play,
  Square,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useMcpStore } from "@/store/useMcpStore";
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

  const [isOpen, setIsOpen] = useState(false);
  const [portInput, setPortInput] = useState<string>(String(port));
  const [copied, setCopied] = useState(false);

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

  const handlePortBlur = () => {
    const parsed = parseInt(portInput, 10);
    if (isNaN(parsed) || parsed < 1024 || parsed > 65535) {
      setPortInput(String(port));
    } else {
      setPort(parsed);
      setPortInput(String(parsed));
    }
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

  const handleCopyPrompt = () => {
    const sseUrl = `http://localhost:${port}/sse`;
    const httpUrl = `http://localhost:${port}/mcp`;
    const promptText = `Connect to Motion Studio via its Model Context Protocol (MCP) server running on port ${port}:
- SSE URL: ${sseUrl}
- HTTP RPC: ${httpUrl}

Available Tools:
- get_storyboard_state({ file })
- create_scene({ file, name, duration, mood })
- place_element({ file, sceneId, name, type, grid, enter, style })
- apply_animation({ file, layerId, preset, duration, easing, type })
- lint_storyboard({ file })`;

    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          title="Motion Studio MCP Server"
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
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-72 p-3 bg-popover border border-border shadow-xl rounded-xl text-popover-foreground z-50 text-xs font-sans"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-semibold text-xs text-foreground">
              MCP Server
            </span>
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

          {/* Error Message banner */}
          {error && (
            <div className="flex items-center gap-1.5 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Port Input & Server Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Port</span>
              {isRunning && (
                <span className="text-[10px] font-mono text-emerald-500">
                  localhost:{port}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={portInput}
                onChange={handlePortChange}
                onBlur={handlePortBlur}
                disabled={isRunning || isStarting}
                placeholder="8765"
                className={cn(
                  "w-24 h-8 px-2.5 text-xs font-mono rounded-md border outline-none transition-colors",
                  isRunning
                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                    : "bg-background border-border focus:border-ring text-foreground"
                )}
              />

              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex-1 h-8 px-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Server</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isStarting}
                  className="flex-1 h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
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
          </div>

          {/* Single Copy Agent Setup Prompt Button */}
          <div className="pt-1 border-t border-border">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="w-full h-8 flex items-center justify-center gap-1.5 bg-muted/80 hover:bg-muted text-foreground border border-border rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied Prompt!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Copy Agent Setup Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
