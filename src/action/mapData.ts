import type {
  BuildingZone,
  DistrictId,
  ExtractionZone,
  LootSpot,
  ObstacleRect,
  TimeOfDay,
  ZombieArchetype,
} from './actionTypes.ts';

export interface ZombieSpawnDef {
  id: string;
  archetype: ZombieArchetype;
  x: number;
  y: number;
}

export interface DistrictDefinition {
  id: DistrictId;
  name: string;
  tagline: string;
  ambientSound: 'residential' | 'commercial' | 'medical';
  worldWidth: number;
  worldHeight: number;
  playerSpawn: { x: number; y: number };
  extractionZone: ExtractionZone;
  buildings: BuildingZone[];
  obstacles: ObstacleRect[];
  lootSpots: LootSpot[];
  zombies: ZombieSpawnDef[];
  initialTimeOfDay: TimeOfDay;
}

// ============================================================================
// 1. DISTRITO 1: VILA RESIDENCIAL ESPERANÇA
// ============================================================================
export const DISTRICT_VILA_ESPERANCA: DistrictDefinition = {
  id: 'vila_esperanca',
  name: 'Vila Residencial Esperança',
  tagline: 'Ruas residenciais, casas de família, cercas de madeira e becos escuros',
  ambientSound: 'residential',
  worldWidth: 1600,
  worldHeight: 1200,
  playerSpawn: { x: 220, y: 980 },
  extractionZone: {
    id: 'ext_portao_abrigo',
    label: 'Portão do Abrigo (Zona de Extração)',
    x: 150,
    y: 1050,
    radius: 70,
  },
  buildings: [
    {
      id: 'bld_casa_santos',
      name: 'Residência Família Santos',
      x: 140,
      y: 130,
      width: 440,
      height: 310,
      floorColor: 0x221c17,
    },
    {
      id: 'bld_mercearia',
      name: 'Mercearia & Padaria da Esquina',
      x: 940,
      y: 130,
      width: 480,
      height: 290,
      floorColor: 0x1d211e,
    },
    {
      id: 'bld_garagem_oficina',
      name: 'Oficina do Seu Mário',
      x: 960,
      y: 720,
      width: 480,
      height: 340,
      floorColor: 0x1b1c20,
    },
  ],
  obstacles: [
    // Outer walls
    { id: 'v_wall_top', x: 0, y: 0, width: 1600, height: 28, kind: 'wall' },
    { id: 'v_wall_bottom', x: 0, y: 1172, width: 1600, height: 28, kind: 'wall' },
    { id: 'v_wall_left', x: 0, y: 0, width: 28, height: 1200, kind: 'wall' },
    { id: 'v_wall_right', x: 1572, y: 0, width: 28, height: 1200, kind: 'wall' },

    // Casa Santos (living room, kitchen & hallway)
    { id: 'cs_n', x: 140, y: 130, width: 440, height: 22, kind: 'wall' },
    { id: 'cs_w', x: 140, y: 130, width: 22, height: 310, kind: 'wall' },
    { id: 'cs_s1', x: 140, y: 418, width: 160, height: 22, kind: 'wall' },
    { id: 'cs_s2', x: 380, y: 418, width: 200, height: 22, kind: 'wall' },
    { id: 'cs_e1', x: 558, y: 130, width: 22, height: 100, kind: 'wall' },
    { id: 'cs_e2', x: 558, y: 310, width: 22, height: 130, kind: 'wall' },
    { id: 'cs_wall_mid', x: 340, y: 130, width: 20, height: 170, kind: 'wall', label: 'Parede Interna' },

    // Mercearia & Padaria
    { id: 'mp_n', x: 940, y: 130, width: 480, height: 22, kind: 'wall' },
    { id: 'mp_e', x: 1398, y: 130, width: 22, height: 290, kind: 'wall' },
    { id: 'mp_w1', x: 940, y: 130, width: 22, height: 90, kind: 'wall' },
    { id: 'mp_w2', x: 940, y: 300, width: 22, height: 120, kind: 'wall' },
    { id: 'mp_s1', x: 940, y: 398, width: 180, height: 22, kind: 'wall' },
    { id: 'mp_s2', x: 1200, y: 398, width: 220, height: 22, kind: 'wall' },
    { id: 'mp_counter', x: 1080, y: 220, width: 140, height: 28, kind: 'crate', label: 'Balcão de Pães' },

    // Oficina
    { id: 'of_s', x: 960, y: 1038, width: 480, height: 22, kind: 'wall' },
    { id: 'of_e', x: 1418, y: 720, width: 22, height: 340, kind: 'wall' },
    { id: 'of_n1', x: 960, y: 720, width: 180, height: 22, kind: 'wall' },
    { id: 'of_n2', x: 1240, y: 720, width: 200, height: 22, kind: 'wall' },
    { id: 'of_w1', x: 960, y: 720, width: 22, height: 110, kind: 'wall' },
    { id: 'of_w2', x: 960, y: 910, width: 22, height: 150, kind: 'wall' },

    // Street Cars & Barriers
    { id: 'car_sedan', x: 670, y: 520, width: 110, height: 54, kind: 'car', label: 'Sedan Familiar' },
    { id: 'car_pickup', x: 420, y: 680, width: 115, height: 56, kind: 'car', label: 'Picape Queimada' },
    { id: 'car_kombi', x: 740, y: 240, width: 115, height: 58, kind: 'car', label: 'Kombi Abandonada' },
    { id: 'fence_1', x: 450, y: 900, width: 90, height: 24, kind: 'barrier', label: 'Cerca de Madeira' },
    { id: 'barrier_block', x: 640, y: 700, width: 28, height: 90, kind: 'barrier', label: 'Bloco de Concreto' },
  ],
  lootSpots: [
    {
      id: 'loot_mochila_saida',
      label: 'Mochila no Meio-Fio',
      kind: 'misto',
      containerType: 'mochila',
      searchDuration: 0.8,
      noiseOnSearch: false,
      x: 340,
      y: 840,
      radius: 36,
      looted: false,
      contents: { comida: 2, municao: 6 },
    },
    {
      id: 'loot_cs_geladeira',
      label: 'Geladeira Antiga',
      kind: 'comida',
      containerType: 'geladeira',
      searchDuration: 1.0,
      noiseOnSearch: false,
      x: 230,
      y: 190,
      radius: 38,
      looted: false,
      contents: { comida: 4, materiais: 1 },
    },
    {
      id: 'loot_cs_armario',
      label: 'Armário de Remédios',
      kind: 'medicamentos',
      containerType: 'armario',
      searchDuration: 1.2,
      noiseOnSearch: true,
      x: 480,
      y: 200,
      radius: 38,
      looted: false,
      contents: { medicamentos: 2, materiais: 2 },
    },
    {
      id: 'loot_portamalas_sedan',
      label: 'Porta-Malas do Sedan',
      kind: 'municao',
      containerType: 'porta_malas',
      searchDuration: 1.4,
      noiseOnSearch: true,
      x: 810,
      y: 335,
      radius: 38,
      looted: false,
      contents: { municao: 8, materiais: 2 },
    },
    {
      id: 'loot_mp_despensa',
      label: 'Gôndola de Farinha & Enlatados',
      kind: 'comida',
      containerType: 'gondola',
      searchDuration: 1.1,
      noiseOnSearch: false,
      x: 1310,
      y: 195,
      radius: 38,
      looted: false,
      contents: { comida: 4, materiais: 2 },
    },
    {
      id: 'loot_oficina_bancada',
      label: 'Bancada de Ferramentas',
      kind: 'materiais',
      containerType: 'bancada',
      searchDuration: 1.1,
      noiseOnSearch: false,
      x: 1050,
      y: 780,
      radius: 38,
      looted: false,
      contents: { materiais: 5, medicamentos: 1 },
    },
    {
      id: 'loot_oficina_cofre',
      label: 'Cofre Metálico da Oficina',
      kind: 'municao',
      containerType: 'cofre',
      searchDuration: 2.0,
      noiseOnSearch: true,
      x: 1320,
      y: 960,
      radius: 40,
      looted: false,
      contents: { municao: 14, materiais: 3 },
    },
  ],
  zombies: [
    { id: 'v_z1', archetype: 'lento', x: 560, y: 780 },
    { id: 'v_z2', archetype: 'lento', x: 340, y: 540 },
    { id: 'v_z3', archetype: 'lento', x: 290, y: 310 },
    { id: 'v_z4', archetype: 'lento', x: 860, y: 540 },
    { id: 'v_z5', archetype: 'lento', x: 1160, y: 320 },
    { id: 'v_corredor_1', archetype: 'corredor', x: 640, y: 380 },
    { id: 'v_corredor_2', archetype: 'corredor', x: 1080, y: 560 },
    { id: 'v_corredor_3', archetype: 'corredor', x: 860, y: 950 },
    { id: 'v_bruto_1', archetype: 'bruto', x: 460, y: 280 },
    { id: 'v_bruto_2', archetype: 'bruto', x: 1220, y: 260 },
    { id: 'v_bruto_3', archetype: 'bruto', x: 1220, y: 890 },
  ],
  initialTimeOfDay: 'entardecer',
};

