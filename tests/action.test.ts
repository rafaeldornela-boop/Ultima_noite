import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDamageToPlayer,
  applyExtractionToStash,
  buildMinimapSnapshot,
  computeEvacuationProgress,
  createDefaultInputState,
  createInitialPersistentStash,
  createInitialWorldState,
  createZombieFromArchetype,
  evaluatePointVisibility,
  executeEvacuation,
  healShelterSurvivor,
  performAttack,
  selectActiveSurvivor,
  stepWorld,
  toggleFlashlight,
  triggerInteract,
  tryDirectObjectInteractAtWorldPoint,
  upgradeShelterStation,
  VISION_CONFIG,
  WEAPON_CONFIG,
  ZOMBIE_ARCHETYPE_CONFIG,
} from '../src/action/actionRules.ts';

test('Top-Down Action: movimentação em 8 direções e bloqueio por paredes', () => {
  const world = createInitialWorldState('node_move_wall');
  const startX = world.player.x;
  const input = createDefaultInputState();
  input.moveX = 1;
  input.moveY = -1;

  stepWorld(world, input, 0.05);
  assert.ok(world.player.x > startX);

  // Colisão com parede oeste (x=28)
  world.player.x = 45;
  input.moveX = -1;
  input.moveY = 0;
  for (let i = 0; i < 15; i++) {
    stepWorld(world, input, 0.05);
  }
  assert.ok(world.player.x >= 44);
});

test('Top-Down Action: combate com arma de fogo, facão e eliminação de zumbis', () => {
  const world = createInitialWorldState('node_combat');
  const z = createZombieFromArchetype('z_test', 'corredor', 270, 980);
  world.zombies = [z];
  world.player.x = 220;
  world.player.y = 980;
  world.player.facingAngle = 0;

  performAttack(world);
  for (let i = 0; i < 5; i++) {
    stepWorld(world, createDefaultInputState(), 0.03);
  }
  assert.ok(z.hp < z.maxHp);

  world.player.equippedWeapon = 'facao';
  world.player.attackCooldown = 0;
  world.player.x = z.x - 30;
  performAttack(world);
  assert.equal(z.dead, true);
  assert.equal(world.zombiesKilled, 1);
});

test('Top-Down Action: coleta de saque, extração sem duplicação e perda ao morrer', () => {
  const world = createInitialWorldState('node_extract');
  const spot = world.lootSpots[0];
  world.player.x = spot.x;
  world.player.y = spot.y;

  const lootRes = triggerInteract(world);
  assert.equal(lootRes.action, 'looted');
  assert.ok(world.runLoot.comida > 0);

  world.player.x = world.extractionZone.x;
  world.player.y = world.extractionZone.y;
  const extRes = triggerInteract(world);
  assert.equal(extRes.action, 'extracted');
  assert.equal(world.status, 'extracted');

  let stash = createInitialPersistentStash();
  const foodBefore = stash.totalStash.comida;
  const gained = world.runLoot.comida;

  stash = applyExtractionToStash(stash, world);
  assert.equal(stash.totalStash.comida, foodBefore + gained);

  // Não duplica a mesma extração
  stash = applyExtractionToStash(stash, world);
  assert.equal(stash.totalStash.comida, foodBefore + gained);

  // Morte antes de extrair perde o saque da mochila
  const deadWorld = createInitialWorldState('node_dead');
  deadWorld.runLoot.comida = 50;
  applyDamageToPlayer(deadWorld, 200, 'Bruto Blindado');
  assert.equal(deadWorld.status, 'dead');

  const afterDeath = applyExtractionToStash(stash, deadWorld);
  assert.equal(afterDeath.totalStash.comida, foodBefore + gained);
});

