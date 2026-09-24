import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useProjectStore } from "../store/useProjectStore";
import { DesignInspector } from "../components/inspector/DesignInspector";
import { FloatingDesignToolbar } from "../components/canvas/FloatingDesignToolbar";
import { ShapeLayer, TextLayer } from "../types/scene";

describe("Multi-Selection Inspector & Unified Toolbar UX", () => {
  beforeEach(() => {
    const store = useProjectStore.getState();
    store.deselectAll();
    useProjectStore.setState({
      activeTool: "select",
      document: {
        ...store.document,
        screens: [
          {
            ...store.document.screens[0],
            layers: [],
          },
        ],
      },
    });
  });

  it("renders single-element cards when 1 element is selected", () => {
    const shape: ShapeLayer = {
      id: "rect-1",
      name: "Rectangle 1",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 50, y: 50, width: 200, height: 100, rotation: 0, opacity: 1, backgroundColor: "#333333" },
    };

    useProjectStore.getState().addLayer(shape);
    useProjectStore.setState({ selectedLayerIds: ["rect-1"] });

    render(<DesignInspector />);

    // Single-layer inspector shows Layout (TransformCard) and Fill (AppearanceCard), but NOT MultiSelectionCard
    expect(screen.getByText("Layout")).toBeDefined();
    expect(screen.getByText("Position")).toBeDefined();
    expect(screen.getByText("Fill")).toBeDefined();
    expect(screen.queryByTestId("multi-selection-card")).toBeNull();
  });

  it("renders MultiSelectionCard with Masking and Boolean options when 2+ elements are selected, omitting single-element cards", () => {
    const shape1: ShapeLayer = {
      id: "shape-1",
      name: "Circle 1",
      type: "shape",
      shapeType: "circle",
      style: { x: 100, y: 100, width: 150, height: 150, rotation: 0, opacity: 1, backgroundColor: "#ff0000" },
    };
    const text1: TextLayer = {
      id: "text-1",
      name: "Headline",
      type: "text",
      content: "Hello Mask",
      style: { x: 120, y: 120, width: 200, height: 60, rotation: 0, opacity: 1, color: "#ffffff", fontSize: 24 },
    };

    useProjectStore.getState().addLayer(shape1);
    useProjectStore.getState().addLayer(text1);
    useProjectStore.setState({ selectedLayerIds: ["shape-1", "text-1"] });

    render(<DesignInspector />);

    // Shows multi-selection card
    expect(screen.getByTestId("multi-selection-card")).toBeDefined();
    expect(screen.getByText("2 elements selected")).toBeDefined();
    expect(screen.getByText("Masking")).toBeDefined();
    expect(screen.getByText("Mask Selection")).toBeDefined();
    expect(screen.getByText("Boolean Operations")).toBeDefined();
    expect(screen.getByText("Union")).toBeDefined();
    expect(screen.getByText("Subtract")).toBeDefined();
    expect(screen.getByText("Intersect")).toBeDefined();
    expect(screen.getByText("Exclude")).toBeDefined();
    expect(screen.getByText("Flatten to Vector Path")).toBeDefined();
    expect(screen.getByText("Group (2)")).toBeDefined();

    // Irrelevant single-element properties must NOT be rendered
    expect(screen.queryByText("Layout")).toBeNull();
    expect(screen.queryByText("Position")).toBeNull();
    expect(screen.queryByText("Fill")).toBeNull();
    expect(screen.queryByText("Typography")).toBeNull();
  });

  it("triggers maskSelection() when Mask Selection button is clicked in inspector", () => {
    const shape1: ShapeLayer = {
      id: "mask-base",
      name: "Base Shape",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 100, y: 100, width: 200, height: 200, rotation: 0, opacity: 1 },
    };
    const shape2: ShapeLayer = {
      id: "mask-top",
      name: "Top Shape",
      type: "shape",
      shapeType: "circle",
      style: { x: 120, y: 120, width: 100, height: 100, rotation: 0, opacity: 1 },
    };

    useProjectStore.getState().addLayer(shape1);
    useProjectStore.getState().addLayer(shape2);
    useProjectStore.setState({ selectedLayerIds: ["mask-base", "mask-top"] });

    render(<DesignInspector />);

    const maskBtn = screen.getByTitle("Create Mask Group (Ctrl+Alt+M)");
    fireEvent.click(maskBtn);

    const activeLayers = useProjectStore.getState().document.screens[0].layers;
    expect(activeLayers.length).toBe(1);
    expect(activeLayers[0].type).toBe("group");
    expect((activeLayers[0] as any).isMaskGroup).toBe(true);
  });

  it("does not render boolean operation buttons in the bottom floating toolbar", () => {
    const shape1: ShapeLayer = {
      id: "s1",
      name: "S1",
      type: "shape",
      shapeType: "rectangle",
      style: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
    };
    const shape2: ShapeLayer = {
      id: "s2",
      name: "S2",
      type: "shape",
      shapeType: "circle",
      style: { x: 20, y: 20, width: 100, height: 100, rotation: 0, opacity: 1 },
    };

    useProjectStore.getState().addLayer(shape1);
    useProjectStore.getState().addLayer(shape2);
    useProjectStore.setState({ selectedLayerIds: ["s1", "s2"] });

    render(<FloatingDesignToolbar />);

    // Boolean buttons must not be in floating toolbar
    expect(screen.queryByTitle("Union Selection (Ctrl+Alt+U)")).toBeNull();
    expect(screen.queryByTitle("Subtract Selection (Ctrl+Alt+S)")).toBeNull();
    expect(screen.queryByTitle("Intersect Selection (Ctrl+Alt+I)")).toBeNull();
    expect(screen.queryByTitle("Exclude Selection (Ctrl+Alt+X)")).toBeNull();
    expect(screen.queryByTitle("Flatten to Vector Path (Ctrl+E)")).toBeNull();
  });

  it("provides unified Vector Drawing dropdown for Pen and Pencil in floating toolbar", () => {
    render(<FloatingDesignToolbar />);

    const vectorButton = screen.getByTitle("Vector Drawing (Pen & Pencil)");
    expect(vectorButton).toBeDefined();

    // Opening dropdown reveals Pen and Pencil options in Radix UI
    fireEvent.pointerDown(vectorButton, { button: 0, ctrlKey: false });
    fireEvent.keyDown(vectorButton, { key: "ArrowDown" });

    expect(screen.getByText("Pen")).toBeDefined();
    expect(screen.getByText("Pencil")).toBeDefined();

    // Selecting pencil activates pencil tool
    fireEvent.click(screen.getByText("Pencil"));
    expect(useProjectStore.getState().activeTool).toBe("pencil");
  });

  it("provides Media dropdown supporting both Image and Vector SVG in floating toolbar", () => {
    render(<FloatingDesignToolbar />);

    const mediaButton = screen.getByTitle("Import Media (Image or SVG)");
    expect(mediaButton).toBeDefined();

    // Opening dropdown reveals Image and Vector SVG options in Radix UI
    fireEvent.pointerDown(mediaButton, { button: 0, ctrlKey: false });
    fireEvent.keyDown(mediaButton, { key: "ArrowDown" });

    expect(screen.getByText("Image")).toBeDefined();
    expect(screen.getByText("Vector SVG")).toBeDefined();
  });
});
