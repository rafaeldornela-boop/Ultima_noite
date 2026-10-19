export const ACTION_STASH_SCHEMA_VERSION = 1;

export type ActionResourceType = 'comida' | 'medicamentos' | 'municao' | 'materiais';

export type ActionLootBag = Record<ActionResourceType, number>;

export type WeaponType = 'pistola' | 'facao';

export type ZombieArchetype = 'lento' | 'corredor' | 'bruto';

export type RunStatus = 'playing' | 'paused' | 'extracted' | 'dead';

export type DistrictId = 'vila_esperanca' | 'centro_comercial' | 'complexo_medico';

export type TimeOfDay = 'dia' | 'entardecer' | 'noite' | 'madrugada';

export type ContainerType =
  | 'caixa'
  | 'mochila'
  | 'armario'
  | 'geladeira'
  | 'gondola'
  | 'porta_malas'
  | 'cofre'
  | 'maca'
  | 'bancada';

export interface ObstacleRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'wall' | 'car' | 'crate' | 'barrier';
  label?: string;
}

export interface BuildingZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorColor: number;
}

export interface LootSpot {
  id: string;
  label: string;
  kind: 'comida' | 'medicamentos' | 'municao' | 'materiais' | 'misto';
  containerType: ContainerType;
  searchDuration: number; // e.g. 0.8s for mochila, 1.2s for armario, 2.0s for cofre
  noiseOnSearch: boolean; // squeaky cabinet/safe emits diegetic sound alerting zombies
  x: number;
  y: number;
  radius: number;
  looted: boolean;
  contents: Partial<ActionLootBag>;
}

export interface ExtractionZone {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface FlashlightState {
  enabled: boolean;
  battery: number; // 0..100%
  maxBattery: number;
  drainRate: number; // % consumed per second when on (e.g. 1.25%/s)
  range: number; // illumination range in pixels (e.g. 320px)
  coneAngle: number; // radians (e.g. 0.95 rad ~= 55 deg)
}

export interface HealingState {
  active: boolean;
  progress: number; // 0..duration
  duration: number; // e.g. 2.4s
  healAmount: number; // e.g. 35 HP
}

export interface PlayerEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number; // radians
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  sprinting: boolean;
  dodgeTimer: number;
  dodgeCooldown: number;
  invulnTimer: number;
  equippedWeapon: WeaponType;
  ammoInClip: number;
  clipSize: number;
  ammoReserve: number;
  reloadTimer: number;
  reloadDuration: number;
  attackCooldown: number;
  meleeSwingTimer: number;
  hurtFlashTimer: number;
  flashlight: FlashlightState;
  healing: HealingState | null;
  isInsideBuilding: string | null;
  currentBuildingName: string | null;
}

export interface ZombieEntity {
  id: string;
  archetype: ZombieArchetype;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number;
  visionConeAngle: number; // radians (e.g. 1.3 rad ~= 75 deg)
  visionRange: number; // base detection sight distance
  alertState: 'idle' | 'patrol' | 'investigating' | 'hunting';
  alertTimer: number;
  targetPoint: { x: number; y: number } | null;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  detectionRange: number;
  attackRange: number;
  attackCooldown: number;
  windupTimer: number;
  isWindingUp: boolean;
  hitFlashTimer: number;
  knockbackVx: number;
  knockbackVy: number;
  dead: boolean;
  deathTimer: number; // For 0.35s KO topple/dissolve transition
  flankSign: number; // +1 or -1 for corredor weaving
}

export interface BulletEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  lifeTimer: number;
  active: boolean;
}

export interface FloatingFeedback {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  ttl: number;
}

export interface ActionInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1
  aimAngle: number | null; // radians, if aiming via mouse or right stick
  attackHeld: boolean;
  attackJustPressed: boolean;
  sprintHeld: boolean;
  dodgeJustPressed: boolean;
  interactJustPressed: boolean;
  reloadJustPressed: boolean;
  switchWeaponJustPressed: boolean;
  healJustPressed: boolean;
  toggleFlashlightJustPressed: boolean;
}

export interface InteractPrompt {
  targetType: 'loot' | 'extraction';
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface NoiseEvent {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number; // 0..1
  duration: number; // visual ring expansion & decay duration (s)
  timer: number;
  source: 'gunshot' | 'sprint' | 'loot' | 'melee';
}

export interface ActiveLootingState {
  spotId: string;
  progress: number; // 0..duration
  duration: number; // e.g. 1.2s
}

export interface ActionWorldState {
  runId: string;
  districtId: DistrictId;
  districtName: string;
  timeOfDay: TimeOfDay;
  dayNightClock: number; // seconds into expedition
  ambientDarkness: number; // 0.15 (bright day) to 0.82 (pitch night)
  isInsideBuilding: boolean;
  currentBuildingName: string | null;
  status: RunStatus;
  elapsedTime: number;
  hitstopTimer: number;
  cameraShakeTrauma: number;
  worldWidth: number;
  worldHeight: number;
  player: PlayerEntity;
  zombies: ZombieEntity[];
  bullets: BulletEntity[];
  lootSpots: LootSpot[];
  obstacles: ObstacleRect[];
  buildings: BuildingZone[];
  extractionZone: ExtractionZone;
  runLoot: ActionLootBag;
  zombiesKilled: number;
  shotsFired: number;
  activePrompt: InteractPrompt | null;
  lastEventBanner: string;
  feedbacks: FloatingFeedback[];
  extractionProcessed: boolean;
  activeLooting: ActiveLootingState | null;
  noiseEvents: NoiseEvent[];
}

export interface PersistentShelterStash {
  schemaVersion: number;
  totalStash: ActionLootBag;
  runsStarted: number;
  runsExtracted: number;
  runsDied: number;
  totalZombiesKilled: number;
  extractedRunIds: string[];
  lastRunSummary: {
    outcome: 'extracted' | 'dead';
    lootGained: ActionLootBag;
    zombiesKilled: number;
    durationSeconds: number;
  } | null;
  updatedAt: string;
}

export interface MinimapBuildingProjection {
  id: string;
  name: string;
  shortTag: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinimapMarkerProjection {
  id: string;
  x: number;
  y: number;
  looted?: boolean;
  archetype?: ZombieArchetype;
}

export interface MinimapSnapshot {
  mapWidth: number;
  mapHeight: number;
  player: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    normX: number;
    normY: number;
    facingAngle: number;
    insideExtraction: boolean;
  };
  extraction: {
    id: string;
    label: string;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    normX: number;
    normY: number;
    radius: number;
    distanceMeters: number;
    bearingRad: number;
  };
  buildings: MinimapBuildingProjection[];
  lootSpots: MinimapMarkerProjection[];
  zombies: MinimapMarkerProjection[];
}

