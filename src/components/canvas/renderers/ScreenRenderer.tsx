import React, { useRef, useState, useEffect } from "react";
import { Screen, ProjectSettings } from "@/types/scene";
import { LayerRenderer } from "./LayerRenderer";
import { MorphTransitionRenderer } from "./MorphTransitionRenderer";
import { SafeZoneOverlay } from "../SafeZoneOverlay";
import { VectorDrawingOverlay } from "../VectorDrawingOverlay";
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
  const currentTime = useProjectStore((s) => s.currentTime);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const activeTool = useProjectStore((s) => s.activeTool);
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
  const hasBg = Boolean(
    (screen.background && screen.background.fill && screen.background.fill !== "transparent") ||
    (screen.backgroundColor && screen.backgroundColor !== "transparent")
  );
  const bgFill = screen.background?.fill || screen.backgroundColor;
  const bgComputedStyle = screen.background ? computedLayerStyles[screen.background.id] : undefined;
  const isBgSelected = Boolean(screen.background && selectedLayerIds.includes(screen.background.id));

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
          isSelected ? "text-zinc-950 dark:text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
        title="Double-click to fit in viewport, right-click for scene options"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          <Play className={`h-3 w-3 fill-current shrink-0 ${isSelected ? "text-zinc-950 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}`} />
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
              className="h-5 px-1 bg-white dark:bg-zinc-800 border border-zinc-900 dark:border-zinc-100 rounded text-[11px] text-zinc-900 dark:text-zinc-100 outline-none min-w-[80px]"
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
          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">· {screen.duration}s</span>
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
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Scene options"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
          <Sparkles className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Artboard Canvas Frame */}
      <div
        id={`screen-${screen.id}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundImage: "repeating-conic-gradient(rgba(128, 128, 128, 0.08) 0% 25%, transparent 0% 50%)",
          backgroundSize: "16px 16px",
          backgroundColor: "transparent",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0, 0, 0, 0.06)",
          pointerEvents: isPanMode ? "none" : undefined,
        }}
        onPointerDown={(e) => {
          if (isPanMode) return;
          if (e.target === e.currentTarget || (e.target as HTMLElement)?.id === screen.background?.id) {
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
            if (screen.background) {
              onSelectLayer(screen.background.id, e);
            } else {
              onSelectScreen?.(screen.id);
              onCanvasClick?.();
            }
          }
        }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement)?.id === screen.background?.id) {
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
          isSelected || isBgSelected
            ? "ring-1.5 ring-foreground shadow-sm"
            : "border border-border hover:border-muted-foreground/60"
        }`}
      >
        {/* First-Class Background Element Surface */}
        {hasBg && (
          <div
            id={screen.background?.id || `bg-${screen.id}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              background: bgFill,
              pointerEvents: "none",
              zIndex: 0,
              ...bgComputedStyle,
            }}
          />
        )}

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

        {/* Real-time Cross-Element Morph Particle Swarm Overlay */}
        <MorphTransitionRenderer
          layers={screen.layers}
          currentTime={currentTime}
          width={width}
          height={height}
        />

        {/* Safe Zone Overlay */}
        {settings.safeZones && (
          <SafeZoneOverlay
            width={width}
            height={height}
            config={settings.safeZones}
          />
        )}

        {/* Interactive Pen & Pencil Vector Drawing Overlay */}
        {screen.id === activeScreenId && (activeTool === "pen" || activeTool === "pencil") && (
          <VectorDrawingOverlay
            screenId={screen.id}
            screenWidth={width}
            screenHeight={height}
            domScale={domScale || 1}
          />
        )}
      </div>
    </div>
  );
};
