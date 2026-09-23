import { describe, it, expect, beforeEach } from "vitest";
import { hexToHsv, hsvToHex } from "@/components/ui/color-picker";
import { useProjectStore } from "@/store/useProjectStore";

describe("ColorPicker Math & Scene Fill Architecture", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  describe("HSV <-> HEX conversion math", () => {
    it("accurately converts primary colors back and forth", () => {
      const red = hexToHsv("#FF0000");
      expect(red.h).toBe(0);
      expect(red.s).toBe(1);
      expect(red.v).toBe(1);
      expect(hsvToHex(red.h, red.s, red.v).toLowerCase()).toBe("#ff0000");

      const green = hexToHsv("#00FF00");
      expect(green.h).toBe(120);
      expect(green.s).toBe(1);
      expect(green.v).toBe(1);
      expect(hsvToHex(green.h, green.s, green.v).toLowerCase()).toBe("#00ff00");

      const blue = hexToHsv("#0000FF");
      expect(blue.h).toBe(240);
      expect(blue.s).toBe(1);
      expect(blue.v).toBe(1);
      expect(hsvToHex(blue.h, blue.s, blue.v).toLowerCase()).toBe("#0000ff");
    });

    it("accurately converts white, black, and grays", () => {
      const white = hexToHsv("#FFFFFF");
      expect(white.s).toBe(0);
      expect(white.v).toBe(1);
      expect(hsvToHex(white.h, white.s, white.v).toLowerCase()).toBe("#ffffff");

      const black = hexToHsv("#000000");
      expect(black.v).toBe(0);
      expect(hsvToHex(black.h, black.s, black.v).toLowerCase()).toBe("#000000");
    });

    it("handles short hex inputs (#fff)", () => {
      const shortWhite = hexToHsv("#fff");
      expect(shortWhite.v).toBe(1);
      expect(shortWhite.s).toBe(0);
    });
  });

  describe("Sequential Scene Background Inheritance & Fill Architecture", () => {
    it("allows scenes to have independent background colors", () => {
      const store = useProjectStore.getState();
      const firstScreenId = store.document.screens[0].id;

      // Add a second screen
      store.addScreen();
      const secondScreenId = useProjectStore.getState().document.screens[1].id;

      // Update first screen background to #ff0000
      store.updateScreen(firstScreenId, { backgroundColor: "#ff0000" });

      // Update second screen background to #0000ff
      store.updateScreen(secondScreenId, { backgroundColor: "#0000ff" });

      const updatedScreens = useProjectStore.getState().document.screens;
      expect(updatedScreens[0].backgroundColor).toBe("#ff0000");
      expect(updatedScreens[1].backgroundColor).toBe("#0000ff");
    });

    it("automatically inherits the background color of the preceding scene across additions", () => {
      const store = useProjectStore.getState();
      // 1. Scene 1 defaults to white
      expect(store.document.screens[0].backgroundColor).toBe("#ffffff");

      // 2. Add Scene 2 -> inherits white
      store.addScreen();
      const screen2 = useProjectStore.getState().document.screens[1];
      expect(screen2.backgroundColor).toBe("#ffffff");

      // 3. Change Scene 2 to black
      store.updateScreen(screen2.id, { backgroundColor: "#000000" });
      expect(useProjectStore.getState().document.screens[1].backgroundColor).toBe("#000000");

      // 4. Add Scene 3 -> inherits black from Scene 2
      store.addScreen();
      const screen3 = useProjectStore.getState().document.screens[2];
      expect(screen3.backgroundColor).toBe("#000000");

      // 5. Change Scene 3 to a gradient
      const gradient = "linear-gradient(180deg, #ff5f56 0%, #ffbd2e 100%)";
      store.updateScreen(screen3.id, { backgroundColor: gradient });
      expect(useProjectStore.getState().document.screens[2].backgroundColor).toBe(gradient);

      // 6. Add Scene 4 -> inherits the gradient from Scene 3
      store.addScreen();
      const screen4 = useProjectStore.getState().document.screens[3];
      expect(screen4.backgroundColor).toBe(gradient);
    });

    it("reliably disables fill to transparent and re-enables back to a valid color", () => {
      const store = useProjectStore.getState();
      const screenId = store.document.screens[0].id;

      // Disable fill
      store.updateScreen(screenId, { backgroundColor: "transparent" });
      expect(useProjectStore.getState().document.screens[0].backgroundColor).toBe("transparent");

      // Re-enable fill
      const doc = useProjectStore.getState().document;
      const restoreColor =
        doc.settings.backgroundColor && doc.settings.backgroundColor !== "transparent"
          ? doc.settings.backgroundColor
          : "#ffffff";
      store.updateScreen(screenId, { backgroundColor: restoreColor });

      expect(useProjectStore.getState().document.screens[0].backgroundColor).toBe("#ffffff");
    });
  });
});
