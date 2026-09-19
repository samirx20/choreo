import React, { useState, useEffect, useRef } from "react";
import { TextLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";
import { evaluateAnimationConfig } from "@/engine/evaluator";
import { compileTransform } from "@/engine/atomics";

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
    currentTime,
    selectLayer,
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
              if (e.nativeEvent.isComposing || (e as any).isComposing) {
                return;
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                commitEdit();
              } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                // Pressing Enter commits text and returns to text layer selected
                e.preventDefault();
                e.stopPropagation();
                commitEdit();
              } else if (e.key === "Enter" && e.shiftKey) {
                // Shift+Enter inserts a new line (native textarea behavior)
                e.stopPropagation();
              } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                // Ctrl + Enter: Caret Split or commit
                e.preventDefault();
                e.stopPropagation();
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

        const activeAnim =
          layer.animation?.out &&
          (layer.animation.out.animateBy === "word" ||
            layer.animation.out.animateBy === "character")
            ? { config: layer.animation.out, mode: "out" as const }
            : layer.animation?.in &&
              (layer.animation.in.animateBy === "word" ||
                layer.animation.in.animateBy === "character")
            ? { config: layer.animation.in, mode: "in" as const }
            : null;

        if (activeAnim) {
          const anim = activeAnim.config;
          const mode = activeAnim.mode;
          if (anim.animateBy === "character") {
            const chars = Array.from(layer.content);
            const stagger = anim.stagger ?? 0.03;
            return chars.map((char, i) => {
              const charStart = anim.start + i * stagger;
              const charEval = evaluateAnimationConfig(
                { ...anim, start: charStart },
                currentTime,
                mode
              );
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: charEval.opacity,
                    transform: compileTransform(charEval.transform),
                    filter: charEval.filter,
                    whiteSpace: "pre",
                  }}
                >
                  {char}
                </span>
              );
            });
          } else {
            // Word by word
            const tokens = layer.content.split(/(\s+)/);
            let wordIndex = 0;
            const stagger = anim.stagger ?? 0.08;
            return tokens.map((token, idx) => {
              if (/^\s+$/.test(token)) {
                return (
                  <span key={idx} className="whitespace-pre">
                    {token}
                  </span>
                );
              }
              const wordStart = anim.start + wordIndex * stagger;
              wordIndex++;
              const wordEval = evaluateAnimationConfig(
                { ...anim, start: wordStart },
                currentTime,
                mode
              );
              return (
                <span
                  key={idx}
                  style={{
                    display: "inline-block",
                    opacity: wordEval.opacity,
                    transform: compileTransform(wordEval.transform),
                    filter: wordEval.filter,
                    whiteSpace: "pre",
                  }}
                >
                  {token}
                </span>
              );
            });
          }
        }
        return layer.content;
      })()}
    </div>
  );
};
