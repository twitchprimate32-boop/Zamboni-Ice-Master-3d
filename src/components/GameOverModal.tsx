import React, { useEffect } from 'react';
import { GameMetrics, MissionConfig } from '../types/game';
import { Award, RotateCcw, ArrowRight, Home, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

import { saveMissionRecord } from '../data/highScores';

interface GameOverModalProps {
  status: 'victory' | 'game_over';
  metrics: GameMetrics;
  mission: MissionConfig;
  onRestart: () => void;
  onNextMission?: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  metrics,
  mission,
  onRestart,
  onNextMission,
  onMainMenu,
}) => {
  const isVictory = status === 'victory';
  const [isNewRecord, setIsNewRecord] = React.useState(false);

  useEffect(() => {
    if (isVictory) {
      const res = saveMissionRecord(
        mission.id,
        metrics.cleanPercentage,
        metrics.timeRemaining,
        metrics.starsEarned
      );
      if (res.isNewRecord) {
        setIsNewRecord(true);
      }

      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ffffff', '#facc15', '#0284c7'],
      });
    }
  }, [isVictory, mission.id, metrics.cleanPercentage, metrics.timeRemaining, metrics.starsEarned]);

  // Determine Rank
  let rankTitle = 'APPRENTICE ICE CLEANER';
  let rankGrade = 'B';
  let rankColor = 'text-sky-400';

  if (metrics.cleanPercentage >= mission.threeStarPercent) {
    rankTitle = 'S-RANK CHIEF ICE TECHNICIAN';
    rankGrade = 'S';
    rankColor = 'text-yellow-400';
  } else if (metrics.cleanPercentage >= mission.targetCleanPercent) {
    rankTitle = 'A-RANK PRO ARENA OPERATOR';
    rankGrade = 'A';
    rankColor = 'text-emerald-400';
  } else {
    rankTitle = 'PROBATIONARY RESURFACER';
    rankGrade = 'C';
    rankColor = 'text-red-400';
  }

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-slate-950/80">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl select-none">
        {/* Header Badge */}
        <div className="text-center mb-4">
          <div
            className={`inline-flex items-center justify-center w-14 h-14 rounded-full border-2 mb-2 ${
              isVictory
                ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400'
                : 'bg-red-500/10 border-red-400 text-red-400'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            {isVictory ? 'INTERMISSION RESURFACING COMPLETE!' : 'PERIOD TIME EXPIRED!'}
          </h2>
          {isNewRecord && (
            <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-mono font-bold tracking-wider">
              ★ NEW PERSONAL BEST RECORD! ★
            </div>
          )}
          <p className="text-xs font-mono text-slate-400 mt-1">{mission.title}</p>
        </div>

        {/* Star Rating Display */}
        {isVictory && (
          <div className="flex justify-center space-x-2 my-4">
            {[1, 2, 3].map((starIdx) => {
              const isEarned = starIdx <= metrics.starsEarned;
              return (
                <Star
                  key={starIdx}
                  className={`w-8 h-8 transition-all ${
                    isEarned
                      ? 'fill-amber-400 text-amber-400 drop-shadow-md scale-110'
                      : 'fill-slate-800 text-slate-700'
                  }`}
                />
              );
            })}
          </div>
        )}

        {/* Stats Matrix */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 my-4 space-y-3 font-mono">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">ICE SHEET CLEARED:</span>
            <span
              className={`text-lg font-bold tabular-nums ${
                metrics.cleanPercentage >= mission.targetCleanPercent ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {metrics.cleanPercentage.toFixed(1)}%
              <span className="text-xs text-slate-500 ml-1">/ {mission.targetCleanPercent}%</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">OPERATOR RATING:</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-base font-bold ${rankColor}`}>[{rankGrade}]</span>
              <span className="text-xs text-slate-300 font-sans font-medium">{rankTitle}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-2">
            <span>DISTANCE COVERED:</span>
            <span className="text-slate-200">{metrics.distanceTraveled.toFixed(0)} meters</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DASHER BOARD SCRAPES:</span>
            <span className="text-slate-200">{metrics.boardCollisions}</span>
          </div>
        </div>

        {/* Actions CTA */}
        <div className="space-y-2 mt-5">
          {isVictory && onNextMission ? (
            <button
              onClick={onNextMission}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
            >
              <span>NEXT MISSION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>REPLAY MISSION</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-center gap-2 border border-slate-800 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>RETURN TO ARENA OFFICE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
