import { create } from "zustand";
import {
  SceneDocument,
  Screen,
  Layer,
  GroupLayer,
  LayerStyle,
  LayerAnimation,
  ProjectSettings,
  ElementLinkBinding,
  AnimationClip,
  getLayerClips,
  UiMode,
} from "@/types/scene";
import { TransactionalHistory } from "./history";
import { THEME_TOKENS } from "@/theme/tokens";
import { splitLayerAtPlayhead, RazorSplitResult } from "@/engine/video/razorSplit";

export const INITIAL_SCENE: SceneDocument = {
  version: "1.0",
  name: "Motion Studio Teaser",
  settings: {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 5.0,
    backgroundColor: THEME_TOKENS.surfaces.appBackground,
    palette: [
      "#000000",
      "#ffffff",
      "#e8c547",
      "#f5f0e8",
      "#ef4444",
      "#34d399",
      "#60a5fa",
      "#a855f7",
    ],
    safeZones: {
      actionSafe: false,
      titleSafe: false,
      ruleOfThirds: false,
      centerCrosshair: false,
      socialOverlay: 'none',
      socialOverlayOpacity: 0.7,
    },
  },
  screens: [
    {
      id: "screen_1",
      name: "Screen 1",
      duration: 5.0,
      layers: [],
    },
  ],
};

export const STORAGE_DOC_KEY = "motion_studio_active_doc";
const STORAGE_THEME_KEY = "motion_studio_theme";

function loadInitialScene(): SceneDocument {
  if (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const saved = window.localStorage.getItem(STORAGE_DOC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.screens) && parsed.screens.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load scene from localStorage:", e);
    }
  }
  return INITIAL_SCENE;
}

function loadInitialTheme(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    process.env.NODE_ENV !== "test"
  ) {
    try {
      const saved = window.localStorage.getItem(STORAGE_THEME_KEY);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch {
      // ignore
    }
  }
  return "light";
}

const initialDoc = loadInitialScene();
const history = new TransactionalHistory(initialDoc);

export type CanvasTool =
  | "select"
  | "hand"
  | "text"
  | "rectangle"
  | "circle"
  | "star"
  | "triangle"
  | "media";

export type { UiMode };

export const isMotionMode = (mode: UiMode) => mode === "motion" || mode === "animate";

export interface ProjectStoreState {
  // Document state (persisted to scene.json)
  document: SceneDocument;

  // Ephemeral UI state (excluded from scene.json)
  activeScreenId: string;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  activeTextSelection: { layerId: string; start: number; end: number; text: string } | null;
  activeTool: CanvasTool;
  uiMode: UiMode;
  motionLayerIds: string[] | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number; // 1 = 100%
  canUndo: boolean;
  canRedo: boolean;

  // History Actions
  startTransaction: () => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;

  // UI State Actions (excluded from document history)
  setUiMode: (mode: UiMode) => void;
  sendScreenToMotion: (screenId?: string) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  selectScreen: (screenId: string) => void;
  selectLayer: (layerId: string, multi?: boolean) => void;
  deselectAll: () => void;
  setEditingLayerId: (id: string | null) => void;
  setActiveTextSelection: (sel: { layerId: string; start: number; end: number; text: string } | null) => void;
  setTool: (tool: CanvasTool) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;

