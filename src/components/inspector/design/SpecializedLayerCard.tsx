import React, { useState } from "react";
import { icons, Smile, Sparkles, ArrowLeftRight } from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { IconPickerPopover } from "@/components/canvas/IconPickerPopover";
import { isStar, isMedia, canHaveTrimPath } from "@/utils/layerCapabilities";

interface SpecializedLayerCardProps {
  selectedLayer: Layer;
}

export const SpecializedLayerCard: React.FC<SpecializedLayerCardProps> = ({
  selectedLayer,
}) => {
  const { updateLayer, updateLayerStyle } = useProjectStore();
  const [isInspectorIconPickerOpen, setIsInspectorIconPickerOpen] = useState(false);
  const style = selectedLayer.style;

  const isLine =
    selectedLayer.type === "line" ||
    (selectedLayer.type === "shape" &&
      (selectedLayer.shapeType === "line" || selectedLayer.shapeType === "arrow"));

  const isPolygon =
    selectedLayer.type === "polygon" ||
    (selectedLayer.type === "shape" &&
      (selectedLayer.shapeType === "polygon" || selectedLayer.shapeType === "triangle"));

  return (
    <>
      {/* Frame Container & Auto-Layout Section */}
      {selectedLayer.type === "frame" && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Clip content</span>
            <Checkbox
              checked={(selectedLayer as any).clipContent !== false}
              onCheckedChange={(checked) =>
                updateLayer(selectedLayer.id, { clipContent: Boolean(checked) } as any)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Direction</span>
            <div className="w-28">
              <Select
                value={(selectedLayer as any).layout?.flexDirection || "row"}
                onValueChange={(val) =>
                  updateLayer(selectedLayer.id, {
                    layout: {
                      ...(selectedLayer as any).layout,
                      display: "flex",
                      flexDirection: val as "row" | "column",
                    },
                  } as any)
                }
              >
                <SelectTrigger className="w-28 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="row">Horizontal</SelectItem>
                  <SelectItem value="column">Vertical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Gap</span>
            <div className="w-28 flex justify-end">
              <ScrubbableInput
                value={(selectedLayer as any).layout?.gap ?? 0}
                step={1}
                min={0}
                onChange={(val) =>
                  updateLayer(selectedLayer.id, {
                    layout: {
                      ...(selectedLayer as any).layout,
                      gap: Math.round(val),
                    },
                  } as any)
                }
                className="w-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Star Parametric Section */}
      {isStar(selectedLayer) && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Points</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={(selectedLayer as any).points ?? 5}
                step={1}
                min={3}
                max={20}
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { points: Math.round(val) } as any)
                }
                className="w-16"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Inner ratio</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={Math.round(((selectedLayer as any).innerRadiusRatio ?? 0.382) * 100)}
                step={1}
                min={10}
                max={90}
                suffix="%"
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { innerRadiusRatio: val / 100 } as any)
                }
                className="w-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Polygon Sides Section */}
      {isPolygon && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Sides</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={
                  (selectedLayer as any).sides ??
                  (selectedLayer.type === "shape" && selectedLayer.shapeType === "triangle"
                    ? 3
                    : 5)
                }
                step={1}
                min={3}
                max={12}
                onChange={(val) => {
                  if (selectedLayer.type === "polygon") {
                    updateLayer(selectedLayer.id, { sides: Math.round(val) } as any);
                  } else {
                    updateLayer(selectedLayer.id, {
                      sides: Math.round(val),
                      shapeType: val === 3 ? "triangle" : "polygon",
                    } as any);
                  }
                }}
                className="w-16"
              />
            </div>
          </div>
        </div>
      )}

      {/* Line & Arrow Controls */}
      {isLine && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Start marker</span>
            <div className="w-28">
              <Select
                value={(selectedLayer as any).arrowStart || "none"}
                onValueChange={(val) =>
                  updateLayer(selectedLayer.id, { arrowStart: val } as any)
                }
              >
                <SelectTrigger className="w-28 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="arrow">Arrow</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">End marker</span>
            <div className="w-28">
              <Select
                value={
                  (selectedLayer as any).arrowEnd ||
                  ((selectedLayer as any).shapeType === "arrow" ? "arrow" : "none")
                }
                onValueChange={(val) =>
                  updateLayer(selectedLayer.id, { arrowEnd: val } as any)
                }
              >
                <SelectTrigger className="w-28 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="arrow">Arrow</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Line Cap</span>
            <div className="w-28">
              <Select
                value={(selectedLayer as any).strokeCap || "round"}
                onValueChange={(val) =>
                  updateLayer(selectedLayer.id, { strokeCap: val } as any)
                }
              >
                <SelectTrigger className="w-28 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="butt">Butt</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pattern</span>
            <div className="w-28">
              <Select
                value={
                  !(selectedLayer as any).strokeDashArray || (selectedLayer as any).strokeDashArray.length === 0
                    ? "solid"
                    : (selectedLayer as any).strokeDashArray[0] > 4
                    ? "dashed"
                    : "dotted"
                }
                onValueChange={(val) => {
                  const dash = val === "dashed" ? [8, 6] : val === "dotted" ? [2, 4] : [];
                  updateLayer(selectedLayer.id, { strokeDashArray: dash } as any);
                }}
              >
                <SelectTrigger className="w-28 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const start = (selectedLayer as any).arrowStart || "none";
              const end =
                (selectedLayer as any).arrowEnd ||
                ((selectedLayer as any).shapeType === "arrow" ? "arrow" : "none");
              updateLayer(selectedLayer.id, {
                arrowStart: end,
                arrowEnd: start,
              } as any);
            }}
            className="w-full h-7 mt-1 flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Reverse Direction
          </button>
        </div>
      )}

      {/* Vector Trim Path Section */}
      {canHaveTrimPath(selectedLayer) && (
        <div className="pt-3 border-t border-border space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Trim Path</h4>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Start</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={(selectedLayer as any).trimStart ?? 0}
                step={1}
                min={0}
                max={100}
                suffix="%"
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { trimStart: Math.round(val) } as any)
                }
                className="w-20"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">End</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={(selectedLayer as any).trimEnd ?? 100}
                step={1}
                min={0}
                max={100}
                suffix="%"
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { trimEnd: Math.round(val) } as any)
                }
                className="w-20"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Offset</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={(selectedLayer as any).trimOffset ?? 0}
                step={1}
                min={0}
                max={100}
                suffix="%"
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { trimOffset: Math.round(val) } as any)
                }
                className="w-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Media (Image & Video) Controls */}
      {isMedia(selectedLayer) && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Fit</span>
            <div className="w-28">
              <Select
                value={(selectedLayer as any).objectFit || (selectedLayer as any).fit || "cover"}
                onValueChange={(val) =>
                  updateLayer(selectedLayer.id, {
                    objectFit: val,
                    fit: val,
                  } as any)
                }
              >
                <SelectTrigger className="w-28 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Icon Controls */}
      {selectedLayer.type === "icon" && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Icon</span>
            <DropdownMenu
              open={isInspectorIconPickerOpen}
              onOpenChange={setIsInspectorIconPickerOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 bg-muted hover:bg-muted/80 border border-border rounded text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {(() => {
                    const CurrentIcon =
                      (icons as Record<string, React.FC<any>>)[
                        (selectedLayer as any).iconName
                      ] || Sparkles;
                    return <CurrentIcon className="h-3.5 w-3.5" />;
                  })()}
                  <span>{(selectedLayer as any).iconName || "Select"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="left"
                align="start"
                className="p-0 border-0 bg-transparent shadow-none z-50"
              >
                <IconPickerPopover
                  selectedIconName={(selectedLayer as any).iconName}
                  onSelectIcon={(name) => {
                    updateLayer(selectedLayer.id, { iconName: name, name } as any);
                    setIsInspectorIconPickerOpen(false);
                  }}
                  onClose={() => setIsInspectorIconPickerOpen(false)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Stroke width</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={
                  (selectedLayer as any).strokeWidth ??
                  style.borderWidth ??
                  2
                }
                step={0.5}
                min={0.5}
                max={10}
                onChange={(val) => {
                  updateLayer(selectedLayer.id, { strokeWidth: val } as any);
                  updateLayerStyle(selectedLayer.id, { borderWidth: val });
                }}
                className="w-16"
              />
            </div>
          </div>
        </div>
      )}

      {/* Counter Controls */}
      {selectedLayer.type === "counter" && (
        <div className="pt-3 border-t border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Counter</span>
            <div className="w-40">
              <Select
                value={(selectedLayer as any).counterMode || "odometer"}
                onValueChange={(val) =>
                  updateLayer(selectedLayer.id, {
                    counterMode: val,
                    odometerRoll: val === "odometer",
                  } as any)
                }
              >
                <SelectTrigger className="w-40 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="odometer">Odometer Roll</SelectItem>
                  <SelectItem value="smooth">Smooth Continuous</SelectItem>
                  <SelectItem value="stepped">Stepped Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Start value</span>
              <ScrubbableInput
                value={(selectedLayer as any).startValue ?? 0}
                step={1}
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { startValue: val } as any)
                }
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">End value</span>
              <ScrubbableInput
                value={(selectedLayer as any).endValue ?? 100}
                step={1}
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { endValue: val } as any)
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Prefix</span>
              <Input
                type="text"
                value={(selectedLayer as any).prefix || ""}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, { prefix: e.target.value } as any)
                }
                placeholder="e.g. $"
                className="w-full h-8 px-2 bg-muted border-border rounded text-xs text-foreground outline-none"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium">Suffix</span>
              <Input
                type="text"
                value={(selectedLayer as any).suffix || ""}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, { suffix: e.target.value } as any)
                }
                placeholder="e.g. % or /mo"
                className="w-full h-8 px-2 bg-muted border-border rounded text-xs text-foreground outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Decimals</span>
            <div className="w-36 flex justify-end">
              <ScrubbableInput
                value={(selectedLayer as any).decimals ?? 0}
                step={1}
                min={0}
                max={5}
                onChange={(val) =>
                  updateLayer(selectedLayer.id, { decimals: Math.round(val) } as any)
                }
                className="w-16"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Grouping (1,000s)</span>
            <Checkbox
              checked={(selectedLayer as any).useGrouping !== false}
              onCheckedChange={(checked) =>
                updateLayer(selectedLayer.id, { useGrouping: Boolean(checked) } as any)
              }
            />
          </div>
        </div>
      )}
    </>
  );
};
