import { TextLayer, GroupLayer, ChunkLayer, Layer } from "@/types/scene";

/**
 * Splits a text layer into semantic sentence chunks with 0px visual shift.
 */
export function splitTextIntoChunks(layer: TextLayer): GroupLayer {
  const rawText = layer.content;
  // Split by newlines or punctuation delimiters (commas, periods, question marks)
  const segments = rawText
    .split(/(?<=[,\.\?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: ChunkLayer[] = (segments.length > 1 ? segments : [rawText]).map(
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
          preset: idx === 0 ? "pop" : idx === 1 ? "slideUp" : "blurIn",
          start: idx * 0.4,
          duration: 0.6,
          easing: "smooth",
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
      gap: 12,
      align:
        layer.style.textAlign === "left"
          ? "start"
          : layer.style.textAlign === "right"
          ? "end"
          : "center",
      justifyContent: "center",
    },
    autoFit: true,
    autoLink: true,
    staggerDelay: 0.15,
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
 * Splits a text layer into individual words in a flex-row wrap container.
 */
export function splitTextIntoWords(layer: TextLayer): GroupLayer {
  const words = layer.content.split(/\s+/).filter(Boolean);

  const chunks: ChunkLayer[] = words.map((word, idx) => ({
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
    },
    animation: {
      in: {
        preset: "pop",
        start: idx * 0.1,
        duration: 0.4,
        easing: "bouncy",
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
      gap: 10,
      align: "center",
      justifyContent:
        layer.style.textAlign === "left"
          ? "start"
          : layer.style.textAlign === "right"
          ? "end"
          : "center",
    },
    autoFit: true,
    autoLink: true,
    staggerDelay: 0.08,
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
