import React from "react";
import { ImageLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface ImageRendererProps {
  layer: ImageLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(layer.style, isChildInFlex);
  const combinedStyle = { ...baseCss, ...computedStyle };

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none overflow-hidden transition-[outline]",
        isSelected && "ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      <img
        src={layer.src}
        alt={layer.name}
        className="w-full h-full pointer-events-none"
        style={{ objectFit: layer.objectFit || "cover" }}
      />
    </div>
  );
};
