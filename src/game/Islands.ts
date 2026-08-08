import * as THREE from "three";
import { SeededRandom } from "./noise";
import { materials } from "./AssetLibrary";
import { addPirateKitModel, type PirateKitModel } from "./PirateKit";

export type IslandType = "tropical" | "rocky" | "forest" | "ruins" | "sandbar" | "shipwreck" | "lighthouse" | "treasure";

export interface IslandData {
  type: IslandType;
  label: string;
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
}

// Shared low-poly geometry caches
const caches: Record<string, THREE.BufferGeometry> = {};
function cache(name: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
  if (!caches[name]) caches[name] = create();
  return caches[name];
}

function addKitProp(
  parent: THREE.Object3D,
  model: PirateKitModel,
  x: number,
  y: number,
  z: number,
  seed: SeededRandom,
  scale = 1,
  tilt = 0
) {
  addPirateKitModel(parent, model, {
    position: [x, y, z],
    rotation: [tilt ? (seed.next() - 0.5) * tilt : 0, seed.next() * Math.PI * 2, tilt ? (seed.next() - 0.5) * tilt : 0],
    scale,
  });
}

function addKitCluster(
  parent: THREE.Object3D,
  models: readonly PirateKitModel[],
  seed: SeededRandom,
  count: number,
  radius: number,
  y: number,
  scaleMin: number,
  scaleMax: number
) {
  for (let i = 0; i < count; i++) {
    const angle = seed.next() * Math.PI * 2;
    const dist = seed.range(radius * 0.12, radius);
    addKitProp(
      parent,
      models[Math.floor(seed.next() * models.length)],
      Math.cos(angle) * dist,
      y,
      Math.sin(angle) * dist,
      seed,
      seed.range(scaleMin, scaleMax),
      0.18
    );
  }
}

function irregularDisc(radius: number, height: number, seed: SeededRandom, segments = 12): THREE.BufferGeometry {
  const geom = new THREE.CylinderGeometry(radius * 0.55, radius, height, segments, 2);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > -height * 0.4) {
      const angle = Math.atan2(pos.getZ(i), pos.getX(i));
      const r = Math.sqrt(pos.getX(i) ** 2 + pos.getZ(i) ** 2);
      const noise = 1 + Math.sin(angle * 3 + seed.next() * 10) * 0.12 + (seed.next() - 0.5) * 0.12;
      const newR = r * noise;
      pos.setX(i, Math.cos(angle) * newR);
      pos.setZ(i, Math.sin(angle) * newR);
      pos.setY(i, y + (seed.next() - 0.5) * height * 0.18);
    }
  }
  geom.computeVertexNormals();
  return geom;
}

function createIslandTerrain(radius: number, height: number, seed: SeededRandom, topMat: THREE.Material, sideMat?: THREE.Material): THREE.Group {
  const group = new THREE.Group();

  // Main mound
  const moundGeom = irregularDisc(radius, height, seed, 14);
  const mound = new THREE.Mesh(moundGeom, topMat);
  mound.position.y = height * 0.1;
  mound.castShadow = true;
  mound.receiveShadow = true;
  group.add(mound);

  // Inner hill for height variation
  if (height > 1.2) {
    const hillGeom = irregularDisc(radius * 0.5, height * 0.55, seed, 10);
    const hill = new THREE.Mesh(hillGeom, topMat);
    hill.position.y = height * 0.55;
    hill.castShadow = true;
    hill.receiveShadow = true;
    group.add(hill);
  }

  // Shoreline ring
  if (sideMat) {
    const shoreGeom = irregularDisc(radius * 1.15, height * 0.25, seed, 14);
    const shore = new THREE.Mesh(shoreGeom, sideMat);
    shore.position.y = -height * 0.05;
    shore.receiveShadow = true;
    group.add(shore);
  }

  return group;
}

function createPalmTree(seed: SeededRandom, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const segments = 5;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  const leanX = (seed.next() - 0.5) * 0.5;
  const leanZ = (seed.next() - 0.5) * 0.5;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const r1 = (0.22 - t * 0.12) * scale;
    const r2 = (0.22 - ((i + 1) / segments) * 0.12) * scale;
    const h = 0.7 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 6), materials.darkWood);
    trunk.position.set(cx, cy + h * 0.5, cz);
    trunk.rotation.z = leanX * (t + 0.3);
    trunk.rotation.x = leanZ * (t + 0.3);
    trunk.castShadow = true;
    group.add(trunk);
    cy += h * 0.92;
    cx += leanX * 0.15 * scale;
    cz += leanZ * 0.15 * scale;
  }

  const frondCount = 6 + Math.floor(seed.next() * 3);
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + seed.next() * 0.3;
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.6 * scale, 2.6 * scale, 2, 4), materials.palmLeaf);
    frond.position.set(cx, cy, cz);
    frond.rotation.y = angle;
    frond.rotation.x = 0.55 + seed.next() * 0.25;
    frond.castShadow = true;
    group.add(frond);
  }

  return group;
}

