import React, { useEffect, useRef } from "react";
import {
  Copy,
  Trash2,
  Split,
  Component,
  Zap,
  Layers,
} from "lucide-react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { splitTextIntoChunks, splitTextIntoWords } from "@/engine/textSplitter";
import { TextLayer } from "@/types/scene";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  layerId: string | null;
  onClose: () => void;
  onOpenComponentsDrawer: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  layerId,
  onClose,
  onOpenComponentsDrawer,
}) => {
  const {
    document: doc,
    activeScreenId,
    duplicateLayer,
    removeLayer,
    addLayer,
  } = useProjectStore();

  const menuRef = useRef<HTMLDivElement>(null);

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const layer = layerId ? findLayerInTree(activeScreen.layers, layerId) : null;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  if (!layer) return null;

  const isText = layer.type === "text";

  const handleDuplicate = () => {
    duplicateLayer(layer.id);
    onClose();
  };

  const handleDelete = () => {
    removeLayer(layer.id);
    onClose();
  };

  const handleSplitChunks = () => {
    if (isText) {
      const group = splitTextIntoChunks(layer as TextLayer);
      removeLayer(layer.id);
      addLayer(group);
      onClose();
    }
  };

  const handleSplitWords = () => {
    if (isText) {
      const group = splitTextIntoWords(layer as TextLayer);
      removeLayer(layer.id);
      addLayer(group);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 w-52 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-1 text-xs text-foreground select-none animate-in fade-in-0 zoom-in-95"
    >
      <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
        {layer.name}
      </div>

      <div className="h-px bg-border my-1" />

      <button
        onClick={handleDuplicate}
        className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-muted hover:text-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Duplicate</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+D</kbd>
      </button>

      {isText && (
        <>
          <button
            onClick={handleSplitChunks}
            className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-muted hover:text-foreground transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Split className="h-3.5 w-3.5 text-primary" />
              <span>Split into Chunks</span>
            </span>
          </button>

          <button
            onClick={handleSplitWords}
            className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-muted hover:text-foreground transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Split className="h-3.5 w-3.5 text-primary" />
              <span>Split into Words</span>
            </span>
          </button>
        </>
      )}

      <button
        onClick={() => {
          onClose();
          onOpenComponentsDrawer();
        }}
        className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-muted hover:text-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Component className="h-3.5 w-3.5 text-primary" />
          <span>Save as Component</span>
        </span>
      </button>

      <div className="h-px bg-border my-1" />

      <button
        onClick={handleDelete}
        className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-destructive/20 text-destructive hover:text-destructive transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Del</kbd>
      </button>
    </div>
  );
};
