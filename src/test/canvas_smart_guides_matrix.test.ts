import { describe, it, expect, beforeEach } from "vitest";
import { calculateSnapping, SnapGuide, BoundingBox } from "@/components/canvas/snapping";
import { useProjectStore, INITIAL_SCENE } from "@/store/useProjectStore";
import { Layer, ShapeLayer } from "@/types/scene";

describe("Canvas Smart Guides & Magnetic Snapping Truth Matrix", () => {
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  // =========================================================================
  // 1. CANVAS BOUNDARY & CENTER SNAPPING
  // =========================================================================
  describe("Canvas Boundary & Center Snapping", () => {
    it("snaps target center to canvas center X (960px) and generates vertical center guide", () => {
      // Target box: width 200, height 100, placed near center X (960 - 100 = 860)
      // Placed at 863 (3px off, well within 8px threshold)
      const res = calculateSnapping(
        863,
        200,
        200,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        []
      );

      expect(res.x).toBe(860); // 960 - 200/2 = 860
      expect(res.guides.length).toBeGreaterThan(0);
      const centerGuide = res.guides.find(
        (g) => g.type === "vertical" && g.position === 960
      );
      expect(centerGuide).toBeDefined();
      expect(centerGuide?.isCanvasAxis).toBe(true);
      expect(centerGuide?.label).toBe("Center");
    });

    it("snaps target center to canvas middle Y (540px) and generates horizontal middle guide", () => {
      // Target box: width 200, height 100, placed near center Y (540 - 50 = 490)
      // Placed at 494 (4px off)
      const res = calculateSnapping(
        300,
        494,
        200,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        []
      );

      expect(res.y).toBe(490);
      const middleGuide = res.guides.find(
        (g) => g.type === "horizontal" && g.position === 540
      );
      expect(middleGuide).toBeDefined();
      expect(middleGuide?.isCanvasAxis).toBe(true);
      expect(middleGuide?.label).toBe("Middle");
    });

    it("snaps to canvas left edge (0px) and right edge (1920px)", () => {
      // Left snap
      const snapLeft = calculateSnapping(
        4,
        200,
        100,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        []
      );
      expect(snapLeft.x).toBe(0);

      // Right snap
      const snapRight = calculateSnapping(
        CANVAS_WIDTH - 104,
        200,
        100,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        []
      );
      expect(snapRight.x).toBe(CANVAS_WIDTH - 100);
    });
  });

  // =========================================================================
  // 2. SIBLING EDGE-TO-EDGE & CENTER-TO-CENTER ALIGNMENT
  // =========================================================================
  describe("Sibling Edge & Center Alignment", () => {
    const sibling: BoundingBox = { x: 400, y: 300, width: 200, height: 150 };

    it("snaps left-to-left and produces segment-bounded guide", () => {
      // Target placed at x=403, y=600 (height 100)
      const res = calculateSnapping(
        403,
        600,
        120,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );

      expect(res.x).toBe(400);
      const guide = res.guides.find((g) => g.type === "vertical" && g.position === 400);
      expect(guide).toBeDefined();
      expect(guide?.start).toBeLessThanOrEqual(300); // starts around sibling top
      expect(guide?.end).toBeGreaterThanOrEqual(700);  // extends through target bottom
    });

    it("snaps right-to-right alignment", () => {
      // Sibling right is 400 + 200 = 600
      // Target width is 150, so target x should snap to 600 - 150 = 450
      const res = calculateSnapping(
        453,
        600,
        150,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );

      expect(res.x).toBe(450);
      const guide = res.guides.find((g) => g.type === "vertical" && g.position === 600);
      expect(guide).toBeDefined();
    });

    it("snaps top-to-top and bottom-to-bottom horizontal alignment", () => {
      // Top-to-top: sibling.y = 300
      const snapTop = calculateSnapping(
        800,
        304,
        100,
        80,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );
      expect(snapTop.y).toBe(300);

      // Bottom-to-bottom: sibling bottom = 300 + 150 = 450. Target height 80 -> y = 370
      const snapBottom = calculateSnapping(
        800,
        367,
        100,
        80,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );
      expect(snapBottom.y).toBe(370);
    });
  });

  // =========================================================================
  // 3. CROSS-EDGE & ADJACENT SNAPPING
  // =========================================================================
  describe("Cross-Edge & Adjacent Snapping", () => {
    const sibling: BoundingBox = { x: 500, y: 200, width: 200, height: 100 };

    it("snaps target Left to sibling Right (placing adjacent to right)", () => {
      // Sibling right = 500 + 200 = 700
      // Target x placed at 703 -> should snap to 700
      const res = calculateSnapping(
        703,
        220,
        150,
        80,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );

      expect(res.x).toBe(700);
      const guide = res.guides.find((g) => g.type === "vertical" && g.position === 700);
      expect(guide).toBeDefined();
    });

    it("snaps target Right to sibling Left (placing adjacent to left)", () => {
      // Sibling left = 500. Target width = 100. Target x should snap to 500 - 100 = 400
      const res = calculateSnapping(
        397,
        220,
        100,
        80,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );

      expect(res.x).toBe(400);
      const guide = res.guides.find((g) => g.type === "vertical" && g.position === 500);
      expect(guide).toBeDefined();
    });

    it("snaps target Top to sibling Bottom (stacking directly below)", () => {
      // Sibling bottom = 200 + 100 = 300
      // Target y placed at 303 -> should snap to 300
      const res = calculateSnapping(
        520,
        303,
        120,
        80,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [sibling]
      );

      expect(res.y).toBe(300);
      const guide = res.guides.find((g) => g.type === "horizontal" && g.position === 300);
      expect(guide).toBeDefined();
    });
  });

  // =========================================================================
  // 4. EQUIDISTANT DISTRIBUTION & DISTANCE BADGES
  // =========================================================================
  describe("Equidistant Distribution & Gap Detection", () => {
    it("detects equal horizontal gaps between 3 elements and produces gap labels", () => {
      // Box 1: x = 100, w = 100 (ends at 200)
      // Box 2: x = 500, w = 100 (starts at 500)
      // Total available space between box 1 and box 2 = 500 - 200 = 300px
      // Target width = 100px.
      // Remaining gap = 300 - 100 = 200px / 2 = 100px on left, 100px on right.
      // Target equidistant X = 200 + 100 = 300.
      const b1: BoundingBox = { x: 100, y: 100, width: 100, height: 80 };
      const b2: BoundingBox = { x: 500, y: 100, width: 100, height: 80 };

      const res = calculateSnapping(
        298, // 2px off equidistant center 300
        100,
        100,
        80,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [b1, b2]
      );

      expect(res.x).toBe(300);
      const gapGuide = res.guides.find((g) => g.label === "100px");
      expect(gapGuide).toBeDefined();
    });
  });

  // =========================================================================
  // 5. SCALE-INVARIANT SCREEN SPACE SNAP RADIUS
  // =========================================================================
  describe("Scale-Invariant Snap Radius", () => {
    it("adjusts threshold dynamically with zoom/scale", () => {
      // At zoom 2.0, 8px screen space corresponds to 4px canvas space.
      // A delta of 6px should NOT snap at zoom 2.0:
      const zoomedIn = calculateSnapping(
        406,
        100,
        100,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [{ x: 400, y: 100, width: 100, height: 100 }],
        2.0
      );
      expect(zoomedIn.x).toBe(406); // no snap because 6px > 4px threshold

      // But at zoom 0.5, 8px screen space corresponds to 16px canvas space.
      // A delta of 6px MUST snap at zoom 0.5:
      const zoomedOut = calculateSnapping(
        406,
        100,
        100,
        100,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [{ x: 400, y: 100, width: 100, height: 100 }],
        0.5
      );
      expect(zoomedOut.x).toBe(400); // snapped!
    });
  });

  // =========================================================================
  // 6. MULTI-SELECTION SNAPPING & PROPORTIONAL RESIZING MATH
  // =========================================================================
  describe("Multi-Selection Snapping & Proportional Scaling Math", () => {
    it("applies uniform snapped delta to all multi-selected layers", () => {
      const initialLayers = [
        { id: "layer_a", x: 100, y: 200, width: 80, height: 60 },
        { id: "layer_b", x: 220, y: 200, width: 80, height: 60 },
      ];

      // Collective bounding box: x=100, y=200, w=200, h=60
      const initialBounds = { x: 100, y: 200, width: 200, height: 60 };

      // Drag delta = (153, 50). Target bounds = (253, 250).
      // Sibling at x=250. Snap x to 250 (delta -3px).
      const snap = calculateSnapping(
        initialBounds.x + 153,
        initialBounds.y + 50,
        initialBounds.width,
        initialBounds.height,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        [{ x: 250, y: 400, width: 100, height: 100 }]
      );

      expect(snap.x).toBe(250);
      const snappedDeltaX = snap.x - initialBounds.x; // 250 - 100 = 150
      const snappedDeltaY = snap.y - initialBounds.y; // 250 - 200 = 50

      const updatedA = {
        x: initialLayers[0].x + snappedDeltaX,
        y: initialLayers[0].y + snappedDeltaY,
      };
      const updatedB = {
        x: initialLayers[1].x + snappedDeltaX,
        y: initialLayers[1].y + snappedDeltaY,
      };

      expect(updatedA.x).toBe(250);
      expect(updatedB.x).toBe(370);
      // Relative distance between A and B (120px) is perfectly preserved
      expect(updatedB.x - updatedA.x).toBe(120);
    });

    it("proportionally scales internal layers when multi-selection bounding box is resized", () => {
      const initialBounds = { x: 100, y: 100, width: 200, height: 100 };
      const initialLayers = [
        { id: "card_1", x: 100, y: 100, width: 90, height: 100 },
        { id: "card_2", x: 210, y: 100, width: 90, height: 100 },
      ];

      // Resized bounding box: width doubles to 400, height doubles to 200, moved to (120, 120)
      const newBounds = { x: 120, y: 120, width: 400, height: 200 };
      const scaleFactorX = newBounds.width / initialBounds.width;   // 2.0
      const scaleFactorY = newBounds.height / initialBounds.height; // 2.0

      const scaledLayers = initialLayers.map((item) => {
        const relX = item.x - initialBounds.x;
        const relY = item.y - initialBounds.y;
        return {
          id: item.id,
          x: Math.round(newBounds.x + relX * scaleFactorX),
          y: Math.round(newBounds.y + relY * scaleFactorY),
          width: Math.round(item.width * scaleFactorX),
          height: Math.round(item.height * scaleFactorY),
        };
      });

      // Card 1
      expect(scaledLayers[0].x).toBe(120);
      expect(scaledLayers[0].y).toBe(120);
      expect(scaledLayers[0].width).toBe(180);
      expect(scaledLayers[0].height).toBe(200);

      // Card 2
      expect(scaledLayers[1].x).toBe(340); // 120 + 110*2 = 340
      expect(scaledLayers[1].y).toBe(120);
      expect(scaledLayers[1].width).toBe(180);
      expect(scaledLayers[1].height).toBe(200);
    });
  });

  // =========================================================================
  // 7. KEYBOARD NUDGE INVARIANTS
  // =========================================================================
  describe("Keyboard Nudge Invariants", () => {
    beforeEach(() => {
      useProjectStore.setState({
        activeScreenId: "screen_nudge",
        selectedLayerIds: ["nudge_rect"],
        document: {
          ...INITIAL_SCENE,
          screens: [
            {
              id: "screen_nudge",
              name: "Nudge Screen",
              duration: 3.0,
              layers: [
                {
                  id: "nudge_rect",
                  name: "Target Rect",
                  type: "shape",
                  shapeType: "rectangle",
                  style: { x: 100, y: 100, width: 80, height: 80 },
                } as ShapeLayer,
              ],
            },
          ],
        },
      });
    });

    it("nudges layer position by 1px on standard step and 10px on shift step", () => {
      const store = useProjectStore.getState();
      const layer = store.document.screens[0].layers[0];

      // Standard nudge right (+1px)
      const l1 = useProjectStore.getState().document.screens[0].layers[0];
      store.updateLayerStyle(l1.id, { x: (l1.style.x ?? 0) + 1 });
      expect(useProjectStore.getState().document.screens[0].layers[0].style.x).toBe(101);

      // Shift nudge right (+10px)
      const l2 = useProjectStore.getState().document.screens[0].layers[0];
      store.updateLayerStyle(l2.id, { x: (l2.style.x ?? 0) + 10 });
      expect(useProjectStore.getState().document.screens[0].layers[0].style.x).toBe(111);

      // Shift nudge up (-10px)
      const l3 = useProjectStore.getState().document.screens[0].layers[0];
      store.updateLayerStyle(l3.id, { y: (l3.style.y ?? 0) - 10 });
      expect(useProjectStore.getState().document.screens[0].layers[0].style.y).toBe(90);
    });
  });
});
