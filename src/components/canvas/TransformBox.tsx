import React, { useState, useRef, useEffect, useCallback } from "react";
import { Layer, LayerStyle } from "@/types/scene";
import { useProjectStore, findParentGroupInTree } from "@/store/useProjectStore";
import { calculateSnapping, SnapGuide } from "./snapping";
import { isVectorLine } from "@/utils/layerCapabilities";

const getParentWorldOffset = (targetId: string): { x: number; y: number } => {
  let curX = 0;
  let curY = 0;
  const activeLayers =
    useProjectStore.getState().document.screens.find(
      (s) => s.id === useProjectStore.getState().activeScreenId
    )?.layers || [];
  let currentParent = findParentGroupInTree(activeLayers, targetId);
  while (currentParent) {
    curX += currentParent.style.x || 0;
    curY += currentParent.style.y || 0;
    currentParent = findParentGroupInTree(activeLayers, currentParent.id);
  }
  return { x: curX, y: curY };
};

interface TransformBoxProps {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  siblingBoxes: { x: number; y: number; width: number; height: number }[];
  effectiveScale: number;
  onGuidesChange: (guides: SnapGuide[]) => void;
  bounds?: { x: number; y: number; width: number; height: number } | null;
  selectedLayers?: Layer[];
  isAnimateMode?: boolean;
  screenOffset?: { x: number; y: number };
  isPanMode?: boolean;
}

type HandleType =
  | "move"
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate"
  | "endpoint-start"
  | "endpoint-end"
  | "star-inner-radius";

interface DragSession {
  handle: HandleType;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  initialFontSize: number;
  initialRotation: number;
  aspectRatio: number;
  anchorWorld: { x: number; y: number };
  anchorLocal: { x: number; y: number };
  targetLayerId: string;
  initialLayers: { id: string; x: number; y: number; width: number; height: number }[];
  initialRadius: number | [number, number, number, number];
}

const HANDLE_CONFIG: Record<
  string,
  { dir: [number, number]; anchor: [number, number]; angle: number }
> = {
  nw: { dir: [-1, -1], anchor: [1, 1], angle: 315 },
  n: { dir: [0, -1], anchor: [0, 1], angle: 0 },
  ne: { dir: [1, -1], anchor: [-1, 1], angle: 45 },
  e: { dir: [1, 0], anchor: [-1, 0], angle: 90 },
  se: { dir: [1, 1], anchor: [-1, -1], angle: 135 },
  s: { dir: [0, 1], anchor: [0, -1], angle: 180 },
  sw: { dir: [-1, 1], anchor: [1, -1], angle: 225 },
  w: { dir: [-1, 0], anchor: [1, 0], angle: 270 },
};

function getRotatedCursor(handle: string, rotationDeg: number): string {
  const config = HANDLE_CONFIG[handle];
  if (!config) return "default";
  const totalAngle = (((config.angle + rotationDeg) % 180) + 180) % 180;
  if (totalAngle >= 22.5 && totalAngle < 67.5) return "nesw-resize";
  if (totalAngle >= 67.5 && totalAngle < 112.5) return "ew-resize";
  if (totalAngle >= 112.5 && totalAngle < 157.5) return "nwse-resize";
  return "ns-resize";
}

// Crisp bidirectional curved rotation cursor with high-contrast dual stroke
const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M21 4v5h-5M3 20v-5h5' stroke='%23000' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 4v5h-5M3 20v-5h5' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M20.5 9A9 9 0 0 0 5.7 5.7M3.5 15a9 9 0 0 0 14.8 3.3' stroke='%23000' stroke-width='3.5' stroke-linecap='round'/%3E%3Cpath d='M20.5 9A9 9 0 0 0 5.7 5.7M3.5 15a9 9 0 0 0 14.8 3.3' stroke='%23fff' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, crosshair`;

