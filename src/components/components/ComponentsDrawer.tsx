import React, { useState } from "react";
import {
  Component,
  X,
  Plus,
  Sparkles,
  Layers,
  CreditCard,
  MousePointerClick,
  Award,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const sampleComponents: {
    id: string;
    name: string;
    category: string;
    icon: React.ElementType;
    description: string;
    createLayer: () => Layer;
  }[] = [
    {
      id: "comp_neon_button",
      name: "Neon CTA Button",
      category: "Buttons",
      icon: MousePointerClick,
      description: "Pill button with glowing border and pop-in entrance",
      createLayer: () => ({
        id: `btn_${Date.now()}`,
        name: "Neon CTA Button",
        type: "text",
        content: "Get Started Free →",
        style: {
          x: doc.settings.width / 2 - 130,
          y: doc.settings.height / 2 - 30,
          width: "auto",
          height: "auto",
          rotation: 0,
          opacity: 1,
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "Inter",
          color: "#FFFFFF",
          backgroundColor: "#8b5cf6",
          padding: [14, 28, 14, 28],
          borderRadius: 9999,
          shadows: [
            { x: 0, y: 10, blur: 25, spread: -5, color: "rgba(139,92,246,0.6)" },
          ],
        },
        animation: {
          in: {
            preset: "pop",
            start: 0,
            duration: 0.6,
            easing: "bouncy",
          },
        },
      }),
    },
    {
      id: "comp_glass_card",
      name: "Glassmorphism Card",
      category: "Cards",
      icon: CreditCard,
      description: "Translucent backdrop blurred container with slide entrance",
      createLayer: () => ({
        id: `glass_card_${Date.now()}`,
        name: "Glassmorphism Card",
        type: "group",
        layout: {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          align: "center",
          justifyContent: "center",
        },
        autoFit: true,
        autoLink: true,
        staggerDelay: 0.15,
        style: {
          x: doc.settings.width / 2 - 200,
          y: doc.settings.height / 2 - 120,
          width: 400,
          height: "auto",
          rotation: 0,
          opacity: 1,
          backgroundColor: "rgba(24, 24, 27, 0.75)",
          backdropBlur: 20,
          padding: 32,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.15)",
          shadows: [
            { x: 0, y: 20, blur: 40, spread: -10, color: "rgba(0,0,0,0.5)" },
          ],
        },
        children: [
          {
            id: `glass_title_${Date.now()}`,
            name: "Card Title",
            type: "text",
            content: "Glassmorphism UI",
            style: {
              x: 0,
              y: 0,
              width: "auto",
              height: "auto",
              rotation: 0,
              opacity: 1,
              fontSize: 32,
              fontWeight: 800,
              fontFamily: "Inter",
              color: "#FFFFFF",
            },
            animation: {
              in: {
                preset: "pop",
                start: 0,
                duration: 0.5,
                easing: "smooth",
              },
            },
          },
        ],
        animation: {
          in: {
            preset: "slideUp",
            start: 0,
            duration: 0.6,
            easing: "smooth",
          },
        },
      }),
    },
    {
      id: "comp_badge",
      name: "Product Badge",
      category: "Badges",
      icon: Award,
      description: "Pill chip for callouts and updates",
      createLayer: () => ({
        id: `badge_${Date.now()}`,
        name: "Feature Badge",
        type: "text",
        content: "✨ NEW RELEASE",
        style: {
          x: doc.settings.width / 2 - 80,
          y: doc.settings.height / 2 - 20,
          width: "auto",
          height: "auto",
          rotation: 0,
          opacity: 1,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "Inter",
          color: "#A78BFA",
          backgroundColor: "rgba(139, 92, 246, 0.15)",
          borderWidth: 1,
          borderColor: "rgba(139, 92, 246, 0.3)",
          padding: [6, 14, 6, 14],
          borderRadius: 9999,
        },
        animation: {
          in: {
            preset: "pop",
            start: 0,
            duration: 0.5,
            easing: "bouncy",
          },
        },
      }),
    },
  ];

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
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl rounded-2xl p-5 flex flex-col gap-4 text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
              <Component className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Custom Components</h2>
              <p className="text-[11px] text-zinc-500">
                Stamp animated templates onto your canvas with 1 click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab("project")}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "project"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Project Library
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "global"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
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
              className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-violet-400 transition-colors">
                  <comp.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      {comp.name}
                    </span>
                    <Badge variant="secondary" className="text-[9px] py-0 h-4">
                      {comp.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {comp.description}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleInsert(comp.createLayer)}
                className="h-7 text-xs px-2.5 gap-1 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30"
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
