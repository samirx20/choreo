import React from "react";
import { Layer } from "@/types/scene";
import { GroupRenderer } from "./GroupRenderer";
import { FrameRenderer } from "./FrameRenderer";
import { TextRenderer } from "./TextRenderer";
import { ChunkRenderer } from "./ChunkRenderer";
import { ShapeRenderer } from "./ShapeRenderer";
import { LineRenderer } from "./LineRenderer";
import { PolygonRenderer } from "./PolygonRenderer";
import { ImageRenderer } from "./ImageRenderer";
import { VideoRenderer } from "./VideoRenderer";
import { IconRenderer } from "./IconRenderer";

interface LayerRendererProps {
  layer: Layer;
  selectedLayerIds: string[];
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
}

export const LayerRenderer: React.FC<LayerRendererProps> = ({
  layer,
  selectedLayerIds,
  isChildInFlex = false,
  computedStyle,
  computedLayerStyles = {},
  onSelectLayer,
}) => {
  if (layer.hidden) return null;

  const isSelected = selectedLayerIds.includes(layer.id);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectLayer(layer.id, e);
  };

  switch (layer.type) {
    case "group":
      return (
        <GroupRenderer
          layer={layer}
          selectedLayerIds={selectedLayerIds}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          computedLayerStyles={computedLayerStyles}
          onSelectLayer={onSelectLayer}
          renderChild={(child, childInFlex) => (
            <LayerRenderer
              key={child.id}
              layer={child}
              selectedLayerIds={selectedLayerIds}
              isChildInFlex={childInFlex}
              computedStyle={computedLayerStyles[child.id]}
              computedLayerStyles={computedLayerStyles}
              onSelectLayer={onSelectLayer}
            />
          )}
        />
      );

    case "frame":
      return (
        <FrameRenderer
          layer={layer}
          selectedLayerIds={selectedLayerIds}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          computedLayerStyles={computedLayerStyles}
          onSelectLayer={onSelectLayer}
          renderChild={(child, childInFlex) => (
            <LayerRenderer
              key={child.id}
              layer={child}
              selectedLayerIds={selectedLayerIds}
              isChildInFlex={childInFlex}
              computedStyle={computedLayerStyles[child.id]}
              computedLayerStyles={computedLayerStyles}
              onSelectLayer={onSelectLayer}
            />
          )}
        />
      );

    case "line":
      return (
        <LineRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "polygon":
      return (
        <PolygonRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "text":
      return (
        <TextRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "chunk":
      return (
        <ChunkRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "counter":
      return (
        <TextRenderer
          layer={{
            ...layer,
            type: "text",
            content: (layer as any).renderedValue || (layer as any).content || `${(layer as any).prefix || ""}${(layer as any).startValue || 0}${(layer as any).suffix || ""}`,
          }}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "shape":
      return (
        <ShapeRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "image":
      return (
        <ImageRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "video":
      return (
        <VideoRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    case "icon":
      return (
        <IconRenderer
          layer={layer}
          isSelected={isSelected}
          isChildInFlex={isChildInFlex}
          computedStyle={computedStyle}
          onClick={handleClick}
        />
      );

    default:
      return null;
  }
};
