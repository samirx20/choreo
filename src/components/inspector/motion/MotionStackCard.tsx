import React, { useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { buildSidebarCardMenu } from "@/components/contextmenu/contextMenuBuilders";
import { AnimationClip, getLayerClips } from "@/types/scene";
import {
  Sparkles,
  Repeat,
  ArrowUpRight,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  Activity,
  Layers,
} from "lucide-react";
import { PresetPickerSheet } from "./PresetPickerSheet";

interface MotionStackCardProps {
  layerId: string;
}

export const MotionStackCard: React.FC<MotionStackCardProps> = ({ layerId }) => {
  const store = useProjectStore();
  const { document: doc, activeScreenId, setSelectedClips } = store;
  const screen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const layer = screen?.layers.find((l) => l.id === layerId);

  const [activePickerType, setActivePickerType] = useState<"in" | "action" | "out" | null>(null);

  if (!layer) return null;

  const clips = getLayerClips(layer);
  const inClip = clips.find((c) => c.type === "in");
  const outClip = clips.find((c) => c.type === "out");
  const actionClips = clips.filter((c) => c.type === "action" || c.type === "emphasis");

  const handleAddPreset = (type: "in" | "action" | "out", presetName: string) => {
    const playheadTime = store.currentTime;
    const clipId = store.addAnimationClip(layerId, {
      type,
      preset: presetName,
      start: playheadTime,
      duration: 0.6,
      easing: "smooth",
    });
    setActivePickerType(null);
    if (clipId) {
      setSelectedClips([clipId]);
    }
  };

  const handleCardContextMenu = (e: React.PointerEvent | React.MouseEvent, clip: AnimationClip) => {
    e.preventDefault();
    e.stopPropagation();
    useContextMenuStore.getState().openContextMenu({
      x: e.clientX,
      y: e.clientY,
      zone: "sidebar-card",
      items: buildSidebarCardMenu({ layerId, clip, store }),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-xs select-none">
      {/* Layer Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 rounded-[6px] bg-muted flex items-center justify-center text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-semibold text-foreground truncate">
              {layer.name}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {layer.type} Layer Motion
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {clips.length} {clips.length === 1 ? "anim" : "anims"}
        </span>
      </div>

      {/* Preset Picker Popover Modal if active */}
      {activePickerType && (
        <div className="p-3 bg-card rounded-[12px] border border-border shadow-md animate-in fade-in duration-100">
          <PresetPickerSheet
            type={activePickerType}
            selectedPreset=""
            onSelect={(preset) => handleAddPreset(activePickerType, preset)}
          />
          <button
            type="button"
            onClick={() => setActivePickerType(null)}
            className="w-full mt-2 py-1 text-[11px] text-muted-foreground hover:text-foreground font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 1. ENTRANCE STACK */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Entrance Animation
          </span>
        </div>

        {inClip ? (
          <div
            onClick={() => setSelectedClips([inClip.id])}
            onContextMenu={(e) => handleCardContextMenu(e, inClip)}
            className="group flex items-center justify-between p-2.5 rounded-[10px] bg-card text-card-foreground border border-border hover:bg-muted/50 hover:border-border/80 shadow-xs cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-semibold text-foreground capitalize truncate">
                  {inClip.preset}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {inClip.start.toFixed(2)}s
                  </span>
                  <span>{inClip.duration.toFixed(2)}s</span>
                  <span className="capitalize">{inClip.easing}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  store.removeAnimationClip(layerId, inClip.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                title="Delete Entrance"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePickerType("in")}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 transition-colors font-medium text-xs bg-muted/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entrance Animation
          </button>
        )}
      </div>

      {/* 2. KINETIC ACTIONS & EMPHASIS */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-amber-500" />
            Kinetic Actions & Accents
          </span>
          <button
            type="button"
            onClick={() => setActivePickerType("action")}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 font-medium"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {actionClips.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {actionClips.map((clip) => (
              <div
                key={clip.id}
                onClick={() => setSelectedClips([clip.id])}
                onContextMenu={(e) => handleCardContextMenu(e, clip)}
                className="group flex items-center justify-between p-2.5 rounded-[10px] bg-card text-card-foreground border border-border hover:bg-muted/50 hover:border-border/80 shadow-xs cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-foreground capitalize truncate">
                      {clip.preset}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {clip.start.toFixed(2)}s
                      </span>
                      <span>{clip.duration.toFixed(2)}s</span>
                      {clip.loop && (
                        <span className="text-amber-500 font-sans">Loop</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.removeAnimationClip(layerId, clip.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                    title="Delete Action"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePickerType("action")}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 transition-colors font-medium text-xs bg-muted/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Kinetic Action
          </button>
        )}
      </div>

      {/* 3. EXIT STACK */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            Exit Animation
          </span>
        </div>

        {outClip ? (
          <div
            onClick={() => setSelectedClips([outClip.id])}
            onContextMenu={(e) => handleCardContextMenu(e, outClip)}
            className="group flex items-center justify-between p-2.5 rounded-[10px] bg-card text-card-foreground border border-border hover:bg-muted/50 hover:border-border/80 shadow-xs cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-semibold text-foreground capitalize truncate">
                  {outClip.preset}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {outClip.start.toFixed(2)}s
                  </span>
                  <span>{outClip.duration.toFixed(2)}s</span>
                  <span className="capitalize">{outClip.easing}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  store.removeAnimationClip(layerId, outClip.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                title="Delete Exit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePickerType("out")}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 transition-colors font-medium text-xs bg-muted/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Exit Animation
          </button>
        )}
      </div>
    </div>
  );
};
