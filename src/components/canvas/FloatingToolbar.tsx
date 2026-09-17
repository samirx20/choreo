import React from "react";
import {
  MousePointer,
  Type,
  Square,
  Circle,
  CreditCard,
  Image as ImageIcon,
  Component,
  Star,
  Triangle,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";
import { THEME_TOKENS } from "@/theme/tokens";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FloatingToolbarProps {
  onOpenComponentsDrawer: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onOpenComponentsDrawer,
}) => {
  const {
    addLayer,
    document: doc,
    setEditingLayerId,
  } = useProjectStore();

  // 1-Click instant text creation with live caret focus
  const handleAddText = () => {
    const newId = `text_${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: "Text Layer",
      type: "text",
      content: "Add text",
      style: {
        x: doc.settings.width / 2 - 150,
        y: doc.settings.height / 2 - 40,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
        fontSize: 54,
        fontWeight: 800,
        fontFamily: "Inter",
        color: THEME_TOKENS.typography.headingColor,
        textAlign: "center",
      },
      animation: {
        in: {
          preset: "pop",
          start: 0,
          duration: 0.6,
          easing: "bouncy",
        },
      },
    };
    addLayer(newLayer);
    setEditingLayerId(newId);
  };

  // 1-Click Frame / Container Card creation
  const handleAddCard = () => {
    const newId = `card_${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: "Card Container",
      type: "group",
      layout: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        align: "start",
      },
      autoFit: true,
      autoLink: true,
      staggerDelay: 0.15,
      style: {
        x: doc.settings.width / 2 - 250,
        y: doc.settings.height / 2 - 175,
        width: 500,
        height: 350,
        rotation: 0,
        opacity: 1,
        backgroundColor: THEME_TOKENS.surfaces.panelBackground,
        padding: 32,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: THEME_TOKENS.surfaces.border,
        shadows: [
          {
            x: 0,
            y: 20,
            blur: 40,
            spread: -10,
            color: "rgba(0,0,0,0.4)",
          },
        ],
      },
      children: [],
    };
    addLayer(newLayer);
  };

  const handleAddShape = (shapeType: "rectangle" | "circle" | "star" | "triangle") => {
    const newLayer: Layer = {
      id: `shape_${Date.now()}`,
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
      type: "shape",
      shapeType,
      style: {
        x: doc.settings.width / 2 - 100,
        y: doc.settings.height / 2 - 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        backgroundColor:
          shapeType === "circle"
            ? THEME_TOKENS.accent.highlight
            : THEME_TOKENS.accent.primary,
        borderRadius: shapeType === "circle" ? 9999 : 16,
      },
      animation: {
        in: {
          preset: "pop",
          start: 0,
          duration: 0.6,
          easing: "bouncy",
        },
      },
    };
    addLayer(newLayer);
  };

  const handleAddSampleImage = () => {
    const newLayer: Layer = {
      id: `image_${Date.now()}`,
      name: "App Screenshot",
      type: "image",
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      objectFit: "cover",
      style: {
        x: doc.settings.width / 2 - 240,
        y: doc.settings.height / 2 - 150,
        width: 480,
        height: 300,
        rotation: 0,
        opacity: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: THEME_TOKENS.surfaces.border,
      },
      animation: {
        in: {
          preset: "slideUp",
          start: 0,
          duration: 0.7,
          easing: "smooth",
        },
      },
    };
    addLayer(newLayer);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#111111]/95 backdrop-blur-md border border-[#222222] shadow-2xl px-2.5 py-1.5 rounded-full flex items-center gap-1 text-xs select-none">
      {/* 1-Click Instant Text Tool */}
      <button
        onClick={handleAddText}
        title="1-Click Instant Text (T)"
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-foreground hover:bg-white/10 transition-colors"
      >
        <Type className="h-3.5 w-3.5 text-primary" />
        <span>Text</span>
      </button>

      {/* Frame / Card Tool */}
      <button
        onClick={handleAddCard}
        title="Add Container Card / Frame (F)"
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-foreground hover:bg-white/10 transition-colors"
      >
        <CreditCard className="h-3.5 w-3.5 text-blue-400" />
        <span>Card</span>
      </button>

      {/* Add Shape Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-foreground hover:bg-white/10 transition-colors">
            <Square className="h-3.5 w-3.5 text-emerald-400" />
            <span>Shapes</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="bg-[#171717] border-[#262626] text-xs">
          <DropdownMenuItem onClick={() => handleAddShape("rectangle")} className="gap-2 text-zinc-200">
            <Square className="h-3 w-3" /> Rectangle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape("circle")} className="gap-2 text-zinc-200">
            <Circle className="h-3 w-3" /> Circle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape("triangle")} className="gap-2 text-zinc-200">
            <Triangle className="h-3 w-3" /> Triangle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape("star")} className="gap-2 text-zinc-200">
            <Star className="h-3 w-3" /> Star
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Media */}
      <button
        onClick={handleAddSampleImage}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-foreground hover:bg-white/10 transition-colors"
      >
        <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
        <span>Media</span>
      </button>

      <div className="h-4 w-px bg-[#262626] mx-0.5" />

      {/* Custom Components */}
      <button
        onClick={onOpenComponentsDrawer}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-foreground hover:bg-white/10 transition-colors"
      >
        <Component className="h-3.5 w-3.5 text-primary" />
        <span>Components</span>
      </button>
    </div>
  );
};
