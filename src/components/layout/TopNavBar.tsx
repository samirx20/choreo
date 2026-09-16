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
    <header className="h-12 w-full bg-background border-b border-border px-3 flex items-center justify-between z-40 select-none">
      {/* Left: Branding & Editable Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-card border border-border flex items-center justify-center shadow-xs text-primary">
            <Film className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
            Choreo
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground font-mono">
              v0.1
            </Badge>
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

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
            className="h-7 px-2 text-xs font-medium text-foreground bg-muted rounded border border-primary focus:outline-none w-48"
          />
        ) : (
          <div
            onClick={() => {
              setTitleInput(doc.name);
              setIsEditingTitle(true);
            }}
            className="h-7 px-2 flex items-center text-xs font-medium text-foreground/90 hover:text-foreground hover:bg-muted/60 rounded cursor-pointer transition-colors max-w-[200px] truncate"
            title="Click to rename project"
          >
            {doc.name}
          </div>
        )}

        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border h-4 py-0 px-1">
          Auto-saved
        </Badge>
      </div>

      {/* Center: Mode Switcher [ Design | Animate ] */}
      <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border shadow-inner">
        <button
          onClick={() => setUiMode("design")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
            uiMode === "design"
              ? "bg-secondary text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Design</span>
        </button>
        <button
          onClick={() => setUiMode("animate")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
            uiMode === "animate"
              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
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
          className="text-muted-foreground hover:text-foreground"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Undo / Redo */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="iconSm"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Canvas Zoom Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-foreground border-border bg-secondary/50 hover:bg-muted"
            >
              <ZoomIn className="h-3 w-3 text-muted-foreground" />
              <span>{Math.round(zoom * 100)}%</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border text-xs">
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
          className="h-7 text-xs px-2.5 gap-1.5 border-border bg-secondary/80 text-foreground hover:bg-muted hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI Prompt</span>
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">
            Ctrl+K
          </kbd>
        </Button>

        {/* Export Video */}
        <Button
          onClick={onOpenExportModal}
          size="sm"
          className="h-7 text-xs px-3 gap-1.5 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
        </Button>
      </div>
    </header>
  );
};
