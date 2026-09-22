import React, { useState, useEffect } from "react";
import { Play, MoreHorizontal, Pencil, Copy, Maximize2, Layers } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export const SceneAnimationsView: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    updateScreen,
    duplicateScreen,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const [isEditingSceneName, setIsEditingSceneName] = useState(false);
  const [sceneNameInput, setSceneNameInput] = useState(activeScreen.name);

  useEffect(() => {
    setSceneNameInput(activeScreen.name);
    setIsEditingSceneName(false);
  }, [activeScreen.id, activeScreen.name]);

  return (
    <div className="p-4 space-y-4 text-foreground select-none">
      {/* Scene Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <Play className="h-3.5 w-3.5 fill-current text-muted-foreground shrink-0" />
          {isEditingSceneName ? (
            <Input
              type="text"
              value={sceneNameInput}
              onChange={(e) => setSceneNameInput(e.target.value)}
              onBlur={() => {
                if (sceneNameInput.trim()) {
                  updateScreen(activeScreen.id, { name: sceneNameInput.trim() });
                } else {
                  setSceneNameInput(activeScreen.name);
                }
                setIsEditingSceneName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (sceneNameInput.trim()) {
                    updateScreen(activeScreen.id, { name: sceneNameInput.trim() });
                  }
                  setIsEditingSceneName(false);
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
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
        <Layers className="h-8 w-8 mx-auto text-muted-foreground/60" />
        <p className="font-medium text-foreground">No element selected</p>
        <p className="text-[11px] leading-relaxed">
          Select an element on the canvas or in the layers list to add animations.
        </p>
      </div>
    </div>
  );
};
