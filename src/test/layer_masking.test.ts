import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { ShapeLayer, TextLayer, GroupLayer, SceneDocument } from "@/types/scene";
import { renderMaskGeometry } from "@/components/canvas/renderers/GroupRenderer";
import { buildCanvasElementMenu } from "@/components/contextmenu/contextMenuBuilders";
import React from "react";

describe("Layer Masking & Clipping Masks ('Use as Mask')", () => {
  beforeEach(() => {
    const initialDoc: SceneDocument = {
      name: "Test Project",
      version: "1.0",
      settings: {
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 5,
        backgroundColor: "#000000",
      },
      screens: [
        {
          id: "screen-1",
          name: "Scene 1",
          duration: 5,
          layers: [],
        },
      ],
    };

    useProjectStore.setState({
      document: initialDoc,
      activeScreenId: "screen-1",
      selectedLayerIds: [],
    });
  });

  it("creates a Mask Group from 2+ selected layers with maskSelection()", () => {
    const store = useProjectStore.getState();

    const maskShape: ShapeLayer = {
      id: "mask-circle",
      name: "Mask Circle",
      type: "shape",
      shapeType: "circle",
      style: { x: 100, y: 100, width: 200, height: 200, rotation: 0, opacity: 1 },
    };

    const contentText: TextLayer = {
      id: "masked-text",
      name: "Headline",
      type: "text",
      content: "Choreo Motion Studio",
      style: { x: 120, y: 150, width: 300, height: 80, rotation: 0, opacity: 1 },
    };

    store.addLayer(maskShape);
    store.addLayer(contentText);

    // Select both layers
    useProjectStore.setState({ selectedLayerIds: ["mask-circle", "masked-text"] });

    // Execute mask selection
    useProjectStore.getState().maskSelection();

    const screen = useProjectStore.getState().document.screens[0];
    expect(screen.layers.length).toBe(1);

    const maskGroup = screen.layers[0] as GroupLayer;
    expect(maskGroup.type).toBe("group");
    expect(maskGroup.isMaskGroup).toBe(true);
    expect(maskGroup.invertMask).toBe(false);
    expect(maskGroup.children.length).toBe(2);

    // Bottom layer is the mask stencil
    expect(maskGroup.children[0].id).toBe("mask-circle");
    expect(maskGroup.children[0].isMask).toBe(true);

    // Second layer is the masked content
    expect(maskGroup.children[1].id).toBe("masked-text");
    expect(maskGroup.children[1].isMask).toBe(false);

    // Mask group bounds enclose both children
    expect(maskGroup.style.x).toBe(100);
    expect(maskGroup.style.y).toBe(100);
    expect(maskGroup.style.width).toBe(320); // max(100+200, 120+300) - 100 = 420 - 100 = 320
  });

  it("converts a single layer into a mask with useAsMask()", () => {
    const store = useProjectStore.getState();

    const circle: ShapeLayer = {
      id: "stencil-shape",
      name: "Stencil Shape",
      type: "shape",
      shapeType: "circle",
      style: { x: 50, y: 50, width: 150, height: 150, rotation: 0, opacity: 1 },
    };

    const text: TextLayer = {
      id: "body-copy",
      name: "Body Copy",
      type: "text",
      content: "Hello World",
      style: { x: 60, y: 60, width: 200, height: 60, rotation: 0, opacity: 1 },
    };

    store.addLayer(circle);
    store.addLayer(text);

    // Call useAsMask on the stencil shape
    useProjectStore.getState().useAsMask("stencil-shape");

    const screen = useProjectStore.getState().document.screens[0];
    expect(screen.layers.length).toBe(1);
    const group = screen.layers[0] as GroupLayer;
    expect(group.isMaskGroup).toBe(true);
    expect(group.children.find((c) => c.id === "stencil-shape")?.isMask).toBe(true);
  });

  it("toggles mask inversion with toggleMaskInvert()", () => {
    const store = useProjectStore.getState();

    const shape: ShapeLayer = {
      id: "s1",
      name: "Shape",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const text: TextLayer = {
      id: "t1",
      name: "Text",
      type: "text",
      content: "Invert test",
      style: { x: 10, y: 10, width: 100, height: 50, rotation: 0, opacity: 1 },
    };

    store.addLayer(shape);
    store.addLayer(text);
    useProjectStore.setState({ selectedLayerIds: ["s1", "t1"] });
    useProjectStore.getState().maskSelection();

    const screen = useProjectStore.getState().document.screens[0];
    const group = screen.layers[0] as GroupLayer;
    expect(group.invertMask).toBe(false);

    // Toggle invert via group ID
    useProjectStore.getState().toggleMaskInvert(group.id);
    const invertedGroup = useProjectStore.getState().document.screens[0].layers[0] as GroupLayer;
    expect(invertedGroup.invertMask).toBe(true);

    // Toggle invert via child ID (self-healing lookup)
    useProjectStore.getState().toggleMaskInvert("s1");
    const revertedGroup = useProjectStore.getState().document.screens[0].layers[0] as GroupLayer;
    expect(revertedGroup.invertMask).toBe(false);
  });

  it("releases mask with unmaskGroup()", () => {
    const store = useProjectStore.getState();

    const shape: ShapeLayer = {
      id: "s1",
      name: "Shape",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const text: TextLayer = {
      id: "t1",
      name: "Text",
      type: "text",
      content: "Unmask test",
      style: { x: 10, y: 10, width: 100, height: 50, rotation: 0, opacity: 1 },
    };

    store.addLayer(shape);
    store.addLayer(text);
    useProjectStore.setState({ selectedLayerIds: ["s1", "t1"] });
    useProjectStore.getState().maskSelection();

    const maskGroup = useProjectStore.getState().document.screens[0].layers[0] as GroupLayer;
    expect(maskGroup.isMaskGroup).toBe(true);

    // Unmask via group ID
    useProjectStore.getState().unmaskGroup(maskGroup.id);

    const releasedGroup = useProjectStore.getState().document.screens[0].layers[0] as GroupLayer;
    expect(releasedGroup.isMaskGroup).toBe(false);
    expect(releasedGroup.children.every((c) => !c.isMask)).toBe(true);
  });

  it("renders SVG mask geometry for circles, rectangles, stars, polygons, and text", () => {
    // Circle mask
    const circle: ShapeLayer = {
      id: "c1",
      name: "Circle",
      type: "shape",
      shapeType: "circle",
      style: { x: 20, y: 30, width: 120, height: 120, rotation: 0, opacity: 1 },
    };
    const circleEl = renderMaskGeometry(circle, "white") as React.ReactElement<any>;
    expect(circleEl.type).toBe("ellipse");
    expect(circleEl.props.rx).toBe(60);
    expect(circleEl.props.ry).toBe(60);
    expect(circleEl.props.fill).toBe("white");

    // Rectangle mask with border radius
    const rect: ShapeLayer = {
      id: "r1",
      name: "Rect",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 10, y: 15, width: 200, height: 100, borderRadius: 16, rotation: 0, opacity: 1 },
    };
    const rectEl = renderMaskGeometry(rect, "white") as React.ReactElement<any>;
    expect(rectEl.type).toBe("rect");
    expect(rectEl.props.rx).toBe(16);
    expect(rectEl.props.width).toBe(200);

    // Star mask
    const star: ShapeLayer = {
      id: "st1",
      name: "Star",
      type: "shape",
      shapeType: "star",
      points: 5,
      innerRadiusRatio: 0.4,
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const starEl = renderMaskGeometry(star, "black") as React.ReactElement<any>;
    expect(starEl.type).toBe("polygon");
    expect(starEl.props.fill).toBe("black");

    // Text mask
    const text: TextLayer = {
      id: "tx1",
      name: "Text",
      type: "text",
      content: "APPLE",
      style: { x: 0, y: 0, width: 300, height: 80, fontSize: 64, fontFamily: "Inter", rotation: 0, opacity: 1 },
    };
    const textEl = renderMaskGeometry(text, "white") as React.ReactElement<any>;
    expect(textEl.type).toBe("text");
    expect(textEl.props.fontSize).toBe(64);
    expect(textEl.props.children).toBe("APPLE");
  });

  it("builds context menu items for Mask Selection, Use as Mask, and Release Mask", () => {
    const store = useProjectStore.getState();

    const shape: ShapeLayer = {
      id: "s1",
      name: "Shape",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const text: TextLayer = {
      id: "t1",
      name: "Text",
      type: "text",
      content: "Menu test",
      style: { x: 10, y: 10, width: 100, height: 50, rotation: 0, opacity: 1 },
    };

    store.addLayer(shape);
    store.addLayer(text);

    // 1. Single selection: offers "Use as Mask"
    useProjectStore.setState({ selectedLayerIds: ["s1"] });
    let items = buildCanvasElementMenu({ layer: shape, store: useProjectStore.getState() });
    expect(items.some((i) => i.id === "use-as-mask")).toBe(true);

    // 2. Multi-selection: offers "Mask Selection"
    useProjectStore.setState({ selectedLayerIds: ["s1", "t1"] });
    items = buildCanvasElementMenu({ layer: shape, store: useProjectStore.getState() });
    expect(items.some((i) => i.id === "mask-selection")).toBe(true);

    // 3. Inside Mask Group: offers "Release Mask" and "Invert Mask"
    useProjectStore.getState().maskSelection();
    const maskGroup = useProjectStore.getState().document.screens[0].layers[0] as GroupLayer;
    items = buildCanvasElementMenu({ layer: maskGroup, store: useProjectStore.getState() });
    expect(items.some((i) => i.id === "release-mask")).toBe(true);
    expect(items.some((i) => i.id === "toggle-mask-invert")).toBe(true);
  });
});
