import { describe, expect, it } from 'vitest';
import {
  addLootWithCapacity,
  advanceToNextDay,
  advanceToPreparation,
  applyDamageToSurvivor,
  buildUpgrade,
  calculateBackpackCapacity,
  canAffordUpgrade,
  concludeExpeditionReturn,
  consumeDailyFood,
  createInitialCampaign,
  getCurrentExpeditionCard,
  healSurvivor,
  resolveCardOption,
  startExpedition,
} from '../src/game/rules.ts';
import {
  createMemoryStorageAdapter,
  loadCampaignState,
  resetCampaignState,
  saveCampaignState,
} from '../src/storage/campaignStorage.ts';

describe('Último Dia — Sobrevivência: Regras Principais e Persistência', () => {
  it('1. Inicializa uma nova campanha com 3 sobreviventes, 5 recursos e consumo matinal do Dia 1', () => {
    const state = createInitialCampaign();
    expect(state.day).toBe(1);
    expect(state.phase).toBe('manha');
    expect(state.survivors).toHaveLength(3);
    // 6 initial food - 3 consumed for 3 living survivors on Day 1 morning = 3
    expect(state.resources.comida).toBe(3);
    expect(state.resources.medicamentos).toBe(3);
    expect(state.resources.materiais).toBe(6);
    expect(state.resources.ferramentas).toBe(3);
    expect(state.resources.municao).toBe(4);
    expect(state.morningProcessedForDay).toBe(1);
  });

  it('2. Consome comida diariamente sem duplicar no mesmo dia e aplica fome sem recursos negativos', () => {
    let state = createInitialCampaign();
    const foodAfterMorning = state.resources.comida;

    // Calling consumeDailyFood again on the same day must not consume extra food
    state = consumeDailyFood(state);
    expect(state.resources.comida).toBe(foodAfterMorning);

    // Simulate Day 2 with only 1 food for 3 living survivors
    state = {
      ...state,
      day: 2,
      morningProcessedForDay: 1,
      resources: {
        ...state.resources,
        comida: 1,
      },
    };

    const starvedState = consumeDailyFood(state);
    expect(starvedState.resources.comida).toBe(0); // Never negative
    expect(starvedState.lastMorningReport?.starvationOccurred).toBe(true);
    // All survivors should have lost health from hunger
    for (const surv of starvedState.survivors) {
      expect(surv.health).toBeLessThan(100);
    }
  });

  it('3. Valida custos e constrói melhorias do abrigo corretamente', () => {
    let state = createInitialCampaign();
    // Barricadas requires 5 materiais and 2 ferramentas (initial has 6 materiais, 3 ferramentas)
    const checkBefore = canAffordUpgrade(state, 'barricadas');
    expect(checkBefore.canBuild).toBe(true);

    state = buildUpgrade(state, 'barricadas');
    expect(state.upgrades.barricadas.level).toBe(1);
    expect(state.resources.materiais).toBe(1);
    expect(state.resources.ferramentas).toBe(1);

    // Cannot build barricadas a second time
    const checkDuplicate = canAffordUpgrade(state, 'barricadas');
    expect(checkDuplicate.canBuild).toBe(false);

    // Cannot build oficina without enough resources (needs 5 materiais, 3 ferramentas)
    const checkOficina = canAffordUpgrade(state, 'oficina');
    expect(checkOficina.canBuild).toBe(false);
    const unchanged = buildUpgrade(state, 'oficina');
    expect(unchanged.upgrades.oficina.level).toBe(0);
  });

  it('4. Inicia expedição e resolve decisão de carta com consequências reais', () => {
    let state = createInitialCampaign();
    state = advanceToPreparation(state);
    expect(state.phase).toBe('preparacao');

    const teamIds = [state.survivors[0].id, state.survivors[1].id];
    state = startExpedition(state, 'supermercado', teamIds, ['pe_de_cabra']);
    expect(state.phase).toBe('expedicao');
    expect(state.activeExpedition).not.toBeNull();

    const firstCard = getCurrentExpeditionCard(state);
    expect(firstCard).not.toBeNull();

    const chosenOption = firstCard!.options[0];
    const resolvedState = resolveCardOption(state, chosenOption.id, 2);

    expect(resolvedState.activeExpedition?.usedCardIds).toContain(firstCard!.id);
    expect(resolvedState.activeExpedition?.currentCardIndex).toBe(1);
    expect(resolvedState.activeExpedition?.lastResolution?.cardId).toBe(firstCard!.id);
    expect(resolvedState.stats.cardsResolved).toBe(1);
  });

  it('5. Aplica ferimentos, tratamento médico e morte permanente irreversível', () => {
    let state = createInitialCampaign();
    const helena = state.survivors[0];

    // Inflict moderate injury
    const damaged = applyDamageToSurvivor(helena, 35, true);
    expect(damaged.survivor.health).toBe(65);
    expect(damaged.survivor.injury).toBe('ferido');
    expect(damaged.died).toBe(false);

    // Heal survivor using 1 medicamento
    state = {
      ...state,
      survivors: [damaged.survivor, state.survivors[1], state.survivors[2]],
    };
    const healedState = healSurvivor(state, helena.id);
    expect(healedState.resources.medicamentos).toBe(state.resources.medicamentos - 1);
    expect(healedState.survivors[0].health).toBe(95);
    expect(healedState.survivors[0].injury).toBe('saudavel');

    // Inflict lethal damage -> permanent death
    const lethal = applyDamageToSurvivor(healedState.survivors[0], 150, true);
    expect(lethal.died).toBe(true);
    expect(lethal.survivor.health).toBe(0);
    expect(lethal.survivor.injury).toBe('morto');
    expect(lethal.survivor.available).toBe(false);

    // Dead survivor cannot be healed
    const stateWithDead = {
      ...healedState,
      survivors: [lethal.survivor, healedState.survivors[1], healedState.survivors[2]],
    };
    const afterAttemptedHeal = healSurvivor(stateWithDead, helena.id);
    expect(afterAttemptedHeal.survivors[0].injury).toBe('morto');
    expect(afterAttemptedHeal.survivors[0].health).toBe(0);
    expect(afterAttemptedHeal.resources.medicamentos).toBe(stateWithDead.resources.medicamentos);
  });

  it('6. Respeita os limites da mochila e descarta excedentes além da capacidade', () => {
    const state = createInitialCampaign();
    const capacity = calculateBackpackCapacity(state, [state.survivors[2].id]);
    // Dr. Caio has resistencia = 2 -> base 8 + 2*2 = 12 capacity
    expect(capacity).toBe(12);

    const emptyBackpack = {
      comida: 0,
      medicamentos: 0,
      materiais: 0,
      ferramentas: 0,
      municao: 0,
    };

    // Add 5 materiais (weight 2 each = 10) + 4 comida (weight 1 each = 4) -> total 14 > 12
    const result = addLootWithCapacity(
      emptyBackpack,
      { materiais: 5, comida: 4 },
      capacity
    );

    expect(result.newWeight).toBeLessThanOrEqual(capacity);
    expect(result.newWeight).toBe(12);
    // comida is processed before materiais in RESOURCE_ORDER: 4 comida (weight 4) + 4 materiais (weight 8) = 12
    expect(result.updatedLoot.comida).toBe(4);
    expect(result.updatedLoot.materiais).toBe(4);
    expect(result.discarded.materiais).toBe(1);
  });

  it('7. Incorpora recompensas da expedição uma única vez (proteção contra duplicação)', () => {
    let state = createInitialCampaign();
    state = advanceToPreparation(state);
    state = startExpedition(state, 'supermercado', [state.survivors[0].id]);

    // Put 4 comida and 2 ferramentas in backpack and set to retorno
    state = {
      ...state,
      phase: 'retorno',
      activeExpedition: {
        ...state.activeExpedition!,
        status: 'concluida',
        backpackLoot: {
          comida: 4,
          medicamentos: 0,
          materiais: 0,
          ferramentas: 2,
          municao: 0,
        },
      },
    };

    const foodBefore = state.resources.comida;
    const toolsBefore = state.resources.ferramentas;

    const firstReturn = concludeExpeditionReturn(state);
    expect(firstReturn.resources.comida).toBe(foodBefore + 4);
    expect(firstReturn.resources.ferramentas).toBe(toolsBefore + 2);
    expect(firstReturn.phase).toBe('novo_dia');
    expect(firstReturn.activeExpedition?.rewardsClaimed).toBe(true);

    // Calling concludeExpeditionReturn again must NOT duplicate rewards
    const secondReturn = concludeExpeditionReturn(firstReturn);
    expect(secondReturn.resources.comida).toBe(foodBefore + 4);
    expect(secondReturn.resources.ferramentas).toBe(toolsBefore + 2);

    // Advancing to next day transitions cleanly to Day 2 morning
    const nextDayState = advanceToNextDay(secondReturn);
    expect(nextDayState.day).toBe(2);
    expect(nextDayState.phase).toBe('manha');
  });

  it('8. Salva, carrega e recupera campanha de dados corrompidos mantendo integridade', async () => {
    const adapter = createMemoryStorageAdapter();
    let state = createInitialCampaign();
    // Kill one survivor and advance state
    const deadHelena = applyDamageToSurvivor(state.survivors[0], 200, true).survivor;
    state = {
      ...state,
      day: 4,
      survivors: [deadHelena, state.survivors[1], state.survivors[2]],
      resources: {
        ...state.resources,
        municao: 9,
      },
    };

    const savedOk = await saveCampaignState(state, adapter);
    expect(savedOk).toBe(true);

    const loaded = await loadCampaignState(adapter);
    expect(loaded.hadSavedData).toBe(true);
    expect(loaded.recoveredFromError).toBe(false);
    expect(loaded.state.day).toBe(4);
    expect(loaded.state.resources.municao).toBe(9);
    // Dead character remains permanently dead after reload
    expect(loaded.state.survivors[0].injury).toBe('morto');
    expect(loaded.state.survivors[0].health).toBe(0);
    expect(loaded.state.survivors[0].available).toBe(false);

    // Corrupted JSON recovery test
    const corruptedAdapter = createMemoryStorageAdapter('{invalid_json:::');
    const recovered = await loadCampaignState(corruptedAdapter);
    expect(recovered.recoveredFromError).toBe(true);
    expect(recovered.state.day).toBe(1);
    expect(recovered.state.survivors).toHaveLength(3);

    // Reset campaign test
    const reset = await resetCampaignState(adapter);
    expect(reset.day).toBe(1);
    expect(reset.survivors[0].injury).toBe('saudavel');
  });
});
