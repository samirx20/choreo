import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { Screen, SceneDocument, Layer, getLayerClips } from "@/types/scene";

describe("Omnipresent Renaming and Multi-Path Scene/Layer Management", () => {
  const mockScreens: Screen[] = [
    {
      id: "screen_alpha",
      name: "Intro Scene",
      duration: 3.0,
      layers: [
        {
          id: "layer_heading",
          name: "Main Heading",
          type: "text",
          content: "Hello World",
          style: { x: 50, y: 50, width: 200, height: 50, rotation: 0, opacity: 1 },
          animation: { clips: [] },
        },
      ],
    },
  ];

  beforeEach(() => {
    const store = useProjectStore.getState();
    const doc: SceneDocument = {
      ...store.document,
      screens: mockScreens,
    };
    store.setDocument(doc);
    store.selectScreen("screen_alpha");
    store.deselectAll();
  });

  it("renames scene using updateScreen as done by the right sidebar inspector", () => {
    const store = useProjectStore.getState();
    expect(store.document.screens[0].name).toBe("Intro Scene");

    store.updateScreen("screen_alpha", { name: "Product Hero 3D" });

    const updated = useProjectStore.getState().document.screens[0];
    expect(updated.name).toBe("Product Hero 3D");
  });

  it("renames layer using updateLayer as done by the right sidebar inspector", () => {
    const store = useProjectStore.getState();
    expect(store.document.screens[0].layers[0].name).toBe("Main Heading");

    store.updateLayer("layer_heading", { name: "Kinetic Punchline" });

    const updated = useProjectStore.getState().document.screens[0].layers[0];
    expect(updated.name).toBe("Kinetic Punchline");
  });

  it("duplicates and deletes layer cleanly from layer options menu", () => {
    const store = useProjectStore.getState();
    expect(store.document.screens[0].layers).toHaveLength(1);

    store.duplicateLayer("layer_heading");
    const withDuplicate = useProjectStore.getState().document.screens[0].layers;
    expect(withDuplicate).toHaveLength(2);
    expect(withDuplicate[1].name).toBe("Main Heading (Copy)");

    store.removeLayer(withDuplicate[1].id);
    const afterDelete = useProjectStore.getState().document.screens[0].layers;
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe("layer_heading");
  });

  it("duplicates and deletes scene cleanly from scene options menu", () => {
    const store = useProjectStore.getState();
    expect(store.document.screens).toHaveLength(1);

    store.duplicateScreen("screen_alpha");
    const withDuplicate = useProjectStore.getState().document.screens;
    expect(withDuplicate).toHaveLength(2);
    expect(withDuplicate[1].name).toBe("Intro Scene (Copy)");

    store.deleteScreen(withDuplicate[1].id);
    const afterDelete = useProjectStore.getState().document.screens;
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe("screen_alpha");
  });

  it("renames animation clip cleanly using updateAnimationClip", () => {
    const store = useProjectStore.getState();
    const clipId = store.addAnimationClip("layer_heading", {
      type: "in",
      preset: "pop",
      start: 0,
      duration: 0.6,
    });

    const freshDoc = useProjectStore.getState().document;
    const freshScreen = freshDoc.screens[0];
    const freshLayer = freshScreen?.layers[0];
    const clip = freshLayer ? getLayerClips(freshLayer).find((c) => c.id === clipId) : undefined;
    expect(clip).toBeDefined();
    expect(clip?.preset).toBe("pop");

    useProjectStore.getState().updateAnimationClip("layer_heading", clip!.id, { name: "Custom Bounce In" });

    const updatedLayer = useProjectStore.getState().document.screens[0]?.layers[0];
    const updatedClip = updatedLayer ? getLayerClips(updatedLayer).find((c) => c.id === clipId) : undefined;
    expect(updatedClip?.name).toBe("Custom Bounce In");
  });

  it("context menu builders eliminate prompt modals and support inline scene renaming", async () => {
    const {
      buildTimelineTrackMenu,
      buildCanvasElementMenu,
      buildSceneContextMenu,
    } = await import("@/components/contextmenu/contextMenuBuilders");

    const store = useProjectStore.getState();
    const layer = store.document.screens[0].layers[0];
    const clipId = store.addAnimationClip(layer.id, {
      type: "in",
      preset: "pop",
      start: 0,
      duration: 0.6,
    });
    const freshStore = useProjectStore.getState();
    const freshLayer = freshStore.document.screens[0]?.layers[0];
    expect(freshLayer).toBeDefined();

    // Canvas element menu: no prompt-based rename item
    const canvasMenu = buildCanvasElementMenu({ layer: freshLayer!, store: freshStore });
    expect(canvasMenu.some((item) => item.id === "rename-canvas-layer")).toBe(false);

    // Track menu: no prompt-based rename item
    const trackMenu = buildTimelineTrackMenu({ layer: freshLayer!, store: freshStore });
    expect(trackMenu.some((item) => item.id === "rename-track-layer")).toBe(false);

    // Scene menu: triggers inline callback without browser prompt
    let inlineRenameCalled = false;
    const sceneMenu = buildSceneContextMenu({
      screenId: "screen_alpha",
      store: freshStore,
      onRename: () => {
        inlineRenameCalled = true;
      },
    });
    expect(sceneMenu.some((item) => item.id === "scene-rename")).toBe(true);
    const renameItem = sceneMenu.find((item) => item.id === "scene-rename");
    renameItem?.action?.();
    expect(inlineRenameCalled).toBe(true);
  });
});
