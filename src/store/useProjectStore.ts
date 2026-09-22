import { create } from "zustand";
import { SceneDocument } from "@/types/scene";
import { ProjectStoreState } from "./types";
import {
  INITIAL_SCENE,
  STORAGE_DOC_KEY,
  normalizeScreens,
  loadInitialScene,
  loadInitialTheme,
} from "./initialScene";
import { createCanvasSlice } from "./slices/canvasSlice";
import { createPlaybackSlice } from "./slices/playbackSlice";
import { createSelectionSlice } from "./slices/selectionSlice";
import { createSceneSlice } from "./slices/sceneSlice";
import { createLayerSlice } from "./slices/layerSlice";
import { createStyleSlice } from "./slices/styleSlice";
import { createAnimationSlice } from "./slices/animationSlice";

// Re-export types
export * from "./types";

// Re-export initial scene and storage utilities
export {
  INITIAL_SCENE,
  STORAGE_DOC_KEY,
  normalizeScreens,
  loadInitialScene,
  loadInitialTheme,
};

// Re-export tree helpers for consumers
export {
  findLayerInTree,
  findParentGroupInTree,
  findTopmostParentGroupInTree,
  mutateLayerInTree,
  insertLayerRelativeInTree,
  flattenLayers,
  isLayerOnArtboard,
} from "./helpers/treeHelpers";

// Re-export screen timing helpers for consumers
export {
  getScreenTimings,
  getTotalDuration,
  getScreenAtTime,
} from "./helpers/screenTimingHelpers";

/**
 * Project Store — Cleanly composed from domain-specific slices:
 * - Canvas & Modes (canvasSlice)
 * - Playback & Work Area (playbackSlice)
 * - Selection & Multi-select (selectionSlice)
 * - Scene & Artboards (sceneSlice)
 * - Layer CRUD & Grouping (layerSlice)
 * - Style & Alignment (styleSlice)
 * - Animation & Presets (animationSlice)
 */
export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  ...createCanvasSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createSelectionSlice(set, get),
  ...createSceneSlice(set, get),
  ...createLayerSlice(set, get),
  ...createStyleSlice(set, get),
  ...createAnimationSlice(set, get),
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
        const activeId = window.localStorage.getItem("motion_studio_active_project_id");
        if (activeId) {
          window.localStorage.setItem("motion_studio_project_doc_" + activeId, JSON.stringify(state.document));
        }
      } catch (e) {
        console.warn("Failed to auto-save scene to localStorage:", e);
      }
    }
  });
}
