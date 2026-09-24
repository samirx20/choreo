import { ProjectStoreState } from "../types";
import { SceneDocument, Layer, LayerAnimation, AnimationClip, getLayerClips } from "@/types/scene";
import { findLayerInTree, mutateLayerInTree, findParentGroupInTree } from "../helpers/treeHelpers";
import { commitDoc } from "../historyManager";
import { staggerLayers } from "@/engine/choreography/staggerEngine";

export type AnimationSlice = Pick<
  ProjectStoreState,
  | "updateLayerAnimation"
  | "addAnimationClip"
  | "updateAnimationClip"
  | "removeAnimationClip"
  | "duplicateAnimationClip"
  | "reorderAnimationClips"
  | "splitAnimationClip"
  | "animationCatalogState"
  | "openAnimationCatalog"
  | "closeAnimationCatalog"
  | "applyAnimationPreset"
  | "relinkMorphTarget"
  | "staggerSelectedLayers"
>;

function findPartnerMorphClip(
  layers: Layer[],
  currentLayerId: string,
  currentClip: AnimationClip
): { partnerLayer: Layer; partnerClip: AnimationClip } | null {
  const isMorph =
    currentClip.preset === "morph" ||
    currentClip.preset === "morphIn" ||
    Boolean(currentClip.params?.morphGroupId);
  if (!isMorph) return null;

  const partnerClipId = currentClip.params?.partnerClipId;
  const morphGroupId = currentClip.params?.morphGroupId;
  const partnerLayerId =
    currentClip.params?.sourceLayerId === currentLayerId
      ? currentClip.params?.targetLayerId
      : currentClip.params?.sourceLayerId || currentClip.params?.targetLayerId;

  // 1. Search by direct partnerClipId
  if (partnerClipId) {
    const search = (list: Layer[]): { partnerLayer: Layer; partnerClip: AnimationClip } | null => {
      for (const l of list) {
        const cMatch = getLayerClips(l).find((c) => c.id === partnerClipId);
        if (cMatch) return { partnerLayer: l, partnerClip: cMatch };
        if (l.type === "group" && (l as any).children) {
          const res = search((l as any).children);
          if (res) return res;
        }
      }
      return null;
    };
    const found = search(layers);
    if (found) return found;
  }

  // 2. Search by morphGroupId
  if (morphGroupId) {
    const search = (list: Layer[]): { partnerLayer: Layer; partnerClip: AnimationClip } | null => {
      for (const l of list) {
        const cMatch = getLayerClips(l).find(
          (c) => c.params?.morphGroupId === morphGroupId && c.id !== currentClip.id
        );
        if (cMatch) return { partnerLayer: l, partnerClip: cMatch };
        if (l.type === "group" && (l as any).children) {
          const res = search((l as any).children);
          if (res) return res;
        }
      }
      return null;
    };
    const found = search(layers);
    if (found) return found;
  }

  // 3. Search by partnerLayerId and morph preset
  if (partnerLayerId && partnerLayerId !== currentLayerId) {
    const partnerLayer = findLayerInTree(layers, partnerLayerId);
    if (partnerLayer) {
      const partnerPreset = currentClip.preset === "morph" ? "morphIn" : "morph";
      const partnerClip = getLayerClips(partnerLayer).find(
        (c) =>
          c.preset === partnerPreset ||
          c.params?.sourceLayerId === currentLayerId ||
          c.params?.targetLayerId === currentLayerId
      );
      if (partnerClip) return { partnerLayer, partnerClip };
    }
  }

  return null;
}

