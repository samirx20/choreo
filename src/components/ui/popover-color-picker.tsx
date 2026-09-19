import React from "react";
import { ColorPickerPopover } from "@/components/inspector/color/ColorPickerPopover";
import { ScrubbableInput } from "./scrubbable-input";
import { cn } from "@/lib/utils";

export interface PopoverColorPickerProps {
  color: string;
  opacity?: number;
  onChangeColor: (hex: string) => void;
  onChangeOpacity?: (op: number) => void;
  className?: string;
  showOpacity?: boolean;
}

export const PopoverColorPicker: React.FC<PopoverColorPickerProps> = ({
  color = "#ffffff",
  opacity = 1,
  onChangeColor,
  onChangeOpacity,
  className,
  showOpacity = true,
}) => {
  const safeHex = color.startsWith("#") ? color : `#${color}`;

  return (
    <div className={cn("flex items-center gap-1.5 w-full select-none", className)}>
      {/* Color Picker Swatch Trigger */}
      <ColorPickerPopover color={safeHex} onChange={onChangeColor}>
        <button
          type="button"
          className="h-6 w-6 rounded-[6px] border border-border hover:border-foreground/30 transition-colors shrink-0 shadow-xs relative overflow-hidden flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: safeHex }}
          title="Click to open color palette & eyedropper"
        >
          {/* Subtle checkerboard backing if alpha is present */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,#88888825_25%,transparent_25%),linear-gradient(-45deg,#88888825_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#88888825_75%),linear-gradient(-45deg,transparent_75%,#88888825_75%)] bg-[size:8px_8px]" />
        </button>
      </ColorPickerPopover>

      {/* Hex Text Box */}
      <div className="flex-1 h-6 px-1.5 rounded-[8px] bg-muted/60 border border-input hover:border-border focus-within:border-primary flex items-center transition-colors min-w-0">
        <span className="text-[10px] text-muted-foreground font-mono mr-0.5 select-none">#</span>
        <input
          type="text"
          value={safeHex.replace("#", "").toUpperCase()}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
            if (val.length === 6 || val.length === 3) {
              onChangeColor(`#${val}`);
            }
          }}
          className="w-full bg-transparent text-foreground text-[11px] font-mono outline-none uppercase truncate"
          maxLength={6}
        />
      </div>

      {/* Opacity % Scrubber */}
      {showOpacity && onChangeOpacity && (
        <div className="w-[60px] shrink-0">
          <ScrubbableInput
            label="Op"
            value={Math.round(opacity * 100)}
            onChange={(val) => onChangeOpacity(Math.max(0, Math.min(100, val)) / 100)}
            suffix="%"
            min={0}
            max={100}
            step={1}
          />
        </div>
      )}
    </div>
  );
};
