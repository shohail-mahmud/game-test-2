import { IslandData } from "./Islands";

export interface DiscoveryEvent {
  id: string;
  label: string;
  type: string;
  x: number;
  z: number;
}

export class DiscoverySystem {
  discovered = new Set<string>();
  recent: DiscoveryEvent | null = null;
  private recentTimer = 0;

  update(playerX: number, playerZ: number, islands: IslandData[], dt: number): DiscoveryEvent | null {
    let newDiscovery: DiscoveryEvent | null = null;

    for (const island of islands) {
      const dx = island.x - playerX;
      const dz = island.z - playerZ;
      const distSq = dx * dx + dz * dz;
      const id = `${island.type}_${Math.round(island.x)}_${Math.round(island.z)}`;

      if (distSq < 28 * 28 && !this.discovered.has(id)) {
        this.discovered.add(id);
        const event: DiscoveryEvent = {
          id,
          label: island.label,
          type: island.type,
          x: island.x,
          z: island.z,
        };
        this.recent = event;
        this.recentTimer = 4;
        newDiscovery = event;
      }
    }

    if (this.recentTimer > 0) {
      this.recentTimer -= dt;
      if (this.recentTimer <= 0) {
        this.recent = null;
      }
    }

    return newDiscovery;
  }

  get count(): number {
    return this.discovered.size;
  }

  clear() {
    this.discovered.clear();
    this.recent = null;
    this.recentTimer = 0;
  }
}
