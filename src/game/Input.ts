import { settingsManager } from "./Settings";

export class Input {
  keys: Record<string, boolean> = {};
  private settings = settingsManager.get();
  private unsubscribe: () => void;

  constructor() {
    const down = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    this.unsubscribe = settingsManager.subscribe((s) => {
      this.settings = s;
    });

    this.destroy = () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      this.unsubscribe();
    };
  }

  destroy?: () => void;

  get bindings() {
    return this.settings.bindings;
  }

  private isDown(key: string): boolean {
    return !!this.keys[key.toLowerCase()] || !!this.keys[key];
  }

  get forward(): boolean {
    return this.isDown(this.settings.bindings.forward);
  }

  get backward(): boolean {
    return this.isDown(this.settings.bindings.backward);
  }

  get left(): boolean {
    return this.isDown(this.settings.bindings.left);
  }

  get right(): boolean {
    return this.isDown(this.settings.bindings.right);
  }

  get pausePressed(): boolean {
    return this.isDown(this.settings.bindings.pause);
  }

  get any(): boolean {
    return this.forward || this.backward || this.left || this.right;
  }
}
