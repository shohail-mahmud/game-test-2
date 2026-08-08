import * as THREE from "three";

const PARTICLE_COUNT = 24;
const geom = new THREE.PlaneGeometry(1.2, 1.2);
geom.rotateX(-Math.PI / 2);
const mat = new THREE.MeshBasicMaterial({
  color: 0xcceeff,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  side: THREE.DoubleSide,
});

interface WakeParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  active: boolean;
}

export class WakeSystem {
  group: THREE.Group;
  private particles: WakeParticle[] = [];
  private spawnTimer = 0;
  private index = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      mesh.visible = false;
      this.group.add(mesh);
      this.particles.push({ mesh, life: 0, maxLife: 1, active: false });
    }
  }

  update(dt: number, boatPos: THREE.Vector3, boatAngle: number, speedRatio: number) {
    // Update existing particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      const t = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.setScalar(0.5 + (1 - t) * 1.2);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.35;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      }
    }

    // Spawn new particles
    if (speedRatio > 0.08) {
      this.spawnTimer -= dt;
      const interval = 0.12 / Math.max(0.2, speedRatio);
      if (this.spawnTimer <= 0) {
        this.spawnTimer = interval;
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          0,
          2.2 + Math.random() * 0.5
        );
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), boatAngle);
        const pos = boatPos.clone().add(offset);
        this.spawn(pos);
      }
    }
  }

  private spawn(pos: THREE.Vector3) {
    const p = this.particles[this.index];
    p.active = true;
    p.life = 1.2;
    p.maxLife = 1.2;
    p.mesh.position.copy(pos);
    p.mesh.position.y = 0.05;
    p.mesh.scale.setScalar(0.5);
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35;
    p.mesh.visible = true;
    this.index = (this.index + 1) % PARTICLE_COUNT;
  }
}