  // Document Mutation Actions (recorded in history)
  setDocument: (doc: SceneDocument) => void;
  setProjectName: (name: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  addScreen: (screen?: Partial<Screen>) => void;
  updateScreen: (screenId: string, updates: Partial<Screen>) => void;
  deleteScreen: (screenId: string) => void;
  duplicateScreen: (screenId: string) => void;
  addLayer: (layer: Layer, targetGroupId?: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  updateLayerStyle: (layerId: string, styleUpdates: Partial<LayerStyle>) => void;
  updateLayerAnimation: (
    layerId: string,
    animUpdates: Partial<LayerAnimation>,
    options?: { ripple?: boolean }
  ) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  duplicateLayerInPlace: (layerId: string) => string;
  nestLayerInGroup: (layerId: string, targetGroupId: string) => void;
  ungroup: (groupId: string) => void;
  reorderLayer: (sourceId: string, targetId: string, position: "before" | "after" | "inside") => void;
  bringToFront: (layerId: string) => void;
  sendToBack: (layerId: string) => void;
  bringForward: (layerId: string) => void;
  sendBackward: (layerId: string) => void;
  groupSelection: () => void;
  splitTextRange: (layerId: string, start: number, end: number) => void;
  splitTextAtCaret: (layerId: string, index: number) => void;
  mergeChunkWithPrevious: (chunkId: string) => void;
  mergeChunkWithNext: (chunkId: string) => void;

  // Spatial Alignment & Distribution Actions
  alignSelectedLayers: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
    relativeTo?: "selection" | "canvas"
  ) => void;
  distributeSpacing: (direction: "horizontal" | "vertical") => void;
  tidyUpSelection: () => void;

  // Timeline Clip Selection
  selectedClipIds: string[];
  setSelectedClips: (ids: string[]) => void;
  toggleClipSelection: (id: string, isMulti?: boolean) => void;

  // Work Area Loop Region
  workArea: { start: number; end: number } | null;
  setWorkArea: (workArea: { start: number; end: number } | null) => void;
  setWorkAreaStart: (time: number) => void;
  setWorkAreaEnd: (time: number) => void;

  // Document Palette Actions
  addPaletteColor: (color: string) => void;
  removePaletteColor: (color: string) => void;

  // Reactive Element Bindings
  addLayerBinding: (layerId: string, binding: ElementLinkBinding) => void;
  updateLayerBinding: (layerId: string, bindingId: string, patch: Partial<ElementLinkBinding>) => void;
  removeLayerBinding: (layerId: string, bindingId: string) => void;

  // Razor Split & Multi-Studio Handoff
  razorSplitLayer: (layerId: string, time?: number) => RazorSplitResult;
  sendTo3D: () => void;
  sendToEditor: () => void;

  // Project Management & Persistence
  loadDocument: (doc: SceneDocument) => void;
  resetProject: () => void;

  // Multi-Animation Clip Actions
  addAnimationClip: (layerId: string, clip: Partial<Omit<AnimationClip, "id">>) => string;
  updateAnimationClip: (
    layerId: string,
    clipId: string,
    updates: Partial<AnimationClip>,
    options?: { ripple?: boolean }
  ) => void;
  removeAnimationClip: (layerId: string, clipId: string) => void;
  duplicateAnimationClip: (layerId: string, clipId: string) => string;
  reorderAnimationClips: (layerId: string, orderedClipIds: string[]) => void;
  splitAnimationClip: (layerId: string, clipId: string, splitTime?: number) => void;
}

// Helper: Recursively search and mutate a layer in a layer tree
function mutateLayerInTree(
  layers: Layer[],
  layerId: string,
  mutator: (layer: Layer) => Layer | null
): Layer[] {
  const result: Layer[] = [];

  for (const layer of layers) {
    if (layer.id === layerId) {
      const mutated = mutator(layer);
      if (mutated !== null) {
        result.push(mutated);
      }
    } else if (layer.type === "group") {
      const updatedChildren = mutateLayerInTree(layer.children, layerId, mutator);
      result.push({
        ...layer,
        children: updatedChildren,
      });
    } else {
      result.push(layer);
    }
  }

  return result;
}

// Helper: Find a layer by ID in a layer tree
export function findLayerInTree(layers: Layer[], layerId: string): Layer | null {
  for (const layer of layers) {
    if (layer.id === layerId) return layer;
    if (layer.type === "group") {
      const found = findLayerInTree(layer.children, layerId);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Find parent group of a layer in tree
export function findParentGroupInTree(layers: Layer[], targetId: string): GroupLayer | null {
  for (const layer of layers) {
    if (layer.type === "group") {
      if (layer.children.some((c) => c.id === targetId)) {
        return layer;
      }
      const deeper = findParentGroupInTree(layer.children, targetId);
      if (deeper) return deeper;
    }
  }
  return null;
}

// Helper: Find topmost ancestor group of a layer in tree (returns null if layer is directly at root)
export function findTopmostParentGroupInTree(layers: Layer[], targetId: string): GroupLayer | null {
  for (const layer of layers) {
    if (layer.type === "group") {
      if (layer.id === targetId) return null;
      const contains = (g: GroupLayer): boolean => {
        return g.children.some((c) => c.id === targetId || (c.type === "group" && contains(c)));
      };
      if (contains(layer)) {
        return layer;
      }
    }
  }
  return null;
}

// Helper: Insert a layer relative to targetId in tree
function insertLayerRelativeInTree(
  layers: Layer[],
  targetId: string,
  layerToInsert: Layer,
  position: "before" | "after" | "inside"
): { updated: Layer[]; inserted: boolean } {
  const targetIndex = layers.findIndex((l) => l.id === targetId);
  if (targetIndex !== -1) {
    if (position === "inside") {
      const target = layers[targetIndex];
      if (target.type === "group") {
        const nextTarget: Layer = {
          ...target,
          children: [...target.children, layerToInsert],
        };
        const nextLayers = [...layers];
        nextLayers[targetIndex] = nextTarget;
        return { updated: nextLayers, inserted: true };
      }
    } else {
      const nextLayers = [...layers];
      const insertAt = position === "before" ? targetIndex : targetIndex + 1;
      nextLayers.splice(insertAt, 0, layerToInsert);
      return { updated: nextLayers, inserted: true };
    }
  }

  let inserted = false;
  const updated = layers.map((layer) => {
    if (inserted || layer.type !== "group") return layer;
    const res = insertLayerRelativeInTree(layer.children, targetId, layerToInsert, position);
    if (res.inserted) {
      inserted = true;
      return { ...layer, children: res.updated };
    }
    return layer;
  });

  return { updated, inserted };
}

// Helper: Flatten all layers into a single array
export function flattenLayers(layers: Layer[]): Layer[] {
  const flat: Layer[] = [];
  for (const layer of layers) {
    flat.push(layer);
    if (layer.type === "group") {
      flat.push(...flattenLayers(layer.children));
    }
  }
  return flat;
}

// Helper: Check if layer intersects or is placed on the artboard [0, 0, width, height]
export function isLayerOnArtboard(
  layer: Layer,
  screenWidth: number,
  screenHeight: number
): boolean {
  const lx = layer.style.x ?? 0;
  const ly = layer.style.y ?? 0;
  const lw = typeof layer.style.width === "number" ? layer.style.width : 100;
  const lh = typeof layer.style.height === "number" ? layer.style.height : 100;

  // Layer intersects artboard rectangle [0, 0, screenWidth, screenHeight]
  return (
    lx < screenWidth &&
    lx + lw > 0 &&
    ly < screenHeight &&
    ly + lh > 0
  );
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  document: history.getPresent(),
  activeScreenId: initialDoc.screens[0]?.id || "screen_1",
  selectedLayerIds: [],
  editingLayerId: null,
  activeTextSelection: null,
  activeTool: "select",
  uiMode: "design",
  motionLayerIds: null,
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  canUndo: false,
  canRedo: false,
  theme: loadInitialTheme(),

  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    if (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      process.env.NODE_ENV !== "test"
    ) {
      try {
        window.localStorage.setItem(STORAGE_THEME_KEY, theme);
      } catch {
        // ignore
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === "light" ? "dark" : "light";
    get().setTheme(nextTheme);
  },

  setEditingLayerId: (id) => set({ editingLayerId: id }),
  setActiveTextSelection: (sel) => set({ activeTextSelection: sel }),

  // History Control
  startTransaction: () => {
    history.startTransaction();
  },

  commitTransaction: () => {
    history.commitTransaction();
    set({
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  cancelTransaction: () => {
    const rolledBack = history.cancelTransaction();
    set({
      document: rolledBack,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  undo: () => {
    const previous = history.undo();
    if (previous) {
      set({
        document: previous,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
    }
  },

  redo: () => {
    const next = history.redo();
    if (next) {
      set({
        document: next,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
    }
  },

  // UI State Controls (Excluded from history)
  setUiMode: (uiMode) => {
    const nextMode = uiMode === "animate" ? "motion" : uiMode;
    const { document: doc, activeScreenId } = get();
    // When entering motion, default motionLayerIds to artboard layers if not set
    if (isMotionMode(nextMode)) {
      const screen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
      const artboardLayers = screen
        ? screen.layers.filter((l) => isLayerOnArtboard(l, doc.settings.width, doc.settings.height))
        : [];
      set({
        uiMode: nextMode,
        activeTool: "select",
        motionLayerIds: artboardLayers.map((l) => l.id),
      });
    } else {
      set({ uiMode: nextMode, activeTool: "select" });
    }
  },
  sendScreenToMotion: (screenId) => {
    const { document: doc, activeScreenId } = get();
    const targetId = screenId || activeScreenId;
    const screen = doc.screens.find((s) => s.id === targetId) || doc.screens[0];
    if (!screen) return;
    const artboardLayers = screen.layers.filter((l) =>
      isLayerOnArtboard(l, doc.settings.width, doc.settings.height)
    );
    set({
      activeScreenId: targetId,
      uiMode: "motion",
      activeTool: "select",
      motionLayerIds: artboardLayers.map((l) => l.id),
      selectedLayerIds: artboardLayers[0] ? [artboardLayers[0].id] : [],
    });
  },
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setZoom: (zoom) => set({ zoom }),
  selectScreen: (activeScreenId) => set({ activeScreenId, selectedLayerIds: [] }),
  selectLayer: (layerId, multi = false) => {
    const { selectedLayerIds } = get();
    if (multi) {
      if (selectedLayerIds.includes(layerId)) {
        set({ selectedLayerIds: selectedLayerIds.filter((id) => id !== layerId) });
      } else {
        set({ selectedLayerIds: [...selectedLayerIds, layerId] });
      }
    } else {
      set({ selectedLayerIds: [layerId] });
    }
  },
  deselectAll: () => set({ selectedLayerIds: [] }),
  setTool: (activeTool) => set({ activeTool }),

  // Document Mutations
  setDocument: (newDoc) => {
    history.pushState(newDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  setProjectName: (name) => {
    const doc = get().document;
    const nextDoc: SceneDocument = { ...doc, name };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  updateSettings: (settingsUpdates) => {
    const doc = get().document;
    const nextDoc: SceneDocument = {
      ...doc,
      settings: { ...doc.settings, ...settingsUpdates },
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  addScreen: (customScreen) => {
    const doc = get().document;
    const newId = `screen_${Date.now()}`;
    const newScreen: Screen = {
      id: newId,
      name: `Screen ${doc.screens.length + 1}`,
      duration: 5.0,
      layers: [],
      ...customScreen,
    };
    const nextDoc: SceneDocument = {
      ...doc,
      screens: [...doc.screens, newScreen],
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      activeScreenId: newId,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  updateScreen: (screenId, updates) => {
    const doc = get().document;
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === screenId ? { ...s, ...updates } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  deleteScreen: (screenId) => {
    const doc = get().document;
    if (doc.screens.length <= 1) return; // Must have at least 1 screen
    const nextScreens = doc.screens.filter((s) => s.id !== screenId);
    const nextDoc: SceneDocument = { ...doc, screens: nextScreens };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      activeScreenId: nextScreens[0].id,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  duplicateScreen: (screenId) => {
    const doc = get().document;
    const screenToCopy = doc.screens.find((s) => s.id === screenId);
    if (!screenToCopy) return;

    const newId = `screen_${Date.now()}`;
    const clonedLayers = JSON.parse(JSON.stringify(screenToCopy.layers));
    // Regenerate unique layer IDs
    const reassignIds = (layers: Layer[]): Layer[] =>
      layers.map((l) => ({
        ...l,
        id: `${l.id}_copy_${Math.random().toString(36).substring(2, 6)}`,
        ...(l.type === "group" ? { children: reassignIds(l.children) } : {}),
      }));

    const newScreen: Screen = {
      ...JSON.parse(JSON.stringify(screenToCopy)),
      id: newId,
      name: `${screenToCopy.name} (Copy)`,
      layers: reassignIds(clonedLayers),
    };

    const nextDoc: SceneDocument = {
      ...doc,
      screens: [...doc.screens, newScreen],
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      activeScreenId: newId,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  addLayer: (layer, targetGroupId) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        if (!targetGroupId) {
          return { ...screen, layers: [...screen.layers, layer] };
        }
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, targetGroupId, (group) => {
            if (group.type !== "group") return group;
            return {
              ...group,
              children: [...group.children, layer],
            };
          }),
        };
      }),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [layer.id],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  updateLayer: (layerId, updates) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, (layer) => {
            const isText = layer.type === "text" || layer.type === "chunk";
            const newContent = (updates as any).content;
            const shouldSyncName =
              isText &&
              typeof newContent === "string" &&
              (!layer.name || layer.name === (layer as any).content);
            return {
              ...layer,
              ...(shouldSyncName ? { name: newContent } : {}),
              ...updates,
            } as Layer;
          }),
        };
      }),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  updateLayerStyle: (layerId, styleUpdates) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, (layer) => ({
            ...layer,
            style: { ...layer.style, ...styleUpdates },
          } as Layer)),
        };
      }),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  updateLayerAnimation: (layerId, animUpdates, options) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const shouldRipple = options?.ripple ?? true;
    let shift = 0;
    let shiftMode: "in" | "out" | null = null;

    if (shouldRipple) {
      if (animUpdates.in && targetLayer.animation?.in) {
        const oldIn = targetLayer.animation.in;
        const newIn = animUpdates.in;
        if (
          newIn.duration !== undefined &&
          oldIn.duration !== undefined &&
          Math.abs(newIn.duration - oldIn.duration) > 0.001
        ) {
          shift = newIn.duration - oldIn.duration;
          shiftMode = "in";
        } else if (
          newIn.start !== undefined &&
          oldIn.start !== undefined &&
          Math.abs(newIn.start - oldIn.start) > 0.001
        ) {
          shift = newIn.start - oldIn.start;
          shiftMode = "in";
        }
      } else if (animUpdates.out && targetLayer.animation?.out) {
        const oldOut = targetLayer.animation.out;
        const newOut = animUpdates.out;
        if (
          newOut.duration !== undefined &&
          oldOut.duration !== undefined &&
          Math.abs(newOut.duration - oldOut.duration) > 0.001
        ) {
          shift = newOut.duration - oldOut.duration;
          shiftMode = "out";
        } else if (
          newOut.start !== undefined &&
          oldOut.start !== undefined &&
          Math.abs(newOut.start - oldOut.start) > 0.001
        ) {
          shift = newOut.start - oldOut.start;
          shiftMode = "out";
        }
      }
    }

    let mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const nextAnimation: LayerAnimation = { ...(layer.animation || {}), ...animUpdates };
      const baseClips = layer.animation?.clips ? [...layer.animation.clips] : getLayerClips(layer);

      if (animUpdates.in) {
        const inIdx = baseClips.findIndex((c) => c.type === "in");
        const inClip: AnimationClip = {
          id: animUpdates.in.id || (inIdx !== -1 ? baseClips[inIdx].id : `clip_in_${Date.now()}`),
          name: animUpdates.in.name || "Entrance",
          type: "in",
          preset: animUpdates.in.preset,
          start: animUpdates.in.start ?? 0,
          duration: animUpdates.in.duration ?? 0.6,
          easing: animUpdates.in.easing ?? "smooth",
          fillMode: animUpdates.in.fillMode ?? "both",
          direction: animUpdates.in.direction,
          intensity: animUpdates.in.intensity,
          springStiffness: animUpdates.in.springStiffness,
          springDamping: animUpdates.in.springDamping,
          springMass: animUpdates.in.springMass,
          scaleAmount: animUpdates.in.scaleAmount,
          distance: animUpdates.in.distance,
          rotationDegrees: animUpdates.in.rotationDegrees,
          splitBy: animUpdates.in.splitBy,
          staggerDelay: animUpdates.in.staggerDelay,
        };
        if (inIdx !== -1) {
          baseClips[inIdx] = inClip;
        } else {
          baseClips.unshift(inClip);
        }
      }
      if (animUpdates.out) {
        const outIdx = baseClips.findIndex((c) => c.type === "out");
        const outClip: AnimationClip = {
          id: animUpdates.out.id || (outIdx !== -1 ? baseClips[outIdx].id : `clip_out_${Date.now()}`),
          name: animUpdates.out.name || "Exit",
          type: "out",
          preset: animUpdates.out.preset,
          start: animUpdates.out.start ?? 0,
          duration: animUpdates.out.duration ?? 0.6,
          easing: animUpdates.out.easing ?? "smooth",
          fillMode: animUpdates.out.fillMode ?? "both",
          direction: animUpdates.out.direction,
          intensity: animUpdates.out.intensity,
          springStiffness: animUpdates.out.springStiffness,
          springDamping: animUpdates.out.springDamping,
          springMass: animUpdates.out.springMass,
          scaleAmount: animUpdates.out.scaleAmount,
          distance: animUpdates.out.distance,
          rotationDegrees: animUpdates.out.rotationDegrees,
          splitBy: animUpdates.out.splitBy,
          staggerDelay: animUpdates.out.staggerDelay,
        };
        if (outIdx !== -1) {
          baseClips[outIdx] = outClip;
        } else {
          baseClips.push(outClip);
        }
      }
      if (animUpdates.emphasis) {
        const empIdx = baseClips.findIndex((c) => c.type === "emphasis");
        const empClip: AnimationClip = {
          id: animUpdates.emphasis.id || (empIdx !== -1 ? baseClips[empIdx].id : `clip_emp_${Date.now()}`),
          name: animUpdates.emphasis.name || "Emphasis",
          type: "emphasis",
          preset: animUpdates.emphasis.preset,
          start: animUpdates.emphasis.start ?? 0,
          duration: animUpdates.emphasis.duration ?? 0.6,
          easing: animUpdates.emphasis.easing ?? "smooth",
          fillMode: animUpdates.emphasis.fillMode ?? "both",
          direction: animUpdates.emphasis.direction,
          intensity: animUpdates.emphasis.intensity,
          springStiffness: animUpdates.emphasis.springStiffness,
          springDamping: animUpdates.emphasis.springDamping,
          springMass: animUpdates.emphasis.springMass,
          scaleAmount: animUpdates.emphasis.scaleAmount,
          distance: animUpdates.emphasis.distance,
          rotationDegrees: animUpdates.emphasis.rotationDegrees,
          splitBy: animUpdates.emphasis.splitBy,
          staggerDelay: animUpdates.emphasis.staggerDelay,
          loop: animUpdates.emphasis.loop,
          loopCount: animUpdates.emphasis.loopCount,
        };
        if (empIdx !== -1) {
          baseClips[empIdx] = empClip;
        } else {
          baseClips.push(empClip);
        }
      }
      if (!animUpdates.clips && (animUpdates.in || animUpdates.out || animUpdates.emphasis)) {
        nextAnimation.clips = baseClips;
      }
      return {
        ...layer,
        animation: nextAnimation,
      } as Layer;
    });

    if (shiftMode && Math.abs(shift) > 0.001) {
      const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);
      if (parentGroup && parentGroup.autoLink !== false && parentGroup.children) {
        const targetIdx = parentGroup.children.findIndex((c) => c.id === layerId);
        if (targetIdx !== -1) {
          mutatedLayers = mutateLayerInTree(mutatedLayers, parentGroup.id, (group) => {
            if (group.type !== "group") return group;
            const updatedChildren = group.children.map((child, idx) => {
              if (idx <= targetIdx) return child;
              const childAnim = child.animation?.[shiftMode as "in" | "out"];
              if (!childAnim) return child;
              const nextStart = Math.max(
                0,
                Math.round((childAnim.start + shift) * 100) / 100
              );
              return {
                ...child,
                animation: {
                  ...child.animation,
                  [shiftMode as "in" | "out"]: {
                    ...childAnim,
                    start: nextStart,
                  },
                },
              };
            });
            return { ...group, children: updatedChildren };
          });
        }
      }
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutatedLayers,
        };
      }),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  removeLayer: (layerId) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, () => null),
        };
      }),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: selectedLayerIds.filter((id) => id !== layerId),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  duplicateLayer: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const target = findLayerInTree(activeScreen.layers, layerId);
    if (!target) return;

    const newId = `${target.id}_copy_${Math.random().toString(36).substring(2, 6)}`;
    const cloned: Layer = JSON.parse(JSON.stringify(target));
    cloned.id = newId;
    cloned.name = `${target.name} (Copy)`;
    cloned.style.x = (cloned.style.x || 0) + 30;
    cloned.style.y = (cloned.style.y || 0) + 30;

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: [...s.layers, cloned] } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [newId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  duplicateLayerInPlace: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return layerId;
    const target = findLayerInTree(activeScreen.layers, layerId);
    if (!target) return layerId;

    const newId = `${target.id}_copy_${Math.random().toString(36).substring(2, 6)}`;
    const cloned: Layer = JSON.parse(JSON.stringify(target));
    cloned.id = newId;
    cloned.name = `${target.name} (Copy)`;

    const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);
    let nextLayers: Layer[];
    if (parentGroup) {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (group) => {
        if (group.type !== "group") return group;
        return {
          ...group,
          children: [...group.children, cloned],
        };
      });
    } else {
      nextLayers = [...activeScreen.layers, cloned];
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [newId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
    return newId;
  },

  nestLayerInGroup: (layerId, targetGroupId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const layer = findLayerInTree(activeScreen.layers, layerId);
    if (!layer || layerId === targetGroupId) return;

    // Remove from existing location, append to target group
    const withoutLayer = mutateLayerInTree(activeScreen.layers, layerId, () => null);
    const withLayerInGroup = mutateLayerInTree(
      withoutLayer,
      targetGroupId,
      (group) => {
        if (group.type !== "group") return group;
        return {
          ...group,
          children: [...group.children, layer],
        };
      }
    );

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: withLayerInGroup } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  ungroup: (groupId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const group = findLayerInTree(activeScreen.layers, groupId) as GroupLayer | null;
    if (!group || group.type !== "group") return;

    // Hoist children to the parent level with absolute positions adjusted
    const childrenToHoist = group.children.map((c) => ({
      ...c,
      style: {
        ...c.style,
        x: (group.style.x || 0) + (c.style.x || 0),
        y: (group.style.y || 0) + (c.style.y || 0),
      },
    }));

    // Replace group with its children in root layers
    const nextLayers = activeScreen.layers.flatMap((l) =>
      l.id === groupId ? childrenToHoist : [l]
    );

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: childrenToHoist.map((c) => c.id),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  reorderLayer: (sourceId, targetId, position) => {
    if (sourceId === targetId) return;
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const sourceLayer = findLayerInTree(activeScreen.layers, sourceId);
    if (!sourceLayer) return;

    // Calculate world coordinates of source before removal
    const oldParent = findParentGroupInTree(activeScreen.layers, sourceId);
    const oldWorldX = (oldParent?.style.x || 0) + (sourceLayer.style.x || 0);
    const oldWorldY = (oldParent?.style.y || 0) + (sourceLayer.style.y || 0);

    // Calculate new parent coordinates
    let targetGroup: GroupLayer | null = null;
    if (position === "inside") {
      const target = findLayerInTree(activeScreen.layers, targetId);
      if (target?.type === "group") targetGroup = target as GroupLayer;
    } else {
      targetGroup = findParentGroupInTree(activeScreen.layers, targetId);
    }

    // Normalize position to new container origin
    const newLocalX = targetGroup ? oldWorldX - (targetGroup.style.x || 0) : oldWorldX;
    const newLocalY = targetGroup ? oldWorldY - (targetGroup.style.y || 0) : oldWorldY;

    const adjustedSourceLayer: Layer = {
      ...sourceLayer,
      style: {
        ...sourceLayer.style,
        x: Math.round(newLocalX),
        y: Math.round(newLocalY),
      },
    };

    // Remove source from existing position
    const withoutSource = mutateLayerInTree(activeScreen.layers, sourceId, () => null);

    // Insert source relative to target
    const { updated: withSourcePlaced, inserted } = insertLayerRelativeInTree(
      withoutSource,
      targetId,
      adjustedSourceLayer,
      position
    );

    if (!inserted) return;

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: withSourcePlaced } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [sourceId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  bringToFront: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l) => l.id === layerId);
    if (idx === -1 || idx === containerList.length - 1) return;

    const item = containerList[idx];
    const reordered = [...containerList.slice(0, idx), ...containerList.slice(idx + 1), item];

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  sendToBack: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l) => l.id === layerId);
    if (idx <= 0) return;

    const item = containerList[idx];
    const reordered = [item, ...containerList.slice(0, idx), ...containerList.slice(idx + 1)];

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  bringForward: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l) => l.id === layerId);
    if (idx === -1 || idx === containerList.length - 1) return;

