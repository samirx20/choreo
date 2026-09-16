import React from "react";
import { Screen, ProjectSettings } from "@/types/scene";
import { LayerRenderer } from "./LayerRenderer";

interface ScreenRendererProps {
  screen: Screen;
  settings: ProjectSettings;
  selectedLayerIds: string[];
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
  onCanvasClick?: () => void;
}

export const ScreenRenderer: React.FC<ScreenRendererProps> = ({
  screen,
  settings,
  selectedLayerIds,
  computedLayerStyles = {},
  onSelectLayer,
  onCanvasClick,
}) => {
  return (
    <div
      id={`screen-${screen.id}`}
      style={{
        width: `${settings.width}px`,
        height: `${settings.height}px`,
        backgroundColor: settings.backgroundColor || "#09090b",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onCanvasClick) {
          onCanvasClick();
        }
      }}
      className="select-none"
    >
      {screen.layers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          selectedLayerIds={selectedLayerIds}
          computedStyle={computedLayerStyles[layer.id]}
          computedLayerStyles={computedLayerStyles}
          onSelectLayer={onSelectLayer}
        />
      ))}
    </div>
  );
};
