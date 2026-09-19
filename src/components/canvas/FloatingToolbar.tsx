import React, { useRef, useState } from "react";
import {
  MousePointer2,
  Hand,
  Type,
  Square,
  Circle,
  Star,
  Triangle,
  Image as ImageIcon,
  Component,
  ChevronDown,
  Upload,
  Sparkles,
  Heading,
  AlignLeft,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { Layer } from "@/types/scene";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  onOpenComponentsDrawer: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onOpenComponentsDrawer,
}) => {
  const {
    activeTool,
    setTool,
    addLayer,
    document: doc,
    uiMode,
  } = useProjectStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedShape, setSelectedShape] = useState<"rectangle" | "circle" | "star" | "triangle">("rectangle");

  // Handle native OS image / video upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      if (isVideo) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        const newLayer: Layer = {
          id: `video_${Date.now()}`,
          name: cleanName || "Video Layer",
          type: "image",
          src: dataUrl,
          objectFit: "cover",
          style: {
            x: Math.round(doc.settings.width / 2 - 320),
            y: Math.round(doc.settings.height / 2 - 180),
            width: 640,
            height: 360,
            rotation: 0,
            opacity: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.1)",
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
        return;
      }

      // Image dimension extraction
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

        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        const newLayer: Layer = {
          id: `image_${Date.now()}`,
          name: cleanName || "Image Layer",
          type: "image",
          src: dataUrl,
          objectFit: "cover",
          style: {
            x: Math.round(doc.settings.width / 2 - width / 2),
            y: Math.round(doc.settings.height / 2 - height / 2),
            width,
            height,
            rotation: 0,
            opacity: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.1)",
            shadows: [
              {
                x: 0,
                y: 20,
                blur: 40,
                spread: -10,
                color: "rgba(0,0,0,0.25)",
              },
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
        };
        addLayer(newLayer);
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Sleek modern vector graphic
  const handleInsertSampleGraphic = () => {
    const svgData = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" rx="24" fill="%231e293b"/><circle cx="300" cy="200" r="110" fill="%2338bdf8" opacity="0.85"/><circle cx="370" cy="230" r="75" fill="%23f59e0b" opacity="0.75" style="mix-blend-mode: screen;"/></svg>`;

    const newLayer: Layer = {
      id: `media_${Date.now()}`,
      name: "Vector Graphic",
      type: "image",
      src: svgData,
      objectFit: "cover",
      style: {
        x: Math.round(doc.settings.width / 2 - 300),
        y: Math.round(doc.settings.height / 2 - 200),
        width: 600,
        height: 400,
        rotation: 0,
        opacity: 1,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
        shadows: [
          {
            x: 0,
            y: 25,
            blur: 50,
            spread: -10,
            color: "rgba(0,0,0,0.2)",
          },
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
    };
    addLayer(newLayer);
  };

  const insertTextPreset = (content: string, fontSize: number, fontWeight: string) => {
    const newLayer: Layer = {
      id: `text_${Date.now()}`,
      name: content,
      type: "text",
      content,
      style: {
        x: Math.round(doc.settings.width / 2 - 220),
        y: Math.round(doc.settings.height / 2 - fontSize * 0.7),
        width: 440,
        height: Math.round(fontSize * 1.5),
        fontSize,
        fontWeight,
        color: "#0f172a",
        boxMode: "point",
        lineHeight: 1.2,
        letterSpacing: -0.5,
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: "fadeUp",
          start: 0,
          duration: 0.5,
          easing: "smooth",
        },
      },
    };
    addLayer(newLayer);
  };

  const getShapeIcon = () => {
    switch (selectedShape) {
      case "circle":
        return <Circle className="h-4 w-4" />;
      case "star":
        return <Star className="h-4 w-4" />;
      case "triangle":
        return <Triangle className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  const isShapeActive = ["rectangle", "circle", "star", "triangle"].includes(activeTool);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-200",
          "h-11 px-2.5 rounded-[20px] bg-card/95 backdrop-blur-md border border-border shadow-xl flex items-center gap-1 select-none",
          uiMode === "motion" || uiMode === "animate" ? "top-3.5" : "bottom-6"
        )}
      >
        {/* Hidden Native File Input for Real Image/Video Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,video/mp4"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* 1. Move Tool (V) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTool("select")}
              className={cn(
                "h-8 px-2.5 rounded-[12px] flex items-center gap-1.5 text-xs font-medium transition-all",
                activeTool === "select"
                  ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <MousePointer2 className="h-4 w-4" />
              <span>Select</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Select / Move (V)</TooltipContent>
        </Tooltip>

        {/* 2. Hand Tool (H) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTool("hand")}
              className={cn(
                "h-8 w-8 rounded-[12px] flex items-center justify-center transition-all",
                activeTool === "hand"
                  ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Hand className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Hand Tool (H) - Pan canvas</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border mx-1" />

        {/* 3. Text Tool with Dropdown */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTool("text")}
                className={cn(
                  "h-8 pl-2.5 pr-1.5 rounded-l-[12px] flex items-center gap-1.5 text-xs font-medium transition-all",
                  activeTool === "text"
                    ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Type className="h-4 w-4" />
                <span>Text</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Text Tool (T) - Click canvas to type</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "h-8 px-1 rounded-r-[12px] flex items-center justify-center transition-all",
                  activeTool === "text"
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-48 p-1 rounded-[12px]">
              <DropdownMenuItem
                onClick={() => setTool("text")}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Type className="h-4 w-4 text-muted-foreground" />
                <span>Text Tool</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">T</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => insertTextPreset("Heading", 72, "700")}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Heading className="h-4 w-4 text-muted-foreground" />
                <span>Heading</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">72px</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => insertTextPreset("Subheading", 40, "600")}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Heading className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Subheading</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">40px</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => insertTextPreset("Body text paragraph goes here", 22, "400")}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <span>Body</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">22px</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 4. Shapes Tool Dropdown */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTool(selectedShape)}
                className={cn(
                  "h-8 pl-2.5 pr-1.5 rounded-l-[12px] flex items-center gap-1.5 text-xs font-medium transition-all capitalize",
                  isShapeActive
                    ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {getShapeIcon()}
                <span>{selectedShape}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Shape Tool ({selectedShape.charAt(0).toUpperCase() + selectedShape.slice(1)}) (R)
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "h-8 px-1 rounded-r-[12px] flex items-center justify-center transition-all",
                  isShapeActive
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-44 p-1 rounded-[12px]">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedShape("rectangle");
                  setTool("rectangle");
                }}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Square className="h-4 w-4 text-muted-foreground" />
                <span>Rectangle</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">R</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedShape("circle");
                  setTool("circle");
                }}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>Circle</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">O</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedShape("star");
                  setTool("star");
                }}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Star</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedShape("triangle");
                  setTool("triangle");
                }}
                className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
              >
                <Triangle className="h-4 w-4 text-muted-foreground" />
                <span>Triangle</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 5. Media Tool Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "h-8 px-2.5 rounded-[12px] flex items-center gap-1.5 text-xs font-medium transition-all",
                activeTool === "media"
                  ? "bg-accent text-accent-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              title="Place Image or Video (Cmd+Shift+K)"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Media</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="center" side="top" className="w-52 p-1 rounded-[12px]">
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span>Upload Image / Video...</span>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌘⇧K</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleInsertSampleGraphic}
              className="gap-2 py-1.5 cursor-pointer rounded-[8px]"
            >
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span>Insert Vector Graphic</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-1" />

        {/* 6. Components Drawer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenComponentsDrawer}
              className="h-8 px-2.5 rounded-[12px] flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <Component className="h-4 w-4" />
              <span>Components</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Components & Templates Library</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
