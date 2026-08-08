import * as THREE from "three";
import { SeededRandom, hash2d } from "./noise";
import { CHUNK_SIZE, ISLAND_MIN_DIST } from "./constants";
import { createIsland, IslandData, IslandType } from "./Islands";
import { materials } from "./AssetLibrary";
import { addPirateKitModel, type PirateKitModel } from "./PirateKit";

const oceanMaterial = materials.importedOcean;

// Slightly oversized so chunks overlap and hide seams
const OCEAN_OVERLAP = 0.5;
const oceanGeometry = new THREE.PlaneGeometry(
  CHUNK_SIZE + OCEAN_OVERLAP * 2,
  CHUNK_SIZE + OCEAN_OVERLAP * 2,
  32,
  32
);
oceanGeometry.rotateX(-Math.PI / 2);

const foamMaterial = new THREE.LineBasicMaterial({
  color: 0xd9fbff,
  transparent: true,
  opacity: 0.34,
  linewidth: 1,
});

function createFoamCrest(width: number, amplitude: number, seedOffset: number): THREE.Line {
  const points: THREE.Vector3[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (t - 0.5) * width;
    const z = Math.sin(t * Math.PI * 2 + seedOffset) * amplitude + Math.sin(t * Math.PI * 5 + seedOffset * 0.7) * amplitude * 0.35;
    points.push(new THREE.Vector3(x, 0.055, z));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), foamMaterial.clone());
  line.userData.isFoam = true;
  line.userData.seedOffset = seedOffset;
  return line;
}

export class Chunk {
  group: THREE.Group;
  cx: number;
  cz: number;
  islands: IslandData[] = [];
  private water: THREE.Mesh;

  constructor(cx: number, cz: number, seed: number, scene: THREE.Scene) {
    this.cx = cx;
    this.cz = cz;
    this.group = new THREE.Group();
    this.group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

    this.water = new THREE.Mesh(oceanGeometry.clone(), oceanMaterial);
    this.water.position.set(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);
    this.water.receiveShadow = true;
    this.water.userData.isOcean = true;
    this.group.add(this.water);

    const foamRng = new SeededRandom(hash2d(cx, cz, seed + 77) * 2147483647);
    for (let i = 0; i < 5; i++) {
      const crest = createFoamCrest(foamRng.range(18, 34), foamRng.range(0.5, 1.4), foamRng.next() * Math.PI * 2);
      crest.position.set(foamRng.range(12, CHUNK_SIZE - 12), 0.08, foamRng.range(12, CHUNK_SIZE - 12));
      crest.rotation.y = foamRng.range(-0.8, 0.8);
      crest.scale.setScalar(foamRng.range(0.8, 1.35));
      this.group.add(crest);
    }

    this.generate(seed);
    scene.add(this.group);
  }

  private generate(seed: number) {
    const rng = new SeededRandom(hash2d(this.cx, this.cz, seed) * 2147483647);
    const countRoll = rng.next();

    const interestTypes: IslandType[] = ["shipwreck", "ruins", "lighthouse", "treasure"];

    let islandCount = 0;
    if (countRoll > 0.88) islandCount = 2;
    else if (countRoll > 0.70) islandCount = 1;

    const attempts = 12;
    for (let i = 0; i < islandCount; i++) {
      let placed = false;
      for (let a = 0; a < attempts && !placed; a++) {
        const localX = rng.range(ISLAND_MIN_DIST, CHUNK_SIZE - ISLAND_MIN_DIST);
        const localZ = rng.range(ISLAND_MIN_DIST, CHUNK_SIZE - ISLAND_MIN_DIST);
        const worldX = this.cx * CHUNK_SIZE + localX;
        const worldZ = this.cz * CHUNK_SIZE + localZ;

        let tooClose = false;
        for (const existing of this.islands) {
          const dx = existing.x - worldX;
          const dz = existing.z - worldZ;
          if (Math.sqrt(dx * dx + dz * dz) < ISLAND_MIN_DIST) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        const distFromOrigin = Math.sqrt(worldX * worldX + worldZ * worldZ);
        const safeCenter = Math.max(0, 50 - distFromOrigin);

        let type: IslandType;
        const r = rng.next();
        if (safeCenter > 0) {
          type = rng.pick(["tropical", "rocky", "forest", "sandbar"]);
        } else if (r < 0.12) {
          type = rng.pick(interestTypes);
        } else if (r < 0.35) {
          type = "ruins";
        } else if (r < 0.55) {
          type = "shipwreck";
        } else if (r < 0.75) {
          type = "lighthouse";
        } else if (r < 0.88) {
          type = "treasure";
        } else {
          type = rng.pick(["tropical", "rocky", "forest", "sandbar"]);
        }

        const island = createIsland(type, localX, localZ, worldX, worldZ, rng);
        this.group.add(island.mesh);
        this.islands.push(island);
        placed = true;
      }
    }

    const floatingProps: PirateKitModel[] = ["barrel", "crate", "bottle", "boat-row-large", "boat-row-small", "cannon-ball"];
    const floatingCount = Math.floor(rng.range(1, 4));
    for (let i = 0; i < floatingCount; i++) {
      if (rng.next() < 0.45) continue;
      const model = rng.pick(floatingProps);
      addPirateKitModel(this.group, model, {
        position: [rng.range(10, CHUNK_SIZE - 10), 0.25, rng.range(10, CHUNK_SIZE - 10)],
        rotation: [(rng.next() - 0.5) * 0.12, rng.next() * Math.PI * 2, (rng.next() - 0.5) * 0.12],
        scale: rng.range(0.8, 1.6),
        name: `floating-${model}`,
      });
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      // Kenney kit GLB geometries are cached and shared across cloned instances,
      // so do not dispose them when an individual chunk unloads.
      if (mesh.userData.pirateKitModel) return;
      if (mesh.geometry && mesh.geometry !== oceanGeometry) {
        mesh.geometry.dispose();
      }
    });
  }
}
