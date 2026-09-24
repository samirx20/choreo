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

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const DesignInspector: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    updateLayer,
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

  const isLocked = Boolean(selectedLayer.locked);

  return (
    <div className="p-4 space-y-4 text-foreground text-xs select-none">
      <LayerHeaderCard selectedLayer={selectedLayer} selectedLayers={selectedLayers} />

      {isLocked && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">Element is locked</span>
          </div>
          <button
            onClick={() => {
              if (selectedLayers.length > 1) {
                selectedLayers.forEach((l) => updateLayer(l.id, { locked: false }));
              } else {
                updateLayer(selectedLayer.id, { locked: false });
              }
            }}
            className="text-[11px] font-semibold underline hover:no-underline cursor-pointer"
          >
            Unlock
          </button>
        </div>
      )}

      <div className={cn("space-y-4", isLocked && "opacity-50 pointer-events-none")}>
        <AlignmentBar />
        <TransformCard selectedLayer={selectedLayer} />
        <SpecializedLayerCard selectedLayer={selectedLayer} />
        {isText && <TypographyCard selectedLayer={selectedLayer} />}
        <AppearanceCard selectedLayer={selectedLayer} />
      </div>
    </div>
  );
};
