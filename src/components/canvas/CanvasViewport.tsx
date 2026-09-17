import React, { useRef, useState, useEffect } from "react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { ScreenRenderer } from "./renderers/ScreenRenderer";
import { FloatingToolbar } from "./FloatingToolbar";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { TransformBox } from "./TransformBox";
import { SnapGuide } from "./snapping";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { ContextualFloatingBar } from "./ContextualFloatingBar";
import { Plus, Minus, Maximize } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CanvasViewportProps {
  onOpenComponentsDrawer: () => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  onOpenComponentsDrawer,
}) => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    selectLayer,
    deselectAll,
    uiMode,
    currentTime,
    zoom,
    setZoom,
    isPlaying,
    setCurrentTime,
  } = useProjectStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layerId: string | null;
  } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // Selected root layer for transform bounding box and contextual floating bar
  const selectedRootLayer =
    activeScreen.layers.find((l) => l.id === selectedLayerIds[0]) ||
    findLayerInTree(activeScreen.layers, selectedLayerIds[0]);

  const siblingBoxes = activeScreen.layers
    .filter((l) => l.id !== selectedLayerIds[0])
    .map((l) => ({
      x: l.style.x || 0,
      y: l.style.y || 0,
      width: typeof l.style.width === "number" ? l.style.width : 200,
      height: typeof l.style.height === "number" ? l.style.height : 100,
    }));

  // Global spacebar listener for canvas panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !spacePressed &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        setSpacePressed(true);
      } else if (e.shiftKey && e.key === "!") {
        // Shift + 1: Zoom to Fit
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [spacePressed, setZoom]);

  // Native non-passive wheel listener for smooth cursor-centered zoom and panning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        const currentZoom = useProjectStore.getState().zoom;
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        const nextZoom = Math.min(Math.max(currentZoom * factor, 0.2), 4.0);

        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (nextZoom / currentZoom),
          y: mouseY - (mouseY - prevPan.y) * (nextZoom / currentZoom),
        }));
        setZoom(nextZoom);
      } else {
        // Smooth 2D panning via trackpad scroll or mouse wheel
        e.preventDefault();
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener("wheel", onWheelNative, { passive: false });
    return () => container.removeEventListener("wheel", onWheelNative);
  }, [setZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (spacePressed || e.button === 1) {
      // Pan mode
      e.preventDefault();
      setIsPanning(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Compute animated styles at timestamp t
  // In Design mode, evaluate at resting state (end of duration) so static composition is fully visible
  const evalTime = uiMode === "design" ? activeScreen.duration : currentTime;
  const computedLayerStyles = evaluateSceneAtTime(
    activeScreen.layers,
    evalTime
  );

  // Playback loop via requestAnimationFrame when isPlaying is true
  useEffect(() => {
    if (!isPlaying) return;

    let animFrame: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const current = useProjectStore.getState().currentTime;
      const screenDuration = activeScreen.duration;
      let nextTime = current + deltaSec;

      if (nextTime > screenDuration) {
        nextTime = 0; // Loop back to beginning
      }

      setCurrentTime(nextTime);
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, activeScreen.duration, setCurrentTime]);

  // Fit scale calculation relative to viewport window
  const [viewportScale, setViewportScale] = useState(0.65);

  useEffect(() => {
    const updateAutoFit = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const margin = 80;
      const scaleX = (clientWidth - margin) / doc.settings.width;
      const scaleY = (clientHeight - margin) / doc.settings.height;
      const fit = Math.min(scaleX, scaleY, 1);
      setViewportScale(fit);
    };

    updateAutoFit();
    window.addEventListener("resize", updateAutoFit);
    return () => window.removeEventListener("resize", updateAutoFit);
  }, [doc.settings.width, doc.settings.height]);

  const effectiveScale = viewportScale * zoom;

  // Track visual DOM bounding box of active layer (handles root absolute layers and nested flex chunks)
  const [selectedBounds, setSelectedBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedLayerIds[0]) {
      setSelectedBounds(null);
      return;
    }

    const measure = () => {
      const el = document.getElementById(`layer-${selectedLayerIds[0]}`);
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (el && screenEl) {
        const elRect = el.getBoundingClientRect();
        const screenRect = screenEl.getBoundingClientRect();
        setSelectedBounds({
          x: (elRect.left - screenRect.left) / effectiveScale,
          y: (elRect.top - screenRect.top) / effectiveScale,
          width: elRect.width / effectiveScale,
          height: elRect.height / effectiveScale,
        });
      }
    };

    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [selectedLayerIds, activeScreen.id, effectiveScale, doc]);

  // Calculate position for ContextualFloatingBar
  const barLayerX = selectedBounds
    ? selectedBounds.x
    : selectedRootLayer
    ? selectedRootLayer.style.x || 0
    : 0;
  const barLayerY = selectedBounds
    ? selectedBounds.y
    : selectedRootLayer
    ? selectedRootLayer.style.y || 0
    : 0;
  const barLayerW = selectedBounds
    ? selectedBounds.width
    : selectedRootLayer
    ? typeof selectedRootLayer.style.width === "number"
      ? selectedRootLayer.style.width
      : 200
    : 200;

  const barX = barLayerX + barLayerW / 2;
  const barY = Math.max(barLayerY - 14 / effectiveScale, 10);

  return (
    <main
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        if (selectedLayerIds.length > 0) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            layerId: selectedLayerIds[0],
          });
        }
      }}
      className={`flex-1 relative bg-zinc-950 overflow-hidden flex items-center justify-center select-none ${
        spacePressed
          ? isPanning
            ? "cursor-grabbing"
            : "cursor-grab"
          : "cursor-default"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Canvas Frame */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.05s ease-out",
        }}
        className="relative"
      >
        <ScreenRenderer
          screen={activeScreen}
          settings={doc.settings}
          selectedLayerIds={selectedLayerIds}
          computedLayerStyles={computedLayerStyles}
          onSelectLayer={(layerId, e) => {
            selectLayer(layerId, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
          onCanvasClick={() => {
            deselectAll();
          }}
        />

        {/* Magnetic Snap Guides */}
        {guides.map((guide, idx) => (
          <div
            key={idx}
            style={
              guide.type === "vertical"
                ? { left: `${guide.position}px`, top: 0, bottom: 0, width: "1px" }
                : { top: `${guide.position}px`, left: 0, right: 0, height: "1px" }
            }
            className="absolute bg-fuchsia-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(217,70,239,0.9)]"
          >
            {guide.label && (
              <span className="absolute top-2 left-2 bg-fuchsia-600 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                {guide.label}
              </span>
            )}
          </div>
        ))}

        {/* Interactive Transform Bounding Box (Design Mode Only) */}
        {uiMode === "design" && selectedRootLayer && (
          <TransformBox
            layer={selectedRootLayer}
            canvasWidth={doc.settings.width}
            canvasHeight={doc.settings.height}
            siblingBoxes={siblingBoxes}
            effectiveScale={effectiveScale}
            onGuidesChange={setGuides}
            bounds={selectedBounds}
          />
        )}

        {/* Contextual Floating Action Bar (HUD) docked 10px above layer */}
        {uiMode === "design" && selectedRootLayer && (
          <div
            style={{
              position: "absolute",
              left: `${barX}px`,
              top: `${barY}px`,
              transform: `translate(-50%, -100%) scale(${Math.max(
                1 / effectiveScale,
                0.75
              )})`,
              transformOrigin: "bottom center",
            }}
            className="z-50 pointer-events-auto"
          >
            <ContextualFloatingBar
              layer={selectedRootLayer}
              computedStyle={
                (computedLayerStyles[selectedRootLayer.id] as any) ||
                selectedRootLayer.style
              }
              canvasScale={effectiveScale}
            />
          </div>
        )}
      </div>

      {/* Floating Toolbar (Design Mode only) */}
      {uiMode === "design" && (
        <FloatingToolbar onOpenComponentsDrawer={onOpenComponentsDrawer} />
      )}

      {/* Floating Canvas Navigation & Zoom Widget (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-1 bg-[#111111]/95 backdrop-blur-md px-2 py-1 rounded-full border border-[#222222] shadow-2xl text-xs text-[#eee8d5]">
        <button
          onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))}
          title="Zoom Out"
          className="p-1 hover:bg-[#222222] rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:text-white transition-colors">
              {Math.round(zoom * 100)}%
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#171717] border-[#262626] text-xs">
            {[50, 75, 100, 150, 200, 300].map((pct) => (
              <DropdownMenuItem
                key={pct}
                onClick={() => setZoom(pct / 100)}
                className="text-zinc-200 hover:text-white"
              >
                {pct}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setZoom(Math.min(zoom + 0.1, 4.0))}
          title="Zoom In"
          className="p-1 hover:bg-[#222222] rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
        <div className="w-[1px] h-3.5 bg-[#222222] mx-0.5" />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          title="Fit to Screen (Shift+1)"
          className="px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          Fit
        </button>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          layerId={contextMenu.layerId}
          onClose={() => setContextMenu(null)}
          onOpenComponentsDrawer={onOpenComponentsDrawer}
        />
      )}
    </main>
  );
};
