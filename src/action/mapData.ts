import type {
  BuildingZone,
  ExtractionZone,
  LootSpot,
  ObstacleRect,
  ZombieArchetype,
} from './actionTypes.ts';

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

export const PLAYER_SPAWN = {
  x: 220,
  y: 980,
};

export const EXTRACTION_ZONE: ExtractionZone = {
  id: 'ext_portao_abrigo',
  label: 'Portão do Abrigo (Zona de Extração)',
  x: 150,
  y: 1050,
  radius: 68,
};

export const BUILDINGS: BuildingZone[] = [
  {
    id: 'bld_mercado',
    name: 'Mercearia & Padaria São Jorge',
    x: 140,
    y: 120,
    width: 440,
    height: 320,
    floorColor: 0x26211d,
  },
  {
    id: 'bld_farmacia',
    name: 'Farmácia Popular 24h',
    x: 940,
    y: 120,
    width: 480,
    height: 300,
    floorColor: 0x1d2624,
  },
  {
    id: 'bld_delegacia',
    name: 'Posto Policial & Oficina',
    x: 960,
    y: 700,
    width: 480,
    height: 360,
    floorColor: 0x1e2129,
  },
];

export const MAP_OBSTACLES: ObstacleRect[] = [
  // Outer Perimeter Walls
  { id: 'wall_top', x: 0, y: 0, width: WORLD_WIDTH, height: 28, kind: 'wall' },
  { id: 'wall_bottom', x: 0, y: WORLD_HEIGHT - 28, width: WORLD_WIDTH, height: 28, kind: 'wall' },
  { id: 'wall_left', x: 0, y: 0, width: 28, height: WORLD_HEIGHT, kind: 'wall' },
  { id: 'wall_right', x: WORLD_WIDTH - 28, y: 0, width: 28, height: WORLD_HEIGHT, kind: 'wall' },

  // Building 1: Mercearia São Jorge (NW) - with South & East doorways
  { id: 'merc_n', x: 140, y: 120, width: 440, height: 22, kind: 'wall' },
  { id: 'merc_w', x: 140, y: 120, width: 22, height: 320, kind: 'wall' },
  { id: 'merc_s1', x: 140, y: 418, width: 150, height: 22, kind: 'wall' },
  { id: 'merc_s2', x: 390, y: 418, width: 190, height: 22, kind: 'wall' },
  { id: 'merc_e1', x: 558, y: 120, width: 22, height: 110, kind: 'wall' },
  { id: 'merc_e2', x: 558, y: 320, width: 22, height: 120, kind: 'wall' },
  { id: 'merc_shelf', x: 260, y: 220, width: 140, height: 32, kind: 'crate', label: 'Gôndola' },

  // Building 2: Farmácia Popular 24h (NE) - with West & South doorways
  { id: 'farm_n', x: 940, y: 120, width: 480, height: 22, kind: 'wall' },
  { id: 'farm_e', x: 1398, y: 120, width: 22, height: 300, kind: 'wall' },
  { id: 'farm_w1', x: 940, y: 120, width: 22, height: 100, kind: 'wall' },
  { id: 'farm_w2', x: 940, y: 310, width: 22, height: 110, kind: 'wall' },
  { id: 'farm_s1', x: 940, y: 398, width: 180, height: 22, kind: 'wall' },
  { id: 'farm_s2', x: 1220, y: 398, width: 200, height: 22, kind: 'wall' },
  { id: 'farm_counter', x: 1100, y: 210, width: 150, height: 30, kind: 'crate', label: 'Balcão' },

  // Building 3: Posto Policial & Oficina (SE) - with North & West doorways
  { id: 'pol_s', x: 960, y: 1038, width: 480, height: 22, kind: 'wall' },
  { id: 'pol_e', x: 1418, y: 700, width: 22, height: 360, kind: 'wall' },
  { id: 'pol_n1', x: 960, y: 700, width: 180, height: 22, kind: 'wall' },
  { id: 'pol_n2', x: 1250, y: 700, width: 190, height: 22, kind: 'wall' },
  { id: 'pol_w1', x: 960, y: 700, width: 22, height: 120, kind: 'wall' },
  { id: 'pol_w2', x: 960, y: 920, width: 22, height: 140, kind: 'wall' },
  { id: 'pol_desk', x: 1140, y: 850, width: 130, height: 36, kind: 'crate', label: 'Bancada' },

  // Street Obstacles: Abandoned Cars & Concrete Barriers (leaving wide navigation lanes)
  { id: 'car_avenida_1', x: 680, y: 520, width: 110, height: 54, kind: 'car', label: 'Sedan Abandonado' },
  { id: 'car_avenida_2', x: 420, y: 680, width: 115, height: 56, kind: 'car', label: 'Picape Queimada' },
  { id: 'car_ambulancia', x: 750, y: 240, width: 120, height: 60, kind: 'car', label: 'Ambulância SAMU' },
  { id: 'car_viatura', x: 740, y: 860, width: 115, height: 54, kind: 'car', label: 'Viatura Policial' },
  { id: 'barricada_rua_1', x: 460, y: 900, width: 90, height: 26, kind: 'barrier', label: 'Barricada' },
  { id: 'barricada_rua_2', x: 640, y: 700, width: 28, height: 90, kind: 'barrier', label: 'Bloco de Concreto' },
];

