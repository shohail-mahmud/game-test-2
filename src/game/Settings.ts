export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  pause: string;
}

export interface AudioSettings {
  masterEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface GameSettings {
  sensitivity: number;
  bindings: KeyBindings;
  audio: AudioSettings;
}

const DEFAULTS: GameSettings = {
  sensitivity: 1,
  bindings: {
    forward: "w",
    backward: "s",
    left: "a",
    right: "d",
    pause: "Escape",
  },
  audio: {
    masterEnabled: true,
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7,
  },
};

const STORAGE_KEY = "sea-explorer-settings";

export class SettingsManager {
  private settings: GameSettings;
  private listeners: ((s: GameSettings) => void)[] = [];

  constructor() {
    this.settings = this.load();
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        return this.merge(DEFAULTS, parsed);
      }
    } catch {
      // ignore
    }
    return structuredClone(DEFAULTS);
  }

  private merge(base: GameSettings, partial: Partial<GameSettings>): GameSettings {
    return {
      sensitivity: partial.sensitivity ?? base.sensitivity,
      bindings: { ...base.bindings, ...partial.bindings },
      audio: { ...base.audio, ...partial.audio },
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  get(): GameSettings {
    return this.settings;
  }

  update(partial: Partial<GameSettings>) {
    this.settings = this.merge(this.settings, partial);
    this.save();
    this.notify();
  }

  reset() {
    this.settings = structuredClone(DEFAULTS);
    this.save();
    this.notify();
  }

  subscribe(cb: (s: GameSettings) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.settings);
    }
  }
}

export const settingsManager = new SettingsManager();
