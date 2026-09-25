import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useProjectStore } from "@/store/useProjectStore";
import { placeElement } from "@/tools/placeElement";
import { applyAnimation } from "@/tools/applyAnimation";
import fs from "fs";
import path from "path";
import os from "os";

describe("Agent & GUI Full Feature Parity E2E Verification", () => {
  beforeEach(() => {
    useProjectStore.setState({
      document: {
        version: "1.0",
        name: "Parity Test Project",
        settings: {
          width: 1920,
          height: 1080,
          fps: 60,
          duration: 6.0,
          backgroundColor: "#09090b",
        },
        screens: [
          {
            id: "scene_hero",
            name: "Hero Scene",
            duration: 4.0,
            layers: [],
          },
        ],
      },
      activeScreenId: "scene_hero",
      selectedLayerIds: [],
    });
  });

  describe("In-App Agent Tools: Multi-Clip Choreography", () => {
    it("places element with full multi-clip animations array", () => {
      const res = placeElement({
        sceneId: "scene_hero",
        id: "hero_card",
        name: "Hero Card",
        type: "shape",
        shapeType: "rectangle",
        bounds: { x: 400, y: 200, width: 800, height: 500 },
        animations: [
          { preset: "elevationRise", type: "in", start: 0, duration: 0.8, easing: "snappy" },
          { preset: "custom_scale", type: "action", start: 1.2, duration: 0.6, params: { toScale: 1.05 }, fillMode: "forwards" },
          { preset: "float", type: "emphasis", start: 1.8, duration: 2.0, loop: true },
        ],
      });

      expect(res.success).toBe(true);
      const layer = res.data?.layer;
      expect(layer?.animation?.clips).toBeDefined();
      expect(layer?.animation?.clips?.length).toBe(3);
      expect(layer?.animation?.clips?.[0].preset).toBe("elevationRise");
      expect(layer?.animation?.clips?.[0].type).toBe("in");
      expect(layer?.animation?.clips?.[1].preset).toBe("custom_scale");
      expect(layer?.animation?.clips?.[1].type).toBe("action");
      expect(layer?.animation?.clips?.[1].fillMode).toBe("forwards");
      expect(layer?.animation?.clips?.[2].preset).toBe("float");
      expect(layer?.animation?.clips?.[2].type).toBe("emphasis");
    });

    it("chains sequential applyAnimation calls without overwriting previous clips", () => {
      placeElement({
        sceneId: "scene_hero",
        id: "hero_text",
        name: "Hero Text",
        type: "text",
        content: "Pro Performance",
        enter: { preset: "baselineRise", duration: 0.7, delay: 0 },
      });

      // Chain mid-scene action move
      const animRes1 = applyAnimation({
        sceneId: "scene_hero",
        layerId: "hero_text",
        type: "action",
        preset: "custom_move",
        start: 1.2,
        duration: 0.5,
        params: { toY: -150 },
        fillMode: "forwards",
      });

      expect(animRes1.success).toBe(true);
      expect(animRes1.data?.animation.clips?.length).toBe(2);

      // Chain exit animation
      const animRes2 = applyAnimation({
        sceneId: "scene_hero",
        layerId: "hero_text",
        type: "out",
        preset: "fade",
        start: 3.2,
        duration: 0.5,
      });

      expect(animRes2.success).toBe(true);
      expect(animRes2.data?.animation.clips?.length).toBe(3);

      const clips = animRes2.data?.animation.clips || [];
      expect(clips.map((c) => c.type)).toEqual(["in", "action", "out"]);
      expect(clips.map((c) => c.preset)).toEqual(["baselineRise", "custom_move", "fade"]);
    });

    it("supports replace mode in applyAnimation", () => {
      placeElement({
        sceneId: "scene_hero",
        id: "status_pill",
        name: "Status Pill",
        type: "shape",
        enter: { preset: "pop", duration: 0.5 },
      });

      const res = applyAnimation({
        sceneId: "scene_hero",
        layerId: "status_pill",
        mode: "replace",
        animations: [
          { preset: "drawOn", type: "in", start: 0.2, duration: 0.6 },
          { preset: "pulse", type: "emphasis", start: 1.0, duration: 1.5, loop: true },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data?.animation.clips?.length).toBe(2);
      expect(res.data?.animation.clips?.[0].preset).toBe("drawOn");
      expect(res.data?.animation.clips?.[1].preset).toBe("pulse");
    });
  });

  describe("MCP Tool Suite Parity (mcp.js)", () => {
    let tmpDir: string;
    let projectFile: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "motion-parity-test-"));
      projectFile = path.join(tmpDir, "parity_test.mtn");
    });

    afterEach(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("executes full multi-clip, recursive hierarchy, alignment, and high-fidelity state inspection", async () => {
      // Dynamic import of mcp.js
      const { handleToolCall } = await import("../../mcp.js" as string);

      // 1. Create Project
      const p1 = await handleToolCall("create_project", {
        file: projectFile,
        title: "Agent Parity Test",
        aspectRatio: "16:9",
        fps: 60,
        backgroundColor: "#09090b",
      });
      expect(p1.text).toContain("Created project");

      // 2. Create Scene
      const s1 = await handleToolCall("create_scene", {
        file: projectFile,
        name: "Intro Scene",
        duration: 5.0,
      });
      expect(s1.text).toContain("Created scene");
      const sceneIdMatch = s1.text.match(/id: (scene_[a-z0-9]+)/);
      expect(sceneIdMatch).not.toBeNull();
      const sceneId = sceneIdMatch![1];

      // 3. Place Group Frame
      const g1 = await handleToolCall("place_element", {
        file: projectFile,
        sceneId,
        id: "bento_card",
        name: "Bento Card Container",
        type: "frame",
        bounds: { x: 300, y: 150, width: 800, height: 600 },
        style: {
          backgroundColor: "#18181b",
          borderRadius: 28,
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
        },
        animations: [
          { preset: "elevationRise", type: "in", start: 0.1, duration: 0.7, easing: "snappy" },
          { preset: "custom_scale", type: "action", start: 1.5, duration: 0.6, params: { toScale: 1.04 }, fillMode: "forwards" },
        ],
      });
      expect(g1.text).toContain("Placed frame layer");
      expect(g1.layer?.clips?.length).toBe(2);

      // 4. Place Child Elements inside the Bento Card Frame (using parentId!)
      const c1 = await handleToolCall("place_element", {
        file: projectFile,
        sceneId,
        parentId: "bento_card",
        id: "card_headline",
        name: "Card Headline",
        type: "text",
        content: "Hyper-Precise Engineering",
        bounds: { x: 350, y: 200, width: 700, height: 80 },
        style: {
          fontSize: 48,
          fontWeight: 700,
          color: "#f4f4f5",
          textAlign: "left",
        },
        enter: { preset: "baselineRise", duration: 0.6, delay: 0.3 },
      });
      expect(c1.text).toContain("Placed text layer");

      // 5. Update Nested Child Element (Recursive Lookup Verification)
      const u1 = await handleToolCall("update_element", {
        file: projectFile,
        layerId: "card_headline",
        content: "Zero-Divergence Architecture",
        style: {
          color: "#38bdf8",
        },
      });
      expect(u1.text).toContain("Updated layer");
      expect(u1.layer?.style?.color).toBe("#38bdf8");

      // 6. Apply Animation to Nested Child (Chaining mid-scene transform on child)
      const a1 = await handleToolCall("apply_animation", {
        file: projectFile,
        layerId: "card_headline",
        preset: "custom_move",
        type: "action",
        start: 1.5,
        duration: 0.5,
        params: { toX: 20 },
        fillMode: "forwards",
      });
      expect(a1.text).toContain("Applied 1 animation clip");
      expect(a1.layer?.clips?.length).toBe(2);

      // 7. Test Horizontal Spacing Distribution on Sibling Elements
      await handleToolCall("place_element", {
        file: projectFile,
        sceneId,
        id: "btn_1",
        name: "Button 1",
        type: "shape",
        bounds: { x: 100, y: 800, width: 150, height: 50 },
      });
      await handleToolCall("place_element", {
        file: projectFile,
        sceneId,
        id: "btn_2",
        name: "Button 2",
        type: "shape",
        bounds: { x: 400, y: 800, width: 150, height: 50 },
      });
      await handleToolCall("place_element", {
        file: projectFile,
        sceneId,
        id: "btn_3",
        name: "Button 3",
        type: "shape",
        bounds: { x: 700, y: 800, width: 150, height: 50 },
      });

      const alignRes = await handleToolCall("align_elements", {
        file: projectFile,
        sceneId,
        layerIds: ["btn_1", "btn_2", "btn_3"],
        alignment: "distribute_horizontal",
      });
      expect(alignRes.text).toContain("Aligned 3 elements");

      // 8. Full Perceptual Storyboard Inspection
      const stateRes = await handleToolCall("get_storyboard_state", {
        file: projectFile,
      });

      const parsedState = JSON.parse(stateRes.text);
      expect(parsedState.sceneCount).toBe(2);
      expect(parsedState.resolution).toBe("1920x1080");

      const targetScene = parsedState.scenes.find((s: any) => s.id === sceneId);
      expect(targetScene).toBeDefined();
      expect(targetScene.layerCount).toBeGreaterThanOrEqual(4);

      // Find the bento card container in state
      const bentoLayer = targetScene.layers.find((l: any) => l.id === "bento_card");
      expect(bentoLayer).toBeDefined();
      expect(bentoLayer.bounds).toEqual({
        x: 300,
        y: 150,
        width: 800,
        height: 600,
        rotation: 0,
        opacity: 1,
        zIndex: 0,
      });
      expect(bentoLayer.clips.length).toBe(2);
      expect(bentoLayer.children).toBeDefined();
      expect(bentoLayer.children.length).toBe(1);

      // Verify nested child state
      const childHeadline = bentoLayer.children[0];
      expect(childHeadline.id).toBe("card_headline");
      expect(childHeadline.text.content).toBe("Zero-Divergence Architecture");
      expect(childHeadline.style.color).toBe("#38bdf8");
      expect(childHeadline.clips.length).toBe(2);
      expect(childHeadline.clips[0].preset).toBe("baselineRise");
      expect(childHeadline.clips[1].preset).toBe("custom_move");
      expect(childHeadline.clips[1].type).toBe("action");
      expect(childHeadline.clips[1].fillMode).toBe("forwards");

      // 9. Contact Sheet
      const sheetRes = await handleToolCall("get_contact_sheet", {
        file: projectFile,
      });
      const sheet = JSON.parse(sheetRes.text);
      expect(sheet.beats.length).toBe(2);
      const targetBeat = sheet.beats.find((b: any) => b.sceneId === sceneId);
      expect(targetBeat).toBeDefined();
      expect(targetBeat.headlines).toContain('"Zero-Divergence Architecture"');
      expect(targetBeat.transitions.some((t: string) => t.includes("custom_move"))).toBe(true);
    });
  });
});
