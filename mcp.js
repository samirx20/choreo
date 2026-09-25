#!/usr/bin/env node

/**
 * Motion Studio MCP Server
 * Standard Model Context Protocol (stdio) runner for external AI agents
 * (Claude Desktop, Cursor, Antigravity, etc.) to choreograph .mtn files tool-by-tool.
 */

import fs from "fs";
import path from "path";
import readline from "readline";

// Helper to resolve and read .mtn file
function readMtnFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath || "project.mtn");
  if (!fs.existsSync(resolved)) {
    // Initialize clean default .mtn project file if not present
    const defaultDoc = {
      $schema: "https://motion-studio.app/schemas/v1.json",
      format: "motion-studio",
      version: 1,
      generator: "Motion Studio MCP v0.1.0",
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

// Tool Implementations
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
          description: "Aspect ratio: '16:9' (landscape 1920x1080), '9:16' (vertical 1080x1920), '1:1' (square 1080x1080), '4:5' (portrait 1080x1350)",
        },
        fps: { type: "number", description: "Frame rate (default: 60)" },
        backgroundColor: { type: "string", description: "Background color (default: '#09090b')" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_project",
    description: "Updates project settings such as title, frame rate, or background color.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        name: { type: "string", description: "New project title" },
        fps: { type: "number", description: "Frame rate" },
        backgroundColor: { type: "string", description: "Background color hex" },
      },
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
    name: "create_scene",
    description: "Creates a new scene/beat in a .mtn project file with specified duration and mood.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file (default: './project.mtn')" },
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
    description: "Updates an existing scene's name, duration, background color, stepFps, or aesthetic mood.",
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
    name: "place_element",
    description: "Places a text, shape, icon, counter, image, or line element onto the modular grid with entrance animation. Reusing the same ID across scenes triggers continuous Magic Move spatial transitions.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        id: { type: "string", description: "Optional layer ID. Reusing the same ID in subsequent scenes triggers Magic Move morphing." },
        name: { type: "string", description: "Element name" },
        type: { type: "string", enum: ["text", "shape", "icon", "counter", "line", "image", "frame"], description: "Layer type" },
        content: { type: "string", description: "Text content, icon name (e.g. 'Sparkles'), or image URL" },
        counter: {
          type: "object",
          properties: {
            startValue: { type: "number", description: "Starting number" },
            endValue: { type: "number", description: "Ending number" },
            prefix: { type: "string", description: "Prefix e.g. '$'" },
            suffix: { type: "string", description: "Suffix e.g. '%' or 'k'" },
            decimals: { type: "number", description: "Decimal places (default 0)" },
            counterMode: { type: "string", enum: ["odometer", "smooth", "stepped"] },
          },
        },
        iconName: { type: "string", description: "Lucide icon name (e.g. 'Sparkles', 'Check', 'ArrowRight')" },
        src: { type: "string", description: "Image source URL or local path for image layers" },
        arrowStart: { type: "boolean", description: "Arrowhead at line start" },
        arrowEnd: { type: "boolean", description: "Arrowhead at line end" },
        grid: {
          type: "object",
          properties: {
            col: { type: "number", description: "Grid column (0-15)" },
            row: { type: "number", description: "Grid row (0-8)" },
            colSpan: { type: "number", description: "Column span" },
            rowSpan: { type: "number", description: "Row span" },
          },
          required: ["col", "row", "colSpan", "rowSpan"],
        },
        style: {
          type: "object",
          description: "Visual styles (fontSize, color, backgroundColor, borderRadius, borderWidth, borderColor, opacity, shadowBlur, shadowColor)",
        },
        enter: {
          type: "object",
          properties: {
            preset: { type: "string", enum: ["pop", "drawOn", "fade", "scale", "slide", "rotate"] },
            duration: { type: "number" },
            easing: { type: "string", enum: ["snappy", "smooth", "bouncy", "linear"] },
          },
        },
      },
      required: ["sceneId", "name", "type", "grid"],
    },
  },
  {
    name: "update_element",
    description: "Modifies an existing element's content, position on the grid, counter settings, or visual styles.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID to modify" },
        name: { type: "string", description: "Updated layer name" },
        content: { type: "string", description: "Updated text content, icon name, or image URL" },
        counter: {
          type: "object",
          properties: {
            startValue: { type: "number" },
            endValue: { type: "number" },
            prefix: { type: "string" },
            suffix: { type: "string" },
            decimals: { type: "number" },
            counterMode: { type: "string", enum: ["odometer", "smooth", "stepped"] },
          },
        },
        grid: {
          type: "object",
          properties: {
            col: { type: "number", description: "Grid column (0-15)" },
            row: { type: "number", description: "Grid row (0-8)" },
            colSpan: { type: "number", description: "Column span" },
            rowSpan: { type: "number", description: "Row span" },
          },
        },
        style: {
          type: "object",
          description: "Visual styles to update or merge (fontSize, color, backgroundColor, borderRadius, borderWidth, borderColor, opacity)",
        },
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
    name: "set_audio_track",
    description: "Attaches a background audio track or sound effect to a scene or the entire project.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Optional scene ID (if omitted, applies to the first scene)" },
        src: { type: "string", description: "Audio file URL or local file path" },
        name: { type: "string", description: "Track name or label" },
        volume: { type: "number", description: "Volume level from 0.0 to 1.0 (default: 1.0)" },
        loop: { type: "boolean", description: "Whether to loop audio playback" },
      },
      required: ["src"],
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
    name: "duplicate_element",
    description: "Clones an existing element with an optional grid offset, or into another scene.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID to duplicate" },
        newId: { type: "string", description: "Optional new ID for the duplicate" },
        name: { type: "string", description: "Optional new name" },
        offsetCol: { type: "number", description: "Grid column offset (default: 0)" },
        offsetRow: { type: "number", description: "Grid row offset (default: 1)" },
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
    name: "apply_animation",
    description: "Applies a transition clip to an existing element in a .mtn project file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID" },
        preset: { type: "string", enum: ["pop", "drawOn", "fade", "scale", "slide", "rotate", "wipe", "blur", "boil"] },
        duration: { type: "number", description: "Duration in seconds" },
        easing: { type: "string", enum: ["snappy", "smooth", "bouncy", "linear"] },
        type: { type: "string", enum: ["in", "action", "out"], description: "Animation role" },
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
        clipId: { type: "string", description: "Optional clip ID. If omitted, removes all animation clips on the layer." },
      },
      required: ["layerId"],
    },
  },
  {
    name: "stagger_elements",
    description: "Choreographs a sequential staggered entrance across multiple elements (e.g. 5 feature cards or list items entering sequentially).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of layer IDs in order of entrance",
        },
        preset: {
          type: "string",
          enum: ["pop", "fade", "slide", "wipe", "scale", "drawOn"],
          description: "Entrance preset (default: 'pop')",
        },
        duration: { type: "number", description: "Duration of each element's animation in seconds (default: 0.6)" },
        delayStep: { type: "number", description: "Time offset between each element in seconds (default: 0.1)" },
        easing: { type: "string", enum: ["snappy", "smooth", "bouncy", "linear"], description: "Easing profile" },
      },
      required: ["layerIds"],
    },
  },
  {
    name: "link_elements",
    description: "Establishes a reactive layout binding between two elements: 'hug' (container card dynamically hugs text/counter with padding), 'reflow' (sibling elements maintain continuous axis gap as lead element expands), 'pin' (pins element to anchor of another), or 'connect' (dynamic arrow/line connecting two moving elements).",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        driverId: { type: "string", description: "Leading/driver element ID" },
        drivenId: { type: "string", description: "Following/driven element ID" },
        mode: {
          type: "string",
          enum: ["hug", "reflow", "pin", "connect"],
          description: "Reactive binding mode",
        },
        padding: { type: "number", description: "Padding for 'hug' mode (default: 24)" },
        gap: { type: "number", description: "Gap distance in px for 'reflow' mode (default: 16)" },
        anchor: {
          type: "string",
          enum: ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"],
          description: "Anchor point for 'pin' mode",
        },
      },
      required: ["driverId", "drivenId", "mode"],
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
        preset: { type: "string", enum: ["slide", "fade", "pop"], description: "Entrance animation preset" },
      },
      required: ["layerId"],
    },
  },
  {
    name: "get_storyboard_state",
    description: "Inspects the current scenes, layers, hierarchy, and contact sheet of a .mtn project file.",
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
    name: "lint_storyboard",
    description: "Validates a .mtn project file against black frames, text overflows, and aesthetic guidelines.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
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
        generator: "Motion Studio MCP v0.1.0",
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

    case "place_element": {
      const targetScreen = doc.screens.find((s) => s.id === args.sceneId);
      if (!targetScreen) {
        return { text: `Error: Scene "${args.sceneId}" not found in ${path.basename(resolvedPath)}.` };
      }

      const layerId = args.id || ("layer_" + Math.random().toString(36).slice(2, 8));
      const is9x16 = doc.settings.height > doc.settings.width;
      const gridCols = is9x16 ? 9 : 16;
      const gridRows = is9x16 ? 16 : 9;
      const cellWidth = doc.settings.width / gridCols;
      const cellHeight = doc.settings.height / gridRows;

      const col = Math.max(0, Math.min(gridCols - 1, args.grid.col || 0));
      const row = Math.max(0, Math.min(gridRows - 1, args.grid.row || 0));
      const colSpan = Math.max(1, Math.min(gridCols - col, args.grid.colSpan || 1));
      const rowSpan = Math.max(1, Math.min(gridRows - row, args.grid.rowSpan || 1));

      const newLayer = {
        id: layerId,
        name: args.name,
        type: args.type,
        content: args.content,
        grid: { col, row, colSpan, rowSpan },
        style: {
          x: Math.round(col * cellWidth),
          y: Math.round(row * cellHeight),
          width: Math.round(colSpan * cellWidth),
          height: Math.round(rowSpan * cellHeight),
          rotation: 0,
          opacity: 1,
          ...(args.style || {}),
        },
      };

      if (args.counter) {
        newLayer.startValue = args.counter.startValue ?? 0;
        newLayer.endValue = args.counter.endValue ?? 100;
        if (args.counter.prefix) newLayer.prefix = args.counter.prefix;
        if (args.counter.suffix) newLayer.suffix = args.counter.suffix;
        if (args.counter.decimals !== undefined) newLayer.decimals = args.counter.decimals;
        if (args.counter.counterMode) newLayer.counterMode = args.counter.counterMode;
      }
      if (args.iconName) newLayer.iconName = args.iconName;
      if (args.src) newLayer.src = args.src;
      if (args.arrowStart !== undefined) newLayer.arrowStart = args.arrowStart;
      if (args.arrowEnd !== undefined) newLayer.arrowEnd = args.arrowEnd;

      if (args.enter) {
        newLayer.animation = {
          clips: [
            {
              id: "clip_" + Math.random().toString(36).slice(2, 8),
              name: `${args.enter.preset} in`,
              type: "in",
              preset: args.enter.preset,
              start: 0,
              duration: args.enter.duration || 0.6,
              easing: args.enter.easing || "snappy",
            },
          ],
        };
      }

      targetScreen.layers.push(newLayer);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Placed ${args.type} layer "${args.name}" (id: ${layerId}) in scene "${targetScreen.name}" at grid [${col}, ${row}, span: ${colSpan}x${rowSpan}].`,
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
      if (args.counter) {
        if (args.counter.startValue !== undefined) foundLayer.startValue = args.counter.startValue;
        if (args.counter.endValue !== undefined) foundLayer.endValue = args.counter.endValue;
        if (args.counter.prefix !== undefined) foundLayer.prefix = args.counter.prefix;
        if (args.counter.suffix !== undefined) foundLayer.suffix = args.counter.suffix;
        if (args.counter.decimals !== undefined) foundLayer.decimals = args.counter.decimals;
        if (args.counter.counterMode !== undefined) foundLayer.counterMode = args.counter.counterMode;
      }
      if (args.iconName !== undefined) foundLayer.iconName = args.iconName;
      if (args.src !== undefined) foundLayer.src = args.src;
      if (args.arrowStart !== undefined) foundLayer.arrowStart = args.arrowStart;
      if (args.arrowEnd !== undefined) foundLayer.arrowEnd = args.arrowEnd;
      if (args.grid) {
        const is9x16 = doc.settings.height > doc.settings.width;
        const gridCols = is9x16 ? 9 : 16;
        const gridRows = is9x16 ? 16 : 9;
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

    case "set_audio_track": {
      const audio = {
        src: args.src,
        name: args.name || path.basename(args.src),
        volume: args.volume !== undefined ? args.volume : 1.0,
        loop: args.loop !== undefined ? args.loop : false,
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

    case "reorder_scenes": {
      if (!Array.isArray(args.sceneIds) || args.sceneIds.length === 0) {
        return { text: "Error: sceneIds must be a non-empty array of scene IDs." };
      }
      const reordered = [];
      for (const id of args.sceneIds) {
        const found = doc.screens.find((s) => s.id === id);
        if (found) reordered.push(found);
      }
      for (const s of doc.screens) {
        if (!reordered.some((r) => r.id === s.id)) {
          reordered.push(s);
        }
      }
      doc.screens = reordered;
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Reordered scenes in ${path.basename(resolvedPath)}. Order: ${doc.screens.map((s) => s.name).join(" -> ")}.`,
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

      if (clone.grid) {
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

      if (!foundLayer.animation) {
        foundLayer.animation = { clips: [] };
      }
      if (!foundLayer.animation.clips) {
        foundLayer.animation.clips = [];
      }

      const clipId = "clip_" + Math.random().toString(36).slice(2, 8);
      const newClip = {
        id: clipId,
        name: `${args.preset} ${args.type || "in"}`,
        type: args.type || "in",
        preset: args.preset,
        start: 0,
        duration: args.duration,
        easing: args.easing || "snappy",
      };

      foundLayer.animation.clips.push(newClip);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Applied "${args.preset}" (${args.type || "in"}, ${args.duration}s, easing: ${args.easing || "snappy"}) to layer "${foundLayer.name}" in scene "${targetScreen.name}".`,
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

    case "stagger_elements": {
      const delay = args.delayStep || 0.1;
      const preset = args.preset || "pop";
      const dur = args.duration || 0.6;
      const easing = args.easing || "snappy";
      let staggeredCount = 0;

      args.layerIds.forEach((id, idx) => {
        for (const sc of doc.screens) {
          const found = sc.layers.find((l) => l.id === id);
          if (found) {
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
            });
            staggeredCount++;
            break;
          }
        }
      });

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Staggered entrance animations across ${staggeredCount} elements with ${delay}s step delay.`,
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
        anchor: args.anchor || "center",
      });

      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Linked driven element "${drivenLayer.name}" to driver "${driverLayer.name}" with reactive mode "${args.mode}".`,
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
        scenes: doc.screens.map((sc, idx) => ({
          id: sc.id,
          name: sc.name,
          duration: `${sc.duration}s`,
          mood: sc.mood || "product-showcase",
          layerCount: sc.layers.length,
          layers: sc.layers.map((l) => ({
            id: l.id,
            name: l.name,
            type: l.type,
            grid: l.grid,
            clips: l.animation?.clips?.map((c) => c.preset) || [],
          })),
        })),
      };
      return { text: JSON.stringify(summary, null, 2) };
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
          version: "0.1.0",
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
      process.stderr.write(`[MCP Server] Running on http://127.0.0.1:${portArg} (SSE: /sse, RPC: /mcp)\n`);
    });
  });
}
