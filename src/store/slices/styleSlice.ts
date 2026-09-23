import { ProjectStoreState } from "../types";
import { SceneDocument, Layer } from "@/types/scene";
import { findLayerInTree, mutateLayerInTree } from "../helpers/treeHelpers";
import { commitDoc } from "../historyManager";

export type StyleSlice = Pick<
  ProjectStoreState,
  | "updateLayerStyle"
  | "alignSelectedLayers"
  | "distributeSpacing"
  | "tidyUpSelection"
>;

export const createStyleSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): StyleSlice => ({
  updateLayerStyle: (layerId, styleUpdates) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, (layer) => {
            const nextStyle = { ...layer.style, ...styleUpdates };
            if (
              layer.isCompound &&
              (layer.type === "group" || layer.type === "frame") &&
              Array.isArray((layer as any).children)
            ) {
              const compoundType = (layer as any).compoundType;
              const nextChildren = (layer as any).children.map((child: Layer) => {
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

              return {
                ...layer,
                style: nextStyle,
                children: nextChildren,
              } as Layer;
            }

            return {
              ...layer,
              style: nextStyle,
            } as Layer;
          }),
        };
      }),
    };
    commitDoc(set, nextDoc);
  },

  alignSelectedLayers: (alignment, relativeTo) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    if (selectedLayerIds.length === 0) return;
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    if (layers.length === 0) return;

    const alignMode = relativeTo || (layers.length === 1 ? "canvas" : "selection");

    let refLeft = 0;
    let refRight = doc.settings.width;
    let refTop = 0;
    let refBottom = doc.settings.height;
    let refCenterX = doc.settings.width / 2;
    let refCenterY = doc.settings.height / 2;

    if (alignMode === "selection") {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const l of layers) {
        const lx = l.style.x ?? 0;
        const ly = l.style.y ?? 0;
        const lw = typeof l.style.width === "number" ? l.style.width : 100;
        const lh = typeof l.style.height === "number" ? l.style.height : 50;
        minX = Math.min(minX, lx);
        maxX = Math.max(maxX, lx + lw);
        minY = Math.min(minY, ly);
        maxY = Math.max(maxY, ly + lh);
      }

      refLeft = minX;
      refRight = maxX;
      refTop = minY;
      refBottom = maxY;
      refCenterX = (minX + maxX) / 2;
      refCenterY = (minY + maxY) / 2;
    }

    let mutatedLayers = activeScreen.layers;

    for (const l of layers) {
      const lw = typeof l.style.width === "number" ? l.style.width : 100;
      const lh = typeof l.style.height === "number" ? l.style.height : 50;
      let newX = l.style.x ?? 0;
      let newY = l.style.y ?? 0;

      switch (alignment) {
        case "left":
          newX = refLeft;
          break;
        case "center":
          newX = Math.round(refCenterX - lw / 2);
          break;
        case "right":
          newX = refRight - lw;
          break;
        case "top":
          newY = refTop;
          break;
        case "middle":
          newY = Math.round(refCenterY - lh / 2);
          break;
        case "bottom":
          newY = refBottom - lh;
          break;
      }

      mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
        ...layer,
        style: {
          ...layer.style,
          x: newX,
          y: newY,
        },
      }));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s
      ),
    };

    commitDoc(set, nextDoc);
  },

  distributeSpacing: (direction) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    if (selectedLayerIds.length < 3) return;
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    if (layers.length < 3) return;

    let mutatedLayers = activeScreen.layers;

    if (direction === "horizontal") {
      const sorted = [...layers].sort((a, b) => (a.style.x ?? 0) - (b.style.x ?? 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const firstLeft = first.style.x ?? 0;
      const lastLeft = last.style.x ?? 0;
      const lastWidth = typeof last.style.width === "number" ? last.style.width : 100;
      const totalSpan = lastLeft + lastWidth - firstLeft;

      let totalElementsWidth = 0;
      for (const l of sorted) {
        totalElementsWidth += typeof l.style.width === "number" ? l.style.width : 100;
      }

      const totalGap = totalSpan - totalElementsWidth;
      const gapCount = sorted.length - 1;

      if (totalGap >= 0 && gapCount > 0) {
        const gap = totalGap / gapCount;
        let curX = firstLeft;
        for (let i = 0; i < sorted.length; i++) {
          const l = sorted[i];
          const lw = typeof l.style.width === "number" ? l.style.width : 100;
          if (i > 0 && i < sorted.length - 1) {
            mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
              ...layer,
              style: { ...layer.style, x: Math.round(curX) },
            }));
          }
          curX += lw + gap;
        }
      } else {
        const firstCenter =
          firstLeft + (typeof first.style.width === "number" ? first.style.width : 100) / 2;
        const lastCenter = lastLeft + lastWidth / 2;
        const step = (lastCenter - firstCenter) / (sorted.length - 1);

        for (let i = 1; i < sorted.length - 1; i++) {
          const l = sorted[i];
          const lw = typeof l.style.width === "number" ? l.style.width : 100;
          const targetCenter = firstCenter + step * i;
          mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
            ...layer,
            style: { ...layer.style, x: Math.round(targetCenter - lw / 2) },
          }));
        }
      }
    } else {
      const sorted = [...layers].sort((a, b) => (a.style.y ?? 0) - (b.style.y ?? 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const firstTop = first.style.y ?? 0;
      const lastTop = last.style.y ?? 0;
      const lastHeight = typeof last.style.height === "number" ? last.style.height : 50;
      const totalSpan = lastTop + lastHeight - firstTop;

      let totalElementsHeight = 0;
      for (const l of sorted) {
        totalElementsHeight += typeof l.style.height === "number" ? l.style.height : 50;
      }

      const totalGap = totalSpan - totalElementsHeight;
      const gapCount = sorted.length - 1;

      if (totalGap >= 0 && gapCount > 0) {
        const gap = totalGap / gapCount;
        let curY = firstTop;
        for (let i = 0; i < sorted.length; i++) {
          const l = sorted[i];
          const lh = typeof l.style.height === "number" ? l.style.height : 50;
          if (i > 0 && i < sorted.length - 1) {
            mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
              ...layer,
              style: { ...layer.style, y: Math.round(curY) },
            }));
          }
          curY += lh + gap;
        }
      } else {
        const firstCenter =
          firstTop + (typeof first.style.height === "number" ? first.style.height : 50) / 2;
        const lastCenter = lastTop + lastHeight / 2;
        const step = (lastCenter - firstCenter) / (sorted.length - 1);

        for (let i = 1; i < sorted.length - 1; i++) {
          const l = sorted[i];
          const lh = typeof l.style.height === "number" ? l.style.height : 50;
          const targetCenter = firstCenter + step * i;
          mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
            ...layer,
            style: { ...layer.style, y: Math.round(targetCenter - lh / 2) },
          }));
        }
      }
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s
      ),
    };

    commitDoc(set, nextDoc);
  },

  tidyUpSelection: () => {
    const { activeScreenId, selectedLayerIds, distributeSpacing, alignSelectedLayers } = get();
    if (selectedLayerIds.length < 2) return;
    const activeScreen = get().document.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const l of layers) {
      const lx = l.style.x ?? 0;
      const ly = l.style.y ?? 0;
      const lw = typeof l.style.width === "number" ? l.style.width : 100;
      const lh = typeof l.style.height === "number" ? l.style.height : 50;
      minX = Math.min(minX, lx);
      maxX = Math.max(maxX, lx + lw);
      minY = Math.min(minY, ly);
      maxY = Math.max(maxY, ly + lh);
    }

    const spanX = maxX - minX;
    const spanY = maxY - minY;

    if (spanX >= spanY) {
      distributeSpacing("horizontal");
      alignSelectedLayers("middle", "selection");
    } else {
      distributeSpacing("vertical");
      alignSelectedLayers("center", "selection");
    }
  },
});
