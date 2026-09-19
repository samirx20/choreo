import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Sparkles,
  Download,
  ZoomIn,
  Maximize2,
  Sun,
  Moon,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompactSegmentedControl } from "@/components/ui/compact-segmented-control";

interface TopNavBarProps {
  onOpenAiBar: () => void;
  onOpenExportModal: () => void;
  onToggleZenMode?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onOpenAiBar,
  onOpenExportModal,
  onToggleZenMode,
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
    theme,
    toggleTheme,
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
    <header className="h-10 w-full bg-card border-b border-border px-3.5 flex items-center justify-between z-[9999] relative select-none shrink-0 text-foreground">
      {/* Left: App Wordmark, Breadcrumb Title & History */}
      <div className="flex items-center gap-2.5">
        {/* Minimal Wordmark */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs tracking-tight text-foreground flex items-center gap-1.5">
            CHOREO
          </span>
          {/* Subtle Saved Indicator Dot */}
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
            title="All changes saved to project"
          />
        </div>

        <div className="h-3.5 w-px bg-border" />

        {/* Inline Editable Project Title */}
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
            className="h-6 px-1.5 text-xs font-medium text-foreground bg-muted/60 rounded-[6px] border border-primary outline-none w-44 font-mono"
          />
        ) : (
          <div
            onClick={() => {
              setTitleInput(doc.name);
              setIsEditingTitle(true);
            }}
            className="h-6 px-1.5 flex items-center text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-[6px] cursor-pointer transition-colors max-w-[180px] truncate"
            title="Click to rename project"
          >
            {doc.name}
          </div>
        )}

        <div className="h-3.5 w-px bg-border" />

        {/* History: Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Cmd+Z)"
            className="h-6 w-6 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-20 transition-colors"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Cmd+Shift+Z)"
            className="h-6 w-6 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-20 transition-colors"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Studio Switcher [ DESIGN | MOTION ] */}
      <div className="w-52">
        <CompactSegmentedControl
          value={uiMode === "motion" || uiMode === "animate" ? "motion" : "design"}
          onChange={(val) => setUiMode(val as "design" | "motion")}
          options={[
            { value: "design", label: "DESIGN", tooltip: "Static Vector & Kinetic Staging" },
            { value: "motion", label: "MOTION", tooltip: "Motion Choreography & Timeline" },
          ]}
          size="sm"
        />
      </div>

      {/* Right: Zoom, Theme, AI, Zen Mode & Export */}
      <div className="flex items-center gap-2">
        {/* Canvas Zoom */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 text-[11px] font-mono px-2 gap-1 text-muted-foreground hover:text-foreground border border-border bg-muted/40 hover:bg-muted rounded-[8px] flex items-center transition-colors">
              <ZoomIn className="h-3 w-3 text-muted-foreground" />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => setZoom(0.5)}>50%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(0.75)}>75%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1)}>100% (Fit)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.25)}>125%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.5)}>150%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(2)}>200%</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="h-7 w-7 rounded-[8px] border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>

        {/* AI Command Bar Trigger */}
        <button
          onClick={onOpenAiBar}
          className="h-7 text-[11px] px-2 gap-1.5 border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-[8px] flex items-center transition-colors"
          title="Open AI Command Palette (Cmd+K)"
        >
          <Sparkles className="h-3 w-3 text-muted-foreground" />
          <span>AI</span>
          <kbd className="text-[9px] bg-background/80 px-1 py-0.2 rounded border border-border/60 text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Zen Presentation Mode Toggle */}
        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            className="h-7 w-7 rounded-[8px] border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Zen Presentation Mode (Cmd+\)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="h-3.5 w-px bg-border" />

        {/* Neutral Export Action */}
        <button
          onClick={onOpenExportModal}
          className="h-7 text-xs font-medium px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[8px] flex items-center gap-1.5 transition-colors shadow-xs"
          title="Export video"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
