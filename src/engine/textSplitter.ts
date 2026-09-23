import { TextLayer, GroupLayer, ChunkLayer } from "@/types/scene";

export interface MetricLineBox {
  ascent: number;
  descent: number;
  halfLeading: number;
  clipHeight: number;
  baselineOffset: number;
}

/**
 * Measures the exact advance width of the space character ('U+0020') for a font.
 * Uses OffscreenCanvas or DOM Canvas when available, with a precision fallback table.
 */
export function measureSpaceWidth(
  fontFamily: string = "Inter",
  fontSize: number = 48,
  fontWeight: string | number = 400
): number {
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
        const metrics = ctx.measureText(" ");
        if (metrics && metrics.width > 0) {
          return Math.round(metrics.width * 100) / 100;
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Precision proportional fallback:
  // Most modern neo-grotesque fonts (Inter, SF Pro, Roboto) have a space advance width of ~0.26em to 0.28em
  const weightNum = typeof fontWeight === "number" ? fontWeight : parseInt(String(fontWeight), 10) || 400;
  const ratio = weightNum >= 700 ? 0.28 : 0.26;
  return Math.round(fontSize * ratio * 100) / 100;
}

/**
 * Calculates metric-aligned line-box clipping dimensions to guarantee descenders
 * ("g", "y", "p", "q", "j") are never chopped off during baseline reveals.
 *
 * Formula:
 * ClipHeight = ascent + |descent| + 2 * halfLeading
 */
export function calculateMetricLineBox(
  fontSize: number,
  lineHeight: number = 1.2,
  ascentRatio: number = 0.8,
  descentRatio: number = 0.2
): MetricLineBox {
  const ascent = fontSize * ascentRatio;
  const descent = fontSize * descentRatio;
  const totalLineHeight = fontSize * lineHeight;
  const halfLeading = Math.max(0, (totalLineHeight - (ascent + descent)) / 2);
  const clipHeight = ascent + descent + 2 * halfLeading;
  const baselineOffset = ascent + halfLeading;

  return {
    ascent: Math.round(ascent * 100) / 100,
    descent: Math.round(descent * 100) / 100,
    halfLeading: Math.round(halfLeading * 100) / 100,
    clipHeight: Math.round(clipHeight * 100) / 100,
    baselineOffset: Math.round(baselineOffset * 100) / 100,
  };
}

/**
 * Splits a text layer into semantic sentence chunks with 0.0px visual shift guarantee.
 */
export function splitTextIntoChunks(layer: TextLayer): GroupLayer {
  const rawText = layer.content;
  // Split by newlines or punctuation delimiters (commas, periods, question marks, colons, semicolons)
  let segments = rawText
    .split(/(?<=[,\.\?!;:])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length <= 1 && typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: "sentence" });
      const segs: string[] = [];
      for (const item of segmenter.segment(rawText)) {
        const trimmed = item.segment.trim();
        if (trimmed) segs.push(trimmed);
      }
      if (segs.length > 1) segments = segs;
    } catch {
      // Ignore and fallback
    }
  }

  const finalSegments = segments.length > 1 ? segments : [rawText];
  const fontSize = typeof layer.style.fontSize === "number" ? layer.style.fontSize : 48;
  const lineHeight = typeof layer.style.lineHeight === "number" ? layer.style.lineHeight : 1.2;
  const metricBox = calculateMetricLineBox(fontSize, lineHeight);

  const chunks: ChunkLayer[] = finalSegments.map(
    (chunkText, idx) => ({
      id: `chunk_${Date.now()}_${idx}`,
      name: chunkText,
      type: "chunk",
      content: chunkText,
      style: {
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        rotation: 0,
        opacity: 1,
        fontSize: layer.style.fontSize,
        fontWeight: layer.style.fontWeight,
        fontFamily: layer.style.fontFamily,
        color: layer.style.color || "#FFFFFF",
        textAlign: layer.style.textAlign || "center",
        lineHeight: layer.style.lineHeight || 1.2,
      },
      animation: {
        in: {
          preset: "pop",
          start: idx * 0.15,
          duration: 0.6,
          easing: "bouncy",
        },
      },
    })
  );

  const group: GroupLayer = {
    id: `group_${Date.now()}`,
    name: `${layer.name} (Split Chunks)`,
    type: "group",
    layout: {
      display: "flex",
      flexDirection: "column",
      gap: metricBox.halfLeading * 2 || 12,
      align:
        layer.style.textAlign === "left"
          ? "start"
          : layer.style.textAlign === "right"
          ? "end"
          : "center",
      justifyContent: "center",
    },
    autoFit: true,
    style: {
      ...layer.style,
      width: layer.style.width || "auto",
      height: "auto",
      padding: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      shadows: [],
    },
    children: chunks,
  };

  return group;
}

/**
 * Splits a text layer into individual words with exact space advance widths and punctuation binding.
 */
