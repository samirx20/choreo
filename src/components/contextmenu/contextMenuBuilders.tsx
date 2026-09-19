import React from "react";
import { ContextMenuItem } from "@/store/useContextMenuStore";
import { ProjectStoreState } from "@/store/useProjectStore";
import { AnimationClip, Layer } from "@/types/scene";
import {
  Scissors,
  Copy,
  Trash2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Repeat,
  Layers,
  Eye,
  EyeOff,
  Plus,
  Maximize2,
  Type,
  Square,
  Circle,
  RotateCcw,
} from "lucide-react";

export function buildTimelineClipMenu(params: {
  layerId: string;
  clip: AnimationClip;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { layerId, clip, store } = params;
  const t = store.currentTime;

  const canSplit = t > clip.start + 0.05 && t < clip.start + clip.duration - 0.05;

  return [
    {
      id: "quick-swap",
      label: "Swap Preset",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      children: [
        {
          id: "swap-pop",
          label: "Pop In",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "pop", type: "in" }),
        },
        {
          id: "swap-slide-up",
          label: "Slide Up",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "slideUp", type: "in" }),
        },
        {
          id: "swap-fade",
          label: "Smooth Fade",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "fade", type: "in" }),
        },
        {
          id: "swap-pulse",
          label: "Pulse (Accent)",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "pulse", type: "action" }),
        },
        {
          id: "swap-bounce",
          label: "Bounce",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "bounce", type: "action" }),
        },
        {
          id: "swap-wiggle",
          label: "Wiggle",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "wiggle", type: "action" }),
        },
        {
          id: "swap-fade-out",
          label: "Fade Out",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "fade", type: "out" }),
        },
        {
          id: "swap-slide-down",
          label: "Slide Down (Exit)",
          action: () => store.updateAnimationClip(layerId, clip.id, { preset: "slideDown", type: "out" }),
        },
      ],
    },
    {
      id: "split-clip",
      label: "Split at Playhead",
      icon: <Scissors className="w-3.5 h-3.5" />,
      shortcut: "S",
      disabled: !canSplit,
      action: () => store.splitAnimationClip(layerId, clip.id, t),
    },
    {
      id: "duplicate-clip",
      label: "Duplicate Clip",
      icon: <Copy className="w-3.5 h-3.5" />,
      shortcut: "Ctrl+D",
      action: () => store.duplicateAnimationClip(layerId, clip.id),
    },
    {
      id: "align-playhead",
      label: "Align Start to Playhead",
      icon: <Clock className="w-3.5 h-3.5" />,
      action: () => store.updateAnimationClip(layerId, clip.id, { start: Math.round(t * 100) / 100 }),
    },
    {
      id: "divider-1",
      label: "",
      divider: true,
    },
    {
      id: "ripple-delete",
      label: "Ripple Delete",
      shortcut: "Shift+Del",
      danger: true,
      action: () => {
        store.removeAnimationClip(layerId, clip.id);
      },
    },
    {
      id: "delete-clip",
      label: "Delete Clip",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      shortcut: "Del",
      danger: true,
      action: () => store.removeAnimationClip(layerId, clip.id),
    },
  ];
}