    const reordered = [...containerList];
    const temp = reordered[idx];
    reordered[idx] = reordered[idx + 1];
    reordered[idx + 1] = temp;

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  sendBackward: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l) => l.id === layerId);
    if (idx <= 0) return;

    const reordered = [...containerList];
    const temp = reordered[idx];
    reordered[idx] = reordered[idx - 1];
    reordered[idx - 1] = temp;

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  groupSelection: () => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen || selectedLayerIds.length === 0) return;

    const selectedLayers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    if (selectedLayers.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedLayers.forEach((l) => {
      const el = typeof document !== "undefined" ? document.getElementById(`layer-${l.id}`) : null;
      const x = l.style.x || 0;
      const y = l.style.y || 0;
      const w = typeof l.style.width === "number" ? l.style.width : (el && el.offsetWidth > 0 ? el.offsetWidth : 200);
      const h = typeof l.style.height === "number" ? l.style.height : (el && el.offsetHeight > 0 ? el.offsetHeight : 60);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    if (!isFinite(minX)) minX = 100;
    if (!isFinite(minY)) minY = 100;
    if (!isFinite(maxX)) maxX = 500;
    if (!isFinite(maxY)) maxY = 300;

    const newGroupId = `group_${Date.now()}`;
    const newGroup: GroupLayer = {
      id: newGroupId,
      name: "Group",
      type: "group",
      layout: {
        display: "none",
        flexDirection: "column",
        gap: 0,
        align: "start",
      },
      autoFit: false,
      autoLink: false,
      staggerDelay: 0.15,
      style: {
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(Math.round(maxX - minX), 10),
        height: Math.max(Math.round(maxY - minY), 10),
        rotation: 0,
        opacity: 1,
      },
      children: selectedLayers.map((l) => ({
        ...l,
        style: {
          ...l.style,
          x: Math.round((l.style.x || 0) - minX),
          y: Math.round((l.style.y || 0) - minY),
        },
      })),
    };

    const firstIdx = activeScreen.layers.findIndex((l) => selectedLayerIds.includes(l.id));
    let cleanedLayers = activeScreen.layers;
    for (const id of selectedLayerIds) {
      cleanedLayers = mutateLayerInTree(cleanedLayers, id, () => null);
    }
    const insertIdx = firstIdx !== -1 ? Math.min(firstIdx, cleanedLayers.length) : cleanedLayers.length;
    const nextLayers = [
      ...cleanedLayers.slice(0, insertIdx),
      newGroup,
      ...cleanedLayers.slice(insertIdx),
    ];

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [newGroupId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  splitTextRange: (layerId, start, end) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || (targetLayer.type !== "text" && targetLayer.type !== "chunk")) return;

    const fullContent = (targetLayer as any).content || "";
    if (start < 0) start = 0;
    if (end > fullContent.length) end = fullContent.length;
    if (start >= end) return;

    const prefix = fullContent.slice(0, start);
    const selected = fullContent.slice(start, end);
    const suffix = fullContent.slice(end);
    let remainder = "";
    if (prefix && suffix) {
      remainder = `${prefix.trimEnd()} ${suffix.trimStart()}`;
    } else if (prefix) {
      remainder = prefix.trim();
    } else if (suffix) {
      remainder = suffix.trim();
    }

    const baseStyle = { ...targetLayer.style };
    const chunks: Layer[] = [];

    // 1. First element: what was selected
    const selectedChunkId = `chunk_${Date.now()}_sel`;
    chunks.push({
      id: selectedChunkId,
      name: selected.trim() || "Selection",
      type: "chunk" as const,
      content: selected,
      style: {
        ...baseStyle,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        color: THEME_TOKENS.accent.primary,
        fontWeight: 700,
      },
      animation: { in: { preset: "pop", start: 0, duration: 0.6, easing: "bouncy" } },
    } as any);

    // 2. Second element: everything that wasn't selected (the remainder)
    const remainderChunkId = `chunk_${Date.now()}_rem`;
    chunks.push({
      id: remainderChunkId,
      name: remainder || "Remainder",
      type: "chunk" as const,
      content: remainder,
      style: {
        ...baseStyle,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
      },
      animation: { in: { preset: "pop", start: 0.15, duration: 0.6, easing: "bouncy" } },
    } as any);

    const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);

    let nextLayers: Layer[];
    if (parentGroup) {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (group) => {
        if (group.type !== "group") return group;
        const newChildren: Layer[] = [];
        for (const child of group.children) {
          if (child.id === layerId) {
            newChildren.push(...chunks);
          } else {
            newChildren.push(child);
          }
        }
        return { ...group, children: newChildren };
      });
    } else {
      const newGroupId = `group_text_${Date.now()}`;
      const newGroup: GroupLayer = {
        id: newGroupId,
        name: targetLayer.name || "Text Group",
        type: "group",
        layout: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          align: "center",
        },
        autoFit: true,
        autoLink: true,
        staggerDelay: 0.15,
        style: {
          ...baseStyle,
          width: "auto",
          height: "auto",
        },
        children: chunks,
      };

      nextLayers = activeScreen.layers.map((l) => (l.id === layerId ? newGroup : l));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [selectedChunkId],
      editingLayerId: null,
      activeTextSelection: null,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  splitTextAtCaret: (layerId, index) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || (targetLayer.type !== "text" && targetLayer.type !== "chunk")) return;

    const fullContent = (targetLayer as any).content || "";
    if (index <= 0 || index >= fullContent.length) return;

    get().splitTextRange(layerId, 0, index);
  },

  mergeChunkWithPrevious: (chunkId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const parentGroup = findParentGroupInTree(activeScreen.layers, chunkId);
    if (!parentGroup) return;

    const chunkIdx = parentGroup.children.findIndex((c) => c.id === chunkId);
    if (chunkIdx <= 0) return;

    const prevChunk = parentGroup.children[chunkIdx - 1];
    const targetChunk = parentGroup.children[chunkIdx];

    const mergedContent =
      ((prevChunk as any).content || "") + ((targetChunk as any).content || "");

    const newChildren = parentGroup.children
      .filter((c) => c.id !== chunkId)
      .map((c) => (c.id === prevChunk.id ? { ...c, content: mergedContent } : c));

    let nextLayers: Layer[];
    if (newChildren.length === 1) {
      const soleChild: Layer = {
        ...newChildren[0],
        type: newChildren[0].type === "chunk" ? ("text" as const) : newChildren[0].type,
        style: {
          ...newChildren[0].style,
          x: (parentGroup.style.x || 0) + (newChildren[0].style.x || 0),
          y: (parentGroup.style.y || 0) + (newChildren[0].style.y || 0),
        },
      } as any;
      nextLayers = activeScreen.layers.map((l) => (l.id === parentGroup.id ? soleChild : l));
    } else {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (g) => ({
        ...g,
        children: newChildren,
      }));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [prevChunk.id],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  mergeChunkWithNext: (chunkId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const parentGroup = findParentGroupInTree(activeScreen.layers, chunkId);
    if (!parentGroup) return;

    const chunkIdx = parentGroup.children.findIndex((c) => c.id === chunkId);
    if (chunkIdx === -1 || chunkIdx >= parentGroup.children.length - 1) return;

    const targetChunk = parentGroup.children[chunkIdx];
    const nextChunk = parentGroup.children[chunkIdx + 1];

    const mergedContent =
      ((targetChunk as any).content || "") + ((nextChunk as any).content || "");

    const newChildren = parentGroup.children
      .filter((c) => c.id !== nextChunk.id)
      .map((c) => (c.id === targetChunk.id ? { ...c, content: mergedContent } : c));

    let nextLayers: Layer[];
    if (newChildren.length === 1) {
      const soleChild: Layer = {
        ...newChildren[0],
        type: newChildren[0].type === "chunk" ? ("text" as const) : newChildren[0].type,
        style: {
          ...newChildren[0].style,
          x: (parentGroup.style.x || 0) + (newChildren[0].style.x || 0),
          y: (parentGroup.style.y || 0) + (newChildren[0].style.y || 0),
        },
      } as any;
      nextLayers = activeScreen.layers.map((l) => (l.id === parentGroup.id ? soleChild : l));
    } else {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (g) => ({
        ...g,
        children: newChildren,
      }));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: [targetChunk.id],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  // Spatial Alignment & Distribution
  alignSelectedLayers: (alignment, relativeTo) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    if (selectedLayerIds.length === 0) return;
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    if (layers.length === 0) return;

    const alignMode = relativeTo || (layers.length === 1 ? "canvas" : "selection");

    let refLeft = 0;
    let refRight = doc.settings.width;
    let refTop = 0;
    let refBottom = doc.settings.height;
    let refCenterX = doc.settings.width / 2;
    let refCenterY = doc.settings.height / 2;

    if (alignMode === "selection") {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const l of layers) {
        const lx = l.style.x ?? 0;
        const ly = l.style.y ?? 0;
        const lw = typeof l.style.width === "number" ? l.style.width : 100;
        const lh = typeof l.style.height === "number" ? l.style.height : 50;
        minX = Math.min(minX, lx);
        maxX = Math.max(maxX, lx + lw);
        minY = Math.min(minY, ly);
        maxY = Math.max(maxY, ly + lh);
      }

      refLeft = minX;
      refRight = maxX;
      refTop = minY;
      refBottom = maxY;
      refCenterX = (minX + maxX) / 2;
      refCenterY = (minY + maxY) / 2;
    }

    let mutatedLayers = activeScreen.layers;

    for (const l of layers) {
      const lw = typeof l.style.width === "number" ? l.style.width : 100;
      const lh = typeof l.style.height === "number" ? l.style.height : 50;
      let newX = l.style.x ?? 0;
      let newY = l.style.y ?? 0;

      switch (alignment) {
        case "left":
          newX = refLeft;
          break;
        case "center":
          newX = Math.round(refCenterX - lw / 2);
          break;
        case "right":
          newX = refRight - lw;
          break;
        case "top":
          newY = refTop;
          break;
        case "middle":
          newY = Math.round(refCenterY - lh / 2);
          break;
        case "bottom":
          newY = refBottom - lh;
          break;
      }

      mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
        ...layer,
        style: {
          ...layer.style,
          x: newX,
          y: newY,
        },
      }));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  distributeSpacing: (direction) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    if (selectedLayerIds.length < 3) return;
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    if (layers.length < 3) return;

    let mutatedLayers = activeScreen.layers;

    if (direction === "horizontal") {
      const sorted = [...layers].sort((a, b) => (a.style.x ?? 0) - (b.style.x ?? 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const firstLeft = first.style.x ?? 0;
      const lastLeft = last.style.x ?? 0;
      const lastWidth = typeof last.style.width === "number" ? last.style.width : 100;
      const totalSpan = lastLeft + lastWidth - firstLeft;

      let totalElementsWidth = 0;
      for (const l of sorted) {
        totalElementsWidth += typeof l.style.width === "number" ? l.style.width : 100;
      }

      const totalGap = totalSpan - totalElementsWidth;
      const gapCount = sorted.length - 1;

      if (totalGap >= 0 && gapCount > 0) {
        const gap = totalGap / gapCount;
        let curX = firstLeft;
        for (let i = 0; i < sorted.length; i++) {
          const l = sorted[i];
          const lw = typeof l.style.width === "number" ? l.style.width : 100;
          if (i > 0 && i < sorted.length - 1) {
            mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
              ...layer,
              style: { ...layer.style, x: Math.round(curX) },
            }));
          }
          curX += lw + gap;
        }
      } else {
        const firstCenter =
          firstLeft + (typeof first.style.width === "number" ? first.style.width : 100) / 2;
        const lastCenter = lastLeft + lastWidth / 2;
        const step = (lastCenter - firstCenter) / (sorted.length - 1);

        for (let i = 1; i < sorted.length - 1; i++) {
          const l = sorted[i];
          const lw = typeof l.style.width === "number" ? l.style.width : 100;
          const targetCenter = firstCenter + step * i;
          mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
            ...layer,
            style: { ...layer.style, x: Math.round(targetCenter - lw / 2) },
          }));
        }
      }
    } else {
      const sorted = [...layers].sort((a, b) => (a.style.y ?? 0) - (b.style.y ?? 0));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const firstTop = first.style.y ?? 0;
      const lastTop = last.style.y ?? 0;
      const lastHeight = typeof last.style.height === "number" ? last.style.height : 50;
      const totalSpan = lastTop + lastHeight - firstTop;

      let totalElementsHeight = 0;
      for (const l of sorted) {
        totalElementsHeight += typeof l.style.height === "number" ? l.style.height : 50;
      }

      const totalGap = totalSpan - totalElementsHeight;
      const gapCount = sorted.length - 1;

      if (totalGap >= 0 && gapCount > 0) {
        const gap = totalGap / gapCount;
        let curY = firstTop;
        for (let i = 0; i < sorted.length; i++) {
          const l = sorted[i];
          const lh = typeof l.style.height === "number" ? l.style.height : 50;
          if (i > 0 && i < sorted.length - 1) {
            mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
              ...layer,
              style: { ...layer.style, y: Math.round(curY) },
            }));
          }
          curY += lh + gap;
        }
      } else {
        const firstCenter =
          firstTop + (typeof first.style.height === "number" ? first.style.height : 50) / 2;
        const lastCenter = lastTop + lastHeight / 2;
        const step = (lastCenter - firstCenter) / (sorted.length - 1);

        for (let i = 1; i < sorted.length - 1; i++) {
          const l = sorted[i];
          const lh = typeof l.style.height === "number" ? l.style.height : 50;
          const targetCenter = firstCenter + step * i;
          mutatedLayers = mutateLayerInTree(mutatedLayers, l.id, (layer) => ({
            ...layer,
            style: { ...layer.style, y: Math.round(targetCenter - lh / 2) },
          }));
        }
      }
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  tidyUpSelection: () => {
    const { document: doc, activeScreenId, selectedLayerIds, distributeSpacing, alignSelectedLayers } = get();
    if (selectedLayerIds.length < 2) return;
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const l of layers) {
      const lx = l.style.x ?? 0;
      const ly = l.style.y ?? 0;
      const lw = typeof l.style.width === "number" ? l.style.width : 100;
      const lh = typeof l.style.height === "number" ? l.style.height : 50;
      minX = Math.min(minX, lx);
      maxX = Math.max(maxX, lx + lw);
      minY = Math.min(minY, ly);
      maxY = Math.max(maxY, ly + lh);
    }

    const spanX = maxX - minX;
    const spanY = maxY - minY;

    if (spanX >= spanY) {
      distributeSpacing("horizontal");
      alignSelectedLayers("middle", "selection");
    } else {
      distributeSpacing("vertical");
      alignSelectedLayers("center", "selection");
    }
  },

  // Timeline Clip Selection
  selectedClipIds: [],
  setSelectedClips: (ids) => set({ selectedClipIds: ids }),
  toggleClipSelection: (id, isMulti) => {
    const { selectedClipIds } = get();
    if (isMulti) {
      if (selectedClipIds.includes(id)) {
        set({ selectedClipIds: selectedClipIds.filter((x) => x !== id) });
      } else {
        set({ selectedClipIds: [...selectedClipIds, id] });
      }
    } else {
      set({ selectedClipIds: [id] });
    }
  },

  // Work Area Loop Region
  workArea: null,
  setWorkArea: (workArea) => set({ workArea }),
  setWorkAreaStart: (time) => {
    const { workArea, document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    const maxDuration = screen?.duration || doc.settings.duration || 5.0;
    const clamped = Math.max(0, Math.min(time, maxDuration));
    const end = workArea ? Math.max(clamped + 0.1, workArea.end) : maxDuration;
    set({ workArea: { start: clamped, end } });
  },
  setWorkAreaEnd: (time) => {
    const { workArea, document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    const maxDuration = screen?.duration || doc.settings.duration || 5.0;
    const clamped = Math.max(0.1, Math.min(time, maxDuration));
    const start = workArea ? Math.min(clamped - 0.1, workArea.start) : 0;
    set({ workArea: { start, end: clamped } });
  },

  // Document Palette Actions
  addPaletteColor: (color) => {
    const doc = get().document;
    const curPalette = doc.settings.palette || [
      "#000000",
      "#ffffff",
      "#e8c547",
      "#f5f0e8",
      "#ef4444",
      "#34d399",
      "#60a5fa",
      "#a855f7",
    ];
    if (curPalette.some((c) => c.toLowerCase() === color.toLowerCase())) return;
    const nextPalette = [color, ...curPalette].slice(0, 16);
    get().updateSettings({ palette: nextPalette });
  },
  removePaletteColor: (color) => {
    const doc = get().document;
    const curPalette = doc.settings.palette || [];
    const nextPalette = curPalette.filter((c) => c.toLowerCase() !== color.toLowerCase());
    get().updateSettings({ palette: nextPalette });
  },

  // Reactive Element Bindings
  addLayerBinding: (layerId, binding) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = layer.bindings || [];
      return {
        ...layer,
        bindings: [...existing, binding],
      };
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  updateLayerBinding: (layerId, bindingId, patch) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = layer.bindings || [];
      return {
        ...layer,
        bindings: existing.map((b) => (b.id === bindingId ? { ...b, ...patch } : b)),
      };
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  removeLayerBinding: (layerId, bindingId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = layer.bindings || [];
      return {
        ...layer,
        bindings: existing.filter((b) => b.id !== bindingId),
      };
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  razorSplitLayer: (layerId, time) => {
    const { document: doc, activeScreenId, currentTime } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return { updatedLayers: [], headClipId: null, tailClipId: null, didSplit: false };

    const cutTime = time ?? currentTime;
    const splitResult = splitLayerAtPlayhead(activeScreen.layers, layerId, cutTime);

    if (!splitResult.didSplit) {
      return splitResult;
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: splitResult.updatedLayers } : s
      ),
    };

    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedLayerIds: splitResult.tailClipId ? [splitResult.tailClipId] : [layerId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });

    return splitResult;
  },

  sendTo3D: () => {
    set({ uiMode: "3d" });
  },

  sendToEditor: () => {
    set({ uiMode: "editor" });
  },

  loadDocument: (doc) => {
    history.pushState(doc);
    set({
      document: history.getPresent(),
      activeScreenId: doc.screens[0]?.id || "screen_1",
      selectedLayerIds: [],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  resetProject: () => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_DOC_KEY);
      } catch {
        // ignore
      }
    }
    history.pushState(INITIAL_SCENE);
    set({
      document: history.getPresent(),
      activeScreenId: INITIAL_SCENE.screens[0]?.id || "screen_1",
      selectedLayerIds: [],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  addAnimationClip: (layerId, clipData) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return "";
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return "";

    const currentClips = getLayerClips(targetLayer);
    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newClip: AnimationClip = {
      id: newClipId,
      name: clipData.name || (clipData.preset ? `${clipData.preset}` : "Animation"),
      type: clipData.type || "action",
      preset: clipData.preset || "pulse",
      start:
        clipData.start ??
        (currentClips.length > 0
          ? Math.max(...currentClips.map((c) => c.start + c.duration))
          : 0),
      duration: clipData.duration ?? 0.6,
      easing: clipData.easing || "smooth",
      fillMode: clipData.fillMode || "both",
      direction: clipData.direction,
      intensity: clipData.intensity ?? 1,
      springStiffness: clipData.springStiffness,
      springDamping: clipData.springDamping,
      springMass: clipData.springMass,
      scaleAmount: clipData.scaleAmount,
      distance: clipData.distance,
      rotationDegrees: clipData.rotationDegrees,
      splitBy: clipData.splitBy,
      staggerDelay: clipData.staggerDelay,
      loop: clipData.loop,
      loopCount: clipData.loopCount,
    };

    const nextClips = [...currentClips, newClip].sort((a, b) => a.start - b.start);

    // Sync legacy single slots if applicable
    const animPatch: Partial<LayerAnimation> = {
      clips: nextClips,
    };
    if (newClip.type === "in" && !currentClips.some((c) => c.type === "in")) {
      animPatch.in = newClip;
    } else if (newClip.type === "out" && !currentClips.some((c) => c.type === "out")) {
      animPatch.out = newClip;
    } else if (newClip.type === "emphasis" && !currentClips.some((c) => c.type === "emphasis")) {
      animPatch.emphasis = newClip;
    }

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), ...animPatch },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedClipIds: [newClipId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
    return newClipId;
  },

  updateAnimationClip: (layerId, clipId, updates, options) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const targetClip = currentClips.find((c) => c.id === clipId);
    if (!targetClip) return;

    const shouldRipple = options?.ripple ?? false;
    let shift = 0;
    if (shouldRipple && updates.duration !== undefined && targetClip.duration !== undefined) {
      shift = updates.duration - targetClip.duration;
    } else if (shouldRipple && updates.start !== undefined && targetClip.start !== undefined) {
      shift = updates.start - targetClip.start;
    }

    const nextClips = currentClips
      .map((clip) => {
        if (clip.id === clipId) {
          return { ...clip, ...updates };
        }
        if (shouldRipple && Math.abs(shift) > 0.001 && clip.start > targetClip.start) {
          return {
            ...clip,
            start: Math.max(0, Math.round((clip.start + shift) * 100) / 100),
          };
        }
        return clip;
      })
      .sort((a, b) => a.start - b.start);

    // Sync legacy single slots
    const updatedTarget = nextClips.find((c) => c.id === clipId);
    const animPatch: Partial<LayerAnimation> = {
      clips: nextClips,
    };
    if (updatedTarget?.type === "in") {
      animPatch.in = updatedTarget;
    } else if (updatedTarget?.type === "out") {
      animPatch.out = updatedTarget;
    } else if (updatedTarget?.type === "emphasis") {
      animPatch.emphasis = updatedTarget;
    }

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), ...animPatch },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  removeAnimationClip: (layerId, clipId) => {
    const { document: doc, activeScreenId, selectedClipIds } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const removingClip = currentClips.find((c) => c.id === clipId);
    const nextClips = currentClips.filter((c) => c.id !== clipId);

    const animPatch: Partial<LayerAnimation> = {
      clips: nextClips,
    };
    if (removingClip?.type === "in" || targetLayer.animation?.in?.id === clipId) {
      animPatch.in = undefined;
    }
    if (removingClip?.type === "out" || targetLayer.animation?.out?.id === clipId) {
      animPatch.out = undefined;
    }
    if (removingClip?.type === "emphasis" || targetLayer.animation?.emphasis?.id === clipId) {
      animPatch.emphasis = undefined;
    }

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = { ...(layer.animation || {}) };
      if (animPatch.in === undefined) delete existing.in;
      if (animPatch.out === undefined) delete existing.out;
      if (animPatch.emphasis === undefined) delete existing.emphasis;
      return {
        ...layer,
        animation: { ...existing, clips: nextClips },
      } as Layer;
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedClipIds: selectedClipIds.filter((id) => id !== clipId),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  duplicateAnimationClip: (layerId, clipId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return "";
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return "";

    const currentClips = getLayerClips(targetLayer);
    const targetClip = currentClips.find((c) => c.id === clipId);
    if (!targetClip) return "";

    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedClip: AnimationClip = {
      ...targetClip,
      id: newClipId,
      name: `${targetClip.name || targetClip.preset} (Copy)`,
      start: Math.round((targetClip.start + targetClip.duration + 0.1) * 100) / 100,
    };

    const nextClips = [...currentClips, clonedClip].sort((a, b) => a.start - b.start);
    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), clips: nextClips },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedClipIds: [newClipId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
    return newClipId;
  },

  reorderAnimationClips: (layerId, orderedClipIds) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const sorted = [...currentClips].sort((a, b) => {
      const idxA = orderedClipIds.indexOf(a.id);
      const idxB = orderedClipIds.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), clips: sorted },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  splitAnimationClip: (layerId, clipId, splitTime) => {
    const { document: doc, activeScreenId, currentTime } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const targetClip = currentClips.find((c) => c.id === clipId);
    if (!targetClip) return;

    const t = splitTime ?? currentTime;
    if (t <= targetClip.start + 0.05 || t >= targetClip.start + targetClip.duration - 0.05) {
      return;
    }

    const dur1 = Math.round((t - targetClip.start) * 100) / 100;
    const dur2 = Math.round((targetClip.duration - dur1) * 100) / 100;
    const newTailId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const headClip: AnimationClip = {
      ...targetClip,
      duration: dur1,
    };
    const tailClip: AnimationClip = {
      ...targetClip,
      id: newTailId,
      name: `${targetClip.name || targetClip.preset} (Part 2)`,
      start: t,
      duration: dur2,
    };

    const nextClips: AnimationClip[] = [];
    for (const c of currentClips) {
      if (c.id === clipId) {
        nextClips.push(headClip, tailClip);
      } else {
        nextClips.push(c);
      }
    }

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), clips: nextClips },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    history.pushState(nextDoc);
    set({
      document: history.getPresent(),
      selectedClipIds: [newTailId],
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },
}));

// Automatic LocalStorage Persistence for Document
if (
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined" &&
  process.env.NODE_ENV !== "test"
) {
  let prevDoc: SceneDocument | null = null;
  useProjectStore.subscribe((state) => {
    if (state.document !== prevDoc) {
      prevDoc = state.document;
      try {
        window.localStorage.setItem(STORAGE_DOC_KEY, JSON.stringify(state.document));
      } catch (e) {
        console.warn("Failed to auto-save scene to localStorage:", e);
      }
    }
  });
}

