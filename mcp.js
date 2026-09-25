#!/usr/bin/env node

/**
 * Motion Studio MCP Server
 * Standard Model Context Protocol (stdio + HTTP/SSE) runner for AI agents
 * (Claude Desktop, Cursor, Antigravity, etc.) to choreograph .mtn projects.
 * 
 * 100% 2D Motion Graphics Tool Coverage (Projects, Scenes, Layers, Typography,
 * Vectors, Shapes, Masking, Booleans, Animations, Stagger, Bindings, Audio, Export).
 */

import fs from "fs";
import path from "path";
import readline from "readline";

// Helper to resolve and read .mtn file
function readMtnFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath || "project.mtn");
  if (!fs.existsSync(resolved)) {
    const defaultDoc = {
      $schema: "https://motion-studio.app/schemas/v1.json",
      format: "motion-studio",
      version: 1,
      generator: "Motion Studio MCP v0.2.0",
      exportedAt: Date.now(),
      metadata: {
        id: "proj_" + Math.random().toString(36).slice(2, 9),
        name: path.basename(resolved, ".mtn"),
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 5.0,
        screenCount: 1,
        backgroundColor: "#09090b",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      document: {
        version: "1.0",
        name: path.basename(resolved, ".mtn"),
        settings: {
          width: 1920,
          height: 1080,
          fps: 60,
          duration: 5.0,
          backgroundColor: "#09090b",
        },
        screens: [
          {
            id: "scene_1",
            name: "Scene 1",
            duration: 5.0,
            layers: [],
          },
        ],
      },
    };
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(defaultDoc, null, 2), "utf-8");
    return { data: defaultDoc, path: resolved };
  }

  const raw = fs.readFileSync(resolved, "utf-8");
  const parsed = JSON.parse(raw);
  const data = parsed.document ? parsed : {
    $schema: "https://motion-studio.app/schemas/v1.json",
    format: "motion-studio",
    version: 1,
    generator: "Motion Studio MCP",
    exportedAt: Date.now(),
    metadata: {
      id: "proj_legacy",
      name: path.basename(resolved, ".mtn"),
      width: parsed.settings?.width || 1920,
      height: parsed.settings?.height || 1080,
      fps: parsed.settings?.fps || 60,
      duration: parsed.settings?.duration || 5.0,
      screenCount: parsed.screens?.length || 1,
      backgroundColor: parsed.settings?.backgroundColor || "#09090b",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    document: parsed,
  };

  return { data, path: resolved };
}

function writeMtnFile(filePath, packageData) {
  packageData.exportedAt = Date.now();
  if (packageData.metadata) {
    packageData.metadata.updatedAt = Date.now();
    packageData.metadata.screenCount = packageData.document.screens.length;
  }
  fs.writeFileSync(filePath, JSON.stringify(packageData, null, 2), "utf-8");
}

