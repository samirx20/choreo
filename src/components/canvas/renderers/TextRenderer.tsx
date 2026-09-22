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
  const editableRef = useRef<HTMLSpanElement>(null);
  const initialFocusRef = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;
  const isEditingRef = useRef(isEditing);

  useEffect(() => {
    setText(layer.content);
  }, [layer.content]);

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Only select all text on the very first time the layer is placed with default "Add text"
      if (layer.content === "Add text" && !initialFocusRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editableRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
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
    const currentText = (editableRef.current?.innerText ?? textRef.current).replace(/\r\n/g, "\n");
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
      const currentText = (editableRef.current?.innerText ?? textRef.current).replace(/\r\n/g, "\n");
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
        const currentText = (editableRef.current?.innerText ?? textRef.current).replace(/\r\n/g, "\n");
        const trimmed = currentText.trim();
        if (trimmed.length === 0) {
          removeLayer(layer.id);
        } else if (currentText !== layer.content) {
          updateLayer(layer.id, { content: currentText });
        }
      }
    };
  }, [layer.id, layer.content, removeLayer, updateLayer]);

  const updateTextSelection = () => {
    if (typeof window === "undefined" || !window.getSelection) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setActiveTextSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const selectedStr = sel.toString();
    if (!selectedStr) {
      setActiveTextSelection(null);
      return;
    }
    const el = editableRef.current;
    if (el && el.contains(range.commonAncestorContainer)) {
      const preRange = range.cloneRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const end = start + selectedStr.length;
      setActiveTextSelection({
        layerId: layer.id,
        start,
        end,
        text: selectedStr,
      });
    }
  };

  const baseCss = layerStyleToCss(layer.style, isChildInFlex, true);
  const combinedStyle: React.CSSProperties = {
    ...baseCss,
    ...computedStyle,
    overflow: isEditing ? "visible" : (baseCss.overflow ?? "visible"),
  };

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
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            const val = e.currentTarget.innerText || "";
            setText(val);
            textRef.current = val;
          }}
          onBlur={() => commitEdit(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            updateTextSelection();
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyUp={() => updateTextSelection()}
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
          className={cn(
            "w-full text-inherit font-inherit leading-inherit outline-none border-none bg-transparent cursor-text select-text inline-block",
            layer.style.tailwindClasses
          )}
          style={{
            textAlign: (layer.style.textAlign as any) || "center",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {layer.content}
        </span>
      ) : (() => {
        const clips = layer.animation?.clips ? layer.animation.clips : (layer.animation?.in ? [layer.animation.in as any] : []);
        
        // Find typewriter clip if any
        const typewriterClip = clips.find((c) => c.preset === "typewriter" || (c as any).id?.includes("typewriter"));
        if (typewriterClip) {
          const anim = typewriterClip;
          const isOut = anim.type === "out";
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

        // Find active split/stagger clip (e.g. Letters, Words, Lines, baselineReveal)
        const splitClip = clips.find(
          (c) =>
            c.splitBy === "character" ||
            c.splitBy === "word" ||
            c.splitBy === "line" ||
            (c as any).animateBy === "character" ||
            (c as any).animateBy === "word" ||
            c.preset === "baselineReveal"
        );

        if (splitClip) {
          const anim = splitClip;
          const mode = anim.type === "out" ? ("out" as const) : ("in" as const);
          const splitBy = anim.splitBy || (anim as any).animateBy || (anim.preset === "baselineReveal" ? "word" : "character");
          const stagger = anim.staggerDelay ?? (anim as any).stagger ?? (splitBy === "character" ? 0.04 : 0.08);
          const order = anim.params?.order || "Forward";

          if (splitBy === "character") {
            const chars = Array.from(layer.content);
            const total = chars.length;
            return chars.map((char, i) => {
              let orderIdx = i;
              if (order === "Backward") orderIdx = total - 1 - i;
              else if (order === "From center") orderIdx = Math.abs(i - Math.floor(total / 2));
              else if (order === "To center") orderIdx = Math.floor(total / 2) - Math.abs(i - Math.floor(total / 2));
              else if (order === "Random") orderIdx = ((i * 13) % total);

              const charStart = anim.start + orderIdx * stagger;
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
            const wordsOnly = tokens.filter((t) => !/^\s+$/.test(t));
            const totalWords = wordsOnly.length;
            let wordCount = 0;

            return tokens.map((token, idx) => {
              if (/^\s+$/.test(token)) {
                return (
                  <span key={idx} className="whitespace-pre">
                    {token}
                  </span>
                );
              }
              const currentWordIdx = wordCount++;
              let orderIdx = currentWordIdx;
              if (order === "Backward") orderIdx = totalWords - 1 - currentWordIdx;
              else if (order === "From center") orderIdx = Math.abs(currentWordIdx - Math.floor(totalWords / 2));
              else if (order === "To center") orderIdx = Math.floor(totalWords / 2) - Math.abs(currentWordIdx - Math.floor(totalWords / 2));
              else if (order === "Random") orderIdx = ((currentWordIdx * 7) % totalWords);

              const wordStart = anim.start + orderIdx * stagger;
              const wordEval = evaluateAnimationConfig(
                { ...anim, start: wordStart },
                currentTime,
                mode
              );

              const isBaseline = anim.preset === "baselineReveal";

              return (
                <span
                  key={idx}
                  style={{
                    display: "inline-block",
                    overflow: isBaseline ? "hidden" : "visible",
                    verticalAlign: "bottom",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      opacity: wordEval.opacity,
                      transform: isBaseline
                        ? `translateY(${(1 - (mode === "in" ? Math.min(1, Math.max(0, (currentTime - wordStart) / Math.max(anim.duration, 0.05))) : 0)) * 100}%)`
                        : compileTransform(wordEval.transform),
                      filter: wordEval.filter,
                      whiteSpace: "pre",
                    }}
                  >
                    {token}
                  </span>
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