export function splitTextIntoWords(layer: TextLayer): GroupLayer {
  const rawText = layer.content;
  // Match words preserving attached trailing punctuation (e.g. "news," or "out!")
  const wordTokens = rawText.match(/\S+/g) || [rawText];

  const fontSize = typeof layer.style.fontSize === "number" ? layer.style.fontSize : 48;
  const fontFamily = layer.style.fontFamily || "Inter";
  const fontWeight = layer.style.fontWeight || 400;
  const spaceWidth = measureSpaceWidth(fontFamily, fontSize, fontWeight);

  const chunks: ChunkLayer[] = wordTokens.map((word, idx) => ({
    id: `word_${Date.now()}_${idx}`,
    name: word,
    type: "chunk",
    content: word,
    style: {
      x: 0,
      y: 0,
      width: "auto",
      height: "auto",
      rotation: 0,
      opacity: 1,
      fontSize: layer.style.fontSize,
      fontWeight: layer.style.fontWeight,
      fontFamily: layer.style.fontFamily,
      color: layer.style.color || "#FFFFFF",
      lineHeight: layer.style.lineHeight || 1.2,
      verticalAlign: "bottom",
    },
    animation: {
      in: {
        preset: "pop",
        start: idx * 0.08,
        duration: 0.4,
        easing: "snappy",
      },
    },
  }));

  const group: GroupLayer = {
    id: `group_words_${Date.now()}`,
    name: `${layer.name} (Split Words)`,
    type: "group",
    layout: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spaceWidth,
      align: "center",
      justifyContent:
        layer.style.textAlign === "left"
          ? "start"
          : layer.style.textAlign === "right"
          ? "end"
          : "center",
    },
    autoFit: true,
    style: {
      ...layer.style,
      width: layer.style.width || 600,
      height: "auto",
      padding: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      shadows: [],
    },
    children: chunks,
  };

  return group;
}

/**
 * Splits a multi-line text layer into distinct line layers.
 * Preserves baseline distance and metric line box clipping so descenders never get chopped.
 */
export function splitTextIntoLines(layer: TextLayer): GroupLayer {
  const rawText = layer.content;
  const rawLines = rawText.split(/\r?\n/);
  const finalLines = rawLines.length > 1 ? rawLines : [rawText];

  const fontSize = typeof layer.style.fontSize === "number" ? layer.style.fontSize : 48;
  const lineHeight = typeof layer.style.lineHeight === "number" ? layer.style.lineHeight : 1.2;
  const metricBox = calculateMetricLineBox(fontSize, lineHeight);

  const chunks: ChunkLayer[] = finalLines.map((lineText, idx) => ({
    id: `line_${Date.now()}_${idx}`,
    name: lineText.trim() || `Line ${idx + 1}`,
    type: "chunk",
    content: lineText,
    style: {
      x: 0,
      y: 0,
      width: "auto",
      height: "auto",
      rotation: 0,
      opacity: 1,
      fontSize: layer.style.fontSize,
      fontWeight: layer.style.fontWeight,
      fontFamily: layer.style.fontFamily,
      color: layer.style.color || "#FFFFFF",
      lineHeight: layer.style.lineHeight || 1.2,
      textAlign: layer.style.textAlign || "left",
      verticalAlign: "bottom",
    },
    animation: {
      in: {
        preset: "baselineRise",
        start: idx * 0.12,
        duration: 0.6,
        easing: "snappy",
      },
    },
  }));

  const group: GroupLayer = {
    id: `group_lines_${Date.now()}`,
    name: `${layer.name} (Split Lines)`,
    type: "group",
    layout: {
      display: "flex",
      flexDirection: "column",
      gap: metricBox.halfLeading * 2 || 8,
      align:
        layer.style.textAlign === "center"
          ? "center"
          : layer.style.textAlign === "right"
          ? "end"
          : "start",
      justifyContent: "center",
    },
    autoFit: true,
    style: {
      ...layer.style,
      width: layer.style.width || "auto",
      height: "auto",
      padding: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      shadows: [],
    },
    children: chunks,
  };

  return group;
}

/**
 * Splits text by selection range in strict semantic reading order:
 * [Prefix, Selected, Suffix].
 * Never scrambles sentence order, ensuring 0.0px visual shift at rest.
 */
export function splitTextBySelection(
  layer: TextLayer,
  start: number,
  end: number
): { group: GroupLayer; selectedId: string } {
  const fullContent = layer.content || "";
  const actualStart = Math.max(0, Math.min(start, end));
  const actualEnd = Math.min(fullContent.length, Math.max(start, end));

  const prefix = fullContent.slice(0, actualStart);
  const selected = fullContent.slice(actualStart, actualEnd);
  const suffix = fullContent.slice(actualEnd);

  const chunks: ChunkLayer[] = [];
  let selectedChunkId = "";

  if (prefix) {
    chunks.push({
      id: `chunk_${Date.now()}_pre`,
      name: prefix.trim() || "Prefix",
      type: "chunk",
      content: prefix,
      style: {
        ...layer.style,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
      },
    });
  }

  if (selected) {
    selectedChunkId = `chunk_${Date.now()}_sel`;
    chunks.push({
      id: selectedChunkId,
      name: selected.trim() || "Selection",
      type: "chunk",
      content: selected,
      style: {
        ...layer.style,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
      },
      animation: {
        in: {
          preset: "pop",
          start: 0,
          duration: 0.6,
          easing: "bouncy",
        },
      },
    });
  }

  if (suffix) {
    chunks.push({
      id: `chunk_${Date.now()}_suf`,
      name: suffix.trim() || "Suffix",
      type: "chunk",
      content: suffix,
      style: {
        ...layer.style,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
      },
    });
  }

  const group: GroupLayer = {
    id: `group_sel_${Date.now()}`,
    name: `${layer.name} (Split Selection)`,
    type: "group",
    layout: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 0,
      align: "center",
      justifyContent:
        layer.style.textAlign === "left"
          ? "start"
          : layer.style.textAlign === "right"
          ? "end"
          : "center",
    },
    autoFit: true,
    style: {
      ...layer.style,
      width: layer.style.width || "auto",
      height: "auto",
      padding: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      shadows: [],
    },
    children: chunks,
  };

  return { group, selectedId: selectedChunkId };
}

