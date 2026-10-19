import {
  ACTION_STASH_SCHEMA_VERSION,
  type ActionInputState,
  type ActionLootBag,
  type ActionWorldState,
  type BulletEntity,
  type InteractPrompt,
  type MinimapSnapshot,
  type ObstacleRect,
  type PersistentShelterStash,
  type ZombieArchetype,
  type ZombieEntity,
} from './actionTypes.ts';
import {
  BUILDINGS,
  EXTRACTION_ZONE,
  INITIAL_LOOT_SPOTS,
  INITIAL_ZOMBIE_SPAWNS,
  MAP_OBSTACLES,
  PLAYER_SPAWN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './mapData.ts';

export function createEmptyLootBag(): ActionLootBag {
  return {
    comida: 0,
    medicamentos: 0,
    municao: 0,
    materiais: 0,
  };
}

export function createInitialPersistentStash(): PersistentShelterStash {
  return {
    schemaVersion: ACTION_STASH_SCHEMA_VERSION,
    totalStash: {
      comida: 4,
      medicamentos: 2,
      municao: 16,
      materiais: 3,
    },
    runsStarted: 0,
    runsExtracted: 0,
    runsDied: 0,
    totalZombiesKilled: 0,
    extractedRunIds: [],
    lastRunSummary: null,
    updatedAt: new Date().toISOString(),
  };
}

export function createZombieFromArchetype(
  id: string,
  archetype: ZombieArchetype,
  x: number,
  y: number,
  index = 0
): ZombieEntity {
  if (archetype === 'corredor') {
    return {
      id,
      archetype: 'corredor',
      name: 'Corredor Infectado',
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 14,
      facingAngle: 0,
      hp: 30,
      maxHp: 30,
      speed: 128,
      damage: 10,
      detectionRange: 480,
      attackRange: 34,
      attackCooldown: 0,
      windupTimer: 0,
      isWindingUp: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      dead: false,
      deathTimer: 0,
      flankSign: index % 2 === 0 ? 1 : -1,
    };
  }

  if (archetype === 'bruto') {
    return {
      id,
      archetype: 'bruto',
      name: 'Bruto Blindado',
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 22,
      facingAngle: 0,
      hp: 120,
      maxHp: 120,
      speed: 45,
      damage: 26,
      detectionRange: 420,
      attackRange: 44,
      attackCooldown: 0,
      windupTimer: 0,
      isWindingUp: false,
      hitFlashTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      dead: false,
      deathTimer: 0,
      flankSign: 1,
    };
  }

  return {
    id,
    archetype: 'lento',
    name: 'Errante Lento',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 16,
    facingAngle: 0,
    hp: 45,
    maxHp: 45,
    speed: 62,
    damage: 14,
    detectionRange: 430,
    attackRange: 36,
    attackCooldown: 0,
    windupTimer: 0,
    isWindingUp: false,
    hitFlashTimer: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    dead: false,
    deathTimer: 0,
    flankSign: 1,
  };
}

export function createInitialWorldState(runId?: string): ActionWorldState {
  const world: ActionWorldState = {
    runId: runId ?? `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    status: 'playing',
    elapsedTime: 0,
    hitstopTimer: 0,
    cameraShakeTrauma: 0,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    player: {
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      vx: 0,
      vy: 0,
      radius: 16,
      facingAngle: -Math.PI / 4, // Facing NE into the street
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      sprinting: false,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      invulnTimer: 0,
      equippedWeapon: 'pistola',
      ammoInClip: 12,
      clipSize: 12,
      ammoReserve: 18,
      reloadTimer: 0,
      reloadDuration: 1.0,
      attackCooldown: 0,
      meleeSwingTimer: 0,
      hurtFlashTimer: 0,
    },
    zombies: INITIAL_ZOMBIE_SPAWNS.map((s, idx) =>
      createZombieFromArchetype(s.id, s.archetype, s.x, s.y, idx)
    ),
    bullets: [],
    lootSpots: INITIAL_LOOT_SPOTS.map((l) => ({
      ...l,
      contents: { ...l.contents },
    })),
    obstacles: MAP_OBSTACLES.map((o) => ({ ...o })),
    buildings: BUILDINGS.map((b) => ({ ...b })),
    extractionZone: { ...EXTRACTION_ZONE },
    runLoot: {
      comida: 0,
      medicamentos: 1, // Starts with 1 emergency field bandage
      municao: 0,
      materiais: 0,
    },
    zombiesKilled: 0,
    shotsFired: 0,
    activePrompt: null,
    lastEventBanner: 'Explore o bairro, recolha suprimentos e extraia no Portão do Abrigo.',
    feedbacks: [],
    extractionProcessed: false,
    activeLooting: null,
    noiseEvents: [],
  };

  world.activePrompt = findNearestInteractable(world);
  return world;
}

export function emitNoise(
  world: ActionWorldState,
  x: number,
  y: number,
  radius: number,
  source: 'gunshot' | 'sprint' | 'loot' | 'melee'
): void {
  const intensity =
    source === 'gunshot' ? 1.0 : source === 'loot' ? 0.45 : source === 'sprint' ? 0.35 : 0.25;
  const duration = source === 'gunshot' ? 0.85 : 0.55;

  world.noiseEvents.push({
    id: `noise_${world.elapsedTime.toFixed(3)}_${world.noiseEvents.length}`,
    x,
    y,
    radius,
    intensity,
    duration,
    timer: duration,
    source,
  });

  // Alert all living zombies within sound propagation radius
  for (const z of world.zombies) {
    if (z.dead) continue;
    const dist = Math.hypot(z.x - x, z.y - y);
    if (dist <= radius) {
      // Direct detection: zombie turns towards sound origin and becomes immediately alerted
      z.facingAngle = Math.atan2(y - z.y, x - z.x);
    }
  }

  // Keep list bounded
  if (world.noiseEvents.length > 20) {
    world.noiseEvents.shift();
  }
}

export function createDefaultInputState(): ActionInputState {
  return {
    moveX: 0,
    moveY: 0,
    aimAngle: null,
    attackHeld: false,
    attackJustPressed: false,
    sprintHeld: false,
    dodgeJustPressed: false,
    interactJustPressed: false,
    reloadJustPressed: false,
    switchWeaponJustPressed: false,
    healJustPressed: false,
  };
}

export function resolveCircleRectCollision(
  cx: number,
  cy: number,
  radius: number,
  rect: ObstacleRect
): { x: number; y: number; collided: boolean } {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) {
    return { x: cx, y: cy, collided: false };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    const overlap = radius - dist;
    return {
      x: cx + (dx / dist) * overlap,
      y: cy + (dy / dist) * overlap,
      collided: true,
    };
  }

  // Center is inside the rectangle; push out along shortest axis
  const leftPen = cx - rect.x;
  const rightPen = rect.x + rect.width - cx;
  const topPen = cy - rect.y;
  const bottomPen = rect.y + rect.height - cy;
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

  if (minPen === leftPen) return { x: rect.x - radius, y: cy, collided: true };
  if (minPen === rightPen) return { x: rect.x + rect.width + radius, y: cy, collided: true };
  if (minPen === topPen) return { x: cx, y: rect.y - radius, collided: true };
  return { x: cx, y: rect.y + rect.height + radius, collided: true };
}

export function moveEntityWithCollisions(
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  dt: number,
  obstacles: ObstacleRect[],
  worldWidth: number,
  worldHeight: number
): { x: number; y: number; collided: boolean } {
  let nextX = x + vx * dt;
  let nextY = y + vy * dt;
  let anyCollision = false;

  for (const obs of obstacles) {
    const res = resolveCircleRectCollision(nextX, nextY, radius, obs);
    if (res.collided) {
      nextX = res.x;
      nextY = res.y;
      anyCollision = true;
    }
  }

  const minX = radius + 4;
  const maxX = worldWidth - radius - 4;
  const minY = radius + 4;
  const maxY = worldHeight - radius - 4;

  if (nextX < minX) {
    nextX = minX;
    anyCollision = true;
  } else if (nextX > maxX) {
    nextX = maxX;
    anyCollision = true;
  }

  if (nextY < minY) {
    nextY = minY;
    anyCollision = true;
  } else if (nextY > maxY) {
    nextY = maxY;
    anyCollision = true;
  }

  return { x: nextX, y: nextY, collided: anyCollision };
}

export function pointHitsObstacle(
  x: number,
  y: number,
  radius: number,
  obstacles: ObstacleRect[]
): boolean {
  for (const obs of obstacles) {
    if (
      x + radius > obs.x &&
      x - radius < obs.x + obs.width &&
      y + radius > obs.y &&
      y - radius < obs.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}

function addFloatingFeedback(
  world: ActionWorldState,
  text: string,
  x: number,
  y: number,
  color = '#f5f0e6'
): void {
  world.feedbacks.push({
    id: `fb_${world.elapsedTime.toFixed(3)}_${world.feedbacks.length}`,
    text,
    x,
    y,
    color,
    ttl: 0.9,
  });
  if (world.feedbacks.length > 18) {
    world.feedbacks.shift();
  }
}

export function startReload(world: ActionWorldState): boolean {
  const p = world.player;
  if (p.reloadTimer > 0) return false;
  if (p.ammoInClip >= p.clipSize) return false;
  if (p.ammoReserve <= 0) {
    world.lastEventBanner = 'Sem munição de reserva! Use o Facão [Espaço / Trocar] ou busque caixas.';
    return false;
  }

  p.reloadTimer = p.reloadDuration;
  world.lastEventBanner = 'Recarregando pistola 9mm...';
  return true;
}

export function finishReloadIfReady(world: ActionWorldState, dt: number): boolean {
  const p = world.player;
  if (p.reloadTimer <= 0) return false;

  p.reloadTimer = Math.max(0, p.reloadTimer - dt);
  if (p.reloadTimer === 0) {
    const needed = p.clipSize - p.ammoInClip;
    const toLoad = Math.min(needed, p.ammoReserve);
    p.ammoInClip += toLoad;
    p.ammoReserve -= toLoad;
    world.lastEventBanner = `Arma recarregada (${p.ammoInClip}/${p.clipSize}).`;
    return true;
  }
  return false;
}

export function performAttack(world: ActionWorldState): {
  type: 'shot' | 'melee' | 'empty' | 'cooldown';
  hits: number;
} {
  const p = world.player;
  if (p.attackCooldown > 0 || p.reloadTimer > 0) {
    return { type: 'cooldown', hits: 0 };
  }

  if (p.equippedWeapon === 'pistola') {
    if (p.ammoInClip <= 0) {
      // Reload using the fire button: if empty, touching/pressing fire initiates reload immediately
      if (p.ammoReserve > 0) {
        startReload(world);
      } else {
        // Auto-fallback to melee swing when completely out of ammo so player is never helpless
        return performMeleeSwing(world);
      }
      return { type: 'empty', hits: 0 };
    }

    p.ammoInClip -= 1;
    p.attackCooldown = 0.22;
    world.shotsFired += 1;

    const bulletSpeed = 680;
    const muzzleDist = p.radius + 8;
    const bx = p.x + Math.cos(p.facingAngle) * muzzleDist;
    const by = p.y + Math.sin(p.facingAngle) * muzzleDist;

    const bullet: BulletEntity = {
      id: `b_${world.shotsFired}_${world.elapsedTime.toFixed(2)}`,
      x: bx,
      y: by,
      vx: Math.cos(p.facingAngle) * bulletSpeed,
      vy: Math.sin(p.facingAngle) * bulletSpeed,
      radius: 4,
      damage: 24,
      lifeTimer: 0.95,
      active: true,
    };

    world.bullets.push(bullet);
    world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.15);

    // Gunshot emits high-radius acoustic impulse (480px) attracting zombies
    emitNoise(world, p.x, p.y, 480, 'gunshot');

    // If clip became 0 after this shot, trigger reload immediately
    if (p.ammoInClip === 0 && p.ammoReserve > 0) {
      startReload(world);
    }

    return { type: 'shot', hits: 0 };
  }

  return performMeleeSwing(world);
}

export function performMeleeSwing(world: ActionWorldState): {
  type: 'melee';
  hits: number;
} {
  const p = world.player;
  p.attackCooldown = 0.36;
  p.meleeSwingTimer = 0.2;

  // Melee attack is much quieter than gunshot (80px radius)
  emitNoise(world, p.x, p.y, 80, 'melee');

  const meleeReach = 64;
  const meleeDamage = 28;
  let hits = 0;

  for (const z of world.zombies) {
    if (z.dead) continue;
    const dx = z.x - p.x;
    const dy = z.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > meleeReach + z.radius) continue;

    // Check angle cone (~120 degrees in front, or any direction if overlapping closely)
    const angleToZombie = Math.atan2(dy, dx);
    let angleDiff = Math.abs(
      ((angleToZombie - p.facingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    );
    if (dist <= p.radius + z.radius + 10) {
      angleDiff = 0;
    }

    if (angleDiff <= Math.PI * 0.65) {
      hits += 1;
      damageZombie(world, z, meleeDamage, Math.cos(angleToZombie), Math.sin(angleToZombie), 220);
    }
  }

  if (hits > 0) {
    world.hitstopTimer = 0.04;
    world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.25);
  }

  return { type: 'melee', hits };
}

export function damageZombie(
  world: ActionWorldState,
  z: ZombieEntity,
  amount: number,
  dirX: number,
  dirY: number,
  knockbackForce: number
): void {
  if (z.dead) return;
  z.hp = Math.max(0, z.hp - amount);
  z.hitFlashTimer = 0.12;

  const kbScale = z.archetype === 'bruto' ? 0.35 : 1.0;
  z.knockbackVx = dirX * knockbackForce * kbScale;
  z.knockbackVy = dirY * knockbackForce * kbScale;

  addFloatingFeedback(world, `-${amount}`, z.x, z.y - z.radius, '#f59e0b');

  if (z.hp <= 0) {
    z.dead = true;
    z.deathTimer = 0.35;
    world.zombiesKilled += 1;
    world.hitstopTimer = Math.max(world.hitstopTimer, 0.045);
    addFloatingFeedback(world, 'Abatido!', z.x, z.y - z.radius - 12, '#ef4444');
  }
}

export function applyDamageToPlayer(
  world: ActionWorldState,
  amount: number,
  attackerName: string
): boolean {
  const p = world.player;
  if (world.status !== 'playing') return false;
  if (p.invulnTimer > 0 || p.dodgeTimer > 0) return false;

  const actualDamage = Math.max(1, Math.floor(amount));
  p.hp = Math.max(0, p.hp - actualDamage);
  p.invulnTimer = 0.65;
  p.hurtFlashTimer = 0.22;
  world.hitstopTimer = 0.05;
  world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.45);

  addFloatingFeedback(world, `-${actualDamage} PV`, p.x, p.y - 24, '#ef4444');
  world.lastEventBanner = `Atingido por ${attackerName} (-${actualDamage} PV)!`;

  if (p.hp <= 0) {
    p.hp = 0;
    world.status = 'dead';
    world.lastEventBanner = 'Você tombou em combate. O saque não extraído foi perdido.';
  }

  return true;
}

export function useFieldMedkit(world: ActionWorldState): boolean {
  const p = world.player;
  if (world.status !== 'playing' || p.hp <= 0) return false;
  if (p.hp >= p.maxHp) {
    world.lastEventBanner = 'Saúde já está no máximo (100 PV).';
    return false;
  }
  if (world.runLoot.medicamentos <= 0) {
    world.lastEventBanner = 'Sem Medicamentos na mochila para curar.';
    return false;
  }

  world.runLoot.medicamentos -= 1;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + 40);
  const healed = p.hp - before;

  addFloatingFeedback(world, `+${healed} PV`, p.x, p.y - 24, '#10b981');
  world.lastEventBanner = `Curativo aplicado (+${healed} PV).`;
  return true;
}

export function findNearestInteractable(world: ActionWorldState): InteractPrompt | null {
  const p = world.player;

  // 1. Check unlooted loot spots within interaction range
  let closestLoot: InteractPrompt | null = null;
  let minDist = Infinity;

  for (const spot of world.lootSpots) {
    if (spot.looted) continue;
    const dist = Math.hypot(spot.x - p.x, spot.y - p.y);
    if (dist <= spot.radius + p.radius + 26 && dist < minDist) {
      minDist = dist;
      closestLoot = {
        targetType: 'loot',
        id: spot.id,
        label: `Saquear: ${spot.label}`,
        x: spot.x,
        y: spot.y,
      };
    }
  }

  if (closestLoot) return closestLoot;

  // 2. Check Extraction Zone
  const ext = world.extractionZone;
  const distToExt = Math.hypot(ext.x - p.x, ext.y - p.y);
  if (distToExt <= ext.radius + p.radius + 16) {
    return {
      targetType: 'extraction',
      id: ext.id,
      label: 'Extrair no Portão do Abrigo (Concluir Incursão)',
      x: ext.x,
      y: ext.y,
    };
  }

  return null;
}

export function triggerInteract(world: ActionWorldState): {
  interacted: boolean;
  action?: 'looted' | 'extracted';
  summary?: string;
} {
  if (world.status !== 'playing') return { interacted: false };

  const prompt = findNearestInteractable(world);
  if (!prompt) {
    world.lastEventBanner = 'Aproxime-se de uma caixa de suprimentos ou do Portão de Extração.';
    return { interacted: false };
  }

  if (prompt.targetType === 'loot') {
    const spot = world.lootSpots.find((s) => s.id === prompt.id);
    if (!spot || spot.looted) return { interacted: false };

    spot.looted = true;
    const parts: string[] = [];

    if (spot.contents.comida) {
      world.runLoot.comida += spot.contents.comida;
      parts.push(`+${spot.contents.comida} Comida`);
    }
    if (spot.contents.medicamentos) {
      world.runLoot.medicamentos += spot.contents.medicamentos;
      parts.push(`+${spot.contents.medicamentos} Remédios`);
    }
    if (spot.contents.materiais) {
      world.runLoot.materiais += spot.contents.materiais;
      parts.push(`+${spot.contents.materiais} Materiais`);
    }
    if (spot.contents.municao) {
      world.runLoot.municao += spot.contents.municao;
      world.player.ammoReserve += spot.contents.municao;
      parts.push(`+${spot.contents.municao} Munição`);
    }

    const summary = `${spot.label}: ${parts.join(', ')}`;
    world.lastEventBanner = `Coletado — ${summary}`;
    addFloatingFeedback(world, parts.join(' '), spot.x, spot.y - 18, '#10b981');
    world.activePrompt = findNearestInteractable(world);

    return { interacted: true, action: 'looted', summary };
  }

  if (prompt.targetType === 'extraction') {
    world.status = 'extracted';
    world.lastEventBanner = 'Extração concluída com sucesso! Suprimentos salvos no abrigo.';
    return {
      interacted: true,
      action: 'extracted',
      summary: 'Extração concluída!',
    };
  }

  return { interacted: false };
}

export function stepWorld(
  world: ActionWorldState,
  input: ActionInputState,
  rawDt: number
): ActionWorldState {
  if (world.status !== 'playing') return world;

  // Clamp dt to <= 0.05s per ultra-mode simulation rules so frame hiccups never tunnel entities
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  world.elapsedTime += dt;

  // Decay camera shake and floating feedbacks in real dt
  world.cameraShakeTrauma = Math.max(0, world.cameraShakeTrauma - dt * 1.8);
  for (let i = world.feedbacks.length - 1; i >= 0; i--) {
    world.feedbacks[i].ttl -= dt;
    world.feedbacks[i].y -= dt * 22;
    if (world.feedbacks[i].ttl <= 0) {
      world.feedbacks.splice(i, 1);
    }
  }

  // Hitstop freeze timer pauses simulation physics briefly on heavy hits
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return world;
  }

  const p = world.player;

  // Timers
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.hurtFlashTimer = Math.max(0, p.hurtFlashTimer - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.meleeSwingTimer = Math.max(0, p.meleeSwingTimer - dt);
  p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
  p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);

  finishReloadIfReady(world, dt);

  // One-shot actions
  if (input.switchWeaponJustPressed) {
    p.equippedWeapon = p.equippedWeapon === 'pistola' ? 'facao' : 'pistola';
    p.reloadTimer = 0;
    world.lastEventBanner =
      p.equippedWeapon === 'pistola'
        ? 'Equipada: Pistola Tática 9mm'
        : 'Equipado: Facão / Pé de Cabra (Corpo a Corpo)';
  }

  if (input.reloadJustPressed && p.equippedWeapon === 'pistola') {
    startReload(world);
  }

  if (input.healJustPressed) {
    useFieldMedkit(world);
  }

  if (input.interactJustPressed) {
    triggerInteract(world);
    if (world.status !== 'playing') return world;
  }

  // Movement & Dodge / Sprint
  const moveMag = Math.hypot(input.moveX, input.moveY);
  const normX = moveMag > 0.01 ? input.moveX / Math.max(1, moveMag) : 0;
  const normY = moveMag > 0.01 ? input.moveY / Math.max(1, moveMag) : 0;

  if (input.dodgeJustPressed && p.dodgeCooldown <= 0 && p.stamina >= 25) {
    p.stamina = Math.max(0, p.stamina - 25);
    p.dodgeTimer = 0.22;
    p.dodgeCooldown = 0.75;
    p.invulnTimer = Math.max(p.invulnTimer, 0.24);
    const dodgeAngle =
      moveMag > 0.05 ? Math.atan2(normY, normX) : p.facingAngle;
    p.vx = Math.cos(dodgeAngle) * 390;
    p.vy = Math.sin(dodgeAngle) * 390;
  } else if (p.dodgeTimer <= 0) {
    const wantsSprint = input.sprintHeld && moveMag > 0.1 && p.stamina > 4;
    p.sprinting = wantsSprint;

    if (wantsSprint) {
      p.stamina = Math.max(0, p.stamina - 26 * dt);
    } else {
      p.stamina = Math.min(p.maxStamina, p.stamina + 18 * dt);
    }

    const baseSpeed = 185;
    const speedMultiplier = wantsSprint ? 1.42 : 1.0;
    const targetVx = normX * baseSpeed * speedMultiplier;
    const targetVy = normY * baseSpeed * speedMultiplier;
    const accelRate = moveMag > 0.05 ? 18 : 14;
    const blend = Math.min(1, dt * accelRate);
    p.vx += (targetVx - p.vx) * blend;
    p.vy += (targetVy - p.vy) * blend;
    if (moveMag <= 0.05 && Math.hypot(p.vx, p.vy) < 4) {
      p.vx = 0;
      p.vy = 0;
    }
  }

  // Sprinting emits footsteps noise (160px radius) every 0.35s
  if (p.sprinting && (Math.abs(p.vx) > 30 || Math.abs(p.vy) > 30)) {
    if (Math.floor(world.elapsedTime / 0.35) !== Math.floor((world.elapsedTime - dt) / 0.35)) {
      emitNoise(world, p.x, p.y, 160, 'sprint');
    }
  }

  // Decay active noise events
  for (let i = world.noiseEvents.length - 1; i >= 0; i--) {
    const ne = world.noiseEvents[i];
    ne.timer -= dt;
    if (ne.timer <= 0) {
      world.noiseEvents.splice(i, 1);
    }
  }

  // Automatic Proximity Looting System:
  // When player is within range of an unlooted crate, looting progresses automatically over 0.9s.
  // Visual progress is displayed, noise is generated (110px radius), delivered once, and resets if leaving range or interrupted.
  const nearestLoot = world.lootSpots.find(
    (s) => !s.looted && Math.hypot(s.x - p.x, s.y - p.y) <= s.radius + p.radius + 26
  );

  if (nearestLoot) {
    if (!world.activeLooting || world.activeLooting.spotId !== nearestLoot.id) {
      world.activeLooting = {
        spotId: nearestLoot.id,
        progress: 0,
        duration: 0.9,
      };
      // Loot rustling noise
      emitNoise(world, nearestLoot.x, nearestLoot.y, 110, 'loot');
    } else {
      world.activeLooting.progress += dt;
      if (world.activeLooting.progress >= world.activeLooting.duration) {
        // Complete loot action
        nearestLoot.looted = true;
        const parts: string[] = [];
        if (nearestLoot.contents.comida) {
          world.runLoot.comida += nearestLoot.contents.comida;
          parts.push(`+${nearestLoot.contents.comida} Comida`);
        }
        if (nearestLoot.contents.medicamentos) {
          world.runLoot.medicamentos += nearestLoot.contents.medicamentos;
          parts.push(`+${nearestLoot.contents.medicamentos} Remédios`);
        }
        if (nearestLoot.contents.materiais) {
          world.runLoot.materiais += nearestLoot.contents.materiais;
          parts.push(`+${nearestLoot.contents.materiais} Materiais`);
        }
        if (nearestLoot.contents.municao) {
          world.runLoot.municao += nearestLoot.contents.municao;
          world.player.ammoReserve += nearestLoot.contents.municao;
          parts.push(`+${nearestLoot.contents.municao} Munição`);
        }

        const summary = `${nearestLoot.label}: ${parts.join(', ')}`;
        world.lastEventBanner = `Vasculhado — ${summary}`;
        addFloatingFeedback(world, parts.join(' '), nearestLoot.x, nearestLoot.y - 18, '#10b981');
        world.activeLooting = null;
      }
    }
  } else {
    world.activeLooting = null;
  }

  // Facing direction: explicit aimAngle takes priority, otherwise movement direction
  if (input.aimAngle !== null && Number.isFinite(input.aimAngle)) {
    p.facingAngle = input.aimAngle;
  } else if (moveMag > 0.1) {
    p.facingAngle = Math.atan2(normY, normX);
  }

  // Move player with solid wall/obstacle collisions
  const movedPlayer = moveEntityWithCollisions(
    p.x,
    p.y,
    p.vx,
    p.vy,
    p.radius,
    dt,
    world.obstacles,
    world.worldWidth,
    world.worldHeight
  );
  p.x = movedPlayer.x;
  p.y = movedPlayer.y;

  // Attack handling (supports attacking while moving)
  if (input.attackJustPressed || input.attackHeld) {
    performAttack(world);
  }

  // Step Bullets
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    if (!b.active) {
      world.bullets.splice(i, 1);
      continue;
    }

    b.lifeTimer -= dt;
    if (b.lifeTimer <= 0) {
      world.bullets.splice(i, 1);
      continue;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Check obstacle collision
    if (
      b.x < 0 ||
      b.x > world.worldWidth ||
      b.y < 0 ||
      b.y > world.worldHeight ||
      pointHitsObstacle(b.x, b.y, b.radius, world.obstacles)
    ) {
      world.bullets.splice(i, 1);
      continue;
    }

    // Check zombie hit
    let hitZombie = false;
    for (const z of world.zombies) {
      if (z.dead) continue;
      const dist = Math.hypot(z.x - b.x, z.y - b.y);
      if (dist <= z.radius + b.radius + 2) {
        const mag = Math.hypot(b.vx, b.vy) || 1;
        damageZombie(world, z, b.damage, b.vx / mag, b.vy / mag, 150);
        hitZombie = true;
        break;
      }
    }

    if (hitZombie) {
      world.bullets.splice(i, 1);
    }
  }

  // Step Zombies: AI tracks sight detection OR acoustic alerts from noise events
  let activeWindups = 0;
  for (let i = world.zombies.length - 1; i >= 0; i--) {
    const z = world.zombies[i];
    z.hitFlashTimer = Math.max(0, z.hitFlashTimer - dt);

    if (z.dead) {
      z.deathTimer = Math.max(0, z.deathTimer - dt);
      continue;
    }

    z.attackCooldown = Math.max(0, z.attackCooldown - dt);

    // Apply decaying knockback
    if (Math.hypot(z.knockbackVx, z.knockbackVy) > 5) {
      const kbMove = moveEntityWithCollisions(
        z.x,
        z.y,
        z.knockbackVx,
        z.knockbackVy,
        z.radius,
        dt,
        world.obstacles,
        world.worldWidth,
        world.worldHeight
      );
      z.x = kbMove.x;
      z.y = kbMove.y;
      z.knockbackVx *= Math.pow(0.05, dt);
      z.knockbackVy *= Math.pow(0.05, dt);
    }

    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const distToPlayer = Math.hypot(dx, dy);

    // Check if player is detected visually OR via acoustic noise events
    let isAlerted = distToPlayer <= z.detectionRange;
    let targetX = p.x;
    let targetY = p.y;

    if (!isAlerted) {
      // Check for any active noise event within hearing radius of zombie
      for (const ne of world.noiseEvents) {
        const distToNoise = Math.hypot(ne.x - z.x, ne.y - z.y);
        if (distToNoise <= ne.radius) {
          isAlerted = true;
          targetX = ne.x;
          targetY = ne.y;
          break;
        }
      }
    }

    if (isAlerted) {
      const tdx = targetX - z.x;
      const tdy = targetY - z.y;
      z.facingAngle = Math.atan2(tdy, tdx);

      // Handle windup attack telegraph if near actual player
      if (z.isWindingUp) {
        activeWindups += 1;
        z.windupTimer -= dt;
        if (z.windupTimer <= 0) {
          z.isWindingUp = false;
          z.attackCooldown = z.archetype === 'corredor' ? 0.85 : 1.15;
          if (distToPlayer <= z.attackRange + p.radius + 10) {
            applyDamageToPlayer(world, z.damage, z.name);
          }
        }
        continue;
      }

      // Start attack windup if within attack range of player
      if (distToPlayer <= z.attackRange + p.radius && z.attackCooldown <= 0 && activeWindups < 3) {
        z.isWindingUp = true;
        z.windupTimer = z.archetype === 'bruto' ? 0.45 : 0.28;
        activeWindups += 1;
        continue;
      }

      // Movement behavior policy by archetype
      let moveAngle = z.facingAngle;
      if (z.archetype === 'corredor' && distToPlayer > 95) {
        // Corredor weaves at a flanking angle while closing distance
        moveAngle += z.flankSign * 0.48;
      }

      z.vx = Math.cos(moveAngle) * z.speed;
      z.vy = Math.sin(moveAngle) * z.speed;

      const movedZ = moveEntityWithCollisions(
        z.x,
        z.y,
        z.vx,
        z.vy,
        z.radius,
        dt,
        world.obstacles,
        world.worldWidth,
        world.worldHeight
      );
      z.x = movedZ.x;
      z.y = movedZ.y;
    } else {
      z.vx = 0;
      z.vy = 0;
      z.isWindingUp = false;
    }
  }

  world.activePrompt = findNearestInteractable(world);
  return world;
}

export function applyExtractionToStash(
  stash: PersistentShelterStash,
  world: ActionWorldState
): PersistentShelterStash {
  // Guard against processing the same run twice
  if (stash.extractedRunIds.includes(world.runId)) {
    return stash;
  }

  if (world.status === 'extracted') {
    const nextStash: ActionLootBag = {
      comida: stash.totalStash.comida + world.runLoot.comida,
      medicamentos: stash.totalStash.medicamentos + world.runLoot.medicamentos,
      municao: stash.totalStash.municao + world.runLoot.municao,
      materiais: stash.totalStash.materiais + world.runLoot.materiais,
    };

    return {
      ...stash,
      totalStash: nextStash,
      runsStarted: stash.runsStarted + 1,
      runsExtracted: stash.runsExtracted + 1,
      totalZombiesKilled: stash.totalZombiesKilled + world.zombiesKilled,
      extractedRunIds: [...stash.extractedRunIds, world.runId].slice(-50),
      lastRunSummary: {
        outcome: 'extracted',
        lootGained: { ...world.runLoot },
        zombiesKilled: world.zombiesKilled,
        durationSeconds: Math.round(world.elapsedTime),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  if (world.status === 'dead') {
    return {
      ...stash,
      runsStarted: stash.runsStarted + 1,
      runsDied: stash.runsDied + 1,
      totalZombiesKilled: stash.totalZombiesKilled + world.zombiesKilled,
      extractedRunIds: [...stash.extractedRunIds, world.runId].slice(-50),
      lastRunSummary: {
        outcome: 'dead',
        lootGained: createEmptyLootBag(),
        zombiesKilled: world.zombiesKilled,
        durationSeconds: Math.round(world.elapsedTime),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  return stash;
}

export function buildMinimapSnapshot(
  world: ActionWorldState,
  mapWidth = 128,
  mapHeight = 96
): MinimapSnapshot {
  const safeWorldW = Math.max(1, world.worldWidth);
  const safeWorldH = Math.max(1, world.worldHeight);
  const scaleX = mapWidth / safeWorldW;
  const scaleY = mapHeight / safeWorldH;

  const clampX = (wx: number) =>
    Math.max(0, Math.min(mapWidth, Number((wx * scaleX).toFixed(2))));
  const clampY = (wy: number) =>
    Math.max(0, Math.min(mapHeight, Number((wy * scaleY).toFixed(2))));

  const p = world.player;
  const ext = world.extractionZone;

  const dxExt = ext.x - p.x;
  const dyExt = ext.y - p.y;
  const distPx = Math.hypot(dxExt, dyExt);
  const insideExtraction = distPx <= ext.radius + p.radius;

  const shortTagForBuilding = (id: string, name: string): string => {
    if (id.includes('mercado')) return 'MER';
    if (id.includes('farmacia')) return 'FAR';
    if (id.includes('delegacia')) return 'POL';
    return name.slice(0, 3).toUpperCase();
  };

  return {
    mapWidth,
    mapHeight,
    player: {
      x: clampX(p.x),
      y: clampY(p.y),
      worldX: Math.round(p.x),
      worldY: Math.round(p.y),
      normX: Math.max(0, Math.min(1, p.x / safeWorldW)),
      normY: Math.max(0, Math.min(1, p.y / safeWorldH)),
      facingAngle: p.facingAngle,
      insideExtraction,
    },
    extraction: {
      id: ext.id,
      label: ext.label,
      x: clampX(ext.x),
      y: clampY(ext.y),
      worldX: Math.round(ext.x),
      worldY: Math.round(ext.y),
      normX: Math.max(0, Math.min(1, ext.x / safeWorldW)),
      normY: Math.max(0, Math.min(1, ext.y / safeWorldH)),
      radius: Math.max(4, Number((ext.radius * ((scaleX + scaleY) * 0.5)).toFixed(2))),
      distanceMeters: Math.max(0, Math.round(distPx / 12)),
      bearingRad: Math.atan2(dyExt, dxExt),
    },
    buildings: world.buildings.map((b) => ({
      id: b.id,
      name: b.name,
      shortTag: shortTagForBuilding(b.id, b.name),
      x: clampX(b.x),
      y: clampY(b.y),
      width: Number((b.width * scaleX).toFixed(2)),
      height: Number((b.height * scaleY).toFixed(2)),
    })),
    lootSpots: world.lootSpots.map((spot) => ({
      id: spot.id,
      x: clampX(spot.x),
      y: clampY(spot.y),
      looted: spot.looted,
    })),
    zombies: world.zombies
      .filter((z) => !z.dead)
      .map((z) => ({
        id: z.id,
        x: clampX(z.x),
        y: clampY(z.y),
        archetype: z.archetype,
      })),
  };
}

