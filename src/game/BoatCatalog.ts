export interface BoatDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  url: string;
  length: number;
  speedMultiplier: number;
  turnMultiplier: number;
}

export const STARTER_BOAT_ID = "pirate-sloop";

export const BOAT_CATALOG: BoatDefinition[] = [
  {
    id: STARTER_BOAT_ID,
    name: "Pirate Sloop",
    description: "Your trusted starter pirate ship.",
    price: 0,
    url: "/assets/kenney/pirate-kit/glb/ship-pirate-small.glb",
    length: 8.6,
    speedMultiplier: 1,
    turnMultiplier: 1,
  },
  {
    id: "row-skiff",
    name: "Row Skiff",
    description: "Small, nimble, and perfect for island hopping.",
    price: 500,
    url: "/assets/kenney/watercraft/glb/boat-row-small.glb",
    length: 5.4,
    speedMultiplier: 0.92,
    turnMultiplier: 1.25,
  },
  {
    id: "sail-dinghy",
    name: "Sail Dinghy",
    description: "A light sailing boat with better cruising speed.",
    price: 1500,
    url: "/assets/kenney/watercraft/glb/boat-sail-a.glb",
    length: 6.2,
    speedMultiplier: 1.08,
    turnMultiplier: 1.08,
  },
  {
    id: "speed-runner",
    name: "Speed Runner",
    description: "Fast low-profile craft for collecting gold quickly.",
    price: 3000,
    url: "/assets/kenney/watercraft/glb/boat-speed-a.glb",
    length: 6.4,
    speedMultiplier: 1.35,
    turnMultiplier: 1.12,
  },
  {
    id: "fishing-cutter",
    name: "Fishing Cutter",
    description: "Reliable work boat with balanced handling.",
    price: 5000,
    url: "/assets/kenney/watercraft/glb/boat-fishing-small.glb",
    length: 6.8,
    speedMultiplier: 1.12,
    turnMultiplier: 1.0,
  },
  {
    id: "harbor-tug",
    name: "Harbor Tug",
    description: "Heavy but powerful, stable in rough seas.",
    price: 8000,
    url: "/assets/kenney/watercraft/glb/boat-tug-a.glb",
    length: 7.4,
    speedMultiplier: 0.98,
    turnMultiplier: 0.85,
  },
  {
    id: "houseboat",
    name: "Houseboat",
    description: "A floating hideout for rich explorers.",
    price: 12000,
    url: "/assets/kenney/watercraft/glb/boat-house-a.glb",
    length: 8.2,
    speedMultiplier: 1.02,
    turnMultiplier: 0.78,
  },
  {
    id: "cargo-hauler",
    name: "Cargo Hauler",
    description: "A serious ship for serious treasure hunters.",
    price: 18000,
    url: "/assets/kenney/watercraft/glb/ship-cargo-c.glb",
    length: 10.5,
    speedMultiplier: 1.18,
    turnMultiplier: 0.72,
  },
  {
    id: "ocean-liner",
    name: "Ocean Liner",
    description: "Luxury status symbol. Costs a fortune, sails like a legend.",
    price: 25000,
    url: "/assets/kenney/watercraft/glb/ship-ocean-liner-small.glb",
    length: 12.8,
    speedMultiplier: 1.28,
    turnMultiplier: 0.62,
  },
];

export function getBoatById(id: string | null | undefined): BoatDefinition {
  return BOAT_CATALOG.find((boat) => boat.id === id) ?? BOAT_CATALOG[0];
}
