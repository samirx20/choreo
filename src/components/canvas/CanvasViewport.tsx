import React, { useRef, useState, useEffect } from "react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { ScreenRenderer } from "./renderers/ScreenRenderer";
import { FloatingToolbar } from "./FloatingToolbar";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { TransformBox } from "./TransformBox";
import { SnapGuide } from "./snapping";

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
  const dragStartRef = useRef({ x: 0, y: 0 });

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // Selected root layer for transform bounding box
  const selectedRootLayer = activeScreen.layers.find(
    (l) => l.id === selectedLayerIds[0]
  );

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
      if (e.code === "Space" && !spacePressed) {
        // Only if not focused on an input/textarea
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          setSpacePressed(true);
        }
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
  }, [spacePressed]);

  // Handle zoom with Ctrl + Wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoom(Math.min(Math.max(zoom + delta, 0.2), 3));
    }
  };

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
  // e.g. if 1920x1080, scale down to fit container with margin
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

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`flex-1 relative bg-zinc-950 overflow-hidden flex items-center justify-center select-none ${
        spacePressed ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Canvas Canvas Resolution Badge */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800 text-[11px] text-zinc-400 font-mono">
        <span>{doc.settings.width} × {doc.settings.height}</span>
        <span className="text-zinc-600">•</span>
        <span>16:9</span>
        <span className="text-zinc-600">•</span>
        <span className="text-violet-400 font-semibold">{doc.settings.fps} FPS</span>
      </div>

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

        {/* Magnetic Snap Guides (Magenta Alignment Lines) */}
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
          />
        )}
      </div>

      {/* Floating Toolbar (Design Mode only) */}
      {uiMode === "design" && (
        <FloatingToolbar onOpenComponentsDrawer={onOpenComponentsDrawer} />
      )}
    </main>
  );
};
