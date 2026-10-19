import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { CameraView, GameMetrics, GameStatus, MissionConfig, ZamboniSkin, ZamboniState } from './types/game';
import { MISSIONS } from './data/missions';
import { ZAMBONI_SKINS } from './data/skins';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { MobileControls } from './components/MobileControls';
import { soundEffects } from './audio/SoundEffects';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  const [currentMission, setCurrentMission] = useState<MissionConfig>(MISSIONS[0]);
  const [selectedSkin, setSelectedSkin] = useState<ZamboniSkin>(ZAMBONI_SKINS[0]);
  const [cameraView, setCameraView] = useState<CameraView>('chase');
  const [isMuted, setIsMuted] = useState(false);
  const [isHighlightActive, setIsHighlightActive] = useState(false);

  // High-frequency metrics & Zamboni state passed to HUD
  const [metrics, setMetrics] = useState<GameMetrics>({
    cleanPercentage: 0,
    timeRemaining: 120,
    timeElapsed: 0,
    score: 0,
    starsEarned: 0,
    distanceTraveled: 0,
    boardCollisions: 0,
  });

  const [zamboniState, setZamboniState] = useState<ZamboniState>({
    x: 0,
    z: -12.5,
    angle: 0,
    speed: 0,
    steerAngle: 0,
    conditionerDown: false,
    snowTankLevel: 0,
    waterTankLevel: 100,
    hornActive: false,
  });

  // Initialize Three.js Game Engine once on mount
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new GameEngine(canvasContainerRef.current, selectedSkin);
    engineRef.current = engine;

    // Metrics update listener from 60fps loop (throttled to UI)
    let lastUiUpdate = 0;
    engine.onMetricsUpdate = (m, state) => {
      const now = performance.now();
      if (now - lastUiUpdate > 65) {
        // ~15fps UI state sync keeps React overhead zero while 3D runs at 60fps
        lastUiUpdate = now;
        setMetrics({ ...m });
        setZamboniState({ ...state });
      }
    };

    engine.onGameEnd = (endStatus, finalMetrics) => {
      setGameStatus(endStatus);
      setMetrics({ ...finalMetrics });
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid scrolling on space/arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.keys.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.keys.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') engine.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') engine.keys.right = true;

      if (e.code === 'Space') {
        if (engine.status === 'playing') {
          engine.toggleConditioner();
          setZamboniState((prev) => ({ ...prev, conditionerDown: engine.state.conditionerDown }));
        } else if (engine.status === 'menu') {
          handleStartMission(currentMission);
        }
      }

      if (e.code === 'KeyC') {
        handleCycleCamera();
      }

      if (e.code === 'KeyH') {
        engine.triggerHorn();
      }

      if (e.code === 'KeyV') {
        const active = engine.toggleHighlightMode();
        setIsHighlightActive(active);
      }

      if (e.code === 'KeyR' && engine.status === 'playing') {
        engine.respawn();
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (engine.status === 'playing' || engine.status === 'paused') {
          handleTogglePause();
        }
      }

      if (e.code === 'Enter' && engine.status === 'menu') {
        handleStartMission(currentMission);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.keys.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.keys.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') engine.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') engine.keys.right = false;
    };

    const handleBlur = () => {
      // Clear held keys on blur
      engine.keys.forward = false;
      engine.keys.backward = false;
      engine.keys.left = false;
      engine.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      engine.destroy();
    };
  }, []);

  // Skin switch handler
  const handleSelectSkin = (skin: ZamboniSkin) => {
    setSelectedSkin(skin);
    if (engineRef.current) {
      engineRef.current.setSkin(skin);
    }
  };

  // Start mission handler
  const handleStartMission = useCallback((mission: MissionConfig) => {
    setCurrentMission(mission);
    setGameStatus('playing');
    soundEffects.init();
    if (engineRef.current) {
      engineRef.current.startMission(mission);
    }
  }, []);

  // Pause toggle handler
  const handleTogglePause = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.togglePause();
    setGameStatus(engineRef.current.status);
  }, []);

  // Camera cycle handler
  const handleCycleCamera = useCallback(() => {
    setCameraView((prev) => {
      let next: CameraView = 'chase';
      if (prev === 'chase') next = 'driver';
      else if (prev === 'driver') next = 'top_down';
      else if (prev === 'top_down') next = 'chase';

      if (engineRef.current) {
        engineRef.current.setCameraView(next);
      }
      return next;
    });
  }, []);

  // Blade toggle
  const handleToggleConditioner = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.toggleConditioner();
      setZamboniState((prev) => ({ ...prev, conditionerDown: engineRef.current!.state.conditionerDown }));
    }
  }, []);

  // Horn trigger
  const handleTriggerHorn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerHorn();
    }
  }, []);

  // Sound mute toggle
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEffects.setMuted(next);
      return next;
    });
  }, []);

  // Highlight remaining snow toggle
  const handleToggleHighlight = useCallback(() => {
    if (engineRef.current) {
      const active = engineRef.current.toggleHighlightMode();
      setIsHighlightActive(active);
    }
  }, []);

  // Next mission handler
  const handleNextMission = useCallback(() => {
    const currentIndex = MISSIONS.findIndex((m) => m.id === currentMission.id);
    const nextMission = MISSIONS[(currentIndex + 1) % MISSIONS.length];
    handleStartMission(nextMission);
  }, [currentMission, handleStartMission]);

  // Main menu return
  const handleMainMenu = useCallback(() => {
    setGameStatus('menu');
    if (engineRef.current) {
      engineRef.current.status = 'menu';
    }
  }, []);

  // Respawn Zamboni to center entrance
  const handleRespawn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.respawn();
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-white">
      {/* Three.js Isolated Canvas Mount (Never unmounted by React state changes) */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {gameStatus === 'menu' && (
        <TitleScreen
          onStartMission={handleStartMission}
          selectedSkin={selectedSkin}
          onSelectSkin={handleSelectSkin}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game Active HUD Overlay */}
      {(gameStatus === 'playing' || gameStatus === 'paused') && engineRef.current && (
        <GameHUD
          metrics={metrics}
          zamboniState={zamboniState}
          mission={currentMission}
          cameraView={cameraView}
          rinkManager={engineRef.current.rinkManager}
          isMuted={isMuted}
          isHighlightActive={isHighlightActive}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onToggleConditioner={handleToggleConditioner}
          onCycleCamera={handleCycleCamera}
          onTriggerHorn={handleTriggerHorn}
          onToggleHighlight={handleToggleHighlight}
          onRespawn={handleRespawn}
        />
      )}

      {/* On-Screen Mobile Touch Controls */}
      {gameStatus === 'playing' && engineRef.current && (
        <MobileControls
          onForward={(active) => {
            if (engineRef.current) engineRef.current.keys.forward = active;
          }}
          onBackward={(active) => {
            if (engineRef.current) engineRef.current.keys.backward = active;
          }}
          onLeft={(active) => {
            if (engineRef.current) engineRef.current.keys.left = active;
          }}
          onRight={(active) => {
            if (engineRef.current) engineRef.current.keys.right = active;
          }}
          onToggleBlade={handleToggleConditioner}
          onTriggerHorn={handleTriggerHorn}
          onToggleHighlight={handleToggleHighlight}
          onRespawn={handleRespawn}
          isBladeDown={zamboniState.conditionerDown}
          isHighlightActive={isHighlightActive}
        />
      )}

      {/* Pause Modal */}
      {gameStatus === 'paused' && (
        <PauseModal
          onResume={handleTogglePause}
          onRestart={() => handleStartMission(currentMission)}
          onMainMenu={handleMainMenu}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game Over / Victory Modal */}
      {(gameStatus === 'victory' || gameStatus === 'game_over') && (
        <GameOverModal
          status={gameStatus}
          metrics={metrics}
          mission={currentMission}
          onRestart={() => handleStartMission(currentMission)}
          onNextMission={handleNextMission}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  );
}
