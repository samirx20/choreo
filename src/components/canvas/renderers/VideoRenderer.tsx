import React from 'react';
import { VideoLayer } from '@/types/scene';
import { layerStyleToCss } from './styleUtils';
import { cn } from '@/lib/utils';
import { Film } from 'lucide-react';

interface VideoRendererProps {
  layer: VideoLayer;
  isSelected: boolean;
  isChildInFlex?: boolean;
  computedStyle?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const VideoRenderer: React.FC<VideoRendererProps> = ({
  layer,
  isSelected,
  isChildInFlex,
  computedStyle,
  onClick,
}) => {
  const baseCss = layerStyleToCss(layer.style, isChildInFlex);
  const combinedStyle: React.CSSProperties = { ...baseCss, ...computedStyle };

  return (
    <div
      data-layer-id={layer.id}
      style={{
        ...combinedStyle,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: combinedStyle.backgroundColor || '#18181b',
      }}
      onClick={onClick}
    >
      {layer.sourceUrl ? (
        <video
          src={layer.sourceUrl}
          muted={layer.muted ?? true}
          style={{
            width: '100%',
            height: '100%',
            objectFit: layer.fit || 'cover',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-zinc-400 gap-2 p-4 select-none">
          <Film className="w-8 h-8 opacity-60 text-sky-400" />
          <span className="text-xs font-mono text-zinc-300 font-medium">
            {layer.name || 'Video Clip'}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {layer.duration.toFixed(1)}s • {layer.playbackRate || 1}x
          </span>
        </div>
      )}
    </div>
  );
};
