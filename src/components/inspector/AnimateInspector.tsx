import React from "react";
import { Layer, AnimationClip, getLayerClips } from "@/types/scene";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { ClipDetailView } from "./animate/ClipDetailView";
import { LayerAnimationsView } from "./animate/LayerAnimationsView";
import { SceneAnimationsView } from "./animate/SceneAnimationsView";

export const AnimateInspector: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    selectedClipIds,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // 1. ANIMATION CLIP SELECTED (View 1)
  if (selectedClipIds && selectedClipIds.length > 0) {
    const activeClipId = selectedClipIds[0];

    const findClipAndLayer = (layers: Layer[]): { clip: AnimationClip; layer: Layer } | null => {
      if (activeScreen.background) {
        const bgClips = getLayerClips(activeScreen.background as any);
        const match = bgClips.find((c) => c.id === activeClipId);
        if (match) return { clip: match, layer: activeScreen.background as any };
      }
      for (const l of layers) {
        const clips = getLayerClips(l);
        const match = clips.find((c) => c.id === activeClipId);
        if (match) return { clip: match, layer: l };
        if (l.type === "group" && (l as any).children) {
          const found = findClipAndLayer((l as any).children);
          if (found) return found;
        }
      }
      return null;
    };

    const foundMatch = findClipAndLayer(activeScreen.layers);
    if (foundMatch) {
      return (
        <ClipDetailView
          clipLayer={foundMatch.layer}
          selectedClip={foundMatch.clip}
        />
      );
    }
  }

  // 2. ELEMENT SELECTED (View 2)
  const selectedLayers = selectedLayerIds
    .map((id) => {
      if (activeScreen.background && activeScreen.background.id === id) {
        return activeScreen.background as any as Layer;
      }
      return findLayerInTree(activeScreen.layers, id);
    })
    .filter((l): l is Layer => l !== null);

  const selectedLayer = selectedLayers[0] || null;

  if (selectedLayer) {
    return <LayerAnimationsView selectedLayer={selectedLayer} />;
  }

  // 3. NO ELEMENT SELECTED (View 3)
  return <SceneAnimationsView />;
};
