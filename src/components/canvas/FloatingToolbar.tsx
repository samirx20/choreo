import React from "react";
import {
  Type,
  Square,
  Circle,
  FolderPlus,
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
  const { addLayer, document: doc } = useProjectStore();

  const handleAddText = (variant: "heading" | "subtitle" | "body") => {
    const config = {
      heading: {
        fontSize: 72,
        fontWeight: 800,
        content: "New Heading",
        color: "#FFFFFF",
      },
      subtitle: {
        fontSize: 36,
        fontWeight: 600,
        content: "Subtitle Text",
        color: "#A1A1AA",
      },
      body: {
        fontSize: 24,
        fontWeight: 400,
        content: "Clean body copy describing your feature.",
        color: "#D4D4D8",
      },
    }[variant];

    const newLayer: Layer = {
      id: `text_${Date.now()}`,
      name: config.content,
      type: "text",
      content: config.content,
      style: {
        x: doc.settings.width / 2 - 200,
        y: doc.settings.height / 2 - 40,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        fontFamily: "Inter",
        color: config.color,
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
        shadows: [
          {
            x: 0,
            y: 10,
            blur: 25,
            spread: -5,
            color: "rgba(0,0,0,0.5)",
          },
        ],
      },
      animation: {
        in: {
          preset: "grow",
          start: 0,
          duration: 0.6,
          easing: "smooth",
        },
      },
    };
    addLayer(newLayer);
  };

  const handleAddGroup = () => {
    const newLayer: Layer = {
      id: `group_${Date.now()}`,
      name: "New Group Card",
      type: "group",
      layout: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        align: "center",
        justifyContent: "center",
      },
      autoFit: true,
      autoLink: true,
      staggerDelay: 0.15,
      style: {
        x: doc.settings.width / 2 - 250,
        y: doc.settings.height / 2 - 150,
        width: 500,
        height: "auto",
        rotation: 0,
        opacity: 1,
        backgroundColor: "#18181b",
        padding: 32,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#27272a",
      },
      children: [],
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
        borderColor: "#3f3f46",
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
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 shadow-2xl px-2.5 py-1.5 rounded-full flex items-center gap-1">
      {/* Add Text Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors">
            <Type className="h-3.5 w-3.5 text-highlight" />
            <span>Text</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="bg-zinc-900 border-zinc-800 text-xs">
          <DropdownMenuItem onClick={() => handleAddText("heading")}>
            Heading (72px Bold)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddText("subtitle")}>
            Subtitle (36px Semibold)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddText("body")}>
            Body (24px Regular)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Shape Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors">
            <Square className="h-3.5 w-3.5 text-emerald-400" />
            <span>Shapes</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="bg-zinc-900 border-zinc-800 text-xs">
          <DropdownMenuItem onClick={() => handleAddShape("rectangle")} className="gap-2">
            <Square className="h-3 w-3" /> Rectangle / Card
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape("circle")} className="gap-2">
            <Circle className="h-3 w-3" /> Circle / Ellipse
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape("triangle")} className="gap-2">
            <Triangle className="h-3 w-3" /> Triangle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape("star")} className="gap-2">
            <Star className="h-3 w-3" /> Star
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Flex Group */}
      <button
        onClick={handleAddGroup}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <FolderPlus className="h-3.5 w-3.5 text-violet-400" />
        <span>Group</span>
      </button>

      {/* Add Media */}
      <button
        onClick={handleAddSampleImage}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
        <span>Media</span>
      </button>

      <div className="h-4 w-px bg-zinc-800 mx-0.5" />

      {/* Custom Components */}
      <button
        onClick={onOpenComponentsDrawer}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-violet-300 hover:text-violet-100 hover:bg-violet-600/20 transition-colors"
      >
        <Component className="h-3.5 w-3.5 text-violet-400" />
        <span>Components</span>
      </button>
    </div>
  );
};
