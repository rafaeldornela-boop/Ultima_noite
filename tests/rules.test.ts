import assert from 'node:assert/strict';
import test from 'node:test';
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
  validateAndMigrateCampaign,
} from '../src/game/rules.ts';

test('1. Inicialização de campanha e consumo matinal de comida', () => {
  const state = createInitialCampaign();
  assert.equal(state.day, 1);
  assert.equal(state.phase, 'manha');
  assert.equal(state.survivors.length, 3);
  assert.equal(state.resources.comida, 3);
  assert.equal(state.morningProcessedForDay, 1);

  // Não duplica consumo no mesmo dia
  const again = consumeDailyFood(state);
  assert.equal(again.resources.comida, 3);
});

test('2. Construção de melhorias e validação de custos', () => {
  let state = createInitialCampaign();
  assert.equal(canAffordUpgrade(state, 'barricadas').canBuild, true);
  state = buildUpgrade(state, 'barricadas');
  assert.equal(state.upgrades.barricadas.level, 1);
  assert.equal(state.resources.materiais, 1);
  assert.equal(state.resources.ferramentas, 1);
  assert.equal(canAffordUpgrade(state, 'barricadas').canBuild, false);
});

test('3. Limite da mochila e adição de itens com descarte de excedente', () => {
  const state = createInitialCampaign();
  const cap = calculateBackpackCapacity(state, [state.survivors[2].id]);
  assert.equal(cap, 12);

  const lootRes = addLootWithCapacity(
    { comida: 0, medicamentos: 0, materiais: 0, ferramentas: 0, municao: 0 },
    { comida: 4, materiais: 5 },
    cap
  );
  assert.equal(lootRes.newWeight, 12);
  assert.equal(lootRes.updatedLoot.comida, 4);
  assert.equal(lootRes.updatedLoot.materiais, 4);
  assert.equal(lootRes.discarded.materiais, 1);
});

test('4. Ferimentos, cura e morte permanente', () => {
  let state = createInitialCampaign();
  const dmg = applyDamageToSurvivor(state.survivors[0], 40, true);
  assert.equal(dmg.survivor.health, 60);
  assert.equal(dmg.survivor.injury, 'ferido');

  state = {
    ...state,
    survivors: [dmg.survivor, state.survivors[1], state.survivors[2]],
  };
  state = healSurvivor(state, state.survivors[0].id);
  assert.equal(state.survivors[0].health, 90);
  assert.equal(state.resources.medicamentos, 2);

  const lethal = applyDamageToSurvivor(state.survivors[0], 200, true);
  assert.equal(lethal.died, true);
  assert.equal(lethal.survivor.injury, 'morto');
  assert.equal(lethal.survivor.health, 0);
  assert.equal(lethal.survivor.available, false);
});

test('5. Expedição, resolução de carta e proteção contra recompensas duplicadas no retorno', () => {
  let state = createInitialCampaign();
  state = advanceToPreparation(state);
  state = startExpedition(state, 'supermercado', [state.survivors[0].id, state.survivors[1].id]);
  assert.equal(state.phase, 'expedicao');

  const card = getCurrentExpeditionCard(state);
  assert.ok(card);
  state = resolveCardOption(state, card.options[0].id, 2);
  assert.equal(state.activeExpedition?.usedCardIds.length, 1);

  state = {
    ...state,
    phase: 'retorno',
    activeExpedition: {
      ...state.activeExpedition!,
      status: 'concluida',
      backpackLoot: { comida: 5, medicamentos: 1, materiais: 0, ferramentas: 0, municao: 0 },
    },
  };

  const beforeFood = state.resources.comida;
  const returnedOnce = concludeExpeditionReturn(state);
  assert.equal(returnedOnce.resources.comida, beforeFood + 5);

  const returnedTwice = concludeExpeditionReturn(returnedOnce);
  assert.equal(returnedTwice.resources.comida, beforeFood + 5);

  const day2 = advanceToNextDay(returnedTwice);
  assert.equal(day2.day, 2);
  assert.equal(day2.phase, 'manha');
});

test('6. Validação de dados salvos e proteção contra recursos negativos ou ressurreição', () => {
  const state = createInitialCampaign();
  const raw = {
    ...state,
    resources: { comida: -10, medicamentos: 500, materiais: 4, ferramentas: 1, municao: 2 },
    survivors: [
      { ...state.survivors[0], health: 0, injury: 'morto', available: true },
      state.survivors[1],
    ],
  };

  const validated = validateAndMigrateCampaign(raw);
  assert.ok(validated);
  assert.equal(validated.resources.comida, 0);
  assert.equal(validated.resources.medicamentos, validated.maxResources.medicamentos);
  assert.equal(validated.survivors[0].injury, 'morto');
  assert.equal(validated.survivors[0].available, false);
});
