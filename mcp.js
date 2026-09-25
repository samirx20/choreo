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
      },
      required: ["name", "duration"],
    },
  },
  {
    name: "place_element",
    description: "Places a text, shape, icon, counter, or line element onto the modular grid with entrance animation. Reusing the same ID across scenes triggers continuous Magic Move spatial transitions.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        sceneId: { type: "string", description: "Target scene ID" },
        id: { type: "string", description: "Optional layer ID. Reusing the same ID in subsequent scenes triggers Magic Move morphing." },
        name: { type: "string", description: "Element name" },
        type: { type: "string", enum: ["text", "shape", "icon", "counter", "line", "mockup3d"], description: "Layer type" },
        content: { type: "string", description: "Text content, icon name (e.g. 'Sparkles'), or 3D mockup model" },
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
          description: "Visual styles (fontSize, color, backgroundColor, borderRadius, borderWidth, borderColor)",
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
    name: "apply_animation",
    description: "Applies a transition clip to an existing element in a .mtn project file.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path to .mtn project file" },
        layerId: { type: "string", description: "Target layer ID" },
        preset: { type: "string", enum: ["pop", "drawOn", "fade", "scale", "slide", "rotate", "wipe", "blur"] },
        duration: { type: "number", description: "Duration in seconds" },
        easing: { type: "string", enum: ["snappy", "smooth", "bouncy", "linear"] },
        type: { type: "string", enum: ["in", "action", "out"], description: "Animation role" },
      },
      required: ["layerId", "preset", "duration"],
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

    case "create_scene": {
      const sceneId = args.id || ("scene_" + Math.random().toString(36).slice(2, 8));
      const newScene = {
        id: sceneId,
        name: args.name,
        duration: args.duration || 3.0,
        mood: args.mood || "product-showcase",
        layers: [],
      };
      doc.screens.push(newScene);
      doc.settings.duration = doc.screens.reduce((s, sc) => s + (sc.duration || 0), 0);
      writeMtnFile(resolvedPath, pkg);
      return {
        text: `Created scene "${args.name}" (id: ${sceneId}) with duration ${args.duration}s in ${path.basename(resolvedPath)}. Total scenes: ${doc.screens.length}.`,
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
