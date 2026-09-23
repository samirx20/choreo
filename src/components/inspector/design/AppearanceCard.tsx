import React from "react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn } from "@/lib/utils";
import { canHaveFill, canHaveGlass, isVectorLine } from "@/utils/layerCapabilities";

interface AppearanceCardProps {
  selectedLayer: Layer;
}

export const AppearanceCard: React.FC<AppearanceCardProps> = ({ selectedLayer }) => {
  const { updateLayer, updateLayerStyle } = useProjectStore();
  const style = selectedLayer.style;

  const isText =
    selectedLayer.type === "text" ||
    selectedLayer.type === "chunk" ||
    selectedLayer.type === "counter";
  const isIcon = selectedLayer.type === "icon";

  const hasFill = (isText || isIcon)
    ? Boolean(style.color && style.color !== "transparent")
    : Boolean(style.backgroundColor !== undefined && style.backgroundColor !== "transparent");

  const hasBgFill = Boolean(style.backgroundColor && style.backgroundColor !== "transparent");
  const hasStroke = Boolean(style.borderWidth && style.borderWidth > 0);
  const hasShadow = Boolean(
    (style.shadowBlur !== undefined && style.shadowBlur > 0) ||
    (style.shadowDistance !== undefined && style.shadowDistance > 0) ||
    (style.shadows && style.shadows.length > 0) ||
    style.shadowMode === "hard"
  );
  const hasStickerBorder = Boolean(style.stickerBorder && style.stickerBorder.width > 0);
  const hasLayerBlur = Boolean(style.filterBlur && style.filterBlur > 0);
  const hasBgBlur = Boolean(style.backdropBlur && style.backdropBlur > 0);
  const hasGlass = (selectedLayer as any).isGlass === true || (style as any).isGlass === true;

  return (
    <div className="border-t border-border divide-y divide-border/50">
      {/* 1. Fill Checkbox (Omitted for 1D Vector Lines) */}
      {canHaveFill(selectedLayer) && (
        <div className="py-2.5 space-y-2">
          <div
            onClick={() => {
              if (isText || isIcon) {
                updateLayerStyle(selectedLayer.id, {
                  color: hasFill ? "transparent" : (style.color && style.color !== "transparent" ? style.color : "#18181b"),
                });
              } else {
                updateLayerStyle(selectedLayer.id, {
                  backgroundColor: hasFill ? "transparent" : (style.backgroundColor && style.backgroundColor !== "transparent" ? style.backgroundColor : "#B3B3B3"),
                });
              }
            }}
            className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
          >
            <span className="text-xs font-semibold text-foreground">{isText ? "Text Color" : "Fill"}</span>
            <Checkbox checked={hasFill} className="pointer-events-none" />
          </div>

          {hasFill && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Color</span>
              <div className="flex items-center gap-1.5 w-36 justify-end">
                <Input
                  type="text"
                  value={
                    (((isText || isIcon) ? style.color : style.backgroundColor) || "#B3B3B3").includes("gradient")
                      ? "Gradient"
                      : (((isText || isIcon) ? style.color : style.backgroundColor) || "#B3B3B3").replace("#", "").toUpperCase()
                  }
                  readOnly={Boolean((((isText || isIcon) ? style.color : style.backgroundColor) || "").includes("gradient"))}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                    if (clean.length === 6 || clean.length === 3) {
                      const c = `#${clean}`;
                      if (isText || isIcon) updateLayerStyle(selectedLayer.id, { color: c });
                      else updateLayerStyle(selectedLayer.id, { backgroundColor: c });
                    }
                  }}
                  className="h-7 w-20 bg-muted rounded px-2 text-center text-xs font-mono uppercase text-foreground outline-none border-border"
                />
                <ColorPicker
                  value={((isText || isIcon) ? style.color : style.backgroundColor) || "#B3B3B3"}
                  onChange={(c) => {
                    if (isText || isIcon) updateLayerStyle(selectedLayer.id, { color: c });
                    else updateLayerStyle(selectedLayer.id, { backgroundColor: c });
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1b. Background Fill for Text / Chunks / Badges */}
      {isText && (
        <div className="py-2.5 space-y-2">
          <div
            onClick={() => {
              updateLayerStyle(selectedLayer.id, {
                backgroundColor: hasBgFill ? "transparent" : (style.backgroundColor && style.backgroundColor !== "transparent" ? style.backgroundColor : "#f4f4f5"),
              });
            }}
            className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
          >
            <span className="text-xs font-semibold text-foreground">Background</span>
            <Checkbox checked={hasBgFill} className="pointer-events-none" />
          </div>

          {hasBgFill && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Color</span>
              <div className="flex items-center gap-1.5 w-36 justify-end">
              <Input
                type="text"
                value={
                  (style.backgroundColor || "#f4f4f5").includes("gradient")
                    ? "Gradient"
                    : (style.backgroundColor || "#f4f4f5").replace("#", "").toUpperCase()
                }
                readOnly={Boolean(style.backgroundColor?.includes("gradient"))}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
                  if (clean.length === 6 || clean.length === 3) {
                    updateLayerStyle(selectedLayer.id, { backgroundColor: `#${clean}` });
                  }
                }}
                className="h-7 w-20 bg-muted rounded px-2 text-center text-xs font-mono uppercase text-foreground outline-none border-border"
              />
              <ColorPicker
                value={style.backgroundColor || "#f4f4f5"}
                onChange={(c) => {
                  updateLayerStyle(selectedLayer.id, { backgroundColor: c });
                }}
              />
            </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Stroke Checkbox / Line Width & Color */}
      {!isIcon && (
        <div className="py-2.5 space-y-2">
          <div
            onClick={() => {
              if (isVectorLine(selectedLayer)) return;
              const nextStroke = !hasStroke;
              updateLayerStyle(selectedLayer.id, {
                borderWidth: nextStroke ? 2 : 0,
                borderColor: nextStroke ? "#18181b" : "transparent",
                ...(nextStroke
                  ? {
                      shadowBlur: 0,
                      shadowDistance: 0,
                      shadowOpacity: 0,
                      elevation: 0,
                      shadows: [],
                    }
                  : {}),
              });
            }}
            className={cn(
              "flex items-center justify-between py-1.5 px-2 -mx-2 rounded select-none transition-colors",
              isVectorLine(selectedLayer) ? "cursor-default" : "hover:bg-muted cursor-pointer"
            )}
          >
            <span className="text-xs font-semibold text-foreground">
              {isVectorLine(selectedLayer) ? "Line Stroke" : "Stroke"}
            </span>
            <Checkbox checked={isVectorLine(selectedLayer) ? true : hasStroke} className="pointer-events-none" />
          </div>

          {(hasStroke || isVectorLine(selectedLayer)) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Width</span>
              <div className="flex items-center gap-1.5 w-36 justify-end">
                <ScrubbableInput
                  value={
                    typeof style.borderWidth === "number" && style.borderWidth > 0
                      ? style.borderWidth
                      : (selectedLayer as any).strokeWidth || 2
                  }
                  step={1}
                  min={1}
                  onChange={(val) => {
                    updateLayerStyle(selectedLayer.id, {
                      borderWidth: val,
                      shadowBlur: 0,
                      shadowDistance: 0,
                      shadowOpacity: 0,
                      elevation: 0,
                      shadows: [],
                    });
                    if (selectedLayer.type === "line") {
                      updateLayer(selectedLayer.id, { strokeWidth: val } as any);
                    }
                  }}
                  className="w-16"
                />
                <ColorPicker
                  value={
                    style.borderColor && style.borderColor !== "transparent"
                      ? style.borderColor
                      : (selectedLayer as any).strokeColor || "#18181b"
                  }
                  onChange={(c) => {
                    updateLayerStyle(selectedLayer.id, { borderColor: c, backgroundColor: "transparent" });
                    if (selectedLayer.type === "line") {
                      updateLayer(selectedLayer.id, { strokeColor: c } as any);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Shadow Checkbox */}
      {!isVectorLine(selectedLayer) && (
        <div className="py-2.5 space-y-2">
        <div
          onClick={() => {
            const nextShadow = !hasShadow;
            updateLayerStyle(selectedLayer.id, {
              shadowBlur: nextShadow ? (style.shadowMode === "hard" ? 0 : 16) : 0,
              shadowDistance: nextShadow ? 8 : 0,
              shadowAngle: nextShadow ? (style.shadowAngle ?? 90) : undefined,
              shadowColor: style.shadowColor || "#000000",
              shadowOpacity: nextShadow ? (style.shadowOpacity ?? 0.25) : 0,
              shadowMode: nextShadow ? (style.shadowMode || "soft") : undefined,
            });
          }}
          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
        >
          <span className="text-xs font-semibold text-foreground">Shadow</span>
          <Checkbox checked={hasShadow} className="pointer-events-none" />
        </div>

        {hasShadow && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <div className="grid grid-cols-2 gap-1 bg-muted p-0.5 rounded border border-border/40 w-36">
                <button
                  type="button"
                  onClick={() =>
                    updateLayerStyle(selectedLayer.id, {
                      shadowMode: "soft",
                      shadowBlur: style.shadowBlur === 0 ? 16 : (style.shadowBlur || 16),
                    })
                  }
                  className={cn(
                    "py-1 text-[10px] font-medium rounded transition-colors text-center cursor-pointer",
                    (style.shadowMode || "soft") === "soft"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Soft
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateLayerStyle(selectedLayer.id, {
                      shadowMode: "hard",
                      shadowBlur: 0,
                    })
                  }
                  className={cn(
                    "py-1 text-[10px] font-medium rounded transition-colors text-center cursor-pointer",
                    style.shadowMode === "hard"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Hard (Zine)
                </button>
              </div>
            </div>

            {style.shadowMode !== "hard" && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Blur</span>
                <div className="w-36 flex justify-end">
                  <ScrubbableInput
                    value={style.shadowBlur ?? 16}
                    step={1}
                    min={0}
                    onChange={(val) =>
                      updateLayerStyle(selectedLayer.id, {
                        shadowBlur: val,
                      })
                    }
                    className="w-20"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Distance</span>
              <div className="w-36 flex justify-end">
                <ScrubbableInput
                  value={style.shadowDistance || 8}
                  step={1}
                  min={0}
                  onChange={(val) =>
                    updateLayerStyle(selectedLayer.id, {
                      shadowDistance: val,
                    })
                  }
                  className="w-20"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 4. Sticker / Die-Cut Border Checkbox */}
      {!isVectorLine(selectedLayer) && !isIcon && !isText && (
        <div className="py-2.5 space-y-2">
        <div
          onClick={() => {
            const nextSticker = !hasStickerBorder;
            updateLayerStyle(selectedLayer.id, {
              stickerBorder: nextSticker
                ? { width: 4, color: "#ffffff" }
                : undefined,
            });
          }}
          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
        >
          <span className="text-xs font-semibold text-foreground">Sticker border</span>
          <Checkbox checked={hasStickerBorder} className="pointer-events-none" />
        </div>

        {hasStickerBorder && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Width</span>
              <div className="w-36 flex justify-end">
                <ScrubbableInput
                  value={style.stickerBorder?.width || 4}
                  step={1}
                  min={1}
                  max={24}
                  onChange={(val) =>
                    updateLayerStyle(selectedLayer.id, {
                      stickerBorder: {
                        width: val,
                        color: style.stickerBorder?.color || "#ffffff",
                      },
                    })
                  }
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Color</span>
              <div className="flex items-center gap-1.5 w-36 justify-end">
                <Input
                  type="text"
                  value={(style.stickerBorder?.color || "#ffffff").replace("#", "").toUpperCase()}
                  onChange={(e) =>
                    updateLayerStyle(selectedLayer.id, {
                      stickerBorder: {
                        width: style.stickerBorder?.width || 4,
                        color: `#${e.target.value}`,
                      },
                    })
                  }
                  className="h-7 w-20 bg-muted rounded px-2 text-center text-xs font-mono uppercase text-foreground outline-none border-border"
                />
                <ColorPicker
                  value={style.stickerBorder?.color || "#ffffff"}
                  onChange={(c) =>
                    updateLayerStyle(selectedLayer.id, {
                      stickerBorder: {
                        width: style.stickerBorder?.width || 4,
                        color: c,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 5. Layer Blur Checkbox */}
      <div className="py-2.5 space-y-2">
        <div
          onClick={() =>
            updateLayerStyle(selectedLayer.id, {
              filterBlur: hasLayerBlur ? 0 : 8,
            })
          }
          className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
        >
          <span className="text-xs font-semibold text-foreground">Layer blur</span>
          <Checkbox checked={hasLayerBlur} className="pointer-events-none" />
        </div>

        {hasLayerBlur && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Blur</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={style.filterBlur || 8}
                step={1}
                min={0}
                onChange={(val) => updateLayerStyle(selectedLayer.id, { filterBlur: val })}
                className="w-20"
              />
            </div>
          </div>
        )}
      </div>

      {/* 6. Background Blur Checkbox */}
      {canHaveGlass(selectedLayer) && (
        <div className="py-2.5 space-y-2">
          <div
            onClick={() =>
              updateLayerStyle(selectedLayer.id, {
                backdropBlur: hasBgBlur ? 0 : 16,
              })
            }
            className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
          >
            <span className="text-xs font-semibold text-foreground">Background blur</span>
            <Checkbox checked={hasBgBlur} className="pointer-events-none" />
          </div>

          {hasBgBlur && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Blur</span>
              <div className="w-36 flex justify-end">
                <ScrubbableInput
                  value={style.backdropBlur || 16}
                  step={1}
                  min={0}
                  onChange={(val) => updateLayerStyle(selectedLayer.id, { backdropBlur: val })}
                  className="w-20"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Glass Checkbox */}
      {/* 7. Glass Checkbox */}
      {canHaveGlass(selectedLayer) && (
        <div className="py-2.5 space-y-2">
          <div
            onClick={() => {
              const nextGlass = !hasGlass;
              updateLayer(selectedLayer.id, { isGlass: nextGlass } as any);
              updateLayerStyle(selectedLayer.id, { isGlass: nextGlass } as any);
            }}
            className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-muted cursor-pointer select-none transition-colors"
          >
            <span className="text-xs font-semibold text-foreground">Glass</span>
            <Checkbox checked={hasGlass} className="pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};
