import React from "react";
import {
  Type,
  Folder,
  BoxSelect,
  Minus,
  ArrowUpRight,
  Circle,
  Star,
  Triangle,
  Hexagon,
  Square,
  ImageIcon,
  Film,
  Timer,
  Box,
  Smile,
  icons,
  CircleDashed,
} from "lucide-react";
import type { Layer } from "@/types/layers";

interface LayerIconProps {
  layer: Layer;
  className?: string;
}

export const LayerIcon: React.FC<LayerIconProps> = ({ layer, className = "h-3.5 w-3.5" }) => {
  if (layer.isMask) {
    return <CircleDashed className={className} />;
  }

  switch (layer.type) {
    case "text":
    case "chunk":
      return <Type className={className} />;

    case "counter":
      return <Timer className={className} />;

    case "group":
      if ((layer as any).isMaskGroup) {
        return <CircleDashed className={className} />;
      }
      return <Folder className={className} />;

    case "frame":
      return <BoxSelect className={className} />;

    case "line": {
      const isArrow =
        (layer as any).arrowEnd === "arrow" ||
        (layer as any).arrowStart === "arrow" ||
        (layer as any).shapeType === "arrow";
      return isArrow ? (
        <ArrowUpRight className={className} />
      ) : (
        <Minus className={className} />
      );
    }

    case "polygon": {
      const sides = (layer as any).sides;
      return sides === 3 ? (
        <Triangle className={className} />
      ) : (
        <Hexagon className={className} />
      );
    }

    case "shape": {
      const shapeType = (layer as any).shapeType;
      if (shapeType === "circle" || shapeType === "ellipse") {
        return <Circle className={className} />;
      }
      if (shapeType === "star") {
        return <Star className={className} />;
      }
      if (shapeType === "triangle") {
        return <Triangle className={className} />;
      }
      if (shapeType === "line") {
        return <Minus className={className} />;
      }
      if (shapeType === "arrow") {
        return <ArrowUpRight className={className} />;
      }
      if (shapeType === "polygon") {
        return <Hexagon className={className} />;
      }
      return <Square className={className} />;
    }

    case "image":
      return <ImageIcon className={className} />;

    case "video":
      return <Film className={className} />;

    case "mockup3d":
      return <Box className={className} />;

    case "icon": {
      const iconName = (layer as any).iconName;
      const IconComp = (icons as Record<string, React.FC<any>>)[iconName] || Smile;
      return <IconComp className={className} />;
    }

    default:
      return <Square className={className} />;
  }
};
