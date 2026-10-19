import React, { useState } from 'react';
import { MissionConfig, ZamboniSkin } from '../types/game';
import { MISSIONS } from '../data/missions';
import { ZAMBONI_SKINS } from '../data/skins';
import { getMissionRecords } from '../data/highScores';
import { Play, Volume2, VolumeX, Shield, Award, Sparkles, Star } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects';

interface TitleScreenProps {
  onStartMission: (mission: MissionConfig) => void;
  selectedSkin: ZamboniSkin;
  onSelectSkin: (skin: ZamboniSkin) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartMission,
  selectedSkin,
  onSelectSkin,
  isMuted,
  onToggleMute,
}) => {
  const [selectedMission, setSelectedMission] = useState<MissionConfig>(MISSIONS[0]);
  const [activeTab, setActiveTab] = useState<'missions' | 'garage'>('missions');
  const records = getMissionRecords();

  return (
    <div className="absolute inset-0 pointer-events-auto flex flex-col justify-between p-6 md:p-10 select-none overflow-y-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-sky-600/30 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-sky-400 font-mono font-semibold">
              NHL ARENA OPERATIONS · OFFICIAL ICE SIMULATOR
            </div>
            <div className="text-white/60 text-xs font-mono">
              ENGINE V2.6 · REGULATION SHEET (200' x 85')
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            soundEffects.playHorn();
            onToggleMute();
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-sm"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          <span className="font-mono text-xs">{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
        </button>
      </div>

      {/* Hero Title Lockup */}
      <div className="my-auto max-w-xl z-10">
        <div className="mb-2">
          <svg viewBox="0 0 460 70" className="w-full max-w-md drop-shadow-lg">
            <defs>
              <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#80d4ff" />
                <stop offset="100%" stopColor="#0099ff" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="52"
              fill="url(#iceGrad)"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="48"
              letterSpacing="2"
            >
              ZAMBONI
            </text>
            <text
              x="250"
              y="52"
              fill="#e2e8f0"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="300"
              fontSize="44"
              letterSpacing="4"
            >
              3D
            </text>
          </svg>
        </div>

        <div className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
          <span>ICE MASTER SIMULATOR</span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
            PRO RINK RESURFACER
          </span>
        </div>

        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 font-sans">
          Take the elevated driver’s seat of a 10,000-lb ice resurfacing machine. Shave deep skate gouges, wash away
          slush, and squeegee mirror-finish ice before the referee drops the puck!
        </p>

        {/* Tab Switcher: Missions vs Zamboni Garage */}
        <div className="flex border-b border-slate-700/80 mb-4 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('missions')}
            className={`pb-2 transition-colors flex items-center gap-2 ${
              activeTab === 'missions'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>MISSIONS & SCENARIOS</span>
          </button>
          <button
            onClick={() => setActiveTab('garage')}
            className={`pb-2 transition-colors flex items-center gap-2 ${
              activeTab === 'garage'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>ZAMBONI GARAGE & SKINS</span>
          </button>
        </div>

        {/* Missions Selection */}
        {activeTab === 'missions' && (
          <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
            {MISSIONS.map((mission) => {
              const isSelected = selectedMission.id === mission.id;
              const rec = records[mission.id];
              return (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-400 shadow-md shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{mission.title}</span>
                    <div className="flex items-center gap-2">
                      {rec && rec.starsEarned > 0 && (
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: rec.starsEarned }).map((_, si) => (
                            <Star key={si} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      )}
                      <span className="font-mono text-xs text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                        {mission.timeLimitSeconds > 0 ? `${mission.timeLimitSeconds}s LIMIT` : 'FREE MODE'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                    <span>{mission.subtitle}</span>
                    {rec && (
                      <span className="font-mono text-[10px] text-emerald-400">
                        BEST: {rec.bestCleanPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300">{mission.description}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Zamboni Garage Skin Picker */}
        {activeTab === 'garage' && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ZAMBONI_SKINS.map((skin) => {
              const isSelected = selectedSkin.id === skin.id;
              return (
                <div
                  key={skin.id}
                  onClick={() => onSelectSkin(skin)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-400 shadow-md shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/40 shadow-inner flex-shrink-0"
                    style={{ backgroundColor: skin.primaryColor }}
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{skin.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">CHASSIS & HOPPER</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Start Game Action CTA */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onStartMission(selectedMission)}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold tracking-wider uppercase text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START MISSION · {selectedMission.title}</span>
          </button>
        </div>

        {/* Flat Control Hint Line */}
        <div className="mt-4 text-xs font-mono text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            <strong className="text-slate-200">WASD / Arrows</strong> Move & Steer
          </span>
          <span>·</span>
          <span>
            <strong className="text-slate-200">Space</strong> Blade Lower/Raise
          </span>
          <span>·</span>
          <span>
            <strong className="text-slate-200">C</strong> Cycle Camera
          </span>
          <span>·</span>
          <span>
            <strong className="text-slate-200">H</strong> Arena Horn
          </span>
          <span>·</span>
          <span>
            <strong className="text-slate-200">Esc</strong> Pause
          </span>
          <span>·</span>
          <span>
            <strong className="text-slate-200">V</strong> Highlight Snow
          </span>
          <span>·</span>
          <span>
            <strong className="text-slate-200">R</strong> Respawn
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-300 z-10 pt-4 border-t border-slate-800/60">
        <div>ZAMBONI ICE RESURFACING SYSTEM · MODEL 500</div>
        <div>PRESS ENTER OR CLICK START TO COMMENCE RESURFACING</div>
      </div>
    </div>
  );
};
