import { describe, expect, it } from 'vitest';
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
  startReload,
  stepWorld,
  toggleFlashlight,
  triggerInteract,
  tryDirectObjectInteractAtWorldPoint,
  upgradeShelterStation,
  useFieldMedkit,
  VISION_CONFIG,
  WEAPON_CONFIG,
  ZOMBIE_ARCHETYPE_CONFIG,
} from '../src/action/actionRules.ts';
import {
  loadActionStash,
  resetActionStash,
  saveActionStash,
} from '../src/storage/actionStorage.ts';
import { createMemoryStorageAdapter } from '../src/storage/campaignStorage.ts';

describe('Último Dia — Protótipo Top-Down Action Survival', () => {
  it('1. Movimenta o personagem nas 8 direções e consome vigor ao correr/esquivar', () => {
    const world = createInitialWorldState('run_move_test');
    const startX = world.player.x;
    const startY = world.player.y;

    // Move diagonally NE (moveX = 1, moveY = -1) with sprint
    const input = createDefaultInputState();
    input.moveX = 1;
    input.moveY = -1;
    input.sprintHeld = true;

    stepWorld(world, input, 0.05);
    expect(world.player.x).toBeGreaterThan(startX);
    expect(world.player.y).toBeLessThan(startY);
    expect(world.player.stamina).toBeLessThan(100);
  });

  it('2. Impede atravessar paredes e obstáculos sólidos', () => {
    const world = createInitialWorldState('run_wall_test');
    // Place player right next to the left outer wall (x: 0..28)
    world.player.x = 46;
    world.player.y = 500;

    const input = createDefaultInputState();
    input.moveX = -1;

    for (let i = 0; i < 20; i++) {
      stepWorld(world, input, 0.05);
    }

    // Player radius is 16, wall ends at x=28 -> player center cannot go below 44
    expect(world.player.x).toBeGreaterThanOrEqual(44);
  });

  it('3. Dispara arma de fogo, consome munição, recarrega e elimina inimigos', () => {
    const world = createInitialWorldState('run_combat_test');
    // Place a zombie directly in front of the player (East)
    const targetZombie = createZombieFromArchetype('z_target', 'corredor', 280, 980);
    world.zombies = [targetZombie];
    world.player.x = 220;
    world.player.y = 980;
    world.player.facingAngle = 0; // Facing East

    const initialAmmo = world.player.ammoInClip;
    const attackRes = performAttack(world);
    expect(attackRes.type).toBe('shot');
    expect(world.player.ammoInClip).toBe(initialAmmo - 1);
    expect(world.bullets.length).toBe(1);

    // Step world so bullet hits zombie (30 HP corredor takes 24 dmg on first shot)
    for (let i = 0; i < 5; i++) {
      stepWorld(world, createDefaultInputState(), 0.03);
    }
    expect(targetZombie.hp).toBe(6);

    // Fire second shot to eliminate zombie
    world.player.attackCooldown = 0;
    performAttack(world);
    for (let i = 0; i < 5; i++) {
      stepWorld(world, createDefaultInputState(), 0.03);
    }
    expect(targetZombie.dead).toBe(true);
    expect(world.zombiesKilled).toBe(1);

    // Test reload
    const reserveBefore = world.player.ammoReserve;
    const startedReload = startReload(world);
    expect(startedReload).toBe(true);
    for (let i = 0; i < 25; i++) {
      stepWorld(world, createDefaultInputState(), 0.05);
    }
    expect(world.player.ammoInClip).toBe(world.player.clipSize);
    expect(world.player.ammoReserve).toBe(reserveBefore - 2);
  });

  it('4. Executa ataque corpo a corpo (Facão) sem gastar munição', () => {
    const world = createInitialWorldState('run_melee_test');
    const z = createZombieFromArchetype('z_melee', 'lento', 255, 980);
    world.zombies = [z];
    world.player.x = 220;
    world.player.y = 980;
    world.player.facingAngle = 0;
    world.player.equippedWeapon = 'facao';

    const ammoBefore = world.player.ammoInClip;
    const res = performAttack(world);
    expect(res.type).toBe('melee');
    expect(res.hits).toBe(1);
    expect(world.player.ammoInClip).toBe(ammoBefore);
    expect(z.hp).toBeLessThan(z.maxHp);
  });

  it('5. As 3 variantes de zumbis perseguem o jogador, causam dano, permitem cura e morte', () => {
    const world = createInitialWorldState('run_zombie_ai');
    const lento = createZombieFromArchetype('z1', 'lento', 320, 980);
    const corredor = createZombieFromArchetype('z2', 'corredor', 320, 950);
    const bruto = createZombieFromArchetype('z3', 'bruto', 320, 1010);

    expect(corredor.speed).toBeGreaterThan(lento.speed);
    expect(lento.speed).toBeGreaterThan(bruto.speed);
    expect(bruto.maxHp).toBeGreaterThan(lento.maxHp);

    world.zombies = [lento];
    const startZDist = Math.hypot(lento.x - world.player.x, lento.y - world.player.y);
    stepWorld(world, createDefaultInputState(), 0.05);
    const nextZDist = Math.hypot(lento.x - world.player.x, lento.y - world.player.y);
    expect(nextZDist).toBeLessThan(startZDist);

    // Apply damage to player & test brief invulnerability
    const hit1 = applyDamageToPlayer(world, 30, 'Errante Lento');
    expect(hit1).toBe(true);
    expect(world.player.hp).toBe(70);

    // Immediate second hit during invulnerability window is blocked
    const hit2 = applyDamageToPlayer(world, 30, 'Errante Lento');
    expect(hit2).toBe(false);
    expect(world.player.hp).toBe(70);

    // Heal with field medkit
    const healed = useFieldMedkit(world);
    expect(healed).toBe(true);
    expect(world.player.hp).toBe(100);

    // Lethal damage triggers 'dead' status
    world.player.invulnTimer = 0;
    world.hitstopTimer = 0;
    applyDamageToPlayer(world, 120, 'Bruto Blindado');
    expect(world.player.hp).toBe(0);
    expect(world.status).toBe('dead');
  });

  it('6. Coleta recursos em caixas de saque e extrai com persistência sem duplicar', async () => {
    const world = createInitialWorldState('run_loot_extract');
    const spot = world.lootSpots[0];

    // Move player next to first loot spot
    world.player.x = spot.x;
    world.player.y = spot.y;

    const lootRes = triggerInteract(world);
    expect(lootRes.interacted).toBe(true);
    expect(lootRes.action).toBe('looted');
    expect(spot.looted).toBe(true);
    expect(world.runLoot.comida).toBeGreaterThan(0);

    // Move player to Extraction Zone and extract
    world.player.x = world.extractionZone.x;
    world.player.y = world.extractionZone.y;
    const extRes = triggerInteract(world);
    expect(extRes.interacted).toBe(true);
    expect(extRes.action).toBe('extracted');
    expect(world.status).toBe('extracted');

    // Persist extraction to stash once (and verify idempotency on duplicate call)
    let stash = createInitialPersistentStash();
    const initialFood = stash.totalStash.comida;
    const gainedFood = world.runLoot.comida;

    stash = applyExtractionToStash(stash, world);
    expect(stash.totalStash.comida).toBe(initialFood + gainedFood);
    expect(stash.runsExtracted).toBe(1);

    // Second call with same runId must NOT duplicate rewards
    const duplicateStash = applyExtractionToStash(stash, world);
    expect(duplicateStash.totalStash.comida).toBe(initialFood + gainedFood);
    expect(duplicateStash.runsExtracted).toBe(1);

    // Verify dead run does NOT grant unextracted loot
    const deadWorld = createInitialWorldState('run_dead_loss');
    deadWorld.runLoot.comida = 99;
    deadWorld.status = 'dead';
    const afterDeadStash = applyExtractionToStash(duplicateStash, deadWorld);
    expect(afterDeadStash.totalStash.comida).toBe(initialFood + gainedFood);
    expect(afterDeadStash.runsDied).toBe(1);

    // Verify storage save, load & reset
    const adapter = createMemoryStorageAdapter();
    await saveActionStash(afterDeadStash, adapter);
    const loaded = await loadActionStash(adapter);
    expect(loaded.totalStash.comida).toBe(initialFood + gainedFood);
    expect(loaded.runsExtracted).toBe(1);
    expect(loaded.runsDied).toBe(1);

    const reset = await resetActionStash(adapter);
    expect(reset.runsExtracted).toBe(0);
  });

  it('7. Projeta posição atual do jogador, prédios e ponto de extração no minimapa do HUD', () => {
    const world = createInitialWorldState('run_minimap_test');
    const initialMap = buildMinimapSnapshot(world, 128, 96);

    // World is 1600x1200 -> scaleX = 0.08, scaleY = 0.08
    // Player spawn (220, 980) -> (17.6, 78.4)
    expect(initialMap.player.x).toBeCloseTo(17.6, 1);
    expect(initialMap.player.y).toBeCloseTo(78.4, 1);
    // Extraction zone (150, 1050) -> (12, 84)
    expect(initialMap.extraction.x).toBeCloseTo(12, 1);
    expect(initialMap.extraction.y).toBeCloseTo(84, 1);
    expect(initialMap.buildings.length).toBe(3);

    // Move player toward center of Vila Esperança (800, 600)
    world.player.x = 800;
    world.player.y = 600;
    const midMap = buildMinimapSnapshot(world, 128, 96);
    expect(midMap.player.x).toBeCloseTo(64, 1);
    expect(midMap.player.y).toBeCloseTo(48, 1);
    expect(midMap.extraction.distanceMeters).toBeGreaterThan(
      initialMap.extraction.distanceMeters
    );
    expect(midMap.player.insideExtraction).toBe(false);

    // Move player inside Extraction Zone (150, 1050)
    world.player.x = world.extractionZone.x;
    world.player.y = world.extractionZone.y;
    const extMap = buildMinimapSnapshot(world, 128, 96);
    expect(extMap.extraction.distanceMeters).toBe(0);
    expect(extMap.player.insideExtraction).toBe(true);
  });

  it('8. Suporta múltiplos distritos com layouts, móveis e sons de ambiente', () => {
    const vila = createInitialWorldState('spec_dist_vila', 'vila_esperanca');
    expect(vila.districtId).toBe('vila_esperanca');
    expect(vila.lootSpots.some((s) => s.containerType === 'geladeira')).toBe(true);
    expect(vila.lootSpots.some((s) => s.containerType === 'armario')).toBe(true);

    const centro = createInitialWorldState('spec_dist_centro', 'centro_comercial');
    expect(centro.districtId).toBe('centro_comercial');
    expect(centro.lootSpots.some((s) => s.containerType === 'cofre')).toBe(true);
    expect(centro.lootSpots.some((s) => s.containerType === 'gondola')).toBe(true);

    const medico = createInitialWorldState('spec_dist_med', 'complexo_medico');
    expect(medico.districtId).toBe('complexo_medico');
    expect(medico.lootSpots.some((s) => s.containerType === 'maca')).toBe(true);
    expect(medico.buildings.some((b) => b.name.includes('Pronto-Socorro'))).toBe(true);
  });

  it('9. Lanterna consome bateria e desliga automaticamente ao esgotar', () => {
    const world = createInitialWorldState('spec_flashlight');
    expect(world.player.flashlight.enabled).toBe(true);
    expect(world.player.flashlight.battery).toBe(100);

    for (let i = 0; i < 100; i++) {
      stepWorld(world, createDefaultInputState(), 0.1);
    }
    expect(world.player.flashlight.battery).toBeLessThan(100);
    expect(world.player.flashlight.battery).toBeGreaterThan(50);

    world.player.flashlight.battery = 0.05;
    stepWorld(world, createDefaultInputState(), 0.1);
    expect(world.player.flashlight.enabled).toBe(false);
    expect(world.player.flashlight.battery).toBe(0);
  });

  it('10. Cura canalizada requer tempo e é interrompida por dano preservando o recurso', () => {
    const world = createInitialWorldState('spec_healing');
    world.player.hp = 40;
    world.runLoot.medicamentos = 2;

    const inp = createDefaultInputState();
    inp.healJustPressed = true;
    stepWorld(world, inp, 0.05);

    expect(world.player.healing).not.toBeNull();
    expect(world.player.healing?.active).toBe(true);
    expect(world.player.hp).toBe(40);

    applyDamageToPlayer(world, 10, 'Errante');
    expect(world.player.healing).toBeNull();
    expect(world.runLoot.medicamentos).toBe(2);

    inp.healJustPressed = true;
    stepWorld(world, inp, 0.05);
    for (let i = 0; i < 50; i++) {
      stepWorld(world, createDefaultInputState(), 0.05);
    }

    expect(world.player.healing).toBeNull();
    expect(world.player.hp).toBe(65);
    expect(world.runLoot.medicamentos).toBe(1);
  });

  it('11. Visão direcional e aproximação furtiva pelas costas de zumbis', () => {
    const world = createInitialWorldState('spec_stealth');
    const z = createZombieFromArchetype('z_look_east', 'lento', 500, 500);
    z.facingAngle = 0;
    world.zombies = [z];

    world.player.x = 350;
    world.player.y = 500;
    world.player.flashlight.enabled = false;
    world.ambientDarkness = 0.75;

    stepWorld(world, createDefaultInputState(), 0.05);
    expect(z.alertState).toBe('idle');
    expect(z.vx).toBe(0);

    world.player.x = 650;
    world.player.y = 500;
    world.player.flashlight.enabled = true;

    stepWorld(world, createDefaultInputState(), 0.05);
    expect(z.alertState).toBe('hunting');
    expect(z.vx).toBeGreaterThan(0);
  });

  it('12. Zumbis comuns têm velocidade 37 (~60%) e velocidade de rotação parametrizada por arquétipo', () => {
    expect(ZOMBIE_ARCHETYPE_CONFIG.lento.speed).toBe(37);
    expect(ZOMBIE_ARCHETYPE_CONFIG.lento.turnRateRad).toBeGreaterThan(0);
    expect(ZOMBIE_ARCHETYPE_CONFIG.corredor.turnRateRad).toBeGreaterThan(
      ZOMBIE_ARCHETYPE_CONFIG.lento.turnRateRad
    );
    expect(ZOMBIE_ARCHETYPE_CONFIG.lento.turnRateRad).toBeGreaterThan(
      ZOMBIE_ARCHETYPE_CONFIG.bruto.turnRateRad
    );

    for (const distId of ['vila_esperanca', 'centro_comercial', 'complexo_medico'] as const) {
      const w = createInitialWorldState(`spec_z_${distId}`, distId);
      expect(w.zombies.length).toBeGreaterThan(0);
      expect(w.zombies.every((z) => z.archetype === 'lento')).toBe(true);
      expect(w.zombies.every((z) => z.speed === 37)).toBe(true);
      expect(
        w.zombies.every((z) => z.turnRateRad === ZOMBIE_ARCHETYPE_CONFIG.lento.turnRateRad)
      ).toBe(true);
    }
  });

  it('13. Balanceamento entre Facão (22 PV, 1 alvo por golpe, cadência controlada, ruído 95 px) e Pistola (24 PV, ruído 480 px) + bloqueio por parede', () => {
    expect(WEAPON_CONFIG.facao.damage).toBe(22);
    expect(WEAPON_CONFIG.facao.swingDuration).toBe(0.14);
    expect(WEAPON_CONFIG.facao.cooldown).toBeGreaterThanOrEqual(0.5);
    expect(WEAPON_CONFIG.facao.noiseRadius).toBe(95);
    expect(WEAPON_CONFIG.pistola.damage).toBe(24);
    expect(WEAPON_CONFIG.pistola.noiseRadius).toBe(480);

    const world = createInitialWorldState('spec_machete_cone');
    world.player.x = 500;
    world.player.y = 500;
    world.player.facingAngle = 0; // Leste
    world.player.equippedWeapon = 'facao';

    const zFront = createZombieFromArchetype('z_front', 'lento', 550, 502); // Mais próximo no cone
    const zSecondInCone = createZombieFromArchetype('z_second', 'lento', 572, 512); // Segundo alvo no cone
    const zBehind = createZombieFromArchetype('z_behind', 'lento', 445, 500); // Atrás do jogador
    const zFar = createZombieFromArchetype('z_far', 'lento', 630, 500); // Fora do alcance
    world.zombies = [zFront, zSecondInCone, zBehind, zFar];
    world.obstacles = [];

    const res = performAttack(world);
    expect(res.type).toBe('melee');
    expect(res.hits).toBe(1);
    expect(zFront.hp).toBe(zFront.maxHp - 22);
    expect(zSecondInCone.hp).toBe(zSecondInCone.maxHp); // Apenas 1 acerto por golpe
    expect(zBehind.hp).toBe(zBehind.maxHp);
    expect(zFar.hp).toBe(zFar.maxHp);

    const lastNoise = world.noiseEvents[world.noiseEvents.length - 1];
    expect(lastNoise.source).toBe('melee');
    expect(lastNoise.radius).toBe(95);

    // Adiciona uma parede sólida entre o jogador e zFront
    world.player.attackCooldown = 0;
    world.obstacles = [
      { id: 'wall_block', x: 525, y: 470, width: 12, height: 60, kind: 'wall' },
    ];
    const hpBeforeBlocked = zFront.hp;
    const blockedRes = performAttack(world);
    expect(blockedRes.hits).toBe(0);
    expect(zFront.hp).toBe(hpBeforeBlocked);
  });

  it('14. Saque contextual em objetos do cenário respeita parede e preserva itens quando a mochila está cheia', () => {
    const world = createInitialWorldState('spec_contextual_loot');
    const validContainers = new Set([
      'armario',
      'gaveta',
      'geladeira',
      'gondola',
      'porta_malas',
      'porta_luvas',
      'cofre',
      'maca',
      'bancada',
    ]);
    expect(world.lootSpots.every((s) => validContainers.has(s.containerType))).toBe(true);
    expect(world.lootSpots.every((s) => typeof s.actionVerb === 'string' && s.actionVerb.length > 0)).toBe(true);

    const spot = world.lootSpots[0];
    world.player.x = spot.x;
    world.player.y = spot.y;

    // Enche a mochila no limite máximo e zera munição do spot para testar bloqueio total
    world.maxCarryCapacity = 10;
    spot.contents = { comida: 3, materiais: 2 };
    world.runLoot = { comida: 5, medicamentos: 2, municao: 0, materiais: 3 };

    const fullRes = triggerInteract(world);
    expect(fullRes.interacted).toBe(false);
    expect(spot.looted).toBe(false);
    expect(spot.searchState).toBe('available');
    expect(world.lastEventBanner).toContain('Mochila cheia');

    // Libera espaço na mochila e realiza o saque
    world.runLoot.comida = 0;
    const okRes = triggerInteract(world);
    expect(okRes.interacted).toBe(true);
    expect(okRes.action).toBe('looted');
    expect(spot.looted).toBe(true);
    expect(spot.searchState).toBe('searched');
  });

  it('15. Parada imediata ao soltar o joystick e alternância confiável da lanterna ON/OFF', () => {
    const world = createInitialWorldState('spec_joy_stop_flashlight');
    const moveInput = createDefaultInputState();
    moveInput.moveX = 1;
    moveInput.moveY = 0.5;

    stepWorld(world, moveInput, 0.05);
    expect(Math.hypot(world.player.vx, world.player.vy)).toBeGreaterThan(0);

    // Ao soltar o toque (input neutro), a velocidade zera imediatamente
    const releaseInput = createDefaultInputState();
    stepWorld(world, releaseInput, 0.05);
    expect(world.player.vx).toBe(0);
    expect(world.player.vy).toBe(0);

    // Alternância ON -> OFF -> ON da lanterna
    expect(world.player.flashlight.enabled).toBe(true);
    const toggleOff = createDefaultInputState();
    toggleOff.toggleFlashlightJustPressed = true;
    stepWorld(world, toggleOff, 0.05);
    expect(world.player.flashlight.enabled).toBe(false);

    const toggleOn = createDefaultInputState();
    toggleOn.toggleFlashlightJustPressed = true;
    stepWorld(world, toggleOn, 0.05);
    expect(world.player.flashlight.enabled).toBe(true);
  });

  it('16. Casas e edifícios começam com telhado visível (roofAlpha=1), revelam o interior suavemente ao entrar e voltam a cobrir ao sair', () => {
    const world = createInitialWorldState('spec_roof_transition', 'vila_esperanca');
    const casaSantos = world.buildings.find((b) => b.id === 'bld_casa_santos')!;
    const mercearia = world.buildings.find((b) => b.id === 'bld_mercearia')!;

    // Jogador inicia na rua fora das construções -> todos os telhados cobrem o interior (roofAlpha = 1)
    expect(world.isInsideBuilding).toBe(false);
    expect(casaSantos.roofAlpha).toBe(1);
    expect(mercearia.roofAlpha).toBe(1);

    // Jogador entra pela porta da Residência Família Santos (ex.: x=340, y=360)
    world.player.x = 340;
    world.player.y = 360;
    stepWorld(world, createDefaultInputState(), 0.05);
    expect(world.isInsideBuilding).toBe(true);
    expect(world.player.isInsideBuilding).toBe('bld_casa_santos');
    expect(casaSantos.roofAlpha!).toBeLessThan(1);
    expect(casaSantos.roofAlpha!).toBeGreaterThan(0);
    expect(mercearia.roofAlpha).toBe(1); // Outros edifícios continuam cobertos

    // Avança mais alguns frames dentro da casa até o telhado ficar totalmente transparente (0)
    for (let i = 0; i < 10; i++) {
      stepWorld(world, createDefaultInputState(), 0.05);
    }
    expect(casaSantos.roofAlpha).toBe(0);

    // Ao sair de volta para a rua (x=340, y=500), o telhado volta suavemente a cobrir o interior (1)
    world.player.x = 340;
    world.player.y = 500;
    stepWorld(world, createDefaultInputState(), 0.05);
    expect(world.isInsideBuilding).toBe(false);
    expect(casaSantos.roofAlpha!).toBeGreaterThan(0);

    for (let i = 0; i < 10; i++) {
      stepWorld(world, createDefaultInputState(), 0.05);
    }
    expect(casaSantos.roofAlpha).toBe(1);
  });

  it('17. Mira estilo Bullet Echo abre em movimento, estreita ao parar, acompanha a dispersão real dos tiros e destaca alvo sem auto-aim', () => {
    const world = createInitialWorldState('spec_bullet_echo_aim');
    world.obstacles = [];
    world.zombies = [];
    world.player.x = 500;
    world.player.y = 500;
    world.player.facingAngle = 0;

    const minCone = WEAPON_CONFIG.pistola.minConeAngleRad;
    expect(world.player.aimSpreadRad).toBeCloseTo(minCone, 4);

    // 1. Em movimento, o cone se abre progressivamente
    const moveInp = createDefaultInputState();
    moveInp.moveX = 1;
    moveInp.aimAngle = 0;
    for (let i = 0; i < 12; i++) {
      stepWorld(world, moveInp, 0.05);
    }
    const wideSpread = world.player.aimSpreadRad;
    expect(wideSpread).toBeGreaterThan(minCone * 2.2);

    // Disparos em movimento apresentam dispersão angular maior, respeitando o cone aberto
    const movingOffsets: number[] = [];
    for (let i = 0; i < 4; i++) {
      world.player.attackCooldown = 0;
      world.player.ammoInClip = 12;
      world.player.aimSpreadRad = wideSpread;
      performAttack(world);
      const b = world.bullets[world.bullets.length - 1];
      movingOffsets.push(Math.abs(b.shotSpreadOffsetRad ?? 0));
      expect(Math.abs(b.shotSpreadOffsetRad ?? 0)).toBeLessThanOrEqual(wideSpread * 0.5 + 1e-4);
    }

    // 2. Ao parar e manter a mira estável, o cone se estreita suavemente até o limite mínimo
    const steadyInp = createDefaultInputState();
    steadyInp.aimAngle = 0;
    stepWorld(world, steadyInp, 0.05);
    const midSpread = world.player.aimSpreadRad;
    expect(midSpread).toBeLessThan(wideSpread);
    expect(midSpread).toBeGreaterThan(minCone);

    for (let i = 0; i < 30; i++) {
      stepWorld(world, steadyInp, 0.05);
    }
    expect(world.player.aimSpreadRad).toBeCloseTo(minCone, 3);

    // Disparos com mira focada têm dispersão significativamente menor do que em movimento
    const focusedOffsets: number[] = [];
    for (let i = 0; i < 4; i++) {
      world.player.attackCooldown = 0;
      world.player.ammoInClip = 12;
      world.player.aimSpreadRad = minCone;
      performAttack(world);
      const b = world.bullets[world.bullets.length - 1];
      focusedOffsets.push(Math.abs(b.shotSpreadOffsetRad ?? 0));
      expect(Math.abs(b.shotSpreadOffsetRad ?? 0)).toBeLessThanOrEqual(minCone * 0.5 + 1e-4);
    }

    const avgMoving = movingOffsets.reduce((a, b) => a + b, 0) / movingOffsets.length;
    const avgFocused = focusedOffsets.reduce((a, b) => a + b, 0) / focusedOffsets.length;
    expect(avgMoving).toBeGreaterThan(avgFocused * 3);

    // 3. Zumbi na área válida é destacado como engajado sem fazer a mira grudar automaticamente
    const zTarget = createZombieFromArchetype('z_cone_target', 'lento', world.player.x + 140, world.player.y + 8);
    world.zombies = [zTarget];
    const manualAimAngle = 0.01;
    steadyInp.aimAngle = manualAimAngle;
    stepWorld(world, steadyInp, 0.05);

    expect(world.player.engagedTargetIds).toContain('z_cone_target');
    expect(world.player.engagedTargetId).toBe('z_cone_target');
    // Preserva o ângulo manual sem saltar para o centro do zumbi
    expect(world.player.facingAngle).toBeCloseTo(manualAimAngle, 5);
  });

  it('18. Toque direto em carro ou móvel saqueável interage sem acionar acidentalmente o joystick esquerdo', () => {
    const world = createInitialWorldState('spec_mobile_direct_tap', 'vila_esperanca');
    const pickupSpot = world.lootSpots.find((s) => s.id === 'loot_porta_luvas_pickup')!;
    const pickupCar = world.obstacles.find((o) => o.id === 'car_pickup')!;

    // Posiciona o jogador próximo à picape
    world.player.x = pickupSpot.x;
    world.player.y = pickupSpot.y + 18;

    // Toque em área vazia da rua NÃO consome o evento (permite abrir o joystick esquerdo normalmente)
    const emptyTouch = tryDirectObjectInteractAtWorldPoint(world, 100, 900);
    expect(emptyTouch.consumed).toBe(false);
    expect(pickupSpot.looted).toBe(false);

    // Toque direto sobre a carroceria do carro (car_pickup) consome o toque e realiza o saque sem abrir joystick
    const carBodyTouch = tryDirectObjectInteractAtWorldPoint(
      world,
      pickupCar.x + pickupCar.width * 0.5,
      pickupCar.y + pickupCar.height * 0.5
    );
    expect(carBodyTouch.consumed).toBe(true);
    expect(carBodyTouch.targetType).toBe('loot');
    expect(carBodyTouch.id).toBe('loot_porta_luvas_pickup');
    expect(pickupSpot.looted).toBe(true);
  });

  it('19. Campo de visão tático (Bullet Echo FOV), bloqueio de luz por paredes, lanterna real e sinais sonoros sem expor sprites', () => {
    const world = createInitialWorldState('spec_fov_acoustic', 'centro_comercial');
    world.obstacles = [];
    world.buildings = [];
    world.player.x = 500;
    world.player.y = 500;
    world.player.facingAngle = 0;
    world.ambientDarkness = 0.85;

    const targetX = 780;
    const targetY = 500;
    expect(world.player.flashlight.enabled).toBe(true);
    expect(evaluatePointVisibility(world, targetX, targetY)).toBe('visible');

    // Desligar a lanterna reduz o alcance efetivo no escuro
    toggleFlashlight(world);
    expect(world.player.flashlight.enabled).toBe(false);
    expect(evaluatePointVisibility(world, targetX, targetY)).toBe('hidden');

    // Religar a lanterna com parede sólida no caminho bloqueia a visão e a luz
    toggleFlashlight(world);
    world.obstacles = [{ id: 'wall_fov', x: 650, y: 440, width: 18, height: 120, kind: 'wall' }];
    expect(evaluatePointVisibility(world, targetX, targetY)).toBe('hidden');

    // Inimigo em movimento atrás da parede permanece invisível, mas gera sinal acústico direcional
    const hiddenRunner = createZombieFromArchetype('z_noisy_hidden', 'corredor', 740, 500);
    hiddenRunner.alertState = 'hunting';
    world.zombies = [hiddenRunner];

    stepWorld(world, createDefaultInputState(), 0.1);
    expect(hiddenRunner.isVisibleToPlayer).toBe(false);
    expect(hiddenRunner.visibilityState).toBe('hidden');
    expect(world.acousticCues.length).toBeGreaterThanOrEqual(1);
    expect(VISION_CONFIG.flashlightBonusRange).toBeGreaterThan(100);
  });

  it('20. Progressão do abrigo: sobreviventes, melhorias com efeito real na incursão, avanço de dias e evacuação final', () => {
    let stash = createInitialPersistentStash();
    expect(stash.day).toBe(1);
    expect(stash.survivors?.length).toBe(3);

    stash.totalStash.materiais = 25;
    stash.totalStash.medicamentos = 10;
    stash.totalStash.comida = 20;
    stash.totalStash.municao = 25;

    const upOficina = upgradeShelterStation(stash, 'oficina');
    expect(upOficina.ok).toBe(true);
    stash = upOficina.stash;

    const worldWithBonus = createInitialWorldState('spec_shelter_bonus', 'vila_esperanca', stash);
    expect(worldWithBonus.maxCarryCapacity).toBe(30);

    const upEnf = upgradeShelterStation(stash, 'enfermaria');
    expect(upEnf.ok).toBe(true);
    stash = upEnf.stash;

    stash = selectActiveSurvivor(stash, 'surv_elena');
    const worldElena = createInitialWorldState('spec_elena_run', 'vila_esperanca', stash);
    expect(worldElena.player.maxHp).toBe(115);

    worldElena.player.hp = 60;
    worldElena.status = 'extracted';
    stash = applyExtractionToStash(stash, worldElena);
    expect(stash.day).toBe(2);
    const elenaAfter = stash.survivors!.find((s) => s.id === 'surv_elena')!;
    expect(elenaAfter.status).toBe('ferido');

    const healed = healShelterSurvivor(stash, 'surv_elena');
    expect(healed.ok).toBe(true);
    stash = healed.stash;
    expect(stash.survivors!.find((s) => s.id === 'surv_elena')!.hp).toBeGreaterThan(elenaAfter.hp);

    stash.runsExtracted = 2;
    stash = upgradeShelterStation(stash, 'torre_radio').stash;
    expect(computeEvacuationProgress(stash)).toBeGreaterThan(50);

    const evac = executeEvacuation(stash);
    expect(evac.ok).toBe(true);
    expect(evac.stash.evacuationCompleted).toBe(true);
  });
});



