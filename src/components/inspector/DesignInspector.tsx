import React from "react";
import { Layer } from "@/types/scene";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { SceneSettingsCard } from "./design/SceneSettingsCard";
import { LayerHeaderCard } from "./design/LayerHeaderCard";
import { AlignmentBar } from "./design/AlignmentBar";
import { TransformCard } from "./design/TransformCard";
import { TypographyCard } from "./design/TypographyCard";
import { AppearanceCard } from "./design/AppearanceCard";
import { SpecializedLayerCard } from "./design/SpecializedLayerCard";

export const DesignInspector: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const selectedLayers = selectedLayerIds
    .map((id) => findLayerInTree(activeScreen.layers, id))
    .filter((l): l is Layer => l !== null);

  const selectedLayer = selectedLayers[0] || null;

  // 1. SCENE SELECTED
  if (!selectedLayer) {
    return <SceneSettingsCard />;
  }

  // 2. ELEMENT SELECTED
  const isText =
    selectedLayer.type === "text" ||
    selectedLayer.type === "chunk" ||
    selectedLayer.type === "counter";

  return (
    <div className="p-4 space-y-4 text-foreground text-xs select-none">
      <LayerHeaderCard selectedLayer={selectedLayer} selectedLayers={selectedLayers} />
      <AlignmentBar />
      <TransformCard selectedLayer={selectedLayer} />
      <SpecializedLayerCard selectedLayer={selectedLayer} />
      {isText && <TypographyCard selectedLayer={selectedLayer} />}
      <AppearanceCard selectedLayer={selectedLayer} />
    </div>
  );
};
