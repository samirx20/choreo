import React, { useState, useRef, useEffect } from "react";
import { Layer, LayerStyle } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { calculateSnapping, SnapGuide } from "./snapping";

interface TransformBoxProps {
  layer: Layer;
  canvasWidth: number;
  canvasHeight: number;
  siblingBoxes: { x: number; y: number; width: number; height: number }[];
  effectiveScale: number;
  onGuidesChange: (guides: SnapGuide[]) => void;
  bounds?: { x: number; y: number; width: number; height: number } | null;
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
  | "rotate";

export const TransformBox: React.FC<TransformBoxProps> = ({
  layer,
  canvasWidth,
  canvasHeight,
  siblingBoxes,
  effectiveScale,
  onGuidesChange,
  bounds,
}) => {
  const {
    updateLayerStyle,
    startTransaction,
    commitTransaction,
    setEditingLayerId,
    editingLayerId,
  } = useProjectStore();

  const isEditing = editingLayerId === layer.id;
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
  }>({
    clientX: 0,
    clientY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialRotation: 0,
  });

  const visualX = bounds ? bounds.x : layer.style.x || 0;
  const visualY = bounds ? bounds.y : layer.style.y || 0;
  const visualW = bounds
    ? bounds.width
    : typeof layer.style.width === "number"
    ? layer.style.width
    : 200;
  const visualH = bounds
    ? bounds.height
    : typeof layer.style.height === "number"
    ? layer.style.height
    : 100;
  const rotation = layer.style.rotation || 0;

  const handlePointerDown = (handle: HandleType, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveHandle(handle);
    startTransaction();

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: layer.style.x || 0,
      initialY: layer.style.y || 0,
      initialWidth: visualW,
      initialHeight: visualH,
      initialRotation: rotation,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle) return;

    const deltaX = (e.clientX - dragStartRef.current.clientX) / effectiveScale;
    const deltaY = (e.clientY - dragStartRef.current.clientY) / effectiveScale;

