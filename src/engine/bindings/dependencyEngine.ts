import React from 'react';
import {
  Layer,
  ConstraintAnchor,
  DriverProperty,
  DrivenProperty,
  LinkMode,
  ElementLinkBinding,
} from '@/types/scene';
import { getEasing, evaluateSpring } from '@/engine/easings';

export interface BoundingBox2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates the (x, y) coordinate of a specified anchor point on a 2D bounding box.
 */
export function getAnchorPoint(box: BoundingBox2D, anchor: ConstraintAnchor = 'center'): { x: number; y: number } {
  const { x, y, width: w, height: h } = box;

  switch (anchor) {
    case 'top-left':
      return { x, y };
    case 'top-center':
      return { x: x + w / 2, y };
    case 'top-right':
      return { x: x + w, y };
    case 'middle-left':
      return { x, y: y + h / 2 };
    case 'center':
      return { x: x + w / 2, y: y + h / 2 };
    case 'middle-right':
      return { x: x + w, y: y + h / 2 };
    case 'bottom-left':
      return { x, y: y + h };
    case 'bottom-center':
      return { x: x + w / 2, y: y + h };
    case 'bottom-right':
      return { x: x + w, y: y + h };
    default:
      return { x: x + w / 2, y: y + h / 2 };
  }
}

/**
 * Calculates top-left (x, y) for a box so that its specified anchor point lands at target point (px, py).
 */
export function alignBoxToPoint(
  px: number,
  py: number,
  width: number,
  height: number,
  targetAnchor: ConstraintAnchor = 'center'
): { x: number; y: number } {
  switch (targetAnchor) {
    case 'top-left':
      return { x: px, y: py };
    case 'top-center':
      return { x: px - width / 2, y: py };
    case 'top-right':
      return { x: px - width, y: py };
    case 'middle-left':
      return { x: px, y: py - height / 2 };
    case 'center':
      return { x: px - width / 2, y: py - height / 2 };
    case 'middle-right':
      return { x: px - width, y: py - height / 2 };
    case 'bottom-left':
      return { x: px, y: py - height };
    case 'bottom-center':
      return { x: px - width / 2, y: py - height };
    case 'bottom-right':
      return { x: px - width, y: py - height };
    default:
      return { x: px - width / 2, y: py - height / 2 };
  }
}

/**
 * Extracts a numeric or transform property from a layer and its current computed styles.
 */
function getDriverPropertyValue(
  layer: Layer,
  prop: DriverProperty,
  computedStyle?: React.CSSProperties,
  currentTime: number = 0
): number {
  const baseStyle = layer.style;

  switch (prop) {
    case 'x': {
      if (computedStyle?.transform) {
        const match = computedStyle.transform.toString().match(/translateX\(([-\d.]+)px\)/);
        if (match) return (baseStyle.x || 0) + parseFloat(match[1]);
      }
      return baseStyle.x || 0;
    }
    case 'y': {
      if (computedStyle?.transform) {
        const match = computedStyle.transform.toString().match(/translateY\(([-\d.]+)px\)/);
        if (match) return (baseStyle.y || 0) + parseFloat(match[1]);
      }
      return baseStyle.y || 0;
    }
    case 'width': {
      if (computedStyle?.width && typeof computedStyle.width === 'number') {
        return computedStyle.width;
      }
      if (typeof baseStyle.width === 'number') return baseStyle.width;
      // Heuristic fallback for auto text / elements
      if (layer.type === 'text' || layer.type === 'chunk') {
        const textLen = (layer as any).content?.length || 10;
        const fs = baseStyle.fontSize || 24;
        return textLen * (fs * 0.6);
      }
      return 140;
    }
    case 'height': {
      if (computedStyle?.height && typeof computedStyle.height === 'number') {
        return computedStyle.height;
      }
      if (typeof baseStyle.height === 'number') return baseStyle.height;
      if (layer.type === 'text' || layer.type === 'chunk') {
        return (baseStyle.fontSize || 24) * 1.4;
      }
      return 70;
    }
    case 'rotation': {
      if (computedStyle?.transform) {
        const match = computedStyle.transform.toString().match(/rotate\(([-\d.]+)deg\)/);
        if (match) return parseFloat(match[1]);
      }
      return baseStyle.rotation || 0;
    }
    case 'opacity': {
      if (computedStyle?.opacity !== undefined) {
        return Number(computedStyle.opacity);
      }
      return baseStyle.opacity ?? 1;
    }
    case 'scale': {
      if (computedStyle?.transform) {
        const match = computedStyle.transform.toString().match(/scale\(([-\d.]+)\)/);
        if (match) return parseFloat(match[1]);
      }
      return baseStyle.scaleX ?? 1;
    }
    case 'progress': {
      const anim = layer.animation?.in;
      if (!anim || anim.duration <= 0) return 1;
      if (currentTime < anim.start) return 0;
      if (currentTime >= anim.start + anim.duration) return 1;
      const t = (currentTime - anim.start) / anim.duration;
      const easeFn = getEasing(anim.easing, anim.bezierPoints);
      return easeFn(t);
    }
    default:
      return 0;
  }
}

