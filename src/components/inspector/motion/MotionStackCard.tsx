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
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 rounded-[6px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {layer.name}
            </span>
            <span className="text-[10px] text-slate-400 capitalize">
              {layer.type} Layer Motion
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {clips.length} {clips.length === 1 ? "anim" : "anims"}
        </span>
      </div>

      {/* Preset Picker Popover Modal if active */}
      {activePickerType && (
        <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-[12px] border border-slate-200 dark:border-slate-700/80 shadow-sm animate-in fade-in duration-100">
          <PresetPickerSheet
            type={activePickerType}
            selectedPreset=""
            onSelect={(preset) => handleAddPreset(activePickerType, preset)}
          />
          <button
            type="button"
            onClick={() => setActivePickerType(null)}
            className="w-full mt-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 1. ENTRANCE STACK */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Entrance Animation
          </span>
        </div>

        {inClip ? (
          <div
            onClick={() => setSelectedClips([inClip.id])}
            onContextMenu={(e) => handleCardContextMenu(e, inClip)}
            className="group flex items-center justify-between p-2.5 rounded-[10px] bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize truncate">
                  {inClip.preset}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
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
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                title="Delete Entrance"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePickerType("in")}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-medium text-xs bg-slate-50/50 dark:bg-slate-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entrance Animation
          </button>
        )}
      </div>

      {/* 2. KINETIC ACTIONS & EMPHASIS */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-amber-600" />
            Kinetic Actions & Accents
          </span>
          <button
            type="button"
            onClick={() => setActivePickerType("action")}
            className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5"
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
                className="group flex items-center justify-between p-2.5 rounded-[10px] bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize truncate">
                      {clip.preset}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {clip.start.toFixed(2)}s
                      </span>
                      <span>{clip.duration.toFixed(2)}s</span>
                      {clip.loop && (
                        <span className="text-amber-600 dark:text-amber-400 font-sans">Loop</span>
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                    title="Delete Action"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePickerType("action")}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-medium text-xs bg-slate-50/50 dark:bg-slate-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Kinetic Action
          </button>
        )}
      </div>

      {/* 3. EXIT STACK */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            Exit Animation
          </span>
        </div>

        {outClip ? (
          <div
            onClick={() => setSelectedClips([outClip.id])}
            onContextMenu={(e) => handleCardContextMenu(e, outClip)}
            className="group flex items-center justify-between p-2.5 rounded-[10px] bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize truncate">
                  {outClip.preset}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
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
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                title="Delete Exit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActivePickerType("out")}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-medium text-xs bg-slate-50/50 dark:bg-slate-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Exit Animation
          </button>
        )}
      </div>
    </div>
  );
};