    if (activeHandle === "move") {
      let nextX = dragStartRef.current.initialX + deltaX;
      let nextY = dragStartRef.current.initialY + deltaY;

      // Shift constraint: lock to horizontal or vertical
      if (e.shiftKey) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          nextY = dragStartRef.current.initialY;
        } else {
          nextX = dragStartRef.current.initialX;
        }
      }

      // Magnetic Snapping
      const snap = calculateSnapping(
        nextX,
        nextY,
        visualW,
        visualH,
        canvasWidth,
        canvasHeight,
        siblingBoxes
      );

      onGuidesChange(snap.guides);
      updateLayerStyle(layer.id, { x: snap.x, y: snap.y });
    } else if (activeHandle === "rotate") {
      // Rotation logic
      const centerX = visualX + visualW / 2;
      const centerY = visualY + visualH / 2;
      // Angle calculation relative to center
      const currentMouseCanvasX = visualX + visualW / 2 + deltaX;
      const currentMouseCanvasY = visualY - 40 + deltaY;

      const rad = Math.atan2(
        currentMouseCanvasY - centerY,
        currentMouseCanvasX - centerX
      );
      let deg = Math.round((rad * 180) / Math.PI) + 90;

      // Shift constraint: 15-degree increments
      if (e.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      updateLayerStyle(layer.id, { rotation: deg });
    } else {
      // Resize logic
      let newW = dragStartRef.current.initialWidth;
      let newH = dragStartRef.current.initialHeight;
      let newX = dragStartRef.current.initialX;
      let newY = dragStartRef.current.initialY;

      if (activeHandle.includes("e")) newW += deltaX;
      if (activeHandle.includes("s")) newH += deltaY;
      if (activeHandle.includes("w")) {
        newW -= deltaX;
        newX += deltaX;
      }
      if (activeHandle.includes("n")) {
        newH -= deltaY;
        newY += deltaY;
      }

      // Enforce minimum dimensions
      newW = Math.max(newW, 20);
      newH = Math.max(newH, 20);

      // Shift constraint: 1:1 aspect ratio
      if (e.shiftKey) {
        const side = Math.max(newW, newH);
        newW = side;
        newH = side;
      }

      const updates: Partial<LayerStyle> = {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
      };

      // For text layers: only change height if explicitly dragging a vertical handle ('n' or 's').
      // When dragging horizontal handles ('e' or 'w'), height MUST stay "auto" so multi-line text flows naturally!
      if (layer.type === "text" || layer.type === "chunk") {
        if (activeHandle.includes("n") || activeHandle.includes("s")) {
          updates.height = Math.round(newH);
        } else {
          updates.height = "auto";
        }
      } else {
        updates.height = Math.round(newH);
      }

      updateLayerStyle(layer.id, updates);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
      onGuidesChange([]);
      commitTransaction();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${visualX}px`,
        top: `${visualY}px`,
        width: `${visualW}px`,
        height: `${visualH}px`,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
        pointerEvents: "none",
      }}
      className="z-40 ring-1 ring-primary select-none group pointer-events-none"
    >
      {/* Center Drag Body: Clicking and dragging anywhere inside the selection box moves the layer */}
      {!isEditing && (
        <div
          className="absolute inset-0 cursor-move pointer-events-auto"
          onPointerDown={(e) => handlePointerDown("move", e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (layer.type === "text" || layer.type === "chunk") {
              setEditingLayerId(layer.id);
            }
          }}
        />
      )}

      {/* 4 Border Grab Edges (5px thickness with pointer-events: auto so moving is easy by grabbing edge) */}
      <div
        className="absolute top-0 left-0 right-0 h-2 -translate-y-1 cursor-move pointer-events-auto"
        onPointerDown={(e) => handlePointerDown("move", e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-2 translate-y-1 cursor-move pointer-events-auto"
        onPointerDown={(e) => handlePointerDown("move", e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div
        className="absolute top-0 bottom-0 left-0 w-2 -translate-x-1 cursor-move pointer-events-auto"
        onPointerDown={(e) => handlePointerDown("move", e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-2 translate-x-1 cursor-move pointer-events-auto"
        onPointerDown={(e) => handlePointerDown("move", e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Rotation Pin & Handle */}
      <div
        style={{ left: "50%", top: "-24px" }}
        className="absolute -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing pointer-events-auto"
        onPointerDown={(e) => handlePointerDown("rotate", e)}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow" />
        <div className="w-0.5 h-3.5 bg-primary" />
      </div>

      {/* 8 Resize Handles */}
      {[
        { pos: "nw", style: { top: -4, left: -4, cursor: "nwse-resize" } },
        { pos: "n", style: { top: -4, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" } },
        { pos: "ne", style: { top: -4, right: -4, cursor: "nesw-resize" } },
        { pos: "e", style: { top: "50%", right: -4, transform: "translateY(-50%)", cursor: "ew-resize" } },
        { pos: "se", style: { bottom: -4, right: -4, cursor: "nwse-resize" } },
        { pos: "s", style: { bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" } },
        { pos: "sw", style: { bottom: -4, left: -4, cursor: "nesw-resize" } },
        { pos: "w", style: { top: "50%", left: -4, transform: "translateY(-50%)", cursor: "ew-resize" } },
      ].map((h) => (
        <div
          key={h.pos}
          style={h.style}
          className="absolute w-2.5 h-2.5 bg-background border border-primary rounded-xs shadow-xs hover:scale-125 transition-transform pointer-events-auto"
          onPointerDown={(e) => handlePointerDown(h.pos as HandleType, e)}
        />
      ))}

      {/* Live Dimension Badge */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground shadow-xs pointer-events-none whitespace-nowrap">
        {Math.round(visualW)} × {Math.round(visualH)}
        {rotation ? ` (${rotation}°)` : ""}
      </div>
    </div>
  );
};
