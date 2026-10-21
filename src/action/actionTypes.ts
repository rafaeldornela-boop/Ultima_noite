export const ACTION_STASH_SCHEMA_VERSION = 1;

export type ActionResourceType = 'comida' | 'medicamentos' | 'municao' | 'materiais';

export type ActionLootBag = Record<ActionResourceType, number>;

export type WeaponType = 'pistola' | 'facao';

export type ZombieArchetype = 'lento' | 'corredor' | 'bruto';

export type RunStatus = 'playing' | 'paused' | 'extracted' | 'dead';

export type DistrictId = 'vila_esperanca' | 'centro_comercial' | 'complexo_medico';

export type TimeOfDay = 'dia' | 'entardecer' | 'noite' | 'madrugada';

export type ContainerType =
  | 'armario'
  | 'gaveta'
  | 'geladeira'
  | 'gondola'
  | 'porta_malas'
  | 'porta_luvas'
  | 'cofre'
  | 'maca'
  | 'bancada'
  | 'mochila'
  | 'caixa';

export type LootSearchState = 'available' | 'searching' | 'searched';

export interface ObstacleRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'wall' | 'car' | 'crate' | 'barrier';
  label?: string;
}

export type VisibilityLevel = 'visible' | 'penumbra' | 'hidden';

export interface BuildingDoor {
  id: string;
  buildingId: string;
  buildingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
  side: 'north' | 'south' | 'east' | 'west';
  label: string;
}

export interface BuildingWindow {
  id: string;
  buildingId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
}

export interface BuildingZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorColor: number;
  roofColor?: number;
  roofAlpha?: number; // 1.0 when player is outside (roof visible hiding interior), smoothly fades to 0.0 when player enters
  doors?: BuildingDoor[];
  windows?: BuildingWindow[];
}

export interface LootSpot {
  id: string;
  label: string;
  actionVerb?: string;
  kind: 'comida' | 'medicamentos' | 'municao' | 'materiais' | 'misto';
  containerType: ContainerType;
  obstacleId?: string;
  searchDuration: number; // e.g. 0.8s for gaveta, 1.2s for armario, 2.0s for cofre
  noiseOnSearch: boolean; // squeaky cabinet/safe/trunk emits diegetic sound alerting zombies
  x: number;
  y: number;
  radius: number;
  looted: boolean;
  searchState?: LootSearchState;
  isVisibleToPlayer?: boolean;
  isHighValue?: boolean;
  clueText?: string;
  contents: Partial<ActionLootBag>;
}