/**
 * Topologically sorts layer IDs based on driver -> driven bindings, breaking cyclic dependencies safely.
 */
export function sortLayersByDependency(layers: Layer[]): string[] {
  const layerMap = new Map<string, Layer>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  function collectLayers(items: Layer[]) {
    for (const l of items) {
      layerMap.set(l.id, l);
      inDegree.set(l.id, 0);
      adjList.set(l.id, []);
      if (l.type === 'group' && (l as any).children) {
        collectLayers((l as any).children);
      }
    }
  }

  collectLayers(layers);

  // Build dependency edges: Driver -> Driven
  for (const [id, layer] of layerMap.entries()) {
    if (layer.bindings && layer.bindings.length > 0) {
      for (const b of layer.bindings) {
        if (layerMap.has(b.driverLayerId) && b.driverLayerId !== id) {
          const driverList = adjList.get(b.driverLayerId) || [];
          driverList.push(id);
          adjList.set(b.driverLayerId, driverList);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
        if (b.targetLayerId && layerMap.has(b.targetLayerId) && b.targetLayerId !== id) {
          const targetList = adjList.get(b.targetLayerId) || [];
          targetList.push(id);
          adjList.set(b.targetLayerId, targetList);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If there are cycles, append remaining layers to guarantee all layers are evaluated
  for (const id of layerMap.keys()) {
    if (!sorted.includes(id)) {
      sorted.push(id);
    }
  }

  return sorted;
}

/**
 * Evaluates a single binding between driver and target layers.
 */
export function evaluateBinding(
  binding: ElementLinkBinding,
  driverLayer: Layer,
  targetLayer: Layer,
  computedStyles: Record<string, React.CSSProperties>,
  currentTime: number,
  layerMap?: Map<string, Layer>
): { property: DrivenProperty; value: number; x?: number; y?: number; width?: number; height?: number; rotation?: number } {
  const driverComputed = computedStyles[driverLayer.id];
  const driverVal = getDriverPropertyValue(driverLayer, binding.driverProp, driverComputed, currentTime);

  const driverBox: BoundingBox2D = {
    x: getDriverPropertyValue(driverLayer, 'x', driverComputed, currentTime),
    y: getDriverPropertyValue(driverLayer, 'y', driverComputed, currentTime),
    width: getDriverPropertyValue(driverLayer, 'width', driverComputed, currentTime),
    height: getDriverPropertyValue(driverLayer, 'height', driverComputed, currentTime),
  };

  const targetBox: BoundingBox2D = {
    x: getDriverPropertyValue(targetLayer, 'x', computedStyles[targetLayer.id], currentTime),
    y: getDriverPropertyValue(targetLayer, 'y', computedStyles[targetLayer.id], currentTime),
    width: getDriverPropertyValue(targetLayer, 'width', computedStyles[targetLayer.id], currentTime),
    height: getDriverPropertyValue(targetLayer, 'height', computedStyles[targetLayer.id], currentTime),
  };

  switch (binding.mode) {
    case 'pin': {
      const targetAnchor = binding.targetAnchor || 'center';
      const driverAnchor = binding.driverAnchor || 'center';
      const [dx, dy] = binding.offset2D || [0, 0];

      let pinnedPt = { x: 0, y: 0 };
      if (binding.clampToTrack || binding.driverProp === 'progress') {
        // Progress bar edge follower: tracks along progress line
        const progressVal = Math.max(0, Math.min(1, driverVal > 1 ? driverVal / 100 : driverVal));
        pinnedPt = {
          x: driverBox.x + progressVal * driverBox.width + dx,
          y: driverBox.y + driverBox.height / 2 + dy,
        };
      } else {
        const driverAnchorPt = getAnchorPoint(driverBox, driverAnchor);
        pinnedPt = { x: driverAnchorPt.x + dx, y: driverAnchorPt.y + dy };
      }
      const aligned = alignBoxToPoint(pinnedPt.x, pinnedPt.y, targetBox.width, targetBox.height, targetAnchor);

      return {
        property: binding.drivenProp,
        value: binding.drivenProp === 'x' ? aligned.x : aligned.y,
        x: aligned.x,
        y: aligned.y,
      };
    }

    case 'hug': {
      const padding = binding.padding || [16, 12];
      const padTop = Array.isArray(padding) && padding.length === 4 ? padding[0] : Array.isArray(padding) ? padding[1] ?? 12 : 12;
      const padRight = Array.isArray(padding) && padding.length === 4 ? padding[1] : Array.isArray(padding) ? padding[0] ?? 16 : 16;
      const padBottom = Array.isArray(padding) && padding.length === 4 ? padding[2] : Array.isArray(padding) ? padding[1] ?? 12 : 12;
      const padLeft = Array.isArray(padding) && padding.length === 4 ? padding[3] : Array.isArray(padding) ? padding[0] ?? 16 : 16;

      let effectiveWidth = driverBox.width;
      let effectiveHeight = driverBox.height;
      let effectiveX = driverBox.x;
      let effectiveY = driverBox.y;

      // 1. Dynamic Text Token Stream Hugging (Chat Message Word Stagger & Typewriter)
      if (driverLayer.type === 'text') {
        const textContent = (driverLayer as any).content || '';
        const anim = driverLayer.animation?.in;
        if (anim) {
          if (anim.preset === 'typewriter') {
            const start = anim.start ?? 0;
            const dur = Math.max(anim.duration || 1.0, 0.05);
            const rawP = Math.max(0, Math.min(1, (currentTime - start) / dur));
            const charFraction = Math.max(0.15, rawP);
            let dynamicW = driverBox.width * charFraction;
            if (binding.expansionPhysics === 'spring' && rawP > 0) {
              const tau = Math.max(0, currentTime - start);
              const spring = evaluateSpring(tau, 1.0, binding.stiffness || 240, binding.damping || 22);
              dynamicW = driverBox.width * Math.min(1.0, charFraction * (0.85 + 0.15 * spring));
            }
            effectiveWidth = dynamicW;
          } else if (anim.animateBy === 'word') {
            const words = textContent.split(/\s+/).filter(Boolean);
            const wordCount = Math.max(1, words.length);
            const start = anim.start ?? 0;
            const stagger = anim.stagger ?? (anim.duration / wordCount);
            let activeWords = 0;
            let lastWordStart = start;
            for (let i = 0; i < wordCount; i++) {
              const wStart = start + i * stagger;
              if (currentTime >= wStart) {
                activeWords++;
                lastWordStart = wStart;
              }
            }
            const fraction = Math.max(0.2, activeWords / wordCount);
            let dynamicW = driverBox.width * fraction;
            if (binding.expansionPhysics === 'spring' && activeWords > 0) {
              const tau = Math.max(0, currentTime - lastWordStart);
              const spring = evaluateSpring(tau, 1.0, binding.stiffness || 240, binding.damping || 22);
              dynamicW = (dynamicW - 20) + 20 * Math.min(1.15, spring);
            }
            effectiveWidth = dynamicW;
          }
        }
      }

      // 2. Dynamic Temporal Union Bounding Box: If driver is a group with staggered children
      if (driverLayer.type === 'group' && Array.isArray((driverLayer as any).children) && (driverLayer as any).children.length > 0) {
        const children = (driverLayer as any).children as Layer[];
        const activeChildren = children.filter(c => {
          if (!c.animation?.in) return true;
          return c.animation.in.start <= currentTime;
        });

        const set = activeChildren.length > 0 ? activeChildren : [children[0]];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let latestChildStart = 0;

        for (const child of set) {
          const childComputed = computedStyles[child.id];
          const cx = getDriverPropertyValue(child, 'x', childComputed, currentTime);
          const cy = getDriverPropertyValue(child, 'y', childComputed, currentTime);
          const cw = getDriverPropertyValue(child, 'width', childComputed, currentTime);
          const ch = getDriverPropertyValue(child, 'height', childComputed, currentTime);

          minX = Math.min(minX, cx);
          minY = Math.min(minY, cy);
          maxX = Math.max(maxX, cx + cw);
          maxY = Math.max(maxY, cy + ch);

          const cStart = child.animation?.in?.start ?? 0;
          if (cStart > latestChildStart) latestChildStart = cStart;
        }

        if (minX !== Infinity && maxX !== -Infinity) {
          let unionW = maxX - minX;
          let unionH = maxY - minY;

          if (binding.expansionPhysics === 'spring' && activeChildren.length > 1) {
            const tau = Math.max(0, currentTime - latestChildStart);
            const springProgress = evaluateSpring(tau, 1.0, binding.stiffness || 220, binding.damping || 20);
            unionW = (unionW - 30) + 30 * Math.min(1.1, springProgress);
          }

          effectiveWidth = unionW;
          effectiveHeight = unionH;
          effectiveX = driverBox.x + minX;
          effectiveY = driverBox.y + minY;
        }
      }

      let newWidth = effectiveWidth + padLeft + padRight;
      let newHeight = effectiveHeight + padTop + padBottom;

      // Min/Max Dimension Clamping
      if (binding.minWidth !== undefined) newWidth = Math.max(binding.minWidth, newWidth);
      if (binding.maxWidth !== undefined) newWidth = Math.min(binding.maxWidth, newWidth);
      if (binding.minHeight !== undefined) newHeight = Math.max(binding.minHeight, newHeight);
      if (binding.maxHeight !== undefined) newHeight = Math.min(binding.maxHeight, newHeight);

      let newX = effectiveX - padLeft;
      let newY = effectiveY - padTop;

      // Invariant Anchor Pinning (e.g. Chat Tail locked to bottom-left)
      if (binding.hugAnchor === 'bottom-left') {
        newY = (effectiveY + effectiveHeight + padBottom) - newHeight;
      } else if (binding.hugAnchor === 'bottom-right') {
        newX = (effectiveX + effectiveWidth + padRight) - newWidth;
        newY = (effectiveY + effectiveHeight + padBottom) - newHeight;
      } else if (binding.hugAnchor === 'top-right') {
        newX = (effectiveX + effectiveWidth + padRight) - newWidth;
      } else if (binding.hugAnchor === 'center') {
        newX = effectiveX + effectiveWidth / 2 - newWidth / 2;
        newY = effectiveY + effectiveHeight / 2 - newHeight / 2;
      }

      return {
        property: binding.drivenProp,
        value: binding.drivenProp === 'width' ? newWidth : newHeight,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    }

    case 'track-word': {
      const padding = binding.padding || [12, 6];
      const padX = Array.isArray(padding) ? padding[0] : 12;
      const padY = Array.isArray(padding) ? padding[1] ?? padding[0] : 6;

      const textContent = (driverLayer as any).content || driverLayer.name || '';
      const words = textContent.split(/\s+/).filter(Boolean);
      const wordCount = Math.max(1, words.length);

      const anim = driverLayer.animation?.in;
      const startTime = anim?.start ?? 0;
      const totalDur = anim?.duration ?? 2.0;
      const wordSlot = totalDur / wordCount;

      const fs = driverLayer.style.fontSize || 32;
      const charW = fs * 0.55;
      const wordGap = fs * 0.3;

      const wordBoxes: { x: number; y: number; w: number; h: number }[] = [];
      let runningX = 0;
      for (const w of words) {
        const wWidth = Math.max(20, w.length * charW);
        wordBoxes.push({ x: runningX, y: 0, w: wWidth, h: fs * 1.25 });
        runningX += wWidth + wordGap;
      }

      let activeIdx = 0;
      let targetProgress = 1;
      if (currentTime < startTime) {
        activeIdx = 0;
        targetProgress = 0;
      } else if (currentTime >= startTime + totalDur) {
        activeIdx = wordCount - 1;
        targetProgress = 1;
      } else {
        const elapsed = currentTime - startTime;
        const currentSlot = Math.min(wordCount - 1, Math.floor(elapsed / wordSlot));
        const slotTime = elapsed % wordSlot;
        const transWindow = Math.min(0.25, wordSlot * 0.4);

        if (slotTime > wordSlot - transWindow && currentSlot < wordCount - 1) {
          activeIdx = currentSlot;
          const tau = (slotTime - (wordSlot - transWindow)) / transWindow;
          targetProgress = 1 - Math.pow(1 - tau, 5); // Snappy quintic glide
        } else {
          activeIdx = currentSlot;
          targetProgress = 0;
        }
      }

      const currentBox = wordBoxes[activeIdx] || { x: 0, y: 0, w: 60, h: fs * 1.25 };
      const nextBox = wordBoxes[Math.min(wordCount - 1, activeIdx + 1)] || currentBox;

      const interpX = (1 - targetProgress) * currentBox.x + targetProgress * nextBox.x;
      const interpY = (1 - targetProgress) * currentBox.y + targetProgress * nextBox.y;
      const interpW = (1 - targetProgress) * currentBox.w + targetProgress * nextBox.w;
      const interpH = (1 - targetProgress) * currentBox.h + targetProgress * nextBox.h;

      const finalX = driverBox.x + interpX - padX;
      const finalY = driverBox.y + interpY - padY;
      const finalW = interpW + padX * 2;
      const finalH = interpH + padY * 2;

      return {
        property: binding.drivenProp,
        value: binding.drivenProp === 'x' ? finalX : binding.drivenProp === 'y' ? finalY : finalW,
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
      };
    }

    case 'reflow': {
      const axis = binding.reflowAxis || 'horizontal';
      const gap = binding.reflowGap ?? 16;
      const alignment = binding.reflowAlignment || 'center';

      let posX = targetBox.x;
      let posY = targetBox.y;

      if (axis === 'horizontal') {
        const restingX = driverBox.x + driverBox.width + gap;
        if (alignment === 'start') {
          posY = driverBox.y;
        } else if (alignment === 'end') {
          posY = driverBox.y + driverBox.height - targetBox.height;
        } else {
          // center
          posY = driverBox.y + driverBox.height / 2 - targetBox.height / 2;
        }

        // Dynamic spring momentum handoff if driver layer is animating
        if (binding.expansionPhysics === 'spring' && driverLayer.animation?.in) {
          const anim = driverLayer.animation.in;
          const start = anim.start ?? 0;
          if (currentTime >= start) {
            const tau = Math.max(0, currentTime - start);
            const spring = evaluateSpring(tau, 1.0, binding.stiffness || 260, binding.damping || 24);
            const baseX = targetLayer.style.x ?? restingX;
            posX = baseX + (restingX - baseX) * Math.min(1.15, Math.max(0, spring));
          } else {
            posX = targetLayer.style.x ?? restingX;
          }
        } else {
          posX = restingX;
        }
      } else {
        // Vertical reflow
        const restingY = driverBox.y + driverBox.height + gap;
        if (alignment === 'start') {
          posX = driverBox.x;
        } else if (alignment === 'end') {
          posX = driverBox.x + driverBox.width - targetBox.width;
        } else {
          // center
          posX = driverBox.x + driverBox.width / 2 - targetBox.width / 2;
        }

        if (binding.expansionPhysics === 'spring' && driverLayer.animation?.in) {
          const anim = driverLayer.animation.in;
          const start = anim.start ?? 0;
          if (currentTime >= start) {
            const tau = Math.max(0, currentTime - start);
            const spring = evaluateSpring(tau, 1.0, binding.stiffness || 260, binding.damping || 24);
            const baseY = targetLayer.style.y ?? restingY;
            posY = baseY + (restingY - baseY) * Math.min(1.15, Math.max(0, spring));
          } else {
            posY = targetLayer.style.y ?? restingY;
          }
        } else {
          posY = restingY;
        }
      }

      return {
        property: axis === 'horizontal' ? 'x' : 'y',
        value: axis === 'horizontal' ? posX : posY,
        x: posX,
        y: posY,
      };
    }

    case 'leader-line':
    case 'connect': {
      const driverAnchor = binding.driverAnchor || 'center';
      const targetAnchor = binding.targetAnchor || 'center';

      const p1 = getAnchorPoint(driverBox, driverAnchor);

      let destBox = targetBox;
      if (binding.targetLayerId && layerMap?.has(binding.targetLayerId)) {
        const destLayer = layerMap.get(binding.targetLayerId)!;
        const destComputed = computedStyles[destLayer.id];
        destBox = {
          x: getDriverPropertyValue(destLayer, 'x', destComputed, currentTime),
          y: getDriverPropertyValue(destLayer, 'y', destComputed, currentTime),
          width: getDriverPropertyValue(destLayer, 'width', destComputed, currentTime),
          height: getDriverPropertyValue(destLayer, 'height', destComputed, currentTime),
        };
      }

      const p2 = getAnchorPoint(destBox, targetAnchor);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

      return {
        property: 'width',
        value: dist,
        x: p1.x,
        y: p1.y,
        width: dist,
        height: 2,
        rotation: angleDeg,
      };
    }

    case 'match': {
      const mult = binding.multiplier ?? 1;
      const off = binding.offset ?? 0;
      const result = driverVal * mult + off;
      return {
        property: binding.drivenProp,
        value: result,
      };
    }

    case 'remap': {
      const [sMin, sMax] = binding.sourceRange || [0, 100];
      const [tMin, tMax] = binding.targetRange || [0, 1];
      const span = sMax - sMin;
      const norm = span === 0 ? 0 : Math.max(0, Math.min(1, (driverVal - sMin) / span));
      const easeFn = getEasing(binding.easing || 'linear');
      const easedNorm = easeFn(norm);
      const mapped = tMin + easedNorm * (tMax - tMin);

      return {
        property: binding.drivenProp,
        value: mapped,
      };
    }

    case 'lag': {
      const lag = binding.lagSeconds ?? 0.1;
      const historicalTime = Math.max(0, currentTime - lag);
      const laggedVal = getDriverPropertyValue(driverLayer, binding.driverProp, undefined, historicalTime);
      return {
        property: binding.drivenProp,
        value: laggedVal,
      };
    }

    default:
      return {
        property: binding.drivenProp,
        value: driverVal,
      };
  }
}

/**
 * Resolves all reactive bindings across all layers deterministically at time t.
 */
export function resolveSceneBindings(
  layers: Layer[],
  baseComputedStyles: Record<string, React.CSSProperties>,
  currentTime: number
): Record<string, React.CSSProperties> {
  const resolved: Record<string, React.CSSProperties> = { ...baseComputedStyles };

  // Flatten map of all layers by id
  const layerMap = new Map<string, Layer>();
  function populateMap(items: Layer[]) {
    for (const item of items) {
      layerMap.set(item.id, item);
      if (item.type === 'group' && (item as any).children) {
        populateMap((item as any).children);
      }
    }
  }
  populateMap(layers);

  const evaluationOrder = sortLayersByDependency(layers);

  for (const layerId of evaluationOrder) {
    const layer = layerMap.get(layerId);
    if (!layer || !layer.bindings || layer.bindings.length === 0) continue;

    const layerStyle = { ...(resolved[layerId] || {}) };

    for (const binding of layer.bindings) {
      const driver = layerMap.get(binding.driverLayerId);
      if (!driver) continue;

      const evalResult = evaluateBinding(binding, driver, layer, resolved, currentTime, layerMap);

      if (evalResult.width !== undefined) {
        layerStyle.width = `${Math.round(evalResult.width)}px`;
      }
      if (evalResult.height !== undefined) {
        layerStyle.height = `${Math.round(evalResult.height)}px`;
      }

      if (binding.mode === 'pin' || binding.mode === 'hug' || binding.mode === 'track-word' || binding.mode === 'reflow') {
        if (evalResult.x !== undefined) {
          layerStyle.left = `${Math.round(evalResult.x)}px`;
        }
        if (evalResult.y !== undefined) {
          layerStyle.top = `${Math.round(evalResult.y)}px`;
        }
      } else if (binding.mode === 'leader-line' || binding.mode === 'connect') {
        if (evalResult.x !== undefined) {
          layerStyle.left = `${Math.round(evalResult.x)}px`;
        }
        if (evalResult.y !== undefined) {
          layerStyle.top = `${Math.round(evalResult.y)}px`;
        }
        if (evalResult.rotation !== undefined) {
          const curTransform = layerStyle.transform ? layerStyle.transform.toString() : '';
          const stripped = curTransform.replace(/rotate\([^)]+\)/g, '').trim();
          layerStyle.transform = `${stripped} rotate(${evalResult.rotation.toFixed(2)}deg)`.trim();
          layerStyle.transformOrigin = '0% 50%';
        }
      } else {
        // Mode is match, remap, or lag
        switch (evalResult.property) {
          case 'x': {
            const curTransform = layerStyle.transform ? layerStyle.transform.toString() : '';
            const stripped = curTransform.replace(/translateX\([^)]+\)/g, '').trim();
            layerStyle.transform = `${stripped} translateX(${evalResult.value.toFixed(1)}px)`.trim();
            break;
          }
          case 'y': {
            const curTransform = layerStyle.transform ? layerStyle.transform.toString() : '';
            const stripped = curTransform.replace(/translateY\([^)]+\)/g, '').trim();
            layerStyle.transform = `${stripped} translateY(${evalResult.value.toFixed(1)}px)`.trim();
            break;
          }
          case 'rotation': {
            const curTransform = layerStyle.transform ? layerStyle.transform.toString() : '';
            const stripped = curTransform.replace(/rotate\([^)]+\)/g, '').trim();
            layerStyle.transform = `${stripped} rotate(${evalResult.value.toFixed(1)}deg)`.trim();
            break;
          }
          case 'scale':
          case 'scaleX':
          case 'scaleY': {
            const curTransform = layerStyle.transform ? layerStyle.transform.toString() : '';
            const stripped = curTransform.replace(/scale\([^)]+\)/g, '').trim();
            layerStyle.transform = `${stripped} scale(${evalResult.value.toFixed(3)})`.trim();
            break;
          }
          case 'opacity': {
            layerStyle.opacity = Math.max(0, Math.min(1, evalResult.value));
            break;
          }
          case 'width': {
            layerStyle.width = `${Math.round(evalResult.value)}px`;
            break;
          }
          case 'height': {
            layerStyle.height = `${Math.round(evalResult.value)}px`;
            break;
          }
        }
      }
    }

    resolved[layerId] = layerStyle;
  }

  return resolved;
}
