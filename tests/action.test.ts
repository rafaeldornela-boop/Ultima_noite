import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDamageToPlayer,
  applyExtractionToStash,
  buildMinimapSnapshot,
  createDefaultInputState,
  createInitialPersistentStash,
  createInitialWorldState,
  createZombieFromArchetype,
  performAttack,
  stepWorld,
  triggerInteract,
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

  // Step for 0.4s (within 0.9s duration): looting in progress
  for (let i = 0; i < 8; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }
  assert.ok(world.activeLooting !== null);
  assert.equal(world.activeLooting?.spotId, spot.id);
  assert.equal(spot.looted, false);

  // Step further to complete the 0.9s duration
  for (let i = 0; i < 15; i++) {
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
  // Position a zombie beyond sight detection range (e.g. 400px away)
  const z = createZombieFromArchetype('z_far', 'lento', 650, 980);
  z.detectionRange = 200; // Normal sight restricted to 200px
  world.zombies = [z];
  world.player.x = 220;
  world.player.y = 980;
  world.player.facingAngle = 0;

  // Before gunshot: zombie does not move towards player
  stepWorld(world, createDefaultInputState(), 0.05);
  assert.equal(z.vx, 0);

  // Fire gun: acoustic impulse propagates 480px and reaches zombie
  performAttack(world);
  assert.ok(world.noiseEvents.length > 0);

  // Step world: zombie is alerted by noise and pursues towards player
  stepWorld(world, createDefaultInputState(), 0.05);
  assert.ok(z.vx < 0); // Moving left towards player at x=220
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

  // Step world through reload completion
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

  // Step 10 seconds with flashlight on
  for (let i = 0; i < 100; i++) {
    stepWorld(world, createDefaultInputState(), 0.1);
  }
  assert.ok(world.player.flashlight.battery < 100);
  assert.ok(world.player.flashlight.battery > 50);

  // Deplete battery to 0
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
  assert.equal(world.player.hp, 40); // Not healed immediately!

  // Suffering damage cancels healing immediately
  applyDamageToPlayer(world, 10, 'Errante');
  assert.equal(world.player.healing, null);
  assert.equal(world.runLoot.medicamentos, 2); // Medkit preserved because heal was cancelled!

  // Re-start healing and step through full duration (2.2s)
  inp.healJustPressed = true;
  stepWorld(world, inp, 0.05);
  for (let i = 0; i < 50; i++) {
    stepWorld(world, createDefaultInputState(), 0.05);
  }

  assert.equal(world.player.healing, null);
  assert.equal(world.player.hp, 65); // 30 + 35 = 65 PV
  assert.equal(world.runLoot.medicamentos, 1);
});

test('Top-Down Action: visão direcional e furtividade pelas costas de zumbis', () => {
  const world = createInitialWorldState('node_stealth');
  // Place zombie facing East (angle = 0)
  const z = createZombieFromArchetype('z_look_east', 'lento', 500, 500);
  z.facingAngle = 0; // Looking East (to the right)
  world.zombies = [z];

  // Player stands directly behind zombie at x=350, y=500 (150px West)
  world.player.x = 350;
  world.player.y = 500;
  world.player.flashlight.enabled = false;
  world.ambientDarkness = 0.75; // Night darkness

  stepWorld(world, createDefaultInputState(), 0.05);
  // Zombie does NOT see the player because player is behind the zombie's vision cone
  assert.equal(z.alertState, 'idle');
  assert.equal(z.vx, 0);

  // Now player moves into the zombie's frontal cone at x=650, y=500 (East of zombie)
  world.player.x = 650;
  world.player.y = 500;
  world.player.flashlight.enabled = true; // Flashlight beam illuminates into zombie's front!

  stepWorld(world, createDefaultInputState(), 0.05);
  // Zombie detects player visually in its front cone!
  assert.equal(z.alertState, 'hunting');
  assert.ok(z.vx > 0); // Advances East towards player
});


