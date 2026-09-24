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
import { createAudioSlice } from "./slices/audioSlice";

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
 * - Audio & Soundtrack (audioSlice)
 */
export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  ...createCanvasSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createSelectionSlice(set, get),
  ...createSceneSlice(set, get),
  ...createLayerSlice(set, get),
  ...createStyleSlice(set, get),
  ...createAnimationSlice(set, get),
  ...createAudioSlice(set, get),
}));

// Automatic Persistence for Document (LocalStorage + Background Desktop Snapshot)
if (
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined" &&
  process.env.NODE_ENV !== "test"
) {
  let prevDoc: SceneDocument | null = null;
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

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

      // Background disk auto-save snapshot for Tauri desktop
      if ("__TAURI__" in window || "__TAURI_INTERNALS__" in window) {
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
          try {
            const { autoSaveDesktopSnapshot } = await import("@/services/fileAdapter");
            const activeId = window.localStorage.getItem("motion_studio_active_project_id") || "default";
            autoSaveDesktopSnapshot(state.document, {
              id: activeId,
              name: state.document.name || "Untitled Project",
              width: state.document.settings?.width || 1920,
              height: state.document.settings?.height || 1080,
              fps: state.document.settings?.fps || 60,
              duration: state.document.settings?.duration || 5.0,
              screenCount: state.document.screens?.length || 1,
              backgroundColor:
                state.document.settings?.backgroundColor ||
                state.document.screens?.[0]?.backgroundColor ||
                "#09090b",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } catch {
            // background auto-save ignored
          }
        }, 1200);
      }
    }
  });
}
