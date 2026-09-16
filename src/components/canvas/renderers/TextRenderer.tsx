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
  const { updateLayer } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(layer.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(layer.content);
  }, [layer.content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = () => {
    setIsEditing(false);
    if (text !== layer.content) {
      updateLayer(layer.id, { content: text });
    }
  };

  const baseCss = layerStyleToCss(layer.style, isChildInFlex);
  const combinedStyle = { ...baseCss, ...computedStyle };

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        "cursor-pointer select-none transition-[outline] whitespace-pre-wrap relative",
        isSelected && "ring-1 ring-primary ring-offset-2 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              setText(layer.content);
              setIsEditing(false);
            }
          }}
          className="bg-transparent border-none outline-none resize-none p-0 m-0 w-full overflow-hidden"
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
    </div>
  );
};