export function buildTimelineTrackMenu(params: {
  layer: Layer;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { layer, store } = params;
  const t = store.currentTime;

  return [
    {
      id: "add-in",
      label: "Add Entrance (In)",
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
      action: () =>
        store.addAnimationClip(layer.id, {
          type: "in",
          preset: "pop",
          start: t,
          duration: 0.6,
        }),
    },
    {
      id: "add-action",
      label: "Add Kinetic Action",
      icon: <Repeat className="w-3.5 h-3.5 text-amber-600" />,
      action: () =>
        store.addAnimationClip(layer.id, {
          type: "action",
          preset: "pulse",
          start: t,
          duration: 0.5,
        }),
    },
    {
      id: "add-out",
      label: "Add Exit (Out)",
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />,
      action: () =>
        store.addAnimationClip(layer.id, {
          type: "out",
          preset: "fade",
          start: t,
          duration: 0.6,
        }),
    },
    {
      id: "divider-track-1",
      label: "",
      divider: true,
    },
    {
      id: "razor-split",
      label: "Razor Split at Playhead",
      icon: <Scissors className="w-3.5 h-3.5" />,
      shortcut: "S",
      action: () => store.razorSplitLayer(layer.id, t),
    },
    {
      id: "dup-layer",
      label: "Duplicate Layer",
      icon: <Copy className="w-3.5 h-3.5" />,
      shortcut: "Ctrl+D",
      action: () => store.duplicateLayer(layer.id),
    },
    {
      id: "toggle-visibility",
      label: layer.style.opacity === 0 ? "Show Layer" : "Hide Layer",
      icon: layer.style.opacity === 0 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />,
      action: () =>
        store.updateLayerStyle(layer.id, {
          opacity: layer.style.opacity === 0 ? 1 : 0,
        }),
    },
    {
      id: "divider-track-2",
      label: "",
      divider: true,
    },
    {
      id: "delete-layer",
      label: "Delete Layer",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      shortcut: "Del",
      danger: true,
      action: () => store.removeLayer(layer.id),
    },
  ];
}

export function buildTimelineEmptyMenu(params: {
  time: number;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { time, store } = params;
  const selectedLayerId = store.selectedLayerIds[0];

  return [
    {
      id: "add-anim-here",
      label: `Add Animation at ${time.toFixed(2)}s`,
      icon: <Plus className="w-3.5 h-3.5" />,
      disabled: !selectedLayerId,
      children: [
        {
          id: "add-in-here",
          label: "Entrance (Pop In)",
          action: () =>
            selectedLayerId &&
            store.addAnimationClip(selectedLayerId, {
              type: "in",
              preset: "pop",
              start: time,
              duration: 0.6,
            }),
        },
        {
          id: "add-pulse-here",
          label: "Action (Pulse)",
          action: () =>
            selectedLayerId &&
            store.addAnimationClip(selectedLayerId, {
              type: "action",
              preset: "pulse",
              start: time,
              duration: 0.5,
            }),
        },
        {
          id: "add-out-here",
          label: "Exit (Slide Down)",
          action: () =>
            selectedLayerId &&
            store.addAnimationClip(selectedLayerId, {
              type: "out",
              preset: "slideDown",
              start: time,
              duration: 0.6,
            }),
        },
      ],
    },
    {
      id: "divider-empty-1",
      label: "",
      divider: true,
    },
    {
      id: "set-work-in",
      label: "Set Work Area In Point",
      icon: <Clock className="w-3.5 h-3.5" />,
      shortcut: "B",
      action: () => store.setWorkAreaStart(time),
    },
    {
      id: "set-work-out",
      label: "Set Work Area Out Point",
      icon: <Clock className="w-3.5 h-3.5" />,
      shortcut: "N",
      action: () => store.setWorkAreaEnd(time),
    },
    {
      id: "reset-work",
      label: "Reset Work Area to Full",
      action: () => store.setWorkArea(null),
    },
  ];
}

export function buildTimelineRulerMenu(params: {
  time: number;
  isSmpte: boolean;
  toggleSmpte: () => void;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { time, isSmpte, toggleSmpte, store } = params;

  return [
    {
      id: "set-in",
      label: "Set Work Area Start (In)",
      shortcut: "B",
      action: () => store.setWorkAreaStart(time),
    },
    {
      id: "set-out",
      label: "Set Work Area End (Out)",
      shortcut: "N",
      action: () => store.setWorkAreaEnd(time),
    },
    {
      id: "reset-work-area",
      label: "Reset Work Area",
      action: () => store.setWorkArea(null),
    },
    {
      id: "divider-ruler",
      label: "",
      divider: true,
    },
    {
      id: "toggle-smpte",
      label: isSmpte ? "Display as Seconds (0.00s)" : "Display as SMPTE Frames (00:00)",
      action: toggleSmpte,
    },
    {
      id: "jump-to-start",
      label: "Jump Playhead to 0.00s",
      action: () => store.setCurrentTime(0),
    },
    {
      id: "jump-to-end",
      label: `Jump Playhead to End (${store.document.screens[0]?.duration || 5}s)`,
      action: () => store.setCurrentTime(store.document.screens[0]?.duration || 5),
    },
  ];
}

export function buildCanvasElementMenu(params: {
  layer: Layer;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { layer, store } = params;

  return [
    {
      id: "canvas-add-anim",
      label: "Add Animation...",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      children: [
        {
          id: "anim-pop",
          label: "Pop In",
          action: () =>
            store.addAnimationClip(layer.id, {
              type: "in",
              preset: "pop",
              start: store.currentTime,
              duration: 0.6,
            }),
        },
        {
          id: "anim-slide-up",
          label: "Slide Up",
          action: () =>
            store.addAnimationClip(layer.id, {
              type: "in",
              preset: "slideUp",
              start: store.currentTime,
              duration: 0.6,
            }),
        },
        {
          id: "anim-pulse",
          label: "Pulse (Accent)",
          action: () =>
            store.addAnimationClip(layer.id, {
              type: "action",
              preset: "pulse",
              start: store.currentTime,
              duration: 0.5,
            }),
        },
        {
          id: "anim-exit",
          label: "Fade Out",
          action: () =>
            store.addAnimationClip(layer.id, {
              type: "out",
              preset: "fade",
              start: store.currentTime,
              duration: 0.6,
            }),
        },
      ],
    },
    {
      id: "divider-elem-1",
      label: "",
      divider: true,
    },
    {
      id: "bring-front",
      label: "Bring to Front",
      shortcut: "Ctrl+]",
      action: () => store.bringToFront(layer.id),
    },
    {
      id: "send-back",
      label: "Send to Back",
      shortcut: "Ctrl+[",
      action: () => store.sendToBack(layer.id),
    },
    {
      id: "bring-fwd",
      label: "Bring Forward",
      shortcut: "]",
      action: () => store.bringForward(layer.id),
    },
    {
      id: "send-bwd",
      label: "Send Backward",
      shortcut: "[",
      action: () => store.sendBackward(layer.id),
    },
    {
      id: "divider-elem-2",
      label: "",
      divider: true,
    },
    {
      id: "duplicate-elem",
      label: "Duplicate",
      icon: <Copy className="w-3.5 h-3.5" />,
      shortcut: "Ctrl+D",
      action: () => store.duplicateLayer(layer.id),
    },
    {
      id: "delete-elem",
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      shortcut: "Del",
      danger: true,
      action: () => store.removeLayer(layer.id),
    },
  ];
}

export function buildCanvasPasteboardMenu(params: {
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { store } = params;

  return [
    {
      id: "pasteboard-text",
      label: "Add Text",
      icon: <Type className="w-3.5 h-3.5" />,
      shortcut: "T",
      action: () => {
        const id = `text_${Date.now()}`;
        store.addLayer({
          id,
          name: "Text",
          type: "text",
          content: "Kinetic Typography",
          style: {
            x: 200,
            y: 200,
            width: 400,
            height: 80,
            rotation: 0,
            opacity: 1,
            fontSize: 48,
            color: "#0f172a",
            fontWeight: "700",
          },
        });
        store.selectLayer(id);
      },
    },
    {
      id: "pasteboard-rect",
      label: "Add Rectangle",
      icon: <Square className="w-3.5 h-3.5" />,
      shortcut: "R",
      action: () => {
        const id = `rect_${Date.now()}`;
        store.addLayer({
          id,
          name: "Rectangle",
          type: "shape",
          shapeType: "rectangle",
          style: {
            x: 240,
            y: 240,
            width: 240,
            height: 140,
            rotation: 0,
            opacity: 1,
            backgroundColor: "#f1f5f9",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#cbd5e1",
          },
        });
        store.selectLayer(id);
      },
    },
    {
      id: "pasteboard-circle",
      label: "Add Circle",
      icon: <Circle className="w-3.5 h-3.5" />,
      shortcut: "O",
      action: () => {
        const id = `circle_${Date.now()}`;
        store.addLayer({
          id,
          name: "Circle",
          type: "shape",
          shapeType: "circle",
          style: {
            x: 280,
            y: 280,
            width: 160,
            height: 160,
            rotation: 0,
            opacity: 1,
            backgroundColor: "#e2e8f0",
            borderRadius: 9999,
          },
        });
        store.selectLayer(id);
      },
    },
    {
      id: "divider-pasteboard-1",
      label: "",
      divider: true,
    },
    {
      id: "select-all",
      label: "Select All",
      shortcut: "Ctrl+A",
      action: () => {
        const screen = store.document.screens.find((s) => s.id === store.activeScreenId);
        if (screen) {
          screen.layers.forEach((l, idx) => store.selectLayer(l.id, idx > 0));
        }
      },
    },
    {
      id: "zoom-100",
      label: "Zoom to 100%",
      shortcut: "Ctrl+0",
      action: () => store.setZoom(1),
    },
    {
      id: "zoom-fit",
      label: "Fit to Viewport",
      icon: <Maximize2 className="w-3.5 h-3.5" />,
      shortcut: "Shift+1",
      action: () => store.setZoom(0.85),
    },
  ];
}

export function buildSidebarCardMenu(params: {
  layerId: string;
  clip: AnimationClip;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { layerId, clip, store } = params;

  return [
    {
      id: "card-duplicate",
      label: "Duplicate Animation",
      icon: <Copy className="w-3.5 h-3.5" />,
      action: () => store.duplicateAnimationClip(layerId, clip.id),
    },
    {
      id: "card-reset",
      label: "Reset to Standard Defaults",
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      action: () =>
        store.updateAnimationClip(layerId, clip.id, {
          duration: 0.6,
          easing: "smooth",
          intensity: 1,
          springStiffness: 220,
          springDamping: 0.72,
        }),
    },
    {
      id: "divider-card",
      label: "",
      divider: true,
    },
    {
      id: "card-delete",
      label: "Delete Animation",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      shortcut: "Del",
      danger: true,
      action: () => store.removeAnimationClip(layerId, clip.id),
    },
  ];
}
