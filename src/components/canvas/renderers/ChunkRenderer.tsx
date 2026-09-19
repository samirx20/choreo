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
    mergeChunkWithNext,
    selectLayer,
    currentTime,
  } = useProjectStore();

  const isEditing = editingLayerId === layer.id;
  const [text, setText] = useState(layer.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(layer.content);
  }, [layer.content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.selectionStart = inputRef.current.value.length;
      inputRef.current.selectionEnd = inputRef.current.value.length;
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
      selectLayer(layer.id, false);
    } else {
      selectLayer(layer.id, false);
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
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
        <span className="grid grid-cols-1 grid-rows-1 relative inline-block min-w-[20px]">
          {/* Mirror element guarantees accurate auto-width and height */}
          <span
            aria-hidden="true"
            className="invisible whitespace-pre-wrap col-start-1 row-start-1 p-0 m-0 pointer-events-none break-words select-none"
            style={{
              font: "inherit",
              letterSpacing: "inherit",
              lineHeight: "inherit",
              textAlign: "inherit",
            }}
          >
            {text ? (text.endsWith("\n") ? text + "\u00A0" : text) : "\u00A0"}
          </span>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={handleSelect}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || (e as any).isComposing) {
                return;
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                commitEdit();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                commitEdit();
              } else if (e.key === "Enter" && e.shiftKey) {
                // Shift+Enter: newline
                e.stopPropagation();
              } else if (e.key === "Backspace" && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
                e.preventDefault();
                e.stopPropagation();
                mergeChunkWithPrevious(layer.id);
              } else if (
                e.key === "Delete" &&
                e.currentTarget.selectionStart === text.length &&
                e.currentTarget.selectionEnd === text.length
              ) {
                e.preventDefault();
                e.stopPropagation();
                mergeChunkWithNext(layer.id);
              }
            }}
            className="col-start-1 row-start-1 bg-transparent border-none outline-none resize-none p-0 m-0 w-full h-full overflow-hidden"
            style={{
              font: "inherit",
              color: "inherit",
              letterSpacing: "inherit",
              lineHeight: "inherit",
              textAlign: "inherit",
              wordBreak: "break-word",
            }}
          />
        </span>
      ) : (() => {
        const inPreset = layer.animation?.in?.preset;
        const outPreset = layer.animation?.out?.preset;
        if (inPreset === "typewriter" || outPreset === "typewriter") {
          const isOut = outPreset === "typewriter" && currentTime >= (layer.animation?.out?.start ?? Infinity);
          const anim = isOut ? layer.animation!.out! : layer.animation!.in!;
          const chars = Array.from(layer.content);
          if (currentTime < anim.start) {
            return isOut ? layer.content : null;
          }
          const rawP = (currentTime - anim.start) / Math.max(anim.duration, 0.001);
          const p = Math.min(Math.max(rawP, 0), 1);
          const visibleCount = isOut
            ? Math.floor((1 - p) * chars.length)
            : Math.floor(p * chars.length);
          const displayed = chars.slice(0, visibleCount).join("");
          return (
            <span>
              {displayed}
              {p < 1 && (
                <span className="inline-block w-0.5 h-[1em] bg-primary align-middle ml-0.5 animate-pulse" />
              )}
            </span>
          );
        }
        return layer.content;
      })()}
    </span>
  );
};
