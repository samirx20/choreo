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

export const INITIAL_SCENE: SceneDocument = {
  version: "1.0",
  name: "Motion Studio Teaser",
  settings: {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 5.0,
    backgroundColor: "#09090b",
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
            backgroundColor: "#18181b",
            padding: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#27272a",
            shadows: [
              {
                x: 0,
                y: 25,
                blur: 50,
                spread: -10,
                color: "rgba(0,0,0,0.7)",
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
                color: "#FFFFFF",
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
                color: "#60A5FA",
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
                color: "#FACC15",
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
  uiMode: "design",
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  canUndo: false,
  canRedo: false,

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
}));
