import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Input } from "./Input";
import { materials } from "./AssetLibrary";
import { getBoatById, type BoatDefinition } from "./BoatCatalog";
import { loadProgress } from "./Progress";
import {
  BOAT_MAX_SPEED,
  BOAT_ACCEL,
  BOAT_DECEL,
  BOAT_TURN_SPEED,
  BOAT_BOB_FREQ,
  BOAT_BOB_AMP,
} from "./constants";

const loader = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();

function loadBoatModel(boat: BoatDefinition): Promise<THREE.Group> {
  if (!modelCache.has(boat.id)) {
    modelCache.set(
      boat.id,
      new Promise((resolve, reject) => {
        loader.load(
          boat.url,
          (gltf) => {
            const scene = gltf.scene;
            scene.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.geometry.computeVertexNormals();
              }
            });
            resolve(scene);
          },
          undefined,
          reject
        );
      })
    );
  }
  return modelCache.get(boat.id)!;
}

function createFallbackBoat(): THREE.Group {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 5.2, 3, 1, 5), materials.darkWood);
  hull.position.y = 0.35;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.4, 8), materials.darkWood);
  mast.position.y = 2.7;
  mast.castShadow = true;
  group.add(mast);

  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.8, 2, 2), materials.sail);
  sail.position.set(0.15, 3.0, 0.2);
  sail.rotation.y = -0.12;
  sail.castShadow = true;
  group.add(sail);
  return group;
}

export class Boat {
  mesh: THREE.Group;
  position = new THREE.Vector3(0, 0, 0);
  velocity = 0;
  angle = 0;
  bobPhase = 0;

  private model: THREE.Object3D | null = null;
  private selectedBoat: BoatDefinition = getBoatById(loadProgress().selectedBoatId);
  private loadToken = 0;
  private onBoatSelected = (event: Event) => {
    const boatId = (event as CustomEvent<string>).detail;
    this.setBoat(boatId);
  };

  constructor(private input: Input) {
    this.mesh = new THREE.Group();
    this.mesh.add(createFallbackBoat());
    window.addEventListener("boat-selected", this.onBoatSelected);
    this.loadSelectedBoat();
  }

  private setBoat(boatId: string) {
    const next = getBoatById(boatId);
    if (next.id === this.selectedBoat.id && this.model) return;
    this.selectedBoat = next;
    this.loadSelectedBoat();
  }

  private loadSelectedBoat() {
    const token = ++this.loadToken;
    const boat = this.selectedBoat;

    loadBoatModel(boat)
      .then((source) => {
        if (token !== this.loadToken) return;
        const ship = source.clone(true);

        const box = new THREE.Box3().setFromObject(ship);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = boat.length / Math.max(size.x, size.z);

        ship.scale.setScalar(scale);
        ship.position.set(-center.x * scale, -0.38 - box.min.y * scale, -center.z * scale);
        ship.rotation.y = 0;

        this.mesh.clear();
        this.mesh.add(ship);
        this.model = ship;
      })
      .catch((error) => {
        console.error(`Failed to load player boat: ${boat.name}`, error);
      });
  }

  update(dt: number, time: number) {
    const forward = this.input.forward ? 1 : this.input.backward ? -1 : 0;
    const turn = this.input.left ? 1 : this.input.right ? -1 : 0;
    const maxSpeed = BOAT_MAX_SPEED * this.selectedBoat.speedMultiplier;
    const turnSpeed = BOAT_TURN_SPEED * this.selectedBoat.turnMultiplier;

    if (forward !== 0) {
      this.velocity += forward * BOAT_ACCEL * this.selectedBoat.speedMultiplier * dt;
    } else {
      const decel = Math.sign(this.velocity) * BOAT_DECEL * dt;
      if (Math.abs(this.velocity) <= Math.abs(decel)) {
        this.velocity = 0;
      } else {
        this.velocity -= decel;
      }
    }

    this.velocity = THREE.MathUtils.clamp(this.velocity, -maxSpeed * 0.5, maxSpeed);

    if (Math.abs(this.velocity) > 0.5) {
      this.angle += turn * turnSpeed * (this.velocity / maxSpeed) * dt;
    } else if (turn !== 0) {
      this.angle += turn * turnSpeed * 0.4 * dt;
    }

    this.position.x += Math.sin(this.angle) * this.velocity * dt;
    this.position.z += Math.cos(this.angle) * this.velocity * dt;

    this.bobPhase += dt * BOAT_BOB_FREQ;
    const bob = Math.sin(this.bobPhase) * BOAT_BOB_AMP;
    const rock = Math.sin(this.bobPhase * 0.7) * 0.04;

    this.mesh.position.copy(this.position);
    this.mesh.position.y = bob;
    this.mesh.rotation.y = this.angle;
    this.mesh.rotation.z = rock + this.velocity * 0.003;
    this.mesh.rotation.x = Math.sin(this.bobPhase * 0.5) * 0.03;

    if (this.model) {
      this.model.rotation.z = Math.sin(time * 1.4) * 0.012;
      this.model.rotation.x = Math.sin(time * 1.1) * 0.008;
    }
  }

  get speedRatio(): number {
    return Math.abs(this.velocity) / (BOAT_MAX_SPEED * this.selectedBoat.speedMultiplier);
  }

  destroy() {
    window.removeEventListener("boat-selected", this.onBoatSelected);
  }
}
