import { ProjectStoreState } from "../types";
import { findLayerInTree } from "../helpers/treeHelpers";
import { getLayerClips } from "@/types/scene";
import { initialDoc } from "../historyManager";

export type SelectionSlice = Pick<
  ProjectStoreState,
  | "activeScreenId"
  | "selectedLayerIds"
  | "editingLayerId"
  | "activeTextSelection"
  | "selectedClipIds"
  | "selectScreen"
  | "selectLayer"
  | "deselectAll"
  | "setEditingLayerId"
  | "setActiveTextSelection"
  | "setSelectedClips"
  | "toggleClipSelection"
>;

export const createSelectionSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): SelectionSlice => ({
  activeScreenId: initialDoc.screens[0]?.id || "screen-1",
  selectedLayerIds: [],
  editingLayerId: null,
  activeTextSelection: null,
  selectedClipIds: [],

  selectScreen: (activeScreenId) =>
    set({
      activeScreenId,
      selectedLayerIds: [],
      selectedClipIds: [],
      editingLayerId: null,
      activeTextSelection: null,
    }),

  selectLayer: (layerId, multi = false) => {
    const { selectedLayerIds, selectedClipIds, document: doc, activeScreenId, editingLayerId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);

    // If switching layers, exit text editing on previous layer
    const nextEditingId = editingLayerId === layerId ? editingLayerId : null;
    const nextTextSelection = editingLayerId === layerId ? get().activeTextSelection : null;

    // If selecting a single layer, clear selected clips if they don't belong to this layer
    let nextClipIds = selectedClipIds;
    if (!multi && selectedClipIds.length > 0 && activeScreen) {
      const targetLayer = findLayerInTree(activeScreen.layers, layerId);
      const layerClips = targetLayer ? getLayerClips(targetLayer) : [];
      const hasAny = selectedClipIds.some((cid) => layerClips.some((c) => c.id === cid));
      if (!hasAny) {
        nextClipIds = [];
      }
    }

    if (multi) {
      if (selectedLayerIds.includes(layerId)) {
        set({
          selectedLayerIds: selectedLayerIds.filter((id) => id !== layerId),
          selectedClipIds: nextClipIds,
          editingLayerId: nextEditingId,
          activeTextSelection: nextTextSelection,
        });
      } else {
        set({
          selectedLayerIds: [...selectedLayerIds, layerId],
          selectedClipIds: nextClipIds,
          editingLayerId: nextEditingId,
          activeTextSelection: nextTextSelection,
        });
      }
    } else {
      set({
        selectedLayerIds: [layerId],
        selectedClipIds: nextClipIds,
        editingLayerId: nextEditingId,
        activeTextSelection: nextTextSelection,
      });
    }
  },

  deselectAll: () =>
    set({
      selectedLayerIds: [],
      selectedClipIds: [],
      editingLayerId: null,
      activeTextSelection: null,
    }),

  setEditingLayerId: (editingLayerId) => set({ editingLayerId }),
  setActiveTextSelection: (activeTextSelection) => set({ activeTextSelection }),

  setSelectedClips: (selectedClipIds) => set({ selectedClipIds }),
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
});
