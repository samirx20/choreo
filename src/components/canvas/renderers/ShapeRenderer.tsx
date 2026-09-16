import React from "react";
import { ShapeLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface ShapeRendererProps {
  layer: ShapeLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(layer.style, isChildInFlex);

  // If circle, ensure border-radius 50%
  if (layer.shapeType === "circle") {
    baseCss.borderRadius = "9999px";
  }

  const combinedStyle = { ...baseCss, ...computedStyle };

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none transition-[outline]",
        isSelected && "ring-1 ring-primary ring-offset-2 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {layer.shapeType === "star" && (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill={layer.style.backgroundColor || "currentColor"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )}
      {layer.shapeType === "triangle" && (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill={layer.style.backgroundColor || "currentColor"}
        >
          <polygon points="12 2 22 22 2 22" />
        </svg>
      )}
    </div>
  );
};
