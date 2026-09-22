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
      ...layer.style,
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    isChildInFlex
  );

  const combinedStyle = { ...baseCss, ...computedStyle };
  const strokeColor =
    (layer as LineLayer).strokeColor ||
    layer.style.borderColor ||
    layer.style.backgroundColor ||
    "#3b82f6";
  const strokeWidth =
    (layer as LineLayer).strokeWidth ||
    layer.style.borderWidth ||
    2;

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
          strokeDasharray={dashArray}
          strokeLinecap="round"
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
