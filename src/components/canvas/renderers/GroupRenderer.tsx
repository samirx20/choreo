import React, { useRef, useLayoutEffect } from "react";
import { GroupLayer, Layer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";
import { useProjectStore, isMotionMode } from "@/store/useProjectStore";

interface GroupRendererProps {
  layer: GroupLayer;
  selectedLayerIds: string[];
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
  renderChild?: (child: Layer, isChildInFlex: boolean) => React.ReactNode;
}

export const GroupRenderer: React.FC<GroupRendererProps> = ({
  layer,
  selectedLayerIds,
  isChildInFlex = false,
  computedStyle,
  computedLayerStyles = {},
  onSelectLayer,
  renderChild,
}) => {
  const isSelected = selectedLayerIds.includes(layer.id);
  const currentTime = useProjectStore((s) => s.currentTime);
  const uiMode = useProjectStore((s) => s.uiMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRectRef = useRef<DOMRect | null>(null);

  const baseCss = layerStyleToCss(layer.style, isChildInFlex);

  const isFlex = layer.layout?.display === "flex";

  // Apply layout settings
  const layout = layer.layout || {
    display: "none",
    flexDirection: "column",
    gap: 16,
    align: "center",
    justify: "center",
  };

  const layoutCss: React.CSSProperties = isFlex
    ? {
        display: "flex",
        flexDirection: layout.flexDirection || "column",
        flexWrap: layout.flexWrap || "nowrap",
        gap: `${layout.gap ?? 16}px`,
        alignItems:
          layout.align === "start"
            ? "flex-start"
            : layout.align === "end"
            ? "flex-end"
            : layout.align === "stretch"
            ? "stretch"
            : "center",
        justifyContent:
          (layout.justify || (layout as any).justifyContent) === "start"
            ? "flex-start"
            : (layout.justify || (layout as any).justifyContent) === "end"
            ? "flex-end"
            : (layout.justify || (layout as any).justifyContent) === "space-between"
            ? "space-between"
            : (layout.justify || (layout as any).justifyContent) === "space-around"
            ? "space-around"
            : "center",
      }
    : {
        display: "block",
        position: isChildInFlex ? "relative" : "absolute",
      };

  // If autoFit is enabled and in flex mode, hug content dimensions
  // Use max-content so container doesn't squish/wrap when moved near artboard boundaries.
  // Never apply CSS transition to width/height to prevent layout lag and feedback loops during drag.
  if (isFlex && layer.autoFit) {
    if (layout.flexDirection === "column") {
      layoutCss.height = "max-content";
      if (!layer.style.width || layer.style.width === "auto") {
        layoutCss.width = "max-content";
      }
    } else {
      layoutCss.width = "max-content";
      if (!layer.style.height || layer.style.height === "auto") {
        layoutCss.height = "max-content";
      }
    }
    layoutCss.transition = "none";
  }

  // Anti-Collapse Floors: Enforce minimum dimensions if empty and in flex mode
  if (isFlex) {
    const minW = (layout as any).minWidth ?? 140;
    const minH = (layout as any).minHeight ?? 70;
    layoutCss.minWidth = `${minW}px`;
    layoutCss.minHeight = `${minH}px`;
  }

  // Count currently visible children (dynamic in Motion Mode as timeline advances)
  const visibleChildrenCount = layer.children
    ? layer.children.filter((child) => {
        const anim = child.animation?.in;
        return !(
          isMotionMode(uiMode) &&
          layer.autoFit &&
          anim &&
          currentTime < anim.start
        );
      }).length
    : 0;

  const prevVisibleCountRef = useRef<number>(visibleChildrenCount);

  // FLIP Layout Morphing Hook (Web Animations API)
  // Only runs in Motion Mode when autoFit is active AND visible children count changes
  // (e.g. when chunks enter sequentially during timeline playback).
  // Never runs during moving, dragging, or direct manipulation in Design Mode.
  useLayoutEffect(() => {
    if (!isFlex || !layer.autoFit || !containerRef.current) return;
    const el = containerRef.current;
    const currentRect = el.getBoundingClientRect();

    // In Design Mode or if visible children count did not change, record baseline and return
    if (!isMotionMode(uiMode) || prevVisibleCountRef.current === visibleChildrenCount) {
      prevRectRef.current = currentRect;
      prevVisibleCountRef.current = visibleChildrenCount;
      return;
    }

    // Visible children count changed in Animate Mode (a chunk just entered or left)
    if (
      prevRectRef.current &&
      currentRect.width > 0 &&
      currentRect.height > 0
    ) {
      const deltaW = prevRectRef.current.width / currentRect.width;
      const deltaH = prevRectRef.current.height / currentRect.height;

      // Only animate if there's a significant visual difference (> 2px) to prevent sub-pixel rounding jitter
      if (Math.abs(deltaW - 1) > 0.02 || Math.abs(deltaH - 1) > 0.02) {
        // Cancel any previous running animation to prevent compounding scale distortions
        if (typeof el.getAnimations === "function") {
          el.getAnimations().forEach((anim) => anim.cancel());
        }

        if (typeof el.animate === "function") {
          el.animate(
            [
              { transform: `scale(${deltaW}, ${deltaH})`, transformOrigin: "top left" },
              { transform: "scale(1, 1)", transformOrigin: "top left" },
            ],
            {
              duration: 350,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            }
          );
        }
      }
    }

    prevRectRef.current = currentRect;
    prevVisibleCountRef.current = visibleChildrenCount;
  }, [isFlex, layer.autoFit, uiMode, visibleChildrenCount]);

  const combinedStyle: React.CSSProperties = {
    ...baseCss,
    ...layoutCss,
    ...computedStyle,
  };

  const isClipping = (layer as any).clipContent ?? layer.style?.clipContent;
  if (isClipping !== undefined) {
    combinedStyle.overflow = isClipping ? "hidden" : "visible";
  }

  const isChildrenInFlex = isFlex;
  const isEmpty = !layer.children || layer.children.length === 0;

  return (
    <div
      ref={containerRef}
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelectLayer(layer.id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        for (const el of elements) {
          const layerEl = (el as HTMLElement).closest?.('[id^="layer-"]');
          const match = layerEl?.id?.match(/^layer-(.+)$/);
          if (match && match[1] && match[1] !== layer.id) {
            onSelectLayer(match[1], e);
            return;
          }
        }
        if (layer.children && layer.children.length > 0) {
          onSelectLayer(layer.children[0].id, e);
        }
      }}
      className={cn(
        "cursor-pointer select-none box-border",
        isEmpty &&
          "border border-dashed border-zinc-600 bg-zinc-900/40 flex items-center justify-center",
        layer.style.tailwindClasses
      )}
    >
      {isEmpty ? (
        <div className="text-[10px] text-zinc-500 font-mono pointer-events-none select-none px-3 py-2 text-center">
          Empty Flex Group
        </div>
      ) : (
        layer.children.map((child: Layer) => {
          // In animate mode with autoFit, dynamically collapse un-entered children out of DOM flexbox
          const anim = child.animation?.in;
          const isNotYetEntered =
            isMotionMode(uiMode) &&
            layer.autoFit &&
            anim &&
            currentTime < anim.start;

          if (isNotYetEntered) {
            return null;
          }

          return renderChild ? (
            renderChild(child, isChildrenInFlex)
          ) : null;
        })
      )}
    </div>
  );
};
