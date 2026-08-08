import * as THREE from "three";
import { CAMERA_HEIGHT, CAMERA_DISTANCE } from "./constants";

export class CameraController {
  camera: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(target: THREE.Vector3, dt: number, sensitivity = 1) {
    const offset = new THREE.Vector3(
      0,
      CAMERA_HEIGHT,
      -CAMERA_DISTANCE
    );
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.35);

    const desired = target.clone().add(offset);
    const s = THREE.MathUtils.clamp(sensitivity, 0.2, 3);
    this.camera.position.lerp(desired, 1 - Math.exp(-2.5 * dt * s));

    const lookTarget = target.clone();
    lookTarget.y += 2;
    const currentLook = new THREE.Vector3(0, 0, -1);
    currentLook.applyQuaternion(this.camera.quaternion).add(this.camera.position);
    currentLook.lerp(lookTarget, 1 - Math.exp(-3 * dt * s));
    this.camera.lookAt(currentLook);
  }
}
