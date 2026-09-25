import React from "react";
import { LineLayer, ShapeLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface LineRendererProps {
  layer: LineLayer | (ShapeLayer & { shapeType: "line" | "arrow" });
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const LineRenderer: React.FC<LineRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(
    {
      pivotX: layer.style.pivotX ?? 0,
      pivotY: layer.style.pivotY ?? 0.5,
      ...layer.style,
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    isChildInFlex
  );

  const combinedStyle = { ...baseCss, ...computedStyle };

  // Convert rectangular CSS box-shadow to SVG line contour drop-shadow
  if (combinedStyle.boxShadow) {
    const rawBs = combinedStyle.boxShadow as string;
    delete combinedStyle.boxShadow;
    const match = rawBs.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px(?:\s+[-\d.]+px)?\s+(.+)/);
    if (match) {
      const [, dx, dy, blur, col] = match;
      const dropShadowFilter = `drop-shadow(${dx}px ${dy}px ${blur}px ${col})`;
      combinedStyle.filter = combinedStyle.filter
        ? `${combinedStyle.filter} ${dropShadowFilter}`
        : dropShadowFilter;
    }
  }

  const rawBorderColor = (computedStyle?.borderColor as string) || layer.style.borderColor;
  const rawBgColor = (computedStyle?.backgroundColor as string) || layer.style.backgroundColor;
  const strokeColor =
    (rawBorderColor && rawBorderColor !== "transparent" ? rawBorderColor : undefined) ||
    (rawBgColor && rawBgColor !== "transparent" ? rawBgColor : undefined) ||
    (layer as LineLayer).strokeColor ||
    (computedStyle?.color as string) ||
    "#3b82f6";

  const strokeWidth =
    typeof computedStyle?.borderWidth === "number" && (computedStyle.borderWidth as number) > 0
      ? (computedStyle.borderWidth as number)
      : typeof layer.style.borderWidth === "number" && (layer.style.borderWidth as number) > 0
      ? layer.style.borderWidth
      : (layer as LineLayer).strokeWidth || 3;

  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 200;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 20;

  const isArrowLayer =
    layer.type === "shape" ? layer.shapeType === "arrow" : false;

  const arrowStart =
    (layer as LineLayer).arrowStart ??
    (isArrowLayer && (layer as ShapeLayer).arrowStart ? "arrow" : "none");
  const arrowEnd =
    (layer as LineLayer).arrowEnd ??
    (isArrowLayer && (layer as ShapeLayer).arrowEnd !== false ? "arrow" : "none");

  const dashArray =
    (layer as LineLayer).strokeDashArray?.join(" ") ||
    (layer as ShapeLayer).strokeDashArray?.join(" ");

  // Marker padding so heads don't get clipped
  const markerPadStart = arrowStart === "arrow" ? strokeWidth * 2 : 0;
  const markerPadEnd = arrowEnd === "arrow" ? strokeWidth * 2 : 0;

  const x1 = (layer as LineLayer).x1 ?? markerPadStart;
  const y1 = (layer as LineLayer).y1 ?? heightNum / 2;
  const x2 = (layer as LineLayer).x2 ?? Math.max(0, widthNum - markerPadEnd);
  const y2 = (layer as LineLayer).y2 ?? heightNum / 2;

  // Trim Path calculations
  const lineLength = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) || widthNum));
  const tStart = (((computedStyle as any)?.trimStart ?? (layer as any).trimStart ?? 0)) / 100;
  const tEnd = (((computedStyle as any)?.trimEnd ?? (layer as any).trimEnd ?? 100)) / 100;
  const tOffset = (((computedStyle as any)?.trimOffset ?? (layer as any).trimOffset ?? 0)) / 100;
  const hasTrim =
    tStart > 0 ||
    tEnd < 1 ||
    tOffset > 0 ||
    ((layer as any).trimStart !== undefined && (layer as any).trimStart > 0) ||
    ((layer as any).trimEnd !== undefined && (layer as any).trimEnd < 100) ||
    (layer as any).trimOffset !== undefined ||
    (computedStyle as any)?.trimEnd !== undefined ||
    (computedStyle as any)?.trimStart !== undefined;

  let effectiveDashArray = dashArray;
  let effectiveDashOffset: number | undefined = undefined;

  if (hasTrim) {
    const visibleLength = Math.max(0, (tEnd - tStart) * lineLength);
    effectiveDashArray = `${visibleLength} ${lineLength}`;
    effectiveDashOffset = -((tStart + tOffset) * lineLength);
  }

  const strokeCap = (layer as any).strokeCap || "round";

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none relative overflow-visible",
        layer.style.tailwindClasses
      )}
    >
      <svg
        viewBox={`0 0 ${widthNum} ${heightNum}`}
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          {/* Arrowhead End Marker */}
          <marker
            id={`arrow-end-${layer.id}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 8 4, 0 8" fill={strokeColor} />
          </marker>

          {/* Arrowhead Start Marker */}
          <marker
            id={`arrow-start-${layer.id}`}
            markerWidth="8"
            markerHeight="8"
            refX="2"
            refY="4"
            orient="auto"
          >
            <polygon points="8 0, 0 4, 8 8" fill={strokeColor} />
          </marker>

          {/* Circle Marker */}
          <marker
            id={`circle-marker-${layer.id}`}
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <circle cx="4" cy="4" r="3" fill={strokeColor} />
          </marker>
        </defs>

        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={effectiveDashArray}
          strokeDashoffset={effectiveDashOffset}
          strokeLinecap={strokeCap}
          markerStart={
            arrowStart === "arrow"
              ? `url(#arrow-start-${layer.id})`
              : arrowStart === "circle"
              ? `url(#circle-marker-${layer.id})`
              : undefined
          }
          markerEnd={
            arrowEnd === "arrow"
              ? `url(#arrow-end-${layer.id})`
              : arrowEnd === "circle"
              ? `url(#circle-marker-${layer.id})`
              : undefined
          }
        />
      </svg>
    </div>
  );
};
