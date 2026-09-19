import { describe, it, expect } from "vitest";
import { calculateMenuPosition, calculateSubmenuPosition } from "../utils/contextMenuMath";
import { useContextMenuStore } from "../store/useContextMenuStore";
import { useProjectStore } from "../store/useProjectStore";
import {
  buildTimelineClipMenu,
  buildTimelineTrackMenu,
  buildTimelineEmptyMenu,
  buildTimelineRulerMenu,
  buildCanvasElementMenu,
  buildCanvasPasteboardMenu,
  buildSidebarCardMenu,
} from "../components/contextmenu/contextMenuBuilders";
import { AnimationClip, Layer } from "../types/scene";

describe("Universal Context Menu System (Zones A-G)", () => {
  it("calculates clamped positions correctly without clipping offscreen", () => {
    // Top-left within bounds
    const pos1 = calculateMenuPosition(100, 100, 200, 200, 1920, 1080, 12);
    expect(pos1.x).toBe(100);
    expect(pos1.y).toBe(100);
    expect(pos1.opensLeft).toBe(false);
    expect(pos1.opensUp).toBe(false);

    // Overflow right and bottom (e.g. click at 1900, 1050)
    const pos2 = calculateMenuPosition(1900, 1050, 200, 200, 1920, 1080, 12);
    expect(pos2.x).toBeLessThanOrEqual(1920 - 200 - 12);
    expect(pos2.y).toBeLessThanOrEqual(1080 - 200 - 12);
    expect(pos2.opensLeft).toBe(true);
    expect(pos2.opensUp).toBe(true);

    // Submenu calculation
    const subPos = calculateSubmenuPosition(
      { left: 100, top: 100, right: 300, bottom: 130 },
      200,
      150,
      1920,
      1080,
      12
    );
    expect(subPos.x).toBe(304);
    expect(subPos.y).toBe(100);
  });

  it("manages open/close state via useContextMenuStore", () => {
    const store = useContextMenuStore.getState();
    expect(store.isOpen).toBe(false);

    store.openContextMenu({
      x: 150,
      y: 250,
      zone: "timeline-clip",
      items: [{ id: "test", label: "Test Action" }],
    });

    const openState = useContextMenuStore.getState();
    expect(openState.isOpen).toBe(true);
    expect(openState.x).toBe(150);
    expect(openState.y).toBe(250);
    expect(openState.zone).toBe("timeline-clip");
    expect(openState.items.length).toBe(1);

    store.closeContextMenu();
    const closedState = useContextMenuStore.getState();
    expect(closedState.isOpen).toBe(false);
    expect(closedState.items.length).toBe(0);
  });

  it("builds dedicated menus for all 7 zones (Zones A through G)", () => {
    const projectStore = useProjectStore.getState();
    const testClip: AnimationClip = {
      id: "clip_1",
      type: "in",
      preset: "pop",
      start: 0,
      duration: 1,
      easing: "smooth",
      fillMode: "both",
    };
    const testLayer: Layer = {
      id: "l_1",
      name: "Header",
      type: "text",
      content: "Choreo",
      style: { x: 0, y: 0, width: 100, height: 40, rotation: 0, opacity: 1 },
    };

    // Zone A: Timeline Clip
    const menuA = buildTimelineClipMenu({ layerId: "l_1", clip: testClip, store: projectStore });
    expect(menuA.some((i) => i.id === "quick-swap")).toBe(true);
    expect(menuA.some((i) => i.id === "split-clip")).toBe(true);

    // Zone B: Timeline Track
    const menuB = buildTimelineTrackMenu({ layer: testLayer, store: projectStore });
    expect(menuB.some((i) => i.id === "add-in")).toBe(true);
    expect(menuB.some((i) => i.id === "razor-split")).toBe(true);

    // Zone C: Timeline Empty Space
    const menuC = buildTimelineEmptyMenu({ time: 1.5, store: projectStore });
    expect(menuC.some((i) => i.id === "add-anim-here")).toBe(true);
    expect(menuC.some((i) => i.id === "set-work-in")).toBe(true);

    // Zone D: Timeline Ruler
    const menuD = buildTimelineRulerMenu({
      time: 2.0,
      isSmpte: false,
      toggleSmpte: () => {},
      store: projectStore,
    });
    expect(menuD.some((i) => i.id === "set-in")).toBe(true);
    expect(menuD.some((i) => i.id === "toggle-smpte")).toBe(true);

    // Zone E: Canvas Element
    const menuE = buildCanvasElementMenu({ layer: testLayer, store: projectStore });
    expect(menuE.some((i) => i.id === "canvas-add-anim")).toBe(true);
    expect(menuE.some((i) => i.id === "bring-front")).toBe(true);

    // Zone F: Canvas Pasteboard
    const menuF = buildCanvasPasteboardMenu({ store: projectStore });
    expect(menuF.some((i) => i.id === "pasteboard-text")).toBe(true);
    expect(menuF.some((i) => i.id === "zoom-100")).toBe(true);

    // Zone G: Sidebar Card
    const menuG = buildSidebarCardMenu({ layerId: "l_1", clip: testClip, store: projectStore });
    expect(menuG.some((i) => i.id === "card-duplicate")).toBe(true);
    expect(menuG.some((i) => i.id === "card-delete")).toBe(true);
  });
});
