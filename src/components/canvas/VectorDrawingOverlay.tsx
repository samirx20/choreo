import React, { useState, useRef, useEffect, useCallback } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import {
  VectorPoint,
  PenVertex,
  smoothPointsToPath,
  penVerticesToPath,
} from "@/engine/vector/vectorCurveFitting";
import { computePathBounds } from "@/engine/svg/svgPathBounds";
import { ShapeLayer } from "@/types/scene";

interface VectorDrawingOverlayProps {
  screenId: string;
  screenWidth: number;
  screenHeight: number;
  domScale: number;
}

export const VectorDrawingOverlay: React.FC<VectorDrawingOverlayProps> = ({
  screenId,
  screenWidth,
  screenHeight,
  domScale,
}) => {
  const { activeTool, setTool, addLayer } = useProjectStore();

  // Pencil state
  const [isPencilDrawing, setIsPencilDrawing] = useState(false);
  const [pencilPoints, setPencilPoints] = useState<VectorPoint[]>([]);

  // Pen state
  const [penVertices, setPenVertices] = useState<PenVertex[]>([]);
  const [cursorPos, setCursorPos] = useState<VectorPoint | null>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

  const overlayRef = useRef<SVGSVGElement>(null);

  const getCanvasCoords = useCallback(
    (e: React.PointerEvent | PointerEvent): VectorPoint => {
      const screenEl = document.getElementById(`screen-${screenId}`);
      if (!screenEl) return { x: 0, y: 0 };
      const rect = screenEl.getBoundingClientRect();
      const currentScale = rect.width > 0 ? rect.width / screenWidth : domScale;
      return {
        x: (e.clientX - rect.left) / currentScale,
        y: (e.clientY - rect.top) / currentScale,
      };
    },
    [screenId, screenWidth, domScale]
  );

  // Finish Pen Drawing and create layer
  const finishPenDrawing = useCallback(
    (closed = false) => {
      if (penVertices.length >= 2) {
        const d = penVerticesToPath(penVertices, closed);
        const bounds = computePathBounds(d);

        const newLayer: ShapeLayer = {
          id: `pen_${Date.now()}`,
          name: closed ? "Pen Shape" : "Pen Path",
          type: "shape",
          shapeType: "path",
          d,
          viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
          strokeCap: "round",
          strokeJoin: "round",
          style: {
            x: Math.round(bounds.minX),
            y: Math.round(bounds.minY),
            width: Math.max(1, Math.round(bounds.width)),
            height: Math.max(1, Math.round(bounds.height)),
            rotation: 0,
            opacity: 1,
            borderColor: "#3b82f6",
            borderWidth: 2,
            backgroundColor: closed ? "#3b82f620" : "transparent",
          },
        };

        addLayer(newLayer);
      }
      setPenVertices([]);
      setCursorPos(null);
      setTool("select");
    },
    [penVertices, addLayer, setTool]
  );

  // Keyboard navigation for Pen tool (Enter to finish, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool === "pen") {
        if (e.key === "Enter") {
          e.preventDefault();
          finishPenDrawing(false);
        } else if (e.key === "Escape") {
          e.preventDefault();
          if (penVertices.length > 0) {
            setPenVertices([]);
            setCursorPos(null);
          } else {
            setTool("select");
          }
        }
      } else if (activeTool === "pencil") {
        if (e.key === "Escape") {
          e.preventDefault();
          setTool("select");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, penVertices, finishPenDrawing, setTool]);

  // Pointer event handlers for Pencil
  const handlePencilDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const pt = getCanvasCoords(e);
    setIsPencilDrawing(true);
    setPencilPoints([pt]);
  };

  const handlePencilMove = (e: React.PointerEvent) => {
    if (!isPencilDrawing) return;
    const pt = getCanvasCoords(e);
    setPencilPoints((prev) => [...prev, pt]);
  };

  const handlePencilUp = (e: React.PointerEvent) => {
    if (!isPencilDrawing) return;
    setIsPencilDrawing(false);

    if (pencilPoints.length >= 2) {
      const d = smoothPointsToPath(pencilPoints);
      const bounds = computePathBounds(d);

      const newLayer: ShapeLayer = {
        id: `pencil_${Date.now()}`,
        name: "Pencil Drawing",
        type: "shape",
        shapeType: "path",
        d,
        viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
        strokeCap: "round",
        strokeJoin: "round",
        style: {
          x: Math.round(bounds.minX),
          y: Math.round(bounds.minY),
          width: Math.max(1, Math.round(bounds.width)),
          height: Math.max(1, Math.round(bounds.height)),
          rotation: 0,
          opacity: 1,
          borderColor: "#3b82f6",
          borderWidth: 3,
          backgroundColor: "transparent",
        },
      };

      addLayer(newLayer);
    }

    setPencilPoints([]);
  };

  // Pointer event handlers for Pen
  const handlePenDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = getCanvasCoords(e);

    // Check if clicking near first vertex to close path
    if (penVertices.length >= 2) {
      const first = penVertices[0];
      const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
      if (dist <= 12) {
        finishPenDrawing(true);
        return;
      }
    }

    setIsDraggingHandle(true);
    setPenVertices((prev) => [...prev, { x: pt.x, y: pt.y }]);
  };

  const handlePenMove = (e: React.PointerEvent) => {
    const pt = getCanvasCoords(e);
    setCursorPos(pt);

    if (isDraggingHandle && penVertices.length > 0) {
      // Pulling out handle on the last vertex
      const last = penVertices[penVertices.length - 1];
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;

      setPenVertices((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...last,
          cpOut: { x: last.x + dx, y: last.y + dy },
          cpIn: { x: last.x - dx, y: last.y - dy },
        };
        return next;
      });
    }
  };

  const handlePenUp = () => {
    setIsDraggingHandle(false);
  };

  if (activeTool !== "pen" && activeTool !== "pencil") {
    return null;
  }

  // Previews
  const pencilD = isPencilDrawing ? smoothPointsToPath(pencilPoints) : "";
  const penD = penVertices.length > 0 ? penVerticesToPath(penVertices, false) : "";
  const lastPenVertex = penVertices.length > 0 ? penVertices[penVertices.length - 1] : null;

  return (
    <svg
      ref={overlayRef}
      className="absolute inset-0 w-full h-full pointer-events-auto z-40 select-none overflow-visible cursor-crosshair"
      viewBox={`0 0 ${screenWidth} ${screenHeight}`}
      onPointerDown={activeTool === "pencil" ? handlePencilDown : handlePenDown}
      onPointerMove={activeTool === "pencil" ? handlePencilMove : handlePenMove}
      onPointerUp={activeTool === "pencil" ? handlePencilUp : handlePenUp}
      onDoubleClick={() => finishPenDrawing(false)}
    >
      {/* Pencil In-flight Preview */}
      {activeTool === "pencil" && pencilD && (
        <path
          d={pencilD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Pen In-flight Path */}
      {activeTool === "pen" && penD && (
        <path
          d={penD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Pen Rubberband Guide Line from Last Vertex to Cursor */}
      {activeTool === "pen" && lastPenVertex && cursorPos && !isDraggingHandle && (
        <line
          x1={lastPenVertex.x}
          y1={lastPenVertex.y}
          x2={cursorPos.x}
          y2={cursorPos.y}
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          className="opacity-75"
        />
      )}

      {/* Pen Vertices & Handle Arms */}
      {activeTool === "pen" &&
        penVertices.map((v, idx) => (
          <g key={idx}>
            {/* Control handles if bezier curve */}
            {v.cpOut && (
              <>
                <line
                  x1={v.x}
                  y1={v.y}
                  x2={v.cpOut.x}
                  y2={v.cpOut.y}
                  stroke="#8b5cf6"
                  strokeWidth={1}
                />
                <circle cx={v.cpOut.x} cy={v.cpOut.y} r={3} fill="#8b5cf6" />
              </>
            )}
            {v.cpIn && (
              <>
                <line
                  x1={v.x}
                  y1={v.y}
                  x2={v.cpIn.x}
                  y2={v.cpIn.y}
                  stroke="#8b5cf6"
                  strokeWidth={1}
                />
                <circle cx={v.cpIn.x} cy={v.cpIn.y} r={3} fill="#8b5cf6" />
              </>
            )}
            {/* Vertex anchor point */}
            <circle
              cx={v.x}
              cy={v.y}
              r={idx === 0 ? 5 : 4}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={idx === 0 ? 2 : 1.5}
            />
          </g>
        ))}
    </svg>
  );
};
