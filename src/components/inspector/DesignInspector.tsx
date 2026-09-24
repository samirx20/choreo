import React from "react";
import { Layer } from "@/types/scene";
import { useProjectStore, findLayerInTree, findParentGroupInTree } from "@/store/useProjectStore";
import { SceneSettingsCard } from "./design/SceneSettingsCard";
import { LayerHeaderCard } from "./design/LayerHeaderCard";
import { AlignmentBar } from "./design/AlignmentBar";
import { TransformCard } from "./design/TransformCard";
import { TypographyCard } from "./design/TypographyCard";
import { AppearanceCard } from "./design/AppearanceCard";
import { SpecializedLayerCard } from "./design/SpecializedLayerCard";
import { MultiSelectionCard } from "./design/MultiSelectionCard";

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

  // Check locking state across selected layers
  const isMultiple = selectedLayers.length > 1;
  const parentGroup = activeScreen ? findParentGroupInTree(activeScreen.layers, selectedLayer.id) : null;
  const isDirectlyLocked = isMultiple
    ? selectedLayers.some((l) => Boolean(l.locked))
    : Boolean(selectedLayer.locked);
  const isParentLocked = Boolean(parentGroup?.locked);
  const isLocked = isDirectlyLocked || isParentLocked;

  // Single-layer text check
  const isText =
    !isMultiple &&
    (selectedLayer.type === "text" ||
      selectedLayer.type === "chunk" ||
      selectedLayer.type === "counter");

  return (
    <div className="p-4 space-y-4 text-foreground text-xs select-none">
      <LayerHeaderCard selectedLayer={selectedLayer} selectedLayers={selectedLayers} />

      {isLocked && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">
              {isParentLocked && !isDirectlyLocked ? "Parent group is locked" : "Element is locked"}
            </span>
          </div>
          <button
            onClick={() => {
              if (isParentLocked && !isDirectlyLocked && parentGroup) {
                updateLayer(parentGroup.id, { locked: false });
              } else if (selectedLayers.length > 1) {
                selectedLayers.forEach((l) => updateLayer(l.id, { locked: false }));
              } else {
                updateLayer(selectedLayer.id, { locked: false });
              }
            }}
            className="text-[11px] font-semibold underline hover:no-underline cursor-pointer"
          >
            {isParentLocked && !isDirectlyLocked ? "Unlock Group" : "Unlock"}
          </button>
        </div>
      )}

      <div className={cn("space-y-4", isLocked && "opacity-50 pointer-events-none")}>
        <AlignmentBar />
        {isMultiple ? (
          <MultiSelectionCard selectedLayers={selectedLayers} />
        ) : (
          <>
            <TransformCard selectedLayer={selectedLayer} />
            <SpecializedLayerCard selectedLayer={selectedLayer} />
            {isText && <TypographyCard selectedLayer={selectedLayer} />}
            <AppearanceCard selectedLayer={selectedLayer} />
          </>
        )}
      </div>
    </div>
  );
};
