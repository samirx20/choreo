import { Layer, LayerStyle } from "@/types/layers";

/**
 * Propagates parent style updates down to the semantic child layers
 * of a compound group/frame (split-shape, split-text, split-line)
 * preserving zero layout shift and optical styling.
 */
export function propagateCompoundStyleChildren(
  layer: Layer,
  styleUpdates: Partial<LayerStyle>
): Layer[] | undefined {
  if (
    !layer.isCompound ||
    (layer.type !== "group" && layer.type !== "frame") ||
    !Array.isArray((layer as any).children)
  ) {
    return undefined;
  }

  const compoundType = (layer as any).compoundType;
  return (layer as any).children.map((child: Layer) => {
    if (compoundType === "split-shape") {
      if (child.id.startsWith("fill_") || (child as any).shapeType !== "path") {
        return {
          ...child,
          style: {
            ...child.style,
            ...(styleUpdates.backgroundColor !== undefined
              ? { backgroundColor: styleUpdates.backgroundColor }
              : {}),
            ...(styleUpdates.opacity !== undefined ? { opacity: styleUpdates.opacity } : {}),
          },
        };
      }
      if ((child as any).shapeType === "path") {
        return {
          ...child,
          style: {
            ...child.style,
            ...(styleUpdates.borderWidth !== undefined
              ? { borderWidth: styleUpdates.borderWidth }
              : {}),
            ...(styleUpdates.borderColor !== undefined
              ? { borderColor: styleUpdates.borderColor }
              : {}),
            ...(styleUpdates.opacity !== undefined ? { opacity: styleUpdates.opacity } : {}),
          },
        };
      }
    } else if (compoundType === "split-text") {
      return {
        ...child,
        style: {
          ...child.style,
          ...(styleUpdates.color !== undefined ? { color: styleUpdates.color } : {}),
          ...(styleUpdates.fontSize !== undefined ? { fontSize: styleUpdates.fontSize } : {}),
          ...(styleUpdates.fontFamily !== undefined ? { fontFamily: styleUpdates.fontFamily } : {}),
          ...(styleUpdates.fontWeight !== undefined ? { fontWeight: styleUpdates.fontWeight } : {}),
          ...(styleUpdates.letterSpacing !== undefined ? { letterSpacing: styleUpdates.letterSpacing } : {}),
        },
      };
    } else if (compoundType === "split-line") {
      return {
        ...child,
        style: {
          ...child.style,
          ...(styleUpdates.borderWidth !== undefined ? { borderWidth: styleUpdates.borderWidth } : {}),
          ...(styleUpdates.borderColor !== undefined ? { borderColor: styleUpdates.borderColor } : {}),
        },
      };
    }
    return child;
  });
}
