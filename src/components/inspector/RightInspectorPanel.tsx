import React from "react";
import { useProjectStore, findLayerInTree, isMotionMode } from "@/store/useProjectStore";
import { DesignInspector } from "./DesignInspector";
import { AnimateInspector } from "./AnimateInspector";
import { AnimationCatalogSheet } from "./motion/AnimationCatalogSheet";
import { Layer, getLayerClips } from "@/types/scene";

export const RightInspectorPanel: React.FC = () => {
  const {
    uiMode,
    animationCatalogState,
    closeAnimationCatalog,
    applyAnimationPreset,
    document: doc,
    activeScreenId,
    selectedLayerIds,
    selectedClipIds,
  } = useProjectStore();

  const isDesign = !isMotionMode(uiMode);
  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // Helper to find target layer recursively
  const findLayerWithClip = (layers: Layer[], clipId: string): Layer | null => {
    for (const l of layers) {
      if (getLayerClips(l).some((c) => c.id === clipId)) return l;
      if (l.type === "group" && (l as any).children) {
        const found = findLayerWithClip((l as any).children, clipId);
        if (found) return found;
      }
    }
    return null;
  };

  let targetLayer: Layer | null = null;
  if (animationCatalogState.selectedClipId) {
    targetLayer = findLayerWithClip(activeScreen.layers, animationCatalogState.selectedClipId);
  } else if (selectedClipIds && selectedClipIds.length > 0) {
    targetLayer = findLayerWithClip(activeScreen.layers, selectedClipIds[0]);
  } else if (selectedLayerIds && selectedLayerIds.length > 0) {
    targetLayer = findLayerInTree(activeScreen.layers, selectedLayerIds[0]);
  }

  const handleApplyPreset = (preset: any) => {
    if (!targetLayer) return;
    applyAnimationPreset(targetLayer.id, animationCatalogState.selectedClipId, preset);
  };

  return (
    <aside
      id="right-inspector-panel"
      className="w-[280px] h-full bg-card border-l border-border flex flex-col z-20 select-none shrink-0 text-card-foreground overflow-hidden relative"
    >
      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isDesign ? <DesignInspector /> : <AnimateInspector />}
      </div>

      {/* Jitter Animation Catalog Sheet Overlay (spans exact width and height of the right sidebar!) */}
      {animationCatalogState.isOpen && (
        <AnimationCatalogSheet
          isOpen={animationCatalogState.isOpen}
          onClose={closeAnimationCatalog}
          targetLayer={targetLayer}
          selectedClipId={animationCatalogState.selectedClipId}
          onApplyPreset={handleApplyPreset}
        />
      )}
    </aside>
  );
};

