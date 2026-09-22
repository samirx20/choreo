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
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Layers,
  icons,
  Smile,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface LayerHeaderCardProps {
  selectedLayer: Layer;
  selectedLayers: Layer[];
}

export const LayerHeaderCard: React.FC<LayerHeaderCardProps> = ({
  selectedLayer,
  selectedLayers,
}) => {
  const { updateLayer, removeLayer, duplicateLayer } = useProjectStore();
  const [isEditingLayerName, setIsEditingLayerName] = useState(false);
  const [layerNameInput, setLayerNameInput] = useState(selectedLayer.name);

  useEffect(() => {
    setLayerNameInput(selectedLayer.name);
    setIsEditingLayerName(false);
  }, [selectedLayer.id, selectedLayer.name]);

  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case "text":
      case "chunk":
      case "counter":
        return <Type className="h-3.5 w-3.5 text-foreground" />;
      case "icon": {
        const IconComp =
          (icons as Record<string, React.FC<any>>)[(layer as any).iconName] || Smile;
        return <IconComp className="h-3.5 w-3.5 text-foreground" />;
      }
      case "group":
        return <Folder className="h-3.5 w-3.5 text-foreground" />;
      case "frame":
        return <BoxSelect className="h-3.5 w-3.5 text-foreground" />;
      case "line":
        return (layer as any).arrowEnd === "arrow" ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <Minus className="h-3.5 w-3.5 text-foreground" />
        );
      case "polygon":
        return (layer as any).sides === 3 ? (
          <Triangle className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <Hexagon className="h-3.5 w-3.5 text-foreground" />
        );
      case "shape":
        if (layer.shapeType === "circle" || layer.shapeType === "ellipse") {
          return <Circle className="h-3.5 w-3.5 text-foreground" />;
        }
        if (layer.shapeType === "star") {
          return <Star className="h-3.5 w-3.5 text-foreground" />;
        }
        if (layer.shapeType === "triangle") {
          return <Triangle className="h-3.5 w-3.5 text-foreground" />;
        }
        if (layer.shapeType === "line") {
          return <Minus className="h-3.5 w-3.5 text-foreground" />;
        }
        if (layer.shapeType === "arrow") {
          return <ArrowUpRight className="h-3.5 w-3.5 text-foreground" />;
        }
        return <Square className="h-3.5 w-3.5 text-foreground" />;
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-foreground" />;
      default:
        return <Square className="h-3.5 w-3.5 text-foreground" />;
    }
  };

  return (
    <div className="flex items-center justify-between pb-2 border-b border-border">
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        {selectedLayers.length > 1 ? (
          <>
            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold truncate text-foreground">
              {selectedLayers.length} elements selected
            </span>
          </>
        ) : (
          <>
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
                onDoubleClick={() => setIsEditingLayerName(true)}
                className="text-xs font-semibold truncate cursor-text hover:text-primary transition-colors"
                title="Double-click to rename layer"
              >
                {selectedLayer.name}
              </span>
            )}
          </>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
            title={selectedLayers.length > 1 ? "Selection options" : "Layer options"}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-xs">
          {selectedLayers.length > 1 ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  selectedLayers.forEach((l) => duplicateLayer(l.id));
                }}
                className="gap-2 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Duplicate All ({selectedLayers.length})</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  selectedLayers.forEach((l) => removeLayer(l.id));
                }}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete All ({selectedLayers.length})</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => setIsEditingLayerName(true)}
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
