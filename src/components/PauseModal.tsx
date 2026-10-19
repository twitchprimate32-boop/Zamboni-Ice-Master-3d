import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onMainMenu,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-slate-950/75 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
        <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-1">
          OPERATIONS PAUSED
        </h3>
        <p className="text-xs font-mono text-slate-400 mb-6">
          Zamboni motor idling at zero throttle
        </p>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME RESURFACING</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playHorn();
              onToggleMute();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs font-mono flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs font-mono flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>RESTART LEVEL</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-center gap-2 border border-slate-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
