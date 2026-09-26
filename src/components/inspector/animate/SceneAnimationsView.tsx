import React from "react";
import { Layers } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { SceneHeaderCard } from "@/components/inspector/design/SceneHeaderCard";

export const SceneAnimationsView: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
  } = useProjectStore();

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  return (
    <div className="p-4 space-y-4 text-foreground select-none">
      <SceneHeaderCard activeScreen={activeScreen} icon="play" />

      <div className="p-4 text-center text-xs text-muted-foreground space-y-3">
        <Layers className="h-8 w-8 mx-auto text-muted-foreground/60" />
        <p className="font-medium text-foreground">No element selected</p>
        <p className="text-[11px] leading-relaxed">
          Select an element on the canvas or in the layers list to add animations.
        </p>
        {activeScreen.background && (
          <button
            type="button"
            onClick={() => {
              useProjectStore.getState().selectLayer(activeScreen.background!.id, false);
            }}
            className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium text-xs transition-colors cursor-pointer"
          >
            Animate Background
          </button>
        )}
      </div>
    </div>
  );
};
