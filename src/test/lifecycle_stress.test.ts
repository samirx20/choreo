import { describe, it, expect } from "vitest";
import { TransactionalHistory } from "@/store/history";
import { INITIAL_SCENE } from "@/store/useProjectStore";
import { SceneDocument, ShapeLayer, GroupLayer, Screen } from "@/types/scene";

describe("State Lifecycle & Transactional Stress Testing (Pillar 5)", () => {
  it("executes 50 rapid sequential mutations and rolls back with 100% undo fidelity", () => {
    const history = new TransactionalHistory(INITIAL_SCENE);
    const snapshots: string[] = [JSON.stringify(history.getPresent())];

    // Sequentially push 50 discrete scene alterations
    let currentDoc: SceneDocument = history.getPresent();
    for (let i = 1; i <= 50; i++) {
      const newLayer: ShapeLayer = {
        id: `stress_layer_${i}`,
        name: `Layer ${i}`,
        type: "shape",
        shapeType: "rectangle",
        style: {
          x: i * 10,
          y: i * 5,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
        },
      };

      currentDoc = {
        ...currentDoc,
        screens: currentDoc.screens.map((screen, idx) =>
          idx === 0 ? { ...screen, layers: [...screen.layers, newLayer] } : screen
        ),
      };

      history.pushState(currentDoc);
      snapshots.push(JSON.stringify(currentDoc));
    }

    expect(history.getPresent().screens[0].layers.length).toBe(
      INITIAL_SCENE.screens[0].layers.length + 50
    );
    expect(history.canUndo()).toBe(true);

    // Rollback 25 steps and verify exact snapshot match
    for (let i = 0; i < 25; i++) {
      history.undo();
    }

    const stateAt25 = history.getPresent();
    expect(stateAt25.screens[0].layers.length).toBe(
      INITIAL_SCENE.screens[0].layers.length + 25
    );
    expect(JSON.stringify(stateAt25)).toBe(snapshots[25]);

    // Redo 10 steps and verify forward fidelity
    for (let i = 0; i < 10; i++) {
      history.redo();
    }

    const stateAt35 = history.getPresent();
    expect(stateAt35.screens[0].layers.length).toBe(
      INITIAL_SCENE.screens[0].layers.length + 35
    );
    expect(JSON.stringify(stateAt35)).toBe(snapshots[35]);
  });

  it("preserves AST fidelity across JSON serialization round-trips for complex documents", () => {
    const complexDoc: SceneDocument = {
      version: "1.0",
      name: "Complex Motion AST",
      settings: {
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 3.5,
        backgroundColor: "#000000",
      },
      screens: [
        {
          id: "screen_1",
          name: "Intro Scene",
          duration: 3.5,
          stepFps: 24,
          mood: "product-showcase",
          layers: [
            {
              id: "bool_union_master",
              name: "Boolean Master",
              type: "group",
              isBooleanGroup: true,
              booleanOperation: "union",
              trimStart: 15,
              trimEnd: 85,
              trimOffset: 10,
              style: { x: 100, y: 100, width: 300, height: 300, rotation: 15, opacity: 0.9 },
              animation: {
                clips: [
                  {
                    id: "clip_draw",
                    name: "Draw On",
                    type: "in",
                    preset: "drawOn",
                    start: 0.2,
                    duration: 1.2,
                    easing: "snappy",
                  },
                ],
              },
              children: [
                {
                  id: "child_star",
                  name: "Star",
                  type: "shape",
                  shapeType: "star",
                  points: 6,
                  innerRadiusRatio: 0.4,
                  style: { x: 0, y: 0, width: 150, height: 150, rotation: 0, opacity: 1 },
                } as ShapeLayer,
              ],
            } as GroupLayer,
          ],
        },
      ],
    };

    const serialized = JSON.stringify(complexDoc, null, 2);
    const deserialized: SceneDocument = JSON.parse(serialized);

    expect(deserialized).toEqual(complexDoc);
    expect(deserialized.screens[0].layers[0].type).toBe("group");
    expect((deserialized.screens[0].layers[0] as GroupLayer).isBooleanGroup).toBe(true);
    expect((deserialized.screens[0].layers[0] as GroupLayer).trimStart).toBe(15);
    expect(deserialized.screens[0].stepFps).toBe(24);
  });

  it("caps undo history depth to prevent unbounded memory growth", () => {
    const history = new TransactionalHistory(INITIAL_SCENE, 30); // max 30 items

    let current = INITIAL_SCENE;
    for (let i = 1; i <= 60; i++) {
      current = {
        ...current,
        name: `Iteration ${i}`,
      };
      history.pushState(current);
    }

    // Should only be able to undo up to the capped limit (30)
    let undoCount = 0;
    while (history.canUndo()) {
      history.undo();
      undoCount++;
    }

    expect(undoCount).toBeLessThanOrEqual(30);
  });
});