function createPineTree(seed: SeededRandom, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.18 * scale, 1.4 * scale, 6), materials.darkWood);
  trunk.position.y = 0.7 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const s = (0.8 + seed.next() * 0.5) * scale;
  const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.75 * s, 2.6 * s, 7), materials.grass);
  foliage1.position.y = 1.8 * s;
  foliage1.castShadow = true;
  group.add(foliage1);

  const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.6 * s, 2.0 * s, 7), materials.grass);
  foliage2.position.y = 2.6 * s;
  foliage2.castShadow = true;
  group.add(foliage2);

  return group;
}

function createRockCluster(seed: SeededRandom, count: number, radius: number, scaleBase = 1): THREE.Group {
  const group = new THREE.Group();
  const rockGeom = cache("rock", () => new THREE.DodecahedronGeometry(1, 0));
  for (let i = 0; i < count; i++) {
    const scale = (0.6 + seed.next() * 1.4) * scaleBase;
    const rock = new THREE.Mesh(rockGeom, materials.rock);
    const angle = seed.next() * Math.PI * 2;
    const dist = seed.next() * radius;
    rock.position.set(Math.cos(angle) * dist, scale * 0.35, Math.sin(angle) * dist);
    rock.scale.set(scale * (0.8 + seed.next() * 0.5), scale * (0.5 + seed.next() * 0.5), scale * (0.8 + seed.next() * 0.5));
    rock.rotation.set(seed.next() * Math.PI, seed.next() * Math.PI, seed.next() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }
  return group;
}

function createLighthouse(): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 1.6, 10), materials.rock);
  base.position.y = 0.4;
  base.receiveShadow = true;
  group.add(base);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 7.2, 10), materials.whitePaint);
  tower.position.y = 4.2;
  tower.castShadow = true;
  group.add(tower);

  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.3, 1.1, 10), materials.redPaint);
  stripe.position.y = 3.6;
  group.add(stripe);

  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.5, 8), materials.whitePaint);
  lanternBase.position.y = 7.9;
  group.add(lanternBase);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.0, 8), materials.lanternGlass);
  lantern.position.y = 8.4;
  group.add(lantern);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.7, 8), materials.redPaint);
  roof.position.y = 9.2;
  group.add(roof);

  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 8), materials.whitePaint);
  balcony.position.y = 7.4;
  group.add(balcony);

  return group;
}

function createShipwreck(seed: SeededRandom): THREE.Group {
  const group = new THREE.Group();

  const hullGeom = new THREE.BoxGeometry(2.4, 1.3, 5.2, 3, 2, 5);
  const pos = hullGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0 && z > 0.5) {
      pos.setY(i, y * 0.25);
    }
    pos.setX(i, pos.getX(i) + (seed.next() - 0.5) * 0.2);
  }
  hullGeom.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeom, materials.wood);
  hull.position.y = 0.6;
  hull.rotation.z = 0.2;
  hull.rotation.y = 0.2;
  hull.castShadow = true;
  group.add(hull);

  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 4, 8, Math.PI), materials.darkWood);
    rib.position.set(0, 1.0, -1.4 + i * 0.9);
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = Math.PI / 2;
    group.add(rib);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.8, 6), materials.darkWood);
  mast.position.set(0.5, 1.5, 0.2);
  mast.rotation.z = 0.6;
  mast.rotation.x = 0.25;
  group.add(mast);

  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 1.6), materials.wood);
    plank.position.set((seed.next() - 0.5) * 5, 0.1, (seed.next() - 0.5) * 5);
    plank.rotation.y = seed.next() * Math.PI;
    plank.castShadow = true;
    group.add(plank);
  }

  for (let i = 0; i < 2; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 8), materials.wood);
    barrel.position.set((seed.next() - 0.5) * 3, 0.35, (seed.next() - 0.5) * 3);
    barrel.rotation.z = (seed.next() - 0.5) * 0.5;
    barrel.castShadow = true;
    group.add(barrel);
  }

  return group;
}

