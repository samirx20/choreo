import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import {
  evaluateBinding,
  resolveSceneBindings,
  sortLayersByDependency,
} from "@/engine/bindings/dependencyEngine";
import { linkElements, unlinkElements } from "@/tools/linkElements";
import { Layer, TextLayer, ShapeLayer, LineLayer, ElementLinkBinding } from "@/types/scene";

describe("Pillar B: Universal Relational Linking Engine", () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: {
        version: "1.0",
        name: "Relational Linking Test Project",
        settings: {
          width: 1920,
          height: 1080,
          fps: 60,
          duration: 5.0,
          backgroundColor: "#09090b",
        },
        screens: [
          {
            id: "screen_main",
            name: "Main Scene",
            duration: 5.0,
            layers: [
              {
                id: "card_hero",
                name: "Hero Card",
                type: "shape",
                shapeType: "rectangle",
                style: {
                  x: 100,
                  y: 100,
                  width: 400,
                  height: 250,
                  rotation: 0,
                  opacity: 1,
                  backgroundColor: "#18181b",
                  borderWidth: 1,
                  borderColor: "#27272a",
                },
              } as ShapeLayer,
              {
                id: "text_title",
                name: "Card Title",
                type: "text",
                content: "Pro Camera System",
                style: {
                  x: 140,
                  y: 130,
                  width: 280,
                  height: 48,
                  fontSize: 32,
                  fontFamily: "Inter",
                  rotation: 0,
                  opacity: 1,
                },
              } as TextLayer,
              {
                id: "badge_status",
                name: "Status Badge",
                type: "shape",
                shapeType: "rectangle",
                style: {
                  x: 0,
                  y: 0,
                  width: 60,
                  height: 24,
                  rotation: 0,
                  opacity: 1,
                  backgroundColor: "#22c55e",
                },
              } as ShapeLayer,
              {
                id: "card_secondary",
                name: "Secondary Card",
                type: "shape",
                shapeType: "rectangle",
                style: {
                  x: 0,
                  y: 0,
                  width: 300,
                  height: 250,
                  rotation: 0,
                  opacity: 1,
                  backgroundColor: "#18181b",
                },
              } as ShapeLayer,
              {
                id: "connector_line",
                name: "Connector Line",
                type: "line",
                style: {
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 2,
                  rotation: 0,
                  opacity: 1,
                },
              } as LineLayer,
            ],
          },
        ],
      },
      activeScreenId: "screen_main",
      selectedLayerIds: ["card_hero"],
    });
  });

  describe("1. Dynamic Reflow Gap ('reflow')", () => {
    it("solves horizontal reflow positioning with exact authored gap and center cross-axis alignment", () => {
      const cardHero: ShapeLayer = {
        id: "card_hero",
        name: "Hero Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 400, height: 250, rotation: 0, opacity: 1 },
      };

      const cardSecondary: ShapeLayer = {
        id: "card_secondary",
        name: "Secondary Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 0, y: 0, width: 300, height: 180, rotation: 0, opacity: 1 },
      };

      const binding: ElementLinkBinding = {
        id: "bind_reflow_1",
        driverLayerId: "card_hero",
        driverProp: "x",
        drivenProp: "x",
        mode: "reflow",
        reflowAxis: "horizontal",
        reflowGap: 32,
        reflowAlignment: "center",
      };

      const result = evaluateBinding(
        binding,
        cardHero,
        cardSecondary,
        {
          card_hero: { width: 400, height: 250 },
          card_secondary: { width: 300, height: 180 },
        },
        0
      );

      // Expected X: driver.x + driver.width + gap = 100 + 400 + 32 = 532
      expect(result.x).toBe(532);
      expect(result.value).toBe(532);

      // Expected Y (center aligned): driver.y + driver.height / 2 - target.height / 2 = 100 + 125 - 90 = 135
      expect(result.y).toBe(135);
    });

    it("solves vertical reflow positioning with start alignment", () => {
      const title: TextLayer = {
        id: "title",
        name: "Title",
        type: "text",
        content: "Headline",
        style: { x: 200, y: 150, width: 350, height: 50, rotation: 0, opacity: 1 },
      };

      const subtitle: TextLayer = {
        id: "subtitle",
        name: "Subtitle",
        type: "text",
        content: "Supporting description",
        style: { x: 0, y: 0, width: 300, height: 30, rotation: 0, opacity: 1 },
      };

      const binding: ElementLinkBinding = {
        id: "bind_reflow_v",
        driverLayerId: "title",
        driverProp: "y",
        drivenProp: "y",
        mode: "reflow",
        reflowAxis: "vertical",
        reflowGap: 16,
        reflowAlignment: "start",
      };

      const result = evaluateBinding(
        binding,
        title,
        subtitle,
        {
          title: { width: 350, height: 50 },
          subtitle: { width: 300, height: 30 },
        },
        0
      );

      // Expected Y: title.y + title.height + gap = 150 + 50 + 16 = 216
      expect(result.y).toBe(216);
      // Expected X (start aligned): title.x = 200
      expect(result.x).toBe(200);
    });
  });

  describe("2. Boundary Hugging ('hug')", () => {
    it("dynamically sizes container to wrap content with padding", () => {
      const text: TextLayer = {
        id: "btn_text",
        name: "Button Label",
        type: "text",
        content: "Get Started",
        style: { x: 200, y: 200, width: 140, height: 40, rotation: 0, opacity: 1 },
      };

      const card: ShapeLayer = {
        id: "btn_bg",
        name: "Button BG",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      const binding: ElementLinkBinding = {
        id: "bind_hug_btn",
        driverLayerId: "btn_text",
        driverProp: "width",
        drivenProp: "width",
        mode: "hug",
        padding: [24, 16], // [padX, padY]
      };

      const result = evaluateBinding(
        binding,
        text,
        card,
        {
          btn_text: { width: 140, height: 40 },
          btn_bg: { width: 100, height: 100 },
        },
        0
      );

      // Width: 140 + 24*2 = 188
      expect(result.width).toBe(188);
      // Height: 40 + 16*2 = 72
      expect(result.height).toBe(72);
      // Top-left: x = 200 - 24 = 176, y = 200 - 16 = 184
      expect(result.x).toBe(176);
      expect(result.y).toBe(184);
    });
  });

  describe("3. Spatial Anchor Pinning ('pin')", () => {
    it("pins badge to top-right corner of card with offset", () => {
      const card: ShapeLayer = {
        id: "card",
        name: "Card",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 400, height: 200, rotation: 0, opacity: 1 },
      };

      const badge: ShapeLayer = {
        id: "badge",
        name: "Badge",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 0, y: 0, width: 60, height: 24, rotation: 0, opacity: 1 },
      };

      const binding: ElementLinkBinding = {
        id: "bind_pin_badge",
        driverLayerId: "card",
        driverProp: "x",
        drivenProp: "x",
        mode: "pin",
        driverAnchor: "top-right", // (x + width, y) = (500, 100)
        targetAnchor: "center",    // center of 60x24 box
        offset2D: [10, -5],        // pinnedPt = (510, 95)
      };

      const result = evaluateBinding(
        binding,
        card,
        badge,
        {
          card: { width: 400, height: 200 },
          badge: { width: 60, height: 24 },
        },
        0
      );

      // Pinned point = (100 + 400 + 10, 100 - 5) = (510, 95)
      // Align box center to (510, 95) => top-left = (510 - 30, 95 - 12) = (480, 83)
      expect(result.x).toBe(480);
      expect(result.y).toBe(83);
    });
  });

  describe("4. Dynamic Connector Line ('connect')", () => {
    it("tracks distance and angle between two elements", () => {
      const boxA: ShapeLayer = {
        id: "boxA",
        name: "Box A",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      const boxB: ShapeLayer = {
        id: "boxB",
        name: "Box B",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 400, y: 500, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      const line: LineLayer = {
        id: "line",
        name: "Line",
        type: "line",
        style: { x: 0, y: 0, width: 10, height: 2, rotation: 0, opacity: 1 },
      };

      const binding: ElementLinkBinding = {
        id: "bind_line",
        driverLayerId: "boxA",
        targetLayerId: "boxB",
        driverProp: "x",
        drivenProp: "width",
        mode: "connect",
        driverAnchor: "center", // (150, 150)
        targetAnchor: "center", // (450, 550)
      };

      const layerMap = new Map<string, Layer>([
        ["boxA", boxA],
        ["boxB", boxB],
        ["line", line],
      ]);

      const result = evaluateBinding(
        binding,
        boxA,
        line,
        {
          boxA: { width: 100, height: 100 },
          boxB: { width: 100, height: 100 },
          line: { width: 10, height: 2 },
        },
        0,
        layerMap
      );

      // dx = 450 - 150 = 300
      // dy = 550 - 150 = 400
      // distance = sqrt(300^2 + 400^2) = 500
      expect(result.width).toBe(500);
      expect(result.x).toBe(150);
      expect(result.y).toBe(150);

      // Angle = atan2(400, 300) in degrees approx 53.13 deg
      expect(Math.round(result.rotation || 0)).toBe(53);
    });
  });

  describe("5. Cycle Detection & Safe Topological Sorting", () => {
    it("handles circular dependencies safely without dropping layers", () => {
      const layerA: Layer = {
        id: "A",
        name: "Layer A",
        type: "shape",
        style: { x: 0, y: 0 },
        bindings: [
          {
            id: "b_a",
            driverLayerId: "B",
            driverProp: "x",
            drivenProp: "x",
            mode: "match",
          },
        ],
      } as any;

      const layerB: Layer = {
        id: "B",
        name: "Layer B",
        type: "shape",
        style: { x: 0, y: 0 },
        bindings: [
          {
            id: "b_b",
            driverLayerId: "A",
            driverProp: "x",
            drivenProp: "x",
            mode: "match",
          },
        ],
      } as any;

      const sorted = sortLayersByDependency([layerA, layerB]);
      expect(sorted).toHaveLength(2);
      expect(sorted).toContain("A");
      expect(sorted).toContain("B");
    });
  });

  describe("6. Agent Tools Orchestration ('link_elements' and 'unlink_elements')", () => {
    it("successfully creates a relational link between elements", () => {
      const result = linkElements({
        driverId: "card_hero",
        drivenId: "card_secondary",
        mode: "reflow",
        reflowAxis: "horizontal",
        reflowGap: 28,
      });

      expect(result.success).toBe(true);
      expect(result.data?.binding).toBeDefined();
      expect(result.data?.binding.mode).toBe("reflow");
      expect(result.data?.binding.reflowGap).toBe(28);

      // Verify layer now has binding in store
      const screen = useProjectStore.getState().document.screens[0];
      const secondary = screen.layers.find((l) => l.id === "card_secondary");
      expect(secondary?.bindings).toHaveLength(1);
      expect(secondary?.bindings?.[0].mode).toBe("reflow");
    });

    it("prevents circular dependencies with a self-healing constructive notice", () => {
      // 1. Link secondary -> hero
      linkElements({
        driverId: "card_hero",
        drivenId: "card_secondary",
        mode: "hug",
      });

      // 2. Try to link hero -> secondary (creates cycle)
      const cycleResult = linkElements({
        driverId: "card_secondary",
        drivenId: "card_hero",
        mode: "hug",
      });

      expect(cycleResult.success).toBe(false);
      expect(cycleResult.error).toContain("Circular dependency detected");
      expect(cycleResult.notices[0]).toContain("Circular dependency prevented");
    });

    it("unlinks an element via unlink_elements", () => {
      linkElements({
        driverId: "card_hero",
        drivenId: "badge_status",
        mode: "pin",
      });

      const unlinkResult = unlinkElements({
        layerId: "badge_status",
      });

      expect(unlinkResult.success).toBe(true);
      expect(unlinkResult.data?.removedCount).toBe(1);

      const screen = useProjectStore.getState().document.screens[0];
      const badge = screen.layers.find((l) => l.id === "badge_status");
      expect(badge?.bindings?.length || 0).toBe(0);
    });
  });

  describe("7. Full Scene Evaluation with Relational Bindings", () => {
    it("resolves scene styles with accurate CSS property values", () => {
      const store = useProjectStore.getState();
      const screen = store.document.screens[0];

      // Add a reflow link to card_secondary
      store.addLayerBinding("card_secondary", {
        id: "b_reflow_test",
        driverLayerId: "card_hero",
        driverProp: "x",
        drivenProp: "x",
        mode: "reflow",
        reflowAxis: "horizontal",
        reflowGap: 20,
        reflowAlignment: "center",
      });

      const baseComputed: Record<string, any> = {
        card_hero: { width: "400px", height: "250px" },
        card_secondary: { width: "300px", height: "250px" },
      };

      const updatedScreen = useProjectStore.getState().document.screens[0];
      const resolved = resolveSceneBindings(updatedScreen.layers, baseComputed, 0);

      // card_secondary left should be 100 + 400 + 20 = 520px
      expect(resolved.card_secondary?.left).toBe("520px");
    });
  });
});
