import { describe, it, expect, beforeEach } from "vitest";
import {
  hexToHsv,
  hsvToHex,
  hexToRgbaString,
  parseHexOrRgba,
  parseLinearGradientString,
  serializeGradient,
  GradientStop,
} from "@/components/ui/color-picker";
import { useProjectStore } from "@/store/useProjectStore";

describe("Color & Linear Gradient Picker Engine", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  describe("HEX and RGBA Parsing & Conversions", () => {
    it("parses 6-digit hex correctly", () => {
      const parsed = parseHexOrRgba("#3b82f6");
      expect(parsed.hex.toLowerCase()).toBe("#3b82f6");
      expect(parsed.alpha).toBe(1);
    });

    it("parses 8-digit hex with alpha", () => {
      const parsed = parseHexOrRgba("#ff000080");
      expect(parsed.hex.toLowerCase()).toBe("#ff0000");
      expect(parsed.alpha).toBeCloseTo(0.5, 1);
    });

    it("parses rgba(...) strings with fractional opacity", () => {
      const parsed = parseHexOrRgba("rgba(255, 0, 128, 0.75)");
      expect(parsed.hex.toLowerCase()).toBe("#ff0080");
      expect(parsed.alpha).toBe(0.75);
    });

    it("generates clean rgba strings when alpha is less than 1", () => {
      const rgba = hexToRgbaString("#10b981", 0.5);
      expect(rgba).toBe("rgba(16, 185, 129, 0.5)");
    });
  });

  describe("Linear Gradient Parsing & Serialization", () => {
    it("parses standard degree-based linear-gradient strings", () => {
      const gradientStr = "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)";
      const parsed = parseLinearGradientString(gradientStr);

      expect(parsed.angle).toBe(135);
      expect(parsed.stops.length).toBe(2);
      expect(parsed.stops[0].color.toLowerCase()).toBe("#6366f1");
      expect(parsed.stops[0].offset).toBe(0);
      expect(parsed.stops[1].color.toLowerCase()).toBe("#ec4899");
      expect(parsed.stops[1].offset).toBe(100);
    });

    it("parses directional keyword linear-gradient strings ('to right', 'to bottom')", () => {
      const toRight = parseLinearGradientString("linear-gradient(to right, #ff0000 0%, #0000ff 100%)");
      expect(toRight.angle).toBe(90);

      const toBottom = parseLinearGradientString("linear-gradient(to bottom, #000000 0%, #ffffff 100%)");
      expect(toBottom.angle).toBe(180);
    });

    it("serializes gradient angle and stops into valid CSS linear-gradient string", () => {
      const stops: GradientStop[] = [
        { id: "1", color: "#3B82F6", alpha: 1, offset: 0 },
        { id: "2", color: "#10B981", alpha: 0.8, offset: 50 },
        { id: "3", color: "#EC4899", alpha: 1, offset: 100 },
      ];

      const serialized = serializeGradient("linear", 90, stops);
      expect(serialized).toBe("linear-gradient(90deg, #3B82F6 0%, rgba(16, 185, 129, 0.8) 50%, #EC4899 100%)");

      const radialSerialized = serializeGradient("radial", 0, stops);
      expect(radialSerialized).toBe("radial-gradient(circle, #3B82F6 0%, rgba(16, 185, 129, 0.8) 50%, #EC4899 100%)");

      const angularSerialized = serializeGradient("angular", 45, stops);
      expect(angularSerialized).toBe("conic-gradient(from 45deg at 50% 50%, #3B82F6 0%, rgba(16, 185, 129, 0.8) 50%, #EC4899 100%)");

      const diamondSerialized = serializeGradient("diamond", 0, stops);
      expect(diamondSerialized).toBe("radial-gradient(ellipse at center, #3B82F6 0%, rgba(16, 185, 129, 0.8) 50%, #EC4899 100%)");
    });
  });

  describe("Scene and Layer Gradient Persistence in Project Store", () => {
    it("saves linear-gradient as scene background and updates state", () => {
      const store = useProjectStore.getState();
      const activeScreenId = store.document.screens[0].id;
      const gradientBg = "linear-gradient(180deg, #09090b 0%, #18181b 100%)";

      store.updateScreen(activeScreenId, { backgroundColor: gradientBg });
      const currentScreen = useProjectStore.getState().document.screens[0];
      expect(currentScreen.backgroundColor).toBe(gradientBg);
    });

    it("saves linear-gradient as layer background fill", () => {
      const store = useProjectStore.getState();
      store.addLayer({
        name: "Gradient Card",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          backgroundColor: "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
        },
      } as any);

      const addedLayer = useProjectStore.getState().document.screens[0].layers[0];
      expect(addedLayer.style.backgroundColor).toBe("linear-gradient(135deg, #6366F1 0%, #EC4899 100%)");
    });
  });
});