test('Top-Down Action: projeção do minimapa com jogador e ponto de extração na Vila Esperança', () => {
  const world = createInitialWorldState('node_minimap');
  const snap = buildMinimapSnapshot(world, 128, 96);

  assert.equal(snap.mapWidth, 128);
  assert.equal(snap.mapHeight, 96);
  assert.equal(snap.buildings.length, 3);
  assert.ok(snap.player.x > 0 && snap.player.x < 128);
  assert.ok(snap.extraction.x > 0 && snap.extraction.x < 128);

  world.player.x = 800;
  world.player.y = 600;
  const movedSnap = buildMinimapSnapshot(world, 128, 96);
  assert.equal(movedSnap.player.x, 64);
  assert.equal(movedSnap.player.y, 48);
  assert.ok(movedSnap.extraction.distanceMeters > snap.extraction.distanceMeters);
});

test('Top-Down Action: saque automático por proximidade sem necessidade de tecla', () => {
  const world = createInitialWorldState('node_auto_loot');
  const spot = world.lootSpots[0];
  world.player.x = spot.x;
  world.player.y = spot.y;

  // Step for 0.4s (within duration): looting in progress
  for (let i = 0; i < 8; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }
  assert.ok(world.activeLooting !== null);
  assert.equal(world.activeLooting?.spotId, spot.id);
  assert.equal(spot.looted, false);

  // Step further to complete the search duration
  for (let i = 0; i < 55; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }
  assert.equal(spot.looted, true);
  assert.equal(world.activeLooting, null);
  assert.ok(world.runLoot.comida > 0);

  // Moving away and returning does not duplicate
  const foodCount = world.runLoot.comida;
  world.player.x += 200;
  stepWorld(world, createDefaultInputState(), 0.05);
  world.player.x = spot.x;
  stepWorld(world, createDefaultInputState(), 0.05);
  assert.equal(world.runLoot.comida, foodCount);
  assert.equal(world.activeLooting, null);
});

test('Top-Down Action: sistema de ruído de disparo atrai zumbis distantes', () => {
  const world = createInitialWorldState('node_noise_test');
  const z = createZombieFromArchetype('z_far', 'lento', 650, 980);
  z.detectionRange = 200;
  world.zombies = [z];
  world.player.x = 220;
  world.player.y = 980;
  world.player.facingAngle = 0;

  stepWorld(world, createDefaultInputState(), 0.05);
  assert.equal(z.vx, 0);

  performAttack(world);
  assert.ok(world.noiseEvents.length > 0);

  stepWorld(world, createDefaultInputState(), 0.05);
  assert.ok(z.vx < 0);
});

test('Top-Down Action: botão de disparo inicia recarga quando o pente está vazio', () => {
  const world = createInitialWorldState('node_fire_reload');
  world.player.equippedWeapon = 'pistola';
  world.player.ammoInClip = 0;
  world.player.ammoReserve = 12;
  world.player.reloadTimer = 0;

  const res = performAttack(world);
  assert.equal(res.type, 'empty');
  assert.ok(world.player.reloadTimer > 0);

  for (let i = 0; i < 25; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }
  assert.equal(world.player.reloadTimer, 0);
  assert.equal(world.player.ammoInClip, 12);
  assert.equal(world.player.ammoReserve, 0);
});

test('Top-Down Action: múltiplos distritos com layouts, móveis e sons de ambiente', () => {
  const vila = createInitialWorldState('node_dist_vila', 'vila_esperanca');
  assert.equal(vila.districtId, 'vila_esperanca');
  assert.ok(vila.lootSpots.some((s) => s.containerType === 'geladeira'));
  assert.ok(vila.lootSpots.some((s) => s.containerType === 'armario'));

  const centro = createInitialWorldState('node_dist_centro', 'centro_comercial');
  assert.equal(centro.districtId, 'centro_comercial');
  assert.ok(centro.lootSpots.some((s) => s.containerType === 'cofre'));
  assert.ok(centro.lootSpots.some((s) => s.containerType === 'gondola'));

  const medico = createInitialWorldState('node_dist_med', 'complexo_medico');
  assert.equal(medico.districtId, 'complexo_medico');
  assert.ok(medico.lootSpots.some((s) => s.containerType === 'maca'));
  assert.ok(medico.buildings.some((b) => b.name.includes('Pronto-Socorro')));
});

