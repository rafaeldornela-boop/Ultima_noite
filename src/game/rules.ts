import { EVENT_CARDS_BY_ID, getCardsForLocation } from '../data/cards.ts';
import { LOCATIONS } from '../data/locations.ts';
import {
  DEFAULT_MAX_RESOURCES,
  EQUIPMENT_CATALOG,
  INITIAL_RESOURCES,
  RESOURCE_ORDER,
  RESOURCES_META,
} from '../data/resources.ts';
import { cloneInitialSurvivors } from '../data/survivors.ts';
import { SHELTER_UPGRADES, UPGRADE_ORDER } from '../data/upgrades.ts';
import {
  type AttributeType,
  CAMPAIGN_SCHEMA_VERSION,
  type CampaignState,
  type CardOptionOutcome,
  type CardResolutionFeedback,
  type CyclePhase,
  type EquipmentId,
  type EventCard,
  type EventCardOption,
  type InjuryState,
  type LocationId,
  type LogEntry,
  type ResourceStock,
  type ResourceType,
  type ShelterUpgradeId,
  type Survivor,
} from './types.ts';

function createEmptyResourceStock(): ResourceStock {
  return {
    comida: 0,
    medicamentos: 0,
    materiais: 0,
    ferramentas: 0,
    municao: 0,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function appendLog(
  history: LogEntry[],
  day: number,
  phase: CyclePhase,
  text: string,
  type: LogEntry['type'] = 'info'
): LogEntry[] {
  const entry: LogEntry = {
    id: `log_${day}_${phase}_${history.length + 1}`,
    day,
    phase,
    text,
    type,
  };
  return [entry, ...history].slice(0, 50);
}

export function createInitialCampaign(): CampaignState {
  const initialState: CampaignState = {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    campaignId: `camp_${Date.now()}`,
    day: 1,
    phase: 'manha',
    morningProcessedForDay: 0,
    resources: { ...INITIAL_RESOURCES },
    maxResources: { ...DEFAULT_MAX_RESOURCES },
    survivors: cloneInitialSurvivors(),
    upgrades: {
      barricadas: { id: 'barricadas', level: 0, maxLevel: 1 },
      enfermaria: { id: 'enfermaria', level: 0, maxLevel: 1 },
      oficina: { id: 'oficina', level: 0, maxLevel: 1 },
    },
    activeExpedition: null,
    lastMorningReport: null,
    lastNightReport: null,
    history: [
      {
        id: 'log_init_1',
        day: 1,
        phase: 'manha',
        text: 'Dia 1: O grupo trancou os portões do abrigo improvisado. Os suprimentos são escassos.',
        type: 'info',
      },
    ],
    stats: {
      expeditionsCompleted: 0,
      cardsResolved: 0,
      zombiesNeutralized: 0,
      totalResourcesLooted: 0,
    },
    updatedAt: new Date().toISOString(),
  };

  return consumeDailyFood(initialState);
}

export function getLivingSurvivors(state: CampaignState): Survivor[] {
  return state.survivors.filter((s) => s.injury !== 'morto' && s.health > 0);
}

export function getAvailableSurvivorsForExpedition(state: CampaignState): Survivor[] {
  return state.survivors.filter(
    (s) => s.injury !== 'morto' && s.health > 0 && s.available
  );
}

export function applyDamageToSurvivor(
  survivor: Survivor,
  rawDamage: number,
  inflictInjury = false
): { survivor: Survivor; actualDamage: number; died: boolean; injured: boolean } {
  if (survivor.injury === 'morto' || survivor.health <= 0) {
    return {
      survivor: { ...survivor, health: 0, injury: 'morto', available: false },
      actualDamage: 0,
      died: false,
      injured: false,
    };
  }

  const damage = Math.max(0, Math.floor(rawDamage));
  const nextHealth = clampInt(survivor.health - damage, 0, survivor.maxHealth);

  if (nextHealth <= 0) {
    return {
      survivor: {
        ...survivor,
        health: 0,
        injury: 'morto',
        available: false,
      },
      actualDamage: survivor.health,
      died: true,
      injured: false,
    };
  }

  let nextInjury: InjuryState = survivor.injury;
  let becameInjured = false;

  if (nextHealth <= 35) {
    if (survivor.injury !== 'grave') becameInjured = true;
    nextInjury = 'grave';
  } else if (inflictInjury || nextHealth <= 70) {
    if (survivor.injury === 'saudavel') {
      nextInjury = 'ferido';
      becameInjured = true;
    } else if (inflictInjury && survivor.injury === 'ferido' && damage >= 25) {
      nextInjury = 'grave';
      becameInjured = true;
    }
  }

  return {
    survivor: {
      ...survivor,
      health: nextHealth,
      injury: nextInjury,
      available: nextHealth > 0,
    },
    actualDamage: survivor.health - nextHealth,
    died: false,
    injured: becameInjured,
  };
}

export function checkDefeatCondition(state: CampaignState): CampaignState {
  const living = getLivingSurvivors(state);
  if (living.length === 0 && state.phase !== 'derrota') {
    return {
      ...state,
      phase: 'derrota',
      history: appendLog(
        state.history,
        state.day,
        'derrota',
        'Todos os sobreviventes do abrigo pereceram. A campanha chegou ao fim.',
        'danger'
      ),
      updatedAt: new Date().toISOString(),
    };
  }
  return state;
}

export function consumeDailyFood(state: CampaignState): CampaignState {
  if (state.phase === 'derrota') return state;
  // Prevent duplicate food consumption on the same day
  if (state.morningProcessedForDay === state.day) {
    return state;
  }

  const living = getLivingSurvivors(state);
  const foodNeeded = living.length;
  const availableFood = Math.max(0, state.resources.comida);
  const foodConsumed = Math.min(foodNeeded, availableFood);
  const deficit = Math.max(0, foodNeeded - foodConsumed);
  const starvationOccurred = deficit > 0;

  const nextResources: ResourceStock = {
    ...state.resources,
    comida: clampInt(availableFood - foodConsumed, 0, state.maxResources.comida),
  };

  const injuriesWorsened: string[] = [];
  const nextSurvivors = state.survivors.map((surv) => {
    if (surv.injury === 'morto' || surv.health <= 0) {
      return { ...surv, health: 0, injury: 'morto' as const, available: false };
    }

    let updated = { ...surv };

    if (starvationOccurred) {
      // High resistencia mitigates part of starvation damage
      const hungerDamage = updated.attributes.resistencia >= 4 ? 12 : 18;
      const dmgResult = applyDamageToSurvivor(updated, hungerDamage, true);
      updated = dmgResult.survivor;
      if (dmgResult.died) {
        injuriesWorsened.push(`${updated.name} não resistiu à inanição e morreu.`);
      } else {
        injuriesWorsened.push(`${updated.name} perdeu ${dmgResult.actualDamage} PV por falta de comida.`);
      }
    } else if (updated.injury === 'grave') {
      // Untreated severe injury bleeds slightly overnight/morning
      const bleedResult = applyDamageToSurvivor(updated, 8, false);
      updated = bleedResult.survivor;
      if (bleedResult.died) {
        injuriesWorsened.push(`${updated.name} sucumbiu ao ferimento grave não tratado.`);
      } else {
        injuriesWorsened.push(`${updated.name} perdeu 8 PV devido ao ferimento grave sem tratamento.`);
      }
    }

    return updated;
  });

  const summary = starvationOccurred
    ? `Rações insuficientes (${foodConsumed}/${foodNeeded} Comida). O grupo sofreu com a fome severa.`
    : `O grupo consumiu ${foodConsumed} unidade(s) de Comida. Todos foram alimentados.`;

  let nextHistory = appendLog(
    state.history,
    state.day,
    'manha',
    `Manhã do Dia ${state.day}: ${summary}`,
    starvationOccurred ? 'danger' : 'info'
  );

  for (const msg of injuriesWorsened) {
    nextHistory = appendLog(nextHistory, state.day, 'manha', msg, 'warning');
  }

  const nextState: CampaignState = {
    ...state,
    morningProcessedForDay: state.day,
    resources: nextResources,
    survivors: nextSurvivors,
    lastMorningReport: {
      day: state.day,
      foodNeeded,
      foodConsumed,
      starvationOccurred,
      injuriesWorsened,
      summary,
    },
    history: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  return checkDefeatCondition(nextState);
}

export function advanceToPreparation(state: CampaignState): CampaignState {
  const afterMorning = consumeDailyFood(state);
  if (afterMorning.phase === 'derrota') return afterMorning;
  if (afterMorning.phase !== 'manha') return afterMorning;

  return {
    ...afterMorning,
    phase: 'preparacao',
    updatedAt: new Date().toISOString(),
  };
}

export function healSurvivor(state: CampaignState, survivorId: string): CampaignState {
  if (state.resources.medicamentos < 1) {
    return state;
  }

  const target = state.survivors.find((s) => s.id === survivorId);
  if (!target || target.injury === 'morto' || target.health <= 0) {
    return state;
  }

  if (target.health >= target.maxHealth && target.injury === 'saudavel') {
    return state;
  }

  const hasInfirmary = state.upgrades.enfermaria.level > 0;
  const healAmount = hasInfirmary ? 50 : 30;
  const nextHealth = clampInt(target.health + healAmount, 1, target.maxHealth);

  let nextInjury: InjuryState = 'saudavel';
  if (!hasInfirmary && target.injury === 'grave' && nextHealth < 80) {
    nextInjury = 'ferido';
  }

  const nextSurvivors = state.survivors.map((s) =>
    s.id === survivorId
      ? {
          ...s,
          health: nextHealth,
          injury: nextInjury,
        }
      : s
  );

  const nextResources: ResourceStock = {
    ...state.resources,
    medicamentos: Math.max(0, state.resources.medicamentos - 1),
  };

  return {
    ...state,
    resources: nextResources,
    survivors: nextSurvivors,
    history: appendLog(
      state.history,
      state.day,
      state.phase,
      `${target.name} recebeu tratamento médico (+${nextHealth - target.health} PV, estado: ${
        nextInjury === 'saudavel' ? 'Saudável' : 'Ferido'
      }).`,
      'success'
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function canAffordUpgrade(
  state: CampaignState,
  upgradeId: ShelterUpgradeId
): { canBuild: boolean; reason?: string } {
  const upgradeState = state.upgrades[upgradeId];
  const upgradeDef = SHELTER_UPGRADES[upgradeId];

  if (!upgradeState || !upgradeDef) {
    return { canBuild: false, reason: 'Melhoria inválida.' };
  }

  if (upgradeState.level >= upgradeState.maxLevel) {
    return { canBuild: false, reason: 'Melhoria já construída no abrigo.' };
  }

  for (const resKey of RESOURCE_ORDER) {
    const required = upgradeDef.cost[resKey] ?? 0;
    if (required > 0 && state.resources[resKey] < required) {
      return {
        canBuild: false,
        reason: `Recursos insuficientes: requer ${required} ${RESOURCES_META[resKey].name}.`,
      };
    }
  }

  return { canBuild: true };
}

export function buildUpgrade(
  state: CampaignState,
  upgradeId: ShelterUpgradeId
): CampaignState {
  const check = canAffordUpgrade(state, upgradeId);
  if (!check.canBuild) {
    return state;
  }

  const upgradeDef = SHELTER_UPGRADES[upgradeId];
  const nextResources: ResourceStock = { ...state.resources };

  for (const resKey of RESOURCE_ORDER) {
    const cost = upgradeDef.cost[resKey] ?? 0;
    if (cost > 0) {
      nextResources[resKey] = clampInt(
        nextResources[resKey] - cost,
        0,
        state.maxResources[resKey]
      );
    }
  }

  const nextUpgrades = {
    ...state.upgrades,
    [upgradeId]: {
      ...state.upgrades[upgradeId],
      level: state.upgrades[upgradeId].level + 1,
    },
  };

  return {
    ...state,
    resources: nextResources,
    upgrades: nextUpgrades,
    history: appendLog(
      state.history,
      state.day,
      state.phase,
      `Melhoria concluída no abrigo: ${upgradeDef.name}.`,
      'success'
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function calculateBackpackCapacity(
  state: CampaignState,
  teamIds: string[],
  equipmentIds: EquipmentId[] = []
): number {
  const selectedSurvivors = state.survivors.filter(
    (s) => teamIds.includes(s.id) && s.injury !== 'morto' && s.health > 0
  );

  if (selectedSurvivors.length === 0) return 0;

  const baseCapacity = 8;
  const resistanceBonus = selectedSurvivors.reduce(
    (sum, surv) => sum + surv.attributes.resistencia * 2,
    0
  );
  const workshopBonus = state.upgrades.oficina.level > 0 ? 6 : 0;
  const equipmentBonus = equipmentIds.reduce(
    (sum, eqId) => sum + (EQUIPMENT_CATALOG[eqId]?.capacityBonus ?? 0),
    0
  );

  return baseCapacity + resistanceBonus + workshopBonus + equipmentBonus;
}

export function calculateBackpackWeight(loot: Partial<ResourceStock>): number {
  let totalWeight = 0;
  for (const key of RESOURCE_ORDER) {
    const qty = Math.max(0, Math.floor(loot[key] ?? 0));
    totalWeight += qty * RESOURCES_META[key].unitWeight;
  }
  return totalWeight;
}

export function addLootWithCapacity(
  currentLoot: ResourceStock,
  incomingLoot: Partial<ResourceStock>,
  maxCapacity: number
): {
  updatedLoot: ResourceStock;
  added: Partial<ResourceStock>;
  discarded: Partial<ResourceStock>;
  newWeight: number;
} {
  const updatedLoot: ResourceStock = { ...currentLoot };
  const added: Partial<ResourceStock> = {};
  const discarded: Partial<ResourceStock> = {};

  let currentWeight = calculateBackpackWeight(updatedLoot);

  for (const resKey of RESOURCE_ORDER) {
    const rawToAdd = Math.max(0, Math.floor(incomingLoot[resKey] ?? 0));
    if (rawToAdd === 0) continue;

    const unitWeight = RESOURCES_META[resKey].unitWeight;
    let addedCount = 0;
    let discardedCount = 0;

    for (let i = 0; i < rawToAdd; i++) {
      if (currentWeight + unitWeight <= maxCapacity) {
        updatedLoot[resKey] += 1;
        currentWeight += unitWeight;
        addedCount += 1;
      } else {
        discardedCount += 1;
      }
    }

    if (addedCount > 0) added[resKey] = addedCount;
    if (discardedCount > 0) discarded[resKey] = discardedCount;
  }

  return {
    updatedLoot,
    added,
    discarded,
    newWeight: currentWeight,
  };
}

export function getTeamAttributeScore(
  state: CampaignState,
  teamIds: string[],
  equipmentIds: EquipmentId[],
  attribute: AttributeType
): number {
  const livingTeam = state.survivors.filter(
    (s) => teamIds.includes(s.id) && s.injury !== 'morto' && s.health > 0
  );
  if (livingTeam.length === 0) return 0;

  const sortedByAttr = [...livingTeam].sort(
    (a, b) => b.attributes[attribute] - a.attributes[attribute]
  );
  const leader = sortedByAttr[0];
  let score = leader.attributes[attribute];

  // Assistance bonus if there is a second team member with decent skill
  if (sortedByAttr.length > 1 && sortedByAttr[1].attributes[attribute] >= 3) {
    score += 1;
  }

  // Equipment bonus
  for (const eqId of equipmentIds) {
    const eq = EQUIPMENT_CATALOG[eqId];
    if (!eq || eq.bonusAttribute !== attribute) continue;

    if (eq.requiresResource) {
      const available = state.resources[eq.requiresResource.type];
      if (available < eq.requiresResource.amount) continue;
    }
    score += eq.bonusAmount;
  }

  // Shelter Workshop passive bonus to tecnica
  if (attribute === 'tecnica' && state.upgrades.oficina.level > 0) {
    score += 1;
  }

  // Injury penalty on lead performer
  if (leader.injury === 'ferido') {
    score -= 1;
  } else if (leader.injury === 'grave') {
    score -= 2;
  }

  return Math.max(1, score);
}

export function canEquipItem(state: CampaignState, equipmentId: EquipmentId): boolean {
  const eq = EQUIPMENT_CATALOG[equipmentId];
  if (!eq) return false;
  if (!eq.requiresResource) return true;
  return state.resources[eq.requiresResource.type] >= eq.requiresResource.amount;
}

export function startExpedition(
  state: CampaignState,
  locationId: LocationId,
  teamIds: string[],
  equipmentIds: EquipmentId[] = []
): CampaignState {
  // Ensure morning phase is already transitioned if called directly
  const baseState = state.phase === 'manha' ? advanceToPreparation(state) : state;
  if (baseState.phase !== 'preparacao') {
    return baseState;
  }

  const location = LOCATIONS[locationId];
  if (!location) return baseState;

  const validTeam = baseState.survivors.filter(
    (s) => teamIds.includes(s.id) && s.injury !== 'morto' && s.health > 0 && s.available
  );

  if (validTeam.length === 0 || validTeam.length > 3) {
    return baseState;
  }

  const validTeamIds = validTeam.map((s) => s.id);
  const validEquipment = equipmentIds.filter((eqId) => canEquipItem(baseState, eqId));

  // Build non-repeating deck for this location
  const pool = getCardsForLocation(locationId);
  const rotatedPool = [...pool].sort((a, b) => {
    // Deterministic rotation by day + location so runs vary without repeating cards in the same run
    const hashA = (a.id.charCodeAt(5) + baseState.day * 7) % 13;
    const hashB = (b.id.charCodeAt(5) + baseState.day * 7) % 13;
    return hashA - hashB;
  });

  const deckCardIds = rotatedPool
    .slice(0, Math.min(location.expeditionLength, rotatedPool.length))
    .map((c) => c.id);

  const maxBackpackCapacity = calculateBackpackCapacity(
    baseState,
    validTeamIds,
    validEquipment
  );

  const expeditionId = `exp_d${baseState.day}_${locationId}`;

  return {
    ...baseState,
    phase: 'expedicao',
    activeExpedition: {
      id: expeditionId,
      locationId,
      teamIds: validTeamIds,
      equipmentIds: validEquipment,
      status: 'em_andamento',
      deckCardIds,
      usedCardIds: [],
      currentCardIndex: 0,
      backpackLoot: createEmptyResourceStock(),
      maxBackpackCapacity,
      currentBackpackWeight: 0,
      rewardsClaimed: false,
      lastResolution: null,
      log: [
        `Equipe (${validTeam.map((s) => s.name).join(', ')}) iniciou expedição em ${location.name}.`,
      ],
    },
    history: appendLog(
      baseState.history,
      baseState.day,
      'expedicao',
      `Expedição iniciada para ${location.name} com ${validTeam.map((s) => s.name).join(', ')}.`,
      'info'
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function getCurrentExpeditionCard(state: CampaignState): EventCard | null {
  const exp = state.activeExpedition;
  if (!exp || exp.status !== 'em_andamento') return null;
  const cardId = exp.deckCardIds[exp.currentCardIndex];
  if (!cardId) return null;
  return EVENT_CARDS_BY_ID[cardId] ?? null;
}

export function canSelectCardOption(
  state: CampaignState,
  option: EventCardOption
): { allowed: boolean; reason?: string } {
  const req = option.requirements;
  if (!req) return { allowed: true };

  if (req.resource && req.amount) {
    const inShelter = state.resources[req.resource] ?? 0;
    const inBackpack = state.activeExpedition?.backpackLoot[req.resource] ?? 0;
    if (inShelter + inBackpack < req.amount) {
      return {
        allowed: false,
        reason: `Requer ${req.amount} ${RESOURCES_META[req.resource].name}.`,
      };
    }
  }

  if (req.requiredEquipment && state.activeExpedition) {
    if (!state.activeExpedition.equipmentIds.includes(req.requiredEquipment)) {
      return {
        allowed: false,
        reason: `Requer equipamento: ${EQUIPMENT_CATALOG[req.requiredEquipment].name}.`,
      };
    }
  }

  if (req.minAttribute && state.activeExpedition) {
    const score = getTeamAttributeScore(
      state,
      state.activeExpedition.teamIds,
      state.activeExpedition.equipmentIds,
      req.minAttribute.attribute
    );
    if (score < req.minAttribute.value) {
      return {
        allowed: false,
        reason: `Requer ${req.minAttribute.value} em ${req.minAttribute.attribute}.`,
      };
    }
  }

  return { allowed: true };
}

export function resolveCardOption(
  state: CampaignState,
  optionId: string,
  modifierOverride?: number
): CampaignState {
  const exp = state.activeExpedition;
  if (!exp || state.phase !== 'expedicao' || exp.status !== 'em_andamento') {
    return state;
  }

  const card = getCurrentExpeditionCard(state);
  if (!card) return state;

  // Prevent resolving the same card twice in the same expedition
  if (exp.usedCardIds.includes(card.id)) {
    return state;
  }

  const option = card.options.find((o) => o.id === optionId);
  if (!option) return state;

  const eligibility = canSelectCardOption(state, option);
  if (!eligibility.allowed) {
    return state;
  }

  const nextResources: ResourceStock = { ...state.resources };
  let nextBackpackLoot: ResourceStock = { ...exp.backpackLoot };

  // Consume required resource if specified (prioritizing shelter stock, then backpack)
  if (
    option.requirements?.resource &&
    option.requirements.amount &&
    option.requirements.consumeResource
  ) {
    const resType = option.requirements.resource;
    let remainingToConsume = option.requirements.amount;

    const fromShelter = Math.min(nextResources[resType], remainingToConsume);
    nextResources[resType] -= fromShelter;
    remainingToConsume -= fromShelter;

    if (remainingToConsume > 0) {
      nextBackpackLoot[resType] = Math.max(
        0,
        nextBackpackLoot[resType] - remainingToConsume
      );
    }
  }

  // Evaluate attribute check if applicable
  let succeeded = true;
  let attributeScore: number | undefined;

  if (option.testedAttribute && option.difficulty !== undefined) {
    attributeScore = getTeamAttributeScore(
      state,
      exp.teamIds,
      exp.equipmentIds,
      option.testedAttribute
    );

    // Controlled situational modifier so high attributes are strong but never unconditionally invulnerable on reckless choices
    const situationalModifier =
      modifierOverride !== undefined
        ? modifierOverride
        : option.risk === 'Alto' || option.risk === 'Crítico'
        ? -1
        : 0;

    const totalScore = attributeScore + situationalModifier;
    succeeded = totalScore >= option.difficulty;
  }

  const outcome: CardOptionOutcome =
    succeeded || !option.failureOutcome ? option.successOutcome : option.failureOutcome;

  // Apply damage to team members
  const hasTraumaKit = exp.equipmentIds.includes('kit_primeiros_socorros');
  const damageMitigation = hasTraumaKit ? 5 : 0;

  const damageTakenReport: CardResolutionFeedback['damageTaken'] = [];
  const livingTeamIds = exp.teamIds.filter((id) => {
    const s = state.survivors.find((surv) => surv.id === id);
    return s && s.injury !== 'morto' && s.health > 0;
  });
  const leaderId = livingTeamIds[0];

  const nextSurvivors = state.survivors.map((surv) => {
    if (!livingTeamIds.includes(surv.id)) return surv;

    let rawDmg = 0;
    if (outcome.damageAll && outcome.damageAll > 0) {
      rawDmg += Math.max(5, outcome.damageAll - damageMitigation);
    }
    if (outcome.damageLeader && outcome.damageLeader > 0 && surv.id === leaderId) {
      rawDmg += Math.max(5, outcome.damageLeader - damageMitigation);
    }

    if (rawDmg <= 0) return surv;

    const res = applyDamageToSurvivor(surv, rawDmg, Boolean(outcome.inflictInjury));
    damageTakenReport.push({
      survivorName: surv.name,
      amount: res.actualDamage,
      died: res.died,
      injured: res.injured,
    });
    return res.survivor;
  });

  // Check if any team members are still alive to carry loot
  const remainingLivingTeam = nextSurvivors.filter(
    (s) => exp.teamIds.includes(s.id) && s.injury !== 'morto' && s.health > 0
  );

  // Recalculate backpack capacity based on surviving team members
  const updatedMaxCapacity = calculateBackpackCapacity(
    { ...state, survivors: nextSurvivors },
    exp.teamIds,
    exp.equipmentIds
  );

  let lootAdded: Partial<ResourceStock> = {};
  let lootDiscarded: Partial<ResourceStock> = {};
  let nextWeight = calculateBackpackWeight(nextBackpackLoot);

  if (outcome.loot && remainingLivingTeam.length > 0) {
    const lootRes = addLootWithCapacity(
      nextBackpackLoot,
      outcome.loot,
      updatedMaxCapacity
    );
    nextBackpackLoot = lootRes.updatedLoot;
    lootAdded = lootRes.added;
    lootDiscarded = lootRes.discarded;
    nextWeight = lootRes.newWeight;
  }

  const nextUsedCardIds = [...exp.usedCardIds, card.id];
  const nextCardIndex = exp.currentCardIndex + 1;
  const reachedEndOfDeck = nextCardIndex >= exp.deckCardIds.length;
  const teamWipedOut = remainingLivingTeam.length === 0;
  const shouldRetreat = Boolean(option.isRetreatOption || outcome.triggerRetreat);

  let nextExpeditionStatus: CampaignState['activeExpedition'] extends infer T
    ? T extends { status: infer S }
      ? S
      : never
    : never = exp.status;
  let nextPhase: CyclePhase = state.phase;

  if (teamWipedOut) {
    nextExpeditionStatus = 'abandonada';
    nextPhase = 'retorno';
    // If entire expedition team died, their carried backpack stays behind
    nextBackpackLoot = createEmptyResourceStock();
    nextWeight = 0;
  } else if (shouldRetreat) {
    nextExpeditionStatus = 'abandonada';
    nextPhase = 'retorno';
  } else if (reachedEndOfDeck) {
    nextExpeditionStatus = 'concluida';
    nextPhase = 'retorno';
  }

  const feedback: CardResolutionFeedback = {
    cardId: card.id,
    cardTitle: card.title,
    optionLabel: option.label,
    succeeded,
    narrative: outcome.narrative,
    testedAttribute: option.testedAttribute,
    attributeScore,
    lootAdded,
    lootDiscarded,
    damageTaken: damageTakenReport,
  };

  let nextHistory = appendLog(
    state.history,
    state.day,
    'expedicao',
    `[${card.title}] ${option.label}: ${outcome.narrative}`,
    succeeded ? 'info' : 'warning'
  );

  for (const dmg of damageTakenReport) {
    if (dmg.died) {
      nextHistory = appendLog(
        nextHistory,
        state.day,
        'expedicao',
        `MORTE PERMANENTE: ${dmg.survivorName} caiu durante a expedição.`,
        'danger'
      );
    }
  }

  const nextState: CampaignState = {
    ...state,
    phase: nextPhase,
    resources: nextResources,
    survivors: nextSurvivors,
    activeExpedition: {
      ...exp,
      status: nextExpeditionStatus,
      usedCardIds: nextUsedCardIds,
      currentCardIndex: nextCardIndex,
      backpackLoot: nextBackpackLoot,
      maxBackpackCapacity: updatedMaxCapacity,
      currentBackpackWeight: nextWeight,
      lastResolution: feedback,
      log: [`${card.title}: ${outcome.narrative}`, ...exp.log],
    },
    stats: {
      ...state.stats,
      cardsResolved: state.stats.cardsResolved + 1,
      zombiesNeutralized:
        state.stats.zombiesNeutralized +
        (option.testedAttribute === 'combate' && succeeded ? 2 : 0),
    },
    history: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  return checkDefeatCondition(nextState);
}

export function retreatFromExpedition(state: CampaignState): CampaignState {
  const exp = state.activeExpedition;
  if (!exp || state.phase !== 'expedicao' || exp.status !== 'em_andamento') {
    return state;
  }

  return {
    ...state,
    phase: 'retorno',
    activeExpedition: {
      ...exp,
      status: 'abandonada',
      log: ['A equipe decidiu recuar antecipadamente para preservar os sobreviventes.', ...exp.log],
    },
    history: appendLog(
      state.history,
      state.day,
      'retorno',
      'A equipe abortou o restante da rota e iniciou o retorno ao abrigo.',
      'warning'
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function concludeExpeditionReturn(state: CampaignState): CampaignState {
  const exp = state.activeExpedition;
  if (!exp) return state;

  // Idempotency guard: prevent duplicate reward incorporation if clicked multiple times
  if (exp.rewardsClaimed || exp.status === 'processada' || state.phase === 'novo_dia') {
    return state;
  }

  const nextResources: ResourceStock = { ...state.resources };
  let totalAddedCount = 0;
  const addedSummaryParts: string[] = [];

  for (const resKey of RESOURCE_ORDER) {
    const qty = Math.max(0, Math.floor(exp.backpackLoot[resKey] ?? 0));
    if (qty > 0) {
      const before = nextResources[resKey];
      nextResources[resKey] = clampInt(
        before + qty,
        0,
        state.maxResources[resKey]
      );
      const actualAdded = nextResources[resKey] - before;
      totalAddedCount += actualAdded;
      addedSummaryParts.push(`+${actualAdded} ${RESOURCES_META[resKey].name}`);
    }
  }

  const lootSummary =
    addedSummaryParts.length > 0
      ? `Recursos guardados no abrigo: ${addedSummaryParts.join(', ')}.`
      : 'A equipe retornou ao abrigo sem novos recursos na mochila.';

  return {
    ...state,
    phase: 'novo_dia',
    resources: nextResources,
    activeExpedition: {
      ...exp,
      status: 'processada',
      rewardsClaimed: true,
    },
    stats: {
      ...state.stats,
      expeditionsCompleted: state.stats.expeditionsCompleted + 1,
      totalResourcesLooted: state.stats.totalResourcesLooted + totalAddedCount,
    },
    history: appendLog(
      state.history,
      state.day,
      'retorno',
      `Retorno concluído. ${lootSummary}`,
      totalAddedCount > 0 ? 'success' : 'info'
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function advanceToNextDay(state: CampaignState): CampaignState {
  if (state.phase === 'derrota') return state;

  // If the player hasn't claimed expedition return yet, process it first
  const baseState =
    state.phase === 'retorno' ? concludeExpeditionReturn(state) : state;

  if (baseState.phase !== 'novo_dia') {
    return baseState;
  }

  const nextDay = baseState.day + 1;
  const hasBarricades = baseState.upgrades.barricadas.level > 0;
  const nextResources: ResourceStock = { ...baseState.resources };
  let nextSurvivors = [...baseState.survivors];
  const damageMessages: string[] = [];
  const resourcesLost: Partial<ResourceStock> = {};

  let eventTitle = 'Noite Silenciosa no Abrigo';
  let eventDescription =
    'Os turnos de vigília transcorreram sem invasões. O grupo conseguiu descansar.';

  if (hasBarricades) {
    eventTitle = 'Perímetro Protegido pelas Barricadas';
    eventDescription =
      'Errantes arranharam as chapas metálicas durante a madrugada, mas as Barricadas Reforçadas impediram qualquer brecha.';
  } else if (baseState.day % 2 === 1) {
    eventTitle = 'Incursão Noturna nas Janelas Térreas';
    eventDescription =
      'Sem Barricadas Reforçadas, infectados forçaram os tapumes durante a madrugada. A equipe precisou contê-los às pressas.';

    if (nextResources.materiais > 0) {
      nextResources.materiais = Math.max(0, nextResources.materiais - 1);
      resourcesLost.materiais = 1;
    } else {
      const living = nextSurvivors.filter((s) => s.injury !== 'morto' && s.health > 0);
      if (living.length > 0) {
        const guard = living[0];
        const dmg = applyDamageToSurvivor(guard, 12, false);
        nextSurvivors = nextSurvivors.map((s) =>
          s.id === guard.id ? dmg.survivor : s
        );
        damageMessages.push(
          `${guard.name} sofreu ${dmg.actualDamage} PV defendendo o abrigo à noite.`
        );
      }
    }
  }

  let nextHistory = appendLog(
    baseState.history,
    baseState.day,
    'novo_dia',
    `Noite do Dia ${baseState.day} (${eventTitle}): ${eventDescription}`,
    hasBarricades ? 'success' : 'warning'
  );

  for (const msg of damageMessages) {
    nextHistory = appendLog(nextHistory, baseState.day, 'novo_dia', msg, 'danger');
  }

  const transitionedState: CampaignState = {
    ...baseState,
    day: nextDay,
    phase: 'manha',
    resources: nextResources,
    survivors: nextSurvivors,
    activeExpedition: null,
    lastNightReport: {
      day: baseState.day,
      eventTitle,
      eventDescription,
      damageTaken: damageMessages,
      resourcesLost,
    },
    history: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  const afterDefeatCheck = checkDefeatCondition(transitionedState);
  if (afterDefeatCheck.phase === 'derrota') {
    return afterDefeatCheck;
  }

  return consumeDailyFood(afterDefeatCheck);
}

export function validateAndMigrateCampaign(raw: unknown): CampaignState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.day !== 'number' || candidate.day < 1) {
    return null;
  }

  const validPhases: CyclePhase[] = [
    'manha',
    'preparacao',
    'expedicao',
    'retorno',
    'novo_dia',
    'derrota',
  ];
  const phase = validPhases.includes(candidate.phase as CyclePhase)
    ? (candidate.phase as CyclePhase)
    : 'manha';

  if (!Array.isArray(candidate.survivors) || candidate.survivors.length === 0) {
    return null;
  }

  const rawResources = (candidate.resources ?? {}) as Record<string, unknown>;
  const rawMaxResources = (candidate.maxResources ?? DEFAULT_MAX_RESOURCES) as Record<
    string,
    unknown
  >;

  const maxResources: ResourceStock = { ...DEFAULT_MAX_RESOURCES };
  for (const key of RESOURCE_ORDER) {
    if (typeof rawMaxResources[key] === 'number' && rawMaxResources[key] > 0) {
      maxResources[key] = Math.floor(rawMaxResources[key] as number);
    }
  }

  const resources: ResourceStock = createEmptyResourceStock();
  for (const key of RESOURCE_ORDER) {
    const val = typeof rawResources[key] === 'number' ? (rawResources[key] as number) : 0;
    resources[key] = clampInt(val, 0, maxResources[key]);
  }

  const sanitizedSurvivors: Survivor[] = [];
  for (const item of candidate.survivors) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    if (typeof s.id !== 'string' || typeof s.name !== 'string') continue;

    const maxHealth =
      typeof s.maxHealth === 'number' && s.maxHealth > 0 ? Math.floor(s.maxHealth) : 100;
    const rawHealth = typeof s.health === 'number' ? Math.floor(s.health) : maxHealth;
    const rawInjury = s.injury as InjuryState;
    const isDead = rawInjury === 'morto' || rawHealth <= 0;

    const attrs = (s.attributes ?? {}) as Record<string, unknown>;
    sanitizedSurvivors.push({
      id: s.id,
      name: s.name,
      role: typeof s.role === 'string' ? s.role : 'Sobrevivente',
      bio: typeof s.bio === 'string' ? s.bio : '',
      portraitId:
        s.portraitId === 'helena' ||
        s.portraitId === 'marcos' ||
        s.portraitId === 'caio' ||
        s.portraitId === 'elena'
          ? s.portraitId
          : 'helena',
      attributes: {
        combate: clampInt(Number(attrs.combate ?? 2), 1, 5),
        percepcao: clampInt(Number(attrs.percepcao ?? 2), 1, 5),
        tecnica: clampInt(Number(attrs.tecnica ?? 2), 1, 5),
        resistencia: clampInt(Number(attrs.resistencia ?? 2), 1, 5),
      },
      health: isDead ? 0 : clampInt(rawHealth, 1, maxHealth),
      maxHealth,
      injury: isDead
        ? 'morto'
        : rawInjury === 'ferido' || rawInjury === 'grave'
        ? rawInjury
        : 'saudavel',
      available: isDead ? false : Boolean(s.available ?? true),
    });
  }

  if (sanitizedSurvivors.length === 0) return null;

  const rawUpgrades = (candidate.upgrades ?? {}) as Record<string, unknown>;
  const upgrades: CampaignState['upgrades'] = {
    barricadas: { id: 'barricadas', level: 0, maxLevel: 1 },
    enfermaria: { id: 'enfermaria', level: 0, maxLevel: 1 },
    oficina: { id: 'oficina', level: 0, maxLevel: 1 },
  };

  for (const upgKey of UPGRADE_ORDER) {
    const u = rawUpgrades[upgKey] as Record<string, unknown> | undefined;
    if (u && typeof u.level === 'number') {
      upgrades[upgKey] = {
        id: upgKey,
        level: clampInt(u.level, 0, 1),
        maxLevel: 1,
      };
    }
  }

  const migrated: CampaignState = {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    campaignId:
      typeof candidate.campaignId === 'string' ? candidate.campaignId : `camp_migrated`,
    day: Math.floor(candidate.day),
    phase,
    morningProcessedForDay:
      typeof candidate.morningProcessedForDay === 'number'
        ? Math.floor(candidate.morningProcessedForDay)
        : Math.floor(candidate.day),
    resources,
    maxResources,
    survivors: sanitizedSurvivors,
    upgrades,
    activeExpedition:
      candidate.activeExpedition && typeof candidate.activeExpedition === 'object'
        ? (candidate.activeExpedition as CampaignState['activeExpedition'])
        : null,
    lastMorningReport:
      candidate.lastMorningReport && typeof candidate.lastMorningReport === 'object'
        ? (candidate.lastMorningReport as CampaignState['lastMorningReport'])
        : null,
    lastNightReport:
      candidate.lastNightReport && typeof candidate.lastNightReport === 'object'
        ? (candidate.lastNightReport as CampaignState['lastNightReport'])
        : null,
    history: Array.isArray(candidate.history) ? (candidate.history as LogEntry[]) : [],
    stats:
      candidate.stats && typeof candidate.stats === 'object'
        ? (candidate.stats as CampaignState['stats'])
        : {
            expeditionsCompleted: 0,
            cardsResolved: 0,
            zombiesNeutralized: 0,
            totalResourcesLooted: 0,
          },
    updatedAt:
      typeof candidate.updatedAt === 'string'
        ? candidate.updatedAt
        : new Date().toISOString(),
  };

  // If phase is expedicao or retorno but activeExpedition is missing/corrupted, recover safely to preparacao
  if ((migrated.phase === 'expedicao' || migrated.phase === 'retorno') && !migrated.activeExpedition) {
    migrated.phase = 'preparacao';
  }

  return checkDefeatCondition(migrated);
}
