import { useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { findLayerInTree, findParentGroupInTree } from "@/store/helpers/treeHelpers";
import { Screen, Document } from "@/types/scene";
import { getLayerBounds } from "../helpers/canvasMath";

export interface UseCanvasHotkeysProps {
  activeScreen: Screen;
  doc: Document;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  setEditingLayerId: (id: string | null) => void;
  spacePressed: boolean;
  setSpacePressed: (pressed: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  setAltPressed: (pressed: boolean) => void;
  setHoveredLayerId: (id: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewportScale: number;
  effectiveScale: number;
  focusScreen: (screenId: string) => void;
  uiMode: string;
}

export function useCanvasHotkeys({
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
}: UseCanvasHotkeysProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      const store = useProjectStore.getState();

      if (e.altKey && !isInput) {
        setAltPressed(true);
      }

      if (e.code === "Space" && !spacePressed && !isInput) {
        if (uiMode === "design") {
          e.preventDefault();
          setSpacePressed(true);
        }
      } else if (e.shiftKey && (e.key === "!" || e.code === "Digit1") && !isInput) {
        // Shift + 1: Zoom to Fit
        focusScreen(activeScreen.id);
      } else if (e.shiftKey && (e.key === "@" || e.code === "Digit2") && !isInput) {
        // Shift + 2: Zoom to Selection
        if (selectedLayerIds.length > 0 && containerRef.current) {
          const screenEl = document.getElementById(`screen-${activeScreen.id}`);
          if (screenEl) {
            const screenRect = screenEl.getBoundingClientRect();
            const domScale =
              screenRect.width > 0 ? screenRect.width / doc.settings.width : effectiveScale;
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
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
              const targetZoom = targetScale / viewportScale;
              const activeScreenIdx = Math.max(0, doc.screens.indexOf(activeScreen));
              const sWidth = activeScreen.width ?? doc.settings.width;
              const activeScreenX = activeScreen.x ?? (activeScreenIdx * (sWidth + 120));
              const activeScreenY = activeScreen.y ?? 0;
              const selCenterX = activeScreenX + minX + selW / 2;
              const selCenterY = activeScreenY + minY + selH / 2;
              store.setZoom(targetZoom);
              store.setPan({
                x: Math.round(-selCenterX * targetScale),
                y: Math.round(-selCenterY * targetScale),
              });
            }
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0" && !isInput) {
        // Ctrl + 0: Zoom 100% (Fit)
        focusScreen(activeScreen.id);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        (e.key === "g" || e.key === "G") &&
        !isInput
      ) {
        // Ctrl + G: Group
        e.preventDefault();
        store.groupSelection();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "g" || e.key === "G") &&
        !isInput
      ) {
        // Ctrl + Shift + G: Ungroup
        e.preventDefault();
        if (selectedLayerIds[0]) {
          store.ungroup(selectedLayerIds[0]);
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.altKey &&
        (e.key === "m" || e.key === "M") &&
        !isInput
      ) {
        // Ctrl + Alt + M: Mask Selection / Use as Mask / Release Mask
        e.preventDefault();
        if (selectedLayerIds.length >= 2) {
          store.maskSelection();
        } else if (selectedLayerIds.length === 1) {
          const selected = findLayerInTree(activeScreen.layers, selectedLayerIds[0]);
          if (selected && selected.type === "group" && (selected as any).isMaskGroup) {
            store.unmaskGroup(selected.id);
          } else {
            const parent = findParentGroupInTree(activeScreen.layers, selectedLayerIds[0]);
            if (parent && (parent as any).isMaskGroup) {
              store.unmaskGroup(parent.id);
            } else {
              store.useAsMask(selectedLayerIds[0]);
            }
          }
        }
      } else if (e.shiftKey && e.key === "Enter" && !isInput) {
        // Shift + Enter: Ascend hierarchy to parent group
        if (selectedLayerIds[0]) {
          const parent = findParentGroupInTree(activeScreen.layers, selectedLayerIds[0]);
          if (parent) {
            e.preventDefault();
            store.selectLayer(parent.id, false);
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
              store.selectLayer(layer.children[0].id, false);
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
            store.selectLayer(parent.id, false);
          } else {
            store.deselectAll();
          }
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          store.startTransaction();
          selectedLayerIds.forEach((id) => store.removeLayer(id));
          store.commitTransaction();
          store.deselectAll();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D") && !isInput) {
        // Ctrl + D: Duplicate
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          store.startTransaction();
          selectedLayerIds.forEach((id) => store.duplicateLayer(id));
          store.commitTransaction();
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
          store.alignSelectedLayers("left", rel);
        } else if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          store.alignSelectedLayers("right", rel);
        } else if (e.key === "w" || e.key === "W") {
          e.preventDefault();
          store.alignSelectedLayers("top", rel);
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          store.alignSelectedLayers("bottom", rel);
        } else if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          if (e.shiftKey) {
            store.distributeSpacing("horizontal");
          } else {
            store.alignSelectedLayers("center", rel);
          }
        } else if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          if (e.shiftKey) {
            store.distributeSpacing("vertical");
          } else {
            store.alignSelectedLayers("middle", rel);
          }
        }
      } else if (
        !isInput &&
        !editingLayerId &&
        selectedLayerIds.length > 0 &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        // Keyboard Nudge: 1px micro-nudge, 10px rapid-nudge with Shift
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

        store.startTransaction();
        for (const id of selectedLayerIds) {
          const layer = findLayerInTree(activeScreen.layers, id);
          if (layer) {
            store.updateLayerStyle(id, {
              x: Math.round((layer.style.x ?? 0) + dx),
              y: Math.round((layer.style.y ?? 0) + dy),
            });
          }
        }
        store.commitTransaction();
      } else if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Creative Tool Hotkeys
        if (e.key === "v" || e.key === "V") {
          store.setTool("select");
        } else if (e.key === "a" || e.key === "A") {
          store.addScreen();
        } else if (e.key === "h" || e.key === "H") {
          store.setTool("hand");
        } else if (e.key === "t" || e.key === "T") {
          store.setTool("text");
        } else if (e.key === "r" || e.key === "R") {
          store.setTool("rectangle");
        } else if (e.key === "o" || e.key === "O") {
          store.setTool("circle");
        } else if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          if (e.shiftKey) {
            store.setTool("pencil");
          } else {
            store.setTool("pen");
          }
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

    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true";
      if (isInput) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const store = useProjectStore.getState();

      const file = clipboardData.files?.[0];
      if (file && (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg"))) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          const svgText = event.target?.result as string;
          if (svgText) {
            store.importSvg(svgText);
          }
        };
        reader.readAsText(file);
        return;
      }

      const text = clipboardData.getData("text/plain")?.trim();
      if (
        text &&
        (text.startsWith("<svg") ||
          text.includes("<svg ") ||
          (text.startsWith("<?xml") && text.includes("<svg")))
      ) {
        e.preventDefault();
        store.importSvg(text);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("paste", handlePaste);
    };
  }, [
    activeScreen,
    containerRef,
    doc,
    editingLayerId,
    effectiveScale,
    focusScreen,
    selectedLayerIds,
    setAltPressed,
    setEditingLayerId,
    setHoveredLayerId,
    setIsPanning,
    setSpacePressed,
    spacePressed,
    uiMode,
    viewportScale,
  ]);
}
