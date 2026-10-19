export type GameMode = 'career' | 'intermission' | 'winter_classic' | 'overtime' | 'free_skate';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'victory' | 'game_over';

export type CameraView = 'chase' | 'driver' | 'top_down';

export interface MissionConfig {
  id: GameMode;
  title: string;
  subtitle: string;
  description: string;
  timeLimitSeconds: number; // 0 for infinite
  targetCleanPercent: number; // e.g. 90
  threeStarPercent: number; // e.g. 96
  initialDirtiness: number; // 0 to 1
  snowTankCapacity: number; // Max capacity
  snowAccumulationRate: number; // snow per clean area
  weather: 'indoor' | 'snowing' | 'dimmed';
  opponentsActive?: boolean;
}

export interface ZamboniSkin {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  metalColor: string;
  unlockedByDefault: boolean;
}

export interface ZamboniState {
  x: number;
  z: number;
  angle: number;
  speed: number;
  steerAngle: number;
  conditionerDown: boolean;
  snowTankLevel: number; // 0 - 100
  waterTankLevel: number; // 0 - 100
  hornActive: boolean;
}

export interface GameMetrics {
  cleanPercentage: number;
  timeRemaining: number;
  timeElapsed: number;
  score: number;
  starsEarned: number;
  distanceTraveled: number;
  boardCollisions: number;
}
