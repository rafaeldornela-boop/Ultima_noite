export const CAMPAIGN_SCHEMA_VERSION = 1;

export type ResourceType =
  | 'comida'
  | 'medicamentos'
  | 'materiais'
  | 'ferramentas'
  | 'municao';

export type ResourceStock = Record<ResourceType, number>;

export type AttributeType =
  | 'combate'
  | 'percepcao'
  | 'tecnica'
  | 'resistencia';

export type SurvivorAttributes = Record<AttributeType, number>;

export type InjuryState = 'saudavel' | 'ferido' | 'grave' | 'morto';

export interface Survivor {
  id: string;
  name: string;
  role: string;
  bio: string;
  portraitId: 'helena' | 'marcos' | 'caio' | 'elena';
  attributes: SurvivorAttributes;
  health: number;
  maxHealth: number;
  injury: InjuryState;
  available: boolean;
}

export type ShelterUpgradeId = 'barricadas' | 'enfermaria' | 'oficina';

export interface ShelterUpgradeState {
  id: ShelterUpgradeId;
  level: number;
  maxLevel: number;
}

export interface ShelterUpgradeDef {
  id: ShelterUpgradeId;
  name: string;
  description: string;
  benefitSummary: string;
  cost: Partial<ResourceStock>;
  effectDescription: string;
}

export type LocationId =
  | 'supermercado'
  | 'farmacia'
  | 'delegacia'
  | 'casas_abandonadas';

export type DangerLevel = 'Moderado' | 'Alto' | 'Extremo';

export interface LocationDef {
  id: LocationId;
  name: string;
  subtitle: string;
  description: string;
  danger: DangerLevel;
  dangerLevelNum: number; // 1 to 3
  primaryResources: ResourceType[];
  expeditionLength: number; // Number of cards per run
}

export type EquipmentId =
  | 'pe_de_cabra'
  | 'pistola_9mm'
  | 'kit_primeiros_socorros'
  | 'lanterna_tatica';

export interface EquipmentDef {
  id: EquipmentId;
  name: string;
  description: string;
  bonusAttribute: AttributeType;
  bonusAmount: number;
  capacityBonus?: number;
  requiresResource?: {
    type: ResourceType;
    amount: number;
  };
}

export type RiskLevel = 'Baixo' | 'Moderado' | 'Alto' | 'Crítico';

export interface CardOptionRequirement {
  resource?: ResourceType;
  amount?: number;
  consumeResource?: boolean;
  minAttribute?: {
    attribute: AttributeType;
    value: number;
  };
  requiredEquipment?: EquipmentId;
}

export interface CardOptionOutcome {
  narrative: string;
  loot?: Partial<ResourceStock>;
  damageAll?: number;
  damageLeader?: number;
  inflictInjury?: boolean;
  healLeader?: number;
  triggerRetreat?: boolean;
}

export interface EventCardOption {
  id: string;
  label: string;
  description: string;
  risk: RiskLevel;
  testedAttribute?: AttributeType;
  difficulty?: number; // target score (attribute + equipment bonus + roll)
  requirements?: CardOptionRequirement;
  isRetreatOption?: boolean;
  successOutcome: CardOptionOutcome;
  failureOutcome?: CardOptionOutcome;
}

export interface EventCard {
  id: string;
  title: string;
  context: string;
  description: string;
  dangerTag: string;
  locations: LocationId[];
  options: EventCardOption[];
}

export type CyclePhase =
  | 'manha'
  | 'preparacao'
  | 'expedicao'
  | 'retorno'
  | 'novo_dia'
  | 'derrota';

export type ExpeditionStatus = 'em_andamento' | 'concluida' | 'abandonada' | 'processada';

export interface CardResolutionFeedback {
  cardId: string;
  cardTitle: string;
  optionLabel: string;
  succeeded: boolean;
  narrative: string;
  testedAttribute?: AttributeType;
  attributeScore?: number;
  lootAdded: Partial<ResourceStock>;
  lootDiscarded: Partial<ResourceStock>;
  damageTaken: { survivorName: string; amount: number; died: boolean; injured: boolean }[];
}

export interface ExpeditionState {
  id: string;
  locationId: LocationId;
  teamIds: string[];
  equipmentIds: EquipmentId[];
  status: ExpeditionStatus;
  deckCardIds: string[];
  usedCardIds: string[];
  currentCardIndex: number;
  backpackLoot: ResourceStock;
  maxBackpackCapacity: number;
  currentBackpackWeight: number;
  rewardsClaimed: boolean;
  lastResolution: CardResolutionFeedback | null;
  log: string[];
}

export interface LogEntry {
  id: string;
  day: number;
  phase: CyclePhase;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

export interface MorningReport {
  day: number;
  foodNeeded: number;
  foodConsumed: number;
  starvationOccurred: boolean;
  injuriesWorsened: string[];
  summary: string;
}

export interface NightReport {
  day: number;
  eventTitle: string;
  eventDescription: string;
  damageTaken: string[];
  resourcesLost: Partial<ResourceStock>;
}

export interface CampaignStats {
  expeditionsCompleted: number;
  cardsResolved: number;
  zombiesNeutralized: number;
  totalResourcesLooted: number;
}

export interface CampaignState {
  schemaVersion: number;
  campaignId: string;
  day: number;
  phase: CyclePhase;
  morningProcessedForDay: number;
  resources: ResourceStock;
  maxResources: ResourceStock;
  survivors: Survivor[];
  upgrades: Record<ShelterUpgradeId, ShelterUpgradeState>;
  activeExpedition: ExpeditionState | null;
  lastMorningReport: MorningReport | null;
  lastNightReport: NightReport | null;
  history: LogEntry[];
  stats: CampaignStats;
  updatedAt: string;
}
