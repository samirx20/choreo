import { TransactionalHistory } from "./history";
import { SceneDocument } from "@/types/scene";
import { loadInitialScene } from "./initialScene";
import { ProjectStoreState } from "./types";

export const initialDoc = loadInitialScene();
export const history = new TransactionalHistory(initialDoc);

export function commitDoc(
  set: (state: Partial<ProjectStoreState>) => void,
  nextDoc: SceneDocument,
  extra?: Partial<ProjectStoreState>
) {
  history.pushState(nextDoc);
  set({
    document: history.getPresent(),
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
    ...extra,
  });
}
