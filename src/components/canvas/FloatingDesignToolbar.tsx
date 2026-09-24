import React, { useRef, useState } from "react";
import {
  MousePointer2,
  LayoutGrid,
  BoxSelect,
  Type,
  Square,
  Circle,
  Star,
  Triangle,
  Hexagon,
  Minus,
  ArrowUpRight,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  Smile,
  Component,
  PenTool,
  Pencil,
  FileCode,
  ListOrdered,
} from "lucide-react";
import { useProjectStore, CanvasTool } from "@/store/useProjectStore";
import { THEME_TOKENS } from "@/theme/tokens";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconPickerPopover } from "./IconPickerPopover";
import { StaggerPopover } from "./StaggerPopover";

interface FloatingDesignToolbarProps {
  onOpenAiBar?: () => void;
  onOpenComponentsDrawer?: () => void;
}

export const FloatingDesignToolbar: React.FC<FloatingDesignToolbarProps> = ({
  onOpenAiBar,
  onOpenComponentsDrawer,
}) => {
  const {
    activeTool,
    setTool,
    addScreen,
    addLayer,
    activeScreenId,
    document: doc,
    selectedLayerIds,
  } = useProjectStore();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const svgInputRef = useRef<HTMLInputElement>(null);
  const [selectedShape, setSelectedShape] = useState<CanvasTool>("rectangle");
  const [selectedVectorTool, setSelectedVectorTool] = useState<"pen" | "pencil">("pen");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isStaggerOpen, setIsStaggerOpen] = useState(false);

  React.useEffect(() => {
    const handleOpenStagger = () => setIsStaggerOpen(true);
    window.addEventListener("motion-open-stagger-popover", handleOpenStagger);
    return () => window.removeEventListener("motion-open-stagger-popover", handleOpenStagger);
  }, []);

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  const handleInsertIcon = (name: string) => {
    const sWidth = activeScreen.width ?? doc.settings.width;
    const sHeight = activeScreen.height ?? doc.settings.height;
    const size = 64;
    const existingCount = activeScreen?.layers.length ?? 0;
    const start = existingCount * 0.5;
    const layerId = `icon_${Date.now()}`;
    addLayer({
      id: layerId,
      name: name,
      type: "icon",
      iconName: name,
      strokeWidth: 2,
      style: {
        x: Math.round((sWidth - size) / 2),
        y: Math.round((sHeight - size) / 2),
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
        color: "#ffffff",
        backgroundColor: "transparent",
      },
      animation: {
        in: {
          preset: "pop",
          start,
          duration: 0.5,
          easing: "bouncy",
        },
        clips: [
          {
            id: `clip_${Date.now()}`,
            preset: "pop",
            type: "in",
            start,
            duration: 0.5,
            easing: "bouncy",
            params: { popScale: 1.15, fade: true },
          },
        ],
      },
    });
  };

  const handleToolClick = (tool: CanvasTool) => {
    if (tool === "media") {
      imageInputRef.current?.click();
      return;
    }
    if (tool === "artboard") {
      addScreen();
      return;
    }
    if (activeTool === tool) {
      setTool("select");
    } else {
      setTool(tool);
    }
  };

  const isShapeActive = [
    "rectangle",
    "circle",
    "star",
    "triangle",
    "polygon",
    "line",
    "arrow",
  ].includes(activeTool);

  const isVectorActive = activeTool === "pen" || activeTool === "pencil";

  const handleSelectVectorTool = (tool: "pen" | "pencil") => {
    setSelectedVectorTool(tool);
    setTool(tool);
  };

  const getShapeIcon = (tool: CanvasTool) => {
    switch (tool) {
      case "circle":
        return <Circle className="h-4 w-4" />;
      case "star":
        return <Star className="h-4 w-4" />;
      case "triangle":
        return <Triangle className="h-4 w-4" />;
      case "polygon":
        return <Hexagon className="h-4 w-4" />;
      case "line":
        return <Minus className="h-4 w-4" />;
      case "arrow":
        return <ArrowUpRight className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  const handleSelectShape = (tool: CanvasTool) => {
    setSelectedShape(tool);
    setTool(tool);
  };

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const textReader = new FileReader();
    textReader.onload = (event) => {
      const svgText = event.target?.result as string;
      if (svgText) {
        useProjectStore.getState().importSvg(svgText, undefined, file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    textReader.readAsText(file);
    e.target.value = "";
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const textReader = new FileReader();
      textReader.onload = (event) => {
        const svgText = event.target?.result as string;
        if (svgText) {
          useProjectStore.getState().importSvg(svgText, undefined, file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      textReader.readAsText(file);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.naturalWidth || 400;
        let height = img.naturalHeight || 300;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const sWidth = activeScreen.width ?? doc.settings.width;
        const sHeight = activeScreen.height ?? doc.settings.height;
        const cleanName = file.name.replace(/\.[^/.]+$/, "");

        const existingCount = activeScreen?.layers.length ?? 0;
        const start = existingCount * 0.5;

        addLayer({
          id: `image_${Date.now()}`,
          name: cleanName || "Image",
          type: "image",
          src: dataUrl,
          objectFit: "cover",
          style: {
            x: Math.round((sWidth - width) / 2),
            y: Math.round((sHeight - height) / 2),
            width,
            height,
            rotation: 0,
            opacity: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME_TOKENS.surfaces.border,
          },
          animation: {
            in: {
              preset: "fade",
              start,
              duration: 0.6,
              easing: "smooth",
            },
            clips: [
              {
                id: `clip_${Date.now()}`,
                preset: "fade",
                type: "in",
                start,
                duration: 0.6,
                easing: "smooth",
                params: { fade: true },
              },
            ],
          },
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-[#18181b]/90 backdrop-blur-md border border-[#27272a] shadow-2xl px-2 py-1.5 rounded-full select-none text-white transition-all animate-in fade-in zoom-in-95 duration-150"
      data-testid="floating-design-toolbar"
    >
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />
      <input
        type="file"
        ref={svgInputRef}
        onChange={handleSvgUpload}
        accept=".svg,image/svg+xml"
        className="hidden"
      />

      {/* Select Tool (V) */}
      <button
        type="button"
        onClick={() => handleToolClick("select")}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all",
          activeTool === "select"
            ? "bg-white text-zinc-950 shadow-xs font-semibold"
            : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
        )}
        title="Select Tool (V)"
      >
        <MousePointer2 className="h-4 w-4 fill-current" />
      </button>

      {/* Add Artboard / Scene (A) */}
      <button
        type="button"
        onClick={() => handleToolClick("artboard")}
        className="h-8 w-8 rounded-full flex items-center justify-center text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors"
        title="Add Artboard / Scene (A)"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>

      {/* Add Frame (F) */}
      <button
        type="button"
        onClick={() => handleToolClick("frame")}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all",
          activeTool === "frame"
            ? "bg-white text-zinc-950 shadow-xs font-semibold"
            : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
        )}
        title="Frame Container (F)"
      >
        <BoxSelect className="h-4 w-4" />
      </button>

      <div className="h-4 w-px bg-[#3f3f46] mx-0.5" />

      {/* Text Tool (T) */}
      <button
        type="button"
        onClick={() => handleToolClick("text")}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all font-serif font-bold text-sm",
          activeTool === "text"
            ? "bg-white text-zinc-950 shadow-xs font-semibold"
            : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
        )}
        title="Text (T)"
      >
        <Type className="h-4 w-4" />
      </button>

      {/* Shapes Dropdown (R, O, Triangle, Star, Polygon, Line, Arrow) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-8 px-2 rounded-full flex items-center gap-1 transition-all",
              isShapeActive
                ? "bg-white text-zinc-950 shadow-xs font-semibold"
                : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
            )}
            title="Shapes & Lines"
          >
            {getShapeIcon(isShapeActive ? activeTool : selectedShape)}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          sideOffset={10}
          align="center"
          className="w-44 bg-[#18181b]/95 border-[#27272a] text-zinc-200 p-1.5 shadow-2xl rounded-xl"
        >
          <DropdownMenuItem
            onClick={() => handleSelectShape("rectangle")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Square className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Rectangle</span>
            <span className="text-[10px] text-zinc-500 font-mono">R</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectShape("circle")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Circle className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Ellipse</span>
            <span className="text-[10px] text-zinc-500 font-mono">O</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectShape("triangle")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Triangle className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Triangle</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectShape("star")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Star className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Star</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectShape("polygon")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Hexagon className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Polygon</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#27272a] my-1" />

          <DropdownMenuItem
            onClick={() => handleSelectShape("line")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Minus className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Line</span>
            <span className="text-[10px] text-zinc-500 font-mono">L</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectShape("arrow")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <ArrowUpRight className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Arrow</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-[#3f3f46] mx-0.5" />

      {/* Vector Drawing Dropdown (Pen P, Pencil Shift+P) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-8 px-2 rounded-full flex items-center gap-1 transition-all",
              isVectorActive
                ? "bg-white text-zinc-950 shadow-xs font-semibold"
                : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
            )}
            title="Vector Drawing (Pen & Pencil)"
          >
            {activeTool === "pencil" || (activeTool !== "pen" && selectedVectorTool === "pencil") ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <PenTool className="h-4 w-4" />
            )}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          sideOffset={10}
          align="center"
          className="w-44 bg-[#18181b]/95 border-[#27272a] text-zinc-200 p-1.5 shadow-2xl rounded-xl"
        >
          <DropdownMenuItem
            onClick={() => handleSelectVectorTool("pen")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <PenTool className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Pen</span>
            <span className="text-[10px] text-zinc-500 font-mono">P</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelectVectorTool("pencil")}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <Pencil className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Pencil</span>
            <span className="text-[10px] text-zinc-500 font-mono">Shift+P</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-[#3f3f46] mx-0.5" />

      {/* Media Dropdown (Image & Vector SVG) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-8 px-2 rounded-full flex items-center gap-1 text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors"
            title="Import Media (Image or SVG)"
          >
            <ImageIcon className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          sideOffset={10}
          align="center"
          className="w-48 bg-[#18181b]/95 border-[#27272a] text-zinc-200 p-1.5 shadow-2xl rounded-xl"
        >
          <DropdownMenuItem
            onClick={() => imageInputRef.current?.click()}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <ImageIcon className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Image</span>
            <span className="text-[10px] text-zinc-500 font-mono">PNG, JPG</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => svgInputRef.current?.click()}
            className="gap-2.5 cursor-pointer hover:bg-white/10 text-xs py-2 px-2.5 rounded-lg"
          >
            <FileCode className="h-4 w-4 text-zinc-400" />
            <span className="flex-1">Vector SVG</span>
            <span className="text-[10px] text-zinc-500 font-mono">.svg</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Lucide Icon Library (1,555 icons) */}
      <DropdownMenu open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-all",
              isIconPickerOpen
                ? "bg-white text-zinc-950 shadow-xs font-semibold"
                : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
            )}
            title="Icons (1,555 Lucide Icons)"
          >
            <Smile className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          sideOffset={12}
          align="center"
          className="p-0 border-0 bg-transparent shadow-none"
        >
          <IconPickerPopover
            onSelectIcon={(name) => {
              handleInsertIcon(name);
              setIsIconPickerOpen(false);
            }}
            onClose={() => setIsIconPickerOpen(false)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Kinetic Stagger Cascade (Shift+S) */}
      {selectedLayerIds.length >= 2 && (
        <>
          <div className="h-4 w-px bg-[#3f3f46] mx-0.5" />
          <DropdownMenu open={isStaggerOpen} onOpenChange={setIsStaggerOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                  isStaggerOpen
                    ? "bg-white text-zinc-950 shadow-xs font-semibold"
                    : "text-[#a1a1aa] hover:text-white hover:bg-white/10"
                )}
                title="Stagger Animations (Shift+S)"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              sideOffset={12}
              align="center"
              className="p-0 border-0 bg-transparent shadow-none"
            >
              <StaggerPopover onClose={() => setIsStaggerOpen(false)} />
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Component Library Drawer (⊞) */}
      {onOpenComponentsDrawer && (
        <button
          type="button"
          onClick={onOpenComponentsDrawer}
          className="h-8 w-8 rounded-full flex items-center justify-center text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors"
          title="Component Library (⊞)"
        >
          <Component className="h-4 w-4" />
        </button>
      )}

      {/* AI Assistant Wand */}
      {onOpenAiBar && (
        <button
          type="button"
          onClick={onOpenAiBar}
          className="h-8 w-8 rounded-full flex items-center justify-center text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors"
          title="AI Assistant (Cmd+K)"
        >
          <Sparkles className="h-4 w-4 text-foreground" />
        </button>
      )}
    </div>
  );
};