export const createAnimationSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): AnimationSlice => ({
  updateLayerAnimation: (layerId, animUpdates, options) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const shouldRipple = options?.ripple ?? true;
    let shift = 0;
    let shiftMode: "in" | "out" | null = null;

    if (shouldRipple) {
      if (animUpdates.in && targetLayer.animation?.in) {
        const oldIn = targetLayer.animation.in;
        const newIn = animUpdates.in;
        if (
          newIn.duration !== undefined &&
          oldIn.duration !== undefined &&
          Math.abs(newIn.duration - oldIn.duration) > 0.001
        ) {
          shift = newIn.duration - oldIn.duration;
          shiftMode = "in";
        } else if (
          newIn.start !== undefined &&
          oldIn.start !== undefined &&
          Math.abs(newIn.start - oldIn.start) > 0.001
        ) {
          shift = newIn.start - oldIn.start;
          shiftMode = "in";
        }
      } else if (animUpdates.out && targetLayer.animation?.out) {
        const oldOut = targetLayer.animation.out;
        const newOut = animUpdates.out;
        if (
          newOut.duration !== undefined &&
          oldOut.duration !== undefined &&
          Math.abs(newOut.duration - oldOut.duration) > 0.001
        ) {
          shift = newOut.duration - oldOut.duration;
          shiftMode = "out";
        } else if (
          newOut.start !== undefined &&
          oldOut.start !== undefined &&
          Math.abs(newOut.start - oldOut.start) > 0.001
        ) {
          shift = newOut.start - oldOut.start;
          shiftMode = "out";
        }
      }
    }

    let mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const nextAnimation: LayerAnimation = { ...(layer.animation || {}), ...animUpdates };
      const baseClips = layer.animation?.clips ? [...layer.animation.clips] : getLayerClips(layer);

      if (animUpdates.in) {
        const inIdx = baseClips.findIndex((c) => c.type === "in");
        const inClip: AnimationClip = {
          id: animUpdates.in.id || (inIdx !== -1 ? baseClips[inIdx].id : `clip_in_${Date.now()}`),
          name: animUpdates.in.name || "Entrance",
          type: "in",
          preset: animUpdates.in.preset,
          start: animUpdates.in.start ?? 0,
          duration: animUpdates.in.duration ?? 0.6,
          easing: animUpdates.in.easing ?? "smooth",
          fillMode: animUpdates.in.fillMode ?? "both",
          direction: animUpdates.in.direction,
          intensity: animUpdates.in.intensity,
          springStiffness: animUpdates.in.springStiffness,
          springDamping: animUpdates.in.springDamping,
          springMass: animUpdates.in.springMass,
          scaleAmount: animUpdates.in.scaleAmount,
          distance: animUpdates.in.distance,
          rotationDegrees: animUpdates.in.rotationDegrees,
          splitBy: animUpdates.in.splitBy,
          staggerDelay: animUpdates.in.staggerDelay,
        };
        if (inIdx !== -1) {
          baseClips[inIdx] = inClip;
        } else {
          baseClips.unshift(inClip);
        }
      }
      if (animUpdates.out) {
        const outIdx = baseClips.findIndex((c) => c.type === "out");
        const outClip: AnimationClip = {
          id: animUpdates.out.id || (outIdx !== -1 ? baseClips[outIdx].id : `clip_out_${Date.now()}`),
          name: animUpdates.out.name || "Exit",
          type: "out",
          preset: animUpdates.out.preset,
          start: animUpdates.out.start ?? 0,
          duration: animUpdates.out.duration ?? 0.6,
          easing: animUpdates.out.easing ?? "smooth",
          fillMode: animUpdates.out.fillMode ?? "both",
          direction: animUpdates.out.direction,
          intensity: animUpdates.out.intensity,
          springStiffness: animUpdates.out.springStiffness,
          springDamping: animUpdates.out.springDamping,
          springMass: animUpdates.out.springMass,
          scaleAmount: animUpdates.out.scaleAmount,
          distance: animUpdates.out.distance,
          rotationDegrees: animUpdates.out.rotationDegrees,
          splitBy: animUpdates.out.splitBy,
          staggerDelay: animUpdates.out.staggerDelay,
        };
        if (outIdx !== -1) {
          baseClips[outIdx] = outClip;
        } else {
          baseClips.push(outClip);
        }
      }
      if (animUpdates.emphasis) {
        const empIdx = baseClips.findIndex((c) => c.type === "emphasis");
        const empClip: AnimationClip = {
          id: animUpdates.emphasis.id || (empIdx !== -1 ? baseClips[empIdx].id : `clip_emp_${Date.now()}`),
          name: animUpdates.emphasis.name || "Emphasis",
          type: "emphasis",
          preset: animUpdates.emphasis.preset,
          start: animUpdates.emphasis.start ?? 0,
          duration: animUpdates.emphasis.duration ?? 0.6,
          easing: animUpdates.emphasis.easing ?? "smooth",
          fillMode: animUpdates.emphasis.fillMode ?? "both",
          direction: animUpdates.emphasis.direction,
          intensity: animUpdates.emphasis.intensity,
          springStiffness: animUpdates.emphasis.springStiffness,
          springDamping: animUpdates.emphasis.springDamping,
          springMass: animUpdates.emphasis.springMass,
          scaleAmount: animUpdates.emphasis.scaleAmount,
          distance: animUpdates.emphasis.distance,
          rotationDegrees: animUpdates.emphasis.rotationDegrees,
          splitBy: animUpdates.emphasis.splitBy,
          staggerDelay: animUpdates.emphasis.staggerDelay,
          loop: animUpdates.emphasis.loop,
          loopCount: animUpdates.emphasis.loopCount,
        };
        if (empIdx !== -1) {
          baseClips[empIdx] = empClip;
        } else {
          baseClips.push(empClip);
        }
      }
      if (!animUpdates.clips && (animUpdates.in || animUpdates.out || animUpdates.emphasis)) {
        nextAnimation.clips = baseClips;
      }
      return {
        ...layer,
        animation: nextAnimation,
      } as Layer;
    });

    if (shiftMode && Math.abs(shift) > 0.001) {
      const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);
      if (parentGroup && (parentGroup as any).autoLink !== false && parentGroup.children) {
        const targetIdx = parentGroup.children.findIndex((c: Layer) => c.id === layerId);
        if (targetIdx !== -1) {
          mutatedLayers = mutateLayerInTree(mutatedLayers, parentGroup.id, (group) => {
            if (group.type !== "group") return group;
            const updatedChildren = group.children.map((child, idx) => {
              if (idx <= targetIdx) return child;
              const childAnim = child.animation?.[shiftMode as "in" | "out"];
              if (!childAnim) return child;
              const nextStart = Math.max(
                0,
                Math.round((childAnim.start + shift) * 100) / 100
              );
              return {
                ...child,
                animation: {
                  ...child.animation,
                  [shiftMode as "in" | "out"]: {
                    ...childAnim,
                    start: nextStart,
                  },
                },
              };
            });
            return { ...group, children: updatedChildren };
          });
        }
      }
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutatedLayers,
        };
      }),
    };
    commitDoc(set, nextDoc);
  },

  addAnimationClip: (layerId, clipData) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return "";
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return "";

    const currentClips = getLayerClips(targetLayer);
    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newClip: AnimationClip = {
      id: newClipId,
      name: clipData.name || (clipData.preset ? `${clipData.preset}` : "Animation"),
      type: clipData.type || "action",
      preset: clipData.preset || "pulse",
      start:
        clipData.start ??
        (currentClips.length > 0
          ? Math.max(...currentClips.map((c) => c.start + c.duration))
          : 0),
      duration: clipData.duration ?? 0.6,
      easing: clipData.easing || "smooth",
      fillMode: clipData.fillMode || "both",
      direction: clipData.direction,
      intensity: clipData.intensity ?? 1,
      springStiffness: clipData.springStiffness,
      springDamping: clipData.springDamping,
      springMass: clipData.springMass,
      scaleAmount: clipData.scaleAmount,
      distance: clipData.distance,
      rotationDegrees: clipData.rotationDegrees,
      splitBy: clipData.splitBy,
      staggerDelay: clipData.staggerDelay,
      loop: clipData.loop,
      loopCount: clipData.loopCount,
      params: clipData.params,
      from: clipData.from,
    };

    const nextClips = [...currentClips, newClip].sort((a, b) => a.start - b.start);

    // Sync legacy single slots if applicable
    const animPatch: Partial<LayerAnimation> = {
      clips: nextClips,
    };
    if (newClip.type === "in" && !currentClips.some((c) => c.type === "in")) {
      animPatch.in = newClip;
    } else if (newClip.type === "out" && !currentClips.some((c) => c.type === "out")) {
      animPatch.out = newClip;
    } else if (newClip.type === "emphasis" && !currentClips.some((c) => c.type === "emphasis")) {
      animPatch.emphasis = newClip;
    }

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), ...animPatch },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    commitDoc(set, nextDoc, {
      selectedClipIds: [newClipId],
    });
    return newClipId;
  },

  updateAnimationClip: (layerId, clipId, updates, options) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const targetClip = currentClips.find((c) => c.id === clipId);
    if (!targetClip) return;

    const shouldRipple = options?.ripple ?? false;
    let shift = 0;
    if (shouldRipple && updates.duration !== undefined && targetClip.duration !== undefined) {
      shift = updates.duration - targetClip.duration;
    } else if (shouldRipple && updates.start !== undefined && targetClip.start !== undefined) {
      shift = updates.start - targetClip.start;
    }

    const nextClips = currentClips
      .map((clip) => {
        if (clip.id === clipId) {
          return { ...clip, ...updates };
        }
        if (shouldRipple && Math.abs(shift) > 0.001 && clip.start > targetClip.start) {
          return {
            ...clip,
            start: Math.max(0, Math.round((clip.start + shift) * 100) / 100),
          };
        }
        return clip;
      })
      .sort((a, b) => a.start - b.start);

    // Sync legacy single slots
    const updatedTarget = nextClips.find((c) => c.id === clipId);
    const animPatch: Partial<LayerAnimation> = {
      clips: nextClips,
    };
    if (updatedTarget?.type === "in") {
      animPatch.in = updatedTarget;
    } else if (updatedTarget?.type === "out") {
      animPatch.out = updatedTarget;
    } else if (updatedTarget?.type === "emphasis") {
      animPatch.emphasis = updatedTarget;
    }

    let mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), ...animPatch },
    } as Layer));

    // Synchronize morph partner clip across elements in lockstep
    const partnerInfo = findPartnerMorphClip(activeScreen.layers, layerId, targetClip);
    if (partnerInfo && partnerInfo.partnerLayer.id !== layerId) {
      const partnerClips = getLayerClips(partnerInfo.partnerLayer);
      const partnerUpdates: Partial<AnimationClip> = {};

      if (updates.start !== undefined) partnerUpdates.start = updates.start;
      if (updates.duration !== undefined) partnerUpdates.duration = updates.duration;
      if (updates.easing !== undefined) partnerUpdates.easing = updates.easing;
      if (updates.name !== undefined) partnerUpdates.name = updates.name;

      if (updates.params !== undefined) {
        partnerUpdates.params = {
          ...(partnerInfo.partnerClip.params || {}),
          ...(updates.params.morphStyle !== undefined ? { morphStyle: updates.params.morphStyle } : {}),
          ...(updates.params.particleCount !== undefined ? { particleCount: updates.params.particleCount } : {}),
          ...(updates.params.particleShape !== undefined ? { particleShape: updates.params.particleShape } : {}),
          ...(updates.params.chaos !== undefined ? { chaos: updates.params.chaos } : {}),
          ...(updates.params.morphAmount !== undefined ? { morphAmount: updates.params.morphAmount } : {}),
          ...(updates.params.sourceLayerId !== undefined ? { sourceLayerId: updates.params.sourceLayerId } : {}),
          ...(updates.params.targetLayerId !== undefined ? { targetLayerId: updates.params.targetLayerId } : {}),
        };
      }

      const nextPartnerClips = partnerClips
        .map((c) => (c.id === partnerInfo.partnerClip.id ? { ...c, ...partnerUpdates } : c))
        .sort((a, b) => a.start - b.start);

      const partnerUpdatedTarget = nextPartnerClips.find((c) => c.id === partnerInfo.partnerClip.id);
      const partnerAnimPatch: Partial<LayerAnimation> = {
        clips: nextPartnerClips,
      };
      if (partnerUpdatedTarget?.type === "in") {
        partnerAnimPatch.in = partnerUpdatedTarget;
      } else if (partnerUpdatedTarget?.type === "out") {
        partnerAnimPatch.out = partnerUpdatedTarget;
      } else if (partnerUpdatedTarget?.type === "emphasis") {
        partnerAnimPatch.emphasis = partnerUpdatedTarget;
      }

      mutatedLayers = mutateLayerInTree(mutatedLayers, partnerInfo.partnerLayer.id, (layer) => ({
        ...layer,
        animation: { ...(layer.animation || {}), ...partnerAnimPatch },
      } as Layer));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    commitDoc(set, nextDoc);
  },

  removeAnimationClip: (layerId, clipId) => {
    const { document: doc, activeScreenId, selectedClipIds } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const removingClip = currentClips.find((c) => c.id === clipId);
    if (!removingClip) return;
    const nextClips = currentClips.filter((c) => c.id !== clipId);

    const animPatch: Partial<LayerAnimation> = {
      clips: nextClips,
    };
    if (removingClip?.type === "in" || targetLayer.animation?.in?.id === clipId) {
      animPatch.in = undefined;
    }
    if (removingClip?.type === "out" || targetLayer.animation?.out?.id === clipId) {
      animPatch.out = undefined;
    }
    if (removingClip?.type === "emphasis" || targetLayer.animation?.emphasis?.id === clipId) {
      animPatch.emphasis = undefined;
    }

    let mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = { ...(layer.animation || {}) };
      if (animPatch.in === undefined) delete existing.in;
      if (animPatch.out === undefined) delete existing.out;
      if (animPatch.emphasis === undefined) delete existing.emphasis;
      return {
        ...layer,
        animation: { ...existing, clips: nextClips },
      } as Layer;
    });

    let updatedSelectedClipIds = selectedClipIds.filter((id) => id !== clipId);

    // If removing a morph clip, also remove its partner clip on the linked layer
    const partnerInfo = findPartnerMorphClip(activeScreen.layers, layerId, removingClip);
    if (partnerInfo && partnerInfo.partnerLayer.id !== layerId) {
      const partnerClips = getLayerClips(partnerInfo.partnerLayer);
      const nextPartnerClips = partnerClips.filter((c) => c.id !== partnerInfo.partnerClip.id);
      const partnerAnimPatch: Partial<LayerAnimation> = {
        clips: nextPartnerClips,
      };
      if (partnerInfo.partnerClip.type === "in" || partnerInfo.partnerLayer.animation?.in?.id === partnerInfo.partnerClip.id) {
        partnerAnimPatch.in = undefined;
      }
      if (partnerInfo.partnerClip.type === "out" || partnerInfo.partnerLayer.animation?.out?.id === partnerInfo.partnerClip.id) {
        partnerAnimPatch.out = undefined;
      }
      if (partnerInfo.partnerClip.type === "emphasis" || partnerInfo.partnerLayer.animation?.emphasis?.id === partnerInfo.partnerClip.id) {
        partnerAnimPatch.emphasis = undefined;
      }

      mutatedLayers = mutateLayerInTree(mutatedLayers, partnerInfo.partnerLayer.id, (layer) => {
        const existing = { ...(layer.animation || {}) };
        if (partnerAnimPatch.in === undefined) delete existing.in;
        if (partnerAnimPatch.out === undefined) delete existing.out;
        if (partnerAnimPatch.emphasis === undefined) delete existing.emphasis;
        return {
          ...layer,
          animation: { ...existing, clips: nextPartnerClips },
        } as Layer;
      });

      updatedSelectedClipIds = updatedSelectedClipIds.filter((id) => id !== partnerInfo.partnerClip.id);
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    commitDoc(set, nextDoc, {
      selectedClipIds: updatedSelectedClipIds,
    });
  },

  duplicateAnimationClip: (layerId, clipId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return "";
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return "";

    const currentClips = getLayerClips(targetLayer);
    const targetClip = currentClips.find((c) => c.id === clipId);
    if (!targetClip) return "";

    const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedClip: AnimationClip = {
      ...targetClip,
      id: newClipId,
      name: `${targetClip.name || targetClip.preset} (Copy)`,
      start: Math.round((targetClip.start + targetClip.duration + 0.1) * 100) / 100,
    };

    const nextClips = [...currentClips, clonedClip].sort((a, b) => a.start - b.start);
    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), clips: nextClips },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    commitDoc(set, nextDoc, {
      selectedClipIds: [newClipId],
    });
    return newClipId;
  },

  reorderAnimationClips: (layerId, orderedClipIds) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const sorted = [...currentClips].sort((a, b) => {
      const idxA = orderedClipIds.indexOf(a.id);
      const idxB = orderedClipIds.indexOf(b.id);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), clips: sorted },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    commitDoc(set, nextDoc);
  },

  splitAnimationClip: (layerId, clipId, splitTime) => {
    const { document: doc, activeScreenId, currentTime } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const currentClips = getLayerClips(targetLayer);
    const targetClip = currentClips.find((c) => c.id === clipId);
    if (!targetClip) return;

    const t = splitTime ?? currentTime;
    if (t <= targetClip.start + 0.05 || t >= targetClip.start + targetClip.duration - 0.05) {
      return;
    }

    const dur1 = Math.round((t - targetClip.start) * 100) / 100;
    const dur2 = Math.round((targetClip.duration - dur1) * 100) / 100;
    const newTailId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const headClip: AnimationClip = {
      ...targetClip,
      duration: dur1,
    };
    const tailClip: AnimationClip = {
      ...targetClip,
      id: newTailId,
      name: `${targetClip.name || targetClip.preset} (Part 2)`,
      start: t,
      duration: dur2,
    };

    const nextClips: AnimationClip[] = [];
    for (const c of currentClips) {
      if (c.id === clipId) {
        nextClips.push(headClip, tailClip);
      } else {
        nextClips.push(c);
      }
    }

    const mutatedLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => ({
      ...layer,
      animation: { ...(layer.animation || {}), clips: nextClips },
    } as Layer));

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) => (s.id === activeScreenId ? { ...s, layers: mutatedLayers } : s)),
    };
    commitDoc(set, nextDoc, {
      selectedClipIds: [newTailId],
    });
  },

  // Jitter Animation Catalog Sheet State (overlay sheet matching exact right sidebar bounds)
  animationCatalogState: {
    isOpen: false,
    selectedClipId: null,
  },

  openAnimationCatalog: (selectedClipId = null) => {
    set({
      animationCatalogState: {
        isOpen: true,
        selectedClipId: selectedClipId ?? null,
      },
    });
  },

  closeAnimationCatalog: () => {
    set({
      animationCatalogState: {
        isOpen: false,
        selectedClipId: null,
      },
    });
  },

  applyAnimationPreset: (layerId, clipId, preset) => {
    const state = get();
    if (clipId) {
      state.updateAnimationClip(layerId, clipId, {
        name: preset.name,
        type: preset.type as any,
        preset: preset.id as any,
        duration: preset.duration,
        easing: preset.easing as any,
        loop: preset.params?.loop ?? false,
        params: { ...(preset.params || {}) },
        ...(preset.params || {}),
      });
      set({
        animationCatalogState: { isOpen: false, selectedClipId: null },
        selectedClipIds: [clipId],
      });
      return clipId;
    }

    const activeScreen = state.document.screens.find((s) => s.id === state.activeScreenId);
    const targetLayer = activeScreen ? findLayerInTree(activeScreen.layers, layerId) : null;
    const currentClips = targetLayer ? getLayerClips(targetLayer) : [];

    // General animation rule: When adding a new animation to an object,
    // nest it sequentially after existing animations end rather than starting at 0.
    const endOfOldAnimations = currentClips.length > 0
      ? Math.max(...currentClips.map((c) => c.start + c.duration))
      : 0;
    const clipStart = preset.params?.start !== undefined ? preset.params.start : endOfOldAnimations;

    // Special unified handling for Morph transition across two elements:
    if (preset.id === "morph" && preset.params?.targetLayerId) {
      const targetId = preset.params.targetLayerId;
      const morphGroupId = `morph_grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const morphDuration = preset.duration ?? 0.8;
      const morphEasing = (preset.easing || "smooth") as any;

      // 1. Exit clip on source layer
      const sourceClipId = state.addAnimationClip(layerId, {
        name: "Morph",
        type: "out",
        preset: "morph",
        start: clipStart,
        duration: morphDuration,
        easing: morphEasing,
        loop: false,
        params: {
          morphGroupId,
          sourceLayerId: layerId,
          targetLayerId: targetId,
          morphStyle: preset.params?.morphStyle || "stardust",
          particleCount: preset.params?.particleCount ?? 80,
          chaos: preset.params?.chaos ?? 30,
          particleShape: preset.params?.particleShape || "star",
          ...(preset.params || {}),
        },
      });

      // 2. Coordinated entrance clip on target layer (starts at exact same time and has exact same duration)
      const targetClipId = state.addAnimationClip(targetId, {
        name: "Morph",
        type: "in",
        preset: "morphIn",
        start: clipStart,
        duration: morphDuration,
        easing: morphEasing,
        loop: false,
        params: {
          morphGroupId,
          sourceLayerId: layerId,
          targetLayerId: targetId,
          partnerClipId: sourceClipId,
          morphStyle: preset.params?.morphStyle || "stardust",
          particleCount: preset.params?.particleCount ?? 80,
          chaos: preset.params?.chaos ?? 30,
          particleShape: preset.params?.particleShape || "star",
          ...(preset.params || {}),
        },
      });

      // Link targetClipId back to source clip
      if (sourceClipId && targetClipId) {
        state.updateAnimationClip(layerId, sourceClipId, {
          params: {
            morphGroupId,
            sourceLayerId: layerId,
            targetLayerId: targetId,
            partnerClipId: targetClipId,
            morphStyle: preset.params?.morphStyle || "stardust",
            particleCount: preset.params?.particleCount ?? 80,
            chaos: preset.params?.chaos ?? 30,
            particleShape: preset.params?.particleShape || "star",
            ...(preset.params || {}),
          },
        });
      }

      set({
        animationCatalogState: { isOpen: false, selectedClipId: null },
        selectedClipIds: sourceClipId && targetClipId ? [sourceClipId, targetClipId] : [sourceClipId || targetClipId],
      });
      return sourceClipId;
    }

    const newClipId = state.addAnimationClip(layerId, {
      name: preset.name,
      type: preset.type as any,
      preset: preset.id as any,
      start: clipStart,
      duration: preset.duration,
      easing: preset.easing as any,
      loop: preset.params?.loop ?? false,
      params: { ...(preset.params || {}) },
      ...(preset.params || {}),
    });

    set({
      animationCatalogState: { isOpen: false, selectedClipId: null },
      selectedClipIds: newClipId ? [newClipId] : [],
    });
    return newClipId;
  },

  relinkMorphTarget: (sourceLayerId, currentTargetLayerId, newTargetLayerId) => {
    if (!sourceLayerId || !newTargetLayerId || currentTargetLayerId === newTargetLayerId) return;
    const { document: doc, activeScreenId, selectedClipIds } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const sourceLayer = findLayerInTree(activeScreen.layers, sourceLayerId);
    const newTargetLayer = findLayerInTree(activeScreen.layers, newTargetLayerId);
    if (!sourceLayer || !newTargetLayer) return;

    // 1. Find the exit morph clip on sourceLayer
    const sourceClips = getLayerClips(sourceLayer);
    const sourceClip = sourceClips.find(
      (c) =>
        c.preset === "morph" ||
        (c.params?.sourceLayerId === sourceLayerId && c.params?.targetLayerId === currentTargetLayerId) ||
        Boolean(c.params?.morphGroupId)
    );
    if (!sourceClip) return;

    const morphGroupId = sourceClip.params?.morphGroupId || `morph_grp_${Date.now()}`;
    const newTargetClipId = `anim_clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. Remove old morphIn clip on currentTargetLayer (if present)
    let mutatedLayers = activeScreen.layers;
    let oldTargetClipId: string | null = null;
    if (currentTargetLayerId) {
      const oldTargetLayer = findLayerInTree(mutatedLayers, currentTargetLayerId);
      if (oldTargetLayer) {
        const oldTargetClips = getLayerClips(oldTargetLayer);
        const filteredOldClips = oldTargetClips.filter((c) => {
          const isOldMorphIn =
            (c.preset === "morphIn" || c.preset === "morph") &&
            (c.params?.morphGroupId === morphGroupId ||
              (c.params?.sourceLayerId === sourceLayerId && c.params?.targetLayerId === currentTargetLayerId));
          if (isOldMorphIn) {
            oldTargetClipId = c.id;
            return false;
          }
          return true;
        });

        mutatedLayers = mutateLayerInTree(mutatedLayers, currentTargetLayerId, (layer) => {
          const existing = { ...(layer.animation || {}) };
          if (oldTargetClipId && existing.in?.id === oldTargetClipId) {
            delete existing.in;
          }
          return { ...layer, animation: { ...existing, clips: filteredOldClips } } as Layer;
        });
      }
    }

    // 3. Create new morphIn clip on newTargetLayer
    const targetLayerRef = findLayerInTree(mutatedLayers, newTargetLayerId);
    const currentNewTargetClips = targetLayerRef ? getLayerClips(targetLayerRef) : [];
    const newTargetClip: AnimationClip = {
      id: newTargetClipId,
      name: "Morph",
      type: "in",
      preset: "morphIn",
      start: sourceClip.start,
      duration: sourceClip.duration,
      easing: sourceClip.easing,
      loop: false,
      params: {
        ...(sourceClip.params || {}),
        morphGroupId,
        sourceLayerId: sourceLayerId,
        targetLayerId: newTargetLayerId,
        partnerClipId: sourceClip.id,
      },
    };
    const nextNewTargetClips = [...currentNewTargetClips, newTargetClip].sort((a, b) => a.start - b.start);
    mutatedLayers = mutateLayerInTree(mutatedLayers, newTargetLayerId, (layer) => ({
      ...layer,
      animation: {
        ...(layer.animation || {}),
        in: newTargetClip,
        clips: nextNewTargetClips,
      },
    } as Layer));

    // 4. Update sourceClip on sourceLayer
    const nextSourceClips = sourceClips.map((c) => {
      if (c.id === sourceClip.id) {
        return {
          ...c,
          params: {
            ...(c.params || {}),
            morphGroupId,
            sourceLayerId: sourceLayerId,
            targetLayerId: newTargetLayerId,
            partnerClipId: newTargetClipId,
          },
        };
      }
      return c;
    });
    const updatedSourceClip = nextSourceClips.find((c) => c.id === sourceClip.id);
    mutatedLayers = mutateLayerInTree(mutatedLayers, sourceLayerId, (layer) => ({
      ...layer,
      animation: {
        ...(layer.animation || {}),
        out: updatedSourceClip?.type === "out" ? updatedSourceClip : layer.animation?.out,
        clips: nextSourceClips,
      },
    } as Layer));

    // 5. Update selection
    let nextSelectedClipIds = selectedClipIds;
    if (oldTargetClipId && selectedClipIds.includes(oldTargetClipId)) {
      nextSelectedClipIds = [newTargetClipId];
    } else if (selectedClipIds.includes(sourceClip.id)) {
      nextSelectedClipIds = [sourceClip.id];
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) =>
        screen.id === activeScreenId ? { ...screen, layers: mutatedLayers } : screen
      ),
    };

    commitDoc(set, nextDoc);
    set({ selectedClipIds: nextSelectedClipIds });
  },

  staggerSelectedLayers: (config) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    if (!selectedLayerIds || selectedLayerIds.length < 2) return;

    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const selectedLayers: Layer[] = [];
    for (const id of selectedLayerIds) {
      const l = findLayerInTree(activeScreen.layers, id);
      if (l) selectedLayers.push(l);
    }

    if (selectedLayers.length < 2) return;

    const { updatedLayers } = staggerLayers(selectedLayers, config);
    const updatedMap = new Map(updatedLayers.map((l) => [l.id, l]));

    let currentScreenLayers = activeScreen.layers;
    for (const [id, updated] of updatedMap.entries()) {
      currentScreenLayers = mutateLayerInTree(currentScreenLayers, id, () => updated);
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) =>
        screen.id === activeScreenId ? { ...screen, layers: currentScreenLayers } : screen
      ),
    };

    commitDoc(set, nextDoc);
  },
});
