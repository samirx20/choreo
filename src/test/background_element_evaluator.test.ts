import { describe, it, expect, beforeEach } from "vitest";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { normalizeScreens, INITIAL_SCENE } from "@/store/initialScene";
import { useProjectStore } from "@/store/useProjectStore";
import { Screen, BackgroundLayer, DEFAULT_BACKGROUND_STYLE } from "@/types/scene";

describe("BackgroundLayer Evaluation & Motion Primitives", () => {
  it("evaluates radialExpand preset to a circular clipPath expanding over time", () => {
    const bgLayer: BackgroundLayer = {
      id: "bg_hero",
      name: "Background",
      type: "background",
      fill: "#1e1b4b",
      style: { ...DEFAULT_BACKGROUND_STYLE },
      animation: {
        in: {
          preset: "radialExpand",
          duration: 1.0,
          delay: 0,
          easing: "easeOutCubic",
        },
      },
    };

    const screen: Screen = {
      id: "screen_1",
      name: "Hero Scene",
      duration: 3.0,
      background: bgLayer,
      backgroundColor: "#1e1b4b",
      layers: [],
    };

    // At t = 0 (entrance start): circle radius is 0%
    const computedStart = evaluateSceneAtTime(screen, 0.0);
    expect(computedStart["bg_hero"]).toBeDefined();
    expect(computedStart["bg_hero"].clipPath).toMatch(/circle\(0(\.0)?% at 50% 50%\)/);

    // At t = 0.5 (midpoint): circle radius expanded midway
    const computedMid = evaluateSceneAtTime(screen, 0.5);
    expect(computedMid["bg_hero"]).toBeDefined();
    const midMatch = computedMid["bg_hero"].clipPath?.match(/circle\(([\d.]+)%/);
    expect(midMatch).toBeTruthy();
    const midRadius = parseFloat(midMatch![1]);
    expect(midRadius).toBeGreaterThan(0);
    expect(midRadius).toBeLessThan(150);

    // At t = 1.0 (entrance complete): entrance is fully completed and resting unclipped
    const computedEnd = evaluateSceneAtTime(screen, 1.0);
    expect(computedEnd["bg_hero"]).toBeDefined();
    expect(computedEnd["bg_hero"].opacity).toBe(1);
    expect(computedEnd["bg_hero"].clipPath).toBeUndefined();
  });

  it("evaluates linearWipe and curtainSlide directional edge reveals", () => {
    const screenWipe: Screen = {
      id: "screen_wipe",
      name: "Wipe Scene",
      duration: 2.0,
      background: {
        id: "bg_wipe",
        name: "Background",
        type: "background",
        fill: "#0f172a",
        style: { ...DEFAULT_BACKGROUND_STYLE },
        animation: {
          in: {
            preset: "linearWipe",
            duration: 1.0,
            delay: 0,
            easing: "linear",
          },
        },
      },
      layers: [],
    };

    const atStart = evaluateSceneAtTime(screenWipe, 0.0);
    expect(atStart["bg_wipe"].clipPath).toBe("inset(0% 100% 0% 0%)");

    // During active wipe at t = 0.5
    const atMid = evaluateSceneAtTime(screenWipe, 0.5);
    expect(atMid["bg_wipe"].clipPath).toBe("inset(0% 50% 0% 0%)");

    // At completion at t = 1.0: resting unclipped
    const atEnd = evaluateSceneAtTime(screenWipe, 1.0);
    expect(atEnd["bg_wipe"].clipPath).toBeUndefined();

    const screenCurtain: Screen = {
      id: "screen_curtain",
      name: "Curtain Scene",
      duration: 2.0,
      background: {
        id: "bg_curtain",
        name: "Background",
        type: "background",
        fill: "#000000",
        style: { ...DEFAULT_BACKGROUND_STYLE },
        animation: {
          in: {
            preset: "curtainSlide",
            duration: 1.0,
            delay: 0,
            easing: "linear",
          },
        },
      },
      layers: [],
    };

    const curtainStart = evaluateSceneAtTime(screenCurtain, 0.0);
    expect(curtainStart["bg_curtain"].transform).toContain("1080px");

    const curtainMid = evaluateSceneAtTime(screenCurtain, 0.5);
    expect(curtainMid["bg_curtain"].transform).toContain("540px");

    const curtainEnd = evaluateSceneAtTime(screenCurtain, 1.0);
    expect(curtainEnd["bg_curtain"].opacity).toBe(1);
  });

  it("evaluates zoomWash and ambientFlash animations", () => {
    const screenZoom: Screen = {
      id: "screen_zoom",
      name: "Zoom Scene",
      duration: 2.0,
      background: {
        id: "bg_zoom",
        name: "Background",
        type: "background",
        fill: "#3b82f6",
        style: { ...DEFAULT_BACKGROUND_STYLE },
        animation: {
          in: {
            preset: "zoomWash",
            duration: 1.0,
            delay: 0,
            easing: "easeOutCubic",
          },
        },
      },
      layers: [],
    };

    const atStart = evaluateSceneAtTime(screenZoom, 0.0);
    expect(atStart["bg_zoom"].transform).toContain("scale(1.08, 1.08)");
    expect(atStart["bg_zoom"].opacity).toBe(0);

    const atEnd = evaluateSceneAtTime(screenZoom, 1.0);
    expect(atEnd["bg_zoom"].opacity).toBe(1);

    const screenFlash: Screen = {
      id: "screen_flash",
      name: "Flash Scene",
      duration: 2.0,
      background: {
        id: "bg_flash",
        name: "Background",
        type: "background",
        fill: "#ffffff",
        style: { ...DEFAULT_BACKGROUND_STYLE },
        animation: {
          in: {
            preset: "ambientFlash",
            duration: 1.0,
            delay: 0,
            easing: "linear",
          },
        },
      },
      layers: [],
    };

    const flashMid = evaluateSceneAtTime(screenFlash, 0.5);
    expect(flashMid["bg_flash"].filter).toBe("brightness(1.40)");

    const screenCollapse: Screen = {
      id: "screen_collapse",
      name: "Collapse Scene",
      duration: 3.0,
      background: {
        id: "bg_collapse",
        name: "Background",
        type: "background",
        fill: "#111827",
        style: { ...DEFAULT_BACKGROUND_STYLE },
        animation: {
          out: {
            preset: "radialCollapse",
            duration: 1.0,
            start: 1.0,
            easing: "linear",
          },
        },
      },
      layers: [],
    };

    // Before exit start (t = 0.5): element is in resting state before exit begins
    const beforeExit = evaluateSceneAtTime(screenCollapse, 0.5);
    expect(beforeExit["bg_collapse"].opacity ?? 1).toBe(1);

    // During exit collapse (t = 1.5, midpoint of out animation)
    const midExit = evaluateSceneAtTime(screenCollapse, 1.5);
    expect(midExit["bg_collapse"].clipPath).toMatch(/circle\(75(\.0)?% at 50% 50%\)/);

    // After exit completes (t = 2.0): hidden
    const afterExit = evaluateSceneAtTime(screenCollapse, 2.0);
    expect(afterExit["bg_collapse"].opacity).toBe(0);
  });
});

describe("Background Normalization & Migration", () => {
  it("automatically promotes legacy screen.backgroundColor to first-class BackgroundLayer", () => {
    const legacyDoc = {
      ...INITIAL_SCENE,
      screens: [
        {
          id: "screen_legacy",
          name: "Legacy Scene",
          duration: 4.0,
          backgroundColor: "#ff0055",
          layers: [],
        },
      ],
    };

    const normalized = normalizeScreens(legacyDoc);
    const screen = normalized.screens[0];
    expect(screen.background).toBeDefined();
    expect(screen.background?.id).toBe("bg_screen_legacy");
    expect(screen.background?.fill).toBe("#ff0055");
    expect(screen.background?.type).toBe("background");
    expect(screen.background?.fillType).toBe("solid");
    expect(screen.backgroundColor).toBe("#ff0055");
  });

  it("normalizes transparent legacy backgroundColor to background: null", () => {
    const transparentDoc = {
      ...INITIAL_SCENE,
      screens: [
        {
          id: "screen_trans",
          name: "Transparent Scene",
          duration: 3.0,
          backgroundColor: "transparent",
          layers: [],
        },
      ],
    };

    const normalized = normalizeScreens(transparentDoc);
    expect(normalized.screens[0].background).toBeNull();
    expect(normalized.screens[0].backgroundColor).toBe("transparent");
  });
});

describe("Project Store: BackgroundLayer Lifecycle & Transparency", () => {
  beforeEach(() => {
    useProjectStore.getState().setDocument({
      ...INITIAL_SCENE,
      screens: [
        {
          id: "screen_store_1",
          name: "Scene 1",
          duration: 5.0,
          backgroundColor: "#18181b",
          background: {
            id: "bg_store_1",
            name: "Background",
            type: "background",
            fill: "#18181b",
            fillType: "solid",
            style: { ...DEFAULT_BACKGROUND_STYLE },
          },
          layers: [],
        },
      ],
    });
  });

  it("synchronizes updateScreen between background and backgroundColor", () => {
    const store = useProjectStore.getState();

    // Setting backgroundColor to a new color updates background.fill
    store.updateScreen("screen_store_1", { backgroundColor: "#3b82f6" });
    let screen = useProjectStore.getState().document.screens[0];
    expect(screen.backgroundColor).toBe("#3b82f6");
    expect(screen.background?.fill).toBe("#3b82f6");

    // Setting backgroundColor to transparent sets background to null
    store.updateScreen("screen_store_1", { backgroundColor: "transparent" });
    screen = useProjectStore.getState().document.screens[0];
    expect(screen.backgroundColor).toBe("transparent");
    expect(screen.background).toBeNull();

    // Re-enabling background sets backgroundColor
    store.updateScreen("screen_store_1", {
      background: {
        id: "bg_store_1",
        name: "Background",
        type: "background",
        fill: "#22c55e",
        fillType: "solid",
        style: { ...DEFAULT_BACKGROUND_STYLE },
      },
    });
    screen = useProjectStore.getState().document.screens[0];
    expect(screen.backgroundColor).toBe("#22c55e");
    expect(screen.background?.fill).toBe("#22c55e");
  });

  it("updates background properties and styles via updateLayer", () => {
    const store = useProjectStore.getState();
    store.updateLayer("bg_store_1", {
      fill: "#e11d48",
      style: { opacity: 0.8 },
    } as any);

    const screen = useProjectStore.getState().document.screens[0];
    expect(screen.background?.fill).toBe("#e11d48");
    expect(screen.background?.style?.opacity).toBe(0.8);
    expect(screen.backgroundColor).toBe("#e11d48");
  });

  it("removes background layer via removeLayer and enters transparent mode", () => {
    const store = useProjectStore.getState();
    store.removeLayer("bg_store_1");

    const screen = useProjectStore.getState().document.screens[0];
    expect(screen.background).toBeNull();
    expect(screen.backgroundColor).toBe("transparent");
  });
});