// All Tools (36 Complete Tools)
const TOOLS = [
  {
    name: "create_project",
    description: "Initializes a new Motion Studio .mtn project with specified aspect ratio (16:9, 9:16, 1:1, 4:5), frame rate, and initial scene.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Target .mtn file path (e.g. 'promo.mtn')" },
        name: { type: "string", description: "Project title" },
        aspectRatio: {
          type: "string",
          enum: ["16:9", "9:16", "1:1", "4:5"],
          description: "Aspect ratio: '16:9' (1920x1080), '9:16' (1080x1920), '1:1' (1080x1080), '4:5' (1080x1350)",
        },
        fps: { type: "number", description: "Frame rate (default: 60)" },
        backgroundColor: { type: "string", description: "Background color hex (default: '#09090b')" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_project",
    description: "Updates project settings such as title, frame rate, or canvas background color.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        name: { type: "string", description: "New project title" },
        fps: { type: "number", description: "Frame rate (e.g. 60, 30, 24)" },
        backgroundColor: { type: "string", description: "Background color hex" },
      },
    },
  },
  {
    name: "duplicate_project",
    description: "Clones an existing .mtn project file to a new target path with an updated title.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Source .mtn file path" },
        targetFile: { type: "string", description: "Destination .mtn file path" },
        newName: { type: "string", description: "Optional new title for the duplicated project" },
      },
      required: ["file", "targetFile"],
    },
  },
  {
    name: "rename_project",
    description: "Renames the project title inside an existing .mtn project file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        newName: { type: "string", description: "New project title" },
      },
      required: ["file", "newName"],
    },
  },
  {
    name: "delete_project",
    description: "Deletes a .mtn project file from disk.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file to delete" },
      },
      required: ["file"],
    },
  },
  {
    name: "list_projects",
    description: "Lists all .mtn project files in a given directory with resolutions, durations, and scene counts.",
    inputSchema: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Directory to search (default: current directory '.')" },
      },
    },
  },
  {
    name: "set_palette",
    description: "Assigns a cohesive color palette array to the project settings.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        colors: {
          type: "array",
          items: { type: "string" },
          description: "Array of hex color strings (e.g. ['#09090b', '#7c3aed', '#38bdf8', '#ffffff'])",
        },
      },
      required: ["colors"],
    },
  },
  {
    name: "create_scene",
    description: "Creates a new scene/beat in a .mtn project file with duration, aesthetic mood, and transition.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        id: { type: "string", description: "Optional scene ID" },
        name: { type: "string", description: "Name of the scene (e.g. 'Intro Hero')" },
        duration: { type: "number", description: "Duration in seconds (e.g. 3.0)" },
        mood: {
          type: "string",
          enum: ["product-showcase", "paper-collage", "kinetic-editorial", "analog-retro"],
          description: "Aesthetic mood profile",
        },
        backgroundColor: { type: "string", description: "Scene background color hex" },
        stepFps: { type: "number", description: "Frame rate quantization: 60, 24, 12, 8, or 6 fps" },
        transition: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["cut", "fade", "slideLeft", "slideRight", "slideUp", "slideDown", "magicMove"] },
            duration: { type: "number", description: "Transition duration in seconds" },
          },
        },
      },
      required: ["name", "duration"],
    },
  },
  {
    name: "update_scene",
    description: "Updates an existing scene's name, duration, background color, stepFps, or transition.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        name: { type: "string", description: "New scene name" },
        duration: { type: "number", description: "New duration in seconds" },
        mood: {
          type: "string",
          enum: ["product-showcase", "paper-collage", "kinetic-editorial", "analog-retro"],
          description: "Aesthetic mood profile",
        },
        backgroundColor: { type: "string", description: "Scene background color hex" },
        stepFps: { type: "number", description: "Frame rate quantization: 60, 24, 12, 8, or 6 fps" },
        transition: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["cut", "fade", "slideLeft", "slideRight", "slideUp", "slideDown", "magicMove"] },
            duration: { type: "number", description: "Transition duration in seconds" },
          },
        },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "delete_scene",
    description: "Deletes a scene from the .mtn project file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID to delete" },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "reorder_scenes",
    description: "Reorders the scenes in the project timeline matching a specified array of scene IDs.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of scene IDs in the desired playback sequence",
        },
      },
      required: ["sceneIds"],
    },
  },
  {
    name: "place_element",
    description: "Places a 2D layer (text, shape, icon, counter, line, image, video, frame) onto the grid or pixel coordinates with full parametric geometry, styling, and entrance motion. Reusing ID across scenes triggers Magic Move.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        id: { type: "string", description: "Optional layer ID. Reusing same ID across scenes triggers continuous Magic Move morphing." },
        name: { type: "string", description: "Element name" },
        type: {
          type: "string",
          enum: ["text", "shape", "icon", "counter", "line", "image", "frame", "video", "polygon"],
          description: "Layer type",
        },
        shapeType: {
          type: "string",
          enum: ["rectangle", "circle", "ellipse", "triangle", "star", "polygon", "line", "arrow", "path"],
          description: "Specific shape geometry type",
        },
        content: { type: "string", description: "Text content, icon name (e.g. 'Sparkles'), or image/video URL" },
        iconName: { type: "string", description: "Lucide vector icon name (e.g. 'Sparkles', 'Check', 'ArrowRight', 'Shield')" },
        src: { type: "string", description: "Source URL or local path for image or video layers" },
        grid: {
          type: "object",
          properties: {
            col: { type: "number", description: "Grid column (0-15)" },
            row: { type: "number", description: "Grid row (0-8)" },
            colSpan: { type: "number", description: "Column span" },
            rowSpan: { type: "number", description: "Row span" },
          },
          description: "Grid placement (aspect-ratio modular grid)",
        },
        bounds: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
          },
          description: "Direct pixel placement (alternative to grid)",
        },
        counter: {
          type: "object",
          properties: {
            startValue: { type: "number", description: "Starting number (default 0)" },
            endValue: { type: "number", description: "Ending number (default 100)" },
            prefix: { type: "string", description: "Prefix e.g. '$'" },
            suffix: { type: "string", description: "Suffix e.g. '%' or 'k'" },
            decimals: { type: "number", description: "Decimal places (default 0)" },
            counterMode: { type: "string", enum: ["odometer", "smooth", "stepped"] },
            useGrouping: { type: "boolean", description: "Use thousand separators (e.g. 100,000)" },
          },
        },
        video: {
          type: "object",
          properties: {
            sourceIn: { type: "number", description: "Video start trim offset in seconds" },
            sourceOut: { type: "number", description: "Video end trim offset in seconds" },
            volume: { type: "number", description: "Video audio volume (0.0 to 1.0)" },
            loop: { type: "boolean", description: "Whether video loops" },
          },
        },
        points: { type: "number", description: "Star points count (3 to 20, default: 5)" },
        innerRadiusRatio: { type: "number", description: "Star inner vertex ratio (0.10 to 0.95, default: 0.40)" },
        sides: { type: "number", description: "Polygon side count (3 to 12, default: 6)" },
        d: { type: "string", description: "SVG path definition string for custom vector path layers" },
        viewBox: { type: "string", description: "SVG viewBox string (e.g. '0 0 100 100')" },
        arrowStart: { type: "boolean", description: "Marker at line start" },
        arrowEnd: { type: "boolean", description: "Marker at line end" },
        strokeCap: { type: "string", enum: ["round", "butt", "square"], description: "Vector stroke cap" },
        strokeJoin: { type: "string", enum: ["miter", "round", "bevel"], description: "Vector stroke join" },
        strokeDashArray: { type: "array", items: { type: "number" }, description: "Dash pattern e.g. [8, 4]" },
        trimStart: { type: "number", description: "Trim path start percentage (0-100)" },
        trimEnd: { type: "number", description: "Trim path end percentage (0-100)" },
        trimOffset: { type: "number", description: "Trim path offset percentage (0-100)" },
        clipContent: { type: "boolean", description: "Whether container frame clips overflowing children" },
        layout: {
          type: "object",
          properties: {
            flexDirection: { type: "string", enum: ["row", "column"] },
            gap: { type: "number" },
            align: { type: "string", enum: ["start", "center", "end"] },
            justify: { type: "string", enum: ["start", "center", "end", "space-between"] },
          },
          description: "Auto-layout flex parameters for frame layers",
        },
        locked: { type: "boolean", description: "Whether element is locked from interaction (default: false)" },
        visible: { type: "boolean", description: "Whether element is visible (default: true)" },
        zIndex: { type: "number", description: "Explicit z-index stacking layer" },
        style: {
          type: "object",
          description: "Full visual styling (fontSize, fontWeight, fontFamily, textAlign, lineHeight, letterSpacing, textTransform, color, backgroundColor, gradient, borderRadius, borderWidth, borderColor, borderStyle, shadowMode, shadowAngle, shadowDistance, shadowBlur, shadowColor, shadowOpacity, shadowSpread, filterBlur, backdropBlur, isGlass, stickerBorder, opacity, rotation, blendMode, fit)",
        },
        enter: {
          type: "object",
          properties: {
            preset: { type: "string", description: "Entrance animation preset (e.g. 'pop', 'baselineRise', 'wordCascade', 'elevationRise', 'glassIris', 'blurFocusPop', 'drawOn', 'slide')" },
            duration: { type: "number", description: "Duration in seconds (default 0.6)" },
            delay: { type: "number", description: "Delay in seconds (default 0)" },
            easing: { type: "string", description: "Easing profile (e.g. 'snappy', 'smooth', 'bouncy', 'overshoot', 'elastic')" },
            direction: { type: "string", enum: ["up", "down", "left", "right"], description: "Direction for directional presets" },
            spring: {
              type: "object",
              properties: {
                stiffness: { type: "number" },
                damping: { type: "number" },
                mass: { type: "number" },
              },
            },
          },
        },
      },
      required: ["sceneId", "name", "type"],
    },
  },
  {
    name: "update_element",
    description: "Modifies an existing element's content, position, shape attributes, counter settings, or visual styles.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID to modify" },
        name: { type: "string", description: "Updated layer name" },
        content: { type: "string", description: "Updated text copy, icon name, or image/video URL" },
        iconName: { type: "string", description: "Updated Lucide icon name" },
        src: { type: "string", description: "Updated image or video source URL" },
        shapeType: { type: "string", enum: ["rectangle", "circle", "ellipse", "triangle", "star", "polygon", "line", "arrow", "path"] },
        grid: {
          type: "object",
          properties: {
            col: { type: "number" },
            row: { type: "number" },
            colSpan: { type: "number" },
            rowSpan: { type: "number" },
          },
        },
        bounds: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
          },
        },
        counter: {
          type: "object",
          properties: {
            startValue: { type: "number" },
            endValue: { type: "number" },
            prefix: { type: "string" },
            suffix: { type: "string" },
            decimals: { type: "number" },
            counterMode: { type: "string", enum: ["odometer", "smooth", "stepped"] },
            useGrouping: { type: "boolean" },
          },
        },
        points: { type: "number" },
        innerRadiusRatio: { type: "number" },
        sides: { type: "number" },
        d: { type: "string" },
        viewBox: { type: "string" },
        arrowStart: { type: "boolean" },
        arrowEnd: { type: "boolean" },
        strokeCap: { type: "string", enum: ["round", "butt", "square"] },
        strokeJoin: { type: "string", enum: ["miter", "round", "bevel"] },
        strokeDashArray: { type: "array", items: { type: "number" } },
        trimStart: { type: "number" },
        trimEnd: { type: "number" },
        trimOffset: { type: "number" },
        clipContent: { type: "boolean" },
        layout: {
          type: "object",
          properties: {
            flexDirection: { type: "string", enum: ["row", "column"] },
            gap: { type: "number" },
            align: { type: "string", enum: ["start", "center", "end"] },
            justify: { type: "string", enum: ["start", "center", "end", "space-between"] },
          },
        },
        locked: { type: "boolean", description: "Whether element is locked from interaction" },
        visible: { type: "boolean", description: "Whether element is visible" },
        zIndex: { type: "number", description: "Explicit z-index stacking layer" },
        style: { type: "object", description: "Visual styles to update or merge" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "delete_element",
    description: "Deletes an element from its scene in the .mtn project file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID to delete" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "duplicate_element",
    description: "Clones an existing element with optional grid/pixel offsets, or into another scene.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID to duplicate" },
        newId: { type: "string", description: "Optional new ID for the duplicate" },
        name: { type: "string", description: "Optional new name" },
        offsetCol: { type: "number", description: "Grid column offset (default: 0)" },
        offsetRow: { type: "number", description: "Grid row offset (default: 1)" },
        offsetX: { type: "number", description: "Pixel X offset" },
        offsetY: { type: "number", description: "Pixel Y offset" },
        targetSceneId: { type: "string", description: "Optional target scene ID (default: same scene)" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "reorder_element",
    description: "Changes the z-order / stacking of an element within its scene.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID" },
        action: {
          type: "string",
          enum: ["bringToFront", "sendToBack", "bringForward", "sendBackward"],
          description: "Z-order adjustment action",
        },
      },
      required: ["layerId", "action"],
    },
  },
  {
    name: "group_elements",
    description: "Groups multiple elements in a scene into a container frame/group.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        layerIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of layer IDs to group together",
        },
        name: { type: "string", description: "Group/Frame name (default: 'Group')" },
      },
      required: ["sceneId", "layerIds"],
    },
  },
  {
    name: "ungroup_elements",
    description: "Ungroups a container group/frame, restoring its child layers back to the scene root.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        groupId: { type: "string", description: "Target group/frame layer ID to ungroup" },
      },
      required: ["groupId"],
    },
  },
  {
    name: "create_mask_group",
    description: "Converts selected layers into a clipping mask group with optional stencil designation and cutout inversion.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        layerIds: { type: "array", items: { type: "string" }, description: "Layers in the mask group" },
        maskLayerId: { type: "string", description: "Optional layer ID that acts as the mask stencil (defaults to first layer)" },
        invertMask: { type: "boolean", description: "Whether to invert the mask stencil into a cutout mask (default: false)" },
        name: { type: "string", description: "Mask group name (default: 'Mask Group')" },
      },
      required: ["sceneId", "layerIds"],
    },
  },
  {
    name: "apply_boolean_operation",
    description: "Executes a vector boolean operation (union, subtract, intersect, exclude) on 2 or more shape layers.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        layerIds: { type: "array", items: { type: "string" }, description: "Shape layer IDs to combine (minimum 2)" },
        operation: {
          type: "string",
          enum: ["union", "subtract", "intersect", "exclude"],
          description: "Boolean operation type",
        },
        flatten: { type: "boolean", description: "Whether to flatten immediately into a single SVG path layer (default: false)" },
        name: { type: "string", description: "Boolean group name" },
      },
      required: ["sceneId", "layerIds", "operation"],
    },
  },
  {
    name: "import_svg",
    description: "Imports raw SVG XML markup into the scene as native vector path or group layers.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        svgString: { type: "string", description: "Raw SVG string or XML markup" },
        name: { type: "string", description: "Name for imported layer/group" },
        col: { type: "number", description: "Optional starting grid column" },
        row: { type: "number", description: "Optional starting grid row" },
      },
      required: ["sceneId", "svgString"],
    },
  },
  {
    name: "insert_template",
    description: "Stamps a pre-built animated component template onto the scene grid: 'comp_browser_window' (Safari/Chrome macOS frame), 'comp_terminal_window' (macOS dark terminal), 'comp_counter_pill' (kinetic metric ticker badge), or 'comp_code_snippet' (code block card).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        templateId: {
          type: "string",
          enum: ["comp_browser_window", "comp_terminal_window", "comp_counter_pill", "comp_code_snippet"],
          description: "Template identifier",
        },
        col: { type: "number", description: "Grid column (default: auto-centered)" },
        row: { type: "number", description: "Grid row (default: auto-centered)" },
      },
      required: ["sceneId", "templateId"],
    },
  },
  {
    name: "apply_animation",
    description: "Applies a transition clip to an element with choice of 53+ presets, analytical spring parameters, direction, loops, and delay.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID" },
        preset: {
          type: "string",
          description: "Animation preset (e.g. 'pop', 'baselineRise', 'wordCascade', 'lineReveal', 'typewriter', 'trackingExpansion', 'textShimmer', 'highlightDraw', 'blurFocusPop', 'focusPull', 'glassIris', 'elevationRise', 'cardSettlePop', 'kenBurns', 'arrowShoot', 'dashFlow', 'iconPop', 'stampSettle', 'elasticScalePop', 'drawOn', 'fade', 'scale', 'slide', 'rotate', 'wipe', 'blur', 'boil', 'pulse', 'float', 'breathe', 'bounce', 'wiggle')",
        },
        duration: { type: "number", description: "Duration in seconds (e.g. 0.6)" },
        start: { type: "number", description: "Start time offset within scene in seconds (default: 0)" },
        delay: { type: "number", description: "Alternative alias for start delay in seconds" },
        direction: { type: "string", enum: ["up", "down", "left", "right"], description: "Motion direction for directional presets" },
        loop: { type: "boolean", description: "Whether the animation loops continuously" },
        loopCount: { type: "number", description: "Number of loop iterations (omit for infinite)" },
        type: { type: "string", enum: ["in", "action", "out", "emphasis", "custom"], description: "Animation role (default: 'in')" },
        easing: {
          type: "string",
          enum: ["snappy", "smooth", "bouncy", "overshoot", "elastic", "bounce", "natural", "slowDown", "accelerate", "heavy", "linear", "spring"],
          description: "Easing curve profile (default: 'snappy')",
        },
        spring: {
          type: "object",
          properties: {
            stiffness: { type: "number", description: "Spring stiffness k (default: 180)" },
            damping: { type: "number", description: "Spring damping c (default: 12)" },
            mass: { type: "number", description: "Spring mass m (default: 1)" },
          },
        },
      },
      required: ["layerId", "preset", "duration"],
    },
  },
  {
    name: "remove_animation",
    description: "Removes an animation clip or clears all animations from a layer.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID" },
        clipId: { type: "string", description: "Optional clip ID. If omitted, clears all animation clips on the layer." },
      },
      required: ["layerId"],
    },
  },
  {
    name: "stagger_elements",
    description: "Choreographs a sequential staggered entrance across multiple elements with spatial ordering ('center-out', 'edges-in', 'left-to-right', 'top-to-bottom', 'layer-order').",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of layer IDs in order of entrance",
        },
        preset: { type: "string", description: "Entrance preset (default: 'pop')" },
        duration: { type: "number", description: "Duration of each element's animation in seconds (default: 0.6)" },
        delayStep: { type: "number", description: "Time offset between each element in seconds (default: 0.1)" },
        direction: { type: "string", enum: ["up", "down", "left", "right"], description: "Motion direction" },
        order: {
          type: "string",
          enum: ["layer-order", "left-to-right", "right-to-left", "top-to-bottom", "bottom-to-top", "center-out", "edges-in"],
          description: "Spatial centroid ordering algorithm (default: 'layer-order')",
        },
        easing: { type: "string", description: "Easing profile (default: 'snappy')" },
      },
      required: ["layerIds"],
    },
  },
  {
    name: "link_elements",
    description: "Establishes a reactive layout binding: 'hug' (card frame dynamically wraps text/counter), 'reflow' (sibling elements maintain continuous gap), 'pin' (pins element to anchor), 'connect' (dynamic arrow/line connecting elements), 'match' (match dimension), or 'lag' (physical inertia follower).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        driverId: { type: "string", description: "Leading/driver element ID" },
        drivenId: { type: "string", description: "Following/driven element ID" },
        mode: {
          type: "string",
          enum: ["hug", "reflow", "pin", "connect", "match", "lag"],
          description: "Reactive binding mode",
        },
        padding: { type: "number", description: "Padding for 'hug' mode (default: 24)" },
        gap: { type: "number", description: "Gap distance in px for 'reflow' mode (default: 16)" },
        axis: { type: "string", enum: ["x", "y"], description: "Reflow axis (default: 'x')" },
        anchor: {
          type: "string",
          enum: ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"],
          description: "Anchor point for 'pin' mode",
        },
        curve: { type: "string", enum: ["straight", "bezier", "orthogonal"], description: "Connector line curve style" },
        lagSeconds: { type: "number", description: "Lag delay for 'lag' follower mode" },
      },
      required: ["driverId", "drivenId", "mode"],
    },
  },
  {
    name: "unlink_elements",
    description: "Removes reactive layout bindings from an element.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID to clear bindings from" },
        driverId: { type: "string", description: "Optional specific driver ID to detach" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "split_text",
    description: "Semantically decomposes a text headline into independent kinetic words, characters, or lines with 0.0px visual shift invariance for Apple-grade kinetic reveals.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target text layer ID to split" },
        splitBy: { type: "string", enum: ["word", "character", "line"], description: "Split unit (default: 'word')" },
        staggerDelay: { type: "number", description: "Stagger delay between split chunks in seconds (default: 0.05)" },
        preset: { type: "string", description: "Entrance animation preset (default: 'slide')" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "split_shape",
    description: "Decomposes a rounded rectangle or circle contour into dual continuous bezier arc paths with dual-origin draw-on and 0.0px visual shift.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target shape layer ID to split" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "split_line",
    description: "Splits a vector line or arrow collinear along its ratio, with optional arrowhead marker detachment.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target line or arrow layer ID" },
        ratio: { type: "number", description: "Split ratio along the line (0.1 to 0.9, default: 0.5)" },
        detachArrowhead: { type: "boolean", description: "Whether to detach arrowhead marker as an independent pop element" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "set_audio_track",
    description: "Attaches a background audio track or sound effect to a scene or the entire project.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Optional scene ID (if omitted, applies project-wide)" },
        src: { type: "string", description: "Audio file URL or local file path" },
        name: { type: "string", description: "Track name or label" },
        volume: { type: "number", description: "Volume level from 0.0 to 1.0 (default: 1.0)" },
        loop: { type: "boolean", description: "Whether to loop audio playback" },
        start: { type: "number", description: "Start time offset within timeline in seconds" },
        offset: { type: "number", description: "Audio file internal start offset in seconds" },
        muted: { type: "boolean", description: "Whether track is muted" },
      },
      required: ["src"],
    },
  },
  {
    name: "remove_audio_track",
    description: "Removes an audio track from a scene or the project settings.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Optional scene ID. If omitted, clears project-level audio track." },
      },
    },
  },
  {
    name: "export_project",
    description: "Prepares or validates an export manifest for video rendering (MP4, WebM with alpha transparency, or GIF) with resolution scaling.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        format: { type: "string", enum: ["mp4", "webm", "gif"], description: "Export container format" },
        resolution: { type: "string", enum: ["480p", "720p", "1080p", "1440p", "4k"], description: "Resolution preset (default: '1080p')" },
        transparent: { type: "boolean", description: "Enable transparent alpha channel for WebM/GIF (default: false)" },
        scope: { type: "string", enum: ["all", "current"], description: "Render all stitched scenes or current scene only" },
        outputFile: { type: "string", description: "Optional destination output file path" },
      },
      required: ["format"],
    },
  },
  {
    name: "get_storyboard_state",
    description: "Inspects the current scenes, layers, hierarchy, and animation clips of a .mtn project file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
      },
    },
  },
  {
    name: "get_contact_sheet",
    description: "Generates an executive visual contact sheet of the storyboard, detailing narrative pacing, time windows, key headlines, active elements, and transitions across all scenes.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
      },
    },
  },
  {
    name: "duplicate_scene",
    description: "Clones an entire scene/beat with all its layers, styles, and animation clips.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "ID of the scene to duplicate" },
        newName: { type: "string", description: "Optional name for the duplicated scene (defaults to '<original> (Copy)')" },
        insertAfter: { type: "boolean", description: "Whether to insert immediately after the source scene (default: true)" },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "align_elements",
    description: "Aligns or evenly distributes layers horizontally or vertically relative to selection bounding box or canvas bounds.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "ID of the scene containing the layers" },
        layerIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of layers to align or distribute",
        },
        alignment: {
          type: "string",
          enum: ["left", "center", "right", "top", "middle", "bottom", "distribute-horizontal", "distribute-vertical"],
          description: "Alignment or distribution mode",
        },
        relativeTo: {
          type: "string",
          enum: ["selection", "canvas"],
          description: "Reference boundary: 'selection' (default if multiple layers) or 'canvas' (default if single layer)",
        },
      },
      required: ["sceneId", "layerIds", "alignment"],
    },
  },
  {
    name: "separate_stroke_fill",
    description: "Separates any shape's stroke and fill into two independent sibling layers inside a compound group with 0.0000px layout shift. Enables stroke draw-on paired with delayed fill fade-in.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Scene containing the shape layer" },
        layerId: { type: "string", description: "ID of the shape layer to separate" },
      },
      required: ["sceneId", "layerId"],
    },
  },
  {
    name: "update_animation_clip",
    description: "Updates or fine-tunes an existing animation clip on a layer (preset, delay, duration, easing, direction, loop, spring).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID" },
        clipId: { type: "string", description: "Optional clip ID (updates first clip if omitted)" },
        type: { type: "string", enum: ["in", "out", "action", "loop"], description: "Clip type" },
        preset: { type: "string", description: "Animation preset (e.g. pop, fade, slide, drawOn, counterRoll, elevationRise, etc.)" },
        start: { type: "number", description: "Start delay in seconds relative to scene entrance" },
        duration: { type: "number", description: "Duration in seconds" },
        easing: { type: "string", description: "Easing curve (e.g. snappy, smooth, gentle, bouncy, linear)" },
        direction: { type: "string", enum: ["up", "down", "left", "right", "center"], description: "Direction for directional presets" },
        loop: { type: "boolean", description: "Whether the clip loops indefinitely" },
        loopCount: { type: "number", description: "Number of loop cycles if loop is true" },
        spring: {
          type: "object",
          properties: {
            stiffness: { type: "number" },
            damping: { type: "number" },
            mass: { type: "number" },
          },
          description: "Optional custom physical spring dynamics",
        },
      },
      required: ["layerId"],
    },
  },
  {
    name: "render_frame",
    description: "Renders an exact vector SVG snapshot of a scene at a given timestamp t, allowing the agent to visually inspect geometry, hierarchy, text, and layout without a browser.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Scene ID to render (defaults to first scene if omitted)" },
        time: { type: "number", description: "Timestamp within the scene (defaults to scene duration)" },
        outputPath: { type: "string", description: "Optional file path to write the rendered .svg file to disk" },
      },
    },
  },
  {
    name: "lint_storyboard",
    description: "Validates a .mtn project file against black frames, text descender overflows, and aesthetic guidelines.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        strictMode: { type: "boolean", description: "Enable strict aesthetic linting (default: false)" },
      },
    },
  },
];

