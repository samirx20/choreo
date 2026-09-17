import React, { useState, useEffect, useRef } from "react";
import { ChunkLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";

interface ChunkRendererProps {
  layer: ChunkLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const ChunkRenderer: React.FC<ChunkRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex = true,
  computedStyle,
  onClick,
}) => {
  const {
    updateLayer,
    removeLayer,
    editingLayerId,
    setEditingLayerId,
    setActiveTextSelection,
    mergeChunkWithPrevious,
  } = useProjectStore();

  const isEditing = editingLayerId === layer.id;
  const [text, setText] = useState(layer.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(layer.content);
  }, [layer.content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const commitEdit = () => {
    setEditingLayerId(null);
    setActiveTextSelection(null);
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      removeLayer(layer.id);
    } else if (text !== layer.content) {
      updateLayer(layer.id, { content: text });
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end && start !== null && end !== null) {
      setActiveTextSelection({
        layerId: layer.id,
        start,
        end,
        text: target.value.substring(start, end),
      });
    } else {
      setActiveTextSelection(null);
    }
  };

  const baseCss = layerStyleToCss(layer.style, isChildInFlex, true);
  const combinedStyle = { ...baseCss, ...computedStyle };

  return (
    <span
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditingLayerId(layer.id);
      }}
      className={cn(
        "inline-block cursor-pointer select-none transition-[outline] relative",
        isSelected && !isEditing && "ring-1 ring-primary ring-offset-1 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSelect={handleSelect}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              commitEdit();
            } else if (e.key === "Backspace" && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
              e.preventDefault();
              mergeChunkWithPrevious(layer.id);
            }
          }}
          className="bg-transparent border-none outline-none p-0 m-0 w-auto"
          style={{
            font: "inherit",
            color: "inherit",
            letterSpacing: "inherit",
            lineHeight: "inherit",
            textAlign: "inherit",
          }}
        />
      ) : (
        layer.content
      )}
    </span>
  );
};
