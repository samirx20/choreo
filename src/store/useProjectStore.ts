import { create } from "zustand";
import {
  SceneDocument,
  Screen,
  Layer,
  GroupLayer,
  LayerStyle,
  LayerAnimation,
  ProjectSettings,
} from "@/types/scene";
import { TransactionalHistory } from "./history";
import { THEME_TOKENS } from "@/theme/tokens";

export const INITIAL_SCENE: SceneDocument = {
  version: "1.0",
  name: "Motion Studio Teaser",
  settings: {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 5.0,
    backgroundColor: THEME_TOKENS.surfaces.appBackground,
  },
  screens: [
    {
      id: "screen_1",
      name: "Hook Scene",
      duration: 5.0,
      layers: [
        {
          id: "group_hero",
          name: "Hero Card",
          type: "group",
          layout: {
            display: "flex",
            flexDirection: "column",
            gap: 20,
            align: "center",
            justifyContent: "center",
          },
          autoFit: true,
          autoLink: true,
          staggerDelay: 0.15,
          style: {
            x: 560,
            y: 340,
            width: 800,
            height: "auto",
            rotation: 0,
            opacity: 1,
            backgroundColor: THEME_TOKENS.surfaces.panelBackground,
            padding: 48,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: THEME_TOKENS.surfaces.border,
            shadows: [
              {
                x: 0,
                y: 25,
                blur: 50,
                spread: -10,
                color: "rgba(0,0,0,0.8)",
              },
            ],
          },
          children: [
            {
              id: "chunk_1",
              name: "Hey Team,",
              type: "text",
              content: "Hey Team,",
              style: {
                x: 0,
                y: 0,
                width: "auto",
                height: "auto",
                rotation: 0,
                opacity: 1,
                fontSize: 68,
                fontWeight: 800,
                fontFamily: "Inter",
                color: THEME_TOKENS.typography.headingColor,
                textAlign: "center",
                lineHeight: 1.1,
              },
              animation: {
                in: {
                  preset: "pop",
                  start: 0.0,
                  duration: 0.6,
                  easing: "bouncy",
                },
              },
            },
            {
              id: "chunk_2",
              name: "I've got something big",
              type: "text",
              content: "I've got something big for you all,",
              style: {
                x: 0,
                y: 0,
                width: "auto",
                height: "auto",
                rotation: 0,
                opacity: 1,
                fontSize: 54,
                fontWeight: 800,
                fontFamily: "Inter",
                color: THEME_TOKENS.typography.subheadingColor,
                textAlign: "center",
                lineHeight: 1.1,
              },
              animation: {
                in: {
                  preset: "slideUp",
                  start: 0.8,
                  duration: 0.6,
                  easing: "smooth",
                },
              },
            },
            {
              id: "chunk_3",
              name: "wanna see what it is?",
              type: "text",
              content: "wanna see what it is?",
              style: {
                x: 0,
                y: 0,
                width: "auto",
                height: "auto",
                rotation: 0,
                opacity: 1,
                fontSize: 54,
                fontWeight: 800,
                fontFamily: "Inter",
                color: THEME_TOKENS.typography.accentTextColor,
                textAlign: "center",
                lineHeight: 1.1,
              },
              animation: {
                in: {
                  preset: "blurIn",
                  start: 1.6,
                  duration: 0.8,
                  easing: "smooth",
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

const history = new TransactionalHistory(INITIAL_SCENE);

export interface ProjectStoreState {
  document: SceneDocument;
  activeScreenId: string;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  activeTextSelection: { layerId: string; start: number; end: number; text: string } | null;
  uiMode: "design" | "animate";
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
  setUiMode: (mode: "design" | "animate") => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  selectScreen: (screenId: string) => void;
  selectLayer: (layerId: string, multi?: boolean) => void;
  deselectAll: () => void;
  setEditingLayerId: (id: string | null) => void;
  setActiveTextSelection: (sel: { layerId: string; start: number; end: number; text: string } | null) => void;

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
    animUpdates: Partial<LayerAnimation>
  ) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  nestLayerInGroup: (layerId: string, targetGroupId: string) => void;
  ungroup: (groupId: string) => void;
  reorderLayer: (sourceId: string, targetId: string, position: "before" | "after" | "inside") => void;
  groupSelection: () => void;
  splitTextRange: (layerId: string, start: number, end: number) => void;
  splitTextAtCaret: (layerId: string, index: number) => void;
  mergeChunkWithPrevious: (chunkId: string) => void;
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

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  document: history.getPresent(),
  activeScreenId: "screen_1",
  selectedLayerIds: ["group_hero"],
  editingLayerId: null,
  activeTextSelection: null,
  uiMode: "design",
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  canUndo: false,
  canRedo: false,

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
  setUiMode: (uiMode) => set({ uiMode }),
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

  updateLayerAnimation: (layerId, animUpdates) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, (layer) => ({
            ...layer,
            animation: { ...(layer.animation || {}), ...animUpdates },
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

    // Remove source from existing position
    const withoutSource = mutateLayerInTree(activeScreen.layers, sourceId, () => null);

    // Insert source relative to target
    const { updated: withSourcePlaced, inserted } = insertLayerRelativeInTree(
      withoutSource,
      targetId,
      sourceLayer,
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
      const x = l.style.x || 0;
      const y = l.style.y || 0;
      const w = typeof l.style.width === "number" ? l.style.width : 200;
      const h = typeof l.style.height === "number" ? l.style.height : 60;
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
        display: "flex",
        flexDirection: "column",
        gap: 12,
        align: "start",
      },
      autoFit: true,
      autoLink: true,
      staggerDelay: 0.15,
      style: {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 100),
        height: Math.max(maxY - minY, 60),
        rotation: 0,
        opacity: 1,
      },
      children: selectedLayers.map((l) => ({
        ...l,
        style: {
          ...l.style,
          x: (l.style.x || 0) - minX,
          y: (l.style.y || 0) - minY,
        },
      })),
    };

    let cleanedLayers = activeScreen.layers;
    for (const id of selectedLayerIds) {
      cleanedLayers = mutateLayerInTree(cleanedLayers, id, () => null);
    }

    const nextLayers = [...cleanedLayers, newGroup];

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

    const baseStyle = { ...targetLayer.style };
    const chunks: Layer[] = [];

    if (prefix.length > 0) {
      chunks.push({
        id: `chunk_${Date.now()}_1`,
        name: prefix.trim() || "Prefix",
        type: "chunk" as const,
        content: prefix,
        style: { ...baseStyle, x: 0, y: 0, width: "auto", height: "auto" },
        animation: { in: { preset: "fadeIn", start: 0, duration: 0.5, easing: "smooth" } },
      } as any);
    }

    const selectedChunkId = `chunk_${Date.now()}_2`;
    chunks.push({
      id: selectedChunkId,
      name: selected.trim() || "Highlight",
      type: "chunk" as const,
      content: selected,
      style: {
        ...baseStyle,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        color: THEME_TOKENS.accent.primary,
        fontWeight: 800,
      },
      animation: { in: { preset: "pop", start: 0.2, duration: 0.6, easing: "bouncy" } },
    } as any);

    if (suffix.length > 0) {
      chunks.push({
        id: `chunk_${Date.now()}_3`,
        name: suffix.trim() || "Suffix",
        type: "chunk" as const,
        content: suffix,
        style: { ...baseStyle, x: 0, y: 0, width: "auto", height: "auto" },
        animation: { in: { preset: "fadeIn", start: 0.4, duration: 0.5, easing: "smooth" } },
      } as any);
    }

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
        style: {
          ...newChildren[0].style,
          x: (parentGroup.style.x || 0) + (newChildren[0].style.x || 0),
          y: (parentGroup.style.y || 0) + (newChildren[0].style.y || 0),
        },
      };
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
}));