function createRuins(seed: SeededRandom): THREE.Group {
  const group = new THREE.Group();

  const pillarCount = 5 + Math.floor(seed.next() * 5);
  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2 + seed.next() * 0.5;
    const dist = 2 + seed.next() * 2.5;
    const h = 1.5 + seed.next() * 2.8;
    const broken = seed.next() > 0.55;
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, broken ? h * 0.55 : h, 0.6),
      materials.stone
    );
    pillar.position.set(Math.cos(angle) * dist, h * 0.5 - 0.1, Math.sin(angle) * dist);
    pillar.rotation.y = seed.next() * 0.5;
    if (broken) pillar.rotation.z = (seed.next() - 0.5) * 0.35;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  for (let i = 0; i < 4; i++) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(1 + seed.next(), 0.4, 0.8 + seed.next()), materials.stone);
    block.position.set((seed.next() - 0.5) * 5, 0.25, (seed.next() - 0.5) * 5);
    block.rotation.set(seed.next() * 0.2, seed.next() * Math.PI, seed.next() * 0.3);
    block.castShadow = true;
    group.add(block);
  }

  return group;
}

function createTreasure(seed: SeededRandom): THREE.Group {
  const group = new THREE.Group();

  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.8), materials.wood);
  chestBase.position.y = 0.3;
  chestBase.castShadow = true;
  group.add(chestBase);

  const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8, 1, false, 0, Math.PI), materials.wood);
  chestLid.rotation.z = Math.PI / 2;
  chestLid.position.y = 0.65;
  chestLid.castShadow = true;
  group.add(chestLid);

  for (const z of [-0.28, 0.28]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.55, 0.1), materials.gold);
    band.position.set(0, 0.35, z);
    group.add(band);
  }

  for (let i = 0; i < 20; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 6), materials.gold);
    coin.position.set(
      0.5 + (seed.next() - 0.5) * 0.6,
      0.1 + seed.next() * 0.12,
      0.25 + (seed.next() - 0.5) * 0.4
    );
    coin.rotation.x = seed.next() * 0.5;
    coin.rotation.z = seed.next() * 0.5;
    group.add(coin);
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), materials.darkWood);
  pole.position.set(-0.8, 1.1, 0);
  group.add(pole);

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), materials.redPaint);
  flag.position.set(-0.5, 1.85, 0);
  flag.rotation.y = -Math.PI / 2;
  group.add(flag);

  return group;
}

// Keep legacy procedural builders available for quick fallback/prototyping while
// the active world art uses Kenney Pirate Kit props.
void createPalmTree;
void createPineTree;
void createRockCluster;
void createLighthouse;
void createShipwreck;
void createRuins;
void createTreasure;

