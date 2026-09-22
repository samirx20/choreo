import { describe, it, expect } from "vitest";
import {
  splitTextIntoChunks,
  splitTextIntoWords,
  measureSpaceWidth,
  calculateMetricLineBox,
} from "./textSplitter";
import { TextLayer } from "@/types/scene";

describe("Text Splitter Engine (0px Visual Shift Guarantee)", () => {
  const baseTextLayer: TextLayer = {
    id: "text_hero",
    name: "Hero Sentence",
    type: "text",
    content: "Hey Team, I have got big news, check this out!",
    style: {
      x: 300,
      y: 400,
      width: 700,
      height: "auto",
      rotation: 0,
      opacity: 1,
      fontSize: 54,
      fontWeight: 800,
      fontFamily: "Inter",
      color: "#FFFFFF",
      textAlign: "center",
      lineHeight: 1.2,
    },
  };

  it("measures font space width accurately without hardcoded guesswork", () => {
    const spaceWidth = measureSpaceWidth("Inter", 54, 800);
    expect(spaceWidth).toBeGreaterThan(10);
    expect(spaceWidth).toBeLessThan(25);
  });

  it("calculates metric line-box clipping to prevent chopping descenders", () => {
    const metricBox = calculateMetricLineBox(54, 1.2);
    // ascent + descent + 2 * halfLeading = clipHeight
    expect(metricBox.clipHeight).toBeCloseTo(54 * 1.2, 1);
    expect(metricBox.ascent).toBeCloseTo(54 * 0.8, 1);
    expect(metricBox.descent).toBeCloseTo(54 * 0.2, 1);
    expect(metricBox.descent).toBeGreaterThan(0); // Descenders explicitly protected
  });

  it("splits text into semantic chunks and maintains exact x, y coordinates (0px shift)", () => {
    const group = splitTextIntoChunks(baseTextLayer);

    expect(group.type).toBe("group");
    expect(group.style.x).toBe(baseTextLayer.style.x);
    expect(group.style.y).toBe(baseTextLayer.style.y);
    expect(group.layout?.flexDirection).toBe("column");
    expect(group.autoFit).toBe(true);

    // Should have split into 3 chunks by commas/exclamation
    expect(group.children.length).toBe(3);
    expect(group.children[0].type).toBe("chunk");
    expect((group.children[0] as any).content).toBe("Hey Team,");
    expect((group.children[1] as any).content).toBe("I have got big news,");
    expect((group.children[2] as any).content).toBe("check this out!");

    // Styling inherited
    expect(group.children[0].style.fontSize).toBe(54);
    expect(group.children[0].style.fontFamily).toBe("Inter");
  });

  it("splits text into individual words preserving punctuation binding", () => {
    const wordGroup = splitTextIntoWords(baseTextLayer);

    expect(wordGroup.type).toBe("group");
    expect(wordGroup.layout?.flexDirection).toBe("row");
    expect(wordGroup.layout?.flexWrap).toBe("wrap");
    expect(wordGroup.autoFit).toBe(true);
    expect(wordGroup.children.length).toBe(10); // "Hey", "Team,", "I", "have", "got", "big", "news,", "check", "this", "out!"
    
    // Punctuation is bound to the token: "Team,", "news,", "out!"
    const words = wordGroup.children.map((c: any) => c.content);
    expect(words).toContain("Team,");
    expect(words).toContain("news,");
    expect(words).toContain("out!");
    expect(words).not.toContain(",");
    expect(words).not.toContain("!");
  });
});
