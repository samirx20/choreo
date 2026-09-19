import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Type,
  Square,
  Circle,
  Folder,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { CanvasSettingsCard } from "./design/CanvasSettingsCard";
import { MultiSelectionCard } from "./design/MultiSelectionCard";
import { TransformSection } from "./design/TransformSection";
import { TypographySection } from "./design/TypographySection";
import { AppearanceSection } from "./design/AppearanceSection";
import { EffectsSection } from "./design/EffectsSection";
import { MediaSection } from "./design/MediaSection";
import { CounterSection } from "./design/CounterSection";
import { BindingsSection } from "./BindingsSection";

export const DesignInspector: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    updateLayer,
    removeLayer,
    duplicateLayer,
  } = useProjectStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const selectedLayers = selectedLayerIds
    .map((id) => findLayerInTree(activeScreen.layers, id))
    .filter((l): l is Layer => l !== null);

  const isMulti = selectedLayers.length > 1;
  const selectedLayer = selectedLayers[0] || null;

  // 1. When Nothing is Selected: Canvas & Composition Settings
  if (!selectedLayer) {
    return (
      <aside className="w-[260px] h-full bg-card border-l border-border flex flex-col text-foreground select-none overflow-y-auto shrink-0">
        <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold">Canvas Settings</span>
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
            {activeScreen?.name}
          </span>
        </div>
        <CanvasSettingsCard />
      </aside>
    );
  }

  // 2. When Multiple Layers are Selected: Multi-Selection Alignment Card
  if (isMulti) {
    return (
      <aside className="w-[260px] h-full bg-card border-l border-border flex flex-col text-foreground select-none overflow-y-auto shrink-0">
        <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold">Multi-Selection</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {selectedLayers.length} layers
          </span>
        </div>
        <MultiSelectionCard selectedLayers={selectedLayers} />
      </aside>
    );
  }

  // 3. When a Single Layer is Selected: Full Contextual Properties Stack
  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case "text":
        return <Type className="h-3.5 w-3.5 text-foreground" />;
      case "chunk":
        return <Zap className="h-3.5 w-3.5 text-amber-500" />;
      case "group":
        return <Folder className="h-3.5 w-3.5 text-foreground" />;
      case "shape":
        return layer.shapeType === "circle" ? (
          <Circle className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <Square className="h-3.5 w-3.5 text-foreground" />
        );
      case "image":
        return <ImageIcon className="h-3.5 w-3.5 text-foreground" />;
      default:
        return <Square className="h-3.5 w-3.5 text-foreground" />;
    }
  };

  const isText = selectedLayer.type === "text" || selectedLayer.type === "chunk";
  const isMedia = selectedLayer.type === "image";
  const isCounter = (selectedLayer as any).isCounter || (selectedLayer as any).counterConfig;

  return (
    <aside className="w-[260px] h-full bg-card border-l border-border flex flex-col text-foreground select-none overflow-y-auto shrink-0">
      {/* Layer Header */}
      <div className="h-9 px-2.5 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          {getLayerIcon(selectedLayer)}
          {isRenaming ? (
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                if (renameValue.trim()) {
                  updateLayer(selectedLayer.id, { name: renameValue.trim() });
                }
                setIsRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (renameValue.trim()) {
                    updateLayer(selectedLayer.id, { name: renameValue.trim() });
                  }
                  setIsRenaming(false);
                } else if (e.key === "Escape") {
                  setIsRenaming(false);
                }
              }}
              className="h-6 px-1.5 bg-muted border border-primary rounded-[6px] text-[11px] text-foreground outline-none w-full font-mono"
            />
          ) : (
            <span
              onDoubleClick={() => {
                setRenameValue(selectedLayer.name);
                setIsRenaming(true);
              }}
              className="text-xs font-semibold truncate cursor-pointer hover:underline"
              title="Double click to rename"
            >
              {selectedLayer.name}
            </span>
          )}
        </div>

        {/* Quick Action Icons: Visibility, Lock, Duplicate, Delete */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() =>
              updateLayer(selectedLayer.id, { hidden: !selectedLayer.hidden })
            }
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-[6px] transition-colors"
            title={selectedLayer.hidden ? "Show layer" : "Hide layer"}
          >
            {selectedLayer.hidden ? (
              <EyeOff className="h-3 w-3 text-destructive" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </button>

          <button
            onClick={() =>
              updateLayer(selectedLayer.id, { locked: !selectedLayer.locked })
            }
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-[6px] transition-colors"
            title={selectedLayer.locked ? "Unlock layer" : "Lock layer"}
          >
            {selectedLayer.locked ? (
              <Lock className="h-3 w-3 text-amber-500" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
          </button>

          <button
            onClick={() => duplicateLayer(selectedLayer.id)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-[6px] transition-colors"
            title="Duplicate layer (Cmd+D)"
          >
            <Copy className="h-3 w-3" />
          </button>

          <button
            onClick={() => removeLayer(selectedLayer.id)}
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[6px] transition-colors"
            title="Delete layer (Backspace)"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Layer Sections Stack */}
      <div className="p-3 space-y-3">
        {/* 1. Transform Section */}
        <TransformSection layer={selectedLayer} />

        {/* 2. Kinetic Typography Section (if text) */}
        {isText && <TypographySection layer={selectedLayer} />}

        {/* 3. Media Section (if image/video) */}
        {isMedia && <MediaSection layer={selectedLayer} />}

        {/* 4. Counter Section (if kinetic counter) */}
        {isCounter && <CounterSection layer={selectedLayer} />}

        {/* 5. Appearance Section (Fill, Stroke, Squircle, Trim Paths) */}
        <AppearanceSection layer={selectedLayer} />

        {/* 6. Effects Section (Polar Drop Shadows) */}
        <EffectsSection layer={selectedLayer} />

        {/* 7. Reactive Bindings Section (Pins, Hugs, Matches, Remaps, Lags) */}
        <BindingsSection selectedLayer={selectedLayer} />
      </div>
    </aside>
  );
};