export function createIsland(
  type: IslandType,
  localX: number,
  localZ: number,
  worldX: number,
  worldZ: number,
  seed: SeededRandom
): IslandData {
  const group = new THREE.Group();
  group.position.set(localX, 0, localZ);

  let radius = 8;
  let label = "Island";
  const globalScale = 2.2;

  switch (type) {
    case "tropical": {
      radius = (10 + seed.next() * 6) * globalScale;
      const terrain = createIslandTerrain(radius, 2.8, seed, materials.grass, materials.sand);
      terrain.position.y = -0.4;
      group.add(terrain);

      addKitCluster(group, ["palm-straight", "palm-bend", "palm-detailed-straight", "palm-detailed-bend"], seed, 8, radius * 0.48, 0.75, 1.9, 2.8);
      addKitCluster(group, ["grass", "grass-patch", "grass-plant", "patch-grass-foliage"], seed, 8, radius * 0.52, 0.85, 1.2, 2.1);
      addKitCluster(group, ["crate", "barrel", "bottle", "tool-paddle"], seed, 3, radius * 0.3, 0.8, 0.9, 1.4);
      label = "Pirate Palm Island";
      break;
    }
    case "rocky": {
      radius = (9 + seed.next() * 6) * globalScale;
      const terrain = createIslandTerrain(radius, 4.2, seed, materials.rock, materials.rock);
      terrain.position.y = -0.6;
      group.add(terrain);

      addKitCluster(group, ["rocks-a", "rocks-b", "rocks-c", "rocks-sand-a", "rocks-sand-b", "rocks-sand-c"], seed, 12, radius * 0.58, 0.9, 1.5, 2.8);
      addKitCluster(group, ["cannon", "cannon-ball", "barrel"], seed, 3, radius * 0.35, 1.0, 1.0, 1.6);
      label = "Pirate Rock Outcrop";
      break;
    }
    case "forest": {
      radius = (11 + seed.next() * 7) * globalScale;
      const terrain = createIslandTerrain(radius, 2.6, seed, materials.grass, materials.sand);
      terrain.position.y = -0.4;
      group.add(terrain);

      addKitCluster(group, ["palm-detailed-straight", "palm-detailed-bend", "palm-straight", "palm-bend"], seed, 10, radius * 0.52, 0.8, 1.5, 2.6);
      addKitCluster(group, ["grass-patch", "grass-plant", "patch-grass-foliage", "crate-bottles"], seed, 7, radius * 0.5, 0.85, 1.1, 1.9);
      label = "Pirate Jungle Island";
      break;
    }
    case "ruins": {
      radius = (10 + seed.next() * 5) * globalScale;
      const terrain = createIslandTerrain(radius, 2.0, seed, materials.sand, materials.sand);
      terrain.position.y = -0.4;
      group.add(terrain);

      addKitProp(group, "castle-gate", 0, 1.0, 0, seed, 3.0, 0.04);
      addKitProp(group, "castle-wall", -5.5, 1.0, 2.0, seed, 2.4, 0.08);
      addKitProp(group, "castle-wall", 5.5, 1.0, -2.0, seed, 2.4, 0.08);
      addKitProp(group, "castle-window", 0, 1.0, 5.0, seed, 2.2, 0.12);
      addKitCluster(group, ["cannon", "cannon-ball", "crate", "barrel", "flag-pirate"], seed, 7, radius * 0.38, 0.9, 1.0, 1.8);
      label = "Pirate Fortress Ruins";
      break;
    }
    case "sandbar": {
      radius = (7 + seed.next() * 5) * globalScale;
      const terrain = createIslandTerrain(radius * 1.4, 0.8, seed, materials.sand, materials.sand);
      terrain.position.y = -0.25;
      group.add(terrain);
      addKitProp(group, "boat-row-small", -2.5, 0.3, 1.5, seed, 2.0, 0.12);
      addKitCluster(group, ["bottle", "bottle-large", "tool-paddle", "tool-shovel", "hole", "patch-sand-foliage"], seed, 6, radius * 0.45, 0.45, 1.0, 1.7);
      label = "Sandbar";
      break;
    }
    case "shipwreck": {
      radius = 9 * globalScale;
      const terrain = createIslandTerrain(radius, 1.6, seed, materials.sand, materials.sand);
      terrain.position.y = -0.35;
      group.add(terrain);

      addKitProp(group, "ship-wreck", 0, 0.45, 0, seed, 2.9, 0.25);
      addKitCluster(group, ["barrel", "crate", "crate-bottles", "mast-ropes", "platform-planks", "bottle"], seed, 9, radius * 0.48, 0.55, 1.1, 1.9);
      label = "Pirate Shipwreck";
      break;
    }
    case "lighthouse": {
      radius = 8 * globalScale;
      const terrain = createIslandTerrain(radius, 1.8, seed, materials.rock, materials.sand);
      terrain.position.y = -0.4;
      group.add(terrain);

      addKitProp(group, "tower-complete-large", 0, 0.7, 0, seed, 2.8, 0.02);
      addKitCluster(group, ["structure-fence", "structure-fence-sides", "flag-high", "flag-pirate-high", "barrel"], seed, 6, radius * 0.38, 0.7, 1.0, 1.8);
      label = "Pirate Watchtower";
      break;
    }
    case "treasure": {
      radius = 7 * globalScale;
      const terrain = createIslandTerrain(radius, 1.6, seed, materials.sand, materials.sand);
      terrain.position.y = -0.35;
      group.add(terrain);

      addKitProp(group, "chest", 0.8, 0.65, -0.4, seed, 2.2, 0.05);
      addKitProp(group, "flag-pirate", -2.8, 0.75, 1.4, seed, 1.9, 0.08);
      addKitProp(group, "hole", 2.3, 0.62, 1.2, seed, 1.6, 0.04);
      addKitCluster(group, ["barrel", "crate", "crate-bottles", "cannon-mobile", "platform", "bottle-large"], seed, 7, radius * 0.42, 0.6, 1.0, 1.8);
      label = "Pirate Treasure Island";
      break;
    }
  }

  return { type, label, x: worldX, z: worldZ, radius, mesh: group };
}
