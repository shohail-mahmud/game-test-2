import { useEffect, useRef, useState } from "react";
import { Game, GameState, DiscoveryEvent } from "@/game/Game";
import { GameUI } from "@/components/GameUI";
import { BOAT_CATALOG } from "@/game/BoatCatalog";
import { loadProgress, saveProgress, clearProgress, type PlayerProgress } from "@/game/Progress";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const scoreRef = useRef(0);
  const [state, setState] = useState<GameState>("menu");
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [crashes, setCrashes] = useState(0);

  const score = progress.gold;
  scoreRef.current = score;

  const persistProgress = (next: PlayerProgress) => {
    const saved = saveProgress(next);
    setProgress(saved);
    return saved;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initialProgress = loadProgress();
    setProgress(initialProgress);
    scoreRef.current = initialProgress.gold;

    const game = new Game(canvas, {
      initialScore: initialProgress.gold,
      onDiscovery: (event: DiscoveryEvent) => {
        window.dispatchEvent(new CustomEvent("discovery", { detail: event }));
      },
      onCountChange: setDiscoveryCount,
      onStateChange: setState,
      onScoreChange: (nextScore) => {
        const previous = scoreRef.current;
        scoreRef.current = nextScore;
        setProgress((current) => saveProgress({ ...current, gold: nextScore }));
        if (nextScore > previous) {
          window.dispatchEvent(new CustomEvent("coin", { detail: nextScore - previous }));
        }
      },
      onCrash: () => {
        window.dispatchEvent(new CustomEvent("crash"));
        setCrashes((c) => c + 1);
      },
    });
    gameRef.current = game;

    const onKey = (e: KeyboardEvent) => {
      const pauseBinding = game.input.bindings.pause;
      const isPause = e.key === pauseBinding || e.code === pauseBinding;
      if (isPause && game.state === "playing") {
        game.pause();
      } else if (isPause && game.state === "paused") {
        game.resume();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleStart = () => gameRef.current?.start();
  const handleResume = () => gameRef.current?.resume();
  const handlePause = () => gameRef.current?.pause();
  const handleHome = () => {
    setDiscoveryCount(0);
    setCrashes(0);
    gameRef.current?.goHome();
  };
  const handleExit = () => {
    try {
      window.close();
    } catch {
      /* noop */
    }
  };

  const handleBuyBoat = (boatId: string) => {
    const boat = BOAT_CATALOG.find((item) => item.id === boatId);
    if (!boat || progress.ownedBoatIds.includes(boatId) || progress.gold < boat.price) return;

    const next = persistProgress({
      ...progress,
      gold: progress.gold - boat.price,
      ownedBoatIds: [...progress.ownedBoatIds, boatId],
      selectedBoatId: boatId,
    });
    scoreRef.current = next.gold;
    gameRef.current?.setScore(next.gold);
    window.dispatchEvent(new CustomEvent("boat-selected", { detail: boatId }));
    window.dispatchEvent(new CustomEvent("shop", { detail: `${boat.name} purchased` }));
  };

  const handleSelectBoat = (boatId: string) => {
    if (!progress.ownedBoatIds.includes(boatId)) return;
    const boat = BOAT_CATALOG.find((item) => item.id === boatId);
    persistProgress({ ...progress, selectedBoatId: boatId });
    window.dispatchEvent(new CustomEvent("boat-selected", { detail: boatId }));
    window.dispatchEvent(new CustomEvent("shop", { detail: `${boat?.name ?? "Boat"} equipped` }));
  };

  const handleResetProgress = () => {
    const next = clearProgress();
    scoreRef.current = next.gold;
    setProgress(next);
    gameRef.current?.setScore(next.gold);
    window.dispatchEvent(new CustomEvent("boat-selected", { detail: next.selectedBoatId }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="game-canvas" />
      <GameUI
        state={state}
        discoveryCount={discoveryCount}
        score={score}
        crashes={crashes}
        boats={BOAT_CATALOG}
        ownedBoatIds={progress.ownedBoatIds}
        selectedBoatId={progress.selectedBoatId}
        onBuyBoat={handleBuyBoat}
        onSelectBoat={handleSelectBoat}
        onResetProgress={handleResetProgress}
        onStart={handleStart}
        onResume={handleResume}
        onPause={handlePause}
        onHome={handleHome}
        onExit={handleExit}
      />
    </div>
  );
}
