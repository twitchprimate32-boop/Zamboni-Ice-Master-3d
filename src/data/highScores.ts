/**
 * High scores & best intermission records stored in localStorage
 */

export interface MissionRecord {
  bestCleanPercentage: number;
  bestTimeRemaining: number;
  starsEarned: number;
  completedAt: string;
}

const STORAGE_KEY = 'zamboni_3d_mission_records';

export function getMissionRecords(): Record<string, MissionRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveMissionRecord(
  missionId: string,
  cleanPercentage: number,
  timeRemaining: number,
  starsEarned: number
): { isNewRecord: boolean } {
  try {
    const records = getMissionRecords();
    const prev = records[missionId];
    let isNewRecord = false;

    if (!prev || cleanPercentage > prev.bestCleanPercentage) {
      isNewRecord = true;
    }

    records[missionId] = {
      bestCleanPercentage: Math.max(prev?.bestCleanPercentage || 0, cleanPercentage),
      bestTimeRemaining: Math.max(prev?.bestTimeRemaining || 0, timeRemaining),
      starsEarned: Math.max(prev?.starsEarned || 0, starsEarned),
      completedAt: new Date().toLocaleDateString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return { isNewRecord };
  } catch {
    return { isNewRecord: false };
  }
}
