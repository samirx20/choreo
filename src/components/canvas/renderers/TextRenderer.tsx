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

  const isEditing = Boolean(editingLayerId === layer.id && isSelected);
  const [text, setText] = useState(layer.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialFocusRef = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;
  const isEditingRef = useRef(isEditing);

  useEffect(() => {
    setText(layer.content);
  }, [layer.content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Only select all text on the very first time the layer is placed with default "Add text"
      if (layer.content === "Add text" && !initialFocusRef.current) {
        inputRef.current.select();
        initialFocusRef.current = true;
      }
    }
  }, [isEditing, layer.content]);

  const commitEdit = (reselect = true) => {
    setEditingLayerId(null);
    setActiveTextSelection(null);
    if (typeof window !== "undefined" && window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    const currentText = textRef.current;
    const trimmed = currentText.trim();
    if (trimmed.length === 0) {
      // Clean up ghost empty text layer
      removeLayer(layer.id);
    } else {
      if (currentText !== layer.content) {
        updateLayer(layer.id, {
          content: currentText,
        });
      }
      if (reselect) {
        selectLayer(layer.id, false);
      }
    }
  };

  // Sync edits if isEditing transitions to false externally (e.g. clicking artboard/canvas)
  useEffect(() => {
    if (isEditingRef.current && !isEditing) {
      const currentText = textRef.current;
      const trimmed = currentText.trim();
      if (trimmed.length === 0) {
        removeLayer(layer.id);
      } else if (currentText !== layer.content) {
        updateLayer(layer.id, { content: currentText });
      }
      setActiveTextSelection(null);
      if (typeof window !== "undefined" && window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
    }
    isEditingRef.current = isEditing;
  }, [isEditing, layer.id, layer.content, removeLayer, updateLayer, setActiveTextSelection]);

  // Clean up on unmount if still editing
  useEffect(() => {
    return () => {
      if (isEditingRef.current) {
        const currentText = textRef.current;
        const trimmed = currentText.trim();
        if (trimmed.length === 0) {
          removeLayer(layer.id);
        } else if (currentText !== layer.content) {
          updateLayer(layer.id, { content: currentText });
        }
      }
    };
  }, [layer.id, layer.content, removeLayer, updateLayer]);

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== null && end !== null && start !== end) {
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
        selectLayer(layer.id, false);
        setEditingLayerId(layer.id);
      }}
      className={cn(
        "cursor-pointer select-none transition-[outline] whitespace-pre-wrap relative",
        layer.style.tailwindClasses
      )}
    >
      {isEditing ? (
        <div
          className="grid grid-cols-1 grid-rows-1 relative w-full min-w-[20px]"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {/* Hidden Mirror to automatically size parent box to match text dimensions */}
          <span
            aria-hidden="true"
            className="invisible whitespace-pre-wrap col-start-1 row-start-1 p-0 m-0 pointer-events-none break-words select-none"
            style={{
              font: "inherit",
              letterSpacing: "inherit",
              lineHeight: "inherit",
              textAlign: (layer.style.textAlign as any) || "center",
            }}
          >
            {text ? (text.endsWith("\n") ? text + "\u00A0" : text) : "\u00A0"}
          </span>

          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onSelect={handleSelect}
            onBlur={() => commitEdit(false)}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || (e as any).isComposing) {
                return;
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                commitEdit(true);
              } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                // Ctrl / Cmd + Enter: Commit
                e.preventDefault();
                e.stopPropagation();
                commitEdit(true);
              }
            }}
            className="col-start-1 row-start-1 bg-transparent border-none outline-none resize-none p-0 m-0 w-full h-full overflow-hidden"
            style={{
              font: "inherit",
              color: "inherit",
              letterSpacing: "inherit",
              lineHeight: "inherit",
              textAlign: (layer.style.textAlign as any) || "center",
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
        return (
          <span
            className={cn(
              "w-full text-inherit font-inherit leading-inherit",
              isSelected && !isEditing && "shadow-[inset_0_-1px_0_rgba(109,40,217,0.5)] inline-block"
            )}
            style={{
              textAlign: (layer.style.textAlign as any) || "center",
            }}
          >
            {layer.content}
          </span>
        );
      })()}
    </div>
  );
};
