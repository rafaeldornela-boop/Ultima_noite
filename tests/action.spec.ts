import { describe, expect, it } from 'vitest';
import {
  applyDamageToPlayer,
  applyExtractionToStash,
  buildMinimapSnapshot,
  createDefaultInputState,
  createInitialPersistentStash,
  createInitialWorldState,
  createZombieFromArchetype,
  performAttack,
  startReload,
  stepWorld,
  triggerInteract,
  useFieldMedkit,
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
});

