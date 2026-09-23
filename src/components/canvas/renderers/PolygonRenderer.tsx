import React from "react";
import { PolygonLayer, ShapeLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface PolygonRendererProps {
  layer: PolygonLayer | (ShapeLayer & { shapeType: "polygon" | "triangle" });
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export function generateCenteredPolygonPoints(
  sides: number,
  width: number,
  height: number,
  inset: number = 0
): string {
  const pts: string[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(0, width / 2 - inset);
  const ry = Math.max(0, height / 2 - inset);

  for (let i = 0; i < sides; i++) {
    // Point top vertex straight up (-Math.PI / 2)
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

export const PolygonRenderer: React.FC<PolygonRendererProps> = ({
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
  const rawFill = (computedStyle?.backgroundColor as string) || layer.style.backgroundColor;
  const fill = (!rawFill || rawFill === "transparent" || rawFill === "none") ? "none" : rawFill;
  const strokeColor = (computedStyle?.borderColor as string) || layer.style.borderColor || "transparent";
  const strokeWidth = typeof computedStyle?.borderWidth === "number" ? computedStyle.borderWidth : (layer.style.borderWidth || 0);

  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 100;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 100;

  const sides =
    layer.type === "polygon"
      ? (layer as PolygonLayer).sides || 3
      : layer.shapeType === "triangle"
      ? 3
      : (layer as ShapeLayer).sides || 5;

  const inset = strokeWidth > 0 ? strokeWidth / 2 : 0;
  const pointsString = generateCenteredPolygonPoints(sides, widthNum, heightNum, inset);

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
        <polygon
          points={pointsString}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