// ============================================================================
// 2. DISTRITO 2: CENTRO COMERCIAL & MERCADO SÃO JORGE
// ============================================================================
export const DISTRICT_CENTRO_COMERCIAL: DistrictDefinition = {
  id: 'centro_comercial',
  name: 'Centro Comercial São Jorge',
  tagline: 'Supermercado amplo, farmácia 24h, vidros estilhaçados e viaturas',
  ambientSound: 'commercial',
  worldWidth: 1600,
  worldHeight: 1200,
  playerSpawn: { x: 200, y: 1000 },
  extractionZone: {
    id: 'ext_praca_sul',
    label: 'Caminhão de Evacuação (Extração)',
    x: 170,
    y: 1060,
    radius: 72,
  },
  buildings: [
    {
      id: 'bld_supermercado',
      name: 'Supermercado CompreBem',
      x: 120,
      y: 110,
      width: 520,
      height: 360,
      floorColor: 0x1d2228,
    },
    {
      id: 'bld_farmacia_central',
      name: 'Farmácia Popular 24 Horas',
      x: 920,
      y: 110,
      width: 500,
      height: 330,
      floorColor: 0x162420,
    },
    {
      id: 'bld_eletronicos',
      name: 'Galeria Comercial & Segurança',
      x: 940,
      y: 690,
      width: 500,
      height: 380,
      floorColor: 0x221f1d,
    },
  ],
  obstacles: [
    { id: 'c_wall_top', x: 0, y: 0, width: 1600, height: 28, kind: 'wall' },
    { id: 'c_wall_bottom', x: 0, y: 1172, width: 1600, height: 28, kind: 'wall' },
    { id: 'c_wall_left', x: 0, y: 0, width: 28, height: 1200, kind: 'wall' },
    { id: 'c_wall_right', x: 1572, y: 0, width: 28, height: 1200, kind: 'wall' },

    // Supermercado walls & internal aisles
    { id: 'sm_n', x: 120, y: 110, width: 520, height: 22, kind: 'wall' },
    { id: 'sm_w', x: 120, y: 110, width: 22, height: 360, kind: 'wall' },
    { id: 'sm_s1', x: 120, y: 448, width: 180, height: 22, kind: 'wall' },
    { id: 'sm_s2', x: 420, y: 448, width: 220, height: 22, kind: 'wall' },
    { id: 'sm_e1', x: 618, y: 110, width: 22, height: 130, kind: 'wall' },
    { id: 'sm_e2', x: 618, y: 330, width: 22, height: 140, kind: 'wall' },
    // Supermarket gondolas
    { id: 'sm_gondola_1', x: 220, y: 210, width: 170, height: 26, kind: 'crate', label: 'Gôndola de Bebidas' },
    { id: 'sm_gondola_2', x: 220, y: 310, width: 170, height: 26, kind: 'crate', label: 'Gôndola de Cereais' },
    { id: 'sm_checkout', x: 450, y: 220, width: 28, height: 150, kind: 'crate', label: 'Balcão de Caixa' },

    // Farmácia 24h
    { id: 'fm_n', x: 920, y: 110, width: 500, height: 22, kind: 'wall' },
    { id: 'fm_e', x: 1398, y: 110, width: 22, height: 330, kind: 'wall' },
    { id: 'fm_w1', x: 920, y: 110, width: 22, height: 100, kind: 'wall' },
    { id: 'fm_w2', x: 920, y: 300, width: 22, height: 140, kind: 'wall' },
    { id: 'fm_s1', x: 920, y: 418, width: 190, height: 22, kind: 'wall' },
    { id: 'fm_s2', x: 1220, y: 418, width: 200, height: 22, kind: 'wall' },
    { id: 'fm_counter', x: 1060, y: 230, width: 190, height: 28, kind: 'crate', label: 'Balcão de Remédios' },

    // Galeria & Segurança
    { id: 'gl_s', x: 940, y: 1048, width: 500, height: 22, kind: 'wall' },
    { id: 'gl_e', x: 1418, y: 690, width: 22, height: 380, kind: 'wall' },
    { id: 'gl_n1', x: 940, y: 690, width: 190, height: 22, kind: 'wall' },
    { id: 'gl_n2', x: 1240, y: 690, width: 200, height: 22, kind: 'wall' },
    { id: 'gl_w1', x: 940, y: 690, width: 22, height: 120, kind: 'wall' },
    { id: 'gl_w2', x: 940, y: 910, width: 22, height: 160, kind: 'wall' },

    // Avenidas: Viaturas, Ambulância e Caixas
    { id: 'c_viatura_1', x: 740, y: 490, width: 120, height: 56, kind: 'car', label: 'Viatura Policial' },
    { id: 'c_ambulancia', x: 420, y: 660, width: 125, height: 60, kind: 'car', label: 'Ambulância SAMU' },
    { id: 'c_carro_batido', x: 720, y: 260, width: 115, height: 55, kind: 'car', label: 'Sedan Batido' },
    { id: 'c_carro_sul', x: 730, y: 880, width: 115, height: 56, kind: 'car', label: 'Caminhonete' },
    { id: 'c_barricada_av', x: 450, y: 880, width: 110, height: 26, kind: 'barrier', label: 'Barricada Policial' },
  ],
  lootSpots: [
    {
      id: 'loot_c_ambulancia',
      label: 'Maleta da Ambulância SAMU',
      kind: 'medicamentos',
      containerType: 'mochila',
      searchDuration: 0.9,
      noiseOnSearch: false,
      x: 480,
      y: 690,
      radius: 38,
      looted: false,
      contents: { medicamentos: 3, municao: 4 },
    },
    {
      id: 'loot_c_gondola_comida',
      label: 'Gôndola de Conservas',
      kind: 'comida',
      containerType: 'gondola',
      searchDuration: 1.0,
      noiseOnSearch: false,
      x: 300,
      y: 210,
      radius: 38,
      looted: false,
      contents: { comida: 5, materiais: 1 },
    },
    {
      id: 'loot_c_freezer',
      label: 'Freezer Industrial Descongelado',
      kind: 'comida',
      containerType: 'geladeira',
      searchDuration: 1.2,
      noiseOnSearch: true,
      x: 520,
      y: 170,
      radius: 38,
      looted: false,
      contents: { comida: 4, materiais: 2 },
    },
    {
      id: 'loot_c_cofre_farmacia',
      label: 'Cofre de Narcóticos & Antibióticos',
      kind: 'medicamentos',
      containerType: 'cofre',
      searchDuration: 2.2,
      noiseOnSearch: true,
      x: 1330,
      y: 180,
      radius: 40,
      looted: false,
      contents: { medicamentos: 4, comida: 1 },
    },
    {
      id: 'loot_c_balcao_farmacia',
      label: 'Balcão de Atendimento',
      kind: 'medicamentos',
      containerType: 'bancada',
      searchDuration: 1.0,
      noiseOnSearch: false,
      x: 1130,
      y: 230,
      radius: 38,
      looted: false,
      contents: { medicamentos: 2, municao: 4 },
    },
    {
      id: 'loot_c_viatura_porta_malas',
      label: 'Porta-Malas da Viatura',
      kind: 'municao',
      containerType: 'porta_malas',
      searchDuration: 1.5,
      noiseOnSearch: true,
      x: 800,
      y: 520,
      radius: 38,
      looted: false,
      contents: { municao: 12, materiais: 3 },
    },
    {
      id: 'loot_c_armario_seguranca',
      label: 'Armário de Segurança & Rádios',
      kind: 'materiais',
      containerType: 'armario',
      searchDuration: 1.3,
      noiseOnSearch: true,
      x: 1100,
      y: 770,
      radius: 38,
      looted: false,
      contents: { materiais: 5, municao: 8 },
    },
    {
      id: 'loot_c_caixa_registradora',
      label: 'Caixa Registradora Comercial',
      kind: 'misto',
      containerType: 'bancada',
      searchDuration: 0.9,
      noiseOnSearch: true,
      x: 1320,
      y: 930,
      radius: 38,
      looted: false,
      contents: { comida: 2, municao: 6, materiais: 2 },
    },
  ],
  zombies: [
    { id: 'c_z1', archetype: 'lento', x: 500, y: 740 },
    { id: 'c_z2', archetype: 'lento', x: 340, y: 480 },
    { id: 'c_z3', archetype: 'lento', x: 820, y: 390 },
    { id: 'c_z4', archetype: 'lento', x: 1160, y: 480 },
    { id: 'c_z5', archetype: 'lento', x: 920, y: 880 },
    { id: 'c_corredor_1', archetype: 'corredor', x: 620, y: 320 },
    { id: 'c_corredor_2', archetype: 'corredor', x: 1040, y: 600 },
    { id: 'c_corredor_3', archetype: 'corredor', x: 740, y: 720 },
    { id: 'c_corredor_4', archetype: 'corredor', x: 1240, y: 360 },
    { id: 'c_bruto_1', archetype: 'bruto', x: 380, y: 260 },
    { id: 'c_bruto_2', archetype: 'bruto', x: 1280, y: 230 },
    { id: 'c_bruto_3', archetype: 'bruto', x: 1260, y: 860 },
  ],
  initialTimeOfDay: 'noite',
};