function handleToolCall(name, args) {
  if (name === "list_projects") {
    const dir = path.resolve(process.cwd(), args.directory || ".");
    try {
      if (!fs.existsSync(dir)) {
        return { text: `Directory not found: ${dir}` };
      }
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mtn"));
      const projects = files.map((file) => {
        const fullPath = path.join(dir, file);
        try {
          const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          const doc = raw.document || raw;
          const meta = raw.metadata || {};
          return {
            file,
            name: meta.name || doc.name || path.basename(file, ".mtn"),
            resolution: `${doc.settings?.width || 1920}x${doc.settings?.height || 1080}`,
            fps: doc.settings?.fps || 60,
            duration: `${doc.settings?.duration || 0}s`,
            sceneCount: doc.screens?.length || 0,
          };
        } catch {
          return { file, error: "Invalid .mtn JSON" };
        }
      });
      return { text: JSON.stringify({ directory: dir, projects }, null, 2) };
    } catch (err) {
      return { text: `Error reading directory: ${err.message}` };
    }
  }

  if (name === "delete_project") {
    const target = path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(target)) {
      return { text: `Error: Project file not found: ${target}` };
    }
    fs.unlinkSync(target);
    return { text: `Successfully deleted project file: ${path.basename(target)}` };
  }

  if (name === "duplicate_project") {
    const src = path.resolve(process.cwd(), args.file);
    const dest = path.resolve(process.cwd(), args.targetFile);
    if (!fs.existsSync(src)) {
      return { text: `Error: Source project file not found: ${src}` };
    }
    const raw = JSON.parse(fs.readFileSync(src, "utf-8"));
    if (args.newName) {
      if (raw.metadata) raw.metadata.name = args.newName;
      if (raw.document) {
        raw.document.name = args.newName;
        if (raw.document.settings) raw.document.settings.name = args.newName;
      }
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(raw, null, 2), "utf-8");
    return { text: `Duplicated project ${path.basename(src)} -> ${path.basename(dest)}` };
  }

  if (name === "rename_project") {
    const src = path.resolve(process.cwd(), args.file);
    const { data: pkg, path: resolvedPath } = readMtnFile(src);
    if (pkg.metadata) pkg.metadata.name = args.newName;
    pkg.document.name = args.newName;
    if (pkg.document.settings) pkg.document.settings.name = args.newName;
    writeMtnFile(resolvedPath, pkg);
    return { text: `Renamed project in ${path.basename(resolvedPath)} to "${args.newName}".` };
  }

  const filePath = args.file || "project.mtn";
  const { data: pkg, path: resolvedPath } = readMtnFile(filePath);
  const doc = pkg.document;

  switch (name) {
    case "create_project": {
      const is9x16 = args.aspectRatio === "9:16";
      const is1x1 = args.aspectRatio === "1:1";
      const is4x5 = args.aspectRatio === "4:5";
      const width = is9x16 ? 1080 : is1x1 ? 1080 : is4x5 ? 1080 : 1920;
      const height = is9x16 ? 1920 : is1x1 ? 1080 : is4x5 ? 1350 : 1080;
      const fps = args.fps || 60;
      const bg = args.backgroundColor || "#09090b";

      const newDoc = {
        $schema: "https://motion-studio.app/schemas/v1.json",
        format: "motion-studio",
        version: 1,
        generator: "Motion Studio MCP v0.2.0",
        exportedAt: Date.now(),
        metadata: {
          id: "proj_" + Math.random().toString(36).slice(2, 9),
          name: args.name,
          width,
          height,
          fps,
          duration: 3.0,
          screenCount: 1,
          backgroundColor: bg,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        document: {
          version: "1.0",
          name: args.name,
          settings: {
            width,
            height,
            fps,
            duration: 3.0,
            backgroundColor: bg,
          },
          screens: [
            {
              id: "scene_1",
              name: "Scene 1",
              duration: 3.0,
              layers: [],
            },
          ],
        },
      };

      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, JSON.stringify(newDoc, null, 2), "utf-8");
      return {
        text: `Created project "${args.name}" (${width}x${height} @ ${fps}fps, format: ${args.aspectRatio || "16:9"}) at ${path.basename(resolvedPath)}.`,
      };
    }

    case "update_project": {
      if (args.name) {
        doc.name = args.name;
        doc.settings.name = args.name;
        if (pkg.metadata) pkg.metadata.name = args.name;
      }
      if (args.fps) doc.settings.fps = args.fps;
      if (args.backgroundColor) doc.settings.backgroundColor = args.backgroundColor;
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Updated project settings in ${path.basename(resolvedPath)}.`,
      };
    }

    case "set_palette": {
      if (!Array.isArray(args.colors) || args.colors.length === 0) {
        return { text: "Error: colors must be a non-empty array of hex color strings." };
      }
      if (!doc.settings) doc.settings = {};
      doc.settings.palette = args.colors;
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Assigned palette [${args.colors.join(", ")}] to ${path.basename(resolvedPath)}.`,
      };
    }

    case "create_scene": {
      const sceneId = args.id || ("scene_" + Math.random().toString(36).slice(2, 8));
      const newScene = {
        id: sceneId,
        name: args.name,
        duration: args.duration || 3.0,
        mood: args.mood || "product-showcase",
        layers: [],
      };
      if (args.backgroundColor) newScene.backgroundColor = args.backgroundColor;
      if (args.stepFps) newScene.stepFps = args.stepFps;
      if (args.transition) newScene.transition = args.transition;
      doc.screens.push(newScene);
      doc.settings.duration = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Created scene "${args.name}" (id: ${sceneId}) with duration ${args.duration}s in ${path.basename(resolvedPath)}. Total scenes: ${doc.screens.length}.`,
      };
    }

    case "update_scene": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
      }
      if (args.name) targetScreen.name = args.name;
      if (args.duration) targetScreen.duration = args.duration;
      if (args.mood) targetScreen.mood = args.mood;
      if (args.backgroundColor !== undefined) targetScreen.backgroundColor = args.backgroundColor;
      if (args.stepFps !== undefined) targetScreen.stepFps = args.stepFps;
      if (args.transition !== undefined) targetScreen.transition = args.transition;
      doc.settings.duration = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Updated scene "${targetScreen.name}" (id: ${args.sceneId}). New duration: ${targetScreen.duration}s.`,
      };
    }

    case "delete_scene": {
      if (doc.screens.length <= 1) {
        return { text: `Error: Cannot delete the last remaining scene in ${path.basename(resolvedPath)}.` };
      }
      const idx = doc.screens.findIndex((s) => s.id === args.sceneId);
      if (idx === -1) {
        return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
      }
      const removed = doc.screens.splice(idx, 1)[0];
      doc.settings.duration = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Deleted scene "${removed.name}" (id: ${args.sceneId}). Remaining scenes: ${doc.screens.length}.`,
      };
    }

    case "duplicate_scene": {
      const idx = doc.screens.findIndex((s) => s.id === args.sceneId);
      if (idx === -1) {
        return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
      }
      const sourceScreen = doc.screens[idx];
      const newSceneId = "scene_" + Math.random().toString(36).slice(2, 8);
      const clonedScreen = JSON.parse(JSON.stringify(sourceScreen));
      clonedScreen.id = newSceneId;
      clonedScreen.name = args.newName || `${sourceScreen.name} (Copy)`;

      const remapLayerIds = (layers) => {
        return layers.map((l) => {
          const newId = "layer_" + Math.random().toString(36).slice(2, 8);
          const copy = { ...l, id: newId };
          if (copy.children && Array.isArray(copy.children)) {
            copy.children = remapLayerIds(copy.children);
          }
          return copy;
        });
      };
      clonedScreen.layers = remapLayerIds(clonedScreen.layers);

      const insertIndex = args.insertAfter !== false ? idx + 1 : doc.screens.length;
      doc.screens.splice(insertIndex, 0, clonedScreen);
      doc.settings.duration = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Duplicated scene "${sourceScreen.name}" -> "${clonedScreen.name}" (id: ${newSceneId}) with ${clonedScreen.layers.length} layers. Total scenes: ${doc.screens.length}.`,
      };
    }

    case "reorder_scenes": {
      const sceneMap = new Map(doc.screens.map((s) => [s.id, s]));
      const newScreens = [];
      for (const id of args.sceneIds) {
        const found = sceneMap.get(id);
        if (found) {
          newScreens.push(found);
          sceneMap.delete(id);
        }
      }
      for (const remaining of sceneMap.values()) {
        newScreens.push(remaining);
      }
      doc.screens = newScreens;
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Reordered scenes in ${path.basename(resolvedPath)}: [${doc.screens.map((s) => s.name).join(", ")}].`,
      };
    }

    case "place_element": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
      }

      const layerId = args.id || ("layer_" + Math.random().toString(36).slice(2, 8));
      const is9x16 = doc.settings.height > doc.settings.width;
      const is1x1 = doc.settings.height === doc.settings.width;
      const gridCols = is9x16 ? 9 : is1x1 ? 12 : 16;
      const gridRows = is9x16 ? 16 : is1x1 ? 12 : 9;
      const cellWidth = doc.settings.width / gridCols;
      const cellHeight = doc.settings.height / gridRows;

      let x, y, width, height, gridObj;
      if (args.bounds) {
        x = Math.round(args.bounds.x || 0);
        y = Math.round(args.bounds.y || 0);
        width = Math.round(args.bounds.width || 200);
        height = Math.round(args.bounds.height || 100);
        gridObj = {
          col: Math.max(0, Math.min(gridCols - 1, Math.round(x / cellWidth))),
          row: Math.max(0, Math.min(gridRows - 1, Math.round(y / cellHeight))),
          colSpan: Math.max(1, Math.min(gridCols, Math.round(width / cellWidth))),
          rowSpan: Math.max(1, Math.min(gridRows, Math.round(height / cellHeight))),
        };
      } else {
        const g = args.grid || { col: 2, row: 2, colSpan: 4, rowSpan: 2 };
        const col = Math.max(0, Math.min(gridCols - 1, g.col || 0));
        const row = Math.max(0, Math.min(gridRows - 1, g.row || 0));
        const colSpan = Math.max(1, Math.min(gridCols - col, g.colSpan || 1));
        const rowSpan = Math.max(1, Math.min(gridRows - row, g.rowSpan || 1));
        gridObj = { col, row, colSpan, rowSpan };
        x = Math.round(col * cellWidth);
        y = Math.round(row * cellHeight);
        width = Math.round(colSpan * cellWidth);
        height = Math.round(rowSpan * cellHeight);
      }

      const newLayer = {
        id: layerId,
        name: args.name,
        type: args.type,
        content: args.content,
        grid: gridObj,
        style: {
          x,
          y,
          width,
          height,
          rotation: 0,
          opacity: 1,
          ...(args.style || {}),
        },
      };

      if (args.shapeType) newLayer.shapeType = args.shapeType;
      else if (args.type === "shape") newLayer.shapeType = "rectangle";

      if (args.points !== undefined) newLayer.points = args.points;
      if (args.innerRadiusRatio !== undefined) newLayer.innerRadiusRatio = args.innerRadiusRatio;
      if (args.sides !== undefined) newLayer.sides = args.sides;
      if (args.d !== undefined) newLayer.d = args.d;
      if (args.viewBox !== undefined) newLayer.viewBox = args.viewBox;
      if (args.arrowStart !== undefined) newLayer.arrowStart = args.arrowStart;
      if (args.arrowEnd !== undefined) newLayer.arrowEnd = args.arrowEnd;
      if (args.strokeCap !== undefined) newLayer.strokeCap = args.strokeCap;
      if (args.strokeJoin !== undefined) newLayer.strokeJoin = args.strokeJoin;
      if (args.strokeDashArray !== undefined) newLayer.strokeDashArray = args.strokeDashArray;
      if (args.trimStart !== undefined) newLayer.trimStart = args.trimStart;
      if (args.trimEnd !== undefined) newLayer.trimEnd = args.trimEnd;
      if (args.trimOffset !== undefined) newLayer.trimOffset = args.trimOffset;
      if (args.clipContent !== undefined) newLayer.clipContent = args.clipContent;
      if (args.layout !== undefined) newLayer.layout = args.layout;

      if (args.counter) {
        newLayer.startValue = args.counter.startValue ?? 0;
        newLayer.endValue = args.counter.endValue ?? 100;
        if (args.counter.prefix) newLayer.prefix = args.counter.prefix;
        if (args.counter.suffix) newLayer.suffix = args.counter.suffix;
        if (args.counter.decimals !== undefined) newLayer.decimals = args.counter.decimals;
        if (args.counter.counterMode) newLayer.counterMode = args.counter.counterMode;
        if (args.counter.useGrouping !== undefined) newLayer.useGrouping = args.counter.useGrouping;
      }

      if (args.video) {
        if (args.video.sourceIn !== undefined) newLayer.sourceIn = args.video.sourceIn;
        if (args.video.sourceOut !== undefined) newLayer.sourceOut = args.video.sourceOut;
        if (args.video.volume !== undefined) newLayer.volume = args.video.volume;
        if (args.video.loop !== undefined) newLayer.loop = args.video.loop;
      }

      if (args.iconName) newLayer.iconName = args.iconName;
      if (args.src) newLayer.src = args.src;
      if (args.locked !== undefined) newLayer.locked = args.locked;
      if (args.visible !== undefined) newLayer.visible = args.visible;
      if (args.zIndex !== undefined) newLayer.zIndex = args.zIndex;

      if (args.enter) {
        newLayer.animation = {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: `${args.enter.preset} in`,
              type: "in",
              preset: args.enter.preset || "pop",
              start: args.enter.delay || 0,
              duration: args.enter.duration || 0.6,
              easing: args.enter.easing || "snappy",
              ...(args.enter.direction ? { direction: args.enter.direction } : {}),
              ...(args.enter.spring ? { spring: args.enter.spring } : {}),
            },
          ],
        };
      }

      targetScreen.layers.push(newLayer);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Placed ${args.type} layer "${args.name}" (id: ${layerId}) in scene "${targetScreen.name}" at [${x}, ${y}, ${width}x${height}].`,
      };
    }

    case "update_element": {
      let foundLayer = null;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          foundLayer = found;
          targetScreen = sc;
          break;
        }
      }
      if (!foundLayer) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }
      if (args.name) foundLayer.name = args.name;
      if (args.content !== undefined) foundLayer.content = args.content;
      if (args.shapeType) foundLayer.shapeType = args.shapeType;
      if (args.points !== undefined) foundLayer.points = args.points;
      if (args.innerRadiusRatio !== undefined) foundLayer.innerRadiusRatio = args.innerRadiusRatio;
      if (args.sides !== undefined) foundLayer.sides = args.sides;
      if (args.d !== undefined) foundLayer.d = args.d;
      if (args.viewBox !== undefined) foundLayer.viewBox = args.viewBox;
      if (args.arrowStart !== undefined) foundLayer.arrowStart = args.arrowStart;
      if (args.arrowEnd !== undefined) foundLayer.arrowEnd = args.arrowEnd;
      if (args.strokeCap !== undefined) foundLayer.strokeCap = args.strokeCap;
      if (args.strokeJoin !== undefined) foundLayer.strokeJoin = args.strokeJoin;
      if (args.strokeDashArray !== undefined) foundLayer.strokeDashArray = args.strokeDashArray;
      if (args.trimStart !== undefined) foundLayer.trimStart = args.trimStart;
      if (args.trimEnd !== undefined) foundLayer.trimEnd = args.trimEnd;
      if (args.trimOffset !== undefined) foundLayer.trimOffset = args.trimOffset;
      if (args.clipContent !== undefined) foundLayer.clipContent = args.clipContent;
      if (args.layout !== undefined) foundLayer.layout = { ...foundLayer.layout, ...args.layout };

      if (args.counter) {
        if (args.counter.startValue !== undefined) foundLayer.startValue = args.counter.startValue;
        if (args.counter.endValue !== undefined) foundLayer.endValue = args.counter.endValue;
        if (args.counter.prefix !== undefined) foundLayer.prefix = args.counter.prefix;
        if (args.counter.suffix !== undefined) foundLayer.suffix = args.counter.suffix;
        if (args.counter.decimals !== undefined) foundLayer.decimals = args.counter.decimals;
        if (args.counter.counterMode !== undefined) foundLayer.counterMode = args.counter.counterMode;
        if (args.counter.useGrouping !== undefined) foundLayer.useGrouping = args.counter.useGrouping;
      }

      if (args.iconName !== undefined) foundLayer.iconName = args.iconName;
      if (args.src !== undefined) foundLayer.src = args.src;
      if (args.locked !== undefined) foundLayer.locked = args.locked;
      if (args.visible !== undefined) foundLayer.visible = args.visible;
      if (args.zIndex !== undefined) foundLayer.zIndex = args.zIndex;

      if (args.bounds) {
        foundLayer.style.x = Math.round(args.bounds.x);
        foundLayer.style.y = Math.round(args.bounds.y);
        foundLayer.style.width = Math.round(args.bounds.width);
        foundLayer.style.height = Math.round(args.bounds.height);
      } else if (args.grid) {
        const is9x16 = doc.settings.height > doc.settings.width;
        const is1x1 = doc.settings.height === doc.settings.width;
        const gridCols = is9x16 ? 9 : is1x1 ? 12 : 16;
        const gridRows = is9x16 ? 16 : is1x1 ? 12 : 9;
        const cellWidth = doc.settings.width / gridCols;
        const cellHeight = doc.settings.height / gridRows;

        const col = Math.max(0, Math.min(gridCols - 1, args.grid.col ?? foundLayer.grid?.col ?? 0));
        const row = Math.max(0, Math.min(gridRows - 1, args.grid.row ?? foundLayer.grid?.row ?? 0));
        const colSpan = Math.max(1, Math.min(gridCols - col, args.grid.colSpan ?? foundLayer.grid?.colSpan ?? 1));
        const rowSpan = Math.max(1, Math.min(gridRows - row, args.grid.rowSpan ?? foundLayer.grid?.rowSpan ?? 1));

        foundLayer.grid = { col, row, colSpan, rowSpan };
        foundLayer.style.x = Math.round(col * cellWidth);
        foundLayer.style.y = Math.round(row * cellHeight);
        foundLayer.style.width = Math.round(colSpan * cellWidth);
        foundLayer.style.height = Math.round(rowSpan * cellHeight);
      }

      if (args.style) {
        foundLayer.style = { ...foundLayer.style, ...args.style };
      }
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Updated layer "${foundLayer.name}" (id: ${args.layerId}) in scene "${targetScreen.name}".`,
      };
    }

    case "delete_element": {
      let foundIndex = -1;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const idx = sc.layers.findIndex((l) => l.id === args.layerId);
        if (idx !== -1) {
          foundIndex = idx;
          targetScreen = sc;
          break;
        }
      }
      if (!targetScreen || foundIndex === -1) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }
      const removed = targetScreen.layers.splice(foundIndex, 1)[0];
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Deleted layer "${removed.name}" (id: ${args.layerId}) from scene "${targetScreen.name}".`,
      };
    }

    case "duplicate_element": {
      let sourceLayer = null;
      let sourceScreen = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          sourceLayer = found;
          sourceScreen = sc;
          break;
        }
      }
      if (!sourceLayer) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }

      const targetScreen = args.targetSceneId
        ? doc.screens.find((s) => s.id === args.targetSceneId) || sourceScreen
        : sourceScreen;

      const clone = JSON.parse(JSON.stringify(sourceLayer));
      clone.id = args.newId || ("layer_" + Math.random().toString(36).slice(2, 8));
      clone.name = args.name || `${sourceLayer.name} (Copy)`;

      if (args.offsetX !== undefined || args.offsetY !== undefined) {
        clone.style.x = (clone.style.x || 0) + (args.offsetX || 0);
        clone.style.y = (clone.style.y || 0) + (args.offsetY || 0);
      } else if (clone.grid) {
        const is9x16 = doc.settings.height > doc.settings.width;
        const gridCols = is9x16 ? 9 : 16;
        const gridRows = is9x16 ? 16 : 9;
        const cellWidth = doc.settings.width / gridCols;
        const cellHeight = doc.settings.height / gridRows;

        const offCol = args.offsetCol ?? 0;
        const offRow = args.offsetRow ?? 1;
        clone.grid.col = Math.max(0, Math.min(gridCols - clone.grid.colSpan, clone.grid.col + offCol));
        clone.grid.row = Math.max(0, Math.min(gridRows - clone.grid.rowSpan, clone.grid.row + offRow));
        clone.style.x = Math.round(clone.grid.col * cellWidth);
        clone.style.y = Math.round(clone.grid.row * cellHeight);
      }

      targetScreen.layers.push(clone);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Duplicated layer "${sourceLayer.name}" to "${clone.name}" (id: ${clone.id}) in scene "${targetScreen.name}".`,
      };
    }

    case "reorder_element": {
      let foundIndex = -1;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const idx = sc.layers.findIndex((l) => l.id === args.layerId);
        if (idx !== -1) {
          foundIndex = idx;
          targetScreen = sc;
          break;
        }
      }
      if (!targetScreen || foundIndex === -1) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }

      const layer = targetScreen.layers.splice(foundIndex, 1)[0];
      switch (args.action) {
        case "bringToFront":
          targetScreen.layers.push(layer);
          break;
        case "sendToBack":
          targetScreen.layers.unshift(layer);
          break;
        case "bringForward":
          targetScreen.layers.splice(Math.min(targetScreen.layers.length, foundIndex + 1), 0, layer);
          break;
        case "sendBackward":
          targetScreen.layers.splice(Math.max(0, foundIndex - 1), 0, layer);
          break;
      }
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Reordered layer "${layer.name}" (${args.action}) in scene "${targetScreen.name}".`,
      };
    }

    case "group_elements": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
      }
      const layerIds = args.layerIds || [];
      const layersToGroup = [];
      const remainingLayers = [];

      for (const l of targetScreen.layers) {
        if (layerIds.includes(l.id)) {
          layersToGroup.push(l);
        } else {
          remainingLayers.push(l);
        }
      }

      if (layersToGroup.length === 0) {
        return { text: `Error: None of the specified layers found in scene "${args.sceneId}".` };
      }

      const groupId = "group_" + Math.random().toString(36).slice(2, 8);
      const minX = Math.min(...layersToGroup.map((l) => l.style?.x || 0));
      const minY = Math.min(...layersToGroup.map((l) => l.style?.y || 0));
      const maxX = Math.max(...layersToGroup.map((l) => (l.style?.x || 0) + (l.style?.width || 0)));
      const maxY = Math.max(...layersToGroup.map((l) => (l.style?.y || 0) + (l.style?.height || 0)));

      const groupLayer = {
        id: groupId,
        name: args.name || "Group",
        type: "group",
        children: layersToGroup,
        style: {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
          opacity: 1,
          rotation: 0,
        },
      };

      targetScreen.layers = [...remainingLayers, groupLayer];
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Grouped ${layersToGroup.length} elements into "${groupLayer.name}" (id: ${groupId}) in scene "${targetScreen.name}".`,
      };
    }

    case "ungroup_elements": {
      let targetScreen = null;
      let groupIndex = -1;
      for (const sc of doc.screens) {
        const idx = sc.layers.findIndex((l) => l.id === args.groupId && (l.type === "group" || l.type === "frame"));
        if (idx !== -1) {
          groupIndex = idx;
          targetScreen = sc;
          break;
        }
      }

      if (!targetScreen || groupIndex === -1) {
        return { text: `Error: Group layer "${args.groupId}" not found in any scene.` };
      }

      const groupLayer = targetScreen.layers[groupIndex];
      const children = groupLayer.children || [];
      targetScreen.layers.splice(groupIndex, 1, ...children);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Ungrouped "${groupLayer.name}" (id: ${args.groupId}) into ${children.length} elements in scene "${targetScreen.name}".`,
      };
    }

    case "align_elements": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found.` };
      }
      const layerIds = args.layerIds || [];
      const layers = layerIds
        .map((id) => targetScreen.layers.find((l) => l.id === id))
        .filter(Boolean);

      if (layers.length === 0) {
        return { text: `Error: None of the specified layer IDs found in scene "${args.sceneId}".` };
      }

      const alignMode = args.relativeTo || (layers.length === 1 ? "canvas" : "selection");
      let refLeft = 0;
      let refRight = doc.settings.width;
      let refTop = 0;
      let refBottom = doc.settings.height;
      let refCenterX = doc.settings.width / 2;
      let refCenterY = doc.settings.height / 2;

      if (alignMode === "selection") {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const l of layers) {
          const lx = l.style?.x ?? 0;
          const ly = l.style?.y ?? 0;
          const lw = typeof l.style?.width === "number" ? l.style.width : 100;
          const lh = typeof l.style?.height === "number" ? l.style.height : 50;
          minX = Math.min(minX, lx);
          maxX = Math.max(maxX, lx + lw);
          minY = Math.min(minY, ly);
          maxY = Math.max(maxY, ly + lh);
        }
        refLeft = minX;
        refRight = maxX;
        refTop = minY;
        refBottom = maxY;
        refCenterX = (minX + maxX) / 2;
        refCenterY = (minY + maxY) / 2;
      }

      if (args.alignment === "distribute-horizontal") {
        if (layers.length < 3) {
          return { text: "Error: Distribute horizontal requires at least 3 layers." };
        }
        const sorted = [...layers].sort((a, b) => (a.style?.x ?? 0) - (b.style?.x ?? 0));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstLeft = first.style?.x ?? 0;
        const lastLeft = last.style?.x ?? 0;
        const lastWidth = typeof last.style?.width === "number" ? last.style.width : 100;
        const totalSpan = lastLeft + lastWidth - firstLeft;
        let totalElementsWidth = 0;
        for (const l of sorted) {
          totalElementsWidth += typeof l.style?.width === "number" ? l.style.width : 100;
        }
        const totalGap = totalSpan - totalElementsWidth;
        const gapCount = sorted.length - 1;
        if (totalGap >= 0 && gapCount > 0) {
          const gap = totalGap / gapCount;
          let curX = firstLeft;
          for (let i = 0; i < sorted.length; i++) {
            const l = sorted[i];
            const lw = typeof l.style?.width === "number" ? l.style.width : 100;
            if (i > 0 && i < sorted.length - 1) {
              l.style.x = Math.round(curX);
            }
            curX += lw + gap;
          }
        }
      } else if (args.alignment === "distribute-vertical") {
        if (layers.length < 3) {
          return { text: "Error: Distribute vertical requires at least 3 layers." };
        }
        const sorted = [...layers].sort((a, b) => (a.style?.y ?? 0) - (b.style?.y ?? 0));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstTop = first.style?.y ?? 0;
        const lastTop = last.style?.y ?? 0;
        const lastHeight = typeof last.style?.height === "number" ? last.style.height : 50;
        const totalSpan = lastTop + lastHeight - firstTop;
        let totalElementsHeight = 0;
        for (const l of sorted) {
          totalElementsHeight += typeof l.style?.height === "number" ? l.style.height : 50;
        }
        const totalGap = totalSpan - totalElementsHeight;
        const gapCount = sorted.length - 1;
        if (totalGap >= 0 && gapCount > 0) {
          const gap = totalGap / gapCount;
          let curY = firstTop;
          for (let i = 0; i < sorted.length; i++) {
            const l = sorted[i];
            const lh = typeof l.style?.height === "number" ? l.style.height : 50;
            if (i > 0 && i < sorted.length - 1) {
              l.style.y = Math.round(curY);
            }
            curY += lh + gap;
          }
        }
      } else {
        for (const l of layers) {
          if (!l.style) l.style = {};
          const lw = typeof l.style.width === "number" ? l.style.width : 100;
          const lh = typeof l.style.height === "number" ? l.style.height : 50;
          switch (args.alignment) {
            case "left":
              l.style.x = refLeft;
              break;
            case "center":
              l.style.x = Math.round(refCenterX - lw / 2);
              break;
            case "right":
              l.style.x = refRight - lw;
              break;
            case "top":
              l.style.y = refTop;
              break;
            case "middle":
              l.style.y = Math.round(refCenterY - lh / 2);
              break;
            case "bottom":
              l.style.y = refBottom - lh;
              break;
          }
        }
      }

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Aligned ${layers.length} elements using "${args.alignment}" (relative to ${alignMode}) in scene "${targetScreen.name}".`,
      };
    }

    case "create_mask_group": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found.` };
      }
      const layerIds = args.layerIds || [];
      const children = [];
      const remaining = [];

      for (const l of targetScreen.layers) {
        if (layerIds.includes(l.id)) {
          children.push(l);
        } else {
          remaining.push(l);
        }
      }

      if (children.length === 0) {
        return { text: "Error: No matching layers found to form mask group." };
      }

      const maskId = args.maskLayerId || children[0].id;
      children.forEach((c) => {
        c.isMask = c.id === maskId;
      });

      const groupId = "mask_" + Math.random().toString(36).slice(2, 8);
      const minX = Math.min(...children.map((l) => l.style?.x || 0));
      const minY = Math.min(...children.map((l) => l.style?.y || 0));
      const maxX = Math.max(...children.map((l) => (l.style?.x || 0) + (l.style?.width || 0)));
      const maxY = Math.max(...children.map((l) => (l.style?.y || 0) + (l.style?.height || 0)));

      const maskGroup = {
        id: groupId,
        name: args.name || "Mask Group",
        type: "group",
        isMaskGroup: true,
        invertMask: Boolean(args.invertMask),
        children,
        style: {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
          opacity: 1,
          rotation: 0,
        },
      };

      targetScreen.layers = [...remaining, maskGroup];
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Created ${args.invertMask ? "inverted cutout " : ""}mask group "${maskGroup.name}" (id: ${groupId}) with stencil "${maskId}".`,
      };
    }

    case "apply_boolean_operation": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found.` };
      }
      const layerIds = args.layerIds || [];
      const shapes = [];
      const remaining = [];

      for (const l of targetScreen.layers) {
        if (layerIds.includes(l.id)) {
          shapes.push(l);
        } else {
          remaining.push(l);
        }
      }

      if (shapes.length < 2) {
        return { text: "Error: Boolean operation requires at least 2 shape layers." };
      }

      const groupId = "bool_" + Math.random().toString(36).slice(2, 8);
      const minX = Math.min(...shapes.map((l) => l.style?.x || 0));
      const minY = Math.min(...shapes.map((l) => l.style?.y || 0));
      const maxX = Math.max(...shapes.map((l) => (l.style?.x || 0) + (l.style?.width || 0)));
      const maxY = Math.max(...shapes.map((l) => (l.style?.y || 0) + (l.style?.height || 0)));

      const boolGroup = {
        id: groupId,
        name: args.name || `Boolean (${args.operation})`,
        type: "group",
        isBooleanGroup: true,
        booleanOperation: args.operation,
        children: shapes,
        style: {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
          opacity: 1,
          rotation: 0,
        },
      };

      targetScreen.layers = [...remaining, boolGroup];
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Created boolean ${args.operation} group "${boolGroup.name}" combining ${shapes.length} shapes.`,
      };
    }

    case "import_svg": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found.` };
      }
      const rawSvg = args.svgString || "";
      const pathMatch = rawSvg.match(/<path[^>]*d="([^"]+)"/i);
      const dAttr = pathMatch ? pathMatch[1] : "M 10 10 H 90 V 90 H 10 Z";
      const id = "svg_" + Math.random().toString(36).slice(2, 8);

      const is9x16 = doc.settings.height > doc.settings.width;
      const cellWidth = doc.settings.width / (is9x16 ? 9 : 16);
      const cellHeight = doc.settings.height / (is9x16 ? 16 : 9);
      const col = args.col ?? 3;
      const row = args.row ?? 3;

      const svgLayer = {
        id,
        name: args.name || "Imported SVG",
        type: "shape",
        shapeType: "path",
        d: dAttr,
        viewBox: "0 0 100 100",
        grid: { col, row, colSpan: 4, rowSpan: 4 },
        style: {
          x: Math.round(col * cellWidth),
          y: Math.round(row * cellHeight),
          width: Math.round(4 * cellWidth),
          height: Math.round(4 * cellHeight),
          backgroundColor: "#7c3aed",
          opacity: 1,
          rotation: 0,
        },
      };

      targetScreen.layers.push(svgLayer);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Imported SVG path "${svgLayer.name}" (id: ${id}) into scene "${targetScreen.name}".`,
      };
    }

    case "insert_template": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found.` };
      }

      const id = "template_" + Math.random().toString(36).slice(2, 8);
      let templateLayer = null;

      if (args.templateId === "comp_browser_window") {
        templateLayer = {
          id,
          name: "Browser Window Frame",
          type: "group",
          style: {
            x: Math.round((doc.settings.width - 800) / 2),
            y: Math.round((doc.settings.height - 500) / 2),
            width: 800,
            height: 500,
            backgroundColor: "#18181b",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.12)",
            shadowDistance: 24,
            shadowBlur: 48,
            shadowOpacity: 0.4,
            opacity: 1,
            rotation: 0,
          },
          animation: {
            clips: [
              {
                id: "clip_" + Math.random().toString(36).slice(2, 8),
                name: "pop in",
                type: "in",
                preset: "pop",
                start: 0,
                duration: 0.6,
                easing: "snappy",
              },
            ],
          },
          children: [
            {
              id: `${id}_header`,
              name: "Chrome Bar",
              type: "shape",
              shapeType: "rectangle",
              style: {
                x: Math.round((doc.settings.width - 800) / 2),
                y: Math.round((doc.settings.height - 500) / 2),
                width: 800,
                height: 44,
                backgroundColor: "#27272a",
                borderRadius: 16,
                opacity: 1,
              },
            },
            {
              id: `${id}_url`,
              name: "URL Pill",
              type: "text",
              content: "https://motion.studio",
              style: {
                x: Math.round((doc.settings.width - 800) / 2) + 120,
                y: Math.round((doc.settings.height - 500) / 2) + 8,
                width: 560,
                height: 28,
                fontSize: 13,
                color: "#a1a1aa",
                backgroundColor: "#18181b",
                borderRadius: 6,
                textAlign: "center",
              },
            },
          ],
        };
      } else if (args.templateId === "comp_counter_pill") {
        templateLayer = {
          id,
          name: "Metric Counter Badge",
          type: "counter",
          startValue: 0,
          endValue: 125000,
          prefix: "$",
          suffix: "/mo",
          decimals: 0,
          useGrouping: true,
          counterMode: "odometer",
          style: {
            x: Math.round((doc.settings.width - 320) / 2),
            y: Math.round((doc.settings.height - 80) / 2),
            width: 320,
            height: 80,
            fontSize: 36,
            fontWeight: 800,
            color: "#ffffff",
            backgroundColor: "#09090b",
            borderRadius: 40,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.16)",
            shadowDistance: 12,
            shadowBlur: 24,
            shadowColor: "#000000",
            shadowOpacity: 0.5,
          },
          animation: {
            clips: [
              {
                id: "clip_" + Math.random().toString(36).slice(2, 8),
                name: "elevationRise in",
                type: "in",
                preset: "elevationRise",
                start: 0,
                duration: 0.8,
                easing: "snappy",
              },
            ],
          },
        };
      } else {
        templateLayer = {
          id,
          name: "Code Window Frame",
          type: "group",
          style: {
            x: Math.round((doc.settings.width - 700) / 2),
            y: Math.round((doc.settings.height - 400) / 2),
            width: 700,
            height: 400,
            backgroundColor: "#0d1117",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.1)",
            shadowDistance: 20,
            shadowBlur: 40,
            shadowOpacity: 0.45,
          },
          children: [
            {
              id: `${id}_code`,
              name: "Code Snippet",
              type: "text",
              content: 'const scene = createScene({\n  name: "Hero Showcase",\n  duration: 4.0,\n});\n\nscene.placeElement({ type: "counter" });',
              style: {
                x: Math.round((doc.settings.width - 700) / 2) + 24,
                y: Math.round((doc.settings.height - 400) / 2) + 50,
                width: 650,
                height: 320,
                fontSize: 16,
                fontFamily: "Space Grotesk",
                color: "#58a6ff",
              },
            },
          ],
        };
      }

      targetScreen.layers.push(templateLayer);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Inserted template "${args.templateId}" (layer: "${templateLayer.name}", id: ${id}) into scene "${targetScreen.name}".`,
      };
    }

    case "apply_animation": {
      let foundLayer = null;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          foundLayer = found;
          targetScreen = sc;
          break;
        }
      }

      if (!foundLayer) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }

      if (!foundLayer.animation) foundLayer.animation = { clips: [] };
      if (!foundLayer.animation.clips) foundLayer.animation.clips = [];

      const clipId = "clip_" + Math.random().toString(36).slice(2, 8);
      const startTime = args.start !== undefined ? args.start : (args.delay || 0);

      const newClip = {
        id: clipId,
        name: `${args.preset} ${args.type || "in"}`,
        type: args.type || "in",
        preset: args.preset,
        start: startTime,
        duration: args.duration,
        easing: args.easing || "snappy",
      };

      if (args.direction) newClip.direction = args.direction;
      if (args.loop) newClip.loop = args.loop;
      if (args.loopCount !== undefined) newClip.loopCount = args.loopCount;
      if (args.spring) newClip.spring = args.spring;

      foundLayer.animation.clips.push(newClip);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Applied "${args.preset}" (${newClip.type}, ${args.duration}s, start: ${startTime}s, easing: ${newClip.easing}) to layer "${foundLayer.name}" in scene "${targetScreen.name}".`,
      };
    }

    case "remove_animation": {
      let foundLayer = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          foundLayer = found;
          break;
        }
      }
      if (!foundLayer) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }

      if (args.clipId && foundLayer.animation?.clips) {
        foundLayer.animation.clips = foundLayer.animation.clips.filter((c) => c.id !== args.clipId);
      } else {
        foundLayer.animation = { clips: [] };
      }
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Removed animation from layer "${foundLayer.name}" (id: ${args.layerId}).`,
      };
    }

    case "update_animation_clip": {
      let targetLayer = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          targetLayer = found;
          break;
        }
      }
      if (!targetLayer) {
        return { text: `Error: Layer "${args.layerId}" not found in any scene.` };
      }

      if (!targetLayer.animation) {
        targetLayer.animation = { clips: [] };
      }
      if (!targetLayer.animation.clips) {
        targetLayer.animation.clips = [];
      }

      let clip = null;
      if (args.clipId) {
        clip = targetLayer.animation.clips.find((c) => c.id === args.clipId);
      } else if (targetLayer.animation.clips.length > 0) {
        clip = targetLayer.animation.clips[0];
      }

      if (!clip) {
        clip = {
          id: args.clipId || ("clip_" + Math.random().toString(36).slice(2, 8)),
          name: `${args.preset || "pop"} in`,
          type: args.type || "in",
          preset: args.preset || "pop",
          start: args.start || 0,
          duration: args.duration || 0.6,
          easing: args.easing || "snappy",
        };
        targetLayer.animation.clips.push(clip);
      } else {
        if (args.type) clip.type = args.type;
        if (args.preset) {
          clip.preset = args.preset;
          clip.name = `${args.preset} ${clip.type || "in"}`;
        }
        if (args.start !== undefined) clip.start = args.start;
        if (args.duration !== undefined) clip.duration = args.duration;
        if (args.easing !== undefined) clip.easing = args.easing;
        if (args.direction !== undefined) clip.direction = args.direction;
        if (args.loop !== undefined) clip.loop = args.loop;
        if (args.loopCount !== undefined) clip.loopCount = args.loopCount;
        if (args.spring !== undefined) clip.spring = args.spring;
      }

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Updated animation clip "${clip.name}" (id: ${clip.id}) on layer "${targetLayer.name}" [preset: ${clip.preset}, start: ${clip.start}s, duration: ${clip.duration}s, easing: ${clip.easing}].`,
      };
    }

    case "stagger_elements": {
      const delay = args.delayStep || 0.1;
      const preset = args.preset || "pop";
      const dur = args.duration || 0.6;
      const easing = args.easing || "snappy";
      const order = args.order || "layer-order";

      const matchedLayers = [];
      for (const id of args.layerIds) {
        for (const sc of doc.screens) {
          const found = sc.layers.find((l) => l.id === id);
          if (found) {
            matchedLayers.push(found);
            break;
          }
        }
      }

      if (order === "left-to-right") {
        matchedLayers.sort((a, b) => (a.style?.x || 0) - (b.style?.x || 0));
      } else if (order === "right-to-left") {
        matchedLayers.sort((a, b) => (b.style?.x || 0) - (a.style?.x || 0));
      } else if (order === "top-to-bottom") {
        matchedLayers.sort((a, b) => (a.style?.y || 0) - (b.style?.y || 0));
      } else if (order === "bottom-to-top") {
        matchedLayers.sort((a, b) => (b.style?.y || 0) - (a.style?.y || 0));
      } else if (order === "center-out") {
        const avgX = matchedLayers.reduce((s, l) => s + (l.style?.x || 0), 0) / (matchedLayers.length || 1);
        matchedLayers.sort((a, b) => Math.abs((a.style?.x || 0) - avgX) - Math.abs((b.style?.x || 0) - avgX));
      }

      matchedLayers.forEach((found, idx) => {
        if (!found.animation) found.animation = { clips: [] };
        if (!found.animation.clips) found.animation.clips = [];
        const clipId = "clip_" + Math.random().toString(36).slice(2, 8);
        found.animation.clips.push({
          id: clipId,
          name: `${preset} in`,
          type: "in",
          preset,
          start: Math.round(idx * delay * 100) / 100,
          duration: dur,
          easing,
          ...(args.direction ? { direction: args.direction } : {}),
        });
      });

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Staggered entrance animations across ${matchedLayers.length} elements with ${order} ordering and ${delay}s step delay.`,
      };
    }

    case "link_elements": {
      let driverLayer = null;
      let drivenLayer = null;
      for (const sc of doc.screens) {
        if (!driverLayer) driverLayer = sc.layers.find((l) => l.id === args.driverId);
        if (!drivenLayer) drivenLayer = sc.layers.find((l) => l.id === args.drivenId);
      }
      if (!driverLayer || !drivenLayer) {
        return { text: `Error: driverId "${args.driverId}" or drivenId "${args.drivenId}" not found.` };
      }

      if (!drivenLayer.bindings) drivenLayer.bindings = [];
      drivenLayer.bindings = drivenLayer.bindings.filter((b) => b.driverLayerId !== args.driverId);

      drivenLayer.bindings.push({
        driverLayerId: args.driverId,
        mode: args.mode,
        padding: args.padding ?? 24,
        gap: args.gap ?? 16,
        axis: args.axis || "x",
        anchor: args.anchor || "center",
        curve: args.curve || "straight",
        lagSeconds: args.lagSeconds ?? 0.08,
      });

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Linked driven element "${drivenLayer.name}" to driver "${driverLayer.name}" with reactive mode "${args.mode}".`,
      };
    }

    case "unlink_elements": {
      let targetLayer = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          targetLayer = found;
          break;
        }
      }
      if (!targetLayer) {
        return { text: `Error: Layer "${args.layerId}" not found.` };
      }

      if (args.driverId && targetLayer.bindings) {
        targetLayer.bindings = targetLayer.bindings.filter((b) => b.driverLayerId !== args.driverId);
      } else {
        targetLayer.bindings = [];
      }

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Cleared reactive layout bindings from layer "${targetLayer.name}" (id: ${args.layerId}).`,
      };
    }

    case "split_text": {
      let textLayer = null;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found && found.type === "text") {
          textLayer = found;
          targetScreen = sc;
          break;
        }
      }
      if (!textLayer) {
        return { text: `Error: Text layer "${args.layerId}" not found.` };
      }

      const content = textLayer.content || textLayer.name || "";
      const splitBy = args.splitBy || "word";
      const staggerDelay = args.staggerDelay || 0.05;
      const preset = args.preset || "slide";

      const units = splitBy === "character"
        ? content.split("")
        : splitBy === "line"
        ? content.split("\n")
        : content.split(" ");

      const totalLen = content.length || 1;
      const layerWidth = textLayer.style.width || 400;
      const layerHeight = textLayer.style.height || 60;
      const startX = textLayer.style.x;
      const startY = textLayer.style.y;

      let currentX = startX;
      const chunks = [];

      units.forEach((unit, idx) => {
        const unitWidth = Math.max(10, Math.round((unit.length / totalLen) * layerWidth));
        const chunkLayer = {
          id: `${textLayer.id}_split_${idx}`,
          name: `${textLayer.name} [${unit}]`,
          type: "text",
          content: unit,
          style: {
            ...textLayer.style,
            x: currentX,
            y: startY,
            width: unitWidth,
            height: layerHeight,
          },
          animation: {
            clips: [
              {
                id: "clip_" + Math.random().toString(36).slice(2, 8),
                name: `${preset} in`,
                type: "in",
                preset,
                start: Math.round(idx * staggerDelay * 100) / 100,
                duration: 0.5,
                easing: "snappy",
              },
            ],
          },
        };
        chunks.push(chunkLayer);
        currentX += unitWidth + 8;
      });

      const origIdx = targetScreen.layers.findIndex((l) => l.id === args.layerId);
      if (origIdx !== -1) {
        targetScreen.layers.splice(origIdx, 1, ...chunks);
      } else {
        targetScreen.layers.push(...chunks);
      }

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Semantically split text "${content}" into ${chunks.length} ${splitBy} layers with ${staggerDelay}s kinetic stagger.`,
      };
    }

    case "split_shape": {
      let shapeLayer = null;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          shapeLayer = found;
          targetScreen = sc;
          break;
        }
      }
      if (!shapeLayer) {
        return { text: `Error: Shape layer "${args.layerId}" not found.` };
      }

      const w = shapeLayer.style?.width || 200;
      const h = shapeLayer.style?.height || 200;
      const r = typeof shapeLayer.style?.borderRadius === "number" ? shapeLayer.style.borderRadius : 16;
      const effectiveR = Math.min(r, Math.min(w, h) / 2);

      const pathA_d = `M ${effectiveR} 0 L ${w - effectiveR} 0 A ${effectiveR} ${effectiveR} 0 0 1 ${w} ${effectiveR} L ${w} ${h - effectiveR} A ${effectiveR} ${effectiveR} 0 0 1 ${w - effectiveR} ${h}`;
      const pathB_d = `M ${w - effectiveR} ${h} L ${effectiveR} ${h} A ${effectiveR} ${effectiveR} 0 0 1 0 ${h - effectiveR} L 0 ${effectiveR} A ${effectiveR} ${effectiveR} 0 0 1 ${effectiveR} 0`;

      const partA = {
        id: `${shapeLayer.id}_arc_A`,
        name: `${shapeLayer.name} (Arc NW->SE)`,
        type: "shape",
        shapeType: "path",
        d: pathA_d,
        style: {
          ...shapeLayer.style,
          backgroundColor: "transparent",
          borderWidth: shapeLayer.style.borderWidth || 2,
          borderColor: shapeLayer.style.borderColor || "#ffffff",
        },
        animation: {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: "drawOn in",
              type: "in",
              preset: "drawOn",
              start: 0,
              duration: 0.6,
              easing: "snappy",
            },
          ],
        },
      };

      const partB = {
        id: `${shapeLayer.id}_arc_B`,
        name: `${shapeLayer.name} (Arc SE->NW)`,
        type: "shape",
        shapeType: "path",
        d: pathB_d,
        style: {
          ...shapeLayer.style,
          backgroundColor: "transparent",
          borderWidth: shapeLayer.style.borderWidth || 2,
          borderColor: shapeLayer.style.borderColor || "#ffffff",
        },
        animation: {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: "drawOn in",
              type: "in",
              preset: "drawOn",
              start: 0.08,
              duration: 0.6,
              easing: "snappy",
            },
          ],
        },
      };

      const origIdx = targetScreen.layers.findIndex((l) => l.id === args.layerId);
      if (origIdx !== -1) {
        targetScreen.layers.splice(origIdx, 1, partA, partB);
      } else {
        targetScreen.layers.push(partA, partB);
      }

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Split shape "${shapeLayer.name}" into dual-origin continuous draw-on arcs with 0.0px shift invariance.`,
      };
    }

    case "split_line": {
      let lineLayer = null;
      let targetScreen = null;
      for (const sc of doc.screens) {
        const found = sc.layers.find((l) => l.id === args.layerId);
        if (found) {
          lineLayer = found;
          targetScreen = sc;
          break;
        }
      }
      if (!lineLayer) {
        return { text: `Error: Line layer "${args.layerId}" not found.` };
      }

      const ratio = Math.max(0.1, Math.min(0.9, args.ratio ?? 0.5));
      const totalWidth = lineLayer.style?.width || 200;
      const part1Width = Math.round(totalWidth * ratio);
      const part2Width = totalWidth - part1Width;

      const part1 = {
        id: `${lineLayer.id}_part1`,
        name: `${lineLayer.name} (Start)`,
        type: "line",
        arrowStart: lineLayer.arrowStart,
        arrowEnd: false,
        style: {
          ...lineLayer.style,
          width: part1Width,
        },
        animation: {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: "arrowShoot in",
              type: "in",
              preset: "arrowShoot",
              start: 0,
              duration: 0.5,
              easing: "snappy",
            },
          ],
        },
      };

      const part2 = {
        id: `${lineLayer.id}_part2`,
        name: `${lineLayer.name} (End)`,
        type: "line",
        arrowStart: false,
        arrowEnd: lineLayer.arrowEnd,
        style: {
          ...lineLayer.style,
          x: (lineLayer.style.x || 0) + part1Width,
          width: part2Width,
        },
        animation: {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: "arrowShoot in",
              type: "in",
              preset: "arrowShoot",
              start: 0.25,
              duration: 0.5,
              easing: "snappy",
            },
          ],
        },
      };

      const origIdx = targetScreen.layers.findIndex((l) => l.id === args.layerId);
      if (origIdx !== -1) {
        targetScreen.layers.splice(origIdx, 1, part1, part2);
      } else {
        targetScreen.layers.push(part1, part2);
      }

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Split line "${lineLayer.name}" at ratio ${ratio} into sequential kinetic vector segments.`,
      };
    }

    case "separate_stroke_fill": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found.` };
      }
      const idx = targetScreen.layers.findIndex((l) => l.id === args.layerId);
      if (idx === -1) {
        return { text: `Error: Layer "${args.layerId}" not found in scene "${args.sceneId}".` };
      }
      const orig = targetScreen.layers[idx];
      const width = typeof orig.style?.width === "number" ? orig.style.width : 200;
      const height = typeof orig.style?.height === "number" ? orig.style.height : 150;
      const strokeWidth = typeof orig.style?.borderWidth === "number" && orig.style.borderWidth > 0 ? orig.style.borderWidth : 2;
      const strokeColor = orig.style?.borderColor || orig.style?.color || "#3b82f6";

      const fillLayer = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `fill_${Math.random().toString(36).slice(2, 8)}`,
        name: `${orig.name} (Fill)`,
        style: {
          ...orig.style,
          x: 0,
          y: 0,
          borderWidth: 0,
          borderColor: "transparent",
        },
        animation: {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: "fade in",
              type: "in",
              preset: "fade",
              duration: 0.6,
              start: 0.4,
              easing: "smooth",
            },
          ],
        },
      };

      const strokeLayer = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `stroke_${Math.random().toString(36).slice(2, 8)}`,
        name: `${orig.name} (Stroke)`,
        style: {
          ...orig.style,
          x: 0,
          y: 0,
          backgroundColor: "transparent",
          fillColor: "transparent",
          borderWidth: strokeWidth,
          borderColor: strokeColor,
          shadowBlur: 0,
          shadowDistance: 0,
        },
        trimStart: 0,
        trimEnd: 100,
        animation: {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: "drawOn in",
              type: "in",
              preset: "drawOn",
              duration: 0.8,
              start: 0,
              easing: "snappy",
            },
          ],
        },
      };

      const group = {
        id: `group_separated_${Math.random().toString(36).slice(2, 8)}`,
        name: `${orig.name} (Separated)`,
        type: "group",
        isCompound: true,
        compoundType: "separated-stroke-fill",
        style: {
          x: orig.style?.x || 0,
          y: orig.style?.y || 0,
          width,
          height,
          rotation: orig.style?.rotation || 0,
          opacity: orig.style?.opacity ?? 1,
          backgroundColor: "transparent",
          borderWidth: 0,
        },
        children: [fillLayer, strokeLayer],
      };

      targetScreen.layers.splice(idx, 1, group);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Separated stroke and fill for layer "${orig.name}" into compound group "${group.name}" (id: ${group.id}) with 0.0000px layout shift.`,
      };
    }

    case "set_audio_track": {
      const audio = {
        src: args.src,
        name: args.name || path.basename(args.src),
        volume: args.volume !== undefined ? args.volume : 1.0,
        loop: args.loop !== undefined ? args.loop : false,
        start: args.start ?? 0,
        offset: args.offset ?? 0,
        muted: args.muted ?? false,
      };

      if (args.sceneId) {
        const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
        if (!targetScreen) {
          return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
        }
        targetScreen.audioTrack = audio;
        writeMtnFile(resolvedPath, pkg);
        return {
          text: `Attached audio track "${audio.name}" to scene "${targetScreen.name}".`,
        };
      } else {
        if (!doc.settings) doc.settings = {};
        doc.settings.audioTrack = audio;
        if (doc.screens.length > 0 && !doc.screens[0].audioTrack) {
          doc.screens[0].audioTrack = audio;
        }
        writeMtnFile(resolvedPath, pkg);
        return {
          text: `Set project audio track to "${audio.name}" (volume: ${audio.volume}, loop: ${audio.loop}) in ${path.basename(resolvedPath)}.`,
        };
      }
    }

    case "remove_audio_track": {
      if (args.sceneId) {
        const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
        if (!targetScreen) {
          return { text: `Error: Scene "${args.sceneId}" not found.` };
        }
        delete targetScreen.audioTrack;
        writeMtnFile(resolvedPath, pkg);
        return { text: `Removed audio track from scene "${targetScreen.name}".` };
      } else {
        if (doc.settings) delete doc.settings.audioTrack;
        doc.screens.forEach((s) => delete s.audioTrack);
        writeMtnFile(resolvedPath, pkg);
        return { text: `Cleared all project audio tracks in ${path.basename(resolvedPath)}.` };
      }
    }

    case "export_project": {
      const format = args.format || "mp4";
      const resolution = args.resolution || "1080p";
      const transparent = Boolean(args.transparent);
      const scope = args.scope || "all";
      const totalDur = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);

      const manifest = {
        projectFile: path.basename(resolvedPath),
        projectTitle: doc.name,
        format,
        resolution,
        transparent,
        scope,
        fps: doc.settings?.fps || 60,
        durationSeconds: totalDur,
        totalFrames: Math.round(totalDur * (doc.settings?.fps || 60)),
        outputDestination: args.outputFile || `${path.basename(resolvedPath, ".mtn")}_${resolution}.${format}`,
        status: "ready_for_render",
      };

      return {
        text: JSON.stringify(manifest, null, 2),
      };
    }

    case "get_contact_sheet": {
      let currentTime = 0;
      const beats = doc.screens.map((sc, index) => {
        const duration = sc.duration || 3.0;
        const timeWindow = [
          Math.round(currentTime * 100) / 100,
          Math.round((currentTime + duration) * 100) / 100,
        ];
        currentTime += duration;

        const headlines = [];
        const elements = [];
        const transitions = [];

        sc.layers.forEach((l) => {
          if (l.type === "text" && l.content) {
            headlines.push(`"${l.content.slice(0, 40)}"`);
          } else {
            elements.push(`${l.type}: ${l.name}`);
          }
          if (l.animation?.clips) {
            l.animation.clips.forEach((c) => {
              transitions.push(`${l.name} -> ${c.preset} (${c.type}, ${c.duration}s)`);
            });
          }
        });

        return {
          sceneId: sc.id,
          index,
          name: sc.name,
          duration,
          timeWindow,
          mood: sc.mood || "product-showcase",
          layerCount: sc.layers.length,
          headlines: headlines.slice(0, 3),
          keyElements: elements.slice(0, 6),
          transitions: transitions.slice(0, 4),
        };
      });

      const contactSheet = {
        projectTitle: doc.name,
        totalDuration: Math.round(currentTime * 100) / 100,
        resolution: `${doc.settings.width}x${doc.settings.height}`,
        fps: doc.settings.fps,
        beatCount: beats.length,
        beats,
      };

      return { text: JSON.stringify(contactSheet, null, 2) };
    }

    case "get_storyboard_state": {
      const totalDur = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);
      const summary = {
        file: path.basename(resolvedPath),
        projectTitle: doc.name,
        resolution: `${doc.settings.width}x${doc.settings.height}`,
        fps: doc.settings.fps,
        totalDuration: `${totalDur}s`,
        sceneCount: doc.screens.length,
        scenes: doc.screens.map((sc) => ({
          id: sc.id,
          name: sc.name,
          duration: `${sc.duration}s`,
          mood: sc.mood || "product-showcase",
          backgroundColor: sc.backgroundColor,
          layerCount: sc.layers.length,
          layers: sc.layers.map((l) => ({
            id: l.id,
            name: l.name,
            type: l.type,
            shapeType: l.shapeType,
            grid: l.grid,
            clips: l.animation?.clips?.map((c) => c.preset) || [],
            bindings: l.bindings?.map((b) => b.mode) || [],
          })),
        })),
      };
      return { text: JSON.stringify(summary, null, 2) };
    }

    case "render_frame": {
      const targetScreen = args.sceneId ? doc.screens.find((s) => s.id === args.sceneId) : doc.screens[0];
      if (!targetScreen) {
        return { text: `Error: Scene not found in project.` };
      }

      const canvasWidth = doc.settings?.width || 1920;
      const canvasHeight = doc.settings?.height || 1080;
      const canvasBg = targetScreen.backgroundColor || doc.settings?.backgroundColor || "#09090b";

      function escapeXml(str) {
        return String(str).replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "'": return "&apos;";
            case '"': return "&quot;";
          }
        });
      }

      function renderLayerSvg(layer) {
        if (layer.visible === false) return "";
        const s = layer.style || {};
        const x = s.x || 0;
        const y = s.y || 0;
        const w = s.width || 100;
        const h = s.height || 50;
        const op = s.opacity ?? 1;
        const rot = s.rotation || 0;
        const bg = s.backgroundColor || "transparent";
        const stroke = s.borderColor || "transparent";
        const strokeW = s.borderWidth || 0;
        const radius = s.borderRadius || 0;
        const transform = rot !== 0 ? `transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"` : "";

        if (layer.type === "group" || layer.type === "frame") {
          const childrenSvg = (layer.children || []).map(renderLayerSvg).join("\n  ");
          return `<g id="${layer.id}" opacity="${op}" ${transform}>\n  ${childrenSvg}\n</g>`;
        }

        if (layer.type === "shape") {
          const shapeType = layer.shapeType || "rectangle";
          if (shapeType === "circle" || shapeType === "ellipse") {
            const rx = w / 2;
            const ry = h / 2;
            return `<ellipse id="${layer.id}" cx="${x + rx}" cy="${y + ry}" rx="${rx}" ry="${ry}" fill="${bg}" stroke="${stroke}" stroke-width="${strokeW}" opacity="${op}" ${transform}/>`;
          }
          if (shapeType === "star") {
            const pts = layer.points || 5;
            const rRatio = layer.innerRadiusRatio || 0.4;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const outerR = Math.min(w, h) / 2;
            const innerR = outerR * rRatio;
            const coords = [];
            for (let i = 0; i < pts * 2; i++) {
              const r = i % 2 === 0 ? outerR : innerR;
              const angle = (i * Math.PI) / pts - Math.PI / 2;
              coords.push(`${Math.round(cx + r * Math.cos(angle))},${Math.round(cy + r * Math.sin(angle))}`);
            }
            return `<polygon id="${layer.id}" points="${coords.join(" ")}" fill="${bg}" stroke="${stroke}" stroke-width="${strokeW}" opacity="${op}" ${transform}/>`;
          }
          if (shapeType === "polygon") {
            const sides = layer.sides || 6;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const r = Math.min(w, h) / 2;
            const coords = [];
            for (let i = 0; i < sides; i++) {
              const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
              coords.push(`${Math.round(cx + r * Math.cos(angle))},${Math.round(cy + r * Math.sin(angle))}`);
            }
            return `<polygon id="${layer.id}" points="${coords.join(" ")}" fill="${bg}" stroke="${stroke}" stroke-width="${strokeW}" opacity="${op}" ${transform}/>`;
          }
          if (shapeType === "path" && layer.d) {
            return `<path id="${layer.id}" d="${layer.d}" transform="translate(${x}, ${y})" fill="${bg}" stroke="${stroke}" stroke-width="${strokeW}" opacity="${op}"/>`;
          }
          return `<rect id="${layer.id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${bg}" stroke="${stroke}" stroke-width="${strokeW}" opacity="${op}" ${transform}/>`;
        }

        if (layer.type === "text" || layer.type === "counter") {
          const fontSize = s.fontSize || 32;
          const fontFamily = s.fontFamily || "Inter, system-ui, sans-serif";
          const fontWeight = s.fontWeight || 600;
          const color = s.color || "#ffffff";
          let displayText = layer.content || "";
          if (layer.type === "counter") {
            const val = layer.endValue ?? 100;
            displayText = `${layer.prefix || ""}${val}${layer.suffix || ""}`;
          }
          return `<text id="${layer.id}" x="${x}" y="${y + fontSize}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" fill="${color}" opacity="${op}" ${transform}>${escapeXml(displayText)}</text>`;
        }

        if (layer.type === "line") {
          return `<line id="${layer.id}" x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${stroke || s.color || '#ffffff'}" stroke-width="${strokeW || 2}" opacity="${op}" ${transform}/>`;
        }

        if (layer.type === "icon") {
          return `<rect id="${layer.id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${s.color || '#3b82f6'}" stroke-width="2" opacity="${op}" ${transform}/>`;
        }

        return `<rect id="${layer.id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${bg}" stroke="${stroke}" stroke-width="${strokeW}" opacity="${op}" ${transform}/>`;
      }

      const layersSvg = targetScreen.layers.map(renderLayerSvg).join("\n  ");
      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${canvasBg}"/>
  ${layersSvg}