export interface ExtractionZone {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface DistrictConnection {
  id: string;
  fromDistrict: DistrictId;
  toDistrict: DistrictId;
  toDistrictName: string;
  label: string;
  direction: 'east' | 'west' | 'north' | 'south';
  x: number;
  y: number;
  radius: number;
  corridorRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  arrivalX: number;
  arrivalY: number;
  arrivalFacingAngle: number;
}

export interface DistrictRuntimeState {
  districtId: DistrictId;
  zombies: ZombieEntity[];
  lootSpots: LootSpot[];
  buildings: BuildingZone[];
  nightReinforcementsSpawned?: number;
}

export interface IncursionObjective {
  id: string;
  title: string;
  description: string;
  districtId: DistrictId;
  districtName: string;
  targetSpotIds: string[];
  completed: boolean;
  intelId: string;
  intelTitle: string;
  intelSummary: string;
}

export interface DeathPenaltyBreakdown {
  collected: ActionLootBag;
  lost: ActionLootBag;
  recovered: ActionLootBag;
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
  aimSpreadRad: number; // Dynamic Bullet Echo cone total angle (radians): widens when moving, narrows when steady
  engagedTargetId: string | null; // Primary zombie inside valid attack cone & range
  engagedTargetIds: string[]; // All zombies inside valid attack cone & range
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
  recoilBloom?: number;
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
  turnRateRad: number; // Parameterized angular rotation rate per archetype (rad/s)
  visionConeAngle: number; // radians (e.g. 1.3 rad ~= 75 deg)
  visionRange: number; // base detection sight distance
  alertState: 'idle' | 'patrol' | 'investigating' | 'hunting';
  alertTimer: number;
  targetPoint: { x: number; y: number } | null;
  patrolOrigin?: { x: number; y: number };
  patrolTarget?: { x: number; y: number } | null;
  patrolPauseTimer?: number;
  stuckTimer?: number;
  avoidanceDir?: number;
  searchLookPhase?: number;
  visibility?: VisibilityLevel;
  visibilityState?: VisibilityLevel;
  visibilityLevel?: VisibilityLevel;
  lastHeardTimer?: number;
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
  isVisibleToPlayer?: boolean;
  isInsideBuildingId?: string | null;
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
  shotSpreadOffsetRad?: number;
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
  targetType: 'loot' | 'extraction' | 'transition';
  id: string;
  label: string;
  actionVerb?: string;
  containerType?: ContainerType;
  toDistrict?: DistrictId;
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

export interface AcousticCue {
  id: string;
  angle: number; // quantized direction from player to sound source (radians)
  angleRad?: number;
  distanceBand: 'perto' | 'medio' | 'longe';
  approxX?: number;
  approxY?: number;
  intensity: number; // 0..1
  ttl?: number;
  source?: string;
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
  dayNightClock: number; // seconds into expedition cycle [0..180)
  formattedClock?: string; // e.g. "17:30"
  ambientDarkness: number; // 0.10 (bright day) to 0.44 (night)
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
  doors?: BuildingDoor[];
  nearbyDoor?: BuildingDoor | null;
  connections: DistrictConnection[];
  districtStates: Partial<Record<DistrictId, DistrictRuntimeState>>;
  visitedDistricts: DistrictId[];
  objectives: IncursionObjective[];
  discoveredIntelIds: string[];
  transitionCooldown: number;
  acousticCues: AcousticCue[];
  nightSpawnTimer?: number;
  nightReinforcementsSpawned?: number;
  extractionZone: ExtractionZone;
  runLoot: ActionLootBag;
  maxCarryCapacity: number;
  zombiesKilled: number;
  shotsFired: number;
  activePrompt: InteractPrompt | null;
  lastEventBanner: string;
  feedbacks: FloatingFeedback[];
  extractionProcessed: boolean;
  activeLooting: ActiveLootingState | null;
  noiseEvents: NoiseEvent[];
  impactEvents?: Array<{
    id: string;
    x: number;
    y: number;
    angle: number;
    kind: 'wall' | 'car' | 'crate' | 'barrier' | 'flesh';
    timer: number;
  }>;
}

export interface RescuedSurvivorProfile {
  id: string;
  name: string;
  role: string;
  bonusLabel: string;
  districtId: DistrictId;
}

export type ShelterUpgradeId = 'oficina' | 'enfermaria' | 'torre_radio' | 'muralha';

export type ShelterUpgradeState = Record<ShelterUpgradeId, number>;

export interface ShelterSurvivor {
  id: string;
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  status: 'saudavel' | 'ferido' | 'exausto' | 'morto';
  runsCompleted?: number;
}

export interface PersistentShelterStash {
  schemaVersion: number;
  totalStash: ActionLootBag;
  runsStarted: number;
  runsExtracted: number;
  runsDied: number;
  totalZombiesKilled: number;
  extractedRunIds: string[];
  discoveredDistricts?: DistrictId[];
  completedObjectiveIds?: string[];
  discoveredIntelIds?: string[];
  day?: number;
  survivors?: ShelterSurvivor[];
  activeSurvivorId?: string;
  upgrades?: ShelterUpgradeState;
  evacuationProgress?: number;
  shelterLog?: string[];
  survivorsRescued?: number;
  rescuedSurvivorIds?: string[];
  evacuationStage?: number; // 0..4 (4 = Evacuation Convoy Ready / Completed)
  evacuationCompleted?: boolean;
  lastRunSummary: {
    outcome: 'extracted' | 'dead';
    districtId?: DistrictId;
    districtName?: string;
    lootCollected?: ActionLootBag;
    lootGained: ActionLootBag;
    lootLost?: ActionLootBag;
    zombiesKilled: number;
    durationSeconds: number;
    objectivesCompleted?: number;
    visitedDistricts?: DistrictId[];
    rescuedSurvivorName?: string;
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

export interface MinimapConnectionProjection {
  id: string;
  x: number;
  y: number;
  direction: 'east' | 'west' | 'north' | 'south';
  label: string;
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
  connections?: MinimapConnectionProjection[];
}


