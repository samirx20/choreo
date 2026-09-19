import React from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { ShotDynamicsCard } from "./ShotDynamicsCard";
import { MotionStackCard } from "./MotionStackCard";
import { ClipParameterInspector } from "./ClipParameterInspector";
import { MultiLayerCascadeCard } from "./MultiLayerCascadeCard";

export const MotionInspector: React.FC = () => {
  const selectedLayerIds = useProjectStore((s) => s.selectedLayerIds);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);

  // State A: Global Shot Dynamics (No element selected)
  if (!selectedLayerIds || selectedLayerIds.length === 0) {
    return (
      <div className="w-80 h-full border-l border-border bg-card text-card-foreground overflow-y-auto overflow-x-hidden">
        <ShotDynamicsCard />
      </div>
    );
  }

  // State D: Multi-Layer Cascade Studio (Multiple elements selected)
  if (selectedLayerIds.length > 1) {
    return (
      <div className="w-80 h-full border-l border-border bg-card text-card-foreground overflow-y-auto overflow-x-hidden">
        <MultiLayerCascadeCard layerIds={selectedLayerIds} />
      </div>
    );
  }

  // Single element selected
  const activeLayerId = selectedLayerIds[0];

  // State C: Focused Clip Parameter Inspector
  if (selectedClipIds && selectedClipIds.length === 1) {
    return (
      <div className="w-80 h-full border-l border-border bg-card text-card-foreground overflow-y-auto overflow-x-hidden">
        <ClipParameterInspector layerId={activeLayerId} clipId={selectedClipIds[0]} />
      </div>
    );
  }

  // State B: Layer Motion Lifecycle Stack (Entrance, Actions, Exit)
  return (
    <div className="w-80 h-full border-l border-border bg-card text-card-foreground overflow-y-auto overflow-x-hidden">
      <MotionStackCard layerId={activeLayerId} />
    </div>
  );
};

export default MotionInspector;
