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
  } = useProjectStore();

  const [layerSearch, setLayerSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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
        return <Type className="h-3.5 w-3.5 text-blue-400" />;
      case "chunk":
        return <Zap className="h-3.5 w-3.5 text-amber-400" />;
      case "group":
        return <Folder className="h-3.5 w-3.5 text-violet-400" />;
      case "shape":
        return layer.shapeType === "circle" ? (
          <Circle className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Square className="h-3.5 w-3.5 text-emerald-400" />
        );
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-pink-400" />;
      default:
        return <Square className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  // Render a single layer item in the tree recursively
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

    return (
      <div key={layer.id} className="flex flex-col select-none">
        <div
          onClick={(e) => {
            selectLayer(layer.id, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={cn(
            "group flex items-center justify-between h-7 pr-2 text-xs rounded transition-colors cursor-pointer",
            isSelected
              ? "bg-violet-600/20 text-violet-200 font-medium"
              : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
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
    <aside className="w-64 h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col select-none overflow-hidden">
      {/* SECTION 1: SCREENS (Top Half) */}
      <div className="flex flex-col border-b border-zinc-800/80">
        <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/30">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Screens
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] text-zinc-400">
              {doc.screens.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => addScreen()}
            title="Add Screen"
            className="text-zinc-400 hover:text-white"
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
                    ? "bg-zinc-900 border-violet-500/60 shadow-sm"
                    : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900/70 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-7 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold",
                      isScreenActive
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    #{idx + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {screen.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
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
                    className="h-5 w-5 text-zinc-400 hover:text-zinc-100"
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
                      className="h-5 w-5 text-red-400 hover:text-red-300"
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
        <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/30">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Layers
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] text-zinc-400">
              {activeScreen ? activeScreen.layers.length : 0}
            </Badge>
          </div>
        </div>

        {/* Filter / Search input */}
        <div className="p-2 border-b border-zinc-800/60">
          <div className="relative flex items-center">
            <Search className="absolute left-2 h-3 w-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search layers..."
              value={layerSearch}
              onChange={(e) => setLayerSearch(e.target.value)}
              className="w-full h-6 pl-7 pr-2 bg-zinc-900/80 border border-zinc-800/80 rounded text-[11px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
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
