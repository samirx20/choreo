import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  ChevronDown,
  Save,
  FolderOpen,
  FileDown,
  Pencil,
  FileVideo,
  Sun,
  Moon,
} from "lucide-react";
import { useProjectStore, isMotionMode } from "@/store/useProjectStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";
import { ExportPopover } from "@/components/export/ExportPopover";

interface TopNavBarProps {
  onToggleZenMode?: () => void;
  onBackToWorkspace?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onToggleZenMode,
  onBackToWorkspace,
}) => {
  const {
    document: doc,
    setProjectName,
    zoom,
    setZoom,
    uiMode,
    setUiMode,
    theme,
    toggleTheme,
  } = useProjectStore();

  const syncCurrentProjectName = useProjectRegistryStore(
    (s) => s.syncCurrentProjectName
  );
  const closeProject = useProjectRegistryStore((s) => s.closeProject);
  const saveCurrentProjectToFile = useProjectRegistryStore(
    (s) => s.saveCurrentProjectToFile
  );
  const openProjectFromFilePicker = useProjectRegistryStore(
    (s) => s.openProjectFromFilePicker
  );

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitleInput(doc.name || "Untitled Project");
    if (typeof document !== "undefined") {
      document.title = `${doc.name || "Untitled"} — Motion Studio`;
    }
  }, [doc.name]);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      setProjectName(titleInput.trim());
      syncCurrentProjectName(titleInput.trim());
    } else {
      setTitleInput(doc.name);
    }
    setIsEditingTitle(false);
  };

  const handleBack = () => {
    if (onBackToWorkspace) {
      onBackToWorkspace();
    } else {
      closeProject();
    }
  };

  const handleSave = async (forceSaveAs = false) => {
    setIsSaving(true);
    try {
      await saveCurrentProjectToFile({ forceSaveAs });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpen = async () => {
    await openProjectFromFilePicker();
  };

  return (
    <header className="h-12 w-full bg-card border-b border-border px-3 flex items-center justify-between z-30 relative select-none shrink-0 text-card-foreground">
      {/* Left: Back button & File Dropdown Menu */}
      <div className="flex items-center gap-2">
        {/* Back Arrow */}
        <button
          type="button"
          onClick={handleBack}
          className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Back to Projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-border" />

        {/* File Name & Menu */}
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
            className="h-7 px-2 text-xs font-medium text-foreground bg-muted rounded border border-border focus:border-primary outline-none w-44 text-left"
          />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-foreground hover:bg-muted rounded transition-colors group cursor-pointer"
                title="File Menu"
              >
                <span className="max-w-[180px] truncate">{doc.name || "New file"}</span>
                <span className="text-[10px] text-muted-foreground font-mono">.mtn</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 bg-popover border border-border text-popover-foreground shadow-xl"
            >
              <DropdownMenuItem
                onClick={() => {
                  setTitleInput(doc.name);
                  setIsEditingTitle(true);
                }}
                className="text-xs cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Rename Project</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="text-xs cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Save</span>
                </div>
                <kbd className="text-[10px] font-mono text-muted-foreground">Ctrl+S</kbd>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="text-xs cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Save As...</span>
                </div>
                <kbd className="text-[10px] font-mono text-muted-foreground">Ctrl+Shift+S</kbd>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleOpen}
                className="text-xs cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Open (.mtn)...</span>
                </div>
                <kbd className="text-[10px] font-mono text-muted-foreground">Ctrl+O</kbd>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={() => window.dispatchEvent(new CustomEvent("motion-open-export-popover"))}
                className="text-xs cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileVideo className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Export Video...</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={handleBack}
                className="text-xs cursor-pointer flex items-center justify-between text-muted-foreground hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Projects</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Center: Design vs Animate Mode Switcher */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div className="bg-muted p-0.5 rounded-lg flex items-center border border-border shadow-inner">
          <button
            type="button"
            onClick={() => setUiMode("design")}
            className={cn(
              "px-3.5 py-1 text-xs font-semibold rounded-md transition-all",
              !isMotionMode(uiMode)
                ? "bg-card text-card-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setUiMode("animate")}
            className={cn(
              "px-3.5 py-1 text-xs font-semibold rounded-md transition-all",
              isMotionMode(uiMode)
                ? "bg-card text-card-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            Animate
          </button>
        </div>
      </div>

      {/* Right: Theme Toggle, Zoom & Export */}
      <div className="flex items-center gap-2">
        {/* Dark / Light Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          data-testid="theme-toggle-btn"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded flex items-center justify-center transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Zoom Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 text-xs px-2.5 gap-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded flex items-center transition-colors">
              <span>{Math.round(zoom * 100)}%</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border text-xs text-popover-foreground">
            {!isMotionMode(uiMode) && (
              <>
                <DropdownMenuItem onClick={() => setZoom(0.5)} className="hover:bg-accent hover:text-accent-foreground cursor-pointer">50%</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setZoom(0.75)} className="hover:bg-accent hover:text-accent-foreground cursor-pointer">75%</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setZoom(1)} className="hover:bg-accent hover:text-accent-foreground cursor-pointer">100% (Fit)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.25)} className="hover:bg-accent hover:text-accent-foreground cursor-pointer">125%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.5)} className="hover:bg-accent hover:text-accent-foreground cursor-pointer">150%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(2)} className="hover:bg-accent hover:text-accent-foreground cursor-pointer">200%</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Downward-Expanding Export Popover Card */}
        <ExportPopover />
      </div>
    </header>
  );
};
