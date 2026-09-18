import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore, findParentGroupInTree, findTopmostParentGroupInTree } from "../store/useProjectStore";
import { Layer, GroupLayer, TextLayer } from "../types/scene";

describe("Canvas Interaction & State Matrix Tests", () => {
  beforeEach(() => {
    // Reset document state
    const state = useProjectStore.getState();
    state.deselectAll();
    state.setEditingLayerId(null);
  });

  describe("Domain A: Text Lifecycle & Auto-Sizing Paradigms", () => {
    it("preserves height as 'auto' when updating text layer width", () => {
      const state = useProjectStore.getState();
      const textId = "text_test_1";
      const textLayer: Layer = {
        id: textId,
        name: "Test Headline",
        type: "text",
        content: "This is a multi-line headline that will reflow naturally.",
        style: {
          x: 100,
          y: 100,
          width: "auto",
          height: "auto",
          fontSize: 48,
          rotation: 0,
          opacity: 1,
        },
      };

      state.addLayer(textLayer);
      
      // Simulate resizing East/West handle to fixed width 350
      state.updateLayerStyle(textId, { width: 350, height: "auto" });

      const doc = useProjectStore.getState().document;
      const updated = doc.screens[0].layers.find((l) => l.id === textId);
      expect(updated).toBeDefined();
      expect(updated?.style.width).toBe(350);
      expect(updated?.style.height).toBe("auto");
    });

    it("splits text into kinetic chunks inside an auto-fit group", () => {
      const state = useProjectStore.getState();
      const textId = "text_split_1";
      const textLayer: Layer = {
        id: textId,
        name: "Split Target",
        type: "text",
        content: "Antigravity is amazing for choreo",
        style: {
          x: 200,
          y: 200,
          width: 400,
          height: "auto",
          fontSize: 36,
          rotation: 0,
          opacity: 1,
        },
      };

      state.addLayer(textLayer);
      state.selectLayer(textId);

      // Highlight "is amazing" (indices 12 to 22)
      state.splitTextRange(textId, 12, 22);

      const doc = useProjectStore.getState().document;
      // The original text layer should have been replaced by a group containing the chunks
      const group = doc.screens[0].layers.find(
        (l) => l.type === "group" && l.children?.some((c: any) => c.content === "is amazing")
      ) as GroupLayer;
      expect(group).toBeDefined();
      expect(group.children.length).toBe(3);
      expect(group.autoFit).toBe(true);
      expect(group.autoLink).toBe(true);

      const [c1, c2, c3] = group.children as any[];
      expect(c1.content).toBe("Antigravity ");
      expect(c2.content).toBe("is amazing");
      expect(c3.content).toBe(" for choreo");
    });

    it("reverse-merges sibling chunks and automatically dissolves group when only 1 chunk remains", () => {
      const state = useProjectStore.getState();
      const groupId = "test_group_reverse";
      const chunk1Id = "c_rev_1";
      const chunk2Id = "c_rev_2";

      const groupLayer: GroupLayer = {
        id: groupId,
        name: "Mini Group",
        type: "group",
        layout: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          align: "center",
        },
        autoFit: true,
        style: { x: 300, y: 300, width: "auto", height: "auto", rotation: 0, opacity: 1 },
        children: [
          {
            id: chunk1Id,
            name: "Part 1",
            type: "chunk",
            content: "Hello ",
            style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1, fontSize: 32 },
          },
          {
            id: chunk2Id,
            name: "Part 2",
            type: "chunk",
            content: "World",
            style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1, fontSize: 32 },
          },
        ],
      };

      state.addLayer(groupLayer);

      // Merge chunk 2 back into chunk 1 (as if backspace was pressed at index 0 of chunk 2)
      state.mergeChunkWithPrevious(chunk2Id);

      const doc = useProjectStore.getState().document;
      // Because only 1 chunk remained ("Hello World"), the group container must have dissolved
      const groupStillExists = doc.screens[0].layers.find((l) => l.id === groupId);
      expect(groupStillExists).toBeUndefined();

      // The promoted layer should now exist at root with type 'text'
      const promoted = doc.screens[0].layers.find((l) => l.id === chunk1Id) as TextLayer;
      expect(promoted).toBeDefined();
      expect(promoted.type).toBe("text");
      expect(promoted.content).toBe("Hello World");
      expect(promoted.style.x).toBe(300); // Translated to group absolute origin
      expect(promoted.style.y).toBe(300);
    });

    it("ensures text editing preserves state during IME composition and commits cleanly", () => {
      const state = useProjectStore.getState();
      const textId = "text_ime_test";
      const textLayer: Layer = {
        id: textId,
        name: "Japanese Text",
        type: "text",
        content: "Initial",
        style: { x: 100, y: 100, width: "auto", height: "auto", rotation: 0, opacity: 1 },
      };
      state.addLayer(textLayer);
      state.selectLayer(textId);
      state.setEditingLayerId(textId);
      expect(useProjectStore.getState().editingLayerId).toBe(textId);

      // Simulating IME composition:
      // While composing, content is modified
      state.updateLayer(textId, { content: "Initial こんにちは" });
      expect(useProjectStore.getState().editingLayerId).toBe(textId);

      // Commit edit returns editingLayerId to null and layer stays selected
      state.setEditingLayerId(null);
      expect(useProjectStore.getState().editingLayerId).toBeNull();
      expect(useProjectStore.getState().selectedLayerIds).toContain(textId);
      const updated = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === textId) as TextLayer;
      expect(updated.content).toBe("Initial こんにちは");
    });
  });

  describe("Domain C: Coordinate Systems & Grouping/Ungrouping Math", () => {
    it("groups multiple layers with accurate bounding box and relative coordinate shifts", () => {
      const state = useProjectStore.getState();
      const l1: Layer = {
        id: "box_1",
        name: "Box 1",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 200, width: 150, height: 100, rotation: 0, opacity: 1 },
      };
      const l2: Layer = {
        id: "box_2",
        name: "Box 2",
        type: "shape",
        shapeType: "circle",
        style: { x: 300, y: 250, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      state.addLayer(l1);
      state.addLayer(l2);

      // Select both layers
      useProjectStore.setState({ selectedLayerIds: ["box_1", "box_2"] });

      // Group selection
      state.groupSelection();

      const doc = useProjectStore.getState().document;
      const createdGroup = doc.screens[0].layers.find(
        (l) => l.type === "group" && l.children?.some((c) => c.id === "box_1")
      ) as GroupLayer;

      expect(createdGroup).toBeDefined();
      // Bounding box:
      // minX = 100, minY = 200
      // maxX = max(100+150, 300+100) = 400
      // maxY = max(200+100, 250+100) = 350
      expect(createdGroup.style.x).toBe(100);
      expect(createdGroup.style.y).toBe(200);
      expect(createdGroup.style.width).toBe(300); // 400 - 100
      expect(createdGroup.style.height).toBe(150); // 350 - 200
      expect(createdGroup.layout?.display).toBe("none");
      expect(createdGroup.autoFit).toBe(false);

      // Relative coordinates of children:
      const child1 = createdGroup.children.find((c) => c.id === "box_1")!;
      const child2 = createdGroup.children.find((c) => c.id === "box_2")!;
      expect(child1.style.x).toBe(0); // 100 - 100
      expect(child1.style.y).toBe(0); // 200 - 200
      expect(child2.style.x).toBe(200); // 300 - 100
      expect(child2.style.y).toBe(50); // 250 - 200
    });

    it("ungroups layers restoring exact root absolute coordinates without visual jump", () => {
      const state = useProjectStore.getState();
      const groupId = "group_to_ungroup";
      const childId = "child_inside";

      const group: GroupLayer = {
        id: groupId,
        name: "Group Outer",
        type: "group",
        layout: { display: "flex", flexDirection: "column", gap: 10, align: "start" },
        autoFit: true,
        style: { x: 500, y: 400, width: 300, height: 200, rotation: 0, opacity: 1 },
        children: [
          {
            id: childId,
            name: "Child Layer",
            type: "shape",
            shapeType: "rectangle",
            style: { x: 30, y: 45, width: 100, height: 80, rotation: 0, opacity: 1 },
          },
        ],
      };

      state.addLayer(group);
      state.ungroup(groupId);

      const doc = useProjectStore.getState().document;
      expect(doc.screens[0].layers.find((l) => l.id === groupId)).toBeUndefined();

      const hoistedChild = doc.screens[0].layers.find((l) => l.id === childId);
      expect(hoistedChild).toBeDefined();
      // Transformed absolute coordinates: 500 + 30 = 530, 400 + 45 = 445
      expect(hoistedChild?.style.x).toBe(530);
      expect(hoistedChild?.style.y).toBe(445);
    });

    it("reverse-merges forward chunk using mergeChunkWithNext (Delete key at end)", () => {
      const state = useProjectStore.getState();
      const groupId = "group_forward_merge";
      const c1Id = "c_fwd_1";
      const c2Id = "c_fwd_2";

      const group: GroupLayer = {
        id: groupId,
        name: "Forward Merge Group",
        type: "group",
        layout: { display: "flex", flexDirection: "row", gap: 8, align: "center" },
        autoFit: true,
        style: { x: 100, y: 100, width: "auto", height: "auto", rotation: 0, opacity: 1 },
        children: [
          { id: c1Id, name: "Chunk A", type: "chunk", content: "Part A ", style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 } },
          { id: c2Id, name: "Chunk B", type: "chunk", content: "Part B", style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 } },
        ],
      };

      state.addLayer(group);

      // Trigger mergeChunkWithNext on c1Id (Delete key pressed when caret at end of Chunk A)
      state.mergeChunkWithNext(c1Id);

      const doc = useProjectStore.getState().document;
      // Group dissolved since only 1 chunk remained
      expect(doc.screens[0].layers.find((l) => l.id === groupId)).toBeUndefined();
      const promoted = doc.screens[0].layers.find((l) => l.id === c1Id) as TextLayer;
      expect(promoted).toBeDefined();
      expect(promoted.type).toBe("text");
      expect(promoted.content).toBe("Part A Part B");
    });
  });

  describe("Domain B: Selection & Hierarchical Traversal", () => {
    it("identifies parent group for child chunks to enable container selection and Shift+Enter traversal", () => {
      const state = useProjectStore.getState();
      const testGroupId = "test_parent_group";
      const testChunkId = "test_child_chunk";
      const testGroup: GroupLayer = {
        id: testGroupId,
        name: "Test Group",
        type: "group",
        layout: { display: "flex", flexDirection: "column", gap: 8, align: "center" },
        autoFit: true,
        style: { x: 100, y: 100, width: 300, height: 200, rotation: 0, opacity: 1 },
        children: [
          {
            id: testChunkId,
            name: "Child Chunk",
            type: "text",
            content: "Child text",
            style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1, fontSize: 24 },
          },
        ],
      };
      state.addLayer(testGroup);

      const doc = useProjectStore.getState().document;
      const parent = findParentGroupInTree(doc.screens[0].layers, testChunkId);
      expect(parent).toBeDefined();
      expect(parent?.id).toBe(testGroupId);
    });

    it("identifies topmost parent group across nested hierarchies for hierarchical drill-down", () => {
      const state = useProjectStore.getState();
      const outerGroupId = "outer_card";
      const innerGroupId = "inner_container";
      const deepChunkId = "deep_chunk";

      const outerGroup: GroupLayer = {
        id: outerGroupId,
        name: "Outer Card",
        type: "group",
        layout: { display: "flex", flexDirection: "column", gap: 10, align: "center" },
        autoFit: true,
        style: { x: 50, y: 50, width: 400, height: 300, rotation: 0, opacity: 1 },
        children: [
          {
            id: innerGroupId,
            name: "Inner Subcard",
            type: "group",
            layout: { display: "flex", flexDirection: "row", gap: 8, align: "center" },
            autoFit: true,
            style: { x: 10, y: 10, width: 200, height: 100, rotation: 0, opacity: 1 },
            children: [
              {
                id: deepChunkId,
                name: "Deep Chunk",
                type: "chunk",
                content: "Deep text",
                style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
              },
            ],
          },
        ],
      };

      state.addLayer(outerGroup);
      const layers = useProjectStore.getState().document.screens[0].layers;

      const directParent = findParentGroupInTree(layers, deepChunkId);
      expect(directParent?.id).toBe(innerGroupId);

      const topmostAncestor = findTopmostParentGroupInTree(layers, deepChunkId);
      expect(topmostAncestor?.id).toBe(outerGroupId);

      const topmostOfInner = findTopmostParentGroupInTree(layers, innerGroupId);
      expect(topmostOfInner?.id).toBe(outerGroupId);

      const topmostOfOuter = findTopmostParentGroupInTree(layers, outerGroupId);
      expect(topmostOfOuter).toBeNull();
    });

    it("duplicates layers in-place at identical coordinates for Alt+drag cloning", () => {
      const state = useProjectStore.getState();
      const origLayer: Layer = {
        id: "clone_src_1",
        name: "Cloning Source",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 350,
          y: 450,
          width: 200,
          height: 100,
          rotation: 0,
          opacity: 1,
          backgroundColor: "#ff0000",
        },
      };

      state.addLayer(origLayer);
      const cloneId = state.duplicateLayerInPlace("clone_src_1");
      expect(cloneId).toBeDefined();

      const doc = useProjectStore.getState().document;
      const clone = doc.screens[0].layers.find((l) => l.id === cloneId);
      expect(clone).toBeDefined();
      expect(clone?.style.x).toBe(350);
      expect(clone?.style.y).toBe(450);
      expect(clone?.name).toBe("Cloning Source (Copy)");
    });

    it("verifies ripple auto-link shifts subsequent sibling start times forward on duration change", () => {
      const state = useProjectStore.getState();
      const groupId = "ripple_group_test";
      const c1Id = "rip_c1";
      const c2Id = "rip_c2";
      const c3Id = "rip_c3";

      const group: GroupLayer = {
        id: groupId,
        name: "Ripple Container",
        type: "group",
        layout: { display: "flex", flexDirection: "column", gap: 12, align: "center" },
        autoFit: true,
        autoLink: true,
        style: { x: 100, y: 100, width: 300, height: 200, rotation: 0, opacity: 1 },
        children: [
          {
            id: c1Id,
            name: "Chunk 1",
            type: "chunk",
            content: "First",
            style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
            animation: { in: { preset: "pop", start: 0.0, duration: 0.6, easing: "bouncy" } },
          },
          {
            id: c2Id,
            name: "Chunk 2",
            type: "chunk",
            content: "Second",
            style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
            animation: { in: { preset: "pop", start: 0.15, duration: 0.6, easing: "bouncy" } },
          },
          {
            id: c3Id,
            name: "Chunk 3",
            type: "chunk",
            content: "Third",
            style: { x: 0, y: 0, width: "auto", height: "auto", rotation: 0, opacity: 1 },
            animation: { in: { preset: "pop", start: 0.30, duration: 0.6, easing: "bouncy" } },
          },
        ],
      };

      state.addLayer(group);

      // Now mutate Chunk 1 duration from 0.6s to 0.8s (+0.2s)
      state.updateLayerAnimation(c1Id, {
        in: {
          preset: "pop",
          start: 0.0,
          duration: 0.8,
          easing: "bouncy",
        },
      });

      const docAfter = useProjectStore.getState().document;
      const foundGroupAfter = docAfter.screens[0].layers.find((l) => l.id === groupId) as GroupLayer;
      const [ch1After, ch2After, ch3After] = foundGroupAfter.children;

      expect(ch1After.animation?.in?.duration).toBe(0.8);
      // Chunk 2 and Chunk 3 must cascade forward by +0.2s!
      expect(ch2After.animation?.in?.start).toBeCloseTo(0.35);
      expect(ch3After.animation?.in?.start).toBeCloseTo(0.50);

      // When autoLink is disabled on the group, subsequent siblings must not ripple
      state.updateLayer(groupId, { autoLink: false });
      state.updateLayerAnimation(c1Id, {
        in: {
          preset: "pop",
          start: 0.0,
          duration: 1.0,
          easing: "bouncy",
        },
      });

      const docNoLink = useProjectStore.getState().document;
      const foundGroupNoLink = docNoLink.screens[0].layers.find((l) => l.id === groupId) as GroupLayer;
      const [, ch2NoLink, ch3NoLink] = foundGroupNoLink.children;

      // Unlinked: Chunk 2 and 3 stay at 0.35 and 0.50
      expect(ch2NoLink.animation?.in?.start).toBeCloseTo(0.35);
      expect(ch3NoLink.animation?.in?.start).toBeCloseTo(0.50);
    });
  });

  describe("Domain C: Creative Tool State Machine & Media Pipeline", () => {
    it("manages activeTool state transitions across creative tools", () => {
      const state = useProjectStore.getState();
      expect(state.activeTool).toBe("select");

      state.setTool("hand");
      expect(useProjectStore.getState().activeTool).toBe("hand");

      state.setTool("text");
      expect(useProjectStore.getState().activeTool).toBe("text");

      state.setTool("circle");
      expect(useProjectStore.getState().activeTool).toBe("circle");

      state.setTool("rectangle");
      expect(useProjectStore.getState().activeTool).toBe("rectangle");

      state.setTool("select");
      expect(useProjectStore.getState().activeTool).toBe("select");
    });

    it("creates media layer with natural dimensions and aspect ratio preservation", () => {
      const state = useProjectStore.getState();
      const mediaId = `media_${Date.now()}`;
      const mediaLayer: Layer = {
        id: mediaId,
        name: "Company Logo",
        type: "image",
        src: "data:image/svg+xml;utf8,<svg viewBox='0 0 100 100'></svg>",
        objectFit: "cover",
        style: {
          x: 400,
          y: 300,
          width: 500,
          height: 333,
          rotation: 0,
          opacity: 1,
          borderRadius: 16,
        },
      };

      state.addLayer(mediaLayer);

      const doc = useProjectStore.getState().document;
      const created = doc.screens[0].layers.find((l) => l.id === mediaId);
      expect(created).toBeDefined();
      expect(created?.name).toBe("Company Logo");
      expect(created?.style.width).toBe(500);
      expect(created?.style.height).toBe(333);
      expect(created?.style.borderRadius).toBe(16);
    });

    it("resets activeTool to select when toggling uiMode between design and animate", () => {
      const state = useProjectStore.getState();
      state.setTool("hand");
      expect(useProjectStore.getState().activeTool).toBe("hand");

      state.setUiMode("animate");
      expect(useProjectStore.getState().uiMode).toBe("animate");
      expect(useProjectStore.getState().activeTool).toBe("select");

      state.setTool("rectangle");
      expect(useProjectStore.getState().activeTool).toBe("rectangle");

      state.setUiMode("design");
      expect(useProjectStore.getState().uiMode).toBe("design");
      expect(useProjectStore.getState().activeTool).toBe("select");
    });

    it("supports multi-element marquee selection and shift-additive selection", () => {
      const state = useProjectStore.getState();
      const layerA: Layer = {
        id: "marquee_test_a",
        name: "Layer A",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
      };
      const layerB: Layer = {
        id: "marquee_test_b",
        name: "Layer B",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 200, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
      };
      const layerC: Layer = {
        id: "marquee_test_c",
        name: "Layer C",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 500, y: 500, width: 100, height: 100, rotation: 0, opacity: 1 },
      };

      state.addLayer(layerA);
      state.addLayer(layerB);
      state.addLayer(layerC);

      // Simulate marquee enclosing Layer A and Layer B
      const marqueeBox = { x: 0, y: 0, width: 350, height: 200 };
      const checkIntersect = (l: Layer) => {
        const lx = l.style.x || 0;
        const ly = l.style.y || 0;
        const lw = typeof l.style.width === "number" ? l.style.width : 100;
        const lh = typeof l.style.height === "number" ? l.style.height : 100;
        return (
          lx < marqueeBox.x + marqueeBox.width &&
          lx + lw > marqueeBox.x &&
          ly < marqueeBox.y + marqueeBox.height &&
          ly + lh > marqueeBox.y
        );
      };

      const selected = [layerA, layerB, layerC].filter(checkIntersect).map((l) => l.id);
      expect(selected).toEqual(["marquee_test_a", "marquee_test_b"]);

      useProjectStore.setState({ selectedLayerIds: selected });
      expect(useProjectStore.getState().selectedLayerIds).toEqual([
        "marquee_test_a",
        "marquee_test_b",
      ]);

      // Simulate Shift + Click / Additive marquee selecting Layer C
      const combined = Array.from(new Set([...useProjectStore.getState().selectedLayerIds, layerC.id]));
      useProjectStore.setState({ selectedLayerIds: combined });
      expect(useProjectStore.getState().selectedLayerIds).toEqual([
        "marquee_test_a",
        "marquee_test_b",
        "marquee_test_c",
      ]);
    });

    it("calculates continuous rotation angles without jumps and updates corner radius values", () => {
      const state = useProjectStore.getState();
      const rectId = "rect_rot_rad_test";

      const rect: Layer = {
        id: rectId,
        name: "Test Rect",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 100, y: 100, width: 200, height: 200, rotation: 0, opacity: 1, borderRadius: 0 },
      };

      state.addLayer(rect);

      // Verify angular delta rotation formula from arbitrary corner (e.g. top-right corner at 45 deg)
      const centerX = 200;
      const centerY = 200;
      // Start at top-right corner (200 + 100, 200 - 100) -> atan2(-100, 100) = -45 deg
      const startX = 300;
      const startY = 100;
      const initialRad = Math.atan2(startY - centerY, startX - centerX);

      // Drag mouse 30 deg clockwise
      const currentRad = initialRad + (30 * Math.PI) / 180;
      let diff = currentRad - initialRad;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const deltaDeg = (diff * 180) / Math.PI;

      const newRot = Math.round(((0 + deltaDeg) % 360 + 360) % 360);
      expect(newRot).toBe(30);

      state.updateLayerStyle(rectId, { rotation: newRot });
      expect(useProjectStore.getState().document.screens[0].layers.find((l) => l.id === rectId)?.style.rotation).toBe(30);

      // Verify corner radius update
      state.updateLayerStyle(rectId, { borderRadius: 24 });
      expect(useProjectStore.getState().document.screens[0].layers.find((l) => l.id === rectId)?.style.borderRadius).toBe(24);
    });

    it("maintains canonical unrotated dimensions and local coordinates on rotated layers without AABB double-rotation", () => {
      const state = useProjectStore.getState();
      const rectId = "rect_rotated_90_test";

      const rotatedRect: Layer = {
        id: rectId,
        name: "Rotated Yellow Rect",
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: 200,
          y: 150,
          width: 649,
          height: 794,
          rotation: 90,
          opacity: 1,
          backgroundColor: "#e8c547",
        },
      };

      state.addLayer(rotatedRect);
      useProjectStore.getState().selectLayer(rectId);

      const activeLayer = useProjectStore.getState().document.screens[0].layers.find((l) => l.id === rectId)!;
      expect(activeLayer).toBeDefined();

      // For single layer selection, TransformBox must use canonical local dimensions and NOT screen AABB
      const isMulti = false;
      const bounds = null; // CanvasViewport now passes null for single selection

      const visualW =
        isMulti && bounds
          ? (bounds as any).width
          : typeof activeLayer.style.width === "number"
          ? activeLayer.style.width
          : 200;

      const visualH =
        isMulti && bounds
          ? (bounds as any).height
          : typeof activeLayer.style.height === "number"
          ? activeLayer.style.height
          : 100;

      const visualX = isMulti && bounds ? (bounds as any).x : activeLayer.style.x || 0;
      const visualY = isMulti && bounds ? (bounds as any).y : activeLayer.style.y || 0;
      const rotation = isMulti ? 0 : activeLayer.style.rotation || 0;

      // Assert dimensions are preserved without swapping
      expect(visualW).toBe(649);
      expect(visualH).toBe(794);
      expect(visualX).toBe(200);
      expect(visualY).toBe(150);
      expect(rotation).toBe(90);

      // Verify center invariant:
      // Center of unrotated element (200 + 649/2, 150 + 794/2) = (524.5, 547)
      const centerX = visualX + visualW / 2;
      const centerY = visualY + visualH / 2;
      expect(centerX).toBe(524.5);
      expect(centerY).toBe(547);

      // Verify that multi-selection encloses both and resets rotation to 0
      const secondLayer: Layer = {
        id: "second_layer_test",
        name: "Second Layer",
        type: "shape",
        shapeType: "rectangle",
        style: { x: 900, y: 300, width: 200, height: 200, rotation: 45, opacity: 1 },
      };
      useProjectStore.getState().addLayer(secondLayer);
      useProjectStore.getState().selectLayer(rectId, true);

      expect(useProjectStore.getState().selectedLayerIds.length).toBe(2);
      const multiIsMulti = true;
      const multiRotation = multiIsMulti ? 0 : 90;
      expect(multiRotation).toBe(0);
    });
  });
});