export const INITIAL_LOOT_SPOTS: LootSpot[] = [
  {
    id: 'loot_cesta_saida',
    label: 'Mochila de Emergência',
    kind: 'misto',
    x: 340,
    y: 840,
    radius: 36,
    looted: false,
    contents: { comida: 2, municao: 6 },
  },
  {
    id: 'loot_mercado_estoque',
    label: 'Estante de Enlatados',
    kind: 'comida',
    x: 230,
    y: 190,
    radius: 38,
    looted: false,
    contents: { comida: 4, materiais: 1 },
  },
  {
    id: 'loot_mercado_fundos',
    label: 'Caixa do Depósito',
    kind: 'materiais',
    x: 480,
    y: 200,
    radius: 38,
    looted: false,
    contents: { materiais: 3, comida: 2 },
  },
  {
    id: 'loot_ambulancia',
    label: 'Maleta da Ambulância',
    kind: 'medicamentos',
    x: 810,
    y: 335,
    radius: 38,
    looted: false,
    contents: { medicamentos: 2, municao: 4 },
  },
  {
    id: 'loot_farmacia_cofre',
    label: 'Armário de Antibióticos',
    kind: 'medicamentos',
    x: 1310,
    y: 195,
    radius: 38,
    looted: false,
    contents: { medicamentos: 3, comida: 1 },
  },
  {
    id: 'loot_praca_central',
    label: 'Caixote da Cruzada',
    kind: 'municao',
    x: 735,
    y: 615,
    radius: 38,
    looted: false,
    contents: { municao: 10, materiais: 2 },
  },
  {
    id: 'loot_delegacia_paiol',
    label: 'Paiol de Munição Policial',
    kind: 'municao',
    x: 1320,
    y: 960,
    radius: 40,
    looted: false,
    contents: { municao: 14, materiais: 3 },
  },
  {
    id: 'loot_oficina_bancada',
    label: 'Bancada de Ferramentas',
    kind: 'materiais',
    x: 1050,
    y: 780,
    radius: 38,
    looted: false,
    contents: { materiais: 4, medicamentos: 1 },
  },
];

export interface ZombieSpawnDef {
  id: string;
  archetype: ZombieArchetype;
  x: number;
  y: number;
}

export const INITIAL_ZOMBIE_SPAWNS: ZombieSpawnDef[] = [
  // Street shamblers (far enough from (220, 980) so opening seconds are completely safe)
  { id: 'z_lento_1', archetype: 'lento', x: 560, y: 780 },
  { id: 'z_lento_2', archetype: 'lento', x: 340, y: 540 },
  { id: 'z_lento_3', archetype: 'lento', x: 290, y: 310 },
  { id: 'z_lento_4', archetype: 'lento', x: 860, y: 540 },
  { id: 'z_lento_5', archetype: 'lento', x: 1160, y: 320 },

  // Fast runners (Corredores)
  { id: 'z_corredor_1', archetype: 'corredor', x: 640, y: 380 },
  { id: 'z_corredor_2', archetype: 'corredor', x: 1080, y: 560 },
  { id: 'z_corredor_3', archetype: 'corredor', x: 860, y: 950 },

  // Heavy brutes (Brutos Blindados) guarding high-value zones
  { id: 'z_bruto_1', archetype: 'bruto', x: 460, y: 280 },
  { id: 'z_bruto_2', archetype: 'bruto', x: 1220, y: 260 },
  { id: 'z_bruto_3', archetype: 'bruto', x: 1220, y: 890 },
];
