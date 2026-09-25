import { ProjectStoreState, isMotionMode, ModeSavedState } from "../types";
import { history } from "../historyManager";
import { loadInitialTheme, STORAGE_THEME_KEY } from "../initialScene";
import { isLayerOnArtboard } from "../helpers/treeHelpers";

export type CanvasSlice = Pick<
  ProjectStoreState,
  | "zoom"
  | "pan"
  | "activeTool"
  | "uiMode"
  | "motionLayerIds"
  | "designModeState"
  | "animateModeState"
  | "canUndo"
  | "canRedo"
  | "theme"
  | "setPan"
  | "setZoom"
  | "setTool"
  | "setUiMode"
  | "sendScreenToMotion"
  | "setTheme"
  | "toggleTheme"
  | "startTransaction"
  | "commitTransaction"
  | "cancelTransaction"
  | "undo"
  | "redo"
>;

export const createCanvasSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): CanvasSlice => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  activeTool: "select",
  uiMode: "design",
  motionLayerIds: null,
  designModeState: null,
  animateModeState: null,
  canUndo: false,
  canRedo: false,
  theme: loadInitialTheme(),

  setPan: (panUpdate) => {
    set((state) => ({
      pan: typeof panUpdate === "function" ? panUpdate(state.pan) : panUpdate,
    }));
  },

  setZoom: (zoom) => set({ zoom }),
  setTool: (activeTool) => set({ activeTool }),

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
    history.cancelTransaction();
    set({
      document: history.getPresent(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  },

  undo: () => {
    const prev = history.undo();
    if (prev) {
      set({
        document: prev,
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

  // UI State Controls
  setUiMode: (uiMode) => {
    const nextMode = uiMode === "animate" ? "motion" : uiMode;
    const currentMode = get().uiMode;

    if (isMotionMode(currentMode) === isMotionMode(nextMode)) {
      if (currentMode !== nextMode) {
        set({ uiMode: nextMode });
      }
      return;
    }

    const {
      document: doc,
      activeScreenId,
      selectedLayerIds,
      selectedClipIds,
      activeTool,
      pan,
      zoom,
      currentTime,
      loopMode,
      designModeState,
      animateModeState,
    } = get();

    if (isMotionMode(nextMode)) {
      // Switching from Design -> Animate/Motion
      const savedDesign: ModeSavedState = {
        pan,
        zoom,
        activeScreenId,
        selectedLayerIds,
        activeTool,
      };

      if (animateModeState) {
        const validScreenId = doc.screens.some((s) => s.id === animateModeState.activeScreenId)
          ? animateModeState.activeScreenId
          : (doc.screens[0]?.id || activeScreenId);

        const validLayers = (animateModeState.selectedLayerIds || []).filter((id) =>
          doc.screens.some((s) => s.layers.some((l) => l.id === id))
        );

        const screen = doc.screens.find((s) => s.id === validScreenId) || doc.screens[0];
        const artboardLayers = screen
          ? screen.layers.filter((l) => isLayerOnArtboard(l, doc.settings.width, doc.settings.height))
          : [];

        set({
          uiMode: nextMode,
          designModeState: savedDesign,
          pan: animateModeState.pan,
          zoom: Math.max(1.0, animateModeState.zoom),
          activeScreenId: validScreenId,
          selectedLayerIds: validLayers,
          selectedClipIds: animateModeState.selectedClipIds || [],
          currentTime: animateModeState.currentTime ?? currentTime,
          loopMode: animateModeState.loopMode ?? loopMode,
          activeTool: "select",
          motionLayerIds: artboardLayers.map((l) => l.id),
          isPlaying: false,
        });
      } else {
        const screen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
        const artboardLayers = screen
          ? screen.layers.filter((l) => isLayerOnArtboard(l, doc.settings.width, doc.settings.height))
          : [];
        const sWidth = screen?.width ?? doc.settings.width;
        const sHeight = screen?.height ?? doc.settings.height;

        set({
          uiMode: nextMode,
          designModeState: savedDesign,
          pan: { x: Math.round(-sWidth / 2), y: Math.round(-sHeight / 2) },
          zoom: 1.0,
          selectedClipIds: [],
          activeTool: "select",
          motionLayerIds: artboardLayers.map((l) => l.id),
          isPlaying: false,
        });
      }
    } else {
      // Switching from Animate/Motion -> Design
      const savedAnimate: ModeSavedState = {
        pan,
        zoom,
        activeScreenId,
        selectedLayerIds,
        selectedClipIds,
        currentTime,
        loopMode,
        activeTool: "select",
      };

      if (designModeState) {
        const validScreenId = doc.screens.some((s) => s.id === designModeState.activeScreenId)
          ? designModeState.activeScreenId
          : (doc.screens[0]?.id || activeScreenId);

        const validLayers = (designModeState.selectedLayerIds || []).filter((id) =>
          doc.screens.some((s) => s.layers.some((l) => l.id === id))
        );

        set({
          uiMode: nextMode,
          animateModeState: savedAnimate,
          pan: designModeState.pan,
          zoom: designModeState.zoom,
          activeScreenId: validScreenId,
          selectedLayerIds: validLayers,
          activeTool: "select",
          isPlaying: false,
        });
      } else {
        set({
          uiMode: nextMode,
          animateModeState: savedAnimate,
          activeTool: "select",
          isPlaying: false,
        });
      }
    }
  },

  sendScreenToMotion: (screenId) => {
    const { document: doc, activeScreenId, pan, zoom, selectedLayerIds, activeTool, uiMode } = get();
    const targetId = screenId || activeScreenId;
    const screen = doc.screens.find((s) => s.id === targetId) || doc.screens[0];
    if (!screen) return;
    const artboardLayers = screen.layers.filter((l) =>
      isLayerOnArtboard(l, doc.settings.width, doc.settings.height)
    );

    let designModeState = get().designModeState;
    if (!isMotionMode(uiMode)) {
      designModeState = {
        pan,
        zoom,
        activeScreenId,
        selectedLayerIds,
        activeTool,
      };
    }

    set({
      activeScreenId: targetId,
      uiMode: "motion",
      activeTool: "select",
      designModeState,
      motionLayerIds: artboardLayers.map((l) => l.id),
      selectedLayerIds: artboardLayers[0] ? [artboardLayers[0].id] : [],
      isPlaying: false,
    });
  },
});
