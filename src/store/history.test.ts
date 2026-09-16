import { describe, it, expect } from "vitest";
import { TransactionalHistory } from "./history";
import { INITIAL_SCENE } from "./useProjectStore";

describe("TransactionalHistory Engine", () => {
  it("initializes with the given document as present state", () => {
    const history = new TransactionalHistory(INITIAL_SCENE);
    expect(history.getPresent()).toEqual(INITIAL_SCENE);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("pushes discrete state mutations and enables undo", () => {
    const history = new TransactionalHistory(INITIAL_SCENE);
    const updated = {
      ...INITIAL_SCENE,
      name: "Renamed Project",
    };

    history.pushState(updated);
    expect(history.getPresent().name).toBe("Renamed Project");
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    // Undo reverts back to initial
    const undone = history.undo();
    expect(undone).not.toBeNull();
    expect(undone!.name).toBe(INITIAL_SCENE.name);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Redo restores to updated
    const redone = history.redo();
    expect(redone).not.toBeNull();
    expect(redone!.name).toBe("Renamed Project");
    expect(history.canUndo()).toBe(true);
  });

  it("batches hundreds of continuous drag/slider updates into a single transaction", () => {
    const history = new TransactionalHistory(INITIAL_SCENE);

    // User starts dragging a slider or canvas element
    history.startTransaction();

    // 100 intermediate frames generated during drag
    for (let i = 1; i <= 100; i++) {
      const intermediate = {
        ...INITIAL_SCENE,
        settings: {
          ...INITIAL_SCENE.settings,
          width: 1920 + i,
        },
      };
      history.pushState(intermediate);
    }

    // User releases pointer
    history.commitTransaction();

    // Final state has width 2020
    expect(history.getPresent().settings.width).toBe(2020);
    expect(history.canUndo()).toBe(true);

    // Pressing Ctrl+Z ONCE reverts directly to 1920, NOT 2019!
    const undone = history.undo();
    expect(undone!.settings.width).toBe(1920);
    expect(history.canUndo()).toBe(false);

    // Redoing restores directly to 2020
    const redone = history.redo();
    expect(redone!.settings.width).toBe(2020);
  });

  it("cancels an active transaction cleanly without pushing history", () => {
    const history = new TransactionalHistory(INITIAL_SCENE);
    history.startTransaction();

    history.pushState({
      ...INITIAL_SCENE,
      name: "Temporary Drag Name",
    });

    const rolledBack = history.cancelTransaction();
    expect(rolledBack.name).toBe(INITIAL_SCENE.name);
    expect(history.canUndo()).toBe(false);
  });
});
