# Sea Explorer — Asset Credits

This game uses procedural Three.js systems plus credited open/free 3D assets.

## Developer

- GitHub: **shohail-mahmud**
- Instagram: **@shohailmahmud09**

## External 3D assets

- **Kenney Pirate Kit** — https://kenney.nl/assets/pirate-kit
  - License: Creative Commons CC0
  - Runtime models: `public/assets/kenney/pirate-kit/glb/`
  - Runtime texture: `public/assets/kenney/pirate-kit/glb/Textures/colormap.png`
- **Kenney Watercraft Kit** — https://kenney.nl/assets/watercraft-kit
  - License: Creative Commons CC0
  - Runtime shop boats: `public/assets/kenney/watercraft/glb/`
  - Runtime texture: `public/assets/kenney/watercraft/glb/Textures/colormap.png`
- **Ocean Wave - w/Maya** by **Ricky Paul Club** — https://sketchfab.com/3d-models/ocean-wave-wmaya-03f0559f6b7646ea9014e2e72f71b198
  - License: Creative Commons Attribution 4.0
  - Used as credited ocean wave visual reference/style credit for the enhanced wave/foam ocean system.

## Project systems

- `src/game/Boat.ts` — loads/equips the selected player boat and applies each boat's speed/turn stats
- `src/game/BoatCatalog.ts` — boat shop catalog, prices, paths, and stats
- `src/game/Progress.ts` — local save/load for gold, owned boats, and equipped boat
- `src/game/PirateKit.ts` — Kenney Pirate Kit GLB manifest, loader, cache, and placement helpers
- `src/game/Islands.ts` — procedural islands decorated with Kenney Pirate Kit props
- `src/game/Chunk.ts` — ocean chunks, enhanced wave crests/foam, and scattered Kenney floating props
- `src/game/Audio.ts` and `src/game/Music.ts` — procedural audio using the Web Audio API

## Original/procedural textures

Generated for this project and used for terrain/water/prototype materials:

- `wood.jpg`
- `sand.jpg`
- `grass.jpg`
- `rock.jpg`
- `palm_leaf.jpg`
- `sail.jpg`
- `stone.jpg`

## License note

Kenney assets are CC0. Sketchfab Ocean Wave credit is retained for attribution. Always re-check licenses when adding any new third-party assets.
