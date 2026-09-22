import React, { useRef, useState, useEffect } from "react";
import { Screen, ProjectSettings } from "@/types/scene";
import { LayerRenderer } from "./LayerRenderer";
import { SafeZoneOverlay } from "../SafeZoneOverlay";
import { Play, Sparkles, MoreHorizontal } from "lucide-react";
import { useContextMenuStore } from "@/store/useContextMenuStore";
import { useProjectStore } from "@/store/useProjectStore";
import { buildSceneContextMenu } from "@/components/contextmenu/contextMenuBuilders";

interface ScreenRendererProps {
  screen: Screen;
  settings: ProjectSettings;
  selectedLayerIds: string[];
  computedLayerStyles?: Record<string, React.CSSProperties>;
  onSelectLayer: (layerId: string, e: React.MouseEvent) => void;
  onCanvasClick?: () => void;
  onSelectScreen?: (screenId: string) => void;
  isSelected?: boolean;
  domScale?: number;
  screenIndex?: number;
  isPanMode?: boolean;
}

export const ScreenRenderer: React.FC<ScreenRendererProps> = ({
  screen,
  settings,
  selectedLayerIds,
  computedLayerStyles = {},
  onSelectLayer,
  onCanvasClick,
  onSelectScreen,
  isSelected = false,
  domScale = 1,
  screenIndex = 0,
  isPanMode = false,
}) => {
  const updateScreen = useProjectStore((s) => s.updateScreen);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(screen.name);

  useEffect(() => {
    setNameInput(screen.name);
    setIsEditingName(false);
  }, [screen.name]);
  const handleHeaderClick = (e: React.MouseEvent) => {
    if (isPanMode) return;
    e.stopPropagation();
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
    onSelectScreen?.(screen.id);
    onCanvasClick?.();
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectScreen?.(screen.id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("motion-focus-screen", { detail: { screenId: screen.id } })
      );
    }
  };

  const width = screen.width ?? settings.width;
  const height = screen.height ?? settings.height;
  const bg = screen.backgroundColor ?? settings.backgroundColor ?? "#ffffff";

  return (
    <div className="relative select-none">
      {/* Jitter Artboard Header: '▶ Scene 1 · 4s' on left, '···' and '✦' on right */}
      <div
        onClick={handleHeaderClick}
        onDoubleClick={handleHeaderDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelectScreen?.(screen.id);
          const store = useProjectStore.getState();
          useContextMenuStore.getState().openContextMenu({
            x: e.clientX,
            y: e.clientY,
            zone: "scene",
            items: buildSceneContextMenu({
              screenId: screen.id,
              store,
            }),
          });
        }}
        className={`absolute -top-6 left-0 right-0 flex items-center justify-between text-xs z-20 px-0.5 ${
          isPanMode ? "pointer-events-none" : "cursor-pointer pointer-events-auto"
        } ${
          isSelected ? "text-[#6d28d9] font-medium" : "text-[#71717a] hover:text-[#18181b]"
        }`}
        title="Double-click to fit in viewport, right-click for scene options"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          <Play className={`h-3 w-3 fill-current shrink-0 ${isSelected ? "text-[#6d28d9]" : "text-[#71717a]"}`} />
          {isEditingName ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => {
                if (nameInput.trim()) {
                  updateScreen(screen.id, { name: nameInput.trim() });
                } else {
                  setNameInput(screen.name);
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (nameInput.trim()) {
                    updateScreen(screen.id, { name: nameInput.trim() });
                  }
                  setIsEditingName(false);
                } else if (e.key === "Escape") {
                  setNameInput(screen.name);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="h-5 px-1 bg-white border border-[#6d28d9] rounded text-[11px] text-[#18181b] outline-none min-w-[80px]"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setNameInput(screen.name);
                setIsEditingName(true);
              }}
              className="truncate font-medium cursor-text hover:underline"
              title="Double-click to rename scene"
            >
              {screen.name}
            </span>
          )}
          <span className="text-[10px] text-[#a1a1aa] shrink-0 font-mono">· {screen.duration}s</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectScreen?.(screen.id);
              const rect = e.currentTarget.getBoundingClientRect();
              const store = useProjectStore.getState();
              useContextMenuStore.getState().openContextMenu({
                x: rect.left,
                y: rect.bottom + 4,
                zone: "scene",
                items: buildSceneContextMenu({
                  screenId: screen.id,
                  store,
                  onRename: () => {
                    setNameInput(screen.name);
                    setIsEditingName(true);
                  },
                }),
              });
            }}
            className="p-0.5 rounded hover:bg-black/5 text-[#a1a1aa] hover:text-[#18181b] transition-colors"
            title="Scene options"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
          <Sparkles className="h-3 w-3 text-[#a1a1aa]" />
        </div>
      </div>

      {/* Artboard Canvas Frame */}
      <div
        id={`screen-${screen.id}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: bg,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0, 0, 0, 0.06)",
          pointerEvents: isPanMode ? "none" : undefined,
        }}
        onPointerDown={(e) => {
          if (isPanMode) return;
          if (e.target === e.currentTarget) {
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
            onSelectScreen?.(screen.id);
            onCanvasClick?.();
          }
        }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            onSelectScreen?.(screen.id);
            const store = useProjectStore.getState();
            useContextMenuStore.getState().openContextMenu({
              x: e.clientX,
              y: e.clientY,
              zone: "scene",
              items: buildSceneContextMenu({
                screenId: screen.id,
                store,
              }),
            });
          }
        }}
        className={`rounded-[2px] transition-all ${
          isSelected
            ? "ring-2 ring-[#7c3aed]"
            : "border border-[#e5e5e7] hover:border-[#a1a1aa]"
        }`}
      >
        {screen.layers.map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            selectedLayerIds={selectedLayerIds}
            computedStyle={computedLayerStyles[layer.id]}
            computedLayerStyles={computedLayerStyles}
            onSelectLayer={onSelectLayer}
          />
        ))}

        {/* Safe Zone Overlay */}
        {settings.safeZones && (
          <SafeZoneOverlay
            width={width}
            height={height}
            config={settings.safeZones}
          />
        )}
      </div>
    </div>
  );
};
