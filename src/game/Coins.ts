import * as THREE from "three";
import { SeededRandom, hash2d } from "./noise";
import { CHUNK_SIZE, WORLD_SEED } from "./constants";
import { materials } from "./AssetLibrary";

const COIN_RADIUS = 0.7;
const COIN_PICKUP_DIST = 3.5;
const COINS_PER_CHUNK = 4;

export interface CoinData {
  id: string;
  x: number;
  z: number;
  mesh: THREE.Mesh;
}

const coinGeometry = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.12, 10);
const coinMaterial = materials.gold;

export class CoinSystem {
  private coins = new Map<string, CoinData>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private key(cx: number, cz: number, index: number): string {
    return `${cx},${cz},${index}`;
  }

  update(playerX: number, playerZ: number, time: number): { collected: number; ids: string[] } {
    const actualCx = Math.floor(playerX / CHUNK_SIZE);
    const actualCz = Math.floor(playerZ / CHUNK_SIZE);

    // Spawn coins in nearby chunks
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        this.spawnChunkCoins(actualCx + x, actualCz + z);
      }
    }

    // Animate and collect
    const collectedIds: string[] = [];
    for (const [id, coin] of this.coins) {
      coin.mesh.position.y = 0.6 + Math.sin(time * 3 + coin.x * 0.1) * 0.2;
      coin.mesh.rotation.y = time * 1.5;

      const dx = coin.x - playerX;
      const dz = coin.z - playerZ;
      if (dx * dx + dz * dz < COIN_PICKUP_DIST * COIN_PICKUP_DIST) {
        this.removeCoin(id);
        collectedIds.push(id);
      }
    }

    // Cleanup distant coins
    for (const [id, coin] of this.coins) {
      const dx = coin.x - playerX;
      const dz = coin.z - playerZ;
      if (Math.abs(dx) > CHUNK_SIZE * 4 || Math.abs(dz) > CHUNK_SIZE * 4) {
        this.removeCoin(id);
      }
    }

    return { collected: collectedIds.length, ids: collectedIds };
  }

  private spawnChunkCoins(cx: number, cz: number) {
    const baseKey = `${cx},${cz}`;
    // Check if any coin from this chunk exists
    for (const id of this.coins.keys()) {
      if (id.startsWith(baseKey + ",")) return;
    }

    const rng = new SeededRandom(hash2d(cx, cz, WORLD_SEED) * 2147483647);
    for (let i = 0; i < COINS_PER_CHUNK; i++) {
      const localX = rng.range(15, CHUNK_SIZE - 15);
      const localZ = rng.range(15, CHUNK_SIZE - 15);
      const worldX = cx * CHUNK_SIZE + localX;
      const worldZ = cz * CHUNK_SIZE + localZ;

      const id = this.key(cx, cz, i);
      const mesh = new THREE.Mesh(coinGeometry, coinMaterial);
      mesh.position.set(worldX, 0.6, worldZ);
      mesh.castShadow = true;
      mesh.userData.isCoin = true;
      this.scene.add(mesh);
      this.coins.set(id, { id, x: worldX, z: worldZ, mesh });
    }
  }

  private removeCoin(id: string) {
    const coin = this.coins.get(id);
    if (coin) {
      this.scene.remove(coin.mesh);
      coin.mesh.geometry = undefined as unknown as THREE.BufferGeometry;
    }
    this.coins.delete(id);
  }

  clear() {
    for (const [id] of this.coins) {
      this.removeCoin(id);
    }
  }
}
