import React, { useState, useEffect } from "react";
import { Play, Square, MoreHorizontal, Pencil, Copy, Maximize2, Trash2 } from "lucide-react";
import { Screen } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SceneHeaderCardProps {
  activeScreen: Screen;
  icon?: "play" | "square";
  showDelete?: boolean;
}

export const SceneHeaderCard: React.FC<SceneHeaderCardProps> = ({
  activeScreen,
  icon = "square",
  showDelete = false,
}) => {
  const { document: doc, updateScreen, duplicateScreen, deleteScreen } = useProjectStore();
  const [isEditingSceneName, setIsEditingSceneName] = useState(false);
  const [sceneNameInput, setSceneNameInput] = useState(activeScreen.name);

  useEffect(() => {
    setSceneNameInput(activeScreen.name);
    setIsEditingSceneName(false);
  }, [activeScreen.id, activeScreen.name]);

  const handleCommitName = () => {
    if (sceneNameInput.trim()) {
      updateScreen(activeScreen.id, { name: sceneNameInput.trim() });
    } else {
      setSceneNameInput(activeScreen.name);
    }
    setIsEditingSceneName(false);
  };

  return (
    <div className="flex items-center justify-between pb-3 border-b border-border">
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        {icon === "play" ? (
          <Play className="h-3.5 w-3.5 fill-current text-muted-foreground shrink-0" />
        ) : (
          <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        {isEditingSceneName ? (
          <Input
            type="text"
            value={sceneNameInput}
            onChange={(e) => setSceneNameInput(e.target.value)}
            onBlur={handleCommitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCommitName();
              } else if (e.key === "Escape") {
                setSceneNameInput(activeScreen.name);
                setIsEditingSceneName(false);
              }
            }}
            autoFocus
            className="h-6 px-1.5 text-xs font-semibold text-foreground bg-card border border-primary rounded outline-none w-full"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditingSceneName(true)}
            className="text-xs font-semibold truncate cursor-text hover:text-primary transition-colors"
            title="Double-click to rename scene"
          >
            {activeScreen.name}
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer"
            title="Scene options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-xs">
          <DropdownMenuItem
            onClick={() => setIsEditingSceneName(true)}
            className="gap-2 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Rename Scene</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => duplicateScreen(activeScreen.id)}
            className="gap-2 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Duplicate Scene</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("motion-focus-screen", { detail: { screenId: activeScreen.id } })
              );
            }}
            className="gap-2 cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Fit in Viewport</span>
          </DropdownMenuItem>
          {showDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deleteScreen(activeScreen.id)}
                disabled={doc.screens.length <= 1}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Scene</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
