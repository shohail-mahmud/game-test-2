import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const PIRATE_KIT_MODELS = [
  "barrel",
  "boat-row-large",
  "boat-row-small",
  "bottle",
  "bottle-large",
  "cannon",
  "cannon-ball",
  "cannon-mobile",
  "castle-gate",
  "castle-wall",
  "castle-window",
  "chest",
  "crate",
  "crate-bottles",
  "flag-high",
  "flag-pirate",
  "flag-pirate-high",
  "grass",
  "grass-patch",
  "grass-plant",
  "hole",
  "mast-ropes",
  "palm-bend",
  "palm-detailed-bend",
  "palm-detailed-straight",
  "palm-straight",
  "patch-grass-foliage",
  "patch-sand-foliage",
  "platform",
  "platform-planks",
  "rocks-a",
  "rocks-b",
  "rocks-c",
  "rocks-sand-a",
  "rocks-sand-b",
  "rocks-sand-c",
  "ship-wreck",
  "ship-pirate-small",
  "structure-fence",
  "structure-fence-sides",
  "tool-paddle",
  "tool-shovel",
  "tower-complete-large",
] as const;

export type PirateKitModel = (typeof PIRATE_KIT_MODELS)[number];

const BASE_URL = "/assets/kenney/pirate-kit/glb";
const loader = new GLTFLoader();
const cache = new Map<PirateKitModel, Promise<THREE.Group>>();

function loadModel(name: PirateKitModel): Promise<THREE.Group> {
  if (!cache.has(name)) {
    cache.set(
      name,
      new Promise((resolve, reject) => {
        loader.load(
          `${BASE_URL}/${name}.glb`,
          (gltf) => {
            const scene = gltf.scene;
            scene.name = `kenney-${name}`;
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
  return cache.get(name)!;
}

export interface PirateKitPlacement {
  position?: THREE.Vector3 | [number, number, number];
  rotation?: THREE.Euler | [number, number, number];
  scale?: number | THREE.Vector3 | [number, number, number];
  name?: string;
}

function applyPlacement(object: THREE.Object3D, placement: PirateKitPlacement = {}) {
  if (placement.name) object.name = placement.name;

  if (placement.position instanceof THREE.Vector3) {
    object.position.copy(placement.position);
  } else if (placement.position) {
    object.position.set(...placement.position);
  }

  if (placement.rotation instanceof THREE.Euler) {
    object.rotation.copy(placement.rotation);
  } else if (placement.rotation) {
    object.rotation.set(...placement.rotation);
  }

  if (placement.scale instanceof THREE.Vector3) {
    object.scale.copy(placement.scale);
  } else if (Array.isArray(placement.scale)) {
    object.scale.set(...placement.scale);
  } else if (typeof placement.scale === "number") {
    object.scale.setScalar(placement.scale);
  }
}

export function addPirateKitModel(
  parent: THREE.Object3D,
  name: PirateKitModel,
  placement: PirateKitPlacement = {}
): Promise<THREE.Object3D> {
  return loadModel(name)
    .then((source) => {
      const instance = source.clone(true);
      applyPlacement(instance, placement);
      instance.userData.pirateKitModel = name;
      instance.traverse((child) => {
        child.userData.pirateKitModel = name;
      });
      parent.add(instance);
      return instance;
    })
    .catch((error) => {
      console.warn(`Failed to load Kenney Pirate Kit model: ${name}`, error);
      throw error;
    });
}

export function preloadPirateKit(models: readonly PirateKitModel[] = PIRATE_KIT_MODELS): Promise<THREE.Group[]> {
  return Promise.all(models.map((model) => loadModel(model)));
}
