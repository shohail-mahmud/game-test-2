import { STARTER_BOAT_ID } from "./BoatCatalog";

const STORAGE_KEY = "seaExplorerProgress.v3";

export interface PlayerProgress {
  gold: number;
  ownedBoatIds: string[];
  selectedBoatId: string;
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  gold: 0,
  ownedBoatIds: [STARTER_BOAT_ID],
  selectedBoatId: STARTER_BOAT_ID,
};

function normalize(progress: Partial<PlayerProgress> | null | undefined): PlayerProgress {
  const owned = Array.from(new Set([STARTER_BOAT_ID, ...(progress?.ownedBoatIds ?? [])]));
  const selected = progress?.selectedBoatId && owned.includes(progress.selectedBoatId)
    ? progress.selectedBoatId
    : STARTER_BOAT_ID;

  return {
    gold: Math.max(0, Math.floor(Number(progress?.gold ?? 0))),
    ownedBoatIds: owned,
    selectedBoatId: selected,
  };
}

export function loadProgress(): PlayerProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return normalize(JSON.parse(raw) as Partial<PlayerProgress>);
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PlayerProgress): PlayerProgress {
  const normalized = normalize(progress);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("progress-updated", { detail: normalized }));
  }
  return normalized;
}

export function clearProgress(): PlayerProgress {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("progress-updated", { detail: DEFAULT_PROGRESS }));
  }
  return DEFAULT_PROGRESS;
}
