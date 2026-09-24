import React from "react";
import { ContextMenuItem } from "@/store/useContextMenuStore";
import { ProjectStoreState } from "@/store/useProjectStore";
import { AnimationClip, Layer } from "@/types/scene";
import { isVectorLine, isShapeLayer } from "@/utils/layerCapabilities";
import {
  Scissors,
  Copy,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  Maximize2,
  RotateCcw,
  Pencil,
  ArrowLeftRight,
  ArrowUpRight,
  Link2,
  Unlink,
  Pin,
  MoveHorizontal,
  CircleDashed,
  ListOrdered,
  Folder,
} from "lucide-react";
import { findParentGroupInTree } from "@/store/helpers/treeHelpers";

/**
 * Zone A: Timeline Clip Context Menu
 * Clean, high-signal clip operations (no prompt modal, no redundant swap submenus).
 */
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
      id: "divider-clip",
      label: "",
      divider: true,
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

/**
 * Zone B: Timeline Track Context Menu
 * Layer-level operations directly on the track header.
 */
export function buildTimelineTrackMenu(params: {
  layer: Layer;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { layer, store } = params;
  const t = store.currentTime;

  return [
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
      id: "divider-track",
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

/**
 * Zone C: Timeline Empty Space Context Menu
 * Quick work area bounds setting at click position.
 */
export function buildTimelineEmptyMenu(params: {
  time: number;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { time, store } = params;

  return [
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

/**
 * Zone D: Timeline Ruler Context Menu
 * Time format and navigation controls.
 */
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

/**
 * Zone E: Canvas Element Context Menu
 * Minimal, high-craft context menu: Z-ordering, element-specific form actions, duplicate, and delete.
 * No generic animation pickers or browser modal rename prompts.
 */
export function buildCanvasElementMenu(params: {
  layer: Layer;
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { layer, store } = params;

  const items: ContextMenuItem[] = [
    {
      id: "bring-front",
      label: "Bring to Front",
      shortcut: "Ctrl+]",
      action: () => store.bringToFront(layer.id),
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
      id: "send-back",
      label: "Send to Back",
      shortcut: "Ctrl+[",
      action: () => store.sendToBack(layer.id),
    },
    {
      id: "divider-elem-order",
      label: "",
      divider: true,
    },
  ];

  // Element-Specific Context Actions (Form Truth)
  if (isVectorLine(layer)) {
    items.push(
      {
        id: "enter-split-mode",
        label: "Enter Split Mode",
        icon: <Scissors className="w-3.5 h-3.5" />,
        action: () => store.enterSplitMode(layer.id),
      },
      {
        id: "reverse-direction",
        label: "Reverse Direction",
        icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
        action: () => {
          const start = (layer as any).arrowStart || "none";
          const end =
            (layer as any).arrowEnd ||
            ((layer as any).shapeType === "arrow" ? "arrow" : "none");
          store.updateLayer(layer.id, {
            arrowStart: end,
            arrowEnd: start,
          } as any);
        },
      },
      {
        id: "toggle-arrowhead",
        label: "Toggle Arrowhead",
        icon: <ArrowUpRight className="w-3.5 h-3.5" />,
        action: () => {
          const curEnd = (layer as any).arrowEnd;
          store.updateLayer(layer.id, {
            arrowEnd: curEnd === "arrow" ? "none" : "arrow",
          } as any);
        },
      },
      {
        id: "divider-line-specific",
        label: "",
        divider: true,
      }
    );
  } else if (layer.type === "text" || layer.type === "chunk") {
    const hasSelection =
      store.activeTextSelection &&
      store.activeTextSelection.layerId === layer.id &&
      store.activeTextSelection.start < store.activeTextSelection.end;

    items.push(
      ...(hasSelection
        ? [
            {
              id: "split-text-selection",
              label: "Split",
              icon: <Scissors className="w-3.5 h-3.5" />,
              action: () =>
                store.splitTextRange(
                  layer.id,
                  store.activeTextSelection!.start,
                  store.activeTextSelection!.end
                ),
            },
          ]
        : []),
      {
        id: "toggle-text-sizing",
        label: "Fit Width to Content",
        icon: <Maximize2 className="w-3.5 h-3.5" />,
        action: () => {
          const domEl = typeof document !== "undefined" ? document.getElementById(`layer-${layer.id}`) : null;
          store.updateLayerStyle(layer.id, {
            width: domEl ? Math.round(domEl.scrollWidth) : "auto",
            height: "auto",
            textSizing: "auto-height",
          });
        },
      },
      {
        id: "divider-text-specific",
        label: "",
        divider: true,
      }
    );
  } else if (isShapeLayer(layer)) {
    items.push(
      {
        id: "enter-split-mode",
        label: "Enter Split Mode",
        icon: <Scissors className="w-3.5 h-3.5" />,
        action: () => store.enterSplitMode(layer.id),
      },
      {
        id: "divider-shape-specific",
        label: "",
        divider: true,
      }
    );
  } else if (layer.type === "group" || layer.type === "frame") {
    items.push(
      {
        id: "ungroup",
        label: "Ungroup",
        icon: <Folder className="w-3.5 h-3.5" />,
        shortcut: "Ctrl+Shift+G",
        action: () => store.ungroup(layer.id),
      },
      {
        id: "divider-group-specific",
        label: "",
        divider: true,
      }
    );
  } else if (layer.type === "image" || layer.type === "video") {
    items.push(
      {
        id: "toggle-fit-mode",
        label: (layer as any).objectFit === "contain" ? "Fit Mode: Cover" : "Fit Mode: Contain",
        action: () => {
          const cur = (layer as any).objectFit || "cover";
          store.updateLayer(layer.id, {
            objectFit: cur === "cover" ? "contain" : "cover",
          } as any);
        },
      },
      {
        id: "divider-media-specific",
        label: "",
        divider: true,
      }
    );
  }

  // Mask Operations
  const isMaskGroup = layer.type === "group" && (layer as any).isMaskGroup;
  const activeScreenForMask = store.document.screens.find((s) => s.id === store.activeScreenId);
  const parentGroup = activeScreenForMask ? findParentGroupInTree(activeScreenForMask.layers, layer.id) : null;
  const isInsideMaskGroup = parentGroup && (parentGroup as any).isMaskGroup;

  if (isMaskGroup || isInsideMaskGroup) {
    const maskGroupId = isMaskGroup ? layer.id : parentGroup!.id;
    const targetGroup = (isMaskGroup ? layer : parentGroup) as any;
    items.push(
      {
        id: "toggle-mask-invert",
        label: targetGroup.invertMask ? "Invert Mask: Stencil" : "Invert Mask: Cutout",
        icon: <CircleDashed className="w-3.5 h-3.5" />,
        action: () => store.toggleMaskInvert(maskGroupId),
      },
      {
        id: "release-mask",
        label: "Release Mask",
        icon: <Scissors className="w-3.5 h-3.5" />,
        shortcut: "Ctrl+Alt+M",
        action: () => store.unmaskGroup(maskGroupId),
      },
      {
        id: "divider-mask-specific",
        label: "",
        divider: true,
      }
    );
  } else if (store.selectedLayerIds && store.selectedLayerIds.length >= 2) {
    items.push(
      {
        id: "stagger-selection",
        label: "Stagger Animations...",
        icon: <ListOrdered className="w-3.5 h-3.5 text-purple-400" />,
        shortcut: "Shift+S",
        action: () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("motion-open-stagger-popover"));
          }
        },
      },
      {
        id: "mask-selection",
        label: "Mask Selection",
        icon: <CircleDashed className="w-3.5 h-3.5 text-purple-400" />,
        shortcut: "Ctrl+Alt+M",
        action: () => store.maskSelection(),
      },
      {
        id: "divider-mask-selection",
        label: "",
        divider: true,
      }
    );
  } else if (!isMaskGroup) {
    items.push(
      {
        id: "use-as-mask",
        label: "Use as Mask",
        icon: <CircleDashed className="w-3.5 h-3.5" />,
        shortcut: "Ctrl+Alt+M",
        action: () => store.useAsMask(layer.id),
      },
      {
        id: "divider-use-as-mask",
        label: "",
        divider: true,
      }
    );
  }

  // Relational Linking Actions
  const selectedIds = store.selectedLayerIds || [];
  if (selectedIds.length === 2 && selectedIds.includes(layer.id)) {
    const otherId = selectedIds.find((id) => id !== layer.id);
    const activeScreen = store.document.screens.find((s) => s.id === store.activeScreenId);
    let otherLayer: Layer | undefined;
    function findOther(layers: Layer[]) {
      for (const l of layers) {
        if (l.id === otherId) otherLayer = l;
        if (l.type === "group" && (l as any).children) findOther((l as any).children);
      }
    }
    if (activeScreen && otherId) findOther(activeScreen.layers);

    if (otherLayer) {
      items.push(
        {
          id: "link-hug-other",
          label: `Hug Bounds of "${otherLayer.name}"`,
          icon: <Maximize2 className="w-3.5 h-3.5 text-purple-400" />,
          action: () => {
            store.addLayerBinding(layer.id, {
              id: `bind_${Date.now()}`,
              driverLayerId: otherLayer!.id,
              driverProp: "width",
              drivenProp: "width",
              mode: "hug",
              padding: [16, 12],
              expansionPhysics: "spring",
            });
          },
        },
        {
          id: "link-pin-other",
          label: `Pin to "${otherLayer.name}"`,
          icon: <Pin className="w-3.5 h-3.5 text-blue-400" />,
          action: () => {
            store.addLayerBinding(layer.id, {
              id: `bind_${Date.now()}`,
              driverLayerId: otherLayer!.id,
              driverProp: "x",
              drivenProp: "x",
              mode: "pin",
              driverAnchor: "middle-right",
              targetAnchor: "middle-left",
              offset2D: [12, 0],
              expansionPhysics: "spring",
            });
          },
        },
        {
          id: "link-reflow-other",
          label: `Reflow After "${otherLayer.name}" (16px)`,
          icon: <MoveHorizontal className="w-3.5 h-3.5 text-emerald-400" />,
          action: () => {
            store.addLayerBinding(layer.id, {
              id: `bind_${Date.now()}`,
              driverLayerId: otherLayer!.id,
              driverProp: "x",
              drivenProp: "x",
              mode: "reflow",
              reflowAxis: "horizontal",
              reflowGap: 16,
              reflowAlignment: "center",
              expansionPhysics: "spring",
            });
          },
        },
        {
          id: "divider-linking",
          label: "",
          divider: true,
        }
      );
    }
  } else if (layer.bindings && layer.bindings.length > 0) {
    items.push(
      {
        id: "unlink-all",
        label: `Unlink All (${layer.bindings.length} link${layer.bindings.length > 1 ? "s" : ""})`,
        icon: <Unlink className="w-3.5 h-3.5 text-amber-400" />,
        action: () => {
          for (const b of layer.bindings || []) {
            store.removeLayerBinding(layer.id, b.id);
          }
        },
      },
      {
        id: "divider-unlinking",
        label: "",
        divider: true,
      }
    );
  }

  // Core Operations: Duplicate & Delete
  items.push(
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
    }
  );

  return items;
}

/**
 * Zone F: Canvas Pasteboard Context Menu
 * Clean viewport view and selection shortcuts.
 */
export function buildCanvasPasteboardMenu(params: {
  store: ProjectStoreState;
}): ContextMenuItem[] {
  const { store } = params;

  return [
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

/**
 * Zone G: Sidebar Animation Card Context Menu
 * Duplicate, reset, or delete animation clips from inspector cards.
 */
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

/**
 * Scene Context Menu
 * Scene level navigation, duplication, and deletion.
 */
export function buildSceneContextMenu(params: {
  screenId: string;
  store: ProjectStoreState;
  onRename?: () => void;
}): ContextMenuItem[] {
  const { screenId, store, onRename } = params;
  const canDelete = store.document.screens.length > 1;

  const items: ContextMenuItem[] = [
    {
      id: "scene-focus",
      label: "Fit Scene in Viewport",
      icon: <Maximize2 className="w-3.5 h-3.5" />,
      action: () => {
        store.selectScreen(screenId);
        store.deselectAll();
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("motion-focus-screen", { detail: { screenId } })
          );
        }
      },
    },
    {
      id: "scene-duplicate",
      label: "Duplicate Scene",
      icon: <Copy className="w-3.5 h-3.5" />,
      shortcut: "Ctrl+D",
      action: () => store.duplicateScreen(screenId),
    },
  ];

  if (onRename) {
    items.push({
      id: "scene-rename",
      label: "Rename Scene",
      icon: <Pencil className="w-3.5 h-3.5" />,
      shortcut: "F2",
      action: onRename,
    });
  }

  items.push(
    {
      id: "divider-scene",
      label: "",
      divider: true,
    },
    {
      id: "scene-delete",
      label: "Delete Scene",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      shortcut: "Del",
      danger: true,
      disabled: !canDelete,
      action: () => {
        if (canDelete) {
          store.deleteScreen(screenId);
        }
      },
    }
  );

  return items;
}