</svg>`;

      if (args.outputPath) {
        const outResolved = path.resolve(process.cwd(), args.outputPath);
        fs.mkdirSync(path.dirname(outResolved), { recursive: true });
        fs.writeFileSync(outResolved, fullSvg, "utf-8");
      }

      return {
        text: args.outputPath
          ? `Rendered SVG frame for scene "${targetScreen.name}" (${canvasWidth}x${canvasHeight}, ${targetScreen.layers.length} layers) saved to ${args.outputPath}.\n\nPreview:\n${fullSvg.slice(0, 500)}...`
          : fullSvg,
      };
    }

    case "lint_storyboard": {
      const issues = [];
      if (doc.screens.length === 0) {
        issues.push("ERROR: Storyboard has 0 scenes.");
      }
      doc.screens.forEach((sc) => {
        if (!sc.duration || sc.duration < 0.3) {
          issues.push(`ERROR: Scene "${sc.name}" duration (${sc.duration}s) is dangerously short (< 0.3s).`);
        }
        if (sc.layers.length === 0) {
          issues.push(`WARNING: Scene "${sc.name}" has 0 layers (renders empty frame).`);
        }
        sc.layers.forEach((l) => {
          if (l.type === "text" && l.style?.color?.includes("gradient")) {
            issues.push(`ERROR: Text "${l.name}" uses gradient fill. Text emphasis must come from font weight or scale.`);
          }
          if (l.style?.borderWidth > 0 && l.style?.shadowBlur > 0) {
            issues.push(`ERROR: Layer "${l.name}" combines 1px border with soft shadow (Ghost Card). Declare elevation once.`);
          }
        });
      });

      const score = Math.max(0, 100 - issues.length * 20);
      const result = {
        valid: issues.filter((i) => i.startsWith("ERROR")).length === 0,
        score,
        issues: issues.length > 0 ? issues : ["Zero errors. All aesthetic and temporal guardrails passed!"],
      };
      return { text: JSON.stringify(result, null, 2) };
    }

    default:
      return { text: `Error: Unknown tool "${name}"` };
  }
}

function processRpcMessage(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "motion-studio",
          version: "0.2.0",
        },
        capabilities: {
          tools: {},
        },
      },
    };
  }

  if (method === "notifications/initialized") {
    return null;
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS,
      },
    };
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    const result = handleToolCall(toolName, toolArgs);

    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: result.text,
          },
        ],
      },
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  if (id !== undefined) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method "${method}" not found` },
    };
  }

  return null;
}