export const TransformBox: React.FC<TransformBoxProps> = ({
  layer,
  canvasWidth,
  canvasHeight,
  siblingBoxes,
  effectiveScale,
  onGuidesChange,
  bounds,
  selectedLayers,
  isAnimateMode = false,
  screenOffset,
  isPanMode = false,
}) => {
  const {
    updateLayerStyle,
    updateLayer,
    startTransaction,
    commitTransaction,
    setEditingLayerId,
    editingLayerId,
    selectLayer,
    duplicateLayerInPlace,
  } = useProjectStore();

  const isMulti = (selectedLayers && selectedLayers.length > 1) || false;
  const isEditing = editingLayerId === layer.id;
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);

  const parentOffset = getParentWorldOffset(layer.id);
  const domEl = typeof document !== "undefined" ? document.getElementById(`layer-${layer.id}`) : null;

  // For multi-selection, use the enclosing AABB bounds
  // For single-selection, use the canonical local coordinates and unrotated dimensions
  const visualW =
    isMulti && bounds
      ? bounds.width
      : typeof layer.style.width === "number"
      ? layer.style.width
      : domEl?.offsetWidth || 200;

  const visualH =
    isMulti && bounds
      ? bounds.height
      : typeof layer.style.height === "number"
      ? layer.style.height
      : domEl?.offsetHeight || 100;

  let visualX = isMulti && bounds ? bounds.x : (layer.style.x || 0) + parentOffset.x;
  let visualY = isMulti && bounds ? bounds.y : (layer.style.y || 0) + parentOffset.y;

  // If a single layer is inside a flex container (no direct style.x/y), derive unrotated top-left from its DOM center
  if (!isMulti && domEl && (layer.style.x === undefined || layer.style.y === undefined)) {
    const screenEl = document.getElementById(`screen-${useProjectStore.getState().activeScreenId}`);
    if (screenEl) {
      const elRect = domEl.getBoundingClientRect();
      const screenRect = screenEl.getBoundingClientRect();
      const domScale = screenRect.width > 0 ? screenRect.width / canvasWidth : effectiveScale;
      const centerX = (elRect.left + elRect.width / 2 - screenRect.left) / domScale;
      const centerY = (elRect.top + elRect.height / 2 - screenRect.top) / domScale;
      visualX = centerX - visualW / 2;
      visualY = centerY - visualH / 2;
    }
  }

  const rotation = isMulti ? 0 : layer.style.rotation || 0;

  const sessionRef = useRef<DragSession | null>(null);

  // When actively dragging to MOVE, lock rendered selection box width and height to initial captured size
  const curVisualW =
    activeHandle === "move" && sessionRef.current
      ? sessionRef.current.initialWidth
      : visualW;
  const curVisualH =
    activeHandle === "move" && sessionRef.current
      ? sessionRef.current.initialHeight
      : visualH;

  // Client to Canvas coordinate converter
  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const screenEl = document.getElementById(
        `screen-${useProjectStore.getState().activeScreenId}`
      );
      if (!screenEl) {
        return { x: clientX / effectiveScale, y: clientY / effectiveScale };
      }
      const screenRect = screenEl.getBoundingClientRect();
      const domScale = screenRect.width > 0 ? screenRect.width / canvasWidth : effectiveScale;
      return {
        x: (clientX - screenRect.left) / domScale,
        y: (clientY - screenRect.top) / domScale,
      };
    },
    [canvasWidth, effectiveScale]
  );

  const handlePointerDown = (handle: HandleType, e: React.PointerEvent) => {
    if (isPanMode) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    // Ctrl / Cmd deep-drill into group child
    if (handle === "move" && (e.ctrlKey || e.metaKey) && !e.altKey && layer.type === "group") {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      for (const el of elements) {
        const layerEl = (el as HTMLElement).closest?.('[id^="layer-"]');
        const match = layerEl?.id?.match(/^layer-(.+)$/);
        if (match && match[1] && match[1] !== layer.id) {
          selectLayer(match[1], e.shiftKey);
          return;
        }
      }
      return;
    }

    startTransaction();
    setActiveHandle(handle);

    let targetLayerId = layer.id;
    let initialLayers =
      isMulti && selectedLayers
        ? selectedLayers.map((l) => ({
            id: l.id,
            x: l.style.x || 0,
            y: l.style.y || 0,
            width: typeof l.style.width === "number" ? l.style.width : 100,
            height: typeof l.style.height === "number" ? l.style.height : 50,
          }))
        : [];

    // Alt + Drag Duplication
    if (handle === "move" && e.altKey) {
      if (isMulti && selectedLayers && selectedLayers.length > 1) {
        const clonedList: { id: string; x: number; y: number; width: number; height: number }[] = [];
        for (const l of selectedLayers) {
          const newId = duplicateLayerInPlace(l.id);
          clonedList.push({
            id: newId,
            x: l.style.x || 0,
            y: l.style.y || 0,
            width: typeof l.style.width === "number" ? l.style.width : 100,
            height: typeof l.style.height === "number" ? l.style.height : 50,
          });
        }
        initialLayers = clonedList;
        useProjectStore.setState({ selectedLayerIds: clonedList.map((c) => c.id) });
        targetLayerId = clonedList[0]?.id || layer.id;
      } else {
        targetLayerId = duplicateLayerInPlace(layer.id);
      }
    }

    const mouseCanvas = getCanvasPoint(e.clientX, e.clientY);
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const centerX = visualX + visualW / 2;
    const centerY = visualY + visualH / 2;

    const handleCfg = HANDLE_CONFIG[handle];
    const anchorLocal = handleCfg ? handleCfg.anchor : [0, 0];

    // Compute invariant world anchor position
    const anchorOffsetX = (anchorLocal[0] * visualW) / 2;
    const anchorOffsetY = (anchorLocal[1] * visualH) / 2;
    const anchorWorldX = centerX + (anchorOffsetX * cos - anchorOffsetY * sin);
    const anchorWorldY = centerY + (anchorOffsetX * sin + anchorOffsetY * cos);

    sessionRef.current = {
      handle,
      startX: mouseCanvas.x,
      startY: mouseCanvas.y,
      initialX: visualX,
      initialY: visualY,
      initialWidth: visualW,
      initialHeight: visualH,
      initialFontSize: layer.style.fontSize || 32,
      initialRotation: rotation,
      aspectRatio: visualW / Math.max(visualH, 1),
      anchorWorld: { x: anchorWorldX, y: anchorWorldY },
      anchorLocal: { x: anchorLocal[0], y: anchorLocal[1] },
      targetLayerId,
      initialLayers,
      initialRadius: layer.style.borderRadius ?? 0,
    };
  };

  // Robust Global Window Pointer Listeners (Guarantees zero dropped pointerup/collapse bugs)
  useEffect(() => {
    if (!activeHandle) return;

    const onPointerMove = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      const mouseCanvas = getCanvasPoint(e.clientX, e.clientY);
      const deltaX = mouseCanvas.x - session.startX;
      const deltaY = mouseCanvas.y - session.startY;

      if (session.handle === "move") {
        let nextX = session.initialX + deltaX;
        let nextY = session.initialY + deltaY;

        if (e.shiftKey) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            nextY = session.initialY;
          } else {
            nextX = session.initialX;
          }
        }

        const snap = calculateSnapping(
          nextX,
          nextY,
          session.initialWidth,
          session.initialHeight,
          canvasWidth,
          canvasHeight,
          siblingBoxes,
          effectiveScale
        );

        onGuidesChange(snap.guides);

        if (isMulti && session.initialLayers.length > 0) {
          const snappedDeltaX = snap.x - session.initialX;
          const snappedDeltaY = snap.y - session.initialY;
          for (const item of session.initialLayers) {
            updateLayerStyle(item.id, {
              x: Math.round(item.x + snappedDeltaX),
              y: Math.round(item.y + snappedDeltaY),
            });
          }
          return;
        }

        const parentOffset = getParentWorldOffset(session.targetLayerId);
        updateLayerStyle(session.targetLayerId, {
          x: Math.round(snap.x - parentOffset.x),
          y: Math.round(snap.y - parentOffset.y),
        });
      } else if (session.handle === "rotate") {
        const centerX = session.initialX + session.initialWidth / 2;
        const centerY = session.initialY + session.initialHeight / 2;

        const initialRad = Math.atan2(session.startY - centerY, session.startX - centerX);
        const currentRad = Math.atan2(mouseCanvas.y - centerY, mouseCanvas.x - centerX);
        let diff = currentRad - initialRad;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        const deltaDeg = (diff * 180) / Math.PI;

        let deg = session.initialRotation + deltaDeg;
        deg = ((deg % 360) + 360) % 360;

        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
          deg = ((deg % 360) + 360) % 360;
        }

        updateLayerStyle(session.targetLayerId, { rotation: Math.round(deg) });
      } else if (session.handle === "endpoint-end") {
        // Direct vector endpoint dragging for line end
        const originX = session.initialX;
        const originY = session.initialY + session.initialHeight / 2;
        const dx = mouseCanvas.x - originX;
        const dy = mouseCanvas.y - originY;
        const rawLength = Math.max(10, Math.hypot(dx, dy));
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;

        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
          deg = ((deg % 360) + 360) % 360;
        }

        updateLayerStyle(session.targetLayerId, {
          width: Math.round(rawLength),
          rotation: Math.round(deg),
        });
      } else if (session.handle === "endpoint-start") {
        // Direct vector endpoint dragging for line start with fixed end
        const initRad = (session.initialRotation * Math.PI) / 180;
        const p2X = session.initialX + session.initialWidth * Math.cos(initRad);
        const p2Y = session.initialY + session.initialHeight / 2 + session.initialWidth * Math.sin(initRad);

        const dx = p2X - mouseCanvas.x;
        const dy = p2Y - mouseCanvas.y;
        const rawLength = Math.max(10, Math.hypot(dx, dy));
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;

        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
          deg = ((deg % 360) + 360) % 360;
        }

        const parentOffset = getParentWorldOffset(session.targetLayerId);
        updateLayerStyle(session.targetLayerId, {
          x: Math.round(mouseCanvas.x - parentOffset.x),
          y: Math.round(mouseCanvas.y - session.initialHeight / 2 - parentOffset.y),
          width: Math.round(rawLength),
          rotation: Math.round(deg),
        });
      } else if (session.handle === "star-inner-radius") {
        const rad = (session.initialRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const centerX = session.initialX + session.initialWidth / 2;
        const centerY = session.initialY + session.initialHeight / 2;

        const dx = mouseCanvas.x - centerX;
        const dy = mouseCanvas.y - centerY;

        // Unproject to local rotated star coordinate system
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;

        const currentDist = Math.hypot(localX, localY);
        const maxR = 0.45 * Math.min(session.initialWidth, session.initialHeight);
        const ratio = Math.max(0.1, Math.min(0.95, currentDist / Math.max(1, maxR)));

        updateLayer(session.targetLayerId, {
          innerRadiusRatio: Math.round(ratio * 1000) / 1000,
        } as any);
      } else {
        // Rotated Invariant Resizing
        const rad = (session.initialRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Vector from stationary anchor to mouse
        const toMouseX = mouseCanvas.x - session.anchorWorld.x;
        const toMouseY = mouseCanvas.y - session.anchorWorld.y;

        // Unproject to local rotated layer frame
        const localMouseX = toMouseX * cos + toMouseY * sin;
        const localMouseY = -toMouseX * sin + toMouseY * cos;

        const handleCfg = HANDLE_CONFIG[session.handle];
        const dirX = handleCfg ? handleCfg.dir[0] : 0;
        const dirY = handleCfg ? handleCfg.dir[1] : 0;

        const isAlt = e.altKey;
        let newW = session.initialWidth;
        let newH = session.initialHeight;

        if (dirX !== 0) {
          const rawW = isAlt ? 2 * Math.abs(localMouseX) : dirX * localMouseX;
          newW = Math.max(rawW, 10);
        }

        if (dirY !== 0) {
          const rawH = isAlt ? 2 * Math.abs(localMouseY) : dirY * localMouseY;
          newH = Math.max(rawH, 10);
        }

        // Shift Constraint: Preserves exact initial aspect ratio (r = W_0 / H_0)
        if (e.shiftKey && dirX !== 0 && dirY !== 0) {
          const ratio = session.aspectRatio;
          if (newW / ratio > newH) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
        }

        // Anchor Invariant Center Derivation
        const anchorLocalX = isAlt ? 0 : session.anchorLocal.x;
        const anchorLocalY = isAlt ? 0 : session.anchorLocal.y;

        const anchorOffsetNewX = (anchorLocalX * newW) / 2;
        const anchorOffsetNewY = (anchorLocalY * newH) / 2;

        const newCenterX = session.anchorWorld.x - (anchorOffsetNewX * cos - anchorOffsetNewY * sin);
        const newCenterY = session.anchorWorld.y - (anchorOffsetNewX * sin + anchorOffsetNewY * cos);

        const newX = newCenterX - newW / 2;
        const newY = newCenterY - newH / 2;

        if (isMulti && session.initialLayers.length > 0) {
          const scaleFactorX = session.initialWidth > 0 ? newW / session.initialWidth : 1;
          const scaleFactorY = session.initialHeight > 0 ? newH / session.initialHeight : 1;

          for (const item of session.initialLayers) {
            const relX = item.x - session.initialX;
            const relY = item.y - session.initialY;
            const itemNewX = newX + relX * scaleFactorX;
            const itemNewY = newY + relY * scaleFactorY;
            const itemNewW = Math.max(10, item.width * scaleFactorX);
            const itemNewH = Math.max(10, item.height * scaleFactorY);

            updateLayerStyle(item.id, {
              x: Math.round(itemNewX),
              y: Math.round(itemNewY),
              width: Math.round(itemNewW),
              height: Math.round(itemNewH),
            });
          }
          return;
        }

        const parentOffset = getParentWorldOffset(session.targetLayerId);
        const updates: Partial<LayerStyle> = {
          x: Math.round(newX - parentOffset.x),
          y: Math.round(newY - parentOffset.y),
          width: Math.round(newW),
        };

        // Dual-Mode Text Scaling vs Edge Reflow
        if (layer.type === "text" || layer.type === "chunk") {
          const isCorner = ["nw", "ne", "se", "sw"].includes(session.handle);
          if (isCorner) {
            updates.width = Math.round(newW);
            updates.height = Math.round(newH);
            updates.textSizing = "fixed";
            updates.boxMode = "area";
          } else if (session.handle.includes("e") || session.handle.includes("w")) {
            updates.width = Math.round(newW);
            updates.height = Math.round(session.initialHeight);
            updates.textSizing = "auto-height";
            updates.boxMode = "area";
          } else {
            updates.width = Math.round(session.initialWidth);
            updates.height = Math.round(newH);
            updates.textSizing = "fixed";
            updates.boxMode = "area";
          }
        } else {
          updates.height = Math.round(newH);
        }

        updateLayerStyle(session.targetLayerId, updates);
      }
    };

    const onPointerUp = () => {
      setActiveHandle(null);
      sessionRef.current = null;
      onGuidesChange([]);
      commitTransaction();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onPointerUp);
    };
  }, [
    activeHandle,
    canvasWidth,
    canvasHeight,
    siblingBoxes,
    layer.type,
    isMulti,
    effectiveScale,
    onGuidesChange,
    updateLayerStyle,
    updateLayer,
    commitTransaction,
    getCanvasPoint,
  ]);

  const pivotOriginX = isMulti ? "center" : `${(layer.style.pivotX ?? 0.5) * 100}%`;
  const pivotOriginY = isMulti ? "center" : `${(layer.style.pivotY ?? 0.5) * 100}%`;

  const renderX = visualX + (screenOffset?.x ?? 0);
  const renderY = visualY + (screenOffset?.y ?? 0);

  // Parametric Star Handle Coordinates
  const isStar = !isMulti && layer.type === "shape" && (layer as any).shapeType === "star";
  const starPoints = (layer as any).points || 5;
  const starRatio = (layer as any).innerRadiusRatio ?? 0.382;
  const starAngle = Math.PI / starPoints - Math.PI / 2;
  const starScale = Math.min(curVisualW, curVisualH) / 100;
  const starOffsetX = (curVisualW - 100 * starScale) / 2;
  const starOffsetY = (curVisualH - 100 * starScale) / 2;
  const starHandleX = starOffsetX + (50 + 45 * starRatio * Math.cos(starAngle)) * starScale;
  const starHandleY = starOffsetY + (50 + 45 * starRatio * Math.sin(starAngle)) * starScale;

  return (
    <div
      style={{
        position: "absolute",
        left: `${renderX}px`,
        top: `${renderY}px`,
        width: `${curVisualW}px`,
        height: `${curVisualH}px`,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: `${pivotOriginX} ${pivotOriginY}`,
        pointerEvents: "none",
      }}
      className="z-40 ring-1 ring-[#7c3aed] select-none group pointer-events-none"
    >
      {/* Pivot / Anchor Point Indicator */}
      {!isMulti && (
        <div
          style={{
            left: `${(layer.style.pivotX ?? 0.5) * 100}%`,
            top: `${(layer.style.pivotY ?? 0.5) * 100}%`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-[#7c3aed] flex items-center justify-center pointer-events-none z-30 shadow-xs"
          title="Anchor / Pivot Point"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
        </div>
      )}
      {/* Center Drag Body: Clicking and dragging anywhere inside the selection box moves the layer */}
      {!isEditing && (
        <div
          className={`absolute inset-0 ${
            isPanMode ? "pointer-events-none" : "cursor-move pointer-events-auto"
          }`}
          onPointerDown={(e) => handlePointerDown("move", e)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (layer.type === "text" || layer.type === "chunk") {
              setEditingLayerId(layer.id);
            } else if (layer.type === "group") {
              // Deep-drills into clicked child layer
              const elements = document.elementsFromPoint(e.clientX, e.clientY);
              for (const el of elements) {
                const layerEl = (el as HTMLElement).closest?.('[id^="layer-"]');
                const match = layerEl?.id?.match(/^layer-(.+)$/);
                if (match && match[1] && match[1] !== layer.id) {
                  selectLayer(match[1], false);
                  return;
                }
              }
              if (layer.children && layer.children.length > 0) {
                selectLayer(layer.children[0].id, false);
              }
            }
          }}
        />
      )}

      {/* 4 Border Grab Edges, Rotation Controls & Handles (Only when NOT editing text!) */}
      {!isEditing && (
        <>
          <div
            className={`absolute top-0 left-0 right-0 h-2 -translate-y-1 ${
              isPanMode ? "pointer-events-none" : "cursor-move pointer-events-auto"
            }`}
            onPointerDown={(e) => handlePointerDown("move", e)}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 h-2 translate-y-1 ${
              isPanMode ? "pointer-events-none" : "cursor-move pointer-events-auto"
            }`}
            onPointerDown={(e) => handlePointerDown("move", e)}
          />
          <div
            className={`absolute top-0 bottom-0 left-0 w-2 -translate-x-1 ${
              isPanMode ? "pointer-events-none" : "cursor-move pointer-events-auto"
            }`}
            onPointerDown={(e) => handlePointerDown("move", e)}
          />
          <div
            className={`absolute top-0 bottom-0 right-0 w-2 translate-x-1 ${
              isPanMode ? "pointer-events-none" : "cursor-move pointer-events-auto"
            }`}
            onPointerDown={(e) => handlePointerDown("move", e)}
          />

          {/* If Line/Arrow (Single Selection): Render 2 Vector Endpoint Handles instead of 8 box handles & rotation lever */}
          {!isMulti && isVectorLine(layer) ? (
            <>
              {/* Start Endpoint Pin (P1) */}
              <div
                style={{ left: 0, top: "50%", transform: "translate(-50%, -50%)" }}
                className={`absolute w-3.5 h-3.5 bg-white border-2 border-[#7c3aed] rounded-full shadow-md hover:scale-125 transition-transform z-30 cursor-crosshair ${
                  isPanMode ? "pointer-events-none" : "pointer-events-auto"
                }`}
                onPointerDown={(e) => handlePointerDown("endpoint-start", e)}
                title="Drag to reposition line start (Hold Shift to snap angle)"
              />

              {/* End Endpoint Pin (P2) */}
              <div
                style={{ left: "100%", top: "50%", transform: "translate(-50%, -50%)" }}
                className={`absolute w-3.5 h-3.5 bg-white border-2 border-[#7c3aed] rounded-full shadow-md hover:scale-125 transition-transform z-30 cursor-crosshair ${
                  isPanMode ? "pointer-events-none" : "pointer-events-auto"
                }`}
                onPointerDown={(e) => handlePointerDown("endpoint-end", e)}
                title="Drag to aim and lengthen line (Hold Shift to snap angle)"
              />
            </>
          ) : (
            <>
              {/* Rotation Lever & Handles (Single-Selection Only) */}
              {!isMulti && (
                <>
                  <div
                    style={{ left: "50%", top: "-24px" }}
                    className={`absolute -translate-x-1/2 flex flex-col items-center ${
                      isPanMode ? "pointer-events-none" : "cursor-grab active:cursor-grabbing pointer-events-auto"
                    }`}
                    onPointerDown={(e) => handlePointerDown("rotate", e)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] border-2 border-background shadow" />
                    <div className="w-0.5 h-3.5 bg-[#7c3aed]" />
                  </div>

                  {/* 4 Outer Corner Rotation Hit Areas (Figma Style) */}
                  {[
                    { id: "rot-nw", style: { top: -20, left: -20 } },
                    { id: "rot-ne", style: { top: -20, right: -20 } },
                    { id: "rot-se", style: { bottom: -20, right: -20 } },
                    { id: "rot-sw", style: { bottom: -20, left: -20 } },
                  ].map((rz) => (
                    <div
                      key={rz.id}
                      style={{
                        ...rz.style,
                        width: 20,
                        height: 20,
                        cursor: ROTATE_CURSOR,
                      }}
                      className={`absolute z-10 ${isPanMode ? "pointer-events-none" : "pointer-events-auto"}`}
                      onPointerDown={(e) => handlePointerDown("rotate", e)}
                      title="Click and drag to rotate (Hold Shift for 15° snap)"
                    />
                  ))}
                </>
              )}

              {/* 8 Bounding Box Resize Handles (Single & Multi-Selection) */}
              {[
                { pos: "nw", style: { top: -4, left: -4 } },
                { pos: "n", style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
                { pos: "ne", style: { top: -4, right: -4 } },
                { pos: "e", style: { top: "50%", right: -4, transform: "translateY(-50%)" } },
                { pos: "se", style: { bottom: -4, right: -4 } },
                { pos: "s", style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
                { pos: "sw", style: { bottom: -4, left: -4 } },
                { pos: "w", style: { top: "50%", left: -4, transform: "translateY(-50%)" } },
              ].map((h) => (
                <div
                  key={h.pos}
                  style={{ ...h.style, cursor: getRotatedCursor(h.pos, rotation) }}
                  className={`absolute w-2 h-2 bg-white border border-[#7c3aed] rounded-xs shadow-xs hover:scale-125 transition-transform z-20 ${
                    isPanMode ? "pointer-events-none" : "pointer-events-auto"
                  }`}
                  onPointerDown={(e) => handlePointerDown(h.pos as HandleType, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isMulti && (layer.type === "text" || layer.type === "chunk")) {
                      if (h.pos === "e" || h.pos === "w") {
                        const isAutoWidth = layer.style.textSizing === "auto-width" || layer.style.boxMode === "point";
                        updateLayerStyle(layer.id, {
                          textSizing: isAutoWidth ? "auto-height" : "auto-width",
                          boxMode: isAutoWidth ? "area" : "point",
                        });
                      } else if (h.pos === "s" || h.pos === "n") {
                        const isAutoHeight = layer.style.textSizing === "auto-height";
                        updateLayerStyle(layer.id, {
                          textSizing: isAutoHeight ? "fixed" : "auto-height",
                          boxMode: "area",
                        });
                      } else {
                        const currentMode = layer.style.boxMode ?? "point";
                        const nextMode = currentMode === "point" ? "area" : "point";
                        updateLayerStyle(layer.id, {
                          boxMode: nextMode,
                        });
                      }
                    }
                  }}
                />
              ))}

              {/* Parametric Star Inner Radius Handle */}
              {isStar && (
                <div
                  style={{
                    left: `${starHandleX}px`,
                    top: `${starHandleY}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`absolute w-3 h-3 bg-amber-400 border-2 border-white rounded-full shadow-md hover:scale-125 transition-transform z-30 cursor-pointer ${
                    isPanMode ? "pointer-events-none" : "pointer-events-auto"
                  }`}
                  onPointerDown={(e) => handlePointerDown("star-inner-radius", e)}
                  title={`Inner Radius: ${Math.round(starRatio * 100)}% (Drag to sharpen/soften points)`}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Live Dimension / Rotation HUD */}
      <div
        className={`absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-xs pointer-events-none whitespace-nowrap ${
          isAnimateMode
            ? "bg-primary/20 border border-primary text-primary font-semibold"
            : "bg-card border border-border text-foreground"
        }`}
      >
        {activeHandle === "star-inner-radius"
          ? `Inner Radius: ${Math.round(((layer as any).innerRadiusRatio ?? 0.382) * 100)}%`
          : activeHandle?.startsWith("radius-")
          ? `Radius: ${
              typeof layer.style.borderRadius === "number"
                ? `${layer.style.borderRadius}px`
                : Array.isArray(layer.style.borderRadius)
                ? layer.style.borderRadius.join("px, ") + "px"
                : "0px"
            }`
          : activeHandle === "rotate"
          ? `Rotation: ${rotation}°`
          : isVectorLine(layer)
          ? `Length: ${Math.round(visualW)}px (${rotation}°)`
          : isAnimateMode
          ? `Destination Pose (${Math.round(visualX)}, ${Math.round(visualY)})`
          : isMulti
          ? `${selectedLayers?.length || 0} layers (${Math.round(visualW)} × ${Math.round(visualH)})`
          : `${Math.round(visualW)} × ${Math.round(visualH)}${rotation ? ` (${rotation}°)` : ""}`}
      </div>
    </div>
  );
};
