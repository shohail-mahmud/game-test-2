import * as THREE from "three";
import { Input } from "./Input";
import { Boat } from "./Boat";
import { CameraController } from "./Camera";
import { World } from "./World";
import { DiscoverySystem, type DiscoveryEvent } from "./Discovery";
export type { DiscoveryEvent } from "./Discovery";
import { AudioManager } from "./Audio";
import { WakeSystem } from "./Wake";
import { CoinSystem } from "./Coins";
import { settingsManager } from "./Settings";
import { FOG_COLOR, CHUNK_SIZE } from "./constants";

export type GameState = "menu" | "playing" | "paused";

interface GameCallbacks {
  onDiscovery: (event: DiscoveryEvent) => void;
  onCountChange: (count: number) => void;
  onStateChange: (state: GameState) => void;
  onScoreChange?: (score: number) => void;
  onCrash?: () => void;
  initialScore?: number;
}

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  boat: Boat;
  camera: CameraController;
  world: World;
  input: Input;
  discovery: DiscoverySystem;
  audio: AudioManager;
  wake: WakeSystem;
  coins: CoinSystem;

  private clock = new THREE.Clock();
  private score = 0;
  private rafId = 0;
  private callbacks: GameCallbacks;
  private _state: GameState = "menu";
  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private settings = settingsManager.get();
  private unsubscribeSettings: () => void;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.score = callbacks.initialScore ?? 0;
    this.input = new Input();
    this.audio = new AudioManager();
    this.unsubscribeSettings = settingsManager.subscribe((s) => {
      this.settings = s;
    });

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "low-power",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(FOG_COLOR);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG_COLOR);
    this.scene.fog = new THREE.Fog(FOG_COLOR, 90, 340);

    this.ambient = new THREE.AmbientLight(0x4a6a85, 0.55);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffe8c0, 1.15);
    this.sun.position.set(80, 110, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 350;
    this.sun.shadow.camera.left = -180;
    this.sun.shadow.camera.right = 180;
    this.sun.shadow.camera.top = 180;
    this.sun.shadow.camera.bottom = -180;
    this.scene.add(this.sun);

    const hemi = new THREE.HemisphereLight(0x7ab8d0, 0x0d2133, 0.5);
    this.scene.add(hemi);

    this.camera = new CameraController(canvas.clientWidth / canvas.clientHeight);
    this.boat = new Boat(this.input);
    this.scene.add(this.boat.mesh);

    this.world = new World(this.scene);
    this.discovery = new DiscoverySystem();
    this.wake = new WakeSystem(this.scene);
    this.coins = new CoinSystem(this.scene);

    window.addEventListener("resize", this.handleResize);
  }

  get state(): GameState {
    return this._state;
  }

  set state(next: GameState) {
    this._state = next;
    this.callbacks.onStateChange(next);
  }

  start() {
    if (this._state === "menu") {
      this.audio.enable();
      this.audio.resumeIfSuspended();
      this.audio.play("click");
      this.state = "playing";
      this.clock.start();
      this.loop();
    } else if (this._state === "paused") {
      this.audio.resumeIfSuspended();
      this.audio.play("click");
      this.state = "playing";
      this.clock.start();
      this.loop();
    }
  }

  pause() {
    if (this._state === "playing") {
      this.audio.play("click");
      this.state = "paused";
      cancelAnimationFrame(this.rafId);
    }
  }

  resume() {
    this.start();
  }

  restart() {
    this.audio.play("click");
    this.boat.position.set(0, 0, 0);
    this.boat.velocity = 0;
    this.boat.angle = 0;
    this.boat.mesh.position.set(0, 0, 0);
    this.boat.mesh.rotation.set(0, 0, 0);
    this.discovery.clear();
    this.coins.clear();
    this.callbacks.onCountChange(0);
    this.state = "playing";
    this.clock.start();
    this.loop();
  }

  goHome() {
    this.audio.play("click");
    cancelAnimationFrame(this.rafId);
    this.boat.position.set(0, 0, 0);
    this.boat.velocity = 0;
    this.boat.angle = 0;
    this.boat.mesh.position.set(0, 0, 0);
    this.boat.mesh.rotation.set(0, 0, 0);
    this.discovery.clear();
    this.coins.clear();
    this.callbacks.onCountChange(0);
    this.state = "menu";
  }

  setScore(score: number) {
    this.score = Math.max(0, Math.floor(score));
    this.callbacks.onScoreChange?.(this.score);
  }

  private handleResize = () => {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.resize(width / height);
  };

  private loop = () => {
    if (this._state !== "playing") return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    this.boat.update(dt, time);
    this.audio.setEngine(this.boat.speedRatio);
    this.wake.update(dt, this.boat.position, this.boat.angle, this.boat.speedRatio);

    this.world.update(this.boat.position.x, this.boat.position.z);
    this.camera.update(this.boat.position, dt, this.settings.sensitivity);

    // Coins
    const coinResult = this.coins.update(this.boat.position.x, this.boat.position.z, time);
    if (coinResult.collected > 0) {
      this.score += coinResult.collected * 100;
      this.audio.play("coin");
      this.callbacks.onScoreChange?.(this.score);
    }

    // Island collision
    if (this.world.checkIslandCollision(this.boat.position.x, this.boat.position.z)) {
      this.audio.play("crash");
      this.callbacks.onCrash?.();
      this.boat.velocity *= -0.4;
      // Push boat back slightly
      this.boat.position.x -= Math.sin(this.boat.angle) * 3;
      this.boat.position.z -= Math.cos(this.boat.angle) * 3;
    }

    const event = this.discovery.update(
      this.boat.position.x,
      this.boat.position.z,
      this.world.getAllIslands(),
      dt
    );

    if (event) {
      this.audio.play("discovery");
      this.callbacks.onDiscovery(event);
      this.callbacks.onCountChange(this.discovery.count);
    }

    // Animate ocean vertices using world-space coordinates so chunk edges align
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
        if (mesh.geometry && mesh.geometry.attributes.position && mesh.userData.isOcean) {
        const pos = mesh.geometry.attributes.position;
        const parent = mesh.parent;
        const geom = mesh.geometry as THREE.PlaneGeometry;
        const w = geom.parameters?.width ?? CHUNK_SIZE;
        const h = geom.parameters?.height ?? CHUNK_SIZE;
        const baseX = parent ? parent.position.x + mesh.position.x - w / 2 : 0;
        const baseZ = parent ? parent.position.z + mesh.position.z - h / 2 : 0;
        for (let i = 0; i < pos.count; i++) {
          const lx = pos.getX(i);
          const lz = pos.getZ(i);
          const wx = baseX + lx;
          const wz = baseZ + lz;
          const swell = Math.sin(wx * 0.055 + time * 0.7) * 0.36;
          const chop = Math.cos(wz * 0.11 + time * 1.35) * 0.16;
          const cross = Math.sin((wx + wz) * 0.04 + time * 0.95) * 0.13;
          const ripple = Math.sin((wx - wz) * 0.16 + time * 2.2) * 0.045;
          pos.setY(i, swell + chop + cross + ripple);
        }
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
      if (obj.userData.isFoam) {
        const foam = obj as THREE.Line;
        const seedOffset = foam.userData.seedOffset ?? 0;
        foam.position.y = 0.1 + Math.sin(time * 1.4 + seedOffset) * 0.05;
        foam.position.x += Math.sin(time * 0.3 + seedOffset) * 0.002;
        const mat = foam.material as THREE.LineBasicMaterial;
        mat.opacity = 0.18 + Math.sin(time * 1.2 + seedOffset) * 0.1;
      }
    });

    this.renderer.render(this.scene, this.camera.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.handleResize);
    this.audio.dispose();
    this.boat.destroy?.();
    this.input.destroy?.();
    this.unsubscribeSettings();
    this.renderer.dispose();
  }
}
