import React from "react";
import { Type } from "lucide-react";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";
import { CompactSegmentedControl } from "@/components/ui/compact-segmented-control";

interface KineticTypographySectionProps {
  splitBy?: "all" | "word" | "character";
  onChangeSplitBy: (val: "all" | "word" | "character") => void;
  staggerDelay?: number;
  onChangeStaggerDelay: (val: number) => void;
}

export const KineticTypographySection: React.FC<KineticTypographySectionProps> = ({
  splitBy = "all",
  onChangeSplitBy,
  staggerDelay = 0.08,
  onChangeStaggerDelay,
}) => {
  return (
    <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-0.5">
        <span className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-slate-400" />
          Kinetic Text Stagger
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <CompactSegmentedControl
          value={splitBy}
          onChange={(v) => onChangeSplitBy(v as "all" | "word" | "character")}
          options={[
            { value: "all", label: "Whole Block" },
            { value: "word", label: "By Word" },
            { value: "character", label: "By Char" },
          ]}
        />

        {splitBy !== "all" && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1">
              <ScrubbableInput
                label="Stagger"
                unit="s"
                value={staggerDelay}
                min={0.01}
                max={0.5}
                step={0.01}
                decimals={2}
                onChange={onChangeStaggerDelay}
              />
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex-1">
              {splitBy === "word" ? "Cascade delay per word" : "Cascade delay per character"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
