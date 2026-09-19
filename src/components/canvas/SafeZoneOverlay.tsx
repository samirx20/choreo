import React from 'react';
import { SafeZoneConfig } from '@/types/scene';

interface SafeZoneOverlayProps {
  width: number;
  height: number;
  config: SafeZoneConfig;
}

export const SafeZoneOverlay: React.FC<SafeZoneOverlayProps> = ({
  width,
  height,
  config,
}) => {
  // 1. SMPTE Calculations
  const actionX = width * 0.05;
  const actionY = height * 0.05;
  const actionW = width * 0.90;
  const actionH = height * 0.90;

  const titleX = width * 0.10;
  const titleY = height * 0.10;
  const titleW = width * 0.80;
  const titleH = height * 0.80;

  // 2. Rule of Thirds
  const x1 = width / 3;
  const x2 = (width * 2) / 3;
  const y1 = height / 3;
  const y2 = (height * 2) / 3;

  // 3. Center Crosshair
  const cx = width / 2;
  const cy = height / 2;

  const socialOpacity = config.socialOverlayOpacity ?? 0.65;
  const isPortrait = height > width;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-40 overflow-hidden">
      {/* SVG Guides Layer */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* ACTION SAFE (90%) - Green Dashed */}
        {config.actionSafe && (
          <g>
            <rect
              x={actionX}
              y={actionY}
              width={actionW}
              height={actionH}
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity={0.65}
            />
            <text
              x={actionX + 8}
              y={actionY + 16}
              fill="#22c55e"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
              opacity={0.7}
            >
              ACTION SAFE (90%)
            </text>
          </g>
        )}

        {/* TITLE SAFE (80%) - Stamp Gold Dashed */}
        {config.titleSafe && (
          <g>
            <rect
              x={titleX}
              y={titleY}
              width={titleW}
              height={titleH}
              fill="none"
              stroke="#e8c547"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity={0.75}
            />
            <text
              x={titleX + 8}
              y={titleY + 16}
              fill="#e8c547"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
              opacity={0.8}
            >
              TITLE SAFE (80%)
            </text>
          </g>
        )}

        {/* RULE OF THIRDS - Cyan Hairlines & Crash Points */}
        {config.ruleOfThirds && (
          <g stroke="#06b6d4" strokeWidth="1" opacity={0.4}>
            <line x1={x1} y1={0} x2={x1} y2={height} strokeDasharray="4 4" />
            <line x1={x2} y1={0} x2={x2} y2={height} strokeDasharray="4 4" />
            <line x1={0} y1={y1} x2={width} y2={y1} strokeDasharray="4 4" />
            <line x1={0} y1={y2} x2={width} y2={y2} strokeDasharray="4 4" />

            {/* 4 Crash Points */}
            {[
              [x1, y1],
              [x2, y1],
              [x1, y2],
              [x2, y2],
            ].map(([px, py], i) => (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={4}
                fill="#06b6d4"
                stroke="#083344"
                strokeWidth="1"
                opacity={0.9}
              />
            ))}
          </g>
        )}

        {/* CENTER CROSSHAIR - Dual-Contrast Optical Reticle */}
        {config.centerCrosshair && (
          <g>
            {/* Black outer shadow outline */}
            <circle cx={cx} cy={cy} r={6} fill="none" stroke="#000000" strokeWidth="2.5" opacity={0.8} />
            <line x1={cx - 18} y1={cy} x2={cx - 6} y2={cy} stroke="#000000" strokeWidth="2.5" />
            <line x1={cx + 6} y1={cy} x2={cx + 18} y2={cy} stroke="#000000" strokeWidth="2.5" />
            <line x1={cx} y1={cy - 18} x2={cx} y2={cy - 6} stroke="#000000" strokeWidth="2.5" />
            <line x1={cx} y1={cy + 6} x2={cx} y2={cy + 18} stroke="#000000" strokeWidth="2.5" />

            {/* White inner foreground */}
            <circle cx={cx} cy={cy} r={6} fill="none" stroke="#ffffff" strokeWidth="1.5" />
            <line x1={cx - 18} y1={cy} x2={cx - 6} y2={cy} stroke="#ffffff" strokeWidth="1.5" />
            <line x1={cx + 6} y1={cy} x2={cx + 18} y2={cy} stroke="#ffffff" strokeWidth="1.5" />
            <line x1={cx} y1={cy - 18} x2={cx} y2={cy - 6} stroke="#ffffff" strokeWidth="1.5" />
            <line x1={cx} y1={cy + 6} x2={cx} y2={cy + 18} stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* MOBILE SOCIAL MEDIA EXCLUSION ZONES (TikTok / Reels / Shorts on 9:16) */}
      {config.socialOverlay && config.socialOverlay !== 'none' && isPortrait && (
        <div
          className="absolute inset-0 pointer-events-none select-none text-white font-sans overflow-hidden"
          style={{ opacity: socialOpacity }}
        >
          {/* Top Status & Navigation Bar Shading */}
          <div className="absolute top-0 left-0 right-0 h-[160px] bg-gradient-to-b from-black/80 via-black/40 to-transparent px-6 pt-4 flex justify-between items-start">
            <span className="text-xs font-semibold tracking-wider font-mono">9:41</span>
            <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider text-white/80">
              <span className="opacity-60">Following</span>
              <span className="text-white border-b-2 border-white pb-0.5">
                {config.socialOverlay === 'tiktok'
                  ? 'For You'
                  : config.socialOverlay === 'reels'
                  ? 'Reels'
                  : 'Shorts'}
              </span>
            </div>
            <span className="text-xs opacity-70">🔍</span>
          </div>

          {/* Right Social Action Rail (Like, Comment, Share) */}
          <div className="absolute right-3 bottom-[260px] flex flex-col items-center gap-4 text-xs">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              👤
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                ❤️
              </div>
              <span className="text-[10px] font-medium mt-0.5 font-mono">84.2K</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                💬
              </div>
              <span className="text-[10px] font-medium mt-0.5 font-mono">1.2K</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                ↗️
              </div>
              <span className="text-[10px] font-medium mt-0.5 font-mono">Share</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-black/60 border-2 border-white/40 flex items-center justify-center animate-spin">
              🎵
            </div>
          </div>

          {/* Bottom Profile, Caption & Audio Ticker Shading */}
          <div className="absolute bottom-0 left-0 right-0 h-[220px] bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold tracking-wide">@motionstudio</span>
              <span className="text-[10px] px-2 py-0.5 bg-red-500 rounded font-semibold text-white">
                Follow
              </span>
            </div>
            <p className="text-xs text-white/90 line-clamp-2 leading-relaxed mb-2 max-w-[80%]">
              Billion-dollar showcase motion graphics made hella easy with AI-native workflows. ✨
            </p>
            <div className="flex items-center gap-2 text-[10px] text-white/70 font-mono">
              <span>🎵</span>
              <span className="truncate max-w-[200px]">Original Sound - Motion Studio Audio</span>
            </div>
          </div>

          {/* Social Focus Safe Area Bounding Box */}
          <div
            className="absolute border border-dashed border-emerald-400/50 bg-emerald-400/5"
            style={{
              left: '54px',
              top: '160px',
              width: `${width - 54 - 160}px`,
              height: `${height - 160 - 220}px`,
            }}
          >
            <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded border border-emerald-400/30">
              FOCUS SAFE BOX ({Math.round(((width - 214) * (height - 380)) / (width * height) * 100)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
