import React from "react";
import { Hash } from "lucide-react";
import { Layer } from "@/types/scene";
import { useProjectStore } from "@/store/useProjectStore";
import { MinimalSection } from "@/components/ui/minimal-section";
import { ScrubbableInput } from "@/components/ui/scrubbable-input";

interface CounterSectionProps {
  layer: Layer;
}

export const CounterSection: React.FC<CounterSectionProps> = ({ layer }) => {
  const { updateLayer } = useProjectStore();

  const isCounter = (layer as any).isCounter || (layer as any).counterConfig;
  if (!isCounter) return null;

  const cfg = (layer as any).counterConfig || {};
  const startVal = cfg.startValue ?? 0;
  const endVal = cfg.endValue ?? 100;
  const prefix = cfg.prefix ?? "";
  const suffix = cfg.suffix ?? "";
  const decimals = cfg.decimals ?? 0;

  const updateConfig = (patch: Record<string, any>) => {
    updateLayer(layer.id, {
      counterConfig: { ...cfg, ...patch },
    } as any);
  };

  return (
    <MinimalSection title="Kinetic Counter" icon={Hash} defaultOpen={true}>
      <div className="space-y-2">
        {/* Start & End Values */}
        <div className="grid grid-cols-2 gap-1.5">
          <ScrubbableInput
            label="From"
            value={startVal}
            onChange={(val) => updateConfig({ startValue: val })}
          />
          <ScrubbableInput
            label="To"
            value={endVal}
            onChange={(val) => updateConfig({ endValue: val })}
          />
        </div>

        {/* Prefix, Suffix & Decimals */}
        <div className="grid grid-cols-3 gap-1">
          <div className="h-6 px-1.5 rounded-[8px] bg-muted/60 border border-input focus-within:border-primary flex items-center">
            <span className="text-[10px] text-muted-foreground font-mono mr-1">Pre</span>
            <input
              type="text"
              value={prefix}
              onChange={(e) => updateConfig({ prefix: e.target.value })}
              placeholder="$"
              className="w-full bg-transparent text-foreground text-[11px] font-mono outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="h-6 px-1.5 rounded-[8px] bg-muted/60 border border-input focus-within:border-primary flex items-center">
            <span className="text-[10px] text-muted-foreground font-mono mr-1">Suf</span>
            <input
              type="text"
              value={suffix}
              onChange={(e) => updateConfig({ suffix: e.target.value })}
              placeholder="k"
              className="w-full bg-transparent text-foreground text-[11px] font-mono outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ScrubbableInput
            label="Dec"
            value={decimals}
            onChange={(val) => updateConfig({ decimals: Math.max(0, Math.min(4, val)) })}
            min={0}
            max={4}
          />
        </div>
      </div>
    </MinimalSection>
  );
};
