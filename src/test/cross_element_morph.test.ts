import { describe, it, expect, beforeEach } from "vitest";
import {
  solveParticleSwarm,
  interpolateColor,
  ElementBounds,
} from "@/engine/morph/particleSwarmSolver";
import { evaluateClipDelta } from "@/engine/evaluator/clipEvaluator";
import { AnimationClip, getLayerClips } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { EXIT_PRESETS } from "@/components/inspector/motion/AnimationCatalogSheet";

describe("Cross-Element Morph Transition Suite", () => {
  const sourceBounds: ElementBounds = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    centerX: 200,
    centerY: 150,
  };

  const targetBounds: ElementBounds = {
    x: 400,
    y: 300,
    width: 150,
    height: 150,
    centerX: 475,
    centerY: 375,
  };

  describe("1. Deterministic O(1) Particle Swarm Solver", () => {
    it("evaluates deterministic particle trajectories for stardust style", () => {
      const particlesMid = solveParticleSwarm(sourceBounds, targetBounds, 0.5, {
        morphStyle: "stardust",
        particleCount: 40,
        chaos: 20,
      });

      expect(particlesMid).toHaveLength(40);
      expect(particlesMid[0].x).toBeGreaterThan(0);
      expect(particlesMid[0].y).toBeGreaterThan(0);
      expect(particlesMid[0].opacity).toBeGreaterThan(0);

      // Verify determinism: repeating with same parameters returns exact same coordinates
      const particlesRepeat = solveParticleSwarm(sourceBounds, targetBounds, 0.5, {
        morphStyle: "stardust",
        particleCount: 40,
        chaos: 20,
      });
      expect(particlesRepeat[0].x).toBe(particlesMid[0].x);
      expect(particlesRepeat[0].y).toBe(particlesMid[0].y);
      expect(particlesRepeat[0].opacity).toBe(particlesMid[0].opacity);
    });

    it("evaluates all 6 core morph styles without error or NaN", () => {
      const styles = [
        "stardust",
        "liquid",
        "voronoi",
        "laser",
        "singularity",
        "spline",
      ] as const;

      for (const style of styles) {
        const particles = solveParticleSwarm(sourceBounds, targetBounds, 0.5, {
          morphStyle: style,
          particleCount: 40,
        });

        expect(particles).toHaveLength(40);
        for (const p of particles) {
          expect(Number.isNaN(p.x)).toBe(false);
          expect(Number.isNaN(p.y)).toBe(false);
          expect(Number.isNaN(p.opacity)).toBe(false);
          expect(p.opacity).toBeGreaterThanOrEqual(0);
          expect(p.opacity).toBeLessThanOrEqual(1);
        }

        if (style === "voronoi") {
          expect(particles[0].shape).toBe("shard");
          expect(particles[0].shardPath).toBeDefined();
        }
      }
    });

    it("respects boundary conditions at progress = 0 and progress = 1", () => {
      const pStart = solveParticleSwarm(sourceBounds, targetBounds, 0, {
        particleCount: 20,
      });
      const pEnd = solveParticleSwarm(sourceBounds, targetBounds, 1, {
        particleCount: 20,
      });

      expect(pStart).toHaveLength(20);
      expect(pEnd).toHaveLength(20);
    });

    it("interpolates colors smoothly between source and target", () => {
      const cStart = interpolateColor("#000000", "#ffffff", 0);
      const cMid = interpolateColor("#000000", "#ffffff", 0.5);
      const cEnd = interpolateColor("#000000", "#ffffff", 1);

      expect(cStart).toBe("rgb(0, 0, 0)");
      expect(cMid).toBe("rgb(128, 128, 128)");
      expect(cEnd).toBe("rgb(255, 255, 255)");
    });
  });

  describe("2. Clip Evaluator Hand-off & Visibility", () => {
    const exitMorphClip: AnimationClip = {
      id: "clip_exit_morph",
      type: "out",
      preset: "morph",
      start: 1.0,
      duration: 1.0,
      easing: "smooth",
      params: {
        targetLayerId: "layer_target",
        morphStyle: "stardust",
      },
    };

    const inMorphClip: AnimationClip = {
      id: "clip_in_morph",
      type: "in",
      preset: "morphIn",
      start: 1.0,
      duration: 1.0,
      easing: "smooth",
      params: {
        sourceLayerId: "layer_source",
      },
    };

    it("dematerializes source layer during exit morph window", () => {
      // Before morph start: full resting opacity
      const deltaPre = evaluateClipDelta(exitMorphClip, 0.5);
      expect(deltaPre.opacity).toBe(1);

      // Mid-flight: opacity dissolving
      const deltaMid = evaluateClipDelta(exitMorphClip, 1.5);
      expect(deltaMid.opacity).toBeLessThan(1);
      expect(deltaMid.opacity).toBeGreaterThan(0);

      // After morph finish: completely transparent
      const deltaPost = evaluateClipDelta(exitMorphClip, 2.5);
      expect(deltaPost.opacity).toBe(0);
    });

    it("keeps target layer hidden before morph and reveals it during transition", () => {
      // Before morph start: target is hidden (opacity = 0)
      const deltaPre = evaluateClipDelta(inMorphClip, 0.5);
      expect(deltaPre.opacity).toBe(0);

      // Mid-flight: target materializing
      const deltaMid = evaluateClipDelta(inMorphClip, 1.5);
      expect(deltaMid.opacity).toBeGreaterThan(0);
      expect(deltaMid.opacity).toBeLessThan(1);

      // After morph finish: fully visible (opacity = 1)
      const deltaPost = evaluateClipDelta(inMorphClip, 2.5);
      expect(deltaPost.opacity).toBe(1);
    });
  });

  describe("3. Store & Catalog Integration", () => {
    beforeEach(() => {
      useProjectStore.getState().resetProject();
    });

    it("registers 'Morph into...' in EXIT_PRESETS catalog", () => {
      const morphPreset = EXIT_PRESETS.find((p) => p.id === "morph");
      expect(morphPreset).toBeDefined();
      expect(morphPreset?.type).toBe("out");
      expect(morphPreset?.name).toContain("Morph");
    });

    it("attaches exit morph clip and coordinates target entrance clip via applyAnimationPreset", () => {
      const store = useProjectStore.getState();
      const screen = store.document.screens[0];

      // Add source layer (rectangle)
      const sourceId = "layer_source_test";
      store.addLayer({
        id: sourceId,
        type: "shape",
        shapeType: "rectangle",
        name: "Source Card",
        style: { x: 100, y: 100, width: 200, height: 100, rotation: 0, opacity: 1 },
        animation: { clips: [] },
      });

      // Add target layer (circle)
      const targetId = "layer_target_test";
      store.addLayer({
        id: targetId,
        type: "shape",
        shapeType: "circle",
        name: "Target Circle",
        style: { x: 400, y: 300, width: 120, height: 120, rotation: 0, opacity: 1 },
        animation: { clips: [] },
      });

      // Apply morph preset targeting targetId
      const newClipId = store.applyAnimationPreset(sourceId, null, {
        id: "morph",
        name: "Morph into Target Circle",
        type: "out",
        duration: 1.0,
        easing: "smooth",
        params: {
          targetLayerId: targetId,
          morphStyle: "stardust",
          particleCount: 80,
          chaos: 30,
          particleShape: "star",
        },
      });

      expect(newClipId).toBeDefined();

      // Check source layer has exit clip
      const updatedScreen = useProjectStore.getState().document.screens[0];
      const sourceLayer = updatedScreen.layers.find((l) => l.id === sourceId);
      const sourceClips = sourceLayer?.animation?.clips || [];
      expect(sourceClips).toHaveLength(1);
      expect(sourceClips[0].preset).toBe("morph");
      expect(sourceClips[0].type).toBe("out");
      expect(sourceClips[0].params?.targetLayerId).toBe(targetId);

      // Check target layer has coordinated morphIn entrance clip
      const targetLayer = updatedScreen.layers.find((l) => l.id === targetId);
      const targetClips = targetLayer?.animation?.clips || [];
      expect(targetClips).toHaveLength(1);
      expect(targetClips[0].preset).toBe("morphIn");
      expect(targetClips[0].type).toBe("in");
      expect(targetClips[0].params?.sourceLayerId).toBe(sourceId);
      expect(targetClips[0].start).toBe(sourceClips[0].start);
      expect(targetClips[0].duration).toBe(sourceClips[0].duration);
    });

    it("nests new animations sequentially after existing animations end", () => {
      const store = useProjectStore.getState();
      const testLayerId = "layer_nest_test";
      store.addLayer({
        id: testLayerId,
        type: "shape",
        shapeType: "rectangle",
        name: "Animated Card",
        style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
        animation: { clips: [] },
      });

      // 1. Add first animation (In animation, e.g. fade In 0.6s)
      const clip1Id = store.applyAnimationPreset(testLayerId, null, {
        id: "fade",
        name: "Fade In",
        type: "in",
        duration: 0.6,
        easing: "smooth",
      });

      const s1 = useProjectStore.getState();
      const layer1 = s1.document.screens[0].layers.find((l) => l.id === testLayerId)!;
      const clips1 = getLayerClips(layer1);
      expect(clips1).toHaveLength(1);
      expect(clips1[0]!.start).toBe(0);
      expect(clips1[0]!.duration).toBe(0.6);

      // 2. Add second animation (Action pulse, 0.5s) without specifying start
      // It should NOT start at 0; it should start after the first animation ends (0.6s)
      const clip2Id = store.applyAnimationPreset(testLayerId, null, {
        id: "pulse",
        name: "Pulse",
        type: "action",
        duration: 0.5,
        easing: "smooth",
      });

      const s2 = useProjectStore.getState();
      const layer2 = s2.document.screens[0].layers.find((l) => l.id === testLayerId)!;
      const clips2 = getLayerClips(layer2);
      expect(clips2).toHaveLength(2);
      const clip2 = clips2.find((c) => c.id === clip2Id);
      expect(clip2?.start).toBe(0.6);
      expect(clip2?.duration).toBe(0.5);

      // 3. Add third animation (Out fade, 0.4s)
      // It should start at 0.6 + 0.5 = 1.1s
      const clip3Id = store.applyAnimationPreset(testLayerId, null, {
        id: "fade",
        name: "Fade Out",
        type: "out",
        duration: 0.4,
        easing: "smooth",
      });

      const s3 = useProjectStore.getState();
      const layer3 = s3.document.screens[0].layers.find((l) => l.id === testLayerId)!;
      const clips3 = getLayerClips(layer3);
      expect(clips3).toHaveLength(3);
      const clip3 = clips3.find((c) => c.id === clip3Id);
      expect(clip3?.start).toBe(1.1);
      expect(clip3?.duration).toBe(0.4);
    });

    it("synchronizes morph clips across elements during drag, edit, and deletion in lockstep", () => {
      const store = useProjectStore.getState();
      const srcId = "layer_sync_src";
      const tgtId = "layer_sync_tgt";

      store.addLayer({
        id: srcId,
        type: "shape",
        shapeType: "rectangle",
        name: "Sync Source",
        style: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
        animation: { clips: [] },
      });

      store.addLayer({
        id: tgtId,
        type: "shape",
        shapeType: "circle",
        name: "Sync Target",
        style: { x: 200, y: 50, width: 100, height: 100, rotation: 0, opacity: 1 },
        animation: { clips: [] },
      });

      // Create morph transition
      const srcClipId = store.applyAnimationPreset(srcId, null, {
        id: "morph",
        name: "Morph to Circle",
        type: "out",
        duration: 0.8,
        easing: "smooth",
        params: {
          targetLayerId: tgtId,
          morphStyle: "stardust",
          particleCount: 80,
          chaos: 30,
        },
      });

      const screenAfterAdd = useProjectStore.getState().document.screens[0];
      const srcLayer = screenAfterAdd.layers.find((l) => l.id === srcId)!;
      const tgtLayer = screenAfterAdd.layers.find((l) => l.id === tgtId)!;
      const srcClip = getLayerClips(srcLayer)[0]!;
      const tgtClip = getLayerClips(tgtLayer)[0]!;

      expect(srcClip.id).toBe(srcClipId);
      expect(tgtClip.preset).toBe("morphIn");
      expect(tgtClip.start).toBe(srcClip.start);
      expect(tgtClip.duration).toBe(srcClip.duration);

      // 1. Moving srcClip start time updates tgtClip start time synchronously
      store.updateAnimationClip(srcId, srcClip.id, { start: 1.5 });
      const screenAfterMove = useProjectStore.getState().document.screens[0];
      const movedSrcLayer = screenAfterMove.layers.find((l) => l.id === srcId)!;
      const movedTgtLayer = screenAfterMove.layers.find((l) => l.id === tgtId)!;
      const movedSrc = getLayerClips(movedSrcLayer)[0]!;
      const movedTgt = getLayerClips(movedTgtLayer)[0]!;
      expect(movedSrc.start).toBe(1.5);
      expect(movedTgt.start).toBe(1.5);

      // 2. Resizing tgtClip duration updates srcClip duration synchronously
      store.updateAnimationClip(tgtId, tgtClip.id, { duration: 1.2 });
      const screenAfterResize = useProjectStore.getState().document.screens[0];
      const resizedSrcLayer = screenAfterResize.layers.find((l) => l.id === srcId)!;
      const resizedTgtLayer = screenAfterResize.layers.find((l) => l.id === tgtId)!;
      const resizedSrc = getLayerClips(resizedSrcLayer)[0]!;
      const resizedTgt = getLayerClips(resizedTgtLayer)[0]!;
      expect(resizedTgt.duration).toBe(1.2);
      expect(resizedSrc.duration).toBe(1.2);

      // 3. Changing morphStyle or params on one updates both
      store.updateAnimationClip(srcId, srcClip.id, {
        params: { ...srcClip.params, morphStyle: "liquid", particleCount: 160 },
      });
      const screenAfterParam = useProjectStore.getState().document.screens[0];
      const paramSrcLayer = screenAfterParam.layers.find((l) => l.id === srcId)!;
      const paramTgtLayer = screenAfterParam.layers.find((l) => l.id === tgtId)!;
      const paramSrc = getLayerClips(paramSrcLayer)[0]!;
      const paramTgt = getLayerClips(paramTgtLayer)[0]!;
      expect(paramSrc.params?.morphStyle).toBe("liquid");
      expect(paramTgt.params?.morphStyle).toBe("liquid");
      expect(paramSrc.params?.particleCount).toBe(160);
      expect(paramTgt.params?.particleCount).toBe(160);

      // 4. Deleting morph clip removes both sides cleanly without orphans
      store.removeAnimationClip(srcId, srcClip.id);
      const screenAfterDelete = useProjectStore.getState().document.screens[0];
      const delSrc = screenAfterDelete.layers.find((l) => l.id === srcId)!;
      const delTgt = screenAfterDelete.layers.find((l) => l.id === tgtId)!;
      expect(delSrc.animation?.clips).toHaveLength(0);
      expect(delTgt.animation?.clips).toHaveLength(0);
    });
  });
});
