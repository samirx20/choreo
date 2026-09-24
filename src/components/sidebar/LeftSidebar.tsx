import React, { useState, useEffect } from "react";
import {
  Type,
  Square,
  Circle,
  Folder,
  BoxSelect,
  Minus,
  ArrowUpRight,
  Triangle,
  Hexagon,
  Star,
  Image as ImageIcon,
  Play,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  icons,
  Smile,
} from "lucide-react";
import { Layer, ShapeLayer } from "@/types/scene";
import { LayerIcon } from "@/components/common/LayerIcon";
import {
  useProjectStore,
  findLayerInTree,
  findParentGroupInTree,
} from "@/store/useProjectStore";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildSceneContextMenu } from "@/components/contextmenu/contextMenuBuilders";
import { CanvasContextMenu } from "../canvas/CanvasContextMenu";
import { cn } from "@/lib/utils";

export const LeftSidebar: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectScreen,
    selectedLayerIds,
    selectLayer,
    deselectAll,
    updateLayer,
    updateScreen,
    reorderLayer,
  } = useProjectStore();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedScenes, setCollapsedScenes] = useState<Record<string, boolean>>({});
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    id: string;
    position: "before" | "after" | "inside";
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layerId: string;
  } | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameSceneValue, setRenameSceneValue] = useState("");

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // Auto-expand groups when children are selected
  useEffect(() => {
    if (selectedLayerIds.length > 0 && activeScreen) {
      setCollapsedGroups((prev) => {
        const next = { ...prev };
        let changed = false;
        selectedLayerIds.forEach((id) => {
          if (next[id]) {
            delete next[id];
            changed = true;
          }
          const parent = findParentGroupInTree(activeScreen.layers, id);
          if (parent && next[parent.id]) {
            delete next[parent.id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [selectedLayerIds, activeScreen]);

  // Listen for F2 rename dispatch
  useEffect(() => {
    const handleRename = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.layerId && activeScreen) {
        const target = findLayerInTree(activeScreen.layers, detail.layerId);
        if (target) {
          setRenamingLayerId(target.id);
          setRenameValue(target.name);
        }
      }
    };
    window.addEventListener("motion-rename-layer", handleRename);
    return () => window.removeEventListener("motion-rename-layer", handleRename);
  }, [activeScreen]);

  const toggleGroupCollapse = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const getLayerIcon = (layer: Layer, isSelected: boolean) => {
    const iconClass = cn(
      "h-3.5 w-3.5 shrink-0",
      isSelected ? "text-primary-foreground" : "text-muted-foreground"
    );
    return <LayerIcon layer={layer} className={iconClass} />;
  };

  // Render a single layer item in the tree
  const renderLayerNode = (layer: Layer, depth = 1, screenId?: string) => {
    const isSelected = selectedLayerIds.includes(layer.id);
    const isContainer = layer.type === "group" || layer.type === "frame";
    const hasChildren = Array.isArray((layer as any).children) && (layer as any).children.length > 0;
    const isCollapsed = hasChildren && Boolean(collapsedGroups[layer.id]);
    const isDragging = draggingLayerId === layer.id;
    const isDragTarget = dragOverTarget?.id === layer.id;

    return (
      <div
        key={layer.id}
        className="flex flex-col select-none relative"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!draggingLayerId || draggingLayerId === layer.id) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const relY = (e.clientY - rect.top) / rect.height;

          let pos: "before" | "after" | "inside";
          if (isContainer) {
            if (relY < 0.25) pos = "before";
            else if (relY > 0.75) pos = "after";
            else pos = "inside";
          } else {
            pos = relY < 0.5 ? "before" : "after";
          }

          if (!dragOverTarget || dragOverTarget.id !== layer.id || dragOverTarget.position !== pos) {
            setDragOverTarget({ id: layer.id, position: pos });
          }
        }}
        onDragLeave={() => {
          if (dragOverTarget?.id === layer.id) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!draggingLayerId || draggingLayerId === layer.id || !dragOverTarget) return;

          reorderLayer(draggingLayerId, layer.id, dragOverTarget.position);
          setDraggingLayerId(null);
          setDragOverTarget(null);
        }}
      >
        {/* Drop guideline */}
        {isDragTarget && dragOverTarget.position === "before" && (
          <div className="absolute top-0 left-2 right-2 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full z-30" />
        )}
        {isDragTarget && dragOverTarget.position === "after" && (
          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full z-30" />
        )}
        {isDragTarget && dragOverTarget.position === "inside" && (
          <div className="absolute inset-0.5 border-2 border-zinc-900 bg-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-100/10 rounded pointer-events-none z-30 flex items-center justify-end pr-2">
            <span className="text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 bg-white/95 dark:bg-zinc-900/95 px-1.5 py-0.5 rounded shadow-sm">
              Into Group
            </span>
          </div>
        )}

        <div
          draggable={!layer.locked}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", layer.id);
            setDraggingLayerId(layer.id);
          }}
          onDragEnd={() => {
            setDraggingLayerId(null);
            setDragOverTarget(null);
          }}
          onClick={(e) => {
            if (screenId && activeScreenId !== screenId) {
              selectScreen(screenId);
              window.dispatchEvent(
                new CustomEvent("motion-focus-screen", { detail: { screenId } })
              );
            }
            selectLayer(layer.id, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            selectLayer(layer.id, false);
            setContextMenu({ x: e.clientX, y: e.clientY, layerId: layer.id });
          }}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          className={cn(
            "group flex items-center justify-between h-8 pr-2 text-xs transition-colors cursor-pointer relative",
            isSelected
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-muted",
            isDragging && "opacity-40"
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren && (
              <button
                onClick={(e) => toggleGroupCollapse(layer.id, e)}
                className="p-0.5 -ml-1 text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}

            {getLayerIcon(layer, isSelected)}

            {(() => {
              const parent = activeScreen ? findParentGroupInTree(activeScreen.layers, layer.id) : null;
              if (parent && (parent as any).isMaskGroup) {
                if (layer.isMask || (parent as any).children[0]?.id === layer.id) {
                  return (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase tracking-wider font-semibold">
                      Mask
                    </span>
                  );
                }
                return (
                  <span className="text-[10px] text-muted-foreground font-mono select-none -mr-0.5">
                    ⤷
                  </span>
                );
              }
              return null;
            })()}

            {renamingLayerId === layer.id ? (
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  if (renameValue.trim()) {
                    updateLayer(layer.id, { name: renameValue.trim() });
                  }
                  setRenamingLayerId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (renameValue.trim()) {
                      updateLayer(layer.id, { name: renameValue.trim() });
                    }
                    setRenamingLayerId(null);
                  } else if (e.key === "Escape") {
                    setRenamingLayerId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-5 px-1 bg-card border border-primary rounded text-[11px] text-foreground outline-none w-full"
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingLayerId(layer.id);
                  setRenameValue(layer.name);
                }}
                className={cn(
                  "truncate text-xs font-normal cursor-text transition-colors",
                  isSelected
                    ? "text-primary-foreground font-medium"
                    : "hover:text-foreground"
                )}
                title="Double-click, press F2, or right-click to rename"
              >
                {layer.name}
              </span>
            )}
          </div>

          {/* Quick Hover Actions: Visibility & Lock */}
          <div
            className={cn(
              "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
              isSelected && "opacity-100"
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { hidden: !layer.hidden });
              }}
              title={layer.hidden ? "Show layer" : "Hide layer"}
              className={cn(
                "p-0.5 rounded transition-colors",
                isSelected
                  ? "text-primary-foreground/80 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {layer.hidden ? (
                <EyeOff className="h-3 w-3 text-destructive" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { locked: !layer.locked });
              }}
              title={layer.locked ? "Unlock layer" : "Lock layer"}
              className={cn(
                "p-0.5 rounded transition-colors",
                isSelected
                  ? "text-primary-foreground/80 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {layer.locked ? (
                <Lock className="h-3 w-3 text-amber-500" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Container Children */}
        {!isCollapsed && hasChildren && (
          <div className="flex flex-col">
            {[...((layer as any).children || [])].reverse().map((child) => renderLayerNode(child, depth + 1, screenId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[240px] h-full bg-card border-r border-border flex flex-col z-20 select-none shrink-0 text-card-foreground overflow-y-auto">
      {/* Unified Multi-Scene Outliner Tree (matching Jitter media_1789879347535.png) */}
      <div className="flex-1 flex flex-col py-1 overflow-y-auto">
        {doc.screens.map((screen) => {
          const isScreenActive = activeScreenId === screen.id;
          const isScreenSelected = isScreenActive && selectedLayerIds.length === 0;
          const isCollapsed = Boolean(collapsedScenes[screen.id]);

          return (
            <div key={screen.id} className="flex flex-col mb-1">
              {/* Scene Header */}
              <div
                onClick={() => {
                  selectScreen(screen.id);
                  deselectAll(); // Selecting scene shows scene settings in inspector
                  window.dispatchEvent(
                    new CustomEvent("motion-focus-screen", { detail: { screenId: screen.id } })
                  );
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectScreen(screen.id);
                  deselectAll();
                  const store = useProjectStore.getState();
                  useContextMenuStore.getState().openContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    zone: "scene",
                    items: buildSceneContextMenu({
                      screenId: screen.id,
                      store,
                      onRename: () => {
                        setRenamingSceneId(screen.id);
                        setRenameSceneValue(screen.name);
                      },
                    }),
                  });
                }}
                className={cn(
                  "group flex items-center justify-between h-9 px-3 text-xs cursor-pointer transition-colors select-none",
                  isScreenSelected
                    ? "bg-primary text-primary-foreground font-medium"
                    : isScreenActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsedScenes((prev) => ({
                        ...prev,
                        [screen.id]: !prev[screen.id],
                      }));
                    }}
                    className={cn(
                      "p-0.5 -ml-1 rounded hover:bg-muted/80 transition-colors",
                      isScreenSelected
                        ? "text-primary-foreground hover:text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={isCollapsed ? "Expand scene" : "Collapse scene"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  <Play
                    className={cn(
                      "h-3.5 w-3.5 fill-current shrink-0",
                      isScreenSelected ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  {renamingSceneId === screen.id ? (
                    <input
                      type="text"
                      value={renameSceneValue}
                      onChange={(e) => setRenameSceneValue(e.target.value)}
                      onBlur={() => {
                        if (renameSceneValue.trim()) {
                          updateScreen(screen.id, { name: renameSceneValue.trim() });
                        }
                        setRenamingSceneId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (renameSceneValue.trim()) {
                            updateScreen(screen.id, { name: renameSceneValue.trim() });
                          }
                          setRenamingSceneId(null);
                        } else if (e.key === "Escape") {
                          setRenamingSceneId(null);
                        }
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 px-1 text-xs font-medium text-foreground bg-card border border-primary rounded outline-none w-full"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingSceneId(screen.id);
                        setRenameSceneValue(screen.name);
                      }}
                      className={cn(
                        "truncate font-medium cursor-text transition-colors",
                        isScreenSelected
                          ? "text-primary-foreground font-medium"
                          : "hover:text-foreground"
                      )}
                      title="Double-click or right-click to rename"
                    >
                      {screen.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Scene Layers */}
              {!isCollapsed && (
                <div className="flex flex-col py-0.5">
                  {screen.layers.length > 0 ? (
                    [...screen.layers]
                      .reverse()
                      .map((layer) => renderLayerNode(layer, 1, screen.id))
                  ) : (
                    <div className="px-8 py-2 text-[11px] text-muted-foreground italic">
                      Empty scene
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          layerId={contextMenu.layerId}
          onClose={() => setContextMenu(null)}
          onOpenComponentsDrawer={() => {}}
          onRename={(id) => {
            const target = findLayerInTree(activeScreen.layers, id);
            if (target) {
              setRenamingLayerId(target.id);
              setRenameValue(target.name);
            }
          }}
        />
      )}
    </aside>
  );
};
