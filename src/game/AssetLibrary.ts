import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();
const loadedTextures: Record<string, THREE.Texture> = {};

function loadTexture(path: string): THREE.Texture {
  if (!loadedTextures[path]) {
    const tex = textureLoader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    loadedTextures[path] = tex;
  }
  return loadedTextures[path];
}

export const textures = {
  wood: loadTexture("/assets/textures/wood.jpg"),
  sand: loadTexture("/assets/textures/sand.jpg"),
  grass: loadTexture("/assets/textures/grass.jpg"),
  rock: loadTexture("/assets/textures/rock.jpg"),
  palmLeaf: loadTexture("/assets/textures/palm_leaf.jpg"),
  sail: loadTexture("/assets/textures/sail.jpg"),
  stone: loadTexture("/assets/textures/stone.jpg"),
};

export const materials = {
  importedOcean: new THREE.MeshPhysicalMaterial({
    color: 0x1e9bd1,
    emissive: 0x04304d,
    emissiveIntensity: 0.18,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.05,
    thickness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    reflectivity: 0.85,
    flatShading: false,
    side: THREE.FrontSide,
  }),
  wood: new THREE.MeshStandardMaterial({
    map: textures.wood,
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
  }),
  darkWood: new THREE.MeshStandardMaterial({
    color: 0x5c3a1b,
    map: textures.wood,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  }),
  sand: new THREE.MeshStandardMaterial({
    map: textures.sand,
    color: 0xe6c288,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  }),
  grass: new THREE.MeshStandardMaterial({
    map: textures.grass,
    color: 0x6ab55a,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  }),
  rock: new THREE.MeshStandardMaterial({
    map: textures.rock,
    color: 0x888888,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  }),
  palmLeaf: new THREE.MeshStandardMaterial({
    map: textures.palmLeaf,
    color: 0x4a9e3a,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  }),
  sail: new THREE.MeshStandardMaterial({
    map: textures.sail,
    color: 0xf5f0e0,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: textures.stone,
    color: 0x9a9a9a,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  }),
  whitePaint: new THREE.MeshStandardMaterial({
    color: 0xf2f2f2,
    roughness: 0.6,
    metalness: 0,
    flatShading: true,
  }),
  redPaint: new THREE.MeshStandardMaterial({
    color: 0xc94c4c,
    roughness: 0.6,
    metalness: 0,
    flatShading: true,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.3,
    metalness: 0.4,
    flatShading: true,
  }),
  lanternGlass: new THREE.MeshStandardMaterial({
    color: 0xffeeaa,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: 0.9,
  }),
  buoyRed: new THREE.MeshStandardMaterial({
    color: 0xd94c4c,
    roughness: 0.5,
    metalness: 0.1,
    flatShading: true,
  }),
  buoyWhite: new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.5,
    metalness: 0.1,
    flatShading: true,
  }),
};

export const geometries = {
  // Shared simple props
  barrel: new THREE.CylinderGeometry(0.35, 0.35, 0.7, 10),
  plank: new THREE.BoxGeometry(0.25, 0.06, 1.2),
  smallRock: new THREE.DodecahedronGeometry(0.5, 0),
  buoy: new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10),
  buoyTop: new THREE.SphereGeometry(0.45, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};
