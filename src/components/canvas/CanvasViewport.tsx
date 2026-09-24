import React, { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import {
  useProjectStore,
  findLayerInTree,
  findParentGroupInTree,
  findTopmostParentGroupInTree,
  CanvasTool,
  isMotionMode,
  getScreenAtTime,
  getTotalDuration,
  getScreenTimings,
} from "@/store/useProjectStore";
import { Layer, getLayerClips } from "@/types/scene";
import { THEME_TOKENS } from "@/theme/tokens";
import { ScreenRenderer } from "./renderers/ScreenRenderer";
import { evaluateSceneAtTime } from "@/engine/evaluator";
import { TransformBox } from "./TransformBox";
import { ShapeSplitOverlay } from "./ShapeSplitOverlay";
import { LineSplitOverlay } from "./LineSplitOverlay";
import { SnapGuide } from "./snapping";
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
import { FloatingDesignToolbar } from "./FloatingDesignToolbar";
import { getLayerBounds } from "./helpers/canvasMath";
import { createLayerForTool } from "./helpers/toolCreationHelpers";
import { usePlaybackLoop } from "./hooks/usePlaybackLoop";
import { useSelectionBounds } from "./hooks/useSelectionBounds";
import { useCanvasHotkeys } from "./hooks/useCanvasHotkeys";

interface CanvasViewportProps {
  onOpenComponentsDrawer: () => void;
  onOpenAiBar?: () => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  onOpenComponentsDrawer,
  onOpenAiBar,
}) => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    selectLayer,
    deselectAll,
    selectScreen,
    addScreen,
    updateScreen,
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
    importSvg,
    removeLayer,
    duplicateLayer,
    startTransaction,
    commitTransaction,
    alignSelectedLayers,
    distributeSpacing,
    pan,
    setPan,
    splitModeState,
  } = useProjectStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const isAnimate = isMotionMode(uiMode);

  // Active screen and timing resolution
  const screenMatch = useMemo(
    () => getScreenAtTime(doc.screens, currentTime),
    [doc.screens, currentTime]
  );

  const activeScreen = isAnimate
    ? screenMatch.screen
    : (doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0]);

  // Selected layers
  const selectedLayers = selectedLayerIds
    .map((id) => findLayerInTree(activeScreen.layers, id))
    .filter((l): l is Layer => l !== null);

  const selectedRootLayer = selectedLayers[0] || null;

  const splitTargetLayer = splitModeState
    ? findLayerInTree(activeScreen.layers, splitModeState.layerId)
    : null;

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

  const [drawingCreation, setDrawingCreation] = useState<{
    tool: string;
    screenId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isShift: boolean;
    isAlt: boolean;
  } | null>(null);

  const drawingCreationRef = useRef(drawingCreation);
  useEffect(() => {
    drawingCreationRef.current = drawingCreation;
  }, [drawingCreation]);

  const [altPressed, setAltPressed] = useState(false);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  // Fit scale calculation relative to viewport window
  const [viewportScale, setViewportScale] = useState(0.45);
  const isInitialMountRef = useRef(true);

  // Focus / center a screen in the viewport at 100% scale with symmetric padding
  const focusScreen = useCallback(
    (screenId: string) => {
      const targetScreenIdx = doc.screens.findIndex((s) => s.id === screenId);
      if (targetScreenIdx === -1) return;
      const targetScreen = doc.screens[targetScreenIdx];
      const sWidth = targetScreen.width ?? doc.settings.width;
      const sHeight = targetScreen.height ?? doc.settings.height;
      const isAnimateMode = isMotionMode(uiMode);
      const screenX = isAnimateMode ? 0 : (targetScreen.x ?? (targetScreenIdx * (sWidth + 120)));
      const screenY = isAnimateMode ? 0 : (targetScreen.y ?? 0);

      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      const margin = 80;
      const scaleX = (clientWidth - margin) / sWidth;
      const scaleY = (clientHeight - margin) / sHeight;
      const fit = Math.min(scaleX, scaleY, 1);
      const newScale = Math.max(0.1, Math.round(fit * 1000) / 1000);

      setViewportScale(newScale);
      setZoom(1);

      // Center the target screen exactly at the center of the viewport
      const centerX = screenX + sWidth / 2;
      const centerY = screenY + sHeight / 2;

      setPan({
        x: Math.round(-centerX * newScale),
        y: Math.round(-centerY * newScale),
      });
    },
    [doc.screens, doc.settings.width, doc.settings.height, setZoom, uiMode]
  );

  const updateAutoFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    const margin = 80;
    const active = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
    const sWidth = active.width ?? doc.settings.width;
    const sHeight = active.height ?? doc.settings.height;
    const scaleX = (clientWidth - margin) / sWidth;
    const scaleY = (clientHeight - margin) / sHeight;
    const fit = Math.min(scaleX, scaleY, 1);
    const newScale = Math.max(0.1, Math.round(fit * 1000) / 1000);
    setViewportScale(newScale);

    const isAnimateMode = isMotionMode(uiMode);
    if (isAnimateMode) {
      if (useProjectStore.getState().zoom < 1.0) {
        setZoom(1.0);
      }
      const storeState = useProjectStore.getState();
      if (!storeState.animateModeState && storeState.zoom <= 1.0) {
        const centerX = sWidth / 2;
        const centerY = sHeight / 2;
        setPan({
          x: Math.round(-centerX * newScale),
          y: Math.round(-centerY * newScale),
        });
      }
      return;
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const targetIdx = Math.max(0, doc.screens.findIndex((s) => s.id === active.id));
      const screenX = active.x ?? (targetIdx * (sWidth + 120));
      const screenY = active.y ?? 0;
      const currentZoom = useProjectStore.getState().zoom;
      const centerX = screenX + sWidth / 2;
      const centerY = screenY + sHeight / 2;
      const initialPan = {
        x: Math.round(-centerX * newScale * currentZoom),
        y: Math.round(-centerY * newScale * currentZoom),
      };
      setPan(initialPan);
      if (!useProjectStore.getState().designModeState) {
        useProjectStore.setState({
          designModeState: {
            pan: initialPan,
            zoom: currentZoom,
            activeScreenId: active.id,
            selectedLayerIds: useProjectStore.getState().selectedLayerIds,
            activeTool: useProjectStore.getState().activeTool,
          },
        });
      }
    }
  }, [doc.screens, doc.settings.width, doc.settings.height, activeScreenId, uiMode, setZoom, setPan]);

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

  useEffect(() => {
    const handleFocusScreen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.screenId) {
        focusScreen(detail.screenId);
      }
    };
    window.addEventListener("motion-focus-screen", handleFocusScreen);
    return () => window.removeEventListener("motion-focus-screen", handleFocusScreen);
  }, [focusScreen]);

  const siblingBoxes = activeScreen.layers
    .filter((l) => !selectedLayerIds.includes(l.id))
    .map((l) => ({
      x: l.style.x || 0,
      y: l.style.y || 0,
      width: typeof l.style.width === "number" ? l.style.width : 200,
      height: typeof l.style.height === "number" ? l.style.height : 100,
    }));

  // Global keyboard shortcuts
  useCanvasHotkeys({
    activeScreen,
    doc,
    selectedLayerIds,
    editingLayerId,
    setEditingLayerId,
    spacePressed,
    setSpacePressed,
    setIsPanning,
    setAltPressed,
    setHoveredLayerId,
    containerRef,
    viewportScale,
    effectiveScale,
    focusScreen,
    uiMode,
  });

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
        const minZoom = isMotionMode(uiMode) ? 1.0 : 0.2;
        const nextZoom = Math.min(Math.max(currentZoom * factor, minZoom), 4.0);

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
  }, [setZoom, uiMode]);

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

  // Window marquee and creation drag listener so fast movement or leaving canvas boundary never drops interaction
  useEffect(() => {
    if (!marquee && !drawingCreation) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      const screenEl = document.getElementById(`screen-${activeScreen.id}`);
      if (!screenEl) return;
      const screenRect = screenEl.getBoundingClientRect();
      const domScale =
        screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;

      const canvasX = (e.clientX - screenRect.left) / domScale;
      const canvasY = (e.clientY - screenRect.top) / domScale;

      if (drawingCreationRef.current) {
        drawingCreationRef.current = {
          ...drawingCreationRef.current,
          currentX: canvasX,
          currentY: canvasY,
          isShift: e.shiftKey,
          isAlt: e.altKey,
        };
        setDrawingCreation((prev) =>
          prev
            ? {
                ...prev,
                currentX: canvasX,
                currentY: canvasY,
                isShift: e.shiftKey,
                isAlt: e.altKey,
              }
            : null
        );
      }

      if (marqueeRef.current) {
        marqueeRef.current = {
          ...marqueeRef.current,
          currentX: canvasX,
          currentY: canvasY,
        };
        setMarquee((prev) =>
          prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null
        );
      }
    };

    const onWindowMouseUp = (e: MouseEvent) => {
      // 1. Finalize Interactive Drag-to-Create
      const draw = drawingCreationRef.current;
      if (draw) {
        drawingCreationRef.current = null;
        setDrawingCreation(null);

        const screenEl = document.getElementById(`screen-${activeScreen.id}`);
        const screenRect = screenEl?.getBoundingClientRect();
        const domScale =
          screenRect && screenRect.width > 0
            ? screenRect.width / doc.settings.width
            : effectiveScale;

        const currentX = screenRect ? (e.clientX - screenRect.left) / domScale : draw.currentX;
        const currentY = screenRect ? (e.clientY - screenRect.top) / domScale : draw.currentY;

        const deltaX = currentX - draw.startX;
        const deltaY = currentY - draw.startY;
        const isDrag = Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
        const isLineLike = draw.tool === "line" || draw.tool === "arrow";

        let createdLayer: Layer | null = null;

        if (!isDrag) {
          // Single-click fallback: default standard size centered at click position
          createdLayer = createLayerForTool(
            draw.tool,
            draw.startX,
            draw.startY,
            activeScreen?.layers.length ?? 0
          );
        } else if (isLineLike) {
          // Dragged Line / Arrow
          let dx = deltaX;
          let dy = deltaY;
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (draw.isShift || e.shiftKey) {
            angle = Math.round(angle / 45) * 45;
            const rad = angle * (Math.PI / 180);
            const dist = Math.hypot(dx, dy);
            dx = Math.cos(rad) * dist;
            dy = Math.sin(rad) * dist;
          }
          const length = Math.max(20, Math.round(Math.hypot(dx, dy)));

          createdLayer = createLayerForTool(
            draw.tool,
            draw.startX,
            draw.startY,
            activeScreen?.layers.length ?? 0,
            {
              x: Math.round(draw.startX),
              y: Math.round(draw.startY - 10),
              width: length,
              height: 20,
              rotation: Math.round(angle),
            }
          );
        } else {
          // Dragged 2D Box Shape / Frame / Text
          let rawW = deltaX;
          let rawH = deltaY;

          // Shift: lock 1:1 aspect ratio
          if (draw.isShift || e.shiftKey) {
            const maxDim = Math.max(Math.abs(rawW), Math.abs(rawH));
            rawW = (rawW >= 0 ? 1 : -1) * maxDim;
            rawH = (rawH >= 0 ? 1 : -1) * maxDim;
          }

          let left: number;
          let top: number;
          let width: number;
          let height: number;

          // Alt: expand from center origin
          if (draw.isAlt || e.altKey) {
            width = Math.max(20, Math.round(Math.abs(rawW) * 2));
            height = Math.max(20, Math.round(Math.abs(rawH) * 2));
            left = Math.round(draw.startX - width / 2);
            top = Math.round(draw.startY - height / 2);
          } else {
            left = Math.round(Math.min(draw.startX, draw.startX + rawW));
            top = Math.round(Math.min(draw.startY, draw.startY + rawH));
            width = Math.max(20, Math.round(Math.abs(rawW)));
            height = Math.max(20, Math.round(Math.abs(rawH)));
          }

          createdLayer = createLayerForTool(
            draw.tool,
            draw.startX,
            draw.startY,
            activeScreen?.layers.length ?? 0,
            {
              x: left,
              y: top,
              width,
              height,
            }
          );
        }

        if (createdLayer) {
          addLayer(createdLayer);
          selectLayer(createdLayer.id, false);
          if (draw.tool === "text") {
            setEditingLayerId(createdLayer.id);
          }
          setTool("select");
          return;
        }
      }

      // 2. Finalize Marquee Selection
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

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (drawingCreationRef.current) {
          drawingCreationRef.current = null;
          setDrawingCreation(null);
          setTool("select");
        }
        if (marqueeRef.current) {
          marqueeRef.current = null;
          setMarquee(null);
        }
      }
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    marquee !== null,
    drawingCreation !== null,
    activeScreen.id,
    doc.settings.width,
    effectiveScale,
    deselectAll,
    addLayer,
    selectLayer,
    setEditingLayerId,
    setTool,
  ]);

  const isPanMode = spacePressed || activeTool === "hand";

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanMode || e.button === 1) {
      // Pan mode
      e.preventDefault();
      setIsPanning(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button === 0) {
      // 0. Artboard Tool click-to-place
      if (activeTool === "artboard") {
        addScreen();
        setTool("select");
        return;
      }

      // Hit-test which screen is under the cursor
      let hitScreen = activeScreen;
      let hitScreenRect: DOMRect | null = null;

      for (const s of doc.screens) {
        const el = document.getElementById(`screen-${s.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            hitScreen = s;
            hitScreenRect = rect;
            break;
          }
        }
      }

      if (!hitScreenRect) {
        const activeEl = document.getElementById(`screen-${activeScreen.id}`);
        if (activeEl) hitScreenRect = activeEl.getBoundingClientRect();
      }

      if (hitScreen.id !== activeScreen.id) {
        selectScreen(hitScreen.id);
      }

      const screenWidth = hitScreen.width ?? doc.settings.width;
      const domScale =
        hitScreenRect && hitScreenRect.width > 0
          ? hitScreenRect.width / screenWidth
          : effectiveScale;

      const canvasX = hitScreenRect
        ? (e.clientX - hitScreenRect.left) / domScale
        : 100;
      const canvasY = hitScreenRect
        ? (e.clientY - hitScreenRect.top) / domScale
        : 100;

      // Interactive Drag-to-Create Elements via active tool
      const isCreationTool = [
        "rectangle",
        "circle",
        "star",
        "triangle",
        "polygon",
        "line",
        "arrow",
        "frame",
        "text",
      ].includes(activeTool);

      if (isCreationTool) {
        e.preventDefault();
        const startCreation = {
          tool: activeTool,
          screenId: hitScreen.id,
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY,
          isShift: e.shiftKey,
          isAlt: e.altKey,
        };
        drawingCreationRef.current = startCreation;
        setDrawingCreation(startCreation);
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
    if (justMarquedRef.current || isPanMode) {
      return;
    }
    if (activeTool !== "select") {
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
      // If the group is locked: always select the group as one unified entity!
      if (topmostGroup.locked || parentGroup?.locked) {
        selectLayer(topmostGroup.id, isMulti);
        return;
      }

      // Check if we are already inside this group hierarchy (either topmost group, parent, or sibling is selected)
      const isTopmostSelected = selectedLayerIds.includes(topmostGroup.id);
      const isParentSelected = parentGroup ? selectedLayerIds.includes(parentGroup.id) : false;
      const isSiblingSelected = parentGroup?.children
        ? selectedLayerIds.some((id) =>
            parentGroup.children!.some((child: Layer) => child.id === id)
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
  const evalTime = isAnimate ? screenMatch.localTime : activeScreen.duration;
  const computedLayerStyles = evaluateSceneAtTime(
    activeScreen.layers,
    evalTime,
    0,
    activeScreen.stepFps || doc.settings.stepFps
  );

  // Playback loop via requestAnimationFrame when isPlaying is true
  usePlaybackLoop();

  // Track visual DOM bounding box of active layer (handles single layer or multi-selection union)
  const selectedBounds = useSelectionBounds(
    selectedLayerIds,
    activeScreen,
    effectiveScale,
    doc
  );

  const getCanvasCursor = () => {
    if (spacePressed || isPanning) return isPanning ? "cursor-grabbing" : "cursor-grab";
    if (activeTool === "hand") return isPanning ? "cursor-grabbing" : "cursor-grab";
    if (activeTool === "text") return "cursor-text";
    if (["rectangle", "circle", "star", "triangle", "polygon", "line", "arrow", "frame"].includes(activeTool)) return "cursor-crosshair";
    return "cursor-default";
  };

  const activeScreenIdx = Math.max(0, doc.screens.indexOf(activeScreen));
  const activeScreenX = isAnimate ? 0 : (activeScreen.x ?? (activeScreenIdx * ((activeScreen.width ?? doc.settings.width) + 120)));
  const activeScreenY = isAnimate ? 0 : (activeScreen.y ?? 0);

  const isLineLikeCreation =
    drawingCreation !== null && (drawingCreation.tool === "line" || drawingCreation.tool === "arrow");

  const previewBounds = useMemo(() => {
    if (!drawingCreation || isLineLikeCreation) return null;
    let rawW = drawingCreation.currentX - drawingCreation.startX;
    let rawH = drawingCreation.currentY - drawingCreation.startY;

    if (drawingCreation.isShift) {
      const maxDim = Math.max(Math.abs(rawW), Math.abs(rawH));
      rawW = (rawW >= 0 ? 1 : -1) * maxDim;
      rawH = (rawH >= 0 ? 1 : -1) * maxDim;
    }

    if (drawingCreation.isAlt) {
      const width = Math.max(4, Math.abs(rawW) * 2);
      const height = Math.max(4, Math.abs(rawH) * 2);
      return {
        left: Math.round(drawingCreation.startX - width / 2),
        top: Math.round(drawingCreation.startY - height / 2),
        width: Math.round(width),
        height: Math.round(height),
      };
    }

    return {
      left: Math.round(Math.min(drawingCreation.startX, drawingCreation.startX + rawW)),
      top: Math.round(Math.min(drawingCreation.startY, drawingCreation.startY + rawH)),
      width: Math.max(4, Math.round(Math.abs(rawW))),
      height: Math.max(4, Math.round(Math.abs(rawH))),
    };
  }, [drawingCreation, isLineLikeCreation]);

  const previewLine = useMemo(() => {
    if (!drawingCreation || !isLineLikeCreation) return null;
    let dx = drawingCreation.currentX - drawingCreation.startX;
    let dy = drawingCreation.currentY - drawingCreation.startY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (drawingCreation.isShift) {
      angle = Math.round(angle / 45) * 45;
      const rad = angle * (Math.PI / 180);
      const dist = Math.hypot(dx, dy);
      dx = Math.cos(rad) * dist;
      dy = Math.sin(rad) * dist;
    }
    const length = Math.hypot(dx, dy);
    return {
      x: drawingCreation.startX,
      y: drawingCreation.startY,
      length,
      angle,
    };
  }, [drawingCreation, isLineLikeCreation]);

  return (
    <main
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          if (
            typeof document !== "undefined" &&
            document.activeElement &&
            document.activeElement instanceof HTMLElement &&
            (document.activeElement.tagName === "INPUT" ||
              document.activeElement.tagName === "TEXTAREA")
          ) {
            document.activeElement.blur();
          }
          if (typeof window !== "undefined" && window.getSelection) {
            window.getSelection()?.removeAllRanges();
          }
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
        if (file) {
          const screenEl = document.getElementById(`screen-${activeScreen.id}`);
          if (!screenEl) return;
          const screenRect = screenEl.getBoundingClientRect();
          const domScale =
            screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;
          const dropX = (e.clientX - screenRect.left) / domScale;
          const dropY = (e.clientY - screenRect.top) / domScale;
          const cleanName = file.name.replace(/\.[^/.]+$/, "");

          if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
            const svgReader = new FileReader();
            svgReader.onload = (event) => {
              const svgText = event.target?.result as string;
              if (svgText) {
                importSvg(svgText, { x: Math.round(dropX), y: Math.round(dropY) }, cleanName);
              }
            };
            svgReader.readAsText(file);
            return;
          }

          if (file.type.startsWith("image/")) {
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
      className={`flex-1 min-w-0 relative bg-[#f3f3f5] dark:bg-[#09090b] overflow-hidden select-none ${getCanvasCursor()}`}
    >
      {/* Canvas Frame / World Transform Container */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
          transformOrigin: "0 0",
          transition: "none",
        }}
      >
        {/* Render Artboards / Screens */}
        {(isAnimate ? [activeScreen] : doc.screens).map((screen, idx) => {
          const actualIdx = doc.screens.indexOf(screen);
          const screenX = isAnimate ? 0 : (screen.x ?? (idx * ((screen.width ?? doc.settings.width) + 120)));
          const screenY = isAnimate ? 0 : (screen.y ?? 0);
          const isActive = screen.id === activeScreen.id;
          return (
            <div
              key={screen.id}
              style={{
                position: "absolute",
                left: `${screenX}px`,
                top: `${screenY}px`,
              }}
            >
              <ScreenRenderer
                screen={screen}
                screenIndex={actualIdx >= 0 ? actualIdx : idx}
                settings={{
                  ...doc.settings,
                  width: screen.width ?? doc.settings.width,
                  height: screen.height ?? doc.settings.height,
                  backgroundColor: screen.backgroundColor ?? doc.settings.backgroundColor,
                }}
                isSelected={isActive && selectedLayerIds.length === 0}
                selectedLayerIds={isActive ? selectedLayerIds : []}
                computedLayerStyles={isActive ? computedLayerStyles : {}}
                domScale={effectiveScale}
                onSelectLayer={(layerId, e) => {
                  if (!isActive) {
                    selectScreen(screen.id);
                  }
                  handleSelectLayer(layerId, e);
                }}
                onSelectScreen={() => {
                  selectScreen(screen.id);
                }}
                onCanvasClick={() => {
                  if (
                    typeof document !== "undefined" &&
                    document.activeElement &&
                    document.activeElement instanceof HTMLElement &&
                    (document.activeElement.tagName === "INPUT" ||
                      document.activeElement.tagName === "TEXTAREA")
                  ) {
                    document.activeElement.blur();
                  }
                  if (typeof window !== "undefined" && window.getSelection) {
                    window.getSelection()?.removeAllRanges();
                  }
                  selectScreen(screen.id);
                  if (justMarquedRef.current) {
                    justMarquedRef.current = false;
                    return;
                  }
                  deselectAll();
                }}
              />
            </div>
          );
        })}

        {/* Reactive Element Binding Connection Curves */}
        <BindingConnectionOverlay
          canvasWidth={doc.settings.width}
          canvasHeight={doc.settings.height}
          screenOffset={{
            x: activeScreenX,
            y: activeScreenY,
          }}
        />

        {/* Creation Ghost Preview */}
        {drawingCreation &&
          (Math.abs(drawingCreation.currentX - drawingCreation.startX) > 4 ||
            Math.abs(drawingCreation.currentY - drawingCreation.startY) > 4) &&
          (isLineLikeCreation && previewLine ? (
            <div
              style={{
                position: "absolute",
                left: `${activeScreenX + previewLine.x}px`,
                top: `${activeScreenY + previewLine.y}px`,
                width: `${Math.max(1, previewLine.length)}px`,
                height: "2px",
                transformOrigin: "0 50%",
                transform: `rotate(${previewLine.angle}deg)`,
              }}
              className="bg-zinc-900 dark:bg-zinc-100 pointer-events-none z-50 flex items-center justify-center"
            >
              <span
                style={{
                  transform: `rotate(${-previewLine.angle}deg)`,
                }}
                className="absolute -top-6 text-[10px] font-mono font-medium text-white bg-zinc-900/90 px-1.5 py-0.5 rounded shadow-xs border border-zinc-700/50 whitespace-nowrap"
              >
                {Math.round(previewLine.length)}px ({Math.round(previewLine.angle)}°)
              </span>
            </div>
          ) : previewBounds ? (
            <div
              style={{
                position: "absolute",
                left: `${activeScreenX + previewBounds.left}px`,
                top: `${activeScreenY + previewBounds.top}px`,
                width: `${previewBounds.width}px`,
                height: `${previewBounds.height}px`,
                borderRadius: drawingCreation.tool === "circle" ? "9999px" : "4px",
              }}
              className="border-2 border-dashed border-zinc-900 dark:border-zinc-100 bg-zinc-900/10 dark:bg-zinc-100/10 pointer-events-none z-50 flex items-end justify-end p-1.5"
            >
              <span className="text-[10px] font-mono font-medium text-white bg-zinc-900/90 px-1.5 py-0.5 rounded shadow-xs border border-zinc-700/50 whitespace-nowrap">
                {Math.round(previewBounds.width)} × {Math.round(previewBounds.height)}
              </span>
            </div>
          ) : null)}

        {/* Marquee Selection Rectangle */}
        {marquee &&
          (Math.abs(marquee.currentX - marquee.startX) > 4 ||
            Math.abs(marquee.currentY - marquee.startY) > 4) && (
            <div
              style={{
                position: "absolute",
                left: `${activeScreenX + Math.min(marquee.startX, marquee.currentX)}px`,
                top: `${activeScreenY + Math.min(marquee.startY, marquee.currentY)}px`,
                width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
                height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
              }}
              className="border border-zinc-900 dark:border-zinc-100 bg-zinc-900/15 dark:bg-white/10 pointer-events-none z-50 rounded-[2px]"
            />
          )}

        {/* Magnetic Smart Guides (Crisp Segment-Bounded Magenta Lines) */}
        {guides.map((guide, idx) => {
          const sWidth = activeScreen.width ?? doc.settings.width;
          const sHeight = activeScreen.height ?? doc.settings.height;

          const isVert = guide.type === "vertical";
          const startCoord = guide.start !== undefined ? Math.max(0, guide.start) : 0;
          const endCoord =
            guide.end !== undefined
              ? Math.min(isVert ? sHeight : sWidth, guide.end)
              : isVert
              ? sHeight
              : sWidth;
          const spanLength = Math.max(1, endCoord - startCoord);

          return (
            <div
              key={idx}
              style={
                isVert
                  ? {
                      left: `${guide.position + activeScreenX}px`,
                      top: `${startCoord + activeScreenY}px`,
                      height: `${spanLength}px`,
                      width: "1px",
                    }
                  : {
                      top: `${guide.position + activeScreenY}px`,
                      left: `${startCoord + activeScreenX}px`,
                      width: `${spanLength}px`,
                      height: "1px",
                    }
              }
              className="absolute bg-[#ec4899] z-50 pointer-events-none"
            >
              {/* Subtle endpoint tick marks on segment-bounded guides */}
              {!guide.isCanvasAxis && (
                <>
                  <div
                    className={
                      isVert
                        ? "absolute -top-1 -left-[2px] w-[5px] h-[2px] bg-[#ec4899] rounded-xs"
                        : "absolute -left-1 -top-[2px] h-[5px] w-[2px] bg-[#ec4899] rounded-xs"
                    }
                  />
                  <div
                    className={
                      isVert
                        ? "absolute -bottom-1 -left-[2px] w-[5px] h-[2px] bg-[#ec4899] rounded-xs"
                        : "absolute -right-1 -top-[2px] h-[5px] w-[2px] bg-[#ec4899] rounded-xs"
                    }
                  />
                </>
              )}

              {guide.label && (
                <div
                  className={
                    isVert
                      ? "absolute top-1/2 -translate-y-1/2 left-2 px-1.5 py-0.5 rounded-full bg-[#ec4899] text-white text-[10px] font-mono font-medium shadow-xs whitespace-nowrap"
                      : "absolute left-1/2 -translate-x-1/2 top-2 px-1.5 py-0.5 rounded-full bg-[#ec4899] text-white text-[10px] font-mono font-medium shadow-xs whitespace-nowrap"
                  }
                >
                  {guide.label}
                </div>
              )}
            </div>
          );
        })}

        {/* Smart Distance Guides Overlay (Alt Key in Design Mode) */}
        {selectedRootLayer && uiMode === "design" && (
          <DistanceOverlay
            selectedLayer={selectedRootLayer}
            hoveredLayer={
              hoveredLayerId
                ? findLayerInTree(activeScreen.layers, hoveredLayerId)
                : null
            }
            canvasWidth={activeScreen.width ?? doc.settings.width}
            canvasHeight={activeScreen.height ?? doc.settings.height}
            altPressed={altPressed}
            screenOffset={{
              x: activeScreenX,
              y: activeScreenY,
            }}
          />
        )}

        {/* Interactive Split Mode Overlays */}
        {splitTargetLayer && (splitTargetLayer.type === "shape" || splitTargetLayer.type === "polygon") && (
          <ShapeSplitOverlay
            layer={(splitTargetLayer.type === "polygon" ? { ...splitTargetLayer, shapeType: "polygon" } : splitTargetLayer) as any}
            canvasWidth={activeScreen.width ?? doc.settings.width}
            canvasHeight={activeScreen.height ?? doc.settings.height}
            effectiveScale={effectiveScale}
            screenOffset={{
              x: activeScreenX,
              y: activeScreenY,
            }}
          />
        )}

        {splitTargetLayer && (splitTargetLayer.type === "line" || (splitTargetLayer as any).shapeType === "arrow") && (
          <LineSplitOverlay
            layer={splitTargetLayer as any}
            canvasWidth={activeScreen.width ?? doc.settings.width}
            canvasHeight={activeScreen.height ?? doc.settings.height}
            effectiveScale={effectiveScale}
            screenOffset={{
              x: activeScreenX,
              y: activeScreenY,
            }}
          />
        )}

        {/* Interactive Transform Bounding Box (hidden during Split Mode) */}
        {!splitModeState && selectedRootLayer && (
          <TransformBox
            layer={selectedRootLayer}
            canvasWidth={activeScreen.width ?? doc.settings.width}
            canvasHeight={activeScreen.height ?? doc.settings.height}
            siblingBoxes={siblingBoxes}
            effectiveScale={effectiveScale}
            onGuidesChange={setGuides}
            bounds={selectedBounds}
            selectedLayers={selectedLayers}
            isAnimateMode={uiMode === "animate"}
            screenOffset={{
              x: activeScreenX,
              y: activeScreenY,
            }}
          />
        )}
      </div>

      {/* Floating Design Toolbar in Design Mode */}
      {!isMotionMode(uiMode) && (
        <FloatingDesignToolbar
          onOpenAiBar={onOpenAiBar}
          onOpenComponentsDrawer={onOpenComponentsDrawer}
        />
      )}
    </main>
  );
};
