import React from "react";
import { ShapeLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { getSquirclePath } from "@/engine/squircle";
import { cn } from "@/lib/utils";

interface ShapeRendererProps {
  layer: ShapeLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export function generateStarPoints(points: number = 5, innerRatio: number = 0.382): string {
  const pts: string[] = [];
  const cx = 50, cy = 50, rOuter = 45, rInner = 45 * innerRatio;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export function generatePolygonPoints(sides: number = 3): string {
  const pts: string[] = [];
  const cx = 50, cy = 50, r = 45;
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const hasTrim =
    (layer.trimStart !== undefined && layer.trimStart > 0) ||
    (layer.trimEnd !== undefined && layer.trimEnd < 100) ||
    layer.trimOffset !== undefined ||
    (layer.strokeDashArray && layer.strokeDashArray.length > 0);

  const isSvgShape = ["star", "polygon", "triangle", "line", "arrow"].includes(layer.shapeType);
  const isSquircle = layer.shapeType === "rectangle" && Boolean(layer.style.squircleFactor && layer.style.squircleFactor > 0);
  const baseCss = layerStyleToCss({
    ...layer.style,
    backgroundColor: isSvgShape ? "transparent" : layer.style.backgroundColor,
    borderWidth: (hasTrim || isSquircle) ? 0 : layer.style.borderWidth, // Trim paths and squircles render via SVG overlay
  }, isChildInFlex);

  // If circle or ellipse, ensure border-radius 50%
  if (layer.shapeType === "circle" || layer.shapeType === "ellipse") {
    baseCss.borderRadius = "9999px";
  }

  const combinedStyle = { ...baseCss, ...computedStyle };
  const fill = layer.style.backgroundColor || "#3b82f6";
  const strokeColor = layer.style.borderColor || fill;
  const strokeWidth = layer.style.borderWidth || 2;
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 100;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 100;

  // Trim path dash calculations
  const rectPerimeter = 2 * (widthNum + heightNum);
  const tStart = (layer.trimStart ?? 0) / 100;
  const tEnd = (layer.trimEnd ?? 100) / 100;
  const tOffset = (layer.trimOffset ?? 0) / 100;
  const trimLen = Math.max(0, (tEnd - tStart) * rectPerimeter);
  const trimDashArray = layer.strokeDashArray
    ? layer.strokeDashArray.join(" ")
    : `${trimLen} ${rectPerimeter}`;
  const trimDashOffset = -((tStart + tOffset) * rectPerimeter);

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none transition-[outline] relative",
        layer.style.tailwindClasses
      )}
    >
      {/* G2 Continuous Squircle SVG Stroke Overlay */}
      {isSquircle && strokeWidth > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${widthNum} ${heightNum}`}
        >
          <path
            d={getSquirclePath(widthNum, heightNum, layer.style.borderRadius ?? 0, layer.style.squircleFactor)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={hasTrim ? trimDashArray : undefined}
            strokeDashoffset={hasTrim ? trimDashOffset : undefined}
          />
        </svg>
      )}

      {/* Vector Trim Paths SVG Stroke Overlay for Rectangles & Circles */}
      {hasTrim && !isSquircle && layer.shapeType === "rectangle" && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${widthNum} ${heightNum}`}
        >
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(0, widthNum - strokeWidth)}
            height={Math.max(0, heightNum - strokeWidth)}
            rx={typeof layer.style.borderRadius === "number" ? layer.style.borderRadius : 0}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={(layer.strokeCap as any) || "butt"}
            strokeLinejoin={(layer.strokeJoin as any) || "miter"}
            strokeDasharray={trimDashArray}
            strokeDashoffset={trimDashOffset}
          />
        </svg>
      )}

      {hasTrim && (layer.shapeType === "circle" || layer.shapeType === "ellipse") && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${widthNum} ${heightNum}`}
        >
          <ellipse
            cx={widthNum / 2}
            cy={heightNum / 2}
            rx={Math.max(0, widthNum / 2 - strokeWidth / 2)}
            ry={Math.max(0, heightNum / 2 - strokeWidth / 2)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            strokeDasharray={trimDashArray}
            strokeDashoffset={trimDashOffset}
          />
        </svg>
      )}
      {layer.shapeType === "star" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill={fill}
        >
          <polygon points={generateStarPoints(layer.points || 5, layer.innerRadiusRatio || 0.382)} />
        </svg>
      )}
      {(layer.shapeType === "triangle" || layer.shapeType === "polygon") && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill={fill}
        >
          <polygon points={generatePolygonPoints(layer.shapeType === "triangle" ? 3 : (layer.sides || 5))} />
        </svg>
      )}
      {(layer.shapeType === "line" || layer.shapeType === "arrow") && (
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <marker
              id={`arrow-head-${layer.id}`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill={strokeColor} />
            </marker>
          </defs>
          <line
            x1="0"
            y1="10"
            x2={layer.shapeType === "arrow" && layer.arrowEnd !== false ? "90" : "100"}
            y2="10"
            stroke={strokeColor}
            strokeWidth={layer.style.borderWidth || 3}
            strokeLinecap={(layer.strokeCap as any) || "round"}
            markerEnd={layer.shapeType === "arrow" && layer.arrowEnd !== false ? `url(#arrow-head-${layer.id})` : undefined}
          />
        </svg>
      )}
    </div>
  );
};
