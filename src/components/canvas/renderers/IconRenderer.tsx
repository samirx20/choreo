import React from "react";
import { icons } from "lucide-react";
import { IconLayer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { cn } from "@/lib/utils";

interface IconRendererProps {
  layer: IconLayer;
  isSelected?: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(
    {
      ...layer.style,
      backgroundColor: layer.style.backgroundColor || "transparent",
      borderWidth: 0, // Icons use SVG strokeWidth on the Lucide icon itself, not CSS box border
    },
    isChildInFlex
  );

  const strokeWidth =
    typeof layer.strokeWidth === "number"
      ? layer.strokeWidth
      : typeof layer.style.borderWidth === "number"
      ? layer.style.borderWidth
      : 2;

  const combinedStyle = { ...baseCss, ...computedStyle, borderWidth: 0 };
  const widthNum = typeof layer.style.width === "number" ? layer.style.width : 48;
  const heightNum = typeof layer.style.height === "number" ? layer.style.height : 48;
  const iconColor = (combinedStyle.color as string) || (combinedStyle.borderColor as string) || layer.style.color || layer.style.borderColor || "#ffffff";

  // Retrieve Lucide icon component by name (e.g. "Sparkles", "ArrowRight", "Zap")
  const IconComponent =
    (icons as Record<string, React.FC<any>>)[layer.iconName] ||
    icons.CircleHelp ||
    icons.Sparkles;

  return (
    <div
      data-layer-id={layer.id}
      data-layer-type="icon"
      onClick={onClick}
      style={combinedStyle}
      className={cn(
        "absolute select-none flex items-center justify-center pointer-events-auto",
        isSelected && "outline-2 outline-[#6d28d9] outline-offset-1"
      )}
    >
      {IconComponent && (
        <IconComponent
          width={widthNum}
          height={heightNum}
          size={Math.min(widthNum, heightNum)}
          color={iconColor}
          strokeWidth={strokeWidth}
          className="w-full h-full"
        />
      )}
    </div>
  );
};
