import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { Screen, SceneDocument } from "@/types/scene";

describe("Design and Animate Mode State Preservation", () => {
  const mockScreens: Screen[] = [
    {
      id: "screen_1",
      name: "Scene 1",
      duration: 3.0,
      layers: [
        {
          id: "layer_title",
          name: "Title",
          type: "text",
          content: "Hello",
          style: { x: 50, y: 50, width: 200, height: 50, rotation: 0, opacity: 1 },
          animation: {
            clips: [
              { id: "clip_1", type: "in", preset: "pop", start: 0, duration: 0.5, easing: "bouncy" },
            ],
          },
        },
      ],
    },
    {
      id: "screen_2",
      name: "Scene 2",
      duration: 4.0,
      layers: [
        {
          id: "layer_card",
          name: "Card",
          type: "shape",
          shapeType: "rectangle",
          style: { x: 100, y: 100, width: 300, height: 200, rotation: 0, opacity: 1 },
          animation: {
            clips: [
              { id: "clip_2", type: "in", preset: "fade", start: 0.2, duration: 0.8, easing: "smooth" },
            ],
          },
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
    store.selectScreen("screen_1");
    store.setUiMode("design");
    store.setPan({ x: 0, y: 0 });
    store.setZoom(1.0);
    useProjectStore.setState({
      designModeState: null,
      animateModeState: null,
    });
  });

  it("saves Design mode state when switching to Animate mode", () => {
    const store = useProjectStore.getState();

    // Setup custom design state
    store.setPan({ x: 300, y: 150 });
    store.setZoom(0.75);
    store.selectScreen("screen_2");
    store.selectLayer("layer_card");
    store.setTool("rectangle");

    // Switch to animate mode
    store.setUiMode("animate");

    const state = useProjectStore.getState();
    expect(state.uiMode).toBe("motion");
    expect(state.designModeState).toBeDefined();
    expect(state.designModeState?.pan).toEqual({ x: 300, y: 150 });
    expect(state.designModeState?.zoom).toBe(0.75);
    expect(state.designModeState?.activeScreenId).toBe("screen_2");
    expect(state.designModeState?.selectedLayerIds).toEqual(["layer_card"]);
    expect(state.designModeState?.activeTool).toBe("rectangle");
  });

  it("restores Design mode state when switching back from Animate mode", () => {
    const store = useProjectStore.getState();

    // 1. Establish custom Design state
    store.setPan({ x: 420, y: -180 });
    store.setZoom(0.5);
    store.selectScreen("screen_2");
    store.selectLayer("layer_card");
    store.setTool("text");

    // 2. Switch to Animate mode
    store.setUiMode("animate");

    // 3. Mutate state in Animate mode
    store.setPan({ x: -960, y: -540 });
    store.setZoom(1.5);
    store.setCurrentTime(4.5);
    store.setSelectedClips(["clip_2"]);
    store.setLoopMode("scene");

    // 4. Switch back to Design mode
    store.setUiMode("design");

    const restoredState = useProjectStore.getState();
    expect(restoredState.uiMode).toBe("design");
    expect(restoredState.pan).toEqual({ x: 420, y: -180 });
    expect(restoredState.zoom).toBe(0.5);
    expect(restoredState.activeScreenId).toBe("screen_2");
    expect(restoredState.selectedLayerIds).toEqual(["layer_card"]);
    expect(restoredState.activeTool).toBe("select");
  });

  it("restores Animate mode state (timeline, clips, loopMode, viewport) when switching back from Design mode", () => {
    const store = useProjectStore.getState();

    // 1. Enter Animate mode
    store.setUiMode("animate");
    store.setPan({ x: -100, y: -200 });
    store.setZoom(1.25);
    store.setCurrentTime(3.5);
    store.setSelectedClips(["clip_2"]);
    store.setLoopMode("scene");

    // 2. Switch to Design mode and do some editing
    store.setUiMode("design");
    store.setPan({ x: 50, y: 80 });
    store.setZoom(0.6);
    store.selectScreen("screen_1");
    store.selectLayer("layer_title");

    // 3. Switch back to Animate mode
    store.setUiMode("animate");

    const restoredAnimate = useProjectStore.getState();
    expect(restoredAnimate.uiMode).toBe("motion");
    expect(restoredAnimate.pan).toEqual({ x: -100, y: -200 });
    expect(restoredAnimate.zoom).toBe(1.25);
    expect(restoredAnimate.currentTime).toBe(3.5);
    expect(restoredAnimate.selectedClipIds).toEqual(["clip_2"]);
    expect(restoredAnimate.loopMode).toBe("scene");
  });
});