test('Top-Down Action: lanterna consome bateria e desliga ao esgotar', () => {
  const world = createInitialWorldState('node_flashlight');
  assert.equal(world.player.flashlight.enabled, true);
  assert.equal(world.player.flashlight.battery, 100);

  for (let i = 0; i < 100; i++) {
    stepWorld(world, createDefaultInputState(), 0.1);
  }
  assert.ok(world.player.flashlight.battery < 100);
  assert.ok(world.player.flashlight.battery > 50);

  world.player.flashlight.battery = 0.05;
  stepWorld(world, createDefaultInputState(), 0.1);
  assert.equal(world.player.flashlight.enabled, false);
  assert.equal(world.player.flashlight.battery, 0);
});

test('Top-Down Action: cura por atadura requer canalização de tempo e cancela ao sofrer dano', () => {
  const world = createInitialWorldState('node_healing');
  world.player.hp = 40;
  world.runLoot.medicamentos = 2;

  const inp = createDefaultInputState();
  inp.healJustPressed = true;
  stepWorld(world, inp, 0.05);

  assert.ok(world.player.healing !== null);
  assert.equal(world.player.healing?.active, true);
  assert.equal(world.player.hp, 40);

  applyDamageToPlayer(world, 10, 'Errante');
  assert.equal(world.player.healing, null);
  assert.equal(world.runLoot.medicamentos, 2);

  inp.healJustPressed = true;
  stepWorld(world, inp, 0.05);
  for (let i = 0; i < 50; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }

  assert.equal(world.player.healing, null);
  assert.equal(world.player.hp, 65);
  assert.equal(world.runLoot.medicamentos, 1);
});

test('Top-Down Action: visão direcional e furtividade pelas costas de zumbis', () => {
  const world = createInitialWorldState('node_stealth');
  const z = createZombieFromArchetype('z_look_east', 'lento', 500, 500);
  z.facingAngle = 0;
  world.zombies = [z];

  world.player.x = 350;
  world.player.y = 500;
  world.player.flashlight.enabled = false;
  world.ambientDarkness = 0.75;

  stepWorld(world, createDefaultInputState(), 0.05);
  assert.equal(z.alertState, 'idle');
  assert.equal(z.vx, 0);

  world.player.x = 650;
  world.player.y = 500;
  world.player.flashlight.enabled = true;

  stepWorld(world, createDefaultInputState(), 0.05);
  assert.equal(z.alertState, 'hunting');
  assert.ok(z.vx > 0);
});

test('Top-Down Action: balanceamento entre Facão (22 PV, cadência controlada, 95 px ruído) e Pistola (24 PV, 480 px ruído) + parada imediata do joystick', () => {
  assert.equal(ZOMBIE_ARCHETYPE_CONFIG.lento.speed, 37);
  assert.ok(ZOMBIE_ARCHETYPE_CONFIG.corredor.turnRateRad > ZOMBIE_ARCHETYPE_CONFIG.lento.turnRateRad);
  assert.ok(ZOMBIE_ARCHETYPE_CONFIG.lento.turnRateRad > ZOMBIE_ARCHETYPE_CONFIG.bruto.turnRateRad);
  assert.equal(WEAPON_CONFIG.facao.damage, 22);
  assert.equal(WEAPON_CONFIG.facao.swingDuration, 0.14);
  assert.ok(WEAPON_CONFIG.facao.cooldown >= 0.5);
  assert.equal(WEAPON_CONFIG.facao.noiseRadius, 95);
  assert.equal(WEAPON_CONFIG.pistola.damage, 24);
  assert.equal(WEAPON_CONFIG.pistola.noiseRadius, 480);

  const world = createInitialWorldState('node_integrated_v2');
  world.player.x = 500;
  world.player.y = 500;
  world.player.facingAngle = 0;
  world.player.equippedWeapon = 'facao';

  const zFront = createZombieFromArchetype('z_front', 'lento', 550, 500);
  const zSecond = createZombieFromArchetype('z_second', 'lento', 572, 508);
  world.zombies = [zFront, zSecond];
  world.obstacles = [];

  const hitRes = performAttack(world);
  assert.equal(hitRes.hits, 1);
  assert.equal(zFront.hp, zFront.maxHp - 22);
  assert.equal(zSecond.hp, zSecond.maxHp);
  assert.equal(world.noiseEvents[world.noiseEvents.length - 1].radius, 95);

  // Obstrução por parede bloqueia o cone do facão
  world.player.attackCooldown = 0;
  world.obstacles = [{ id: 'w1', x: 525, y: 470, width: 12, height: 60, kind: 'wall' }];
  const blockedRes = performAttack(world);
  assert.equal(blockedRes.hits, 0);

  // Parada imediata ao soltar o joystick
  world.hitstopTimer = 0;
  const moveIn = createDefaultInputState();
  moveIn.moveX = 1;
  stepWorld(world, moveIn, 0.05);
  assert.ok(world.player.vx > 0);

  stepWorld(world, createDefaultInputState(), 0.05);
  assert.equal(world.player.vx, 0);
  assert.equal(world.player.vy, 0);
});