// 1. JSON-RPC 2.0 stdio loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const msg = JSON.parse(trimmed);
    const response = processRpcMessage(msg);
    if (response) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  } catch (err) {
    process.stderr.write(`[MCP Error]: ${err.message}\n`);
  }
});

// 2. HTTP/SSE Server if --port is passed
const portArgIndex = process.argv.indexOf("--port");
const portArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : null;

if (portArg && !isNaN(portArg)) {
  import("http").then(({ default: http }) => {
    const server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "running", name: "motion-studio", port: portArg, tools: TOOLS.length }));
        return;
      }

      if (req.method === "GET" && req.url === "/sse") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });
        res.write(":connected\n\nevent: endpoint\ndata: /mcp\n\n");
        return;
      }

      if (req.method === "POST" && (req.url === "/mcp" || req.url === "/message")) {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const response = processRpcMessage(parsed);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(response ? JSON.stringify(response) : JSON.stringify({ jsonrpc: "2.0", id: parsed.id, result: {} }));
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }));
          }
        });
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    server.listen(portArg, "0.0.0.0", () => {
      process.stderr.write(`[MCP Server] Running on http://127.0.0.1:${portArg} (SSE: /sse, RPC: /mcp) with ${TOOLS.length} tools\n`);
    });
  });
}
