import React, { useRef, useState, useCallback } from "react";
import {
  Music,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { AudioTrack } from "@/types/scene";
import { extractAudioWaveform } from "@/engine/audio/audioWaveform";

interface AudioTrackRowProps {
  maxSec: number;
  onClose?: () => void;
}

export const AudioTrackRow: React.FC<AudioTrackRowProps> = ({ maxSec, onClose }) => {
  const {
    document: doc,
    addAudioTrack,
    updateAudioTrack,
    removeAudioTrack,
    toggleAudioMute,
  } = useProjectStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStart, setInitialStart] = useState(0);

  const audioTrack = doc.audioTracks?.[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const src = URL.createObjectURL(file);
      const { duration, waveformData } = await extractAudioWaveform(file, 240);

      const newTrack: AudioTrack = {
        id: `audio_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        src,
        duration: Math.max(1, duration),
        start: 0,
        offset: 0,
        volume: 1,
        muted: false,
        waveformData,
      };

      addAudioTrack(newTrack);
    } catch (err) {
      console.error("Failed to load audio track:", err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (!audioTrack) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setInitialStart(audioTrack.start || 0);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const trackLane = (e.currentTarget as HTMLElement).parentElement;
      if (!trackLane) return;
      const laneWidth = trackLane.getBoundingClientRect().width;
      if (laneWidth <= 0) return;

      const deltaSec = (deltaX / laneWidth) * maxSec;
      const nextStart = Math.max(0, Math.min(maxSec - 0.5, (audioTrack.start || 0) + deltaSec));
      updateAudioTrack(audioTrack.id, { start: Math.round(nextStart * 100) / 100 });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      data-testid="timeline-audio-track-row"
      className="flex h-10 border-b border-[#e5e5e7] dark:border-[#27272a] bg-[#fdfdfd] dark:bg-[#141417] transition-colors hover:bg-[#fafafa] dark:hover:bg-zinc-800/40"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Left Track Header */}
      <div className="w-56 shrink-0 sticky left-0 z-10 px-3 flex items-center justify-between border-r border-[#e5e5e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#18181b]">
        <div className="flex items-center gap-2 truncate min-w-0 flex-1 mr-1">
          <Music className="w-3.5 h-3.5 text-foreground shrink-0" />
          <span
            className="truncate text-xs font-medium text-foreground"
            title={audioTrack ? audioTrack.name : "Soundtrack Track"}
          >
            {audioTrack ? audioTrack.name : "Audio Track"}
          </span>
        </div>

        {audioTrack ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => toggleAudioMute(audioTrack.id)}
              className="p-1 rounded text-[#71717a] hover:text-foreground transition-colors"
              title={audioTrack.muted ? "Unmute Audio" : "Mute Audio"}
            >
              {audioTrack.muted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-foreground" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                removeAudioTrack(audioTrack.id);
                onClose?.();
              }}
              className="p-1 rounded text-[#a1a1aa] hover:text-red-600 transition-colors"
              title="Delete Audio Track"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[#a1a1aa] hover:text-foreground transition-colors"
                title="Hide Audio Lane"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-background transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </>
              )}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[#a1a1aa] hover:text-foreground transition-colors"
                title="Hide Audio Lane"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Track Lane */}
      <div className="relative flex-1 overflow-hidden flex items-center">
        {audioTrack ? (
          <div
            onMouseDown={handleDragStart}
            style={{
              left: `${((audioTrack.start || 0) / maxSec) * 100}%`,
              width: `${(audioTrack.duration / maxSec) * 100}%`,
            }}
            className={`absolute h-7 rounded border cursor-grab active:cursor-grabbing select-none flex items-center px-2 shadow-xs transition-shadow ${
              audioTrack.muted
                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 opacity-60"
                : "bg-zinc-200 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 hover:border-zinc-500 hover:shadow-sm"
            }`}
          >
            {/* Waveform Visualization Canvas / SVG */}
            <div className="w-full h-full flex items-center justify-between overflow-hidden gap-[1px]">
              {audioTrack.waveformData && audioTrack.waveformData.length > 0 ? (
                audioTrack.waveformData.map((peak, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: `${Math.max(10, peak * 100)}%`,
                    }}
                    className={`w-[2px] rounded-full shrink-0 ${
                      audioTrack.muted ? "bg-zinc-400 dark:bg-zinc-600" : "bg-zinc-800 dark:bg-zinc-200"
                    }`}
                  />
                ))
              ) : (
                <div className="text-[10px] text-muted-foreground font-mono">
                  Loading waveform...
                </div>
              )}
            </div>

            <span className="absolute right-1.5 bottom-0.5 text-[9px] font-mono text-zinc-600 dark:text-zinc-400 pointer-events-none select-none">
              {audioTrack.duration.toFixed(1)}s
            </span>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex items-center justify-center cursor-pointer border border-dashed border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground text-xs gap-1.5 select-none transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center gap-1.5 text-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Decoding audio waveform...</span>
              </span>
            ) : (
              <span>+ Add Soundtrack or Voiceover Audio (MP3, WAV, AAC)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