test('Top-Down Action: transição telhado/interior, portas arquitetônicas, mira dinâmica Bullet Echo e toque direto em objetos mobile', () => {
  const world = createInitialWorldState('node_roof_and_aim', 'vila_esperanca');
  const casaSantos = world.buildings.find((b) => b.id === 'bld_casa_santos')!;
  assert.equal(casaSantos.roofAlpha, 1);
  assert.ok((casaSantos.doors?.length ?? 0) >= 1);
  assert.ok((casaSantos.windows?.length ?? 0) >= 1);

  // Entra pela porta da casa -> telhado desaparece suavemente até 0
  world.player.x = 340;
  world.player.y = 360;
  for (let i = 0; i < 12; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }
  assert.equal(world.isInsideBuilding, true);
  assert.equal(casaSantos.roofAlpha, 0);

  // Sai da casa -> telhado volta a cobrir o interior (1)
  world.player.x = 340;
  world.player.y = 500;
  for (let i = 0; i < 12; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }
  assert.equal(world.isInsideBuilding, false);
  assert.equal(casaSantos.roofAlpha, 1);

  // Cone Bullet Echo: abre em movimento e estreita ao parar
  const minCone = WEAPON_CONFIG.pistola.minConeAngleRad;
  const moveInp = createDefaultInputState();
  moveInp.moveX = 1;
  moveInp.aimAngle = 0;
  for (let i = 0; i < 10; i++) {
    stepWorld(world, moveInp, 0.05);
  }
  const openCone = world.player.aimSpreadRad;
  assert.ok(openCone > minCone * 2);

  const steadyInp = createDefaultInputState();
  steadyInp.aimAngle = 0;
  for (let i = 0; i < 30; i++) {
    stepWorld(world, steadyInp, 0.05);
  }
  assert.ok(Math.abs(world.player.aimSpreadRad - minCone) < 0.01);

  // Toque direto em carro saqueável consome o toque (não ativa joystick esquerdo)
  const pickupSpot = world.lootSpots.find((s) => s.id === 'loot_porta_luvas_pickup')!;
  const pickupCar = world.obstacles.find((o) => o.id === 'car_pickup')!;
  world.player.x = pickupSpot.x;
  world.player.y = pickupSpot.y + 15;

  const tapCar = tryDirectObjectInteractAtWorldPoint(
    world,
    pickupCar.x + pickupCar.width * 0.5,
    pickupCar.y + pickupCar.height * 0.5
  );
  assert.equal(tapCar.consumed, true);
  assert.equal(pickupSpot.looted, true);
});

