import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Square,
  Circle,
  Folder,
  Image as ImageIcon,
  Zap,
  Search,
  MoreVertical,
  Monitor,
  Package,
  Layers as LayersIcon,
  Clock,
} from "lucide-react";
import { Layer, Screen } from "@/types/scene";
import {
  useProjectStore,
  findLayerInTree,
  findParentGroupInTree,
  isLayerOnArtboard,
} from "@/store/useProjectStore";
import { CanvasContextMenu } from "../canvas/CanvasContextMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const LeftSidebar: React.FC = () => {
  const {
    document: doc,
    uiMode,
    activeScreenId,
    selectScreen,
    addScreen,
    updateScreen,
    deleteScreen,
    duplicateScreen,
    selectedLayerIds,
    selectLayer,
    updateLayer,
    reorderLayer,
    groupSelection,
    ungroup,
  } = useProjectStore();

  const [layerSearch, setLayerSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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
  const [renamingScreenId, setRenamingScreenId] = useState<string | null>(null);
  const [screenRenameValue, setScreenRenameValue] = useState("");

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
      "h-3.5 w-3.5 shrink-0 transition-colors",
      isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
    );

    switch (layer.type) {
      case "text":
        return <Type className={iconClass} />;
      case "chunk":
        return <Zap className={iconClass} />;
      case "group":
        return <Folder className={iconClass} />;
      case "shape":
        return layer.shapeType === "circle" ? (
          <Circle className={iconClass} />
        ) : (
          <Square className={iconClass} />
        );
      case "image":
        return <ImageIcon className={iconClass} />;
      default:
        return <Square className={iconClass} />;
    }
  };

  // Render a single layer item in the tree recursively with drag-and-drop
  const renderLayerNode = (layer: Layer, depth = 0) => {
    if (
      layerSearch &&
      !layer.name.toLowerCase().includes(layerSearch.toLowerCase())
    ) {
      if (
        layer.type !== "group" ||
        !layer.children.some((c) =>
          c.name.toLowerCase().includes(layerSearch.toLowerCase())
        )
      ) {
        return null;
      }
    }

    const isSelected = selectedLayerIds.includes(layer.id);
    const isGroup = layer.type === "group";
    const isCollapsed = isGroup && collapsedGroups[layer.id];
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
          if (isGroup) {
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
        onDragLeave={(e) => {
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
          <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-full z-30 shadow-xs" />
        )}
        {isDragTarget && dragOverTarget.position === "after" && (
          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full z-30 shadow-xs" />
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
            selectLayer(layer.id, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            selectLayer(layer.id, false);
            setContextMenu({ x: e.clientX, y: e.clientY, layerId: layer.id });
          }}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={cn(
            "group flex items-center justify-between h-[28px] pr-1.5 text-xs rounded-[8px] transition-all cursor-pointer relative",
            isSelected
              ? "bg-accent text-accent-foreground font-medium border border-border shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            isDragging && "opacity-40",
            isDragTarget && dragOverTarget.position === "inside" && "bg-accent/80 border-primary ring-1 ring-primary text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isGroup ? (
              <button
                onClick={(e) => toggleGroupCollapse(layer.id, e)}
                className="p-0.5 hover:text-foreground text-muted-foreground rounded"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-2.5" />
            )}

            {getLayerIcon(layer, isSelected)}

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
                className="h-5 px-1 bg-muted border border-primary rounded-[4px] text-[11px] text-foreground outline-none w-full font-mono"
              />
            ) : (
              <span className="truncate text-[11px] font-sans">
                {layer.name}
              </span>
            )}
          </div>

          {/* Quick Hover Actions: Visibility & Lock */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { hidden: !layer.hidden });
              }}
              title={layer.hidden ? "Show layer" : "Hide layer"}
              className="p-0.5 text-muted-foreground hover:text-foreground rounded"
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
              className="p-0.5 text-muted-foreground hover:text-foreground rounded"
            >
              {layer.locked ? (
                <Lock className="h-3 w-3 text-amber-500" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button className="p-0.5 text-muted-foreground hover:text-foreground rounded">
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {isGroup ? (
                  <DropdownMenuItem
                    onClick={() => ungroup(layer.id)}
                    className="gap-2"
                  >
                    <Folder className="h-3 w-3" /> Ungroup
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => groupSelection()}
                    className="gap-2"
                  >
                    <Folder className="h-3 w-3" /> Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    setRenamingLayerId(layer.id);
                    setRenameValue(layer.name);
                  }}
                  className="gap-2"
                >
                  Rename (F2)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Group Children */}
        {isGroup && !isCollapsed && layer.children && layer.children.length > 0 && (
          <div className="flex flex-col">
            {[...layer.children].reverse().map((child) => renderLayerNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[240px] h-full bg-card border-r border-border flex flex-col z-20 select-none shrink-0 text-foreground">
      {/* 1. SCREENS SECTION: Clear, Dedicated Scene Manager */}
      <div className="p-2 border-b border-border space-y-1.5 shrink-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Screens ({doc.screens.length})
          </span>
          <button
            onClick={() => addScreen()}
            className="h-5 px-1.5 rounded-[6px] text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1 transition-colors"
            title="Add new scene screen"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        </div>

        {/* Screen List */}
        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
          {doc.screens.map((screen, idx) => {
            const isActive = screen.id === activeScreenId;

            return (
              <div
                key={screen.id}
                onClick={() => selectScreen(screen.id)}
                className={cn(
                  "group flex items-center justify-between h-7 px-2 rounded-[8px] text-xs cursor-pointer transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold border border-border shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {idx + 1}.
                  </span>

                  {renamingScreenId === screen.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={screenRenameValue}
                      onChange={(e) => setScreenRenameValue(e.target.value)}
                      onBlur={() => {
                        if (screenRenameValue.trim()) {
                          updateScreen(screen.id, { name: screenRenameValue.trim() });
                        }
                        setRenamingScreenId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (screenRenameValue.trim()) {
                            updateScreen(screen.id, { name: screenRenameValue.trim() });
                          }
                          setRenamingScreenId(null);
                        } else if (e.key === "Escape") {
                          setRenamingScreenId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 px-1 bg-muted border border-primary rounded-[4px] text-[11px] text-foreground outline-none w-full font-mono"
                    />
                  ) : (
                    <span className="truncate text-[11px]">
                      {screen.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5 opacity-60" />
                    {screen.duration}s
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-0.5 text-muted-foreground hover:text-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenamingScreenId(screen.id);
                          setScreenRenameValue(screen.name);
                        }}
                        className="gap-2"
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => duplicateScreen(screen.id)}
                        className="gap-2"
                      >
                        <Copy className="h-3 w-3" /> Duplicate
                      </DropdownMenuItem>
                      {doc.screens.length > 1 && (
                        <DropdownMenuItem
                          onClick={() => deleteScreen(screen.id)}
                          className="gap-2 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. LAYERS SECTION HEADER & SEARCH */}
      <div className="p-2 border-b border-border space-y-1.5 shrink-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <LayersIcon className="h-3 w-3" />
            <span>Layers</span>
          </span>

          {selectedLayerIds.length >= 2 && (
            <button
              onClick={() => groupSelection()}
              title="Group Selection (Cmd+G)"
              className="flex items-center gap-1 text-[10px] text-foreground bg-muted hover:bg-accent px-1.5 py-0.5 rounded-[6px] border border-border font-medium transition-colors"
            >
              <Folder className="h-2.5 w-2.5" /> Group
            </button>
          )}
        </div>

        {/* Filter Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filter layers..."
            value={layerSearch}
            onChange={(e) => setLayerSearch(e.target.value)}
            className="w-full h-6 pl-7 pr-2 bg-muted/50 border border-input rounded-[6px] text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-sans"
          />
        </div>
      </div>

      {/* 3. Hierarchical Layer Tree */}
      <div className="flex-1 p-1.5 overflow-y-auto space-y-3">
        {activeScreen && activeScreen.layers.length > 0 ? (
          (() => {
            const artboardLayers: Layer[] = [];
            const pasteboardLayers: Layer[] = [];

            activeScreen.layers.forEach((l) => {
              if (isLayerOnArtboard(l, doc.settings.width, doc.settings.height)) {
                artboardLayers.push(l);
              } else {
                pasteboardLayers.push(l);
              }
            });

            return (
              <>
                {/* Artboard Layers Section */}
                <div className="space-y-0.5">
                  <div className="px-1.5 py-0.5 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      <span>Artboard ({artboardLayers.length})</span>
                    </span>
                  </div>
                  {artboardLayers.length > 0 ? (
                    [...artboardLayers].reverse().map((layer) => renderLayerNode(layer))
                  ) : (
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground italic">
                      Empty artboard
                    </div>
                  )}
                </div>

                {/* Pasteboard Assets Section */}
                {pasteboardLayers.length > 0 && (
                  <div className="space-y-0.5 pt-2 border-t border-border">
                    <div className="px-1.5 py-0.5 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>Pasteboard ({pasteboardLayers.length})</span>
                      </span>
                    </div>
                    {[...pasteboardLayers].reverse().map((layer) => renderLayerNode(layer))}
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No layers yet
          </div>
        )}
      </div>

      {/* Right-Click Context Menu for Layer Tree */}
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
