import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useProjectStore, findLayerInTree, findParentGroupInTree, findTopmostParentGroupInTree, CanvasTool } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";
import { THEME_TOKENS } from "@/theme/tokens";
import { ScreenRenderer } from "./renderers/ScreenRenderer";
import { FloatingToolbar } from "./FloatingToolbar";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { TransformBox } from "./TransformBox";
import { SnapGuide } from "./snapping";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { DistanceOverlay } from "./DistanceOverlay";
import { BindingConnectionOverlay } from "./BindingConnectionOverlay";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import {
  buildCanvasElementMenu,
  buildCanvasPasteboardMenu,
} from "@/components/contextmenu/contextMenuBuilders";
import { Plus, Minus, Maximize } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getLayerBounds(
  layer: Layer,
  screenRect: DOMRect,
  domScale: number
): { x: number; y: number; width: number; height: number } {
  const el = document.getElementById(`layer-${layer.id}`);
  if (el) {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - screenRect.left) / domScale,
      y: (r.top - screenRect.top) / domScale,
      width: r.width / domScale,
      height: r.height / domScale,
    };
  }
  return {
    x: layer.style.x || 0,
    y: layer.style.y || 0,
    width: typeof layer.style.width === "number" ? layer.style.width : 200,
    height: typeof layer.style.height === "number" ? layer.style.height : 100,
  };
}

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
    editingLayerId,
    setEditingLayerId,
    activeTool,
    setTool,
    addLayer,
    uiMode,
    currentTime,
    zoom,
    setZoom,
    isPlaying,
    setCurrentTime,
    groupSelection,
    ungroup,
    removeLayer,
    duplicateLayer,
    startTransaction,
    commitTransaction,
    alignSelectedLayers,
    distributeSpacing,
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

  // Selected layers
  const selectedLayers = selectedLayerIds
    .map((id) => findLayerInTree(activeScreen.layers, id))
    .filter((l): l is Layer => l !== null);

  const selectedRootLayer = selectedLayers[0] || null;

  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isShift: boolean;
  } | null>(null);

  const marqueeRef = useRef(marquee);
  const justMarquedRef = useRef(false);
  useEffect(() => {
    marqueeRef.current = marquee;
  }, [marquee]);

  const [altPressed, setAltPressed] = useState(false);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  // Fit scale calculation relative to viewport window
  const [viewportScale, setViewportScale] = useState(0.45);

  const updateAutoFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    const margin = 64;
    const scaleX = (clientWidth - margin) / doc.settings.width;
    const scaleY = (clientHeight - margin) / doc.settings.height;
    const fit = Math.min(scaleX, scaleY, 1);
    setViewportScale(Math.max(0.1, Math.round(fit * 1000) / 1000));
  }, [doc.settings.width, doc.settings.height]);

  useLayoutEffect(() => {
    updateAutoFit();
  }, [updateAutoFit, uiMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateAutoFit();
    });
    observer.observe(containerRef.current);
    updateAutoFit();

    window.addEventListener("resize", updateAutoFit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateAutoFit);
    };
  }, [updateAutoFit, uiMode]);

  const effectiveScale = viewportScale * zoom;

  const siblingBoxes = activeScreen.layers
    .filter((l) => !selectedLayerIds.includes(l.id))
    .map((l) => ({
      x: l.style.x || 0,
      y: l.style.y || 0,
      width: typeof l.style.width === "number" ? l.style.width : 200,
      height: typeof l.style.height === "number" ? l.style.height : 100,
    }));

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.altKey && !isInput) {
        setAltPressed(true);
      }

      if (e.code === "Space" && !spacePressed && !isInput) {
        e.preventDefault();
        setSpacePressed(true);
      } else if (e.shiftKey && (e.key === "!" || e.code === "Digit1") && !isInput) {
        // Shift + 1: Zoom to Fit
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.shiftKey && (e.key === "@" || e.code === "Digit2") && !isInput) {
        // Shift + 2: Zoom to Selection
        if (selectedLayerIds.length > 0 && containerRef.current) {
          const screenEl = document.getElementById(`screen-${activeScreen.id}`);
          if (screenEl) {
            const screenRect = screenEl.getBoundingClientRect();
            const domScale = screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const id of selectedLayerIds) {
              const layer = findLayerInTree(activeScreen.layers, id);
              if (layer) {
                const b = getLayerBounds(layer, screenRect, domScale);
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
              }
            }
            if (minX !== Infinity && maxX > minX && maxY > minY) {
              const selW = maxX - minX;
              const selH = maxY - minY;
              const cW = containerRef.current.clientWidth - 100;
              const cH = containerRef.current.clientHeight - 100;
              const targetScale = Math.min(cW / selW, cH / selH, 4.0);
              const targetZoom = targetScale / (screenRect.width / (doc.settings.width * zoom));
              const selCenterX = minX + selW / 2;
              const selCenterY = minY + selH / 2;
              setZoom(targetZoom);
              setPan({
                x: -(selCenterX - doc.settings.width / 2) * targetScale,
                y: -(selCenterY - doc.settings.height / 2) * targetScale,
              });
            }
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0" && !isInput) {
        // Ctrl + 0: Zoom 100%
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "g" || e.key === "G") && !isInput) {
        // Ctrl + G: Group
        e.preventDefault();
        groupSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "g" || e.key === "G") && !isInput) {
        // Ctrl + Shift + G: Ungroup
        e.preventDefault();
        if (selectedLayerIds[0]) {
          ungroup(selectedLayerIds[0]);
        }
      } else if (e.shiftKey && e.key === "Enter" && !isInput) {
        // Shift + Enter: Ascend hierarchy to parent group
        if (selectedLayerIds[0]) {
          const parent = findParentGroupInTree(activeScreen.layers, selectedLayerIds[0]);
          if (parent) {
            e.preventDefault();
            selectLayer(parent.id, false);
          }
        }
      } else if (e.key === "Enter" && !isInput && !editingLayerId) {
        if (selectedLayerIds[0]) {
          const layer = findLayerInTree(activeScreen.layers, selectedLayerIds[0]);
          if (layer) {
            if (layer.type === "text" || layer.type === "chunk") {
              // Two-step lifecycle: selecting text layer and pressing Enter mounts inline textarea
              e.preventDefault();
              setEditingLayerId(layer.id);
            } else if (layer.type === "group" && layer.children.length > 0) {
              e.preventDefault();
              selectLayer(layer.children[0].id, false);
            }
          }
        }
      } else if (e.key === "Escape") {
        if (editingLayerId) {
          setEditingLayerId(null);
        } else if (selectedLayerIds.length > 0) {
          // Bubbles selection back up to parent card or deselects when at top level
          const parent = findParentGroupInTree(activeScreen.layers, selectedLayerIds[0]);
          if (parent) {
            selectLayer(parent.id, false);
          } else {
            deselectAll();
          }
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          startTransaction();
          selectedLayerIds.forEach((id) => removeLayer(id));
          commitTransaction();
          deselectAll();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D") && !isInput) {
        // Ctrl + D: Duplicate
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          startTransaction();
          selectedLayerIds.forEach((id) => duplicateLayer(id));
          commitTransaction();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A") && !isInput) {
        // Ctrl + A: Select All Root Layers
        e.preventDefault();
        const allIds = activeScreen.layers.map((l) => l.id);
        useProjectStore.setState({ selectedLayerIds: allIds });
      } else if (e.altKey && !isInput && selectedLayerIds.length > 0) {
        // Alt-based Figma Alignment & Distribution hotkeys
        const rel = selectedLayerIds.length === 1 ? "canvas" : "selection";
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          alignSelectedLayers("left", rel);
        } else if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          alignSelectedLayers("right", rel);
        } else if (e.key === "w" || e.key === "W") {
          e.preventDefault();
          alignSelectedLayers("top", rel);
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          alignSelectedLayers("bottom", rel);
        } else if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          if (e.shiftKey) {
            distributeSpacing("horizontal");
          } else {
            alignSelectedLayers("center", rel);
          }
        } else if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          if (e.shiftKey) {
            distributeSpacing("vertical");
          } else {
            alignSelectedLayers("middle", rel);
          }
        }
      } else if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Creative Tool Hotkeys
        if (e.key === "v" || e.key === "V") {
          setTool("select");
        } else if (e.key === "h" || e.key === "H") {
          setTool("hand");
        } else if (e.key === "t" || e.key === "T") {
          setTool("text");
        } else if (e.key === "r" || e.key === "R") {
          setTool("rectangle");
        } else if (e.key === "o" || e.key === "O") {
          setTool("circle");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) {
        setAltPressed(false);
        setHoveredLayerId(null);
      }
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
  }, [
    spacePressed,
    setZoom,
    groupSelection,
    ungroup,
    selectedLayerIds,
    activeScreen.layers,
    editingLayerId,
    setEditingLayerId,
    deselectAll,
    selectLayer,
    removeLayer,
    duplicateLayer,
    startTransaction,
    commitTransaction,
  ]);

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

  // Window pan listener so fast movement or leaving canvas boundary never drops pan
  useEffect(() => {
    if (!isPanning) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const onWindowMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [isPanning]);

  // Window marquee listener so fast movement or leaving canvas boundary never drops marquee selection
  useEffect(() => {
    if (!marquee) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (!screenEl) return;
      const screenRect = screenEl.getBoundingClientRect();
      const domScale =
        screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;

      const canvasX = (e.clientX - screenRect.left) / domScale;
      const canvasY = (e.clientY - screenRect.top) / domScale;

      if (marqueeRef.current) {
        marqueeRef.current = {
          ...marqueeRef.current,
          currentX: canvasX,
          currentY: canvasY,
        };
      }
      setMarquee((prev) =>
        prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null
      );
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      const m = marqueeRef.current;
      if (!m) {
        setMarquee(null);
        return;
      }
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (!screenEl) {
        marqueeRef.current = null;
        setMarquee(null);
        return;
      }
      const screenRect = screenEl.getBoundingClientRect();
      const domScale =
        screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;

      const currentX = (e.clientX - screenRect.left) / domScale;
      const currentY = (e.clientY - screenRect.top) / domScale;

      const boxX = Math.min(m.startX, currentX);
      const boxY = Math.min(m.startY, currentY);
      const boxW = Math.abs(currentX - m.startX);
      const boxH = Math.abs(currentY - m.startY);

      if (boxW > 4 || boxH > 4) {
        justMarquedRef.current = true;
        setTimeout(() => {
          justMarquedRef.current = false;
        }, 200);

        const intersectedIds: string[] = [];
        const isDeep = e.ctrlKey || e.metaKey;

        const checkLayer = (layer: Layer) => {
          const b = getLayerBounds(layer, screenRect, domScale);
          const intersects =
            b.x < boxX + boxW &&
            b.x + b.width > boxX &&
            b.y < boxY + boxH &&
            b.y + b.height > boxY;

          if (layer.type === "group") {
            if (isDeep) {
              for (const child of layer.children) {
                checkLayer(child);
              }
            } else {
              if (intersects) {
                intersectedIds.push(layer.id);
              } else {
                const anyChild = layer.children.some((c) => {
                  const cb = getLayerBounds(c, screenRect, domScale);
                  return (
                    cb.x < boxX + boxW &&
                    cb.x + cb.width > boxX &&
                    cb.y < boxY + boxH &&
                    cb.y + cb.height > boxY
                  );
                });
                if (anyChild) intersectedIds.push(layer.id);
              }
            }
          } else {
            if (intersects) {
              intersectedIds.push(layer.id);
            }
          }
        };

        for (const layer of activeScreen.layers) {
          checkLayer(layer);
        }

        if (intersectedIds.length > 0) {
          if (m.isShift) {
            const current = useProjectStore.getState().selectedLayerIds;
            const combined = Array.from(new Set([...current, ...intersectedIds]));
            useProjectStore.setState({ selectedLayerIds: combined });
          } else {
            useProjectStore.setState({ selectedLayerIds: intersectedIds });
          }
        } else if (!m.isShift) {
          deselectAll();
        }
      }

      marqueeRef.current = null;
      setMarquee(null);
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [marquee !== null, activeScreen.id, doc.settings.width, effectiveScale, deselectAll]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (spacePressed || e.button === 1 || (activeTool === "hand" && uiMode === "design")) {
      // Pan mode
      e.preventDefault();
      setIsPanning(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button === 0) {
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (!screenEl) return;
      const screenRect = screenEl.getBoundingClientRect();
      const domScale =
        screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;

      const canvasX = (e.clientX - screenRect.left) / domScale;
      const canvasY = (e.clientY - screenRect.top) / domScale;

      // 1. Text Tool click-to-place
      if (activeTool === "text") {
        const newId = `text_${Date.now()}`;
        const newLayer: Layer = {
          id: newId,
          name: "Text Layer",
          type: "text",
          content: "Add text",
          style: {
            x: Math.round(canvasX),
            y: Math.round(canvasY),
            width: 400,
            height: 80,
            boxMode: "point",
            scaleX: 1,
            scaleY: 1,
            pivotX: 0.5,
            pivotY: 0.5,
            rotation: 0,
            opacity: 1,
            fontSize: 54,
            fontWeight: 800,
            fontFamily: "Inter",
            color: THEME_TOKENS.typography.headingColor,
            textAlign: "left",
          },
          animation: {
            in: {
              preset: "pop",
              start: 0,
              duration: 0.6,
              easing: "bouncy",
            },
          },
        };
        addLayer(newLayer);
        setEditingLayerId(newId);
        setTool("select");
        return;
      }

      // 2. Shape Tools click-to-place
      if (["rectangle", "circle", "star", "triangle"].includes(activeTool)) {
        const shapeType = activeTool as "rectangle" | "circle" | "star" | "triangle";
        const newId = `shape_${Date.now()}`;
        const newLayer: Layer = {
          id: newId,
          name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
          type: "shape",
          shapeType,
          style: {
            x: Math.round(canvasX - 100),
            y: Math.round(canvasY - 100),
            width: 200,
            height: 200,
            scaleX: 1,
            scaleY: 1,
            pivotX: 0.5,
            pivotY: 0.5,
            rotation: 0,
            opacity: 1,
            backgroundColor:
              shapeType === "circle"
                ? THEME_TOKENS.accent.highlight
                : THEME_TOKENS.accent.primary,
            borderRadius: shapeType === "circle" ? 9999 : 16,
          },
          animation: {
            in: {
              preset: "pop",
              start: 0,
              duration: 0.6,
              easing: "bouncy",
            },
          },
        };
        addLayer(newLayer);
        setTool("select");
        return;
      }

      // Default: Marquee Selection
      e.preventDefault();
      const startMarquee = {
        startX: canvasX,
        startY: canvasY,
        currentX: canvasX,
        currentY: canvasY,
        isShift: e.shiftKey,
      };
      marqueeRef.current = startMarquee;
      setMarquee(startMarquee);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
    if (altPressed) {
      const el = (e.target as HTMLElement).closest("[id^='layer-']");
      if (el) {
        const id = el.id.replace("layer-", "");
        if (id !== hoveredLayerId) setHoveredLayerId(id);
      } else if (hoveredLayerId) {
        setHoveredLayerId(null);
      }
    } else if (hoveredLayerId) {
      setHoveredLayerId(null);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleSelectLayer = (layerId: string, e: React.MouseEvent) => {
    if (justMarquedRef.current) {
      return;
    }
    if (activeTool !== "select" && activeTool !== "hand") {
      handleMouseDown(e);
      return;
    }

    const isMulti = e.shiftKey;
    const isDeep = e.ctrlKey || e.metaKey;

    if (isDeep) {
      // Direct deep selection: bypass parent container
      selectLayer(layerId, isMulti);
      return;
    }

    // Check if clicked element is inside a group hierarchy
    const topmostGroup = findTopmostParentGroupInTree(activeScreen.layers, layerId);
    const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);

    if (topmostGroup) {
      // Check if we are already inside this group hierarchy (either topmost group, parent, or sibling is selected)
      const isTopmostSelected = selectedLayerIds.includes(topmostGroup.id);
      const isParentSelected = parentGroup ? selectedLayerIds.includes(parentGroup.id) : false;
      const isSiblingSelected = parentGroup
        ? selectedLayerIds.some((id) =>
            parentGroup.children.some((child) => child.id === id)
          )
        : false;

      if (!isTopmostSelected && !isParentSelected && !isSiblingSelected) {
        // Initial click from outside: select the topmost parent container!
        selectLayer(topmostGroup.id, isMulti);
        return;
      }
      // If already drilled in: directly select this child/sibling!
      selectLayer(layerId, isMulti);
      return;
    }

    // Root layer clicked
    selectLayer(layerId, isMulti);
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
      const workArea = useProjectStore.getState().workArea;
      const loopStart = workArea ? workArea.start : 0;
      const loopEnd = workArea ? workArea.end : screenDuration;

      let nextTime = current + deltaSec;

      if (nextTime >= loopEnd) {
        nextTime = loopStart; // Loop back to work area start
      } else if (nextTime < loopStart) {
        nextTime = loopStart;
      }

      setCurrentTime(nextTime);
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, activeScreen.duration, setCurrentTime]);

  // Track visual DOM bounding box of active layer (handles single layer or multi-selection union)
  const [selectedBounds, setSelectedBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (selectedLayerIds.length === 0) {
      setSelectedBounds(null);
      return;
    }

    const measure = () => {
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (!screenEl) return;
      const screenRect = screenEl.getBoundingClientRect();
      const domScale =
        screenRect.width > 0
          ? screenRect.width / doc.settings.width
          : effectiveScale;

      // Multi-layer selection bounding box (AABB enclosing all selected layers)
      if (selectedLayerIds.length > 1) {
        let minLeft = Infinity;
        let minTop = Infinity;
        let maxRight = -Infinity;
        let maxBottom = -Infinity;
        let foundAny = false;

        for (const id of selectedLayerIds) {
          const el = document.getElementById(`layer-${id}`);
          if (el) {
            foundAny = true;
            const r = el.getBoundingClientRect();
            if (r.left < minLeft) minLeft = r.left;
            if (r.top < minTop) minTop = r.top;
            if (r.right > maxRight) maxRight = r.right;
            if (r.bottom > maxBottom) maxBottom = r.bottom;
          }
        }

        if (foundAny) {
          setSelectedBounds({
            x: (minLeft - screenRect.left) / domScale,
            y: (minTop - screenRect.top) / domScale,
            width: (maxRight - minLeft) / domScale,
            height: (maxBottom - minTop) / domScale,
          });
        } else {
          setSelectedBounds(null);
        }
      } else {
        // Single selection is managed directly by TransformBox using canonical layer coordinates
        setSelectedBounds(null);
      }
    };

    measure();
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [selectedLayerIds, activeScreen.id, effectiveScale, doc]);

  const getCanvasCursor = () => {
    if (spacePressed || isPanning) return isPanning ? "cursor-grabbing" : "cursor-grab";
    if (activeTool === "hand") return isPanning ? "cursor-grabbing" : "cursor-grab";
    if (activeTool === "text") return "cursor-text";
    if (["rectangle", "circle", "star", "triangle"].includes(activeTool)) return "cursor-crosshair";
    return "cursor-default";
  };

  return (
    <main
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          if (justMarquedRef.current) {
            justMarquedRef.current = false;
            return;
          }
          deselectAll();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          const screenEl = document.getElementById(`screen-${activeScreen.id}`);
          if (!screenEl) return;
          const screenRect = screenEl.getBoundingClientRect();
          const domScale =
            screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;
          const dropX = (e.clientX - screenRect.left) / domScale;
          const dropY = (e.clientY - screenRect.top) / domScale;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              const maxDim = 500;
              let width = img.naturalWidth || 300;
              let height = img.naturalHeight || 200;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              const cleanName = file.name.replace(/\.[^/.]+$/, "");
              addLayer({
                id: `image_${Date.now()}`,
                name: cleanName || "Image",
                type: "image",
                src: dataUrl,
                objectFit: "cover",
                style: {
                  x: Math.round(dropX - width / 2),
                  y: Math.round(dropY - height / 2),
                  width,
                  height,
                  rotation: 0,
                  opacity: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: THEME_TOKENS.surfaces.border,
                },
                animation: {
                  in: {
                    preset: "pop",
                    start: 0,
                    duration: 0.6,
                    easing: "bouncy",
                  },
                },
              });
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const store = useProjectStore.getState();
        const openMenu = useContextMenuStore.getState().openContextMenu;
        if (selectedLayerIds.length > 0) {
          const screen =
            store.document.screens.find((s) => s.id === store.activeScreenId) ||
            store.document.screens[0];
          const selectedLayer = screen?.layers.find((l) => l.id === selectedLayerIds[0]);
          if (selectedLayer) {
            openMenu({
              x: e.clientX,
              y: e.clientY,
              zone: "canvas-element",
              items: buildCanvasElementMenu({ layer: selectedLayer, store }),
            });
            return;
          }
        }
        openMenu({
          x: e.clientX,
          y: e.clientY,
          zone: "canvas-pasteboard",
          items: buildCanvasPasteboardMenu({ store }),
        });
      }}
      className={`flex-1 relative bg-muted/30 overflow-hidden flex items-center justify-center select-none ${getCanvasCursor()}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--canvas-dot, rgba(0, 0, 0, 0.08)) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Canvas Frame */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
          transformOrigin: "center center",
          transition: "none",
        }}
        className="relative"
      >
        <ScreenRenderer
          screen={activeScreen}
          settings={doc.settings}
          selectedLayerIds={selectedLayerIds}
          computedLayerStyles={computedLayerStyles}
          onSelectLayer={handleSelectLayer}
          onCanvasClick={() => {
            if (justMarquedRef.current) {
              justMarquedRef.current = false;
              return;
            }
            deselectAll();
          }}
        />

        {/* Reactive Element Binding Connection Curves */}
        <BindingConnectionOverlay
          canvasWidth={doc.settings.width}
          canvasHeight={doc.settings.height}
        />

        {/* Marquee Selection Rectangle */}
        {marquee &&
          (Math.abs(marquee.currentX - marquee.startX) > 4 ||
            Math.abs(marquee.currentY - marquee.startY) > 4) && (
            <div
              style={{
                position: "absolute",
                left: `${Math.min(marquee.startX, marquee.currentX)}px`,
                top: `${Math.min(marquee.startY, marquee.currentY)}px`,
                width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
                height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
              }}
              className="border border-primary/80 bg-primary/15 pointer-events-none z-50 rounded-[2px]"
            />
          )}

        {/* Magnetic Snap Guides (Red magnetic lines) */}
        {guides.map((guide, idx) => (
          <div
            key={idx}
            style={
              guide.type === "vertical"
                ? { left: `${guide.position}px`, top: 0, bottom: 0, width: "1px" }
                : { top: `${guide.position}px`, left: 0, right: 0, height: "1px" }
            }
            className="absolute bg-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.9)]"
          >
            {guide.label && (
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                {guide.label}
              </span>
            )}
          </div>
        ))}

        {/* Smart Distance Guides Overlay (Alt Key in Design Mode) */}
        {selectedRootLayer && uiMode === "design" && (
          <DistanceOverlay
            selectedLayer={selectedRootLayer}
            hoveredLayer={
              hoveredLayerId
                ? findLayerInTree(activeScreen.layers, hoveredLayerId)
                : null
            }
            canvasWidth={doc.settings.width}
            canvasHeight={doc.settings.height}
            altPressed={altPressed}
          />
        )}

        {/* Interactive Transform Bounding Box (Design Mode for full layout, Animate Mode for destination pose) */}
        {selectedRootLayer && (
          <TransformBox
            layer={selectedRootLayer}
            canvasWidth={doc.settings.width}
            canvasHeight={doc.settings.height}
            siblingBoxes={siblingBoxes}
            effectiveScale={effectiveScale}
            onGuidesChange={setGuides}
            bounds={selectedBounds}
            selectedLayers={selectedLayers}
            isAnimateMode={uiMode === "animate"}
          />
        )}
      </div>

      {/* Floating Toolbar (Design Mode only) */}
      {uiMode === "design" && (
        <FloatingToolbar onOpenComponentsDrawer={onOpenComponentsDrawer} />
      )}

      {/* Floating Canvas Navigation & Zoom Widget (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-1 bg-card/95 backdrop-blur-md px-2.5 py-1 rounded-[20px] border border-border shadow-xl text-xs text-foreground">
        <button
          onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))}
          title="Zoom Out"
          className="p-1 hover:bg-muted rounded-[8px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 hover:text-foreground transition-colors">
              {Math.round(zoom * 100)}%
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-xs text-popover-foreground">
            {[50, 75, 100, 150, 200, 300].map((pct) => (
              <DropdownMenuItem
                key={pct}
                onClick={() => setZoom(pct / 100)}
                className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {pct}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setZoom(Math.min(zoom + 0.1, 4.0))}
          title="Zoom In"
          className="p-1 hover:bg-muted rounded-[8px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
        <div className="w-[1px] h-3.5 bg-border mx-0.5" />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          title="Fit to Screen (Shift+1)"
          className="px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-[8px] transition-colors"
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
          onRename={(id) =>
            window.dispatchEvent(
              new CustomEvent("motion-rename-layer", { detail: { layerId: id } })
            )
          }
        />
      )}
    </main>
  );
};
