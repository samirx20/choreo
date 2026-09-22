import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  FolderOpen,
  Copy,
  Download,
  Trash2,
  Edit2,
  Film,
} from "lucide-react";
import { ProjectMeta } from "@/types/project";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectMeta;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onExport: (id: string) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onDuplicate,
  onDelete,
  onRename,
  onExport,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(project.id, trimmed);
    } else {
      setNameInput(project.name);
    }
    setIsRenaming(false);
  };

  // Compute aspect ratio proportion for preview box
  const aspect = project.width / (project.height || 1);
  const isLandscape = aspect >= 1.2;
  const isVertical = aspect <= 0.8;

  const aspectRatioLabel = isLandscape
    ? "16:9"
    : isVertical
    ? "9:16"
    : aspect === 1
    ? "1:1"
    : `${project.width}:${project.height}`;

  return (
    <div
      onClick={() => onOpen(project.id)}
      className="group relative flex flex-col bg-[#141416] border border-[#27272a] hover:border-zinc-500 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 select-none"
    >
      {/* 1. Preview Container */}
      <div className="relative w-full h-44 bg-[#0a0a0c] flex items-center justify-center p-4 border-b border-[#222226] overflow-hidden">
        {/* Aspect-Ratio Canvas Stage Simulation */}
        <div
          style={{
            aspectRatio: `${project.width} / ${project.height}`,
            backgroundColor: project.backgroundColor || "#09090b",
          }}
          className={cn(
            "relative max-w-full max-h-full rounded border border-[#27272a] flex items-center justify-center overflow-hidden shadow-inner",
            isVertical ? "h-full w-auto" : "w-full h-auto"
          )}
        >
          {/* Subtle Stage Mock Elements */}
          <div className="flex flex-col items-center gap-1.5 opacity-60 pointer-events-none scale-75">
            <div className="w-12 h-6 rounded bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
              <Film className="w-3 h-3 text-zinc-400" />
            </div>
            <div className="w-16 h-1 rounded bg-zinc-700/40" />
            <div className="w-10 h-1 rounded bg-zinc-700/30" />
          </div>

          {/* Aspect Badge */}
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-white/10">
            {aspectRatioLabel}
          </div>
        </div>

        {/* Hover Highlight Overlay */}
        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Top-Right Duration Badge */}
        <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-[#18181b]/80 border border-white/[0.08] text-[10px] font-mono text-zinc-300">
          {project.duration.toFixed(1)}s
        </div>
      </div>

      {/* 2. Metadata & Actions Bar */}
      <div className="p-3 flex items-start justify-between gap-2 bg-[#141416]">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") {
                  setNameInput(project.name);
                  setIsRenaming(false);
                }
              }}
              className="h-6 px-1.5 text-xs font-medium text-white bg-[#1f1f23] rounded border border-purple-500 outline-none w-full"
            />
          ) : (
            <h3
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              title={project.name}
              className="text-xs font-medium text-zinc-100 truncate hover:text-white"
            >
              {project.name}
            </h3>
          )}

          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
            <span>
              {project.width}×{project.height}
            </span>
            <span>•</span>
            <span>
              {project.screenCount} {project.screenCount === 1 ? "scene" : "scenes"}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(project.updatedAt)}</span>
          </div>
        </div>

        {/* More Actions Context Menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Project Actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-[#18181b] border border-[#27272a] text-zinc-200 shadow-xl"
            >
              <DropdownMenuItem
                onClick={() => onOpen(project.id)}
                className="gap-2 text-xs cursor-pointer hover:bg-white/10"
              >
                <FolderOpen className="h-3.5 w-3.5 text-zinc-400" />
                <span>Open Project</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsRenaming(true)}
                className="gap-2 text-xs cursor-pointer hover:bg-white/10"
              >
                <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                <span>Rename</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onDuplicate(project.id)}
                className="gap-2 text-xs cursor-pointer hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                <span>Duplicate</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onExport(project.id)}
                className="gap-2 text-xs cursor-pointer hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5 text-zinc-400" />
                <span>Export .motion JSON</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#27272a]" />

              <DropdownMenuItem
                onClick={() => onDelete(project.id)}
                className="gap-2 text-xs cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:text-red-300 focus:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