test('Top-Down Action: campo de visão tático (Bullet Echo FOV), oclusão por paredes, efeito real da lanterna e sinais acústicos discretos', () => {
  const world = createInitialWorldState('node_fov_acoustic', 'centro_comercial');
  world.obstacles = [];
  world.buildings = [];
  world.player.x = 500;
  world.player.y = 500;
  world.player.facingAngle = 0;
  world.ambientDarkness = 0.85;

  const targetX = 780;
  const targetY = 500;
  assert.equal(world.player.flashlight.enabled, true);
  assert.equal(evaluatePointVisibility(world, targetX, targetY), 'visible');

  // Desliga a lanterna: alcance reduz significativamente na escuridão
  toggleFlashlight(world);
  assert.equal(world.player.flashlight.enabled, false);
  assert.equal(evaluatePointVisibility(world, targetX, targetY), 'hidden');

  // Religa a lanterna, mas adiciona parede sólida bloqueando a linha de visão
  toggleFlashlight(world);
  world.obstacles = [{ id: 'fov_wall', x: 650, y: 440, width: 18, height: 120, kind: 'wall' }];
  assert.equal(evaluatePointVisibility(world, targetX, targetY), 'hidden');

  // Zumbi barulhento atrás da parede gera sinal acústico direcional sem ficar visível
  const hiddenRunner = createZombieFromArchetype('z_noisy_hidden', 'corredor', 740, 500);
  hiddenRunner.alertState = 'hunting';
  world.zombies = [hiddenRunner];

  stepWorld(world, createDefaultInputState(), 0.1);
  assert.equal(hiddenRunner.isVisibleToPlayer, false);
  assert.equal(hiddenRunner.visibilityState, 'hidden');
  assert.ok(world.acousticCues.length >= 1);
  assert.ok(VISION_CONFIG.flashlightBonusRange > 100);
});

test('Top-Down Action: progressão do abrigo, sobreviventes, estações, avanço de dias e objetivo de evacuação', () => {
  let stash = createInitialPersistentStash();
  assert.equal(stash.day, 1);
  assert.equal(stash.survivors?.length, 3);
  assert.ok(stash.upgrades !== undefined);

  stash.totalStash.materiais = 25;
  stash.totalStash.medicamentos = 10;
  stash.totalStash.comida = 20;
  stash.totalStash.municao = 25;

  const upOficina = upgradeShelterStation(stash, 'oficina');
  assert.equal(upOficina.ok, true);
  stash = upOficina.stash;

  const worldWithBonus = createInitialWorldState('node_shelter_bonus', 'vila_esperanca', stash);
  assert.equal(worldWithBonus.maxCarryCapacity, 30);

  const upEnf = upgradeShelterStation(stash, 'enfermaria');
  assert.equal(upEnf.ok, true);
  stash = upEnf.stash;

  stash = selectActiveSurvivor(stash, 'surv_elena');

  const worldElena = createInitialWorldState('node_elena_run', 'vila_esperanca', stash);
  assert.equal(worldElena.player.maxHp, 115);

  worldElena.player.hp = 60;
  worldElena.status = 'extracted';
  stash = applyExtractionToStash(stash, worldElena);
  assert.equal(stash.day, 2);
  const elenaAfter = stash.survivors!.find((s) => s.id === 'surv_elena')!;
  assert.ok(elenaAfter.hp < elenaAfter.maxHp);
  assert.equal(elenaAfter.status, 'ferido');

  const healed = healShelterSurvivor(stash, 'surv_elena');
  assert.equal(healed.ok, true);
  stash = healed.stash;
  assert.ok(stash.survivors!.find((s) => s.id === 'surv_elena')!.hp > elenaAfter.hp);

  stash.runsExtracted = 2;
  stash = upgradeShelterStation(stash, 'torre_radio').stash;
  assert.ok(computeEvacuationProgress(stash) > 50);

  const evac = executeEvacuation(stash);
  assert.equal(evac.ok, true);
  assert.equal(evac.stash.evacuationCompleted, true);
});






