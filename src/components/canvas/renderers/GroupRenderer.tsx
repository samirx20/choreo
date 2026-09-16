import React from "react";
import { GroupLayer, Layer } from "@/types/scene";
import { layerStyleToCss } from "./styleUtils";
import { LayerRenderer } from "./LayerRenderer";
import { cn } from "@/lib/utils";

interface GroupRendererProps {
  layer: GroupLayer;
  selectedLayerIds: string[];
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
}

export const GroupRenderer: React.FC<GroupRendererProps> = ({
  layer,
  selectedLayerIds,
  isChildInFlex = false,
  computedStyle,
  computedLayerStyles = {},
  onSelectLayer,
}) => {
  const isSelected = selectedLayerIds.includes(layer.id);
  const baseCss = layerStyleToCss(layer.style, isChildInFlex);

  // Apply layout settings
  const layout = layer.layout || {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    align: "center",
    justifyContent: "center",
  };

  const layoutCss: React.CSSProperties = {
    display: layout.display || "flex",
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
      layout.justify === "start"
        ? "flex-start"
        : layout.justify === "end"
        ? "flex-end"
        : layout.justify === "space-between"
        ? "space-between"
        : layout.justify === "space-around"
        ? "space-around"
        : "center",
  };

  // If autoFit is enabled, height or width can adapt to content
  if (layer.autoFit) {
    if (layout.flexDirection === "column") {
      layoutCss.height = "fit-content";
    } else {
      layoutCss.width = "fit-content";
    }
  }

  const combinedStyle: React.CSSProperties = {
    ...baseCss,
    ...layoutCss,
    ...computedStyle,
  };

  const isChildrenInFlex = layout.display === "flex";

  return (
    <div
      id={`layer-${layer.id}`}
      style={combinedStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelectLayer(layer.id, e);
      }}
      className={cn(
        "cursor-pointer select-none transition-all box-border",
        isSelected &&
          "ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent",
        layer.style.tailwindClasses
      )}
    >
      {layer.children.map((child: Layer) => (
        <LayerRenderer
          key={child.id}
          layer={child}
          selectedLayerIds={selectedLayerIds}
          isChildInFlex={isChildrenInFlex}
          computedStyle={computedLayerStyles[child.id]}
          computedLayerStyles={computedLayerStyles}
          onSelectLayer={onSelectLayer}
        />
      ))}
    </div>
  );
};
