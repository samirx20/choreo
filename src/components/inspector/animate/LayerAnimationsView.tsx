import React, { useState } from "react";
import {
  Type,
  Square,
  Circle,
  Folder,
  Image as ImageIcon,
  Sparkles,
  Repeat,
  ArrowUpRight,
  Plus,
  Trash2,
  Copy,
  ArrowRight,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Layer, AnimationClip, getLayerClips } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildSidebarCardMenu } from "@/components/contextmenu/contextMenuBuilders";

interface LayerAnimationsViewProps {
  selectedLayer: Layer;
}

export const LayerAnimationsView: React.FC<LayerAnimationsViewProps> = ({
  selectedLayer,
}) => {
  const {
    setSelectedClips,
    removeAnimationClip,
    openAnimationCatalog,
    updateLayer,
    removeLayer,
    duplicateLayer,
  } = useProjectStore();

  const [isEditingLayerName, setIsEditingLayerName] = useState(false);
  const [layerNameInput, setLayerNameInput] = useState(selectedLayer.name);

  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case "text":
      case "chunk":
        return <Type className="h-3.5 w-3.5 text-foreground" />;
      case "group":
        return <Folder className="h-3.5 w-3.5 text-foreground" />;
      case "shape":
        return layer.shapeType === "circle" ? (
          <Circle className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <Square className="h-3.5 w-3.5 text-foreground" />
        );
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-foreground" />;
      default:
        return <Square className="h-3.5 w-3.5 text-foreground" />;
    }
  };

  const getClipTypeBadge = (type: string) => {
    switch (type) {
      case "in":
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            In
          </span>
        );
      case "out":
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            Out
          </span>
        );
      case "action":
      case "emphasis":
      default:
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Repeat className="w-3 h-3 text-amber-600" />
            Action
          </span>
        );
    }
  };

  const clips: AnimationClip[] = getLayerClips(selectedLayer);

  return (
    <div className="p-4 space-y-4 text-foreground relative select-none">
      {/* Layer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {getLayerIcon(selectedLayer)}
          {isEditingLayerName ? (
            <Input
              type="text"
              value={layerNameInput}
              onChange={(e) => setLayerNameInput(e.target.value)}
              onBlur={() => {
                if (layerNameInput.trim()) {
                  updateLayer(selectedLayer.id, { name: layerNameInput.trim() });
                } else {
                  setLayerNameInput(selectedLayer.name);
                }
                setIsEditingLayerName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (layerNameInput.trim()) {
                    updateLayer(selectedLayer.id, { name: layerNameInput.trim() });
                  }
                  setIsEditingLayerName(false);
                } else if (e.key === "Escape") {
                  setLayerNameInput(selectedLayer.name);
                  setIsEditingLayerName(false);
                }
              }}
              autoFocus
              className="h-6 px-1.5 text-xs font-semibold text-foreground bg-card border border-primary rounded outline-none w-full"
            />
          ) : (
            <span
              onDoubleClick={() => {
                setLayerNameInput(selectedLayer.name);
                setIsEditingLayerName(true);
              }}
              className="text-xs font-semibold truncate cursor-text hover:text-primary transition-colors"
              title="Double-click to rename layer"
            >
              {selectedLayer.name}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
              title="Layer options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-xs">
            <DropdownMenuItem
              onClick={() => {
                setLayerNameInput(selectedLayer.name);
                setIsEditingLayerName(true);
              }}
              className="gap-2 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Rename Layer</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => duplicateLayer(selectedLayer.id)}
              className="gap-2 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Duplicate Layer</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => removeLayer(selectedLayer.id)}
              className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Layer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Primary 'New Animation' Button */}
      <button
        type="button"
        onClick={() => openAnimationCatalog(null)}
        className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>New Animation</span>
      </button>

      {/* Applied Animations List */}
      {clips.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Active Animations ({clips.length})</span>
          </div>

          <div className="space-y-1.5">
            {clips.map((clip) => (
              <div
                key={clip.id}
                onClick={() => setSelectedClips([clip.id])}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedClips([clip.id]);
                  const store = useProjectStore.getState();
                  const menuItems = buildSidebarCardMenu({ layerId: selectedLayer.id, clip, store });
                  useContextMenuStore.getState().openContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    zone: "sidebar-card",
                    items: menuItems,
                  });
                }}
                className="bg-card hover:bg-muted/60 border border-border hover:border-primary/40 rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getClipTypeBadge(clip.type)}
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary truncate capitalize">
                    {clip.name || clip.preset}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {clip.duration}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnimationClip(selectedLayer.id, clip.id);
                    }}
                    className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                    title="Delete animation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
