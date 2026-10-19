import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Layers, Megaphone, Eye, RotateCcw } from 'lucide-react';

interface MobileControlsProps {
  onForward: (active: boolean) => void;
  onBackward: (active: boolean) => void;
  onLeft: (active: boolean) => void;
  onRight: (active: boolean) => void;
  onToggleBlade: () => void;
  onTriggerHorn: () => void;
  onToggleHighlight?: () => void;
  onRespawn?: () => void;
  isBladeDown: boolean;
  isHighlightActive?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onForward,
  onBackward,
  onLeft,
  onRight,
  onToggleBlade,
  onTriggerHorn,
  onToggleHighlight,
  onRespawn,
  isBladeDown,
  isHighlightActive,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 md:hidden z-30 select-none">
      <div className="flex justify-between items-end w-full">
        {/* Left Hand: Steering D-Pad */}
        <div className="pointer-events-auto flex gap-2">
          <button
            onTouchStart={() => onLeft(true)}
            onTouchEnd={() => onLeft(false)}
            onMouseDown={() => onLeft(true)}
            onMouseUp={() => onLeft(false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700/80 active:bg-sky-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onTouchStart={() => onRight(true)}
            onTouchEnd={() => onRight(false)}
            onMouseDown={() => onRight(true)}
            onMouseUp={() => onRight(false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700/80 active:bg-sky-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Center: Horn, Vision, and Blade quick toggles */}
        <div className="pointer-events-auto flex gap-2 mb-1">
          <button
            onClick={onTriggerHorn}
            className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700 text-amber-400 active:scale-95 flex items-center justify-center shadow-lg"
          >
            <Megaphone className="w-5 h-5" />
          </button>
          {onToggleHighlight && (
            <button
              onClick={onToggleHighlight}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-lg active:scale-95 ${
                isHighlightActive
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900/90 border-slate-700 text-slate-400'
              }`}
            >
              <Eye className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onToggleBlade}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-lg active:scale-95 ${
              isBladeDown ? 'bg-sky-500 border-sky-300 text-white' : 'bg-slate-900/90 border-slate-700 text-slate-400'
            }`}
          >
            <Layers className="w-5 h-5" />
          </button>
          {onRespawn && (
            <button
              onClick={onRespawn}
              className="w-9 h-11 rounded-xl border border-slate-700 bg-slate-900/90 flex items-center justify-center text-slate-400 active:scale-95"
              title="Respawn / Unstuck"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
            </button>
          )}
        </div>

        {/* Right Hand: Throttle & Reverse Pedals */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            onTouchStart={() => onForward(true)}
            onTouchEnd={() => onForward(false)}
            onMouseDown={() => onForward(true)}
            onMouseUp={() => onForward(false)}
            className="w-14 h-14 rounded-2xl bg-sky-600/90 border border-sky-400/80 active:bg-sky-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <ChevronUp className="w-8 h-8" />
          </button>
          <button
            onTouchStart={() => onBackward(true)}
            onTouchEnd={() => onBackward(false)}
            onMouseDown={() => onBackward(true)}
            onMouseUp={() => onBackward(false)}
            className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700/80 active:bg-slate-700 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
};
