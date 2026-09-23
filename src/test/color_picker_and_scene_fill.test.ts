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

  describe("Per-scene Fill vs Apply to All Scenes synchronization", () => {
    it("allows scenes to have independent background colors when apply to all is false", () => {
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

    it("synchronizes background color to all scenes when applied globally", () => {
      const store = useProjectStore.getState();
      store.addScreen();
      store.addScreen();
      expect(useProjectStore.getState().document.screens.length).toBe(3);

      const targetColor = "#10b981";

      // Simulate 'Apply to all scenes' behavior
      useProjectStore.getState().document.screens.forEach((s) => {
        useProjectStore.getState().updateScreen(s.id, { backgroundColor: targetColor });
      });
      useProjectStore.getState().updateSettings({ backgroundColor: targetColor });

      const allScreens = useProjectStore.getState().document.screens;
      expect(allScreens.every((s) => s.backgroundColor === targetColor)).toBe(true);
      expect(useProjectStore.getState().document.settings.backgroundColor).toBe(targetColor);
    });

    it("defaults new projects and newly added screens to white (#ffffff)", () => {
      const store = useProjectStore.getState();
      expect(store.document.settings.backgroundColor).toBe("#ffffff");
      expect(store.document.screens[0].backgroundColor).toBe("#ffffff");

      store.addScreen();
      expect(useProjectStore.getState().document.screens[1].backgroundColor).toBe("#ffffff");
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
