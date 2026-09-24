/**
 * Zero-Dependency Fast GIF89a Encoder
 * Encodes an array of ImageData / RGBA pixel frames into a standard animated GIF.
 */

export interface GifFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA pixels
  delayMs?: number; // per-frame delay in milliseconds
}

export interface GifEncoderOptions {
  width: number;
  height: number;
  fps?: number;
  repeat?: number; // 0 = infinite loop
  transparent?: boolean;
}

export class GifEncoder {
  private width: number;
  private height: number;
  private fps: number;
  private repeat: number;
  private transparent: boolean;
  private frames: GifFrame[] = [];

  constructor(options: GifEncoderOptions) {
    this.width = options.width;
    this.height = options.height;
    this.fps = options.fps || 15;
    this.repeat = options.repeat ?? 0;
    this.transparent = options.transparent ?? false;
  }

  public addFrame(frame: GifFrame): void {
    this.frames.push(frame);
  }

  /**
   * Compiles the added frames into a valid GIF89a Blob.
   */
  public finish(): Blob {
    const bytes: number[] = [];

    // 1. Header: 'GIF89a'
    const header = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    bytes.push(...header);

    // 2. Logical Screen Descriptor
    bytes.push(this.width & 0xff, (this.width >> 8) & 0xff);
    bytes.push(this.height & 0xff, (this.height >> 8) & 0xff);
    // Packed: Global Color Table Flag = 1, Color Resolution = 7, Sort Flag = 0, Size = 7 (256 colors) -> 0xF7
    bytes.push(0xf7);
    bytes.push(0); // Background Color Index
    bytes.push(0); // Pixel Aspect Ratio

    // 3. Global Color Table (Standard 6x7x6 252-color web-safe palette + 4 grays)
    const palette: number[][] = [];
    for (let r = 0; r < 6; r++) {
      for (let g = 0; g < 7; g++) {
        for (let b = 0; b < 6; b++) {
          palette.push([
            Math.round((r * 255) / 5),
            Math.round((g * 255) / 6),
            Math.round((b * 255) / 5),
          ]);
        }
      }
    }
    // Pad remaining 4 slots
    palette.push([32, 32, 32], [96, 96, 96], [160, 160, 160], [224, 224, 224]);
    while (palette.length < 256) {
      palette.push([0, 0, 0]);
    }

    for (let i = 0; i < 256; i++) {
      bytes.push(palette[i][0], palette[i][1], palette[i][2]);
    }

    // 4. Netscape 2.0 Loop Extension
    if (this.repeat >= 0) {
      bytes.push(0x21, 0xff, 0x0b); // Extension header
      const netscape = [0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30]; // 'NETSCAPE2.0'
      bytes.push(...netscape);
      bytes.push(0x03, 0x01, this.repeat & 0xff, (this.repeat >> 8) & 0xff, 0x00);
    }

    // 5. Frames
    const delayHundredths = Math.max(1, Math.round(100 / this.fps));

    for (const frame of this.frames) {
      // Graphic Control Extension
      const frameDelay = frame.delayMs ? Math.round(frame.delayMs / 10) : delayHundredths;
      bytes.push(0x21, 0xf9, 0x04);
      // Packed: Reserved(3)=0, Disposal(3)=2 (restore to background), UserInput(1)=0, TransparentColorFlag(1)=0
      bytes.push(0x08);
      bytes.push(frameDelay & 0xff, (frameDelay >> 8) & 0xff);
      bytes.push(0x00); // Transparent color index
      bytes.push(0x00); // Block terminator

      // Image Descriptor
      bytes.push(0x2c); // ','
      bytes.push(0x00, 0x00, 0x00, 0x00); // Left=0, Top=0
      bytes.push(this.width & 0xff, (this.width >> 8) & 0xff);
      bytes.push(this.height & 0xff, (this.height >> 8) & 0xff);
      bytes.push(0x00); // Packed: No local color table

      // Quantize frame pixels to palette indices
      const indexedPixels = this.quantize(frame.data, palette);

      // LZW Compress Raster Data
      const lzwData = this.lzwEncode(indexedPixels, 8);
      bytes.push(...lzwData);
    }

    // 6. Trailer: ';'
    bytes.push(0x3b);

    return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
  }

  /**
   * Maps RGBA pixels to the nearest palette color index using Euclidean distance in RGB space.
   */
  private quantize(rgba: Uint8ClampedArray, palette: number[][]): Uint8Array {
    const pixelCount = this.width * this.height;
    const indexed = new Uint8Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      const a = rgba[offset + 3];

      if (a < 64 && this.transparent) {
        indexed[i] = 0; // transparent index
        continue;
      }

      // Fast nearest match in 6x7x6 color cube
      const ri = Math.round((r * 5) / 255);
      const gi = Math.round((g * 6) / 255);
      const bi = Math.round((b * 5) / 255);
      const colorIndex = ri * 42 + gi * 6 + bi;
      indexed[i] = Math.min(255, Math.max(0, colorIndex));
    }

    return indexed;
  }

  /**
   * LZW encoder for GIF image data blocks.
   */
  private lzwEncode(pixels: Uint8Array, minCodeSize: number): number[] {
    const clearCode = 1 << minCodeSize; // 256
    const eoiCode = clearCode + 1; // 257

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCode = 1 << 12; // 4096

    // Prefix trie table using Map
    const table = new Map<number, number>();

    const outBytes: number[] = [minCodeSize];
    const packet: number[] = [];

    let curBits = 0;
    let curVal = 0;

    const writeCode = (code: number) => {
      curVal |= code << curBits;
      curBits += codeSize;

      while (curBits >= 8) {
        packet.push(curVal & 0xff);
        curVal >>= 8;
        curBits -= 8;

        if (packet.length === 254) {
          outBytes.push(packet.length, ...packet);
          packet.length = 0;
        }
      }
    };

    writeCode(clearCode);

    if (pixels.length > 0) {
      let currentPrefix = pixels[0];

      for (let i = 1; i < pixels.length; i++) {
        const nextPixel = pixels[i];
        const key = (currentPrefix << 8) | nextPixel;

        if (table.has(key)) {
          currentPrefix = table.get(key)!;
        } else {
          writeCode(currentPrefix);

          if (nextCode < maxCode) {
            table.set(key, nextCode++);
            if (nextCode > (1 << codeSize) && codeSize < 12) {
              codeSize++;
            }
          } else {
            writeCode(clearCode);
            table.clear();
            codeSize = minCodeSize + 1;
            nextCode = eoiCode + 1;
          }

          currentPrefix = nextPixel;
        }
      }

      writeCode(currentPrefix);
    }

    writeCode(eoiCode);

    // Flush any remaining bits
    if (curBits > 0) {
      packet.push(curVal & 0xff);
    }

    if (packet.length > 0) {
      outBytes.push(packet.length, ...packet);
    }

    outBytes.push(0x00); // Block terminator

    return outBytes;
  }
}
