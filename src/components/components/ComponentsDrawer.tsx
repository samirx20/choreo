import React, { useState } from "react";
import { Component, X, Plus } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getComponentTemplates } from "./templates/componentTemplates";

interface ComponentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComponentsDrawer: React.FC<ComponentsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { addLayer, document: doc } = useProjectStore();
  const [activeTab, setActiveTab] = useState<"project" | "global">("project");

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sampleComponents = getComponentTemplates(doc);

  const handleInsert = (creator: () => Layer) => {
    const layer = creator();
    addLayer(layer);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl p-5 flex flex-col gap-4 text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center justify-center">
              <Component className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Custom Components</h2>
              <p className="text-[11px] text-muted-foreground">
                Stamp animated templates onto your canvas with 1 click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border text-xs">
          <button
            onClick={() => setActiveTab("project")}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "project"
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Project Library
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "global"
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Global Presets
          </button>
        </div>

        {/* Component List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {sampleComponents.map((comp) => (
            <div
              key={comp.id}
              className="p-3 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary hover:border-primary/40 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <comp.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {comp.name}
                    </span>
                    <Badge variant="secondary" className="text-[9px] py-0 h-4">
                      {comp.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {comp.description}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleInsert(comp.createLayer)}
                className="h-7 text-xs px-2.5 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <Plus className="h-3 w-3" /> Insert
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
