import React, { useRef, useLayoutEffect } from "react";
import { GroupLayer, Layer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";
import { useProjectStore, isMotionMode } from "@/store/useProjectStore";
import { generateStarPoints, generatePolygonPoints } from "./ShapeRenderer";

interface GroupRendererProps {
  layer: GroupLayer;
  selectedLayerIds: string[];
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
  renderChild?: (child: Layer, isChildInFlex: boolean) => React.ReactNode;
}

export function renderMaskGeometry(
  maskLayer: Layer,
  fillColor: string,
  compStyle?: React.CSSProperties
): React.ReactNode {
  const x =
    (compStyle?.left !== undefined
      ? parseFloat(String(compStyle.left))
      : maskLayer.style.x) || 0;
  const y =
    (compStyle?.top !== undefined
      ? parseFloat(String(compStyle.top))
      : maskLayer.style.y) || 0;
  const w =
    (compStyle?.width !== undefined
      ? parseFloat(String(compStyle.width))
      : typeof maskLayer.style.width === "number"
      ? maskLayer.style.width
      : 200) || 200;
  const h =
    (compStyle?.height !== undefined
      ? parseFloat(String(compStyle.height))
      : typeof maskLayer.style.height === "number"
      ? maskLayer.style.height
      : 200) || 200;
  const rotation = maskLayer.style.rotation || 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const transform = rotation ? `rotate(${rotation}, ${cx}, ${cy})` : undefined;

  let content: React.ReactNode = null;

  if (maskLayer.type === "shape") {
    const shapeType = maskLayer.shapeType;
    if (shapeType === "circle" || shapeType === "ellipse") {
      content = <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={fillColor} />;
    } else if (shapeType === "star") {
      content = (
        <polygon
          points={generateStarPoints(maskLayer.points || 5, maskLayer.innerRadiusRatio || 0.382)}
          transform={`translate(${x}, ${y}) scale(${w / 100}, ${h / 100})`}
          fill={fillColor}
        />
      );
    } else if (shapeType === "triangle" || shapeType === "polygon") {
      content = (
        <polygon
          points={generatePolygonPoints(maskLayer.sides || (shapeType === "triangle" ? 3 : 5))}
          transform={`translate(${x}, ${y}) scale(${w / 100}, ${h / 100})`}
          fill={fillColor}
        />
      );
    } else if (shapeType === "path" && (maskLayer as any).pathData) {
      content = (
        <path
          d={(maskLayer as any).pathData}
          transform={`translate(${x}, ${y}) scale(${w / 100}, ${h / 100})`}
          fill={fillColor}
        />
      );
    } else {
      const rx = typeof maskLayer.style.borderRadius === "number" ? maskLayer.style.borderRadius : 0;
      content = <rect x={x} y={y} width={w} height={h} rx={rx} ry={rx} fill={fillColor} />;
    }
  } else if (maskLayer.type === "text" || maskLayer.type === "chunk") {
    const fontSize = (maskLayer.style.fontSize as number) || 48;
    const fontFamily = maskLayer.style.fontFamily || "Inter, -apple-system, sans-serif";
    const fontWeight = maskLayer.style.fontWeight || "bold";
    const textContent = (maskLayer as any).content || "";
    content = (
      <text
        x={x}
        y={y + fontSize * 0.85}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        fill={fillColor}
      >
        {textContent}
      </text>
    );
  } else if (maskLayer.type === "line") {
    const strokeWidth =
      typeof maskLayer.style.borderWidth === "number" ? maskLayer.style.borderWidth : 8;
    content = (
      <line
        x1={x}
        y1={y}
        x2={x + w}
        y2={y + h}
        stroke={fillColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  } else if (maskLayer.type === "image") {
    const src = (maskLayer as any).src || (maskLayer as any).url;
    if (src) {
      content = (
        <image
          href={src}
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
        />
      );
    }
  } else {
    const rx = typeof maskLayer.style.borderRadius === "number" ? maskLayer.style.borderRadius : 0;
    content = <rect x={x} y={y} width={w} height={h} rx={rx} ry={rx} fill={fillColor} />;
  }

  return transform ? <g transform={transform}>{content}</g> : content;
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

  const isCompound = Boolean(layer.isCompound);
  const effectiveStyle = isCompound
    ? {
        ...layer.style,
        backgroundColor: "transparent",
        borderWidth: 0,
        borderColor: "transparent",
        boxShadow: undefined,
      }
    : layer.style;
  const baseCss = layerStyleToCss(effectiveStyle, isChildInFlex);

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

  const isMaskGroup = Boolean(layer.isMaskGroup) && Boolean(layer.children && layer.children.length > 0);
  const maskChild = isMaskGroup
    ? layer.children.find((c) => c.isMask) || layer.children[0]
    : null;
  const contentChildren = isMaskGroup && maskChild
    ? layer.children.filter((c) => c.id !== maskChild.id)
    : layer.children;

  const maskStyle = isMaskGroup && maskChild
    ? computedLayerStyles[maskChild.id]
    : undefined;
  const maskX = maskStyle?.left !== undefined ? parseFloat(String(maskStyle.left)) : (maskChild?.style.x || 0);
  const maskY = maskStyle?.top !== undefined ? parseFloat(String(maskStyle.top)) : (maskChild?.style.y || 0);
  const maskW = maskStyle?.width !== undefined ? parseFloat(String(maskStyle.width)) : (maskChild?.style.width || 200);
  const maskH = maskStyle?.height !== undefined ? parseFloat(String(maskStyle.height)) : (maskChild?.style.height || 200);

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
      {isMaskGroup && maskChild ? (
        <>
          <svg
            className="absolute pointer-events-none"
            style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
            aria-hidden="true"
          >
            <defs>
              <mask
                id={`mask-${layer.id}`}
                maskUnits="userSpaceOnUse"
                x="-10000"
                y="-10000"
                width="20000"
                height="20000"
              >
                {layer.invertMask ? (
                  <>
                    <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
                    {renderMaskGeometry(maskChild, "black", computedLayerStyles[maskChild.id])}
                  </>
                ) : (
                  renderMaskGeometry(maskChild, "white", computedLayerStyles[maskChild.id])
                )}
              </mask>
            </defs>
          </svg>

          {/* Masked Content Container */}
          <div
            className="w-full h-full relative"
            style={{
              maskImage: `url(#mask-${layer.id})`,
              WebkitMaskImage: `url(#mask-${layer.id})`,
            }}
          >
            {contentChildren.map((child: Layer) => {
              const anim = child.animation?.in;
              const isNotYetEntered =
                isMotionMode(uiMode) &&
                layer.autoFit &&
                anim &&
                currentTime < anim.start;
              if (isNotYetEntered) return null;
              return renderChild ? renderChild(child, isChildrenInFlex) : null;
            })}
          </div>

          {/* Mask Stencil Hit & Selection Overlay on Canvas */}
          <div
            id={`layer-${maskChild.id}`}
            style={{
              position: "absolute",
              left: `${maskX}px`,
              top: `${maskY}px`,
              width: `${maskW}px`,
              height: `${maskH}px`,
              transform: maskStyle?.transform,
              pointerEvents: "auto",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLayer(maskChild.id, e);
            }}
            className={cn(
              "cursor-pointer select-none",
              selectedLayerIds.includes(maskChild.id)
                ? "ring-1 ring-purple-500/80 ring-offset-1 border border-dashed border-purple-400/60"
                : "hover:outline hover:outline-1 hover:outline-purple-400/30"
            )}
          />
        </>
      ) : isEmpty ? (
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
