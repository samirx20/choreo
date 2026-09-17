import React, { useState, useEffect, useRef } from "react";
import { TextLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";

interface TextRendererProps {
  layer: TextLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const {
    updateLayer,
    removeLayer,
    editingLayerId,
    setEditingLayerId,
    setActiveTextSelection,
    splitTextRange,
    splitTextAtCaret,
    mergeChunkWithPrevious,
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
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      if (layer.content === "Add text") {
        inputRef.current.select();
      }
    }
  }, [isEditing, layer.content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [text, isEditing]);

  const commitEdit = () => {
    setEditingLayerId(null);
    setActiveTextSelection(null);
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      // Clean up ghost empty text layer
      removeLayer(layer.id);
    } else {
      updateLayer(layer.id, {
        content: text,
        style: {
          ...layer.style,
          height: "auto",
        },
      });
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
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditingLayerId(layer.id);
      }}
      className={cn(
        "cursor-pointer select-none transition-[outline] whitespace-pre-wrap relative",
        isSelected && !isEditing && "ring-1 ring-primary ring-offset-2 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {isEditing ? (
        <div className="grid grid-cols-1 grid-rows-1 relative w-full h-full min-w-[20px]">
          {/* Mirror element guarantees perfect auto-width and auto-height matching content */}
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={handleSelect}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                commitEdit();
              } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                // Ctrl + Enter: Caret Split or commit
                e.preventDefault();
                const caretIdx = e.currentTarget.selectionStart || 0;
                if (caretIdx > 0 && caretIdx < text.length) {
                  commitEdit();
                  splitTextAtCaret(layer.id, caretIdx);
                } else {
                  commitEdit();
                }
              } else if (
                e.key === "Backspace" &&
                e.currentTarget.selectionStart === 0 &&
                e.currentTarget.selectionEnd === 0
              ) {
                // Backspace at index 0: Merge with previous chunk
                mergeChunkWithPrevious(layer.id);
              }
              // Regular Enter naturally adds a new line in textarea!
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
        </div>
      ) : (
        layer.content
      )}
    </div>
  );
};
