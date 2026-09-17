import React, { useState } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Split,
  Layers,
  Palette,
  Eye,
  Trash2,
  Copy,
} from "lucide-react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { Layer, GroupLayer, TextLayer, ChunkLayer, LayerStyle } from "@/types/scene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { splitTextIntoChunks, splitTextIntoWords } from "@/engine/textSplitter";

export const DesignInspector: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    updateLayer,
    updateLayerStyle,
    removeLayer,
    duplicateLayer,
    startTransaction,
    commitTransaction,
    addLayer,
  } = useProjectStore();

  const [aspectLocked, setAspectLocked] = useState(false);
  const [showFourCorners, setShowFourCorners] = useState(false);
  const [showAdvancedCss, setShowAdvancedCss] = useState(false);

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const selectedLayerId = selectedLayerIds[0];
  const selectedLayer = selectedLayerId
    ? findLayerInTree(activeScreen.layers, selectedLayerId)
    : null;

  if (!selectedLayer) {
    return (
      <aside className="w-80 h-full bg-zinc-950 border-l border-zinc-800/80 p-6 flex flex-col items-center justify-center text-center text-zinc-500 select-none">
        <Layers className="h-8 w-8 text-zinc-700 mb-2" />
        <span className="text-xs font-medium text-zinc-400">No Layer Selected</span>
        <span className="text-[11px] text-zinc-600 mt-1 max-w-[200px]">
          Click an element on the canvas or layer tree to inspect and edit design parameters.
        </span>
      </aside>
    );
  }

  const style = selectedLayer.style;

  // Handle continuous slider / drag batching
  const handleSliderValueChange = (key: keyof LayerStyle, value: any) => {
    updateLayerStyle(selectedLayer.id, { [key]: value });
  };

  // Quick alignment helpers
  const handleAlign = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const screenW = doc.settings.width;
    const screenH = doc.settings.height;
    const layerW = typeof style.width === "number" ? style.width : 200;
    const layerH = typeof style.height === "number" ? style.height : 100;

    let updates: Partial<LayerStyle> = {};

    switch (type) {
      case "left":
        updates = { x: 0 };
        break;
      case "center":
        updates = { x: Math.round((screenW - layerW) / 2) };
        break;
      case "right":
        updates = { x: screenW - layerW };
        break;
      case "top":
        updates = { y: 0 };
        break;
      case "middle":
        updates = { y: Math.round((screenH - layerH) / 2) };
        break;
      case "bottom":
        updates = { y: screenH - layerH };
        break;
    }

    updateLayerStyle(selectedLayer.id, updates);
  };

  // Text splitting triggers
  const handleSplitChunks = () => {
    if (selectedLayer.type === "text") {
      const group = splitTextIntoChunks(selectedLayer as TextLayer);
      removeLayer(selectedLayer.id);
      addLayer(group);
    }
  };

  const handleSplitWords = () => {
    if (selectedLayer.type === "text") {
      const group = splitTextIntoWords(selectedLayer as TextLayer);
      removeLayer(selectedLayer.id);
      addLayer(group);
    }
  };

  return (
    <aside className="w-80 h-full bg-background border-l border-border flex flex-col text-xs text-foreground select-none overflow-y-auto">
      {/* 1. Header & Layer Identification */}
      <div className="h-10 px-3 border-b border-border flex items-center justify-between bg-card">
        <input
          type="text"
          value={selectedLayer.name}
          onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
          className="bg-transparent text-xs font-semibold text-foreground hover:bg-muted px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary max-w-[170px] truncate"
        />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => duplicateLayer(selectedLayer.id)}
            title="Duplicate Layer"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => removeLayer(selectedLayer.id)}
            title="Delete Layer"
            className="h-6 w-6 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 2. Quick Alignment Quick-Bar */}
      <div className="h-9 px-3 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/20">
        <button
          onClick={() => handleAlign("left")}
          title="Align Left"
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleAlign("center")}
          title="Align Horizontal Center"
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleAlign("right")}
          title="Align Right"
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <div className="h-3.5 w-px bg-zinc-800" />
        <button
          onClick={() => handleAlign("top")}
          title="Align Top"
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleAlign("middle")}
          title="Align Vertical Middle"
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <Sliders className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleAlign("bottom")}
          title="Align Bottom"
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* 3. Layout Section (X, Y, W, H, Angle) */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Layout
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
              <span className="text-[10px] text-zinc-500 font-mono w-4">X</span>
              <input
                type="number"
                value={Math.round(style.x || 0)}
                onChange={(e) =>
                  updateLayerStyle(selectedLayer.id, { x: Number(e.target.value) })
                }
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
              <span className="text-[10px] text-zinc-500 font-mono w-4">Y</span>
              <input
                type="number"
                value={Math.round(style.y || 0)}
                onChange={(e) =>
                  updateLayerStyle(selectedLayer.id, { y: Number(e.target.value) })
                }
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
              <span className="text-[10px] text-zinc-500 font-mono w-4">W</span>
              <input
                type="text"
                value={style.width}
                onChange={(e) => {
                  const val = isNaN(Number(e.target.value))
                    ? e.target.value
                    : Number(e.target.value);
                  updateLayerStyle(selectedLayer.id, { width: val as any });
                }}
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setAspectLocked(!aspectLocked)}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded"
              title={aspectLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
            >
              {aspectLocked ? (
                <Lock className="h-3 w-3 text-primary" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </button>

            <div className="flex-1 flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1 gap-1">
              <span className="text-[10px] text-zinc-500 font-mono w-4">H</span>
              <input
                type="text"
                value={style.height ?? "auto"}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const val =
                    raw === "auto" || raw === "" || isNaN(Number(raw))
                      ? "auto"
                      : Number(raw);
                  updateLayerStyle(selectedLayer.id, { height: val as any });
                }}
                className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
              {(selectedLayer.type === "text" || selectedLayer.type === "chunk") &&
                style.height !== "auto" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateLayerStyle(selectedLayer.id, { height: "auto" })
                    }
                    className="text-[9px] bg-primary/20 text-primary hover:bg-primary/30 px-1 py-0.5 rounded font-mono shrink-0"
                    title="Reset to Auto Height"
                  >
                    Auto
                  </button>
                )}
            </div>
          </div>

          {/* Angle / Rotation */}
          <div className="flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
            <span className="text-[10px] text-zinc-500 font-mono w-4">∠</span>
            <input
              type="number"
              value={style.rotation || 0}
              onChange={(e) =>
                updateLayerStyle(selectedLayer.id, {
                  rotation: Number(e.target.value),
                })
              }
              className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
            />
            <span className="text-[10px] text-zinc-500">deg</span>
          </div>
        </div>

        {/* 4. Auto-Layout (CSS Flex) Section - Shown for Group layers */}
        {selectedLayer.type === "group" && (
          <div className="space-y-2 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Flex Auto-Layout
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">Auto-Fit Box</span>
                <Switch
                  checked={(selectedLayer as GroupLayer).autoFit}
                  onCheckedChange={(checked: boolean) =>
                    updateLayer(selectedLayer.id, { autoFit: checked })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
                <span className="text-[10px] text-zinc-500">Direction</span>
                <select
                  value={(selectedLayer as GroupLayer).layout?.flexDirection || "column"}
                  onChange={(e) => {
                    const group = selectedLayer as GroupLayer;
                    updateLayer(selectedLayer.id, {
                      layout: {
                        ...group.layout,
                        flexDirection: e.target.value as "row" | "column",
                      },
                    });
                  }}
                  className="bg-zinc-800 text-xs text-zinc-200 rounded px-1 py-0.5 focus:outline-none"
                >
                  <option value="column">Column</option>
                  <option value="row">Row</option>
                </select>
              </div>

              <div className="flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
                <span className="text-[10px] text-zinc-500 w-8">Gap</span>
                <input
                  type="number"
                  value={(selectedLayer as GroupLayer).layout?.gap ?? 16}
                  onChange={(e) => {
                    const group = selectedLayer as GroupLayer;
                    updateLayer(selectedLayer.id, {
                      layout: {
                        ...group.layout,
                        gap: Number(e.target.value),
                      },
                    });
                  }}
                  className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500">px</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Typography Section - Shown for Text & Chunk layers */}
        {(selectedLayer.type === "text" || selectedLayer.type === "chunk") && (
          <div className="space-y-2 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Typography
              </span>
              {/* Text Splitting buttons */}
              {selectedLayer.type === "text" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSplitChunks}
                    title="Split into Lines/Chunks"
                    className="text-[10px] flex items-center gap-1 bg-primary/15 hover:bg-primary/25 text-primary px-1.5 py-0.5 rounded border border-primary/30 font-medium"
                  >
                    <Split className="h-2.5 w-2.5" /> Chunks
                  </button>
                  <button
                    onClick={handleSplitWords}
                    title="Split into Words"
                    className="text-[10px] flex items-center gap-1 bg-secondary hover:bg-muted text-foreground px-1.5 py-0.5 rounded border border-border"
                  >
                    Words
                  </button>
                </div>
              )}
            </div>

            {/* Font Family & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={style.fontFamily || "Inter"}
                onChange={(e) =>
                  updateLayerStyle(selectedLayer.id, {
                    fontFamily: e.target.value,
                  })
                }
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded px-2 py-1 focus:outline-none"
              >
                <option value="Inter">Inter</option>
                <option value="Plus Jakarta Sans">Plus Jakarta</option>
                <option value="Playfair Display">Playfair</option>
                <option value="Fira Code">Fira Code</option>
              </select>

              <select
                value={style.fontWeight || 800}
                onChange={(e) =>
                  updateLayerStyle(selectedLayer.id, {
                    fontWeight: Number(e.target.value),
                  })
                }
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded px-2 py-1 focus:outline-none"
              >
                <option value={400}>Regular (400)</option>
                <option value={600}>Semibold (600)</option>
                <option value={700}>Bold (700)</option>
                <option value={800}>Extra Bold (800)</option>
                <option value={900}>Black (900)</option>
              </select>
            </div>

            {/* Font Size & Line Height */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
                <span className="text-[10px] text-zinc-500 w-8">Size</span>
                <input
                  type="number"
                  value={style.fontSize || 48}
                  onChange={(e) =>
                    updateLayerStyle(selectedLayer.id, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500">px</span>
              </div>

              <div className="flex items-center bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
                <span className="text-[10px] text-zinc-500 w-8">Line</span>
                <input
                  type="number"
                  step="0.1"
                  value={style.lineHeight || 1.2}
                  onChange={(e) =>
                    updateLayerStyle(selectedLayer.id, {
                      lineHeight: Number(e.target.value),
                    })
                  }
                  className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Text Align */}
            <div className="flex items-center justify-between bg-zinc-900/50 p-1 rounded border border-zinc-800/80">
              <button
                onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: "left" })}
                className={`p-1 rounded ${style.textAlign === "left" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: "center" })}
                className={`p-1 rounded ${style.textAlign === "center" || !style.textAlign ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: "right" })}
                className={`p-1 rounded ${style.textAlign === "right" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: "justify" })}
                className={`p-1 rounded ${style.textAlign === "justify" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 6. Style & Appearance */}
        <div className="space-y-3 pt-2 border-t border-zinc-800/60">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Appearance
          </span>

          {/* Opacity with Continuous Batching */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Opacity</span>
              <span className="font-mono text-zinc-300">
                {Math.round((style.opacity ?? 1) * 100)}%
              </span>
            </div>
            <Slider
              value={[(style.opacity ?? 1) * 100]}
              min={0}
              max={100}
              step={1}
              onPointerDown={startTransaction}
              onPointerUp={commitTransaction}
              onValueChange={(vals: number[]) =>
                handleSliderValueChange("opacity", (vals[0] ?? 100) / 100)
              }
            />
          </div>

          {/* Corner Radius */}
          <div className="flex items-center justify-between bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
            <span className="text-[10px] text-zinc-500">Corner Radius</span>
            <input
              type="number"
              value={typeof style.borderRadius === "number" ? style.borderRadius : 0}
              onChange={(e) =>
                updateLayerStyle(selectedLayer.id, {
                  borderRadius: Number(e.target.value),
                })
              }
              className="w-16 text-right bg-transparent text-xs text-zinc-100 focus:outline-none"
            />
            <span className="text-[10px] text-zinc-500 ml-1">px</span>
          </div>

          {/* Fill / Background Color */}
          <div className="flex items-center justify-between bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
            <span className="text-[10px] text-zinc-500">
              {selectedLayer.type === "text" || selectedLayer.type === "chunk"
                ? "Text Color"
                : "Fill"}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  selectedLayer.type === "text" || selectedLayer.type === "chunk"
                    ? style.color || "#FFFFFF"
                    : style.backgroundColor || "#18181b"
                }
                onChange={(e) => {
                  if (
                    selectedLayer.type === "text" ||
                    selectedLayer.type === "chunk"
                  ) {
                    updateLayerStyle(selectedLayer.id, { color: e.target.value });
                  } else {
                    updateLayerStyle(selectedLayer.id, {
                      backgroundColor: e.target.value,
                    });
                  }
                }}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                type="text"
                value={
                  selectedLayer.type === "text" || selectedLayer.type === "chunk"
                    ? style.color || "#FFFFFF"
                    : style.backgroundColor || "#18181b"
                }
                onChange={(e) => {
                  if (
                    selectedLayer.type === "text" ||
                    selectedLayer.type === "chunk"
                  ) {
                    updateLayerStyle(selectedLayer.id, { color: e.target.value });
                  } else {
                    updateLayerStyle(selectedLayer.id, {
                      backgroundColor: e.target.value,
                    });
                  }
                }}
                className="w-16 bg-transparent font-mono text-[11px] text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Border Width & Color */}
          <div className="flex items-center justify-between bg-zinc-900/80 rounded border border-zinc-800/80 px-2 py-1">
            <span className="text-[10px] text-zinc-500">Border</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={style.borderWidth || 0}
                onChange={(e) =>
                  updateLayerStyle(selectedLayer.id, {
                    borderWidth: Number(e.target.value),
                  })
                }
                className="w-12 text-right bg-transparent text-xs text-zinc-100 focus:outline-none"
              />
              <input
                type="color"
                value={style.borderColor || "#27272a"}
                onChange={(e) =>
                  updateLayerStyle(selectedLayer.id, {
                    borderColor: e.target.value,
                  })
                }
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* 7. Collapsible Advanced CSS & Tailwind Drawer */}
        <div className="pt-2 border-t border-zinc-800/60">
          <button
            onClick={() => setShowAdvancedCss(!showAdvancedCss)}
            className="flex items-center justify-between w-full py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
          >
            <span>Advanced CSS & Tailwind</span>
            {showAdvancedCss ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {showAdvancedCss && (
            <div className="space-y-2 mt-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Tailwind Classes</span>
                <Input
                  placeholder="e.g. ring-1 ring-primary shadow-xl"
                  value={style.tailwindClasses || ""}
                  onChange={(e) =>
                    updateLayerStyle(selectedLayer.id, {
                      tailwindClasses: e.target.value,
                    })
                  }
                  className="text-[11px] font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Custom CSS Rules</span>
                <textarea
                  rows={2}
                  placeholder="e.g. mix-blend-mode: overlay;"
                  value={style.customCss || ""}
                  onChange={(e) =>
                    updateLayerStyle(selectedLayer.id, {
                      customCss: e.target.value,
                    })
                  }
                  className="w-full bg-muted/70 border border-border rounded p-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