// ============================================================================
// 3. DISTRITO 3: COMPLEXO MÉDICO & GALPÃO DE QUARENTENA
// ============================================================================
export const DISTRICT_COMPLEXO_MEDICO: DistrictDefinition = {
  id: 'complexo_medico',
  name: 'Complexo Médico & Galpão',
  tagline: 'Pronto-socorro abandonado, necrotério, geradores e contenção biológica',
  ambientSound: 'medical',
  worldWidth: 1600,
  worldHeight: 1200,
  playerSpawn: { x: 220, y: 980 },
  extractionZone: {
    id: 'ext_portao_quarentena',
    label: 'Cerca Rompida da Quarentena (Extração)',
    x: 160,
    y: 1040,
    radius: 70,
  },
  buildings: [
    {
      id: 'bld_pronto_socorro',
      name: 'Pronto-Socorro & Triagem',
      x: 130,
      y: 120,
      width: 480,
      height: 340,
      floorColor: 0x182024,
    },
    {
      id: 'bld_laboratorio',
      name: 'Laboratório & Almoxarifado Central',
      x: 930,
      y: 120,
      width: 500,
      height: 320,
      floorColor: 0x1a211e,
    },
    {
      id: 'bld_galpao_quarentena',
      name: 'Galpão de Geradores & Quarentena',
      x: 940,
      y: 700,
      width: 500,
      height: 360,
      floorColor: 0x241d1a,
    },
  ],
  obstacles: [
    { id: 'm_wall_top', x: 0, y: 0, width: 1600, height: 28, kind: 'wall' },
    { id: 'm_wall_bottom', x: 0, y: 1172, width: 1600, height: 28, kind: 'wall' },
    { id: 'm_wall_left', x: 0, y: 0, width: 28, height: 1200, kind: 'wall' },
    { id: 'm_wall_right', x: 1572, y: 0, width: 28, height: 1200, kind: 'wall' },

    // Pronto-Socorro
    { id: 'ps_n', x: 130, y: 120, width: 480, height: 22, kind: 'wall' },
    { id: 'ps_w', x: 130, y: 120, width: 22, height: 340, kind: 'wall' },
    { id: 'ps_s1', x: 130, y: 438, width: 170, height: 22, kind: 'wall' },
    { id: 'ps_s2', x: 390, y: 438, width: 220, height: 22, kind: 'wall' },
    { id: 'ps_e1', x: 588, y: 120, width: 22, height: 110, kind: 'wall' },
    { id: 'ps_e2', x: 588, y: 310, width: 22, height: 150, kind: 'wall' },
    { id: 'ps_divider', x: 330, y: 120, width: 20, height: 180, kind: 'wall', label: 'Divisória de Triagem' },

    // Laboratório & Farmácia Hospitalar
    { id: 'lb_n', x: 930, y: 120, width: 500, height: 22, kind: 'wall' },
    { id: 'lb_e', x: 1408, y: 120, width: 22, height: 320, kind: 'wall' },
    { id: 'lb_w1', x: 930, y: 120, width: 22, height: 100, kind: 'wall' },
    { id: 'lb_w2', x: 930, y: 300, width: 22, height: 140, kind: 'wall' },
    { id: 'lb_s1', x: 930, y: 418, width: 180, height: 22, kind: 'wall' },
    { id: 'lb_s2', x: 1220, y: 418, width: 210, height: 22, kind: 'wall' },
    { id: 'lb_bench', x: 1070, y: 220, width: 160, height: 30, kind: 'crate', label: 'Bancada Química' },

    // Galpão de Geradores
    { id: 'gq_s', x: 940, y: 1038, width: 500, height: 22, kind: 'wall' },
    { id: 'gq_e', x: 1418, y: 700, width: 22, height: 360, kind: 'wall' },
    { id: 'gq_n1', x: 940, y: 700, width: 180, height: 22, kind: 'wall' },
    { id: 'gq_n2', x: 1240, y: 700, width: 200, height: 22, kind: 'wall' },
    { id: 'gq_w1', x: 940, y: 700, width: 22, height: 120, kind: 'wall' },
    { id: 'gq_w2', x: 940, y: 920, width: 22, height: 140, kind: 'wall' },
    { id: 'gq_gen', x: 1120, y: 840, width: 140, height: 50, kind: 'crate', label: 'Gerador a Diesel' },

    // Pátio & Contenção
    { id: 'm_barricada_militar', x: 670, y: 520, width: 120, height: 30, kind: 'barrier', label: 'Contenção Militar' },
    { id: 'm_caminhao_tropa', x: 430, y: 680, width: 130, height: 60, kind: 'car', label: 'Caminhão de Quarentena' },
    { id: 'm_ambulancia_isolamento', x: 740, y: 250, width: 120, height: 58, kind: 'car', label: 'Ambulância de Isolamento' },
    { id: 'm_barricada_sul', x: 460, y: 890, width: 100, height: 26, kind: 'barrier', label: 'Cerca com Arame' },
    { id: 'm_bloco_quarentena', x: 640, y: 710, width: 28, height: 95, kind: 'barrier', label: 'Bloco de Concreto' },
  ],
  lootSpots: [
    {
      id: 'loot_m_maca_triagem',
      label: 'Maca de Triagem Cirúrgica',
      kind: 'medicamentos',
      containerType: 'maca',
      searchDuration: 1.0,
      noiseOnSearch: false,
      x: 230,
      y: 200,
      radius: 38,
      looted: false,
      contents: { medicamentos: 3, comida: 1 },
    },
    {
      id: 'loot_m_armario_farmacos',
      label: 'Armário de Anestésicos & Soros',
      kind: 'medicamentos',
      containerType: 'armario',
      searchDuration: 1.3,
      noiseOnSearch: true,
      x: 480,
      y: 190,
      radius: 38,
      looted: false,
      contents: { medicamentos: 4, materiais: 2 },
    },
    {
      id: 'loot_m_maleta_socorro',
      label: 'Kit de Primeiros Socorros Militar',
      kind: 'medicamentos',
      containerType: 'mochila',
      searchDuration: 0.9,
      noiseOnSearch: false,
      x: 350,
      y: 840,
      radius: 36,
      looted: false,
      contents: { medicamentos: 3, municao: 8 },
    },
    {
      id: 'loot_m_cofre_quimico',
      label: 'Cofre Blindado de Quarentena',
      kind: 'medicamentos',
      containerType: 'cofre',
      searchDuration: 2.3,
      noiseOnSearch: true,
      x: 1320,
      y: 190,
      radius: 40,
      looted: false,
      contents: { medicamentos: 5, comida: 2 },
    },
    {
      id: 'loot_m_bancada_lab',
      label: 'Bancada de Análises',
      kind: 'materiais',
      containerType: 'bancada',
      searchDuration: 1.1,
      noiseOnSearch: false,
      x: 1080,
      y: 310,
      radius: 38,
      looted: false,
      contents: { materiais: 4, medicamentos: 2 },
    },
    {
      id: 'loot_m_painel_gerador',
      label: 'Caixa de Ferramentas do Gerador',
      kind: 'materiais',
      containerType: 'bancada',
      searchDuration: 1.2,
      noiseOnSearch: true,
      x: 1050,
      y: 780,
      radius: 38,
      looted: false,
      contents: { materiais: 6, municao: 6 },
    },
    {
      id: 'loot_m_caixa_municao_guarda',
      label: 'Caixa de Munição da Guarda Militar',
      kind: 'municao',
      containerType: 'caixa',
      searchDuration: 1.5,
      noiseOnSearch: true,
      x: 1330,
      y: 950,
      radius: 40,
      looted: false,
      contents: { municao: 18, materiais: 3 },
    },
  ],
  zombies: [
    { id: 'm_z1', archetype: 'lento', x: 540, y: 760 },
    { id: 'm_z2', archetype: 'lento', x: 320, y: 520 },
    { id: 'm_z3', archetype: 'lento', x: 280, y: 300 },
    { id: 'm_z4', archetype: 'lento', x: 840, y: 520 },
    { id: 'm_z5', archetype: 'lento', x: 1140, y: 300 },
    { id: 'm_corredor_1', archetype: 'corredor', x: 620, y: 360 },
    { id: 'm_corredor_2', archetype: 'corredor', x: 1060, y: 540 },
    { id: 'm_corredor_3', archetype: 'corredor', x: 840, y: 920 },
    { id: 'm_corredor_4', archetype: 'corredor', x: 1220, y: 500 },
    { id: 'm_bruto_1', archetype: 'bruto', x: 440, y: 260 },
    { id: 'm_bruto_2', archetype: 'bruto', x: 1200, y: 240 },
    { id: 'm_bruto_3', archetype: 'bruto', x: 1200, y: 870 },
    { id: 'm_bruto_4', archetype: 'bruto', x: 750, y: 640 },
  ],
  initialTimeOfDay: 'madrugada',
};

