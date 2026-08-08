import { useEffect, useRef, useState } from "react";
import { DiscoveryEvent, GameState } from "@/game/Game";
import { settingsManager, type GameSettings, type KeyBindings } from "@/game/Settings";
import type { BoatDefinition } from "@/game/BoatCatalog";

interface GameUIProps {
  state: GameState;
  discoveryCount: number;
  score: number;
  crashes: number;
  boats: BoatDefinition[];
  ownedBoatIds: string[];
  selectedBoatId: string;
  onBuyBoat: (boatId: string) => void;
  onSelectBoat: (boatId: string) => void;
  onResetProgress: () => void;
  onStart: () => void;
  onResume: () => void;
  onPause: () => void;
  onHome?: () => void;
  onExit?: () => void;
}

type ToastKind = "discovery" | "coin" | "crash" | "shop";
interface Toast {
  id: number;
  label: string;
  kind: ToastKind;
}

export function GameUI({
  state,
  discoveryCount,
  score,
  crashes,
  boats,
  ownedBoatIds,
  selectedBoatId,
  onBuyBoat,
  onSelectBoat,
  onResetProgress,
  onStart,
  onResume,
  onPause,
  onHome,
  onExit,
}: GameUIProps) {
  const [settings, setSettings] = useState<GameSettings>(settingsManager.get());
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bindingKey, setBindingKey] = useState<keyof KeyBindings | null>(null);
  const toastQueue = useRef<Toast[]>([]);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return settingsManager.subscribe(setSettings);
  }, []);

  useEffect(() => {
    const discoveryHandler = (e: Event) => {
      const event = (e as CustomEvent<DiscoveryEvent>).detail;
      queueToast(event.label, "discovery");
    };
    const coinHandler = (e: Event) => queueToast(`+${(e as CustomEvent<number>).detail ?? 10} gold`, "coin");
    const crashHandler = () => queueToast("Collision", "crash");
    const shopHandler = (e: Event) => queueToast((e as CustomEvent<string>).detail, "shop");

    window.addEventListener("discovery", discoveryHandler);
    window.addEventListener("coin", coinHandler);
    window.addEventListener("crash", crashHandler);
    window.addEventListener("shop", shopHandler);
    return () => {
      window.removeEventListener("discovery", discoveryHandler);
      window.removeEventListener("coin", coinHandler);
      window.removeEventListener("crash", crashHandler);
      window.removeEventListener("shop", shopHandler);
    };
  }, []);

  useEffect(() => {
    if (bindingKey) {
      const handler = (e: KeyboardEvent) => {
        e.preventDefault();
        const key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toLowerCase() : e.key;
        settingsManager.update({
          bindings: { ...settings.bindings, [bindingKey]: key },
        });
        setBindingKey(null);
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [bindingKey, settings.bindings]);

  const queueToast = (label: string, kind: ToastKind) => {
    const id = Date.now() + Math.random();
    toastQueue.current.push({ id, label, kind });
    processToastQueue();
  };

  const processToastQueue = () => {
    if (toastTimer.current || toastQueue.current.length === 0) return;
    const next = toastQueue.current.shift();
    if (!next) return;

    setToasts((prev) => [...prev.slice(-2), next]);
    toastTimer.current = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== next.id));
      toastTimer.current = null;
      processToastQueue();
    }, next.kind === "coin" ? 1400 : 2400);
  };

  const updateAudio = (audio: Partial<GameSettings["audio"]>) => {
    settingsManager.update({ audio: { ...settings.audio, ...audio } });
  };

  const inSettings = showSettings;
  const inShop = showShop;
  const inAbout = showAbout;
  const inMenu = state === "menu" && !inSettings && !inShop && !inAbout;
  const inPause = state === "paused" && !inSettings && !inShop && !inAbout;
  const inGame = state === "playing";
  const selectedBoat = boats.find((boat) => boat.id === selectedBoatId) ?? boats[0];

  const serif = { fontFamily: "var(--font-headline)" };
  const sans = { fontFamily: "var(--font-body)" };

  const Button = ({
    children,
    onClick,
    variant = "solid",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "solid" | "ghost";
  }) => (
    <button
      onClick={onClick}
      style={sans}
      className={`
        w-full text-left px-5 py-3 text-[11px] uppercase tracking-[0.22em] transition-all duration-150
        ${
          variant === "ghost"
            ? "text-white/70 hover:text-white hover:pl-7"
            : "bg-white text-black hover:bg-white/85"
        }
      `}
    >
      {children}
    </button>
  );

  const Slider = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
  }) => (
    <div className="mb-5">
      <div className="flex justify-between mb-2 text-[10px] uppercase tracking-[0.18em] text-white/60" style={sans}>
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-[1px] appearance-none bg-white/20 outline-none cursor-pointer"
        style={{
          backgroundImage: `linear-gradient(to right, white ${value * 100}%, rgba(255,255,255,0.2) ${value * 100}%)`,
        }}
      />
    </div>
  );

  const Toggle = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between mb-4">
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/80" style={sans}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 border transition-colors duration-150 ${value ? "bg-white border-white" : "bg-transparent border-white/30"}`}
      />
    </div>
  );

  return (
    <div className="ui-layer" style={sans}>
      {/* Main Menu */}
      {inMenu && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/88 fade-in">
          <div className="w-full max-w-xs px-10">
            <div className="mb-20 text-center">
              <p className="text-[9px] uppercase tracking-[0.5em] text-white/40 mb-6" style={sans}>
                A Sailing Game
              </p>
              <h1 className="text-7xl text-white leading-[0.85] tracking-tight" style={serif}>
                SEA
                <br />
                EXPLORER
              </h1>
            </div>
            <nav className="space-y-1">
              <Button onClick={onStart}>Play</Button>
              <Button onClick={() => setShowShop(true)} variant="ghost">
                Shipyard
              </Button>
              <Button onClick={() => setShowSettings(true)} variant="ghost">
                Settings
              </Button>
              <Button onClick={() => setShowAbout(true)} variant="ghost">
                About
              </Button>
              <Button onClick={() => onExit?.()} variant="ghost">
                Exit
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* Shipyard / Boat Shop */}
      {inShop && (
        <div className="absolute inset-0 z-[65] flex items-center justify-center bg-[#04111f]/95 fade-in pointer-events-auto">
          <div className="w-full max-w-5xl mx-4 max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-slate-950/95 via-sky-950/90 to-amber-950/60 shadow-2xl shadow-cyan-950/40">
            <div className="sticky top-0 z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 bg-black/35 backdrop-blur px-5 sm:px-7 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-amber-200/70" style={sans}>
                  Captain's Shipyard
                </p>
                <h2 className="text-4xl sm:text-5xl text-white tracking-tight" style={serif}>
                  Buy & Equip Boats
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-amber-100">
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 mr-2">Gold</span>
                  <span className="text-2xl" style={serif}>{score.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setShowShop(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white hover:text-black transition-colors"
                  style={sans}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5 sm:p-7">
              {boats.map((boat) => {
                const owned = ownedBoatIds.includes(boat.id);
                const selected = selectedBoatId === boat.id;
                const affordable = score >= boat.price;
                return (
                  <div
                    key={boat.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                      selected
                        ? "border-amber-300/80 bg-amber-300/15 shadow-lg shadow-amber-900/20"
                        : "border-white/10 bg-white/[0.06] hover:border-cyan-200/40 hover:bg-cyan-200/[0.08]"
                    }`}
                  >
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.24em] text-cyan-100/50" style={sans}>
                            {owned ? selected ? "Equipped" : "Owned" : "For Sale"}
                          </p>
                          <h3 className="text-2xl text-white" style={serif}>{boat.name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-xl text-amber-100" style={serif}>{boat.price === 0 ? "Free" : boat.price.toLocaleString()}</div>
                          <div className="text-[9px] uppercase tracking-[0.2em] text-white/35">coins</div>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-white/60 min-h-[48px] mb-5">{boat.description}</p>
                      <div className="grid grid-cols-2 gap-2 mb-5 text-[10px] uppercase tracking-[0.18em] text-white/50">
                        <div className="rounded-lg bg-black/25 px-3 py-2">Speed {(boat.speedMultiplier * 100).toFixed(0)}%</div>
                        <div className="rounded-lg bg-black/25 px-3 py-2">Turn {(boat.turnMultiplier * 100).toFixed(0)}%</div>
                      </div>
                      {owned ? (
                        <button
                          onClick={() => onSelectBoat(boat.id)}
                          disabled={selected}
                          className={`w-full rounded-xl px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                            selected ? "bg-amber-300 text-black cursor-default" : "bg-white text-black hover:bg-cyan-100"
                          }`}
                          style={sans}
                        >
                          {selected ? "Currently Sailing" : "Equip Boat"}
                        </button>
                      ) : (
                        <button
                          onClick={() => onBuyBoat(boat.id)}
                          disabled={!affordable}
                          className={`w-full rounded-xl px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                            affordable ? "bg-amber-300 text-black hover:bg-amber-200" : "bg-white/10 text-white/35 cursor-not-allowed"
                          }`}
                          style={sans}
                        >
                          {affordable ? "Buy Boat" : `Need ${(boat.price - score).toLocaleString()} More`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* About / Credits */}
      {inAbout && (
        <div className="absolute inset-0 z-[66] flex items-center justify-center bg-[#030812]/95 fade-in pointer-events-auto">
          <div className="w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-sky-950/90 to-slate-900 p-6 sm:p-9 shadow-2xl shadow-cyan-950/50">
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-100/50 mb-2" style={sans}>
              About This Game
            </p>
            <h2 className="text-5xl text-white mb-5" style={serif}>Sea Explorer</h2>
            <p className="text-white/65 leading-7 mb-7">
              A browser-based pirate sea exploration game built with React, Vite, TypeScript, and Three.js.
              Sail, collect gold, discover islands, and unlock new ships in the Shipyard.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 mb-7">
              <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <h3 className="text-xl text-amber-100 mb-3" style={serif}>Developer</h3>
                <ul className="space-y-2 text-sm text-white/65">
                  <li><span className="text-white/40">GitHub:</span> shohail-mahmud</li>
                  <li><span className="text-white/40">Instagram:</span> @shohailmahmud09</li>
                </ul>
              </section>
              <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <h3 className="text-xl text-amber-100 mb-3" style={serif}>3D Credits</h3>
                <ul className="space-y-2 text-sm text-white/65">
                  <li>Kenney Pirate Kit — CC0</li>
                  <li>Kenney Watercraft Kit — CC0</li>
                  <li>Ocean Wave - w/Maya by Ricky Paul Club — CC BY 4.0</li>
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.05] p-5 mb-7">
              <h3 className="text-xl text-cyan-100 mb-3" style={serif}>Ocean Credit</h3>
              <p className="text-sm text-white/65 leading-7">
                The ocean wave visual style is credited to the Sketchfab model
                <span className="text-white"> “Ocean Wave - w/Maya” </span>
                by <span className="text-white">Ricky Paul Club</span>, licensed under
                <span className="text-white"> Creative Commons Attribution 4.0</span>.
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/35 break-all">
                sketchfab.com/3d-models/ocean-wave-wmaya-03f0559f6b7646ea9014e2e72f71b198
              </p>
            </section>

            <button
              onClick={() => setShowAbout(false)}
              className="w-full rounded-xl bg-white px-5 py-3 text-left text-[11px] uppercase tracking-[0.22em] text-black hover:bg-cyan-100 transition-colors"
              style={sans}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      {inSettings && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/92 fade-in">
          <div className="w-full max-w-md px-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-4xl text-white mb-10 tracking-tight" style={serif}>
              Settings
            </h2>

            <section className="mb-10">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 border-b border-white/10 pb-2" style={sans}>
                Controls
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
                {(Object.keys(settings.bindings) as (keyof KeyBindings)[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setBindingKey(key)}
                    className="flex justify-between items-center text-left py-2 border-b border-white/10 hover:border-white/30 transition-colors"
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] text-white/70" style={sans}>
                      {key}
                    </span>
                    <span
                      className={`text-[11px] uppercase tracking-wider ${bindingKey === key ? "text-white animate-pulse" : "text-white/40"}`}
                      style={sans}
                    >
                      {settings.bindings[key]}
                    </span>
                  </button>
                ))}
              </div>
              {bindingKey && (
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-6" style={sans}>
                  Press a key for {bindingKey}...
                </p>
              )}
              <Slider
                label="Camera Sensitivity"
                value={settings.sensitivity}
                onChange={(v) => settingsManager.update({ sensitivity: v })}
              />
            </section>

            <section className="mb-10">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 border-b border-white/10 pb-2" style={sans}>
                Audio
              </h3>
              <Toggle label="Master Sound" value={settings.audio.masterEnabled} onChange={(v) => updateAudio({ masterEnabled: v })} />
              <Toggle label="Music" value={settings.audio.musicEnabled} onChange={(v) => updateAudio({ musicEnabled: v })} />
              <Toggle label="Sound Effects" value={settings.audio.sfxEnabled} onChange={(v) => updateAudio({ sfxEnabled: v })} />
              <Slider
                label="Music Volume"
                value={settings.audio.musicVolume}
                onChange={(v) => updateAudio({ musicVolume: v })}
              />
              <Slider
                label="Effects Volume"
                value={settings.audio.sfxVolume}
                onChange={(v) => updateAudio({ sfxVolume: v })}
              />
            </section>

            <div className="space-y-2">
              <Button onClick={() => settingsManager.reset()} variant="ghost">
                Reset Settings
              </Button>
              <Button onClick={onResetProgress} variant="ghost">
                Reset Saved Progress
              </Button>
              <Button onClick={() => setShowSettings(false)}>Back</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pause */}
      {inPause && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 fade-in pointer-events-auto">
          <div className="w-full max-w-xs px-10">
            <h2 className="text-5xl text-white mb-14 text-center tracking-tight" style={serif}>
              PAUSED
            </h2>
            <nav className="space-y-1">
              <Button onClick={onResume}>Resume</Button>
              <Button onClick={() => setShowShop(true)} variant="ghost">
                Shipyard
              </Button>
              <Button onClick={() => setShowSettings(true)} variant="ghost">
                Settings
              </Button>
              <Button onClick={() => onHome?.()} variant="ghost">
                Home
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* HUD */}
      {inGame && (
        <>
          <div className="absolute top-0 left-0 right-0 p-6 sm:p-8 flex items-start justify-between pointer-events-none">
            <div className="flex divide-x divide-white/10 border border-white/10 bg-black/60">
              {[
                { label: "Gold", value: score },
                { label: "Found", value: discoveryCount },
                { label: "Crashes", value: crashes },
              ].map((item) => (
                <div key={item.label} className="px-4 py-2 min-w-[72px]">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-0.5" style={sans}>
                    {item.label}
                  </div>
                  <div className="text-xl text-white font-normal" style={serif}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="hidden md:block bg-black/60 border border-white/10 text-white px-4 py-2">
                <div className="text-[8px] uppercase tracking-[0.2em] text-white/35">Boat</div>
                <div className="text-[12px] text-amber-100" style={serif}>{selectedBoat.name}</div>
              </div>
              <button
                onClick={() => setShowShop(true)}
                style={sans}
                className="bg-amber-300/90 border border-amber-100/40 text-black text-[10px] uppercase tracking-[0.2em] px-5 py-2 hover:bg-amber-200 transition-colors duration-150"
              >
                Shipyard
              </button>
              <button
                onClick={onPause}
                style={sans}
                className="bg-black/60 border border-white/10 text-white text-[10px] uppercase tracking-[0.2em] px-5 py-2 hover:bg-white hover:text-black transition-colors duration-150"
              >
                Pause
              </button>
            </div>
          </div>

          {/* Notifications - bottom left, tiny */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-1 pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="discovery-toast flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-[0.15em] bg-black/70 text-white/90 border-l border-white/30"
                style={sans}
              >
                <span className="opacity-50">
                  {toast.kind === "coin" ? "+" : toast.kind === "crash" ? "!" : toast.kind === "shop" ? "⚓" : "~"}
                </span>
                <span>{toast.label}</span>
              </div>
            ))}
          </div>

          {/* Controls hint - bottom right */}
          <div
            className="absolute bottom-6 right-6 text-[9px] uppercase tracking-[0.15em] text-white/30 pointer-events-none hidden sm:block"
            style={sans}
          >
            {settings.bindings.forward.toUpperCase()} {settings.bindings.left.toUpperCase()} {settings.bindings.backward.toUpperCase()}{" "}
            {settings.bindings.right.toUpperCase()} · {settings.bindings.pause}
          </div>
        </>
      )}
    </div>
  );
}
