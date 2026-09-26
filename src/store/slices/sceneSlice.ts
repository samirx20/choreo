import { ProjectStoreState } from "../types";
import { SceneDocument, Screen, Layer, DEFAULT_BACKGROUND_STYLE } from "@/types/scene";
import { history, commitDoc } from "../historyManager";
import { normalizeScreens, INITIAL_SCENE, STORAGE_DOC_KEY } from "../initialScene";

export type SceneSlice = Pick<
  ProjectStoreState,
  | "document"
  | "setDocument"
  | "setProjectName"
  | "updateSettings"
  | "addScreen"
  | "updateScreen"
  | "deleteScreen"
  | "duplicateScreen"
  | "addPaletteColor"
  | "removePaletteColor"
  | "loadDocument"
  | "resetProject"
>;

export const createSceneSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): SceneSlice => ({
  document: history.getPresent(),

  setDocument: (newDoc) => {
    const currentActiveId = get().activeScreenId;
    const exists = newDoc.screens?.some((s) => s.id === currentActiveId);
    const newActiveId = exists ? currentActiveId : (newDoc.screens?.[0]?.id ?? "");
    commitDoc(set, newDoc, { activeScreenId: newActiveId });
  },

  setProjectName: (name) => {
    const doc = get().document;
    const nextDoc: SceneDocument = { ...doc, name };
    commitDoc(set, nextDoc);
  },

  updateSettings: (settingsUpdates) => {
    const doc = get().document;
    const nextDoc: SceneDocument = normalizeScreens({
      ...doc,
      settings: { ...doc.settings, ...settingsUpdates },
    });
    commitDoc(set, nextDoc);
  },

  addScreen: (customScreen) => {
    const doc = get().document;
    const newId = `screen_${Date.now()}`;
    const rightmostX = doc.screens.reduce((max, s, i) => {
      const sx = s.x ?? (i * ((s.width ?? doc.settings.width) + 120));
      const sw = s.width ?? doc.settings.width;
      return Math.max(max, sx + sw);
    }, 0);
    const defaultX = rightmostX > 0 ? rightmostX + 120 : 0;
    const lastScreen = doc.screens[doc.screens.length - 1];
    const inheritedBg = lastScreen?.background?.fill ?? lastScreen?.backgroundColor ?? doc.settings?.backgroundColor ?? "#ffffff";
    const newScreen: Screen = {
      id: newId,
      name: `Scene ${doc.screens.length + 1}`,
      duration: 5.0,
      layers: [],
      background: customScreen?.background ?? (inheritedBg !== "transparent" ? {
        id: `bg_${newId}`,
        name: "Background",
        type: "background",
        fill: inheritedBg,
        fillType: inheritedBg.includes("gradient") ? "linear-gradient" : "solid",
        style: { ...DEFAULT_BACKGROUND_STYLE },
      } : null),
      backgroundColor: customScreen?.backgroundColor ?? inheritedBg,
      x: customScreen?.x ?? defaultX,
      y: customScreen?.y ?? 0,
      ...customScreen,
    };
    const nextDoc: SceneDocument = normalizeScreens({
      ...doc,
      screens: [...doc.screens, newScreen],
    });
    commitDoc(set, nextDoc, {
      activeScreenId: newId,
      selectedLayerIds: [],
    });
  },

  updateScreen: (screenId, updates) => {
    const doc = get().document;
    const nextDoc: SceneDocument = normalizeScreens({
      ...doc,
      screens: doc.screens.map((s) => {
        if (s.id !== screenId) return s;
        const nextScreen = { ...s, ...updates };
        if (updates.backgroundColor !== undefined && updates.background === undefined) {
          if (updates.backgroundColor === "transparent") {
            nextScreen.background = null;
          } else {
            nextScreen.background = {
              id: s.background?.id || `bg_${s.id}`,
              name: "Background",
              type: "background",
              fill: updates.backgroundColor,
              fillType: updates.backgroundColor.includes("gradient") ? "linear-gradient" : "solid",
              style: s.background?.style || { ...DEFAULT_BACKGROUND_STYLE },
              animation: s.background?.animation,
            };
          }
        } else if (updates.background !== undefined && updates.backgroundColor === undefined) {
          nextScreen.backgroundColor = updates.background ? updates.background.fill : "transparent";
        }
        return nextScreen;
      }),
    });
    commitDoc(set, nextDoc);
  },

  deleteScreen: (screenId) => {
    const doc = get().document;
    if (doc.screens.length <= 1) return; // Must have at least 1 screen
    const targetIdx = doc.screens.findIndex((s) => s.id === screenId);
    const nextScreens = doc.screens.filter((s) => s.id !== screenId);
    const nextActiveId =
      get().activeScreenId === screenId
        ? nextScreens[Math.min(Math.max(0, targetIdx - 1), nextScreens.length - 1)].id
        : get().activeScreenId;
    const nextDoc: SceneDocument = normalizeScreens({ ...doc, screens: nextScreens });
    commitDoc(set, nextDoc, {
      activeScreenId: nextActiveId,
      selectedLayerIds: [],
      selectedClipIds: [],
      editingLayerId: null,
      activeTextSelection: null,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("motion-focus-screen", { detail: { screenId: nextActiveId } })
      );
    }
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
        ...(l.type === "group" || l.type === "frame"
          ? { children: reassignIds((l as any).children) }
          : {}),
      }));

    const rightmostX = doc.screens.reduce((max, s, i) => {
      const sx = s.x ?? (i * ((s.width ?? doc.settings.width) + 120));
      const sw = s.width ?? doc.settings.width;
      return Math.max(max, sx + sw);
    }, 0);
    const defaultX =
      rightmostX > 0
        ? rightmostX + 120
        : (screenToCopy.width ?? doc.settings.width) + 120;

    const newScreen: Screen = {
      ...JSON.parse(JSON.stringify(screenToCopy)),
      id: newId,
      name: `${screenToCopy.name} (Copy)`,
      layers: reassignIds(clonedLayers),
      x: defaultX,
      y: screenToCopy.y ?? 0,
    };

    const nextDoc: SceneDocument = normalizeScreens({
      ...doc,
      screens: [...doc.screens, newScreen],
    });
    commitDoc(set, nextDoc, {
      activeScreenId: newId,
      selectedLayerIds: [],
    });
  },

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
    const nextPalette = curPalette.filter(
      (c) => c.toLowerCase() !== color.toLowerCase()
    );
    get().updateSettings({ palette: nextPalette });
  },

  loadDocument: (doc) => {
    const normalized = normalizeScreens(doc);
    commitDoc(set, normalized, {
      activeScreenId: normalized.screens[0]?.id || "screen_1",
      selectedLayerIds: [],
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
    commitDoc(set, INITIAL_SCENE, {
      activeScreenId: INITIAL_SCENE.screens[0]?.id || "screen_1",
      selectedLayerIds: [],
    });
  },
});
