import React, { useState, useMemo } from "react";
import { icons, Search, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconPickerPopoverProps {
  onSelectIcon: (iconName: string) => void;
  onClose?: () => void;
  selectedIconName?: string;
}

// Curated popular icons for immediate quick selection
const POPULAR_ICONS = [
  "Sparkles",
  "Zap",
  "Heart",
  "Star",
  "Smile",
  "Flame",
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "ChevronRight",
  "ChevronDown",
  "Check",
  "X",
  "Plus",
  "Play",
  "Pause",
  "Volume2",
  "Music",
  "Video",
  "Image",
  "Camera",
  "Smartphone",
  "Laptop",
  "Monitor",
  "Cloud",
  "Download",
  "Upload",
  "Share2",
  "Send",
  "Mail",
  "MessageSquare",
  "User",
  "Users",
  "Settings",
  "Search",
  "Bell",
  "Clock",
  "Calendar",
  "Globe",
  "Lock",
  "Key",
  "Shield",
  "Tag",
  "Bookmark",
  "Eye",
  "Copy",
  "Trash2",
  "Folder",
  "File",
  "Terminal",
  "Code",
  "Cpu",
  "BatteryCharging",
  "Wifi",
  "Layers",
  "Box",
  "Component",
  "Grid",
  "Compass",
];

const CATEGORIES: Record<string, string[]> = {
  Popular: POPULAR_ICONS,
  Arrows: [
    "ArrowRight",
    "ArrowLeft",
    "ArrowUp",
    "ArrowDown",
    "ArrowUpRight",
    "ArrowDownLeft",
    "ChevronRight",
    "ChevronLeft",
    "ChevronUp",
    "ChevronDown",
    "ChevronsRight",
    "MoveRight",
    "CornerDownRight",
    "Repeat",
    "RefreshCw",
  ],
  Media: [
    "Play",
    "Pause",
    "Square",
    "FastForward",
    "Rewind",
    "Volume2",
    "VolumeX",
    "Music",
    "Video",
    "Camera",
    "Mic",
    "Headphones",
    "Radio",
    "Film",
  ],
  Design: [
    "Palette",
    "PenTool",
    "Brush",
    "Crop",
    "Layers",
    "Sparkles",
    "Wand2",
    "Contrast",
    "Sun",
    "Moon",
    "Shapes",
    "Scissors",
    "Eye",
    "Sliders",
  ],
  Tech: [
    "Smartphone",
    "Laptop",
    "Monitor",
    "Tablet",
    "Tv",
    "Watch",
    "Cpu",
    "Database",
    "Server",
    "Wifi",
    "Bluetooth",
    "BatteryCharging",
    "Terminal",
    "Code2",
  ],
};

export const IconPickerPopover: React.FC<IconPickerPopoverProps> = ({
  onSelectIcon,
  onClose,
  selectedIconName,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Popular");

  // All 1,555 Lucide icon keys sorted alphabetically
  const allIconNames = useMemo(() => {
    return Object.keys(icons).sort();
  }, []);

  // Filter icons based on query or active category
  const filteredIconNames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return allIconNames.filter((name) => name.toLowerCase().includes(q));
    }
    if (activeCategory === "All") {
      return allIconNames;
    }
    return CATEGORIES[activeCategory] || POPULAR_ICONS;
  }, [searchQuery, activeCategory, allIconNames]);

  // Render top 120 icons for instant 60fps rendering without DOM lag
  const [displayCount, setDisplayCount] = useState(100);
  const displayedIcons = useMemo(() => {
    return filteredIconNames.slice(0, displayCount);
  }, [filteredIconNames, displayCount]);

  return (
    <div
      className="w-84 bg-[#18181b]/95 backdrop-blur-xl border border-[#27272a] text-zinc-200 shadow-2xl rounded-2xl p-3 select-none flex flex-col gap-2.5 max-h-[440px]"
      data-testid="icon-picker-popover"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header & Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5 text-white" />
          <span>Lucide Icons</span>
          <span className="text-[10px] text-zinc-500 font-mono">({allIconNames.length})</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setDisplayCount(100);
          }}
          placeholder="Search 1,555 icons..."
          autoFocus
          className="w-full h-8 pl-8 pr-7 bg-zinc-900 border border-[#27272a] rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 p-0.5 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Category Pills (Only when not actively searching) */}
      {!searchQuery && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          {["Popular", "Arrows", "Media", "Design", "Tech", "All"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setDisplayCount(100);
              }}
              className={cn(
                "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors",
                activeCategory === cat
                  ? "bg-white text-zinc-950 font-semibold shadow-xs"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Icon Grid */}
      <div className="grid grid-cols-6 gap-1 overflow-y-auto max-h-60 p-0.5 pr-1 text-zinc-400">
        {displayedIcons.length === 0 ? (
          <div className="col-span-6 py-8 text-center text-xs text-zinc-500">
            No icons found for &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          displayedIcons.map((name) => {
            const IconComp = (icons as Record<string, React.FC<any>>)[name];
            if (!IconComp) return null;
            const isSelected = selectedIconName === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelectIcon(name)}
                title={name}
                className={cn(
                  "h-10 rounded-lg flex flex-col items-center justify-center p-1 transition-all cursor-pointer group relative",
                  isSelected
                    ? "bg-white/15 text-white border border-white/20 font-medium"
                    : "hover:bg-white/10 hover:text-white text-zinc-300"
                )}
              >
                <IconComp className="h-4 w-4 shrink-0 transition-transform group-hover:scale-115" />
                <span className="text-[8px] truncate w-full text-center mt-0.5 opacity-60 group-hover:opacity-100">
                  {name}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer / Load More */}
      {filteredIconNames.length > displayedIcons.length && (
        <button
          type="button"
          onClick={() => setDisplayCount((prev) => prev + 100)}
          className="text-center text-[10px] text-zinc-300 hover:text-white py-1 font-medium cursor-pointer"
        >
          Load more ({filteredIconNames.length - displayedIcons.length} remaining)
        </button>
      )}
    </div>
  );
};
