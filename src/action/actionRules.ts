import {
  ACTION_STASH_SCHEMA_VERSION,
  type AcousticCue,
  type ActionInputState,
  type ActionLootBag,
  type ActionWorldState,
  type BulletEntity,
  type DistrictId,
  type InteractPrompt,
  type MinimapSnapshot,
  type ObstacleRect,
  type PersistentShelterStash,
  type ShelterSurvivor,
  type ShelterUpgradeId,
  type ShelterUpgradeState,
  type VisibilityLevel,
  type ZombieArchetype,
  type ZombieEntity,
} from './actionTypes.ts';
import {
  BUILDINGS,
  EXTRACTION_ZONE,
  getDistrictDefinition,
  INITIAL_LOOT_SPOTS,
  INITIAL_ZOMBIE_SPAWNS,
  MAP_OBSTACLES,
  PLAYER_SPAWN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './mapData.ts';

export function createEmptyLootBag(): ActionLootBag {
  return {
    comida: 0,
    medicamentos: 0,
    municao: 0,
    materiais: 0,
  };
}

export function createInitialSurvivors(): ShelterSurvivor[] {
  return [
    {
      id: 'surv_elena',
      name: 'Elena Vance',
      role: 'Batedora Tática',
      hp: 100,
      maxHp: 100,
      status: 'saudavel',
    },
    {
      id: 'surv_marcus',
      name: 'Marcus Costa',
      role: 'Engenheiro de Rádio',
      hp: 92,
      maxHp: 100,
      status: 'saudavel',
    },
    {
      id: 'surv_sara',
      name: 'Dra. Sara Lima',
      role: 'Médica de Campo',
      hp: 88,
      maxHp: 100,
      status: 'saudavel',
    },
  ];
}

export function createInitialUpgrades(): ShelterUpgradeState {
  return {
    oficina: 0,
    enfermaria: 0,
    torre_radio: 0,
    muralha: 0,
  };
}

export interface ShelterUpgradeDefinition {
  id: ShelterUpgradeId;
  name: string;
  maxLevel: number;
  description: string;
  effectSummary: (level: number) => string;
  costs: Array<Partial<ActionLootBag>>;
}

export const SHELTER_UPGRADE_CATALOG: Record<ShelterUpgradeId, ShelterUpgradeDefinition> = {
  oficina: {
    id: 'oficina',
    name: 'Bancada Tática & Mochila',
    maxLevel: 2,
    description: 'Expande a capacidade de carga da mochila e fabrica munição 9mm extra para cada incursão.',
    effectSummary: (lvl) =>
      lvl === 0
        ? 'Padrão: 24 espaços de carga | 18 munições reserva'
        : `Ativo (Nv.${lvl}): ${24 + lvl * 6} espaços de carga | +${lvl * 4} munições 9mm na saída`,
    costs: [
      { materiais: 4 },
      { materiais: 7, municao: 6 },
    ],
  },
  enfermaria: {
    id: 'enfermaria',
    name: 'Posto Médico de Campo',
    maxLevel: 2,
    description: 'Aumenta o vigor máximo em expedição e acelera a aplicação de ataduras.',
    effectSummary: (lvl) =>
      lvl === 0
        ? 'Padrão: 100 PV máx | Atadura +35 PV em 2.2s'
        : `Ativo (Nv.${lvl}): ${100 + lvl * 15} PV máx | Atadura +${35 + lvl * 10} PV em ${(2.2 - lvl * 0.32).toFixed(1)}s`,
    costs: [
      { materiais: 3, medicamentos: 1 },
      { materiais: 6, medicamentos: 2 },
    ],
  },
  torre_radio: {
    id: 'torre_radio',
    name: 'Transmissor & Farol Tático',
    maxLevel: 2,
    description: 'Melhora o alcance e bateria da lanterna tática e estabelece contato com o Comboio de Resgate.',
    effectSummary: (lvl) =>
      lvl === 0
        ? 'Padrão: Lanterna 320px | Rádio de Evacuação Offline'
        : `Ativo (Nv.${lvl}): Lanterna ${320 + lvl * 38}px (-${lvl * 25}% consumo) | Sinal ${lvl * 50}%`,
    costs: [
      { materiais: 4 },
      { materiais: 6, municao: 8 },
    ],
  },
  muralha: {
    id: 'muralha',
    name: 'Perímetro & Barricadas',
    maxLevel: 2,
    description: 'Protege o abrigo contra ataques noturnos e reduz o desgaste diário da equipe.',
    effectSummary: (lvl) =>
      lvl === 0
        ? 'Padrão: Perímetro vulnerável a cercos noturnos'
        : `Ativo (Nv.${lvl}): Defesa reforçada (+${lvl * 15}% preparação de evacuação)`,
    costs: [
      { materiais: 3, comida: 1 },
      { materiais: 5, comida: 2 },
    ],
  },
};

export const CAMPAIGN_EVACUATION_COST: ActionLootBag = {
  comida: 6,
  medicamentos: 3,
  municao: 12,
  materiais: 5,
};

export const CAMPAIGN_EVACUATION_GOAL = {
  radioLevelRequired: 1,
  runsExtractedRequired: 2,
  ...CAMPAIGN_EVACUATION_COST,
};

export function createInitialPersistentStash(): PersistentShelterStash {
  return {
    schemaVersion: ACTION_STASH_SCHEMA_VERSION,
    totalStash: {
      comida: 4,
      medicamentos: 2,
      municao: 16,
      materiais: 3,
    },
    runsStarted: 0,
    runsExtracted: 0,
    runsDied: 0,
    totalZombiesKilled: 0,
    extractedRunIds: [],
    lastRunSummary: null,
    updatedAt: new Date().toISOString(),
    day: 1,
    survivors: createInitialSurvivors(),
    activeSurvivorId: 'surv_elena',
    upgrades: createInitialUpgrades(),
    evacuationProgress: 0,
    evacuationCompleted: false,
    shelterLog: [
      'Dia 1: Abrigo estabelecido. Construa o Transmissor de Rádio e reúna suprimentos para acionar o Comboio de Evacuação.',
    ],
  };
}

export interface ZombieArchetypeStats {
  name: string;
  radius: number;
  turnRateRad: number;
  visionConeAngle: number;
  visionRange: number;
  hp: number;
  speed: number;
  damage: number;
  detectionRange: number;
  attackRange: number;
  windupDuration: number;
  attackCooldown: number;
}

export const ZOMBIE_ARCHETYPE_CONFIG: Record<ZombieArchetype, ZombieArchetypeStats> = {
  // Common zombie speed reduced to ~60% of original (37 px/s vs 62 px/s) for fair tactical pacing
  lento: {
    name: 'Errante Comum',
    radius: 16,
    turnRateRad: 5.2, // Natural deliberate rotation speed (rad/s)
    visionConeAngle: 1.35, // ~77 degrees
    visionRange: 230,
    hp: 45,
    speed: 37,
    damage: 14,
    detectionRange: 420,
    attackRange: 34,
    windupDuration: 0.34,
    attackCooldown: 1.2,
  },
  // Future-ready architecture for specialized archetypes (kept proportional for tests)
  corredor: {
    name: 'Corredor Infectado',
    radius: 14,
    turnRateRad: 9.5, // Agile runner rotation speed (rad/s)
    visionConeAngle: 1.5, // ~86 degrees
    visionRange: 260,
    hp: 30,
    speed: 74,
    damage: 10,
    detectionRange: 460,
    attackRange: 32,
    windupDuration: 0.28,
    attackCooldown: 0.9,
  },
  bruto: {
    name: 'Bruto Blindado',
    radius: 22,
    turnRateRad: 3.4, // Heavy armored rotation speed (rad/s)
    visionConeAngle: 1.2, // ~68 degrees
    visionRange: 210,
    hp: 120,
    speed: 26,
    damage: 26,
    detectionRange: 400,
    attackRange: 42,
    windupDuration: 0.45,
    attackCooldown: 1.35,
  },
};

export const WEAPON_CONFIG = {
  pistola: {
    damage: 24, // Tactical ranged stopping power: 2-shots runner (30 HP -> 6 -> 0) and 2-shots common (45 HP) with safe distance
    cooldown: 0.25, // Controlled semi-auto cadence
    range: 640, // Effective bullet range
    bulletSpeed: 740,
    sightRange: 300, // Long tactical reach
    noiseRadius: 480, // Loud acoustic signature that draws nearby zombies
    minConeAngleRad: (12 * Math.PI) / 180, // 12 deg focused cone when stationary & steady
    moveConeAngleRad: (36 * Math.PI) / 180, // 36 deg wider cone while moving
    maxConeAngleRad: (46 * Math.PI) / 180, // 46 deg max cone when sprinting / firing bloom
    shotBloomRad: (8 * Math.PI) / 180, // Recoil bloom per shot
    focusSpeed: 3.2, // Smooth narrowing rate when stopped
    widenSpeed: 7.5, // Responsive opening rate when moving
  },
  facao: {
    reach: 84, // Short melee reach requiring close-quarters commitment
    coneAngleRad: (65 * Math.PI) / 180, // 65 deg total opening
    damage: 22, // Significantly reduced per-hit damage (requires 3 hits for 45 HP common zombie, 6 for brute)
    cooldown: 0.68, // Deliberate recovery cadence between slashes so it cannot be spammed to dominate
    swingDuration: 0.14, // Crisp, fast strike response on activation
    knockback: 185,
    noiseRadius: 95, // Effective 95 px low-radius melee sound
  },
} as const;

export const VISION_CONFIG = {
  closeAwarenessRadius: {
    dia: 105,
    entardecer: 88,
    madrugada: 74,
    noite: 64,
    indoor: 68,
  },
  directConeRange: {
    dia: 255,
    entardecer: 215,
    madrugada: 175,
    noite: 145,
    indoor: 155,
  },
  directConeAngleRad: (108 * Math.PI) / 180, // Directional perception cone (~108 deg)
  penumbraConePaddingRad: (26 * Math.PI) / 180,
  penumbraRangePadding: 44,
  flashlightBonusRange: 185, // Significant range boost when flashlight is enabled
  acousticDetectionRange: 340, // Max distance at which moving/attacking unseen zombies emit directional sound cues
} as const;

export const DEFAULT_MAX_CARRY_CAPACITY = 24;

export function getCarryLoad(bag: ActionLootBag): number {
  return (bag.comida || 0) + (bag.medicamentos || 0) + (bag.materiais || 0);
}

export function createZombieFromArchetype(
  id: string,
  archetype: ZombieArchetype,
  x: number,
  y: number,
  index = 0
): ZombieEntity {
  const cfg = ZOMBIE_ARCHETYPE_CONFIG[archetype] ?? ZOMBIE_ARCHETYPE_CONFIG.lento;
  return {
    id,
    archetype,
    name: cfg.name,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: cfg.radius,
    facingAngle: 0,
    turnRateRad: cfg.turnRateRad,
    visionConeAngle: cfg.visionConeAngle,
    visionRange: cfg.visionRange,
    alertState: 'idle',
    alertTimer: 0,
    targetPoint: null,
    visibility: 'hidden',
    lastHeardTimer: 0,
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speed,
    damage: cfg.damage,
    detectionRange: cfg.detectionRange,
    attackRange: cfg.attackRange,
    attackCooldown: 0,
    windupTimer: 0,
    isWindingUp: false,
    hitFlashTimer: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    dead: false,
    deathTimer: 0,
    flankSign: index % 2 === 0 ? 1 : -1,
  };
}

export function createInitialWorldState(
  runId?: string,
  districtId: DistrictId = 'vila_esperanca',
  stash?: PersistentShelterStash
): ActionWorldState {
  const def = getDistrictDefinition(districtId);
  const upgrades = stash?.upgrades ?? createInitialUpgrades();
  const activeSurvivor = stash?.survivors?.find((s) => s.id === stash.activeSurvivorId);

  const bonusCapacity = (upgrades.oficina || 0) * 6;
  const bonusReserveAmmo = (upgrades.oficina || 0) * 4;
  const bonusMaxHp = (upgrades.enfermaria || 0) * 15;
  const startingHp = activeSurvivor
    ? Math.max(35, Math.min(100 + bonusMaxHp, Math.round((activeSurvivor.hp / activeSurvivor.maxHp) * (100 + bonusMaxHp))))
    : 100 + bonusMaxHp;
  const flashlightRange = 320 + (upgrades.torre_radio || 0) * 38;
  const flashlightDrain = Number((1.15 * Math.pow(0.75, upgrades.torre_radio || 0)).toFixed(3));

  const world: ActionWorldState = {
    runId: runId ?? `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    districtId: def.id,
    districtName: def.name,
    timeOfDay: def.initialTimeOfDay,
    dayNightClock: 0,
    ambientDarkness:
      def.initialTimeOfDay === 'noite'
        ? 0.48
        : def.initialTimeOfDay === 'madrugada'
        ? 0.38
        : def.initialTimeOfDay === 'entardecer'
        ? 0.26
        : 0.12,
    isInsideBuilding: false,
    currentBuildingName: null,
    status: 'playing',
    elapsedTime: 0,
    hitstopTimer: 0,
    cameraShakeTrauma: 0,
    worldWidth: def.worldWidth,
    worldHeight: def.worldHeight,
    player: {
      x: def.playerSpawn.x,
      y: def.playerSpawn.y,
      vx: 0,
      vy: 0,
      radius: 16,
      facingAngle: -Math.PI / 4, // Facing NE into the street
      aimSpreadRad: WEAPON_CONFIG.pistola.minConeAngleRad,
      engagedTargetId: null,
      engagedTargetIds: [],
      hp: startingHp,
      maxHp: 100 + bonusMaxHp,
      stamina: 100,
      maxStamina: 100,
      sprinting: false,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      invulnTimer: 0,
      equippedWeapon: 'pistola',
      ammoInClip: 12,
      clipSize: 12,
      ammoReserve: 18 + bonusReserveAmmo,
      reloadTimer: 0,
      reloadDuration: 1.0,
      attackCooldown: 0,
      meleeSwingTimer: 0,
      hurtFlashTimer: 0,
      flashlight: {
        enabled: true,
        battery: 100,
        maxBattery: 100,
        drainRate: flashlightDrain,
        range: flashlightRange,
        coneAngle: 0.98,
      },
      healing: null,
      isInsideBuilding: null,
      currentBuildingName: null,
    },
    zombies: def.zombies.map((s, idx) =>
      createZombieFromArchetype(s.id, s.archetype, s.x, s.y, idx)
    ),
    bullets: [],
    lootSpots: def.lootSpots.map((l) => ({
      ...l,
      searchState: l.looted ? 'searched' : 'available',
      isVisibleToPlayer: false,
      contents: { ...l.contents },
    })),
    obstacles: def.obstacles.map((o) => ({ ...o })),
    buildings: def.buildings.map((b) => ({
      ...b,
      roofColor: b.roofColor ?? 0x3b2d24,
      roofAlpha: 1.0,
      doors: b.doors ? b.doors.map((d) => ({ ...d })) : [],
      windows: b.windows ? b.windows.map((w) => ({ ...w })) : [],
    })),
    extractionZone: { ...def.extractionZone },
    runLoot: {
      comida: 0,
      medicamentos: 1, // Starts with 1 emergency field bandage
      municao: 0,
      materiais: 0,
    },
    maxCarryCapacity: DEFAULT_MAX_CARRY_CAPACITY + bonusCapacity,
    zombiesKilled: 0,
    shotsFired: 0,
    activePrompt: null,
    lastEventBanner: `${def.name}: Explore o setor, vasculhe os objetos e extraia com vida.`,
    feedbacks: [],
    extractionProcessed: false,
    activeLooting: null,
    noiseEvents: [],
    acousticCues: [],
  };

  updateBuildingRoofs(world, 1.0);
  updateWorldVisibility(world);
  world.activePrompt = findNearestInteractable(world);
  return world;
}

export function toggleFlashlight(world: ActionWorldState): boolean {
  const f = world.player.flashlight;
  if (f.battery <= 0) {
    f.enabled = false;
    world.lastEventBanner = 'Bateria descarregada! Encontre pilhas ou materiais.';
    addFloatingFeedback(world, 'Sem Bateria', world.player.x, world.player.y - 24, '#94a3b8');
    updateWorldVisibility(world);
    updateEngagedTargets(world);
    return false;
  }
  f.enabled = !f.enabled;
  world.lastEventBanner = f.enabled ? 'Lanterna ligada.' : 'Lanterna apagada.';
  updateWorldVisibility(world);
  updateEngagedTargets(world);
  return f.enabled;
}

export function startHealing(world: ActionWorldState): boolean {
  const p = world.player;
  if (world.status !== 'playing') return false;
  if (world.runLoot.medicamentos <= 0) {
    world.lastEventBanner = 'Sem medicamentos ou ataduras na mochila!';
    addFloatingFeedback(world, 'Sem Medicamentos', p.x, p.y - 24, '#ef4444');
    return false;
  }
  if (p.hp >= p.maxHp) {
    world.lastEventBanner = 'Saúde plena. Medicamento preservado.';
    addFloatingFeedback(world, 'Saúde Plena', p.x, p.y - 24, '#10b981');
    return false;
  }
  if (p.healing?.active) return false;

  const medLevel = Math.max(0, Math.round((p.maxHp - 100) / 15));
  const duration = Number(Math.max(1.4, 2.2 - medLevel * 0.32).toFixed(2));
  const healAmount = 35 + medLevel * 10;

  p.healing = {
    active: true,
    progress: 0,
    duration,
    healAmount,
  };
  world.lastEventBanner = 'Aplicando atadura de campo... Mantenha-se protegido!';
  addFloatingFeedback(world, 'Aplicando Atadura...', p.x, p.y - 24, '#10b981');
  return true;
}

export function cancelHealing(world: ActionWorldState, reason = 'Cura cancelada!'): void {
  if (world.player.healing?.active) {
    world.player.healing = null;
    addFloatingFeedback(world, reason, world.player.x, world.player.y - 28, '#ef4444');
    world.lastEventBanner = reason;
  }
}

export function emitNoise(
  world: ActionWorldState,
  x: number,
  y: number,
  radius: number,
  source: 'gunshot' | 'sprint' | 'loot' | 'melee'
): void {
  const intensity =
    source === 'gunshot' ? 1.0 : source === 'loot' ? 0.45 : source === 'sprint' ? 0.35 : 0.25;
  const duration = source === 'gunshot' ? 0.85 : 0.55;

  world.noiseEvents.push({
    id: `noise_${world.elapsedTime.toFixed(3)}_${world.noiseEvents.length}`,
    x,
    y,
    radius,
    intensity,
    duration,
    timer: duration,
    source,
  });

  // Alert all living zombies within sound propagation radius
  for (const z of world.zombies) {
    if (z.dead) continue;
    const dist = Math.hypot(z.x - x, z.y - y);
    if (dist <= radius) {
      // Direct detection: zombie turns towards sound origin and becomes immediately alerted
      z.facingAngle = Math.atan2(y - z.y, x - z.x);
      z.alertState = 'hunting';
      z.alertTimer = 6.0;
      z.targetPoint = { x, y };
    }
  }

  // Keep list bounded
  if (world.noiseEvents.length > 20) {
    world.noiseEvents.shift();
  }
}

export function createDefaultInputState(): ActionInputState {
  return {
    moveX: 0,
    moveY: 0,
    aimAngle: null,
    attackHeld: false,
    attackJustPressed: false,
    sprintHeld: false,
    dodgeJustPressed: false,
    interactJustPressed: false,
    reloadJustPressed: false,
    switchWeaponJustPressed: false,
    healJustPressed: false,
    toggleFlashlightJustPressed: false,
  };
}

export function resolveCircleRectCollision(
  cx: number,
  cy: number,
  radius: number,
  rect: ObstacleRect
): { x: number; y: number; collided: boolean } {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) {
    return { x: cx, y: cy, collided: false };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    const overlap = radius - dist;
    return {
      x: cx + (dx / dist) * overlap,
      y: cy + (dy / dist) * overlap,
      collided: true,
    };
  }

  // Center is inside the rectangle; push out along shortest axis
  const leftPen = cx - rect.x;
  const rightPen = rect.x + rect.width - cx;
  const topPen = cy - rect.y;
  const bottomPen = rect.y + rect.height - cy;
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

  if (minPen === leftPen) return { x: rect.x - radius, y: cy, collided: true };
  if (minPen === rightPen) return { x: rect.x + rect.width + radius, y: cy, collided: true };
  if (minPen === topPen) return { x: cx, y: rect.y - radius, collided: true };
  return { x: cx, y: rect.y + rect.height + radius, collided: true };
}

export function moveEntityWithCollisions(
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  dt: number,
  obstacles: ObstacleRect[],
  worldWidth: number,
  worldHeight: number
): { x: number; y: number; collided: boolean } {
  let nextX = x + vx * dt;
  let nextY = y + vy * dt;
  let anyCollision = false;

  for (const obs of obstacles) {
    const res = resolveCircleRectCollision(nextX, nextY, radius, obs);
    if (res.collided) {
      nextX = res.x;
      nextY = res.y;
      anyCollision = true;
    }
  }

  const minX = radius + 4;
  const maxX = worldWidth - radius - 4;
  const minY = radius + 4;
  const maxY = worldHeight - radius - 4;

  if (nextX < minX) {
    nextX = minX;
    anyCollision = true;
  } else if (nextX > maxX) {
    nextX = maxX;
    anyCollision = true;
  }

  if (nextY < minY) {
    nextY = minY;
    anyCollision = true;
  } else if (nextY > maxY) {
    nextY = maxY;
    anyCollision = true;
  }

  return { x: nextX, y: nextY, collided: anyCollision };
}

export function pointHitsObstacle(
  x: number,
  y: number,
  radius: number,
  obstacles: ObstacleRect[]
): boolean {
  for (const obs of obstacles) {
    if (
      x + radius > obs.x &&
      x - radius < obs.x + obs.width &&
      y + radius > obs.y &&
      y - radius < obs.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}

export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: ObstacleRect
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  const p = [-dx, dx, -dy, dy];
  const q = [
    x1 - rect.x,
    rect.x + rect.width - x1,
    y1 - rect.y,
    rect.y + rect.height - y1,
  ];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-8) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }

  return t0 <= t1 && t1 >= 0 && t0 <= 1;
}

export function isSegmentBlockedByWall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ObstacleRect[]
): boolean {
  for (const obs of obstacles) {
    if (obs.kind !== 'wall') continue;
    if (segmentIntersectsRect(x1, y1, x2, y2, obs)) {
      return true;
    }
  }
  return false;
}

export function isSegmentBlockedByObstacle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ObstacleRect[],
  ignoreObstacleId?: string
): boolean {
  for (const obs of obstacles) {
    if (ignoreObstacleId && obs.id === ignoreObstacleId) continue;
    if (segmentIntersectsRect(x1, y1, x2, y2, obs)) {
      return true;
    }
  }
  return false;
}

export function getRayObstacleDistance(
  ox: number,
  oy: number,
  angle: number,
  maxDist: number,
  obstacles: ObstacleRect[],
  wallsOnly = true
): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let bestDist = maxDist;

  for (const obs of obstacles) {
    if (wallsOnly && obs.kind !== 'wall') continue;

    let tMin = 0;
    let tMax = bestDist;

    if (Math.abs(dx) < 1e-8) {
      if (ox < obs.x || ox > obs.x + obs.width) continue;
    } else {
      const invDx = 1 / dx;
      let t1 = (obs.x - ox) * invDx;
      let t2 = (obs.x + obs.width - ox) * invDx;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (Math.abs(dy) < 1e-8) {
      if (oy < obs.y || oy > obs.y + obs.height) continue;
    } else {
      const invDy = 1 / dy;
      let t1 = (obs.y - oy) * invDy;
      let t2 = (obs.y + obs.height - oy) * invDy;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (tMin >= 0 && tMin < bestDist) {
      bestDist = tMin;
    }
  }

  return Math.max(8, bestDist);
}

export function computeVisibilityPolygon(
  ox: number,
  oy: number,
  startAngle: number,
  endAngle: number,
  maxDist: number,
  obstacles: ObstacleRect[],
  rayCount = 44,
  wallsOnly = false
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const totalSpan = endAngle - startAngle;
  const isFullCircle = Math.abs(totalSpan - Math.PI * 2) < 0.01;
  if (!isFullCircle) {
    pts.push({ x: ox, y: oy });
  }

  const steps = Math.max(8, rayCount);
  for (let i = 0; i <= steps; i++) {
    if (isFullCircle && i === steps) break;
    const angle = startAngle + (totalSpan * i) / steps;
    const hitDist = getRayObstacleDistance(ox, oy, angle, maxDist, obstacles, wallsOnly);
    pts.push({
      x: ox + Math.cos(angle) * hitDist,
      y: oy + Math.sin(angle) * hitDist,
    });
  }

  return pts;
}

export function getEffectiveVisionRanges(world: ActionWorldState): {
  closeRadius: number;
  coneRange: number;
  coneAngleRad: number;
  flashlightActive: boolean;
  flashlightRange: number;
  flashlightConeAngleRad: number;
} {
  const p = world.player;
  const isIndoor = world.isInsideBuilding;
  const closeRadius = isIndoor
    ? VISION_CONFIG.closeAwarenessRadius.indoor
    : VISION_CONFIG.closeAwarenessRadius[world.timeOfDay];
  const coneRange = isIndoor
    ? VISION_CONFIG.directConeRange.indoor
    : VISION_CONFIG.directConeRange[world.timeOfDay];

  const flashlightActive = Boolean(p.flashlight.enabled && p.flashlight.battery > 0);
  const flashlightRange = flashlightActive
    ? Math.max(p.flashlight.range, coneRange + VISION_CONFIG.flashlightBonusRange)
    : 0;

  return {
    closeRadius,
    coneRange,
    coneAngleRad: VISION_CONFIG.directConeAngleRad,
    flashlightActive,
    flashlightRange,
    flashlightConeAngleRad: p.flashlight.coneAngle,
  };
}

export function evaluatePointVisibility(
  world: ActionWorldState,
  targetX: number,
  targetY: number,
  ignoreObstacleId?: string
): VisibilityLevel {
  const p = world.player;
  const dx = targetX - p.x;
  const dy = targetY - p.y;
  const dist = Math.hypot(dx, dy);

  // 1. Check wall and solid obstacle line-of-sight occlusion
  if (isSegmentBlockedByObstacle(p.x, p.y, targetX, targetY, world.obstacles, ignoreObstacleId)) {
    return 'hidden';
  }

  // 2. If target is inside a closed building while player is outside, roof hides interior
  // unless player is right at an open doorway threshold with direct sight through the door
  const targetBuilding = world.buildings.find(
    (b) =>
      targetX > b.x + 14 &&
      targetX < b.x + b.width - 14 &&
      targetY > b.y + 14 &&
      targetY < b.y + b.height - 14
  );
  if (targetBuilding && p.isInsideBuilding !== targetBuilding.id) {
    const roofAlpha = targetBuilding.roofAlpha ?? 1.0;
    if (roofAlpha > 0.65) {
      // Allow seeing just inside an open doorway if player is standing right near the door
      const nearDoor = (targetBuilding.doors ?? []).some(
        (d) =>
          Math.hypot(p.x - (d.x + d.width * 0.5), p.y - (d.y + d.height * 0.5)) <= 95 &&
          Math.hypot(targetX - (d.x + d.width * 0.5), targetY - (d.y + d.height * 0.5)) <= 125
      );
      if (!nearDoor) {
        return 'hidden';
      }
    }
  }

  const {
    closeRadius,
    coneRange,
    coneAngleRad,
    flashlightActive,
    flashlightRange,
    flashlightConeAngleRad,
  } = getEffectiveVisionRanges(world);

  // 3. Immediate 360-degree peripheral perception right around the character
  if (dist <= closeRadius * 0.82) {
    return 'visible';
  }

  const angleToTarget = Math.atan2(dy, dx);
  const angleDiff = Math.abs(
    ((angleToTarget - p.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  );

  // 4. Directional natural vision cone
  const halfCone = coneAngleRad * 0.5;
  if (dist <= coneRange && angleDiff <= halfCone) {
    return 'visible';
  }

  // 5. Directional tactical flashlight beam (significantly extends visibility in pointed direction)
  if (flashlightActive) {
    const halfFlash = flashlightConeAngleRad * 0.5;
    if (dist <= flashlightRange && angleDiff <= halfFlash) {
      return 'visible';
    }
    if (
      dist <= flashlightRange + VISION_CONFIG.penumbraRangePadding &&
      angleDiff <= halfFlash + VISION_CONFIG.penumbraConePaddingRad * 0.5
    ) {
      return 'penumbra';
    }
  }

  // 6. Penumbra transition zone (peripheral edge & distance falloff)
  if (dist <= closeRadius + 22) {
    return 'penumbra';
  }
  if (
    dist <= coneRange + VISION_CONFIG.penumbraRangePadding &&
    angleDiff <= halfCone + VISION_CONFIG.penumbraConePaddingRad * 0.5
  ) {
    return 'penumbra';
  }

  return 'hidden';
}

export function updateWorldVisibility(world: ActionWorldState, dt = 0.016): void {
  const p = world.player;
  if (!world.acousticCues) {
    world.acousticCues = [];
  }

  // Update loot spot visibility
  for (const spot of world.lootSpots) {
    const vis = evaluatePointVisibility(world, spot.x, spot.y, spot.obstacleId);
    spot.isVisibleToPlayer = vis !== 'hidden';
  }

  // Update zombie visibility & generate discrete acoustic cues for unseen noisy threats
  const nextCues: AcousticCue[] = [];
  for (const z of world.zombies) {
    if (z.dead) {
      z.visibility = 'hidden';
      z.visibilityState = 'hidden';
      z.isVisibleToPlayer = false;
      continue;
    }
    const vis = evaluatePointVisibility(world, z.x, z.y);
    z.visibility = vis;
    z.visibilityState = vis;
    z.isVisibleToPlayer = vis !== 'hidden';

    const dx = z.x - p.x;
    const dy = z.y - p.y;
    const dist = Math.hypot(dx, dy);
    const zSpeed = Math.hypot(z.vx, z.vy);
    const isMakingSound = z.isWindingUp || z.alertState === 'hunting' || zSpeed > 6;

    if (vis === 'hidden' && isMakingSound && dist <= VISION_CONFIG.acousticDetectionRange) {
      z.lastHeardTimer = 0.6;
      const angle = Math.atan2(dy, dx);
      // Quantize direction and distance band so sound indicates approximate direction/distance, not exact position
      const quantizedAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
      const distanceBand = dist < 125 ? 'perto' : dist < 230 ? 'medio' : 'longe';
      const approxDist = distanceBand === 'perto' ? 90 : distanceBand === 'medio' ? 175 : 265;
      nextCues.push({
        id: `cue_${z.id}`,
        angle: quantizedAngle,
        angleRad: quantizedAngle,
        distanceBand,
        approxX: Math.round(p.x + Math.cos(quantizedAngle) * approxDist),
        approxY: Math.round(p.y + Math.sin(quantizedAngle) * approxDist),
        intensity: z.isWindingUp
          ? 1.0
          : Math.max(0.28, Math.min(0.9, 1 - dist / VISION_CONFIG.acousticDetectionRange)),
        ttl: 0.45,
        source: z.isWindingUp ? 'zombie_attack' : 'zombie_step',
      });
    } else if (z.lastHeardTimer && z.lastHeardTimer > 0) {
      z.lastHeardTimer = Math.max(0, z.lastHeardTimer - dt);
    }
  }

  world.acousticCues = nextCues;
}

function addFloatingFeedback(
  world: ActionWorldState,
  text: string,
  x: number,
  y: number,
  color = '#f5f0e6'
): void {
  world.feedbacks.push({
    id: `fb_${world.elapsedTime.toFixed(3)}_${world.feedbacks.length}`,
    text,
    x,
    y,
    color,
    ttl: 0.9,
  });
  if (world.feedbacks.length > 18) {
    world.feedbacks.shift();
  }
}

export function startReload(world: ActionWorldState): boolean {
  const p = world.player;
  if (p.reloadTimer > 0) return false;
  if (p.ammoInClip >= p.clipSize) return false;
  if (p.ammoReserve <= 0) {
    world.lastEventBanner = 'Sem munição de reserva! Troque para o Facão [Q] ou reviste objetos.';
    return false;
  }

  p.reloadTimer = p.reloadDuration;
  world.lastEventBanner = 'Recarregando pistola 9mm...';
  return true;
}

export function finishReloadIfReady(world: ActionWorldState, dt: number): boolean {
  const p = world.player;
  if (p.reloadTimer <= 0) return false;

  p.reloadTimer = Math.max(0, p.reloadTimer - dt);
  if (p.reloadTimer === 0) {
    const needed = p.clipSize - p.ammoInClip;
    const toLoad = Math.min(needed, p.ammoReserve);
    p.ammoInClip += toLoad;
    p.ammoReserve -= toLoad;
    world.lastEventBanner = `Arma recarregada (${p.ammoInClip}/${p.clipSize}).`;
    return true;
  }
  return false;
}

export function getCurrentAimConeAngle(world: ActionWorldState): number {
  const p = world.player;
  if (p.equippedWeapon === 'facao') {
    return WEAPON_CONFIG.facao.coneAngleRad;
  }
  return p.aimSpreadRad ?? WEAPON_CONFIG.pistola.minConeAngleRad;
}

export function updateEngagedTargets(world: ActionWorldState): void {
  const p = world.player;
  const isMachete = p.equippedWeapon === 'facao';
  const maxRange = isMachete ? WEAPON_CONFIG.facao.reach : WEAPON_CONFIG.pistola.sightRange;
  const coneAngle = getCurrentAimConeAngle(world);
  const halfCone = coneAngle * 0.5;

  const engagedIds: string[] = [];
  let bestTargetId: string | null = null;
  let bestScore = Infinity;

  for (const z of world.zombies) {
    if (z.dead) continue;
    const dx = z.x - p.x;
    const dy = z.y - p.y;
    const dist = Math.hypot(dx, dy);
    const edgeDist = Math.max(0, dist - z.radius);
    if (edgeDist > maxRange) continue;

    const angleToZombie = Math.atan2(dy, dx);
    const angleDiff = Math.abs(
      ((angleToZombie - p.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    );
    const bodyAngularAllowance = Math.atan2(z.radius * 0.75, Math.max(20, dist));
    if (angleDiff > halfCone + bodyAngularAllowance) continue;

    if (isSegmentBlockedByObstacle(p.x, p.y, z.x, z.y, world.obstacles)) continue;

    // Only highlight/engage targets that are within the player's tactical visibility
    const vis = evaluatePointVisibility(world, z.x, z.y);
    z.visibility = vis;
    if (vis === 'hidden') continue;

    engagedIds.push(z.id);
    const score = edgeDist + angleDiff * 40;
    if (score < bestScore) {
      bestScore = score;
      bestTargetId = z.id;
    }
  }

  p.engagedTargetIds = engagedIds;
  p.engagedTargetId = bestTargetId;
}

export function performAttack(world: ActionWorldState): {
  type: 'shot' | 'melee' | 'empty' | 'cooldown';
  hits: number;
} {
  const p = world.player;
  if (p.attackCooldown > 0 || p.reloadTimer > 0) {
    return { type: 'cooldown', hits: 0 };
  }

  if (p.equippedWeapon === 'pistola') {
    if (p.ammoInClip <= 0) {
      // Reload using the fire button: if empty, touching/pressing fire initiates reload immediately
      if (p.ammoReserve > 0) {
        startReload(world);
      } else {
        // Auto-fallback to melee swing when completely out of ammo so player is never helpless
        return performMeleeSwing(world);
      }
      return { type: 'empty', hits: 0 };
    }

    p.ammoInClip -= 1;
    p.attackCooldown = WEAPON_CONFIG.pistola.cooldown;
    world.shotsFired += 1;

    const cfg = WEAPON_CONFIG.pistola;
    const currentSpread = Math.max(
      cfg.minConeAngleRad,
      Math.min(cfg.maxConeAngleRad, p.aimSpreadRad ?? cfg.minConeAngleRad)
    );
    const focusRatio = Math.max(
      0,
      Math.min(
        1,
        (currentSpread - cfg.minConeAngleRad) /
          Math.max(0.001, cfg.maxConeAngleRad - cfg.minConeAngleRad)
      )
    );

    // Deterministic quasi-random dispersion within [-currentSpread/2, +currentSpread/2]
    // Tight precision when focused/stationary; wider dispersion when moving with open cone
    const spreadPattern = [0.22, -0.34, 0.42, -0.26, 0.37, -0.44, 0.16, -0.31];
    const baseFactor = spreadPattern[(world.shotsFired - 1) % spreadPattern.length];
    const effectiveFactor = baseFactor * (0.25 + 0.75 * focusRatio);
    const shotSpreadOffsetRad = effectiveFactor * currentSpread;
    const shotAngle = p.facingAngle + shotSpreadOffsetRad;

    // Apply subtle recoil bloom to the cone after firing
    p.aimSpreadRad = Math.min(cfg.maxConeAngleRad, currentSpread + cfg.shotBloomRad * 0.5);

    const bulletSpeed = cfg.bulletSpeed;
    const muzzleDist = p.radius + 8;
    const bx = p.x + Math.cos(p.facingAngle) * muzzleDist;
    const by = p.y + Math.sin(p.facingAngle) * muzzleDist;

    const bullet: BulletEntity = {
      id: `b_${world.shotsFired}_${world.elapsedTime.toFixed(2)}`,
      x: bx,
      y: by,
      vx: Math.cos(shotAngle) * bulletSpeed,
      vy: Math.sin(shotAngle) * bulletSpeed,
      radius: 4,
      damage: cfg.damage,
      lifeTimer: 0.95,
      active: true,
      shotSpreadOffsetRad,
    };

    world.bullets.push(bullet);
    world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.15);

    // Gunshot emits high-radius acoustic impulse (480px) attracting zombies
    emitNoise(world, p.x, p.y, cfg.noiseRadius, 'gunshot');

    // If clip became 0 after this shot, trigger reload immediately
    if (p.ammoInClip === 0 && p.ammoReserve > 0) {
      startReload(world);
    }

    return { type: 'shot', hits: 0 };
  }

  return performMeleeSwing(world);
}

export function performMeleeSwing(world: ActionWorldState): {
  type: 'melee';
  hits: number;
} {
  const p = world.player;
  const cfg = WEAPON_CONFIG.facao;
  p.attackCooldown = cfg.cooldown;
  p.meleeSwingTimer = cfg.swingDuration;

  // Machete emits low-radius melee noise (95px vs pistol 480px)
  emitNoise(world, p.x, p.y, cfg.noiseRadius, 'melee');

  const halfCone = cfg.coneAngleRad * 0.5;

  let bestTarget: ZombieEntity | null = null;
  let bestAngleToTarget = 0;
  let bestScore = Infinity;

  for (const z of world.zombies) {
    if (z.dead) continue;
    const dx = z.x - p.x;
    const dy = z.y - p.y;
    const dist = Math.hypot(dx, dy);

    // Target edge must be within the machete reach
    const edgeDist = Math.max(0, dist - z.radius);
    if (edgeDist > cfg.reach) continue;

    const angleToZombie = Math.atan2(dy, dx);
    const angleDiff = Math.abs(
      ((angleToZombie - p.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    );

    // Angular subtended allowance for the target's body radius
    const bodyAngularAllowance = Math.atan2(z.radius * 0.75, Math.max(20, dist));
    if (angleDiff > halfCone + bodyAngularAllowance) continue;

    // Wall & solid obstacle obstruction check: cannot slash through walls, vehicles, or furniture
    if (isSegmentBlockedByObstacle(p.x, p.y, z.x, z.y, world.obstacles)) continue;

    // Prioritize closest and best-aligned target within the valid cone (max 1 hit per swing)
    const score = edgeDist + angleDiff * 35;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = z;
      bestAngleToTarget = angleToZombie;
    }
  }

  let hits = 0;
  if (bestTarget) {
    hits = 1;
    damageZombie(
      world,
      bestTarget,
      cfg.damage,
      Math.cos(bestAngleToTarget),
      Math.sin(bestAngleToTarget),
      cfg.knockback
    );
    world.hitstopTimer = 0.04;
    world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.22);
  }

  return { type: 'melee', hits };
}

export function damageZombie(
  world: ActionWorldState,
  z: ZombieEntity,
  amount: number,
  dirX: number,
  dirY: number,
  knockbackForce: number
): void {
  if (z.dead) return;
  z.hp = Math.max(0, z.hp - amount);
  z.hitFlashTimer = 0.12;

  const kbScale = z.archetype === 'bruto' ? 0.35 : 1.0;
  z.knockbackVx = dirX * knockbackForce * kbScale;
  z.knockbackVy = dirY * knockbackForce * kbScale;

  addFloatingFeedback(world, `-${amount}`, z.x, z.y - z.radius, '#f59e0b');

  if (z.hp <= 0) {
    z.dead = true;
    z.deathTimer = 0.35;
    world.zombiesKilled += 1;
    world.hitstopTimer = Math.max(world.hitstopTimer, 0.045);
    addFloatingFeedback(world, 'Abatido!', z.x, z.y - z.radius - 12, '#ef4444');
  }
}

export function applyDamageToPlayer(
  world: ActionWorldState,
  amount: number,
  attackerName: string
): boolean {
  const p = world.player;
  if (world.status !== 'playing') return false;
  if (p.invulnTimer > 0 || p.dodgeTimer > 0) return false;

  const actualDamage = Math.max(1, Math.floor(amount));
  p.hp = Math.max(0, p.hp - actualDamage);
  p.invulnTimer = 0.65;
  p.hurtFlashTimer = 0.22;
  world.hitstopTimer = 0.05;
  world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.45);

  // Cancel any active healing canalization or looting
  if (p.healing?.active) {
    cancelHealing(world, 'Atingido! Aplicação de atadura cancelada!');
  }
  if (world.activeLooting) {
    const activeSpot = world.lootSpots.find((s) => s.id === world.activeLooting?.spotId);
    if (activeSpot && !activeSpot.looted) {
      activeSpot.searchState = 'available';
    }
    world.activeLooting = null;
    addFloatingFeedback(world, 'Busca interrompida!', p.x, p.y - 32, '#ef4444');
  }

  addFloatingFeedback(world, `-${actualDamage} PV`, p.x, p.y - 24, '#ef4444');
  world.lastEventBanner = `Atingido por ${attackerName} (-${actualDamage} PV)!`;

  if (p.hp <= 0) {
    p.hp = 0;
    world.status = 'dead';
    world.lastEventBanner = 'Você tombou em combate. O saque não extraído foi perdido.';
  }

  return true;
}

export function useFieldMedkit(world: ActionWorldState): boolean {
  const p = world.player;
  if (world.status !== 'playing' || p.hp <= 0) return false;
  if (p.hp >= p.maxHp) {
    world.lastEventBanner = 'Saúde já está no máximo (100 PV).';
    return false;
  }
  if (world.runLoot.medicamentos <= 0) {
    world.lastEventBanner = 'Sem Medicamentos na mochila para curar.';
    return false;
  }

  world.runLoot.medicamentos -= 1;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + 40);
  const healed = p.hp - before;

  addFloatingFeedback(world, `+${healed} PV`, p.x, p.y - 24, '#10b981');
  world.lastEventBanner = `Curativo aplicado (+${healed} PV).`;
  return true;
}

function getDefaultVerbForContainer(containerType: string): string {
  switch (containerType) {
    case 'porta_malas':
      return 'Abrir porta-malas';
    case 'porta_luvas':
      return 'Vasculhar porta-luvas';
    case 'armario':
      return 'Buscar armário';
    case 'gaveta':
      return 'Revistar gaveta';
    case 'geladeira':
      return 'Abrir geladeira';
    case 'gondola':
      return 'Vasculhar prateleira';
    case 'bancada':
      return 'Verificar bancada';
    case 'maca':
      return 'Examinar maca';
    case 'cofre':
      return 'Destrancar cofre';
    default:
      return 'Vasculhar objeto';
  }
}

export function collectFromLootSpot(
  world: ActionWorldState,
  spotId: string
): { collected: boolean; full: boolean; summary: string } {
  const spot = world.lootSpots.find((s) => s.id === spotId);
  if (!spot || spot.looted) {
    return { collected: false, full: false, summary: '' };
  }

  const maxCap = world.maxCarryCapacity ?? DEFAULT_MAX_CARRY_CAPACITY;
  let remSlots = Math.max(0, maxCap - getCarryLoad(world.runLoot));

  const parts: string[] = [];

  // 1. Collect physical supplies up to remaining backpack capacity (never silently discard)
  const takeSupply = (key: 'comida' | 'medicamentos' | 'materiais', label: string) => {
    const avail = spot.contents[key] ?? 0;
    if (avail <= 0) return;
    const toTake = Math.min(avail, remSlots);
    if (toTake > 0) {
      world.runLoot[key] += toTake;
      spot.contents[key] = avail - toTake;
      remSlots -= toTake;
      parts.push(`+${toTake} ${label}`);
    }
  };

  takeSupply('comida', 'Comida');
  takeSupply('medicamentos', 'Remédios');
  takeSupply('materiais', 'Materiais');

  // 2. Collect ammunition if there was room for at least part of the search or if only ammo is inside
  const availAmmo = spot.contents.municao ?? 0;
  const remainingSupplies =
    (spot.contents.comida ?? 0) +
    (spot.contents.medicamentos ?? 0) +
    (spot.contents.materiais ?? 0);

  if (availAmmo > 0 && (parts.length > 0 || remainingSupplies === 0)) {
    world.runLoot.municao += availAmmo;
    world.player.ammoReserve += availAmmo;
    spot.contents.municao = 0;
    parts.push(`+${availAmmo} Munição`);
  }

  const stillLeft =
    (spot.contents.comida ?? 0) +
    (spot.contents.medicamentos ?? 0) +
    (spot.contents.materiais ?? 0) +
    (spot.contents.municao ?? 0);

  if (parts.length === 0 && stillLeft > 0) {
    spot.looted = false;
    spot.searchState = 'available';
    const msg = 'Mochila cheia! Extraia no abrigo antes de coletar mais suprimentos.';
    world.lastEventBanner = msg;
    addFloatingFeedback(world, 'Mochila Cheia!', spot.x, spot.y - 18, '#f59e0b');
    return { collected: false, full: true, summary: msg };
  }

  if (stillLeft > 0) {
    // Partial collection: remaining items stay inside the object without silent loss
    spot.looted = false;
    spot.searchState = 'available';
    const summary = `${spot.label}: ${parts.join(', ')} (Mochila cheia — restante preservado)`;
    world.lastEventBanner = summary;
    addFloatingFeedback(world, `${parts.join(' ')} (Mochila Cheia)`, spot.x, spot.y - 18, '#f59e0b');
    return { collected: true, full: true, summary };
  }

  spot.looted = true;
  spot.searchState = 'searched';
  const summary = `${spot.label}: ${parts.join(', ')}`;
  world.lastEventBanner = `Coletado — ${summary}`;
  addFloatingFeedback(world, parts.join(' '), spot.x, spot.y - 18, '#10b981');
  return { collected: true, full: false, summary };
}

export function findNearestInteractable(world: ActionWorldState): InteractPrompt | null {
  const p = world.player;

  // 1. Check unlooted contextual objects within interaction range & not blocked by a wall
  let closestLoot: InteractPrompt | null = null;
  let minDist = Infinity;

  for (const spot of world.lootSpots) {
    if (spot.looted) continue;
    const dist = Math.hypot(spot.x - p.x, spot.y - p.y);
    if (dist <= spot.radius + p.radius + 26 && dist < minDist) {
      if (isSegmentBlockedByWall(p.x, p.y, spot.x, spot.y, world.obstacles)) {
        continue;
      }
      minDist = dist;
      const verb = spot.actionVerb ?? getDefaultVerbForContainer(spot.containerType);
      closestLoot = {
        targetType: 'loot',
        id: spot.id,
        label: `${verb} — ${spot.label}`,
        actionVerb: verb,
        containerType: spot.containerType,
        x: spot.x,
        y: spot.y,
      };
    }
  }

  if (closestLoot) return closestLoot;

  // 2. Check Extraction Zone
  const ext = world.extractionZone;
  const distToExt = Math.hypot(ext.x - p.x, ext.y - p.y);
  if (distToExt <= ext.radius + p.radius + 16) {
    return {
      targetType: 'extraction',
      id: ext.id,
      label: 'Extrair no Portão do Abrigo (Concluir Incursão)',
      actionVerb: 'Extrair no Abrigo',
      x: ext.x,
      y: ext.y,
    };
  }

  return null;
}

export function findInteractableAtWorldPoint(
  world: ActionWorldState,
  worldX: number,
  worldY: number
): InteractPrompt | null {
  const p = world.player;

  // 1. Check unlooted contextual objects (including linked car/furniture obstacle bounds)
  for (const spot of world.lootSpots) {
    if (spot.looted) continue;

    // Player must be within interaction proximity and not blocked by a wall
    const distPlayerToSpot = Math.hypot(spot.x - p.x, spot.y - p.y);
    if (distPlayerToSpot > spot.radius + p.radius + 32) continue;
    if (isSegmentBlockedByWall(p.x, p.y, spot.x, spot.y, world.obstacles)) continue;

    const distTouchToSpot = Math.hypot(worldX - spot.x, worldY - spot.y);
    let hitObject = distTouchToSpot <= spot.radius + 38;

    // Also allow tapping anywhere on the linked vehicle or furniture obstacle body
    if (!hitObject && spot.obstacleId) {
      const obs = world.obstacles.find((o) => o.id === spot.obstacleId);
      if (
        obs &&
        worldX >= obs.x - 20 &&
        worldX <= obs.x + obs.width + 20 &&
        worldY >= obs.y - 20 &&
        worldY <= obs.y + obs.height + 20
      ) {
        hitObject = true;
      }
    }

    if (hitObject) {
      const verb = spot.actionVerb ?? getDefaultVerbForContainer(spot.containerType);
      return {
        targetType: 'loot',
        id: spot.id,
        label: `${verb} — ${spot.label}`,
        actionVerb: verb,
        containerType: spot.containerType,
        x: spot.x,
        y: spot.y,
      };
    }
  }

  // 2. Check Extraction Zone
  const ext = world.extractionZone;
  const distPlayerToExt = Math.hypot(ext.x - p.x, ext.y - p.y);
  const distTouchToExt = Math.hypot(worldX - ext.x, worldY - ext.y);
  if (
    distTouchToExt <= ext.radius + 28 &&
    distPlayerToExt <= ext.radius + p.radius + 20
  ) {
    return {
      targetType: 'extraction',
      id: ext.id,
      label: 'Extrair no Portão do Abrigo (Concluir Incursão)',
      actionVerb: 'Extrair no Abrigo',
      x: ext.x,
      y: ext.y,
    };
  }

  return null;
}

export function tryDirectObjectInteractAtWorldPoint(
  world: ActionWorldState,
  worldX: number,
  worldY: number
): { consumed: boolean; targetType?: 'loot' | 'extraction'; id?: string } {
  if (world.status !== 'playing') return { consumed: false };
  const hit = findInteractableAtWorldPoint(world, worldX, worldY);
  if (!hit) return { consumed: false };

  triggerInteract(world);
  return {
    consumed: true,
    targetType: hit.targetType,
    id: hit.id,
  };
}

export function updateBuildingRoofs(world: ActionWorldState, dt: number): void {
  const p = world.player;
  const currentBuilding = world.buildings.find(
    (b) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
  );

  if (currentBuilding) {
    world.isInsideBuilding = true;
    world.currentBuildingName = currentBuilding.name;
    p.isInsideBuilding = currentBuilding.id;
    p.currentBuildingName = currentBuilding.name;
    world.ambientDarkness = Math.max(world.ambientDarkness, 0.36);
  } else {
    world.isInsideBuilding = false;
    world.currentBuildingName = null;
    p.isInsideBuilding = null;
    p.currentBuildingName = null;
  }

  // Smoothly interpolate roofAlpha for each building:
  // 1.0 when player is outside (roof visible, hiding interior) -> 0.0 when player enters through doorway
  const transitionStep = Math.min(1, Math.max(0.01, dt) * 5.0);
  for (const bld of world.buildings) {
    const isPlayerInsideThis = currentBuilding?.id === bld.id;
    const targetAlpha = isPlayerInsideThis ? 0.0 : 1.0;
    const currentAlpha = bld.roofAlpha ?? 1.0;
    if (Math.abs(targetAlpha - currentAlpha) <= transitionStep) {
      bld.roofAlpha = targetAlpha;
    } else if (targetAlpha < currentAlpha) {
      bld.roofAlpha = Math.max(0, Number((currentAlpha - transitionStep).toFixed(4)));
    } else {
      bld.roofAlpha = Math.min(1, Number((currentAlpha + transitionStep).toFixed(4)));
    }
  }
}

export function triggerInteract(world: ActionWorldState): {
  interacted: boolean;
  action?: 'looted' | 'extracted' | 'inventory_full';
  summary?: string;
} {
  if (world.status !== 'playing') return { interacted: false };

  const prompt = findNearestInteractable(world);
  if (!prompt) {
    world.lastEventBanner = 'Aproxime-se de um veículo, armário, gaveta ou do Portão de Extração.';
    return { interacted: false };
  }

  if (prompt.targetType === 'loot') {
    const res = collectFromLootSpot(world, prompt.id);
    world.activeLooting = null;
    world.activePrompt = findNearestInteractable(world);
    if (!res.collected) {
      return {
        interacted: false,
        action: res.full ? 'inventory_full' : undefined,
        summary: res.summary,
      };
    }
    return { interacted: true, action: 'looted', summary: res.summary };
  }

  if (prompt.targetType === 'extraction') {
    world.status = 'extracted';
    world.lastEventBanner = 'Extração concluída com sucesso! Suprimentos salvos no abrigo.';
    return {
      interacted: true,
      action: 'extracted',
      summary: 'Extração concluída!',
    };
  }

  return { interacted: false };
}

export function stepWorld(
  world: ActionWorldState,
  input: ActionInputState,
  rawDt: number
): ActionWorldState {
  if (world.status !== 'playing') return world;

  // Clamp dt to <= 0.05s per ultra-mode simulation rules so frame hiccups never tunnel entities
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  world.elapsedTime += dt;

  // Decay camera shake and floating feedbacks in real dt
  world.cameraShakeTrauma = Math.max(0, world.cameraShakeTrauma - dt * 1.8);
  for (let i = world.feedbacks.length - 1; i >= 0; i--) {
    world.feedbacks[i].ttl -= dt;
    world.feedbacks[i].y -= dt * 22;
    if (world.feedbacks[i].ttl <= 0) {
      world.feedbacks.splice(i, 1);
    }
  }

  const p = world.player;

  // Timers
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.hurtFlashTimer = Math.max(0, p.hurtFlashTimer - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.meleeSwingTimer = Math.max(0, p.meleeSwingTimer - dt);
  p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
  p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);

  finishReloadIfReady(world, dt);

  // One-shot player inputs (processed immediately so buffers are never dropped)
  if (input.switchWeaponJustPressed) {
    p.equippedWeapon = p.equippedWeapon === 'pistola' ? 'facao' : 'pistola';
    p.reloadTimer = 0;
    p.meleeSwingTimer = 0;
    world.lastEventBanner =
      p.equippedWeapon === 'pistola'
        ? 'Equipada: Pistola Tática 9mm'
        : 'Equipado: Facão Tático (Cone de Golpe Curto)';
  }

  if (input.reloadJustPressed && p.equippedWeapon === 'pistola') {
    startReload(world);
  }

  if (input.toggleFlashlightJustPressed) {
    toggleFlashlight(world);
  }

  if (input.healJustPressed) {
    startHealing(world);
  }

  if (input.interactJustPressed) {
    triggerInteract(world);
    if (world.status !== 'playing') return world;
  }

  // Hitstop freeze pauses physical simulation physics on heavy hits
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return world;
  }

  // --- Day / Night Cycle & Balanced Lighting Clock ---
  const prevClock = world.dayNightClock;
  world.dayNightClock = (world.dayNightClock + dt) % 180;
  // Only overwrite ambientDarkness when transitioning or if within normal cycle bounds
  if (Math.floor(prevClock / 45) !== Math.floor(world.dayNightClock / 45)) {
    if (world.dayNightClock < 45) {
      world.timeOfDay = 'dia';
      world.ambientDarkness = 0.12;
    } else if (world.dayNightClock < 90) {
      world.timeOfDay = 'entardecer';
      world.ambientDarkness = 0.26;
    } else if (world.dayNightClock < 150) {
      world.timeOfDay = 'noite';
      world.ambientDarkness = 0.48;
    } else {
      world.timeOfDay = 'madrugada';
      world.ambientDarkness = 0.38;
    }
  }

  // --- Flashlight Battery Drain ---
  if (p.flashlight.enabled) {
    p.flashlight.battery = Math.max(0, p.flashlight.battery - p.flashlight.drainRate * dt);
    if (p.flashlight.battery <= 0) {
      p.flashlight.enabled = false;
      world.lastEventBanner = 'A bateria da lanterna apagou!';
      addFloatingFeedback(world, 'Bateria Esgotada', p.x, p.y - 28, '#94a3b8');
    }
  }

  // --- Field Bandage / Medical Healing Canalization ---
  if (p.healing?.active) {
    p.healing.progress += dt;
    if (p.healing.progress >= p.healing.duration) {
      world.runLoot.medicamentos = Math.max(0, world.runLoot.medicamentos - 1);
      const beforeHp = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + p.healing.healAmount);
      const gained = Math.round(p.hp - beforeHp);
      p.healing = null;
      addFloatingFeedback(world, `+${gained} PV Curado`, p.x, p.y - 28, '#10b981');
      world.lastEventBanner = `Atadura aplicada com sucesso (+${gained} PV)!`;
    }
  }

  // Movement & Dodge / Sprint
  const moveMag = Math.hypot(input.moveX, input.moveY);
  const normX = moveMag > 0.01 ? input.moveX / Math.max(1, moveMag) : 0;
  const normY = moveMag > 0.01 ? input.moveY / Math.max(1, moveMag) : 0;

  if (input.dodgeJustPressed && p.dodgeCooldown <= 0 && p.stamina >= 25) {
    p.stamina = Math.max(0, p.stamina - 25);
    p.dodgeTimer = 0.22;
    p.dodgeCooldown = 0.75;
    p.invulnTimer = Math.max(p.invulnTimer, 0.24);
    const dodgeAngle =
      moveMag > 0.05 ? Math.atan2(normY, normX) : p.facingAngle;
    p.vx = Math.cos(dodgeAngle) * 390;
    p.vy = Math.sin(dodgeAngle) * 390;
    if (p.healing?.active) {
      cancelHealing(world, 'Esquiva interrompeu o curativo!');
    }
  } else if (p.dodgeTimer <= 0) {
    if (moveMag <= 0.05) {
      // Immediate stop when joystick/keys are released so character never drifts
      p.vx = 0;
      p.vy = 0;
      p.sprinting = false;
      p.stamina = Math.min(p.maxStamina, p.stamina + 18 * dt);
    } else {
      const wantsSprint = input.sprintHeld && moveMag > 0.1 && p.stamina > 4;
      p.sprinting = wantsSprint;

      if (wantsSprint) {
        p.stamina = Math.max(0, p.stamina - 26 * dt);
      } else {
        p.stamina = Math.min(p.maxStamina, p.stamina + 18 * dt);
      }

      const baseSpeed = 185;
      // When actively bandaging wounds, speed is reduced to cautious crawl
      const healingSpeedMod = p.healing?.active ? 0.38 : 1.0;
      const speedMultiplier = (wantsSprint ? 1.42 : 1.0) * healingSpeedMod;
      const targetVx = normX * baseSpeed * speedMultiplier;
      const targetVy = normY * baseSpeed * speedMultiplier;
      const blend = Math.min(1, dt * 18);
      p.vx += (targetVx - p.vx) * blend;
      p.vy += (targetVy - p.vy) * blend;
    }
  }

  // Sprinting emits footsteps noise (160px radius) every 0.35s
  if (p.sprinting && (Math.abs(p.vx) > 30 || Math.abs(p.vy) > 30)) {
    if (Math.floor(world.elapsedTime / 0.35) !== Math.floor((world.elapsedTime - dt) / 0.35)) {
      emitNoise(world, p.x, p.y, 160, 'sprint');
    }
  }

  // Decay active noise events
  for (let i = world.noiseEvents.length - 1; i >= 0; i--) {
    const ne = world.noiseEvents[i];
    ne.timer -= dt;
    if (ne.timer <= 0) {
      world.noiseEvents.splice(i, 1);
    }
  }

  // Facing direction: explicit aimAngle takes priority, otherwise movement direction (NO auto-aim snap to zombies)
  const prevFacingAngle = p.facingAngle;
  if (input.aimAngle !== null && Number.isFinite(input.aimAngle)) {
    p.facingAngle = input.aimAngle;
  } else if (moveMag > 0.1) {
    p.facingAngle = Math.atan2(normY, normX);
  }
  const aimTurnDelta = Math.abs(
    ((p.facingAngle - prevFacingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  );

  // --- Bullet Echo Dynamic Aim Funnel / Cone Spread ---
  const pistolCfg = WEAPON_CONFIG.pistola;
  const playerSpeed = Math.hypot(p.vx, p.vy);
  const currentSpread = p.aimSpreadRad ?? pistolCfg.minConeAngleRad;
  let targetSpread = pistolCfg.minConeAngleRad;

  if (playerSpeed > 15 || p.dodgeTimer > 0) {
    const speedRatio = Math.min(1, playerSpeed / 185);
    targetSpread = p.sprinting
      ? pistolCfg.maxConeAngleRad
      : pistolCfg.minConeAngleRad +
        (pistolCfg.moveConeAngleRad - pistolCfg.minConeAngleRad) * speedRatio;
  }
  if (dt > 0 && aimTurnDelta / dt > 2.2) {
    targetSpread = Math.min(
      pistolCfg.maxConeAngleRad,
      targetSpread + Math.min(0.22, aimTurnDelta * 0.45)
    );
  }

  if (targetSpread > currentSpread) {
    const stepUp = Math.max(
      (targetSpread - currentSpread) * Math.min(1, dt * pistolCfg.widenSpeed),
      dt * 0.18
    );
    p.aimSpreadRad = Math.min(pistolCfg.maxConeAngleRad, Math.min(targetSpread, currentSpread + stepUp));
  } else {
    const stepDown = Math.max(
      (currentSpread - targetSpread) * Math.min(1, dt * pistolCfg.focusSpeed),
      dt * 0.14
    );
    p.aimSpreadRad = Math.max(pistolCfg.minConeAngleRad, Math.max(targetSpread, currentSpread - stepDown));
  }

  // Move player with solid wall/obstacle collisions
  const movedPlayer = moveEntityWithCollisions(
    p.x,
    p.y,
    p.vx,
    p.vy,
    p.radius,
    dt,
    world.obstacles,
    world.worldWidth,
    world.worldHeight
  );
  p.x = movedPlayer.x;
  p.y = movedPlayer.y;

  // --- Building Roof & Interior Transition (tracks player's real position after movement) ---
  updateBuildingRoofs(world, dt);

  // Contextual Proximity Looting with Object-Specific Duration, Wall Check & Capacity Check:
  const nearestLoot = world.lootSpots.find(
    (s) =>
      !s.looted &&
      Math.hypot(s.x - p.x, s.y - p.y) <= s.radius + p.radius + 26 &&
      !isSegmentBlockedByWall(p.x, p.y, s.x, s.y, world.obstacles)
  );

  if (nearestLoot) {
    const maxCap = world.maxCarryCapacity ?? DEFAULT_MAX_CARRY_CAPACITY;
    const isFullForSpot =
      getCarryLoad(world.runLoot) >= maxCap && (nearestLoot.contents.municao ?? 0) <= 0;

    if (isFullForSpot) {
      world.activeLooting = null;
      nearestLoot.searchState = 'available';
      world.lastEventBanner = 'Mochila cheia! Extraia no abrigo antes de coletar mais suprimentos.';
    } else {
      const duration = nearestLoot.searchDuration || 1.0;
      if (!world.activeLooting || world.activeLooting.spotId !== nearestLoot.id) {
        world.activeLooting = {
          spotId: nearestLoot.id,
          progress: 0,
          duration,
        };
        nearestLoot.searchState = 'searching';
        // Opening compartment / rustling sound
        emitNoise(world, nearestLoot.x, nearestLoot.y, 90, 'loot');
      } else {
        const prevProg = world.activeLooting.progress;
        world.activeLooting.progress += dt;
        nearestLoot.searchState = 'searching';

        // Diegetic container noise at midpoint if container squeaks
        if (
          nearestLoot.noiseOnSearch &&
          prevProg < duration * 0.5 &&
          world.activeLooting.progress >= duration * 0.5
        ) {
          emitNoise(world, nearestLoot.x, nearestLoot.y, 130, 'loot');
        }

        if (world.activeLooting.progress >= world.activeLooting.duration) {
          collectFromLootSpot(world, nearestLoot.id);
          world.activeLooting = null;
        }
      }
    }
  } else {
    if (world.activeLooting) {
      const prevSpot = world.lootSpots.find((s) => s.id === world.activeLooting?.spotId);
      if (prevSpot && !prevSpot.looted) {
        prevSpot.searchState = 'available';
      }
    }
    world.activeLooting = null;
  }

  // Update visibility & Bullet Echo target engagement before attack
  updateWorldVisibility(world, dt);
  updateEngagedTargets(world);

  // Attack handling (supports attacking while moving)
  if (input.attackJustPressed || input.attackHeld) {
    if (p.healing?.active) {
      cancelHealing(world, 'Ataque interrompeu o curativo!');
    }
    performAttack(world);
  }

  // Step Bullets
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    if (!b.active) {
      world.bullets.splice(i, 1);
      continue;
    }

    b.lifeTimer -= dt;
    if (b.lifeTimer <= 0) {
      world.bullets.splice(i, 1);
      continue;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Check obstacle collision
    if (
      b.x < 0 ||
      b.x > world.worldWidth ||
      b.y < 0 ||
      b.y > world.worldHeight ||
      pointHitsObstacle(b.x, b.y, b.radius, world.obstacles)
    ) {
      world.bullets.splice(i, 1);
      continue;
    }

    // Check zombie hit
    let hitZombie = false;
    for (const z of world.zombies) {
      if (z.dead) continue;
      const dist = Math.hypot(z.x - b.x, z.y - b.y);
      if (dist <= z.radius + b.radius + 2) {
        const mag = Math.hypot(b.vx, b.vy) || 1;
        damageZombie(world, z, b.damage, b.vx / mag, b.vy / mag, 150);
        hitZombie = true;
        break;
      }
    }

    if (hitZombie) {
      world.bullets.splice(i, 1);
    }
  }

  // Step Zombies: Directional Sight + Acoustic Detection AI + Smooth Slower Pursuit
  let activeWindups = 0;
  for (let i = world.zombies.length - 1; i >= 0; i--) {
    const z = world.zombies[i];
    z.hitFlashTimer = Math.max(0, z.hitFlashTimer - dt);

    if (z.dead) {
      z.deathTimer = Math.max(0, z.deathTimer - dt);
      continue;
    }

    z.attackCooldown = Math.max(0, z.attackCooldown - dt);

    // Apply decaying knockback
    if (Math.hypot(z.knockbackVx, z.knockbackVy) > 5) {
      const kbMove = moveEntityWithCollisions(
        z.x,
        z.y,
        z.knockbackVx,
        z.knockbackVy,
        z.radius,
        dt,
        world.obstacles,
        world.worldWidth,
        world.worldHeight
      );
      z.x = kbMove.x;
      z.y = kbMove.y;
      z.knockbackVx *= Math.pow(0.05, dt);
      z.knockbackVy *= Math.pow(0.05, dt);
    }

    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const distToPlayer = Math.hypot(dx, dy);

    // --- SENSORY REACTION: Directional Vision Cone + Flashlight Illumination ---
    const angleToPlayer = Math.atan2(dy, dx);
    const angleDiff = Math.abs(
      ((angleToPlayer - z.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    );
    const inVisionCone = angleDiff <= z.visionConeAngle * 0.5;
    const hasClearLOS = !isSegmentBlockedByWall(z.x, z.y, p.x, p.y, world.obstacles);

    // Base effective sight range: daylight vs dark
    let effectiveSightRange = z.visionRange;
    if (world.ambientDarkness >= 0.35) {
      effectiveSightRange = 95; // reduced sight in night / dark interiors when flashlight is off
    }

    // Flashlight detection: if player flashlight is ON and unobstructed by walls, light alerts zombie
    if (p.flashlight.enabled && hasClearLOS) {
      const anglePlayerToZ = Math.abs(
        ((Math.atan2(-dy, -dx) - p.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      );
      const isLitByFlashlight =
        anglePlayerToZ <= p.flashlight.coneAngle * 0.5 && distToPlayer <= p.flashlight.range;
      if (isLitByFlashlight || distToPlayer <= 260) {
        effectiveSightRange = Math.max(effectiveSightRange, 280);
      }
    }

    let isAlerted = false;
    let targetX = p.x;
    let targetY = p.y;

    if (hasClearLOS && inVisionCone && distToPlayer <= effectiveSightRange) {
      isAlerted = true;
      z.alertState = 'hunting';
      z.alertTimer = 6.0;
      z.targetPoint = { x: p.x, y: p.y };
    } else if (hasClearLOS && distToPlayer <= 110) {
      // Close footstep / breathing detection even from behind when not separated by a solid wall
      isAlerted = true;
      z.alertState = 'hunting';
      z.alertTimer = 4.0;
      z.targetPoint = { x: p.x, y: p.y };
    }

    // --- Acoustic Hearing Detection from Active Noise Events ---
    if (!isAlerted) {
      for (const ne of world.noiseEvents) {
        const distToNoise = Math.hypot(ne.x - z.x, ne.y - z.y);
        if (distToNoise <= ne.radius) {
          isAlerted = true;
          z.alertState = 'hunting';
          z.alertTimer = 5.0;
          targetX = ne.x;
          targetY = ne.y;
          z.targetPoint = { x: ne.x, y: ne.y };
          break;
        }
      }
    }

    // Residual hunting alert decay
    if (!isAlerted && z.alertState === 'hunting' && z.alertTimer > 0) {
      z.alertTimer -= dt;
      if (z.alertTimer > 0 && z.targetPoint) {
        isAlerted = true;
        targetX = z.targetPoint.x;
        targetY = z.targetPoint.y;
      } else {
        z.alertState = 'idle';
        z.targetPoint = null;
      }
    }

    const zCfg = ZOMBIE_ARCHETYPE_CONFIG[z.archetype] ?? ZOMBIE_ARCHETYPE_CONFIG.lento;

    if (isAlerted) {
      const tdx = targetX - z.x;
      const tdy = targetY - z.y;
      const desiredAngle = Math.atan2(tdy, tdx);

      // Parameterized angular turning per archetype (instead of fixed constant)
      const turnDiff =
        ((desiredAngle - z.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const turnRate = z.turnRateRad ?? zCfg.turnRateRad;
      z.facingAngle += turnDiff * Math.min(1, dt * turnRate);

      // Handle windup attack telegraph if near actual player
      if (z.isWindingUp) {
        activeWindups += 1;
        z.windupTimer -= dt;
        z.vx = 0;
        z.vy = 0;
        if (z.windupTimer <= 0) {
          z.isWindingUp = false;
          z.attackCooldown = zCfg.attackCooldown;
          if (
            distToPlayer <= z.attackRange + p.radius + 10 &&
            !isSegmentBlockedByWall(z.x, z.y, p.x, p.y, world.obstacles)
          ) {
            applyDamageToPlayer(world, z.damage, z.name);
          }
        }
        continue;
      }

      // Start attack windup if within attack range of player
      if (
        distToPlayer <= z.attackRange + p.radius &&
        z.attackCooldown <= 0 &&
        activeWindups < 3 &&
        !isSegmentBlockedByWall(z.x, z.y, p.x, p.y, world.obstacles)
      ) {
        z.isWindingUp = true;
        z.windupTimer = zCfg.windupDuration;
        z.vx = 0;
        z.vy = 0;
        activeWindups += 1;
        continue;
      }

      // Movement behavior policy by archetype with smooth velocity acceleration
      let moveAngle = desiredAngle;
      if (z.archetype === 'corredor' && distToPlayer > 95) {
        moveAngle += z.flankSign * 0.45;
      }

      const targetVx = Math.cos(moveAngle) * z.speed;
      const targetVy = Math.sin(moveAngle) * z.speed;
      const accelBlend = Math.min(1, dt * 14);
      z.vx += (targetVx - z.vx) * accelBlend;
      z.vy += (targetVy - z.vy) * accelBlend;

      const movedZ = moveEntityWithCollisions(
        z.x,
        z.y,
        z.vx,
        z.vy,
        z.radius,
        dt,
        world.obstacles,
        world.worldWidth,
        world.worldHeight
      );
      z.x = movedZ.x;
      z.y = movedZ.y;

      // Prevent zombie from walking through the player body
      const afterDx = z.x - p.x;
      const afterDy = z.y - p.y;
      const afterDist = Math.hypot(afterDx, afterDy);
      const minSep = z.radius + p.radius;
      if (afterDist > 0.001 && afterDist < minSep) {
        const push = minSep - afterDist;
        const pushed = moveEntityWithCollisions(
          z.x + (afterDx / afterDist) * push,
          z.y + (afterDy / afterDist) * push,
          0,
          0,
          z.radius,
          dt,
          world.obstacles,
          world.worldWidth,
          world.worldHeight
        );
        z.x = pushed.x;
        z.y = pushed.y;
      }
    } else {
      z.vx = 0;
      z.vy = 0;
      z.isWindingUp = false;
    }
  }

  updateWorldVisibility(world, dt);
  updateEngagedTargets(world);
  world.activePrompt = findNearestInteractable(world);
  return world;
}

export function computeEvacuationProgress(stash: PersistentShelterStash): number {
  if (stash.evacuationCompleted) return 100;
  const upg = stash.upgrades ?? createInitialUpgrades();
  const radioScore = (upg.torre_radio || 0) * 25; // up to 50%
  const defenseScore = (upg.muralha || 0) * 10 + (upg.oficina || 0) * 5 + (upg.enfermaria || 0) * 5; // up to 40%
  const extractionScore = Math.min(20, stash.runsExtracted * 10); // up to 20%
  const supplyRatio =
    Math.min(1, stash.totalStash.comida / CAMPAIGN_EVACUATION_COST.comida) * 0.25 +
    Math.min(1, stash.totalStash.medicamentos / CAMPAIGN_EVACUATION_COST.medicamentos) * 0.25 +
    Math.min(1, stash.totalStash.municao / CAMPAIGN_EVACUATION_COST.municao) * 0.25 +
    Math.min(1, stash.totalStash.materiais / CAMPAIGN_EVACUATION_COST.materiais) * 0.25;
  const supplyScore = Math.round(supplyRatio * 20);
  return Math.min(99, radioScore + Math.min(30, defenseScore) + extractionScore + supplyScore);
}

export function canAffordCost(bag: ActionLootBag, cost: Partial<ActionLootBag>): boolean {
  return (
    bag.comida >= (cost.comida ?? 0) &&
    bag.medicamentos >= (cost.medicamentos ?? 0) &&
    bag.municao >= (cost.municao ?? 0) &&
    bag.materiais >= (cost.materiais ?? 0)
  );
}

export function purchaseShelterUpgrade(
  stash: PersistentShelterStash,
  upgradeId: ShelterUpgradeId
): { ok: boolean; stash: PersistentShelterStash; message: string } {
  const def = SHELTER_UPGRADE_CATALOG[upgradeId];
  if (!def) {
    return { ok: false, stash, message: 'Melhoria desconhecida.' };
  }
  const currentUpgrades = stash.upgrades ?? createInitialUpgrades();
  const currentLevel = currentUpgrades[upgradeId] ?? 0;
  if (currentLevel >= def.maxLevel) {
    return { ok: false, stash, message: `${def.name} já está no nível máximo.` };
  }

  const cost = def.costs[currentLevel];
  if (!canAffordCost(stash.totalStash, cost)) {
    return {
      ok: false,
      stash,
      message: `Recursos insuficientes para ${def.name} (Nv.${currentLevel + 1}).`,
    };
  }

  const nextStashBag: ActionLootBag = {
    comida: stash.totalStash.comida - (cost.comida ?? 0),
    medicamentos: stash.totalStash.medicamentos - (cost.medicamentos ?? 0),
    municao: stash.totalStash.municao - (cost.municao ?? 0),
    materiais: stash.totalStash.materiais - (cost.materiais ?? 0),
  };

  const nextUpgrades: ShelterUpgradeState = {
    ...currentUpgrades,
    [upgradeId]: currentLevel + 1,
  };

  const logEntry = `Dia ${stash.day ?? 1}: Construído ${def.name} Nv.${currentLevel + 1}.`;
  const nextStash: PersistentShelterStash = {
    ...stash,
    totalStash: nextStashBag,
    upgrades: nextUpgrades,
    shelterLog: [logEntry, ...(stash.shelterLog ?? [])].slice(0, 14),
    updatedAt: new Date().toISOString(),
  };
  nextStash.evacuationProgress = computeEvacuationProgress(nextStash);

  return {
    ok: true,
    stash: nextStash,
    message: `${def.name} atualizado para Nv.${currentLevel + 1}!`,
  };
}

export function healSurvivorInShelter(
  stash: PersistentShelterStash,
  survivorId: string
): { ok: boolean; stash: PersistentShelterStash; message: string } {
  const survivors = stash.survivors ?? createInitialSurvivors();
  const target = survivors.find((s) => s.id === survivorId);
  if (!target || target.status === 'morto') {
    return { ok: false, stash, message: 'Sobrevivente indisponível para tratamento.' };
  }
  if (target.hp >= target.maxHp && target.status === 'saudavel') {
    return { ok: false, stash, message: `${target.name} já está com saúde plena.` };
  }
  if (stash.totalStash.medicamentos < 1) {
    return { ok: false, stash, message: 'Sem Medicamentos no estoque do abrigo.' };
  }

  const medBonus = ((stash.upgrades?.enfermaria ?? 0) * 15);
  const healAmt = 45 + medBonus;
  const nextSurvivors: ShelterSurvivor[] = survivors.map((s) => {
    if (s.id !== survivorId) return s;
    const nextHp = Math.min(s.maxHp, s.hp + healAmt);
    return {
      ...s,
      hp: nextHp,
      status: nextHp >= 75 ? 'saudavel' : 'ferido',
    };
  });

  const nextStash: PersistentShelterStash = {
    ...stash,
    totalStash: {
      ...stash.totalStash,
      medicamentos: stash.totalStash.medicamentos - 1,
    },
    survivors: nextSurvivors,
    shelterLog: [
      `Dia ${stash.day ?? 1}: ${target.name} recebeu tratamento médico (+${healAmt} PV).`,
      ...(stash.shelterLog ?? []),
    ].slice(0, 14),
    updatedAt: new Date().toISOString(),
  };
  nextStash.evacuationProgress = computeEvacuationProgress(nextStash);
  return {
    ok: true,
    stash: nextStash,
    message: `${target.name} tratado (+${healAmt} PV).`,
  };
}

export function feedAndRestShelter(
  stash: PersistentShelterStash
): { ok: boolean; stash: PersistentShelterStash; message: string } {
  const survivors = stash.survivors ?? createInitialSurvivors();
  const living = survivors.filter((s) => s.status !== 'morto');
  const rationCost = Math.max(1, Math.min(2, living.length));
  if (stash.totalStash.comida < rationCost) {
    return {
      ok: false,
      stash,
      message: `Comida insuficiente para turno de descanso (necessário: ${rationCost} Comida).`,
    };
  }

  const nextDay = (stash.day ?? 1) + 1;
  const nextSurvivors: ShelterSurvivor[] = survivors.map((s) => {
    if (s.status === 'morto') return s;
    const nextHp = Math.min(s.maxHp, s.hp + 20);
    return {
      ...s,
      hp: nextHp,
      status: nextHp >= 75 ? 'saudavel' : 'ferido',
    };
  });

  const nextStash: PersistentShelterStash = {
    ...stash,
    day: nextDay,
    totalStash: {
      ...stash.totalStash,
      comida: stash.totalStash.comida - rationCost,
    },
    survivors: nextSurvivors,
    shelterLog: [
      `Dia ${nextDay}: Equipe alimentada (-${rationCost} Comida) e recuperada (+20 PV).`,
      ...(stash.shelterLog ?? []),
    ].slice(0, 14),
    updatedAt: new Date().toISOString(),
  };
  nextStash.evacuationProgress = computeEvacuationProgress(nextStash);
  return {
    ok: true,
    stash: nextStash,
    message: `Dia ${nextDay}: Equipe alimentada e pronta para nova incursão.`,
  };
}

export function selectActiveSurvivor(
  stash: PersistentShelterStash,
  survivorId: string
): PersistentShelterStash {
  const survivors = stash.survivors ?? createInitialSurvivors();
  const found = survivors.find((s) => s.id === survivorId && s.status !== 'morto');
  if (!found) return stash;
  return {
    ...stash,
    activeSurvivorId: found.id,
    updatedAt: new Date().toISOString(),
  };
}

export function canTriggerFinalEvacuation(stash: PersistentShelterStash): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const radioLvl = stash.upgrades?.torre_radio ?? 0;
  if (radioLvl < 1) {
    reasons.push('Construir Transmissor & Farol Tático (Nv. 1+)');
  }
  if (stash.runsExtracted < 2) {
    reasons.push(`Concluir pelo menos 2 incursões com extração (${stash.runsExtracted}/2)`);
  }
  if (stash.totalStash.comida < CAMPAIGN_EVACUATION_COST.comida) {
    reasons.push(`Comida para o comboio (${stash.totalStash.comida}/${CAMPAIGN_EVACUATION_COST.comida})`);
  }
  if (stash.totalStash.medicamentos < CAMPAIGN_EVACUATION_COST.medicamentos) {
    reasons.push(
      `Medicamentos de emergência (${stash.totalStash.medicamentos}/${CAMPAIGN_EVACUATION_COST.medicamentos})`
    );
  }
  if (stash.totalStash.municao < CAMPAIGN_EVACUATION_COST.municao) {
    reasons.push(`Munição de escolta (${stash.totalStash.municao}/${CAMPAIGN_EVACUATION_COST.municao})`);
  }
  if (stash.totalStash.materiais < CAMPAIGN_EVACUATION_COST.materiais) {
    reasons.push(
      `Materiais de blindagem (${stash.totalStash.materiais}/${CAMPAIGN_EVACUATION_COST.materiais})`
    );
  }
  return {
    ready: reasons.length === 0,
    reasons,
  };
}

export function triggerFinalEvacuation(
  stash: PersistentShelterStash
): { ok: boolean; stash: PersistentShelterStash; message: string } {
  const check = canTriggerFinalEvacuation(stash);
  if (!check.ready) {
    return {
      ok: false,
      stash,
      message: `Evacuação indisponível: ${check.reasons[0]}`,
    };
  }

  const nextStash: PersistentShelterStash = {
    ...stash,
    totalStash: {
      comida: stash.totalStash.comida - CAMPAIGN_EVACUATION_COST.comida,
      medicamentos: stash.totalStash.medicamentos - CAMPAIGN_EVACUATION_COST.medicamentos,
      municao: stash.totalStash.municao - CAMPAIGN_EVACUATION_COST.municao,
      materiais: stash.totalStash.materiais - CAMPAIGN_EVACUATION_COST.materiais,
    },
    evacuationProgress: 100,
    evacuationCompleted: true,
    shelterLog: [
      `Dia ${stash.day ?? 1}: SINAL DE RESGATE CONFIRMADO! O comboio evacuou os sobreviventes do setor com segurança.`,
      ...(stash.shelterLog ?? []),
    ].slice(0, 14),
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    stash: nextStash,
    message: 'Comboio de Evacuação acionado! Sobreviventes resgatados com sucesso!',
  };
}

export function getShelterUpgradeCost(
  upgradeId: ShelterUpgradeId,
  currentLevel: number
): Partial<ActionLootBag> | null {
  const def = SHELTER_UPGRADE_CATALOG[upgradeId];
  if (!def || currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel] ?? null;
}

export const upgradeShelterStation = purchaseShelterUpgrade;
export const healShelterSurvivor = healSurvivorInShelter;
export const executeEvacuation = triggerFinalEvacuation;

export function applyExtractionToStash(
  stash: PersistentShelterStash,
  world: ActionWorldState
): PersistentShelterStash {
  // Guard against processing the same run twice
  if (stash.extractedRunIds.includes(world.runId)) {
    return stash;
  }

  const currentSurvivors = stash.survivors ?? createInitialSurvivors();
  const activeId = stash.activeSurvivorId ?? currentSurvivors[0]?.id ?? 'surv_elena';
  const nextDay = (stash.day ?? 1) + 1;

  if (world.status === 'extracted') {
    const nextStash: ActionLootBag = {
      comida: stash.totalStash.comida + world.runLoot.comida,
      medicamentos: stash.totalStash.medicamentos + world.runLoot.medicamentos,
      municao: stash.totalStash.municao + world.runLoot.municao,
      materiais: stash.totalStash.materiais + world.runLoot.materiais,
    };

    const hpRatio = Math.max(0.2, Math.min(1, world.player.hp / Math.max(1, world.player.maxHp)));
    const nextSurvivors: ShelterSurvivor[] = currentSurvivors.map((s) => {
      if (s.id !== activeId) return s;
      const newHp = Math.max(20, Math.round(hpRatio * s.maxHp));
      return {
        ...s,
        hp: newHp,
        status: newHp < 65 ? 'ferido' : 'saudavel',
      };
    });

    const updated: PersistentShelterStash = {
      ...stash,
      day: nextDay,
      totalStash: nextStash,
      survivors: nextSurvivors,
      runsStarted: stash.runsStarted + 1,
      runsExtracted: stash.runsExtracted + 1,
      totalZombiesKilled: stash.totalZombiesKilled + world.zombiesKilled,
      extractedRunIds: [...stash.extractedRunIds, world.runId].slice(-50),
      lastRunSummary: {
        outcome: 'extracted',
        lootGained: { ...world.runLoot },
        zombiesKilled: world.zombiesKilled,
        durationSeconds: Math.round(world.elapsedTime),
      },
      shelterLog: [
        `Dia ${nextDay}: Extração bem-sucedida em ${world.districtName} (+${world.runLoot.comida} Comida, +${world.runLoot.materiais} Mat).`,
        ...(stash.shelterLog ?? []),
      ].slice(0, 14),
      updatedAt: new Date().toISOString(),
    };
    updated.evacuationProgress = computeEvacuationProgress(updated);
    return updated;
  }

  if (world.status === 'dead') {
    // Active survivor suffers severe trauma or falls; select next available survivor if needed
    const nextSurvivors: ShelterSurvivor[] = currentSurvivors.map((s) => {
      if (s.id !== activeId) return s;
      return {
        ...s,
        hp: 25,
        status: 'ferido',
      };
    });
    const healthyFallback =
      nextSurvivors.find((s) => s.status === 'saudavel')?.id ?? activeId;

    const updated: PersistentShelterStash = {
      ...stash,
      day: nextDay,
      survivors: nextSurvivors,
      activeSurvivorId: healthyFallback,
      runsStarted: stash.runsStarted + 1,
      runsDied: stash.runsDied + 1,
      totalZombiesKilled: stash.totalZombiesKilled + world.zombiesKilled,
      extractedRunIds: [...stash.extractedRunIds, world.runId].slice(-50),
      lastRunSummary: {
        outcome: 'dead',
        lootGained: createEmptyLootBag(),
        zombiesKilled: world.zombiesKilled,
        durationSeconds: Math.round(world.elapsedTime),
      },
      shelterLog: [
        `Dia ${nextDay}: Incursão falhou em ${world.districtName}. O batedor retornou gravemente ferido e sem o saque.`,
        ...(stash.shelterLog ?? []),
      ].slice(0, 14),
      updatedAt: new Date().toISOString(),
    };
    updated.evacuationProgress = computeEvacuationProgress(updated);
    return updated;
  }

  return stash;
}

export function buildMinimapSnapshot(
  world: ActionWorldState,
  mapWidth = 128,
  mapHeight = 96
): MinimapSnapshot {
  const safeWorldW = Math.max(1, world.worldWidth);
  const safeWorldH = Math.max(1, world.worldHeight);
  const scaleX = mapWidth / safeWorldW;
  const scaleY = mapHeight / safeWorldH;

  const clampX = (wx: number) =>
    Math.max(0, Math.min(mapWidth, Number((wx * scaleX).toFixed(2))));
  const clampY = (wy: number) =>
    Math.max(0, Math.min(mapHeight, Number((wy * scaleY).toFixed(2))));

  const p = world.player;
  const ext = world.extractionZone;

  const dxExt = ext.x - p.x;
  const dyExt = ext.y - p.y;
  const distPx = Math.hypot(dxExt, dyExt);
  const insideExtraction = distPx <= ext.radius + p.radius;

  const shortTagForBuilding = (id: string, name: string): string => {
    if (id.includes('mercado')) return 'MER';
    if (id.includes('farmacia')) return 'FAR';
    if (id.includes('delegacia')) return 'POL';
    return name.slice(0, 3).toUpperCase();
  };

  return {
    mapWidth,
    mapHeight,
    player: {
      x: clampX(p.x),
      y: clampY(p.y),
      worldX: Math.round(p.x),
      worldY: Math.round(p.y),
      normX: Math.max(0, Math.min(1, p.x / safeWorldW)),
      normY: Math.max(0, Math.min(1, p.y / safeWorldH)),
      facingAngle: p.facingAngle,
      insideExtraction,
    },
    extraction: {
      id: ext.id,
      label: ext.label,
      x: clampX(ext.x),
      y: clampY(ext.y),
      worldX: Math.round(ext.x),
      worldY: Math.round(ext.y),
      normX: Math.max(0, Math.min(1, ext.x / safeWorldW)),
      normY: Math.max(0, Math.min(1, ext.y / safeWorldH)),
      radius: Math.max(4, Number((ext.radius * ((scaleX + scaleY) * 0.5)).toFixed(2))),
      distanceMeters: Math.max(0, Math.round(distPx / 12)),
      bearingRad: Math.atan2(dyExt, dxExt),
    },
    buildings: world.buildings.map((b) => ({
      id: b.id,
      name: b.name,
      shortTag: shortTagForBuilding(b.id, b.name),
      x: clampX(b.x),
      y: clampY(b.y),
      width: Number((b.width * scaleX).toFixed(2)),
      height: Number((b.height * scaleY).toFixed(2)),
    })),
    lootSpots: world.lootSpots
      .filter((spot) => spot.looted || spot.isVisibleToPlayer)
      .map((spot) => ({
        id: spot.id,
        x: clampX(spot.x),
        y: clampY(spot.y),
        looted: spot.looted,
      })),
    zombies: world.zombies
      .filter((z) => !z.dead && z.visibility !== 'hidden')
      .map((z) => ({
        id: z.id,
        x: clampX(z.x),
        y: clampY(z.y),
        archetype: z.archetype,
      })),
  };
}


