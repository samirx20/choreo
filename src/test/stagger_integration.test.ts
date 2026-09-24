import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";

describe("Kinetic Stagger & Multi-Layer Cascade Integration", () => {
  beforeEach(() => {
    const store = useProjectStore.getState();
    store.resetProject();
  });

  const createLayer = (id: string, x: number, y: number, name = id): Layer => ({
    id,
    name,
    type: "shape",
    shapeType: "rectangle",
    style: {
      x,
      y,
      width: 100,
      height: 60,
      rotation: 0,
      opacity: 1,
      backgroundColor: "#6366f1",
    },
    animation: {
      clips: [
        {
          id: `clip_${id}_in`,
          name: "Pop",
          type: "in",
          preset: "pop",
          start: 0.0,
          duration: 0.5,
          easing: "snappy",
        },
      ],
    },
  });

  it("staggers 3 layers from Left to Right with 0.06s interval", () => {
    const store = useProjectStore.getState();
    const l1 = createLayer("card_left", 50, 100);
    const l2 = createLayer("card_mid", 200, 100);
    const l3 = createLayer("card_right", 350, 100);

    store.addLayer(l1);
    store.addLayer(l2);
    store.addLayer(l3);

    // Select all 3 in reverse order to ensure spatial sorting takes precedence
    store.selectLayer("card_right", false);
    store.selectLayer("card_mid", true);
    store.selectLayer("card_left", true);

    store.staggerSelectedLayers({
      interval: 0.06,
      order: "left-to-right",
      baseStartTime: 0.0,
    });

    const activeScreen = useProjectStore
      .getState()
      .document.screens.find((s) => s.id === store.activeScreenId)!;

    const left = activeScreen.layers.find((l) => l.id === "card_left")!;
    const mid = activeScreen.layers.find((l) => l.id === "card_mid")!;
    const right = activeScreen.layers.find((l) => l.id === "card_right")!;

    expect(left.animation?.clips?.[0].start).toBe(0.0);
    expect(mid.animation?.clips?.[0].start).toBe(0.06);
    expect(right.animation?.clips?.[0].start).toBe(0.12);
  });

  it("staggers Top to Bottom with uniform preset override", () => {
    const store = useProjectStore.getState();
    const lTop = createLayer("card_top", 100, 50);
    const lBottom = createLayer("card_bottom", 100, 300);

    store.addLayer(lTop);
    store.addLayer(lBottom);

    store.selectLayer("card_bottom", false);
    store.selectLayer("card_top", true);

    store.staggerSelectedLayers({
      interval: 0.1,
      order: "top-to-bottom",
      baseStartTime: 0.5,
      syncPreset: "slideUp",
    });

    const activeScreen = useProjectStore
      .getState()
      .document.screens.find((s) => s.id === store.activeScreenId)!;

    const top = activeScreen.layers.find((l) => l.id === "card_top")!;
    const bottom = activeScreen.layers.find((l) => l.id === "card_bottom")!;

    expect(top.animation?.clips?.[0].start).toBe(0.5);
    expect(top.animation?.clips?.[0].preset).toBe("slideUp");

    expect(bottom.animation?.clips?.[0].start).toBe(0.6);
    expect(bottom.animation?.clips?.[0].preset).toBe("slideUp");
  });

  it("supports undo and redo for stagger operations", () => {
    const store = useProjectStore.getState();
    const l1 = createLayer("c1", 0, 0);
    const l2 = createLayer("c2", 100, 0);

    store.addLayer(l1);
    store.addLayer(l2);

    store.selectLayer("c1", false);
    store.selectLayer("c2", true);

    // Initial state: both start at 0.0
    store.staggerSelectedLayers({
      interval: 0.15,
      order: "left-to-right",
      baseStartTime: 0.0,
    });

    let screen = useProjectStore
      .getState()
      .document.screens.find((s) => s.id === store.activeScreenId)!;
    expect(screen.layers.find((l) => l.id === "c2")!.animation?.clips?.[0].start).toBe(0.15);

    // Undo
    useProjectStore.getState().undo();
    screen = useProjectStore
      .getState()
      .document.screens.find((s) => s.id === store.activeScreenId)!;
    expect(screen.layers.find((l) => l.id === "c2")!.animation?.clips?.[0].start).toBe(0.0);

    // Redo
    useProjectStore.getState().redo();
    screen = useProjectStore
      .getState()
      .document.screens.find((s) => s.id === store.activeScreenId)!;
    expect(screen.layers.find((l) => l.id === "c2")!.animation?.clips?.[0].start).toBe(0.15);
  });
});
