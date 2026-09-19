import React, { useEffect, useRef } from "react";
import {
  Copy,
  Trash2,
  Component,
  Zap,
  Folder,
  Scissors,
  Edit2,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  layerId: string | null;
  onClose: () => void;
  onOpenComponentsDrawer: () => void;
  onRename?: (layerId: string) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  layerId,
  onClose,
  onOpenComponentsDrawer,
  onRename,
}) => {
  const {
    document: doc,
    activeScreenId,
    duplicateLayer,
    removeLayer,
    addLayer,
    groupSelection,
    ungroup,
    splitTextRange,
    activeTextSelection,
    selectedLayerIds,
    selectLayer,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
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

  const isText = layer.type === "text" || layer.type === "chunk";
  const isGroup = layer.type === "group";
  const hasHighlightedSpan =
    activeTextSelection &&
    activeTextSelection.layerId === layer.id &&
    activeTextSelection.text.length > 0;

  const handleDuplicate = () => {
    duplicateLayer(layer.id);
    onClose();
  };

  const handleDelete = () => {
    removeLayer(layer.id);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 w-56 bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-[12px] p-1 text-xs text-popover-foreground select-none animate-in fade-in-0 zoom-in-95"
    >
      <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
        {layer.name}
      </div>

      <div className="h-px bg-border my-1" />

      {/* Split Highlighted Selection */}
      {hasHighlightedSpan && (
        <button
          onClick={() => {
            splitTextRange(
              activeTextSelection.layerId,
              activeTextSelection.start,
              activeTextSelection.end
            );
            onClose();
          }}
          className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5" />
            <span>Split</span>
          </span>
          <kbd className="text-[10px] font-mono">Ctrl+Shift+S</kbd>
        </button>
      )}

      {/* Rename */}
      <button
        onClick={() => {
          onClose();
          onRename?.(layer.id);
        }}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Rename</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">F2</kbd>
      </button>

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Duplicate</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+D</kbd>
      </button>

      {/* Group / Ungroup */}
      {isGroup ? (
        <button
          onClick={() => {
            ungroup(layer.id);
            onClose();
          }}
          className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ungroup</span>
          </span>
          <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+Shift+G</kbd>
        </button>
      ) : (
        <button
          onClick={() => {
            groupSelection();
            onClose();
          }}
          className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Group Selection</span>
          </span>
          <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+G</kbd>
        </button>
      )}

      <button
        onClick={() => {
          onClose();
          onOpenComponentsDrawer();
        }}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Component className="h-3.5 w-3.5 text-primary" />
          <span>Save as Component</span>
        </span>
      </button>

      <div className="h-px bg-border my-1" />

      {/* Layer Stacking Order (Z-Index) */}
      <button
        onClick={() => {
          bringForward(layer.id);
          onClose();
        }}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Bring Forward</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+]</kbd>
      </button>
      <button
        onClick={() => {
          sendBackward(layer.id);
          onClose();
        }}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Send Backward</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+[</kbd>
      </button>
      <button
        onClick={() => {
          bringToFront(layer.id);
          onClose();
        }}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronsUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Bring to Front</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+Shift+]</kbd>
      </button>
      <button
        onClick={() => {
          sendToBack(layer.id);
          onClose();
        }}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronsDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Send to Back</span>
        </span>
        <kbd className="text-[10px] text-muted-foreground font-mono">Ctrl+Shift+[</kbd>
      </button>

      <div className="h-px bg-border my-1" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full px-2 py-1.5 rounded-[8px] flex items-center justify-between hover:bg-destructive/10 text-destructive transition-colors text-left"
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
