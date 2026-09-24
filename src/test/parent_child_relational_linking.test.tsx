import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { useProjectStore } from "@/store/useProjectStore";
import { isContainerLayer } from "@/store/helpers/treeHelpers";
import { RelationalLinksCard } from "@/components/inspector/design/RelationalLinksCard";
import { ShapeLayer, TextLayer } from "@/types/scene";

describe("Parent-Child Relational Linking Architecture", () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: {
        version: "1.0",
        name: "Parent-Child Relational Test",
        settings: {
          width: 1920,
          height: 1080,
          fps: 60,
          duration: 5.0,
          backgroundColor: "#09090b",
        },
        screens: [
          {
            id: "screen_1",
            name: "Scene 1",
            duration: 5.0,
            layers: [
              {
                id: "card_parent",
                name: "Hero Card",
                type: "shape",
                shapeType: "rectangle",
                style: {
                  x: 200,
                  y: 150,
                  width: 400,
                  height: 250,
                  rotation: 0,
                  opacity: 1,
                  backgroundColor: "#18181b",
                },
              } as ShapeLayer,
              {
                id: "text_child",
                name: "Heading Text",
                type: "text",
                content: "Next-Gen Engine",
                style: {
                  x: 240,
                  y: 180,
                  width: 250,
                  height: 40,
                  fontSize: 28,
                  rotation: 0,
                  opacity: 1,
                },
              } as TextLayer,
            ],
          },
        ],
      },
      activeScreenId: "screen_1",
      selectedLayerIds: ["card_parent"],
    });
  });

  it("identifies rectangle shape layers as valid parent containers", () => {
    const card = useProjectStore.getState().document.screens[0].layers[0];
    expect(isContainerLayer(card)).toBe(true);
  });

  it("nests child element under parent card with 0.0000px visual layout shift", () => {
    const store = useProjectStore.getState();
    const origText = store.document.screens[0].layers[1];
    expect(origText.style.x).toBe(240);
    expect(origText.style.y).toBe(180);

    // Reorder text 'inside' the card (dragging under card in sidebar)
    store.reorderLayer("text_child", "card_parent", "inside");

    const updatedLayers = useProjectStore.getState().document.screens[0].layers;
    expect(updatedLayers.length).toBe(1);
    const updatedCard = updatedLayers[0];
    expect(updatedCard.id).toBe("card_parent");
    expect((updatedCard as any).children).toBeDefined();
    expect((updatedCard as any).children.length).toBe(1);

    const nestedChild = (updatedCard as any).children[0];
    expect(nestedChild.id).toBe("text_child");

    // Parent card is at (200, 150). Text world was (240, 180).
    // Child local coordinates must be exactly (240 - 200 = 40, 180 - 150 = 30) -> 0.0000px shift!
    expect(nestedChild.style.x).toBe(40);
    expect(nestedChild.style.y).toBe(30);

    // Card should have auto-initialized containerLayout mode to 'hug'
    expect((updatedCard as any).containerLayout).toBeDefined();
    expect((updatedCard as any).containerLayout.mode).toBe("hug");
  });

  it("updates parent container layout parameters smoothly", () => {
    const store = useProjectStore.getState();
    store.reorderLayer("text_child", "card_parent", "inside");

    store.updateLayerContainerLayout("card_parent", {
      paddingX: 32,
      paddingY: 24,
      physics: "instant",
    });

    const card = useProjectStore.getState().document.screens[0].layers[0];
    expect((card as any).containerLayout.paddingX).toBe(32);
    expect((card as any).containerLayout.paddingY).toBe(24);
    expect((card as any).containerLayout.physics).toBe("instant");
  });

  it("detaches child layer back to root space with exact world coordinates preserved", () => {
    const store = useProjectStore.getState();
    store.reorderLayer("text_child", "card_parent", "inside");

    // Detach child
    store.detachChildFromParent("text_child");

    const rootLayers = useProjectStore.getState().document.screens[0].layers;
    expect(rootLayers.length).toBe(2);

    const card = rootLayers[0];
    const detachedText = rootLayers[1];

    expect((card as any).children.length).toBe(0);
    expect(detachedText.id).toBe("text_child");
    // World coordinates restored: (card.x + child.localX) = 200 + 40 = 240, 150 + 30 = 180
    expect(detachedText.style.x).toBe(240);
    expect(detachedText.style.y).toBe(180);
  });

  it("renders NOTHING in the Inspector when layer has no children and is not a connector (Zero Noise UI)", () => {
    const card = useProjectStore.getState().document.screens[0].layers[0];
    const { container } = render(<RelationalLinksCard selectedLayer={card} />);
    // Absolutely no DOM elements rendered
    expect(container.firstChild).toBeNull();
  });

  it("renders clean Relational Linking inspector when parent has children", () => {
    const store = useProjectStore.getState();
    store.reorderLayer("text_child", "card_parent", "inside");

    const updatedCard = useProjectStore.getState().document.screens[0].layers[0];
    render(<RelationalLinksCard selectedLayer={updatedCard} />);

    // Shows Relational Linking header and child count
    expect(screen.getByText("Relational Linking")).toBeDefined();
    expect(screen.getByText("1 child")).toBeDefined();

    // Modular link options: Hug Bounds, Reflow Stack, Clip Content
    expect(screen.getByText("Hug Bounds")).toBeDefined();
    expect(screen.getByText("Reflow Stack")).toBeDefined();
    expect(screen.getByText("Clip Content")).toBeDefined();

    // Detach button
    expect(screen.getByText("Detach")).toBeDefined();
  });

  it("supports enabling multiple link options simultaneously (Hug Bounds AND Reflow Stack)", () => {
    const store = useProjectStore.getState();
    store.reorderLayer("text_child", "card_parent", "inside");

    // Enable both Hug Bounds AND Reflow Stack
    store.updateLayerContainerLayout("card_parent", {
      hug: {
        enabled: true,
        dimension: "both",
        paddingX: 24,
        paddingY: 18,
        physics: "spring",
      },
      stack: {
        enabled: true,
        axis: "vertical",
        gap: 12,
        align: "start",
      },
      clip: {
        enabled: true,
      },
    });

    const card = useProjectStore.getState().document.screens[0].layers[0];
    expect((card as any).containerLayout.hug.enabled).toBe(true);
    expect((card as any).containerLayout.stack.enabled).toBe(true);
    expect((card as any).containerLayout.clip.enabled).toBe(true);
  });
});
