import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Sparkles,
  Download,
  Film,
  Layers,
  ZoomIn,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/store/useProjectStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavBarProps {
  onOpenAiBar: () => void;
  onOpenExportModal: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onOpenAiBar,
  onOpenExportModal,
}) => {
  const {
    document: doc,
    setProjectName,
    uiMode,
    setUiMode,
    canUndo,
    canRedo,
    undo,
    redo,
    zoom,
    setZoom,
    isPlaying,
    setIsPlaying,
  } = useProjectStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.name);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      setProjectName(titleInput.trim());
    } else {
      setTitleInput(doc.name);
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-12 w-full bg-zinc-950 border-b border-zinc-800/80 px-3 flex items-center justify-between z-40 select-none">
      {/* Left: Branding & Editable Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/30">
            <Film className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            Choreo
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-zinc-800/80 text-zinc-400 font-mono">
              v0.1
            </Badge>
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSubmit();
              if (e.key === "Escape") {
                setTitleInput(doc.name);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
            className="h-7 px-2 text-xs font-medium text-zinc-100 bg-zinc-900 rounded border border-violet-500 focus:outline-none w-48"
          />
        ) : (
          <div
            onClick={() => {
              setTitleInput(doc.name);
              setIsEditingTitle(true);
            }}
            className="h-7 px-2 flex items-center text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900/60 rounded cursor-pointer transition-colors max-w-[200px] truncate"
            title="Click to rename project"
          >
            {doc.name}
          </div>
        )}

        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800/60 h-4 py-0 px-1">
          Auto-saved
        </Badge>
      </div>

      {/* Center: Mode Switcher [ Design | Animate ] */}
      <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800/80 shadow-inner">
        <button
          onClick={() => setUiMode("design")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
            uiMode === "design"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Design</span>
        </button>
        <button
          onClick={() => setUiMode("animate")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
            uiMode === "animate"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-900/40"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>Animate</span>
        </button>
      </div>

      {/* Right: History, Zoom, AI Prompt & Export */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Quick Toggle */}
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "Pause (Space)" : "Play Preview (Space)"}
          className="text-zinc-300 hover:text-white"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Undo / Redo */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="iconSm"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
            className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Canvas Zoom Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-zinc-300 border-zinc-800 bg-zinc-900/60"
            >
              <ZoomIn className="h-3 w-3 text-zinc-400" />
              <span>{Math.round(zoom * 100)}%</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
            <DropdownMenuItem onClick={() => setZoom(0.5)}>50%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(0.75)}>75%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1)}>100% (Fit)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.25)}>125%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.5)}>150%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(2)}>200%</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI Assistant Trigger */}
        <Button
          onClick={onOpenAiBar}
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2.5 gap-1.5 border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>AI Prompt</span>
          <kbd className="text-[10px] bg-violet-950/60 px-1 py-0.2 rounded border border-violet-700/40 text-violet-300">
            Ctrl+K
          </kbd>
        </Button>

        {/* Export Video */}
        <Button
          onClick={onOpenExportModal}
          size="sm"
          className="h-7 text-xs px-3 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-950/40"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
        </Button>
      </div>
    </header>
  );
};
