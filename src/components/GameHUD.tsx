import React, { useRef, useEffect, useState } from 'react';
import { CameraView, GameMetrics, MissionConfig, ZamboniState } from '../types/game';
import { RinkTextureManager } from '../game/RinkTextureManager';
import {
  Volume2,
  VolumeX,
  Pause,
  Camera,
  Layers,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects';

interface GameHUDProps {
  metrics: GameMetrics;
  zamboniState: ZamboniState;
  mission: MissionConfig;
  cameraView: CameraView;
  rinkManager: RinkTextureManager;
  isMuted: boolean;
  isHighlightActive: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleConditioner: () => void;
  onCycleCamera: () => void;
  onTriggerHorn: () => void;
  onToggleHighlight: () => void;
  onRespawn: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  metrics,
  zamboniState,
  mission,
  cameraView,
  rinkManager,
  isMuted,
  isHighlightActive,
  onToggleMute,
  onTogglePause,
  onToggleConditioner,
  onCycleCamera,
  onTriggerHorn,
  onToggleHighlight,
  onRespawn,
}) => {
  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  // Render Mini-Map each frame or tick
  useEffect(() => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background rink surface
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const { grid, width: gw, height: gh } = rinkManager.getDirtyGrid();
    const cellW = w / gw;
    const cellH = h / gh;

    // Draw dirty / clean tiles
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const val = grid[gy * gw + gx];
        if (val === 1) {
          // Uncleaned frost/snow (opaque cold slate)
          ctx.fillStyle = '#334155';
          ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
        } else if (val === 0) {
          // Pristine resurfaced mirror ice (electric cyan glow)
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    // Goal creases
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(w * 0.08, h / 2 - 4, 3, 8);
    ctx.fillRect(w * 0.92, h / 2 - 4, 3, 8);

    // Zamboni Gate / Snow Dump zone indicator (center bottom)
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(w / 2 - 6, h - 3, 12, 3);

    // Draw Zamboni icon with heading
    const halfL = rinkManager.rinkDim.length / 2;
    const halfW = rinkManager.rinkDim.width / 2;

    const zx = ((zamboniState.x + halfL) / rinkManager.rinkDim.length) * w;
    const zy = ((zamboniState.z + halfW) / rinkManager.rinkDim.width) * h;

    ctx.save();
    ctx.translate(zx, zy);
    ctx.rotate(zamboniState.angle);

    // Zamboni blip rectangle
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -5, 6, 10);

    // Heading nose
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-2.5, 3);
    ctx.lineTo(2.5, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [zamboniState.x, zamboniState.z, zamboniState.angle, metrics.cleanPercentage, rinkManager]);

  // Format countdown clock
  const mins = Math.floor(Math.max(0, metrics.timeRemaining) / 60);
  const secs = Math.floor(Math.max(0, metrics.timeRemaining) % 60);
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  const isTimeCritical = mission.timeLimitSeconds > 0 && metrics.timeRemaining <= 20;
  const isTargetMet = metrics.cleanPercentage >= mission.targetCleanPercent;
  const isTankFull = zamboniState.snowTankLevel >= 95;

  // Speed in mph (~2.237 multiplier for m/s)
  const speedMph = (Math.abs(zamboniState.speed) * 2.237).toFixed(1);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Bar Status Clusters */}
      <div className="flex items-start justify-between">
        {/* Top Left: Ice Resurfacing Clean Gauge */}
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-lg min-w-[200px]">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>ICE RESURFACED</span>
            <span className="text-slate-300">REQ: {mission.targetCleanPercent}%</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums ${
                isTargetMet ? 'text-emerald-400' : 'text-sky-400'
              }`}
            >
              {metrics.cleanPercentage.toFixed(1)}%
            </span>
            {isTargetMet && (
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                TARGET MET
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2 relative border border-slate-700">
            <div
              className={`h-full transition-all duration-150 ${
                isTargetMet ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-sky-500 to-blue-500'
              }`}
              style={{ width: `${Math.min(100, metrics.cleanPercentage)}%` }}
            />
            {/* Target marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
              style={{ left: `${mission.targetCleanPercent}%` }}
              title={`Target: ${mission.targetCleanPercent}%`}
            />
          </div>
        </div>

        {/* Top Center: Countdown Clock / Intermission Timer */}
        {mission.timeLimitSeconds > 0 ? (
          <div
            className={`pointer-events-auto border rounded-xl px-4 py-2 text-center shadow-lg transition-colors ${
              isTimeCritical
                ? 'bg-red-950/90 border-red-500/80 text-red-200'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              INTERMISSION CLOCK
            </div>
            <div className="text-2xl md:text-3xl font-black font-mono tabular-nums tracking-wider">
              {timeFormatted}
            </div>
            {isTimeCritical && (
              <div className="text-[10px] font-mono font-bold text-red-400 animate-none">
                FACEOFF IMMINENT!
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 text-center shadow-lg">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">MODE</div>
            <div className="text-lg font-bold font-mono text-sky-400">FREE RESURFACE</div>
          </div>
        )}

        {/* Top Right: Snow Tank Capacity & Top Action Buttons */}
        <div className="flex items-start space-x-3 pointer-events-auto">
          {/* Snow Tank Hopper Level */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-lg min-w-[170px]">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>SNOW TANK</span>
              <span
                className={`font-mono font-bold ${
                  isTankFull ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {zamboniState.snowTankLevel.toFixed(0)}%
              </span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1 relative border border-slate-700">
              <div
                className={`h-full transition-all duration-100 ${
                  isTankFull
                    ? 'bg-red-500'
                    : zamboniState.snowTankLevel > 75
                    ? 'bg-amber-400'
                    : 'bg-slate-300'
                }`}
                style={{ width: `${Math.min(100, zamboniState.snowTankLevel)}%` }}
              />
            </div>

            {isTankFull ? (
              <div className="text-[9px] font-mono font-bold text-red-400 mt-1 uppercase text-center">
                HOPPER FULL! DUMP AT GATE
              </div>
            ) : (
              <div className="text-[9px] font-mono text-slate-400 mt-1 text-center">
                DUMP AT ARENA GATE
              </div>
            )}
          </div>

          {/* Quick Buttons: Mute & Pause */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                soundEffects.playHorn();
                onToggleMute();
              }}
              className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>
            <button
              onClick={onTogglePause}
              className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              title="Pause Game (Esc)"
            >
              <Pause className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Area: Mini-Map and Ergonomic Unified Bottom Control Dock */}
      <div className="flex items-end justify-between">
        {/* Bottom Left: Mini-Map */}
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 shadow-lg hidden sm:block">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 px-1">
            <span>RINK SHEET RADAR</span>
            <span className="text-sky-400 font-bold">LIVE</span>
          </div>
          <canvas
            ref={miniMapCanvasRef}
            width={180}
            height={78}
            className="rounded border border-slate-800"
          />
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 mt-1 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Cleaned
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Uncut Ice
            </span>
          </div>
        </div>

        {/* Central / Bottom Ergonomic Control Dock */}
        <div className="pointer-events-auto mx-auto max-w-xl w-full sm:w-auto">
          {/* Collapse / Expand Toggle Button */}
          <div className="flex justify-center mb-1">
            <button
              onClick={() => setIsDockCollapsed(!isDockCollapsed)}
              className="px-3 py-1 rounded-t-lg bg-slate-900/90 border-t border-x border-slate-700/80 text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
            >
              {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{isDockCollapsed ? 'SHOW DOCK' : 'MINIMIZE DOCK (H)'}</span>
            </button>
          </div>

          {!isDockCollapsed && (
            <div className="bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
              {/* 1. Conditioner Blade Up/Down Action Button */}
              <button
                onClick={onToggleConditioner}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${
                  zamboniState.conditionerDown
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-md shadow-sky-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>
                  BLADE: {zamboniState.conditionerDown ? 'LOWERED (CLEANING)' : 'RAISED (OFF)'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">[SPACE]</span>
              </button>

              {/* 2. Camera View Mode Button */}
              <button
                onClick={onCycleCamera}
                className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                title="Change Camera View"
              >
                <Camera className="w-4 h-4 text-sky-400" />
                <span className="capitalize">{cameraView}</span>
                <span className="text-[10px] text-slate-500">[C]</span>
              </button>

              {/* 3. Vision Mode Toggle (Highlight remaining snow in electric cyan) */}
              <button
                onClick={onToggleHighlight}
                className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border text-xs font-mono transition-colors ${
                  isHighlightActive
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Highlight remaining uncleaned snow in electric cyan"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>VISION</span>
                <span className="text-[10px] text-slate-500">[V]</span>
              </button>

              {/* 4. Horn Button */}
              <button
                onClick={onTriggerHorn}
                className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                title="Honk Arena Horn"
              >
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>HORN</span>
                <span className="text-[10px] text-slate-500">[H]</span>
              </button>

              {/* 5. Respawn / Reset position if stuck */}
              <button
                onClick={onRespawn}
                className="flex items-center space-x-1 px-2.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                title="Unstuck / Center Zamboni (R)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[10px] text-slate-500">[R]</span>
              </button>

              {/* 6. Speedometer Readout */}
              <div className="px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-baseline space-x-1 font-mono">
                <span className="text-sm font-bold text-white tabular-nums">{speedMph}</span>
                <span className="text-[10px] text-slate-300">MPH</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Right: Quick Key Hint */}
        <div className="pointer-events-none text-right hidden lg:block text-xs font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <div>WASD : DRIVE & STEER</div>
          <div>SPACE : CUT ICE & WASH</div>
          <div>V : HIGHLIGHT SNOW</div>
          <div>ESC : PAUSE</div>
        </div>
      </div>
    </div>
  );
};
