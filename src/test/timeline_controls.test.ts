import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, INITIAL_SCENE } from "@/store/useProjectStore";
import { layerStyleToCss } from "@/components/canvas/renderers/styleUtils";
import { LayerStyle } from "@/types/scene";

describe("Timeline Multi-Clip Selection & Work Area Controls", () => {
  beforeEach(() => {
    useProjectStore.setState({
      selectedClipIds: [],
      workArea: null,
    });
  });

  it("selects and toggles timeline clips individually and in multi-selection", () => {
    const store = useProjectStore.getState();
    expect(store.selectedClipIds).toEqual([]);

    store.toggleClipSelection("clip_1_in", false);
    expect(useProjectStore.getState().selectedClipIds).toEqual(["clip_1_in"]);

    store.toggleClipSelection("clip_2_in", true);
    expect(useProjectStore.getState().selectedClipIds).toEqual(["clip_1_in", "clip_2_in"]);

    store.toggleClipSelection("clip_1_in", true);
    expect(useProjectStore.getState().selectedClipIds).toEqual(["clip_2_in"]);

    store.setSelectedClips(["clip_a", "clip_b", "clip_c"]);
    expect(useProjectStore.getState().selectedClipIds.length).toBe(3);
  });

  it("sets work area start and end bounds accurately", () => {
    const store = useProjectStore.getState();
    expect(store.workArea).toBeNull();

    store.setWorkAreaStart(1.5);
    expect(useProjectStore.getState().workArea?.start).toBe(1.5);
    expect(useProjectStore.getState().workArea?.end).toBe(5.0);

    store.setWorkAreaEnd(3.5);
    expect(useProjectStore.getState().workArea).toEqual({ start: 1.5, end: 3.5 });

    store.setWorkArea(null);
    expect(useProjectStore.getState().workArea).toBeNull();
  });

  it("evaluates 3-mode text sizing CSS in styleUtils", () => {
    const autoWidthStyle: LayerStyle = {
      x: 0,
      y: 0,
      width: "auto",
      height: "auto",
      rotation: 0,
      opacity: 1,
      textSizing: "auto-width",
    };
    const cssAutoWidth = layerStyleToCss(autoWidthStyle, false, true);
    expect(cssAutoWidth.width).toBe("max-content");
    expect(cssAutoWidth.whiteSpace).toBe("nowrap");

    const autoHeightStyle: LayerStyle = {
      x: 0,
      y: 0,
      width: 500,
      height: "auto",
      rotation: 0,
      opacity: 1,
      textSizing: "auto-height",
    };
    const cssAutoHeight = layerStyleToCss(autoHeightStyle, false, true);
    expect(cssAutoHeight.width).toBe("500px");
    expect(cssAutoHeight.height).toBe("auto");
    expect(cssAutoHeight.whiteSpace).toBe("pre-wrap");

    const fixedStyle: LayerStyle = {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      rotation: 0,
      opacity: 1,
      textSizing: "fixed",
    };
    const cssFixed = layerStyleToCss(fixedStyle, false, true);
    expect(cssFixed.width).toBe("400px");
    expect(cssFixed.height).toBe("200px");
    expect(cssFixed.overflow).toBe("hidden");
  });
});
