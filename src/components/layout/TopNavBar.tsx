import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  ChevronDown,
} from "lucide-react";
import { useProjectStore, isMotionMode } from "@/store/useProjectStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";

interface TopNavBarProps {
  onOpenAiBar?: () => void;
  onOpenExportModal: () => void;
  onToggleZenMode?: () => void;
  onBackToWorkspace?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onOpenAiBar,
  onOpenExportModal,
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
  } = useProjectStore();

  const syncCurrentProjectName = useProjectRegistryStore(
    (s) => s.syncCurrentProjectName
  );
  const closeProject = useProjectRegistryStore((s) => s.closeProject);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.name);

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

  return (
    <header className="h-12 w-full bg-[#111113] border-b border-[#222226] px-3 flex items-center justify-between z-30 relative select-none shrink-0 text-white">
      {/* Left: Back button & File Name Dropdown */}
      <div className="flex items-center gap-2">
        {/* Back Arrow */}
        <button
          type="button"
          onClick={handleBack}
          className="h-8 w-8 rounded flex items-center justify-center text-[#9ca3af] hover:text-white hover:bg-white/10 transition-colors"
          title="Back to Projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-[#27272a]" />

        {/* File Name */}
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
            className="h-7 px-2 text-xs font-medium text-white bg-[#1f1f23] rounded border border-purple-500 outline-none w-44 text-left"
          />
        ) : (
          <button
            onClick={() => {
              setTitleInput(doc.name);
              setIsEditingTitle(true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#e4e4e7] hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Click to rename"
          >
            <span className="max-w-[180px] truncate">{doc.name || "New file"}</span>
            <ChevronDown className="h-3 w-3 text-[#71717a] shrink-0" />
          </button>
        )}
      </div>

      {/* Center: Design vs Animate Mode Switcher */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div className="bg-[#1f1f23] p-0.5 rounded-lg flex items-center border border-[#27272a] shadow-inner">
          <button
            type="button"
            onClick={() => setUiMode("design")}
            className={cn(
              "px-3.5 py-1 text-xs font-semibold rounded-md transition-all",
              !isMotionMode(uiMode)
                ? "bg-[#7c3aed] text-white shadow-xs"
                : "text-[#a1a1aa] hover:text-white hover:bg-white/5"
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
                ? "bg-[#7c3aed] text-white shadow-xs"
                : "text-[#a1a1aa] hover:text-white hover:bg-white/5"
            )}
          >
            Animate
          </button>
        </div>
      </div>

      {/* Right: Zoom & Purple Export Button */}
      <div className="flex items-center gap-2">
        {/* Zoom Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 text-xs px-2.5 gap-1 text-[#d4d4d8] hover:text-white hover:bg-white/5 rounded flex items-center transition-colors">
              <span>{Math.round(zoom * 100)}%</span>
              <ChevronDown className="h-3 w-3 text-[#71717a]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#18181b] border-[#27272a] text-xs text-white">
            {!isMotionMode(uiMode) && (
              <>
                <DropdownMenuItem onClick={() => setZoom(0.5)} className="hover:bg-white/10">50%</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setZoom(0.75)} className="hover:bg-white/10">75%</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setZoom(1)} className="hover:bg-white/10">100% (Fit)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.25)} className="hover:bg-white/10">125%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(1.5)} className="hover:bg-white/10">150%</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(2)} className="hover:bg-white/10">200%</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Purple Export Pill Button */}
        <button
          onClick={onOpenExportModal}
          className="h-8 text-xs font-medium px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
          title="Export video"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
