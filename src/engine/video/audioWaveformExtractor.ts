/**
 * Audio Waveform Peak Extraction & Timeline Canvas Renderer
 * Generates Root Mean Square (RMS) peaks with perceptual gamma scaling (0.8)
 * and renders high-density waveforms for timeline clips.
 */

export interface WaveformConfig {
  sampleRate: number;
  peaksPerSecond: number;
  gamma?: number; // default 0.8 for human auditory loudness perception
}

/**
 * Extracts RMS amplitude peaks from raw audio float PCM samples.
 * Quantizes peak amplitudes into a Uint8Array (0 - 255).
 */
export function extractAudioRMSPeaks(
  pcmSamples: Float32Array,
  config: WaveformConfig
): Uint8Array {
  const sampleRate = Math.max(1, config.sampleRate);
  const peaksPerSecond = Math.max(1, config.peaksPerSecond);
  const gamma = config.gamma ?? 0.8;

  const samplesPerPeak = Math.max(1, Math.floor(sampleRate / peaksPerSecond));
  const totalPeaks = Math.ceil(pcmSamples.length / samplesPerPeak);
  const peaks = new Uint8Array(totalPeaks);

  for (let p = 0; p < totalPeaks; p++) {
    const startIdx = p * samplesPerPeak;
    const endIdx = Math.min(pcmSamples.length, startIdx + samplesPerPeak);
    const count = endIdx - startIdx;

    if (count <= 0) break;

    let sumSquares = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const sample = pcmSamples[i];
      sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / count);
    const perceptual = Math.pow(Math.min(1.0, Math.abs(rms)), gamma);
    peaks[p] = Math.min(255, Math.round(perceptual * 255));
  }

  return peaks;
}

export interface RenderWaveformOptions {
  barWidth?: number;
  gap?: number;
  color?: string;
  sourceInRatio?: number;
  sourceOutRatio?: number;
}

/**
 * Renders normalized audio peaks onto a canvas 2D context across a clip bounding box.
 */
export function renderClipWaveform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  peaks: Uint8Array,
  width: number,
  height: number,
  options?: RenderWaveformOptions
): void {
  if (width <= 0 || height <= 0 || peaks.length === 0) return;

  const inRatio = Math.max(0, Math.min(1, options?.sourceInRatio ?? 0));
  const outRatio = Math.max(inRatio, Math.min(1, options?.sourceOutRatio ?? 1));

  const startIdx = Math.floor(inRatio * peaks.length);
  const endIdx = Math.min(peaks.length, Math.ceil(outRatio * peaks.length));
  const visiblePeaks = peaks.subarray(startIdx, endIdx);

  if (visiblePeaks.length === 0) return;

  const barWidth = options?.barWidth ?? 2;
  const gap = options?.gap ?? 1;
  const color = options?.color ?? '#38BDF8'; // Sky-400

  const totalBars = Math.floor(width / (barWidth + gap));
  if (totalBars <= 0) return;

  const ratio = visiblePeaks.length / totalBars;
  const midY = height / 2;

  ctx.fillStyle = color;

  for (let i = 0; i < totalBars; i++) {
    const from = Math.floor(i * ratio);
    const to = Math.max(from + 1, Math.floor((i + 1) * ratio));
    let maxVal = 0;

    for (let j = from; j < to && j < visiblePeaks.length; j++) {
      if (visiblePeaks[j] > maxVal) maxVal = visiblePeaks[j];
    }

    const normalized = maxVal / 255.0;
    const barHeight = Math.max(2, normalized * (height * 0.85));
    const x = i * (barWidth + gap);
    const y = midY - barHeight / 2;

    ctx.fillRect(x, y, barWidth, barHeight);
  }
}
