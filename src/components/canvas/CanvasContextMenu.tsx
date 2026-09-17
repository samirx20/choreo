import React, { useEffect, useRef } from "react";
import {
  Copy,
  Trash2,
  Split,
  Component,
  Zap,
  Folder,
  Scissors,
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
    groupSelection,
    ungroup,
    splitTextRange,
    activeTextSelection,
    selectedLayerIds,
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

  const handleSplitChunks = () => {
    if (layer.type === "text") {
      const group = splitTextIntoChunks(layer as TextLayer);
      removeLayer(layer.id);
      addLayer(group);
      onClose();
    }
  };

  const handleSplitWords = () => {
    if (layer.type === "text") {
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
      className="fixed z-50 w-56 bg-[#171717]/95 backdrop-blur-md border border-[#262626] shadow-2xl rounded-xl p-1 text-xs text-[#eee8d5] select-none animate-in fade-in-0 zoom-in-95"
    >
      <div className="px-2 py-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider truncate">
        {layer.name}
      </div>

      <div className="h-px bg-[#262626] my-1" />

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
          className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5" />
            <span>Split Selection into Chunk</span>
          </span>
          <kbd className="text-[10px] font-mono">Ctrl+Shift+S</kbd>
        </button>
      )}

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Copy className="h-3.5 w-3.5 text-zinc-400" />
          <span>Duplicate</span>
        </span>
        <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+D</kbd>
      </button>

      {/* Group / Ungroup */}
      {isGroup ? (
        <button
          onClick={() => {
            ungroup(layer.id);
            onClose();
          }}
          className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-zinc-400" />
            <span>Ungroup</span>
          </span>
          <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+G</kbd>
        </button>
      ) : (
        <button
          onClick={() => {
            groupSelection();
            onClose();
          }}
          className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
        >
          <span className="flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-zinc-400" />
            <span>Group Selection</span>
          </span>
          <kbd className="text-[10px] text-zinc-500 font-mono">Ctrl+G</kbd>
        </button>
      )}

      {/* Text Splits */}
      {isText && (
        <>
          <button
            onClick={handleSplitChunks}
            className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Split className="h-3.5 w-3.5 text-primary" />
              <span>Split into Chunks</span>
            </span>
          </button>

          <button
            onClick={handleSplitWords}
            className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
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
        className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Component className="h-3.5 w-3.5 text-primary" />
          <span>Save as Component</span>
        </span>
      </button>

      <div className="h-px bg-[#262626] my-1" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </span>
        <kbd className="text-[10px] text-zinc-500 font-mono">Del</kbd>
      </button>
    </div>
  );
};
