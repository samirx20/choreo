import React from "react";
import {
  Sparkles,
  Repeat,
  ArrowUpRight,
  Plus,
  Trash2,
  Copy,
  ArrowRight,
} from "lucide-react";
import { Layer, AnimationClip, getLayerClips } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { LayerHeaderCard } from "@/components/inspector/design/LayerHeaderCard";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildSidebarCardMenu } from "@/components/contextmenu/contextMenuBuilders";

interface LayerAnimationsViewProps {
  selectedLayer: Layer;
}

export const LayerAnimationsView: React.FC<LayerAnimationsViewProps> = ({
  selectedLayer,
}) => {
  const {
    setSelectedClips,
    removeAnimationClip,
    openAnimationCatalog,
  } = useProjectStore();

  const getClipTypeBadge = (type: string) => {
    switch (type) {
      case "in":
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            In
          </span>
        );
      case "out":
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            Out
          </span>
        );
      case "action":
      case "emphasis":
      default:
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Repeat className="w-3 h-3 text-amber-600" />
            Action
          </span>
        );
    }
  };

  const clips: AnimationClip[] = getLayerClips(selectedLayer);

  return (
    <div className="p-4 space-y-4 text-foreground relative select-none">
      <LayerHeaderCard selectedLayer={selectedLayer} selectedLayers={[selectedLayer]} />

      {/* Primary 'New Animation' Button */}
      <button
        type="button"
        onClick={() => openAnimationCatalog(null)}
        className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>New Animation</span>
      </button>

      {/* Applied Animations List */}
      {clips.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Active Animations ({clips.length})</span>
          </div>

          <div className="space-y-1.5">
            {clips.map((clip) => (
              <div
                key={clip.id}
                onClick={() => setSelectedClips([clip.id])}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedClips([clip.id]);
                  const store = useProjectStore.getState();
                  const menuItems = buildSidebarCardMenu({ layerId: selectedLayer.id, clip, store });
                  useContextMenuStore.getState().openContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    zone: "sidebar-card",
                    items: menuItems,
                  });
                }}
                className="bg-card hover:bg-muted/60 border border-border hover:border-primary/40 rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getClipTypeBadge(clip.type)}
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary truncate capitalize">
                    {clip.name || clip.preset}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {clip.duration}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnimationClip(selectedLayer.id, clip.id);
                    }}
                    className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                    title="Delete animation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
