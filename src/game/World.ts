import * as THREE from "three";
import { Chunk } from "./Chunk";
import { CHUNK_SIZE, CHUNK_LOAD_RADIUS, CHUNK_UNLOAD_RADIUS, WORLD_SEED } from "./constants";
import { IslandData } from "./Islands";

export class World {
  private chunks = new Map<string, Chunk>();

  constructor(private scene: THREE.Scene) {}

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  update(playerX: number, playerZ: number) {
    const actualCx = Math.floor(playerX / CHUNK_SIZE);
    const actualCz = Math.floor(playerZ / CHUNK_SIZE);

    // Load nearby chunks
    for (let x = -CHUNK_LOAD_RADIUS; x <= CHUNK_LOAD_RADIUS; x++) {
      for (let z = -CHUNK_LOAD_RADIUS; z <= CHUNK_LOAD_RADIUS; z++) {
        const cx = actualCx + x;
        const cz = actualCz + z;
        const k = this.key(cx, cz);
        if (!this.chunks.has(k)) {
          this.chunks.set(k, new Chunk(cx, cz, WORLD_SEED, this.scene));
        }
      }
    }

    // Unload distant chunks
    for (const [k, chunk] of this.chunks) {
      const dx = chunk.cx - actualCx;
      const dz = chunk.cz - actualCz;
      if (Math.abs(dx) > CHUNK_UNLOAD_RADIUS || Math.abs(dz) > CHUNK_UNLOAD_RADIUS) {
        chunk.dispose(this.scene);
        this.chunks.delete(k);
      }
    }
  }

  getAllIslands(): IslandData[] {
    const result: IslandData[] = [];
    for (const chunk of this.chunks.values()) {
      result.push(...chunk.islands);
    }
    return result;
  }

  checkIslandCollision(playerX: number, playerZ: number): boolean {
    for (const island of this.getAllIslands()) {
      const dx = island.x - playerX;
      const dz = island.z - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      // Collision matches roughly the visible shoreline
      if (dist < island.radius * 0.55) {
        return true;
      }
    }
    return false;
  }
}
