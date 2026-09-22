import { useState, useEffect } from "react";
import { Document, Screen } from "@/types/scene";

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useSelectionBounds(
  selectedLayerIds: string[],
  activeScreen: Screen,
  effectiveScale: number,
  doc: Document
): SelectionBounds | null {
  const [selectedBounds, setSelectedBounds] = useState<SelectionBounds | null>(null);

  useEffect(() => {
    if (selectedLayerIds.length === 0) {
      setSelectedBounds(null);
      return;
    }

    const measure = () => {
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (!screenEl) return;
      const screenRect = screenEl.getBoundingClientRect();
      const domScale =
        screenRect.width > 0
          ? screenRect.width / doc.settings.width
          : effectiveScale;

      // Multi-layer selection bounding box (AABB enclosing all selected layers)
      if (selectedLayerIds.length > 1) {
        let minLeft = Infinity;
        let minTop = Infinity;
        let maxRight = -Infinity;
        let maxBottom = -Infinity;
        let foundAny = false;

        for (const id of selectedLayerIds) {
          const el = document.getElementById(`layer-${id}`);
          if (el) {
            foundAny = true;
            const r = el.getBoundingClientRect();
            if (r.left < minLeft) minLeft = r.left;
            if (r.top < minTop) minTop = r.top;
            if (r.right > maxRight) maxRight = r.right;
            if (r.bottom > maxBottom) maxBottom = r.bottom;
          }
        }

        if (foundAny) {
          setSelectedBounds({
            x: (minLeft - screenRect.left) / domScale,
            y: (minTop - screenRect.top) / domScale,
            width: (maxRight - minLeft) / domScale,
            height: (maxBottom - minTop) / domScale,
          });
        } else {
          setSelectedBounds(null);
        }
      } else {
        setSelectedBounds(null);
      }
    };

    measure();
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [selectedLayerIds, activeScreen.id, effectiveScale, doc]);

  return selectedBounds;
}
