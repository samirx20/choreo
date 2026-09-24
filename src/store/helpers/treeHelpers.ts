import { Layer, GroupLayer, FrameLayer, ShapeLayer } from "@/types/scene";

/**
 * Checks whether a layer is structurally capable of acting as a parent container.
 */
export function isContainerLayer(layer: Layer): layer is Layer & { children: Layer[] } {
  return layer.type === "group" || layer.type === "frame";
}

// Helper: Recursively search and mutate a layer in a layer tree
export function mutateLayerInTree(
  layers: Layer[],
  layerId: string,
  mutator: (layer: Layer) => Layer | null
): Layer[] {
  const result: Layer[] = [];

  for (const layer of layers) {
    if (layer.id === layerId) {
      const mutated = mutator(layer);
      if (mutated !== null) {
        result.push(mutated);
      }
    } else if (Array.isArray((layer as any).children)) {
      const updatedChildren = mutateLayerInTree((layer as any).children, layerId, mutator);
      result.push({
        ...layer,
        children: updatedChildren,
      });
    } else {
      result.push(layer);
    }
  }

  return result;
}

// Helper: Find a layer by ID in a layer tree
export function findLayerInTree(layers: Layer[], layerId: string): Layer | null {
  for (const layer of layers) {
    if (layer.id === layerId) return layer;
    if (Array.isArray((layer as any).children)) {
      const found = findLayerInTree((layer as any).children, layerId);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Find parent container of a layer in tree
export function findParentGroupInTree(
  layers: Layer[],
  targetId: string
): Layer | null {
  for (const layer of layers) {
    if (Array.isArray((layer as any).children)) {
      if ((layer as any).children.some((c: Layer) => c.id === targetId)) {
        return layer;
      }
      const deeper = findParentGroupInTree((layer as any).children, targetId);
      if (deeper) return deeper;
    }
  }
  return null;
}

// Helper: Find topmost ancestor group of a layer in tree (returns null if layer is directly at root)
export function findTopmostParentGroupInTree(
  layers: Layer[],
  targetId: string
): Layer | null {
  for (const layer of layers) {
    if (Array.isArray((layer as any).children)) {
      if (layer.id === targetId) return null;
      const contains = (g: Layer): boolean => {
        return (
          Array.isArray((g as any).children) &&
          (g as any).children.some(
            (c: Layer) => c.id === targetId || contains(c)
          )
        );
      };
      if (contains(layer)) {
        return layer;
      }
    }
  }
  return null;
}

// Helper: Insert a layer relative to targetId in tree
export function insertLayerRelativeInTree(
  layers: Layer[],
  targetId: string,
  layerToInsert: Layer,
  position: "before" | "after" | "inside"
): { updated: Layer[]; inserted: boolean } {
  const targetIndex = layers.findIndex((l) => l.id === targetId);
  if (targetIndex !== -1) {
    if (position === "inside") {
      const target = layers[targetIndex];
      if (isContainerLayer(target)) {
        const existingChildren = (target as any).children || [];
        const nextTarget: Layer = {
          ...target,
          children: [...existingChildren, layerToInsert],
        };
        const nextLayers = [...layers];
        nextLayers[targetIndex] = nextTarget;
        return { updated: nextLayers, inserted: true };
      }
    } else {
      const nextLayers = [...layers];
      const insertAt = position === "before" ? targetIndex : targetIndex + 1;
      nextLayers.splice(insertAt, 0, layerToInsert);
      return { updated: nextLayers, inserted: true };
    }
  }

  let inserted = false;
  const updated = layers.map((layer) => {
    if (inserted || !Array.isArray((layer as any).children)) return layer;
    const res = insertLayerRelativeInTree(
      (layer as any).children,
      targetId,
      layerToInsert,
      position
    );
    if (res.inserted) {
      inserted = true;
      return { ...layer, children: res.updated };
    }
    return layer;
  });

  return { updated, inserted };
}

// Helper: Flatten all layers into a single array
export function flattenLayers(layers: Layer[]): Layer[] {
  const flat: Layer[] = [];
  for (const layer of layers) {
    flat.push(layer);
    if (Array.isArray((layer as any).children)) {
      flat.push(...flattenLayers((layer as any).children));
    }
  }
  return flat;
}

// Helper: Check if layer intersects or is placed on the artboard [0, 0, width, height]
export function isLayerOnArtboard(
  layer: Layer,
  screenWidth: number,
  screenHeight: number
): boolean {
  const lx = layer.style.x ?? 0;
  const ly = layer.style.y ?? 0;
  const lw = typeof layer.style.width === "number" ? layer.style.width : 100;
  const lh = typeof layer.style.height === "number" ? layer.style.height : 100;

  // Layer intersects artboard rectangle [0, 0, screenWidth, screenHeight]
  return (
    lx < screenWidth &&
    lx + lw > 0 &&
    ly < screenHeight &&
    ly + lh > 0
  );
}