// ============================================================================
// Registry & Helper Functions
// ============================================================================
export const DISTRICTS: DistrictDefinition[] = [
  DISTRICT_VILA_ESPERANCA,
  DISTRICT_CENTRO_COMERCIAL,
  DISTRICT_COMPLEXO_MEDICO,
];

export function getDistrictDefinition(id?: DistrictId): DistrictDefinition {
  const match = DISTRICTS.find((d) => d.id === id);
  return match ?? DISTRICT_VILA_ESPERANCA;
}

// Backwards compatibility exports for Vila Esperança default
export const WORLD_WIDTH = DISTRICT_VILA_ESPERANCA.worldWidth;
export const WORLD_HEIGHT = DISTRICT_VILA_ESPERANCA.worldHeight;
export const PLAYER_SPAWN = DISTRICT_VILA_ESPERANCA.playerSpawn;
export const EXTRACTION_ZONE = DISTRICT_VILA_ESPERANCA.extractionZone;
export const BUILDINGS = DISTRICT_VILA_ESPERANCA.buildings;
export const MAP_OBSTACLES = DISTRICT_VILA_ESPERANCA.obstacles;
export const INITIAL_LOOT_SPOTS = DISTRICT_VILA_ESPERANCA.lootSpots;
export const INITIAL_ZOMBIE_SPAWNS = DISTRICT_VILA_ESPERANCA.zombies;
