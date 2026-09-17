import React, { useState } from "react";
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
} from "lucide-react";
import { Layer, GroupLayer, Screen } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    activeScreenId,
    selectScreen,
    addScreen,
    updateScreen,
    deleteScreen,
    duplicateScreen,
    selectedLayerIds,
    selectLayer,
    updateLayer,
    removeLayer,
    duplicateLayer,
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

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const toggleGroupCollapse = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case "text":
        return <Type className="h-3.5 w-3.5 text-highlight" />;
      case "chunk":
        return <Zap className="h-3.5 w-3.5 text-amber-400" />;
      case "group":
        return <Folder className="h-3.5 w-3.5 text-foreground/80" />;
      case "shape":
        return layer.shapeType === "circle" ? (
          <Circle className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Square className="h-3.5 w-3.5 text-emerald-400" />
        );
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-pink-400" />;
      default:
        return <Square className="h-3.5 w-3.5 text-muted-foreground" />;
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
        {/* Drop indicator lines */}
        {isDragTarget && dragOverTarget.position === "before" && (
          <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-full z-30 shadow-[0_0_6px_rgba(232,197,71,0.6)]" />
        )}
        {isDragTarget && dragOverTarget.position === "after" && (
          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full z-30 shadow-[0_0_6px_rgba(232,197,71,0.6)]" />
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
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={cn(
            "group flex items-center justify-between h-7 pr-2 text-xs rounded transition-all cursor-pointer relative",
            isSelected
              ? "bg-secondary text-foreground font-medium border border-border"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            isDragging && "opacity-40",
            isDragTarget && dragOverTarget.position === "inside" && "bg-primary/20 border-primary ring-1 ring-primary text-foreground"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isGroup ? (
              <button
                onClick={(e) => toggleGroupCollapse(layer.id, e)}
                className="p-0.5 hover:text-white text-zinc-500 rounded"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-3" />
            )}

            {getLayerIcon(layer)}

            <span className="truncate text-[11px]">{layer.name}</span>
          </div>

          {/* Quick Hover Controls: Visibility, Lock, Options */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { hidden: !layer.hidden });
              }}
              title={layer.hidden ? "Show layer" : "Hide layer"}
              className="p-0.5 text-zinc-400 hover:text-zinc-100 rounded"
            >
              {layer.hidden ? (
                <EyeOff className="h-3 w-3 text-red-400" />
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
              className="p-0.5 text-zinc-400 hover:text-zinc-100 rounded"
            >
              {layer.locked ? (
                <Lock className="h-3 w-3 text-amber-400" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <button className="p-0.5 text-zinc-400 hover:text-zinc-100 rounded">
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
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
                  onClick={() => duplicateLayer(layer.id)}
                  className="gap-2"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => removeLayer(layer.id)}
                  className="gap-2 text-red-400 focus:text-red-300"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Render child elements of groups */}
        {isGroup && !isCollapsed && (
          <div className="flex flex-col">
            {(layer as GroupLayer).children.map((child) =>
              renderLayerNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 h-full bg-background border-r border-border flex flex-col select-none overflow-hidden">
      {/* SECTION 1: SCREENS (Top Half) */}
      <div className="flex flex-col border-b border-border">
        <div className="h-9 px-3 flex items-center justify-between border-b border-border bg-muted/20">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Screens
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] text-muted-foreground">
              {doc.screens.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => addScreen()}
            title="Add Screen"
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Screen Cards List */}
        <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
          {doc.screens.map((screen, idx) => {
            const isScreenActive = screen.id === activeScreenId;
            return (
              <div
                key={screen.id}
                onClick={() => selectScreen(screen.id)}
                className={cn(
                  "group p-2 rounded-md border flex items-center justify-between cursor-pointer transition-all",
                  isScreenActive
                    ? "bg-secondary border-primary/70 shadow-xs"
                    : "bg-card border-border hover:bg-secondary/60 hover:border-border/80"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-7 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold",
                      isScreenActive
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    #{idx + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-foreground truncate">
                      {screen.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {screen.duration.toFixed(1)}s • {screen.layers.length} layers
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      duplicateScreen(screen.id);
                    }}
                    title="Duplicate Screen"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </Button>
                  {doc.screens.length > 1 && (
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        deleteScreen(screen.id);
                      }}
                      title="Delete Screen"
                      className="h-5 w-5 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: LAYERS TREE (Bottom Half) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-9 px-3 flex items-center justify-between border-b border-border bg-muted/20">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Layers
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] text-muted-foreground">
              {activeScreen ? activeScreen.layers.length : 0}
            </Badge>
          </div>
          {selectedLayerIds.length >= 2 && (
            <button
              onClick={() => groupSelection()}
              title="Group Selection (Ctrl+G)"
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30 font-medium"
            >
              <Folder className="h-3 w-3" /> Group
            </button>
          )}
        </div>

        {/* Filter / Search input */}
        <div className="p-2 border-b border-border">
          <div className="relative flex items-center">
            <Search className="absolute left-2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search layers..."
              value={layerSearch}
              onChange={(e) => setLayerSearch(e.target.value)}
              className="w-full h-6 pl-7 pr-2 bg-muted/70 border border-border rounded text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Hierarchical Layer Tree Nodes */}
        <div className="flex-1 p-1 overflow-y-auto space-y-0.5">
          {activeScreen && activeScreen.layers.length > 0 ? (
            activeScreen.layers.map((layer) => renderLayerNode(layer))
          ) : (
            <div className="p-4 text-center text-xs text-zinc-500">
              No layers yet. Add one from the canvas toolbar below!
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
