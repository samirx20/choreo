import { useProjectStore } from "@/store/useProjectStore";
import { findParentGroupInTree } from "@/store/helpers/treeHelpers";

/**
 * Calculates cumulative world space X/Y offset contributed by parent
 * containers/groups in the layer hierarchy for an element.
 */
export const getParentWorldOffset = (targetId: string): { x: number; y: number } => {
  let curX = 0;
  let curY = 0;
  const activeLayers =
    useProjectStore.getState().document.screens.find(
      (s) => s.id === useProjectStore.getState().activeScreenId
    )?.layers || [];
  let currentParent = findParentGroupInTree(activeLayers, targetId);
  while (currentParent) {
    curX += currentParent.style.x || 0;
    curY += currentParent.style.y || 0;
    currentParent = findParentGroupInTree(activeLayers, currentParent.id);
  }
  return { x: curX, y: curY };
};
