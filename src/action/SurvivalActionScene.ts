import Phaser from 'phaser';
import {
  createDefaultInputState,
  stepWorld,
} from './actionRules.ts';
import type {
  ActionInputState,
  ActionWorldState,
  ZombieEntity,
} from './actionTypes.ts';
import { soundFX } from '../utils/sound.ts';

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

const PARTICLE_POOL_SIZE = 120;

export interface ExternalControlBridge {
  joyMoveX: number;
  joyMoveY: number;
  aimAngle: number | null;
  attackHeld: boolean;
  sprintHeld: boolean;
  queuedAttack: boolean;
  queuedDodge: boolean;
  queuedInteract: boolean;
  queuedReload: boolean;
  queuedSwitchWeapon: boolean;
  queuedHeal: boolean;
  queuedToggleFlashlight: boolean;
  reducedEffects: boolean;
}

export function createExternalControlBridge(): ExternalControlBridge {
  return {
    joyMoveX: 0,
    joyMoveY: 0,
    aimAngle: null,
    attackHeld: false,
    sprintHeld: false,
    queuedAttack: false,
    queuedDodge: false,
    queuedInteract: false,
    queuedReload: false,
    queuedSwitchWeapon: false,
    queuedHeal: false,
    queuedToggleFlashlight: false,
    reducedEffects: false,
  };
}

export class SurvivalActionScene extends Phaser.Scene {
  private worldState!: ActionWorldState;
  private bridge!: ExternalControlBridge;
  private onHudSync!: (world: ActionWorldState) => void;
  private isPausedRef!: () => boolean;

  private mapGraphics!: Phaser.GameObjects.Graphics;
  private decalGraphics!: Phaser.GameObjects.Graphics;
  private shadowGraphics!: Phaser.GameObjects.Graphics;
  private dynamicGraphics!: Phaser.GameObjects.Graphics;
  private lightingGraphics!: Phaser.GameObjects.Graphics;
  private staticLayerGroup!: Phaser.GameObjects.Group;
  private lootSpriteMap = new Map<string, Phaser.GameObjects.Sprite>();
  private zombieSpriteMap = new Map<string, Phaser.GameObjects.Sprite>();
  private zombieCorpseDrawn = new Set<string>();
  private playerSprite?: Phaser.GameObjects.Sprite;

  // Pre-allocated zero-GC particle pool
  private particlePool: PooledParticle[] = [];
  private particleCursor = 0;

  // Keyboard & pointer tracking
  private keysPressed = new Set<string>();
  private justPressedKeys = new Set<string>();
  private mouseDown = false;
  private mouseJustPressed = false;
  private mouseScreenX = 0;
  private mouseScreenY = 0;
  private hasMouseMoved = false;

  // State delta trackers for sound FX, recoil, shell casings & blood decals
  private prevShotsFired = 0;
  private prevZombiesKilled = 0;
  private prevPlayerHp = 100;
  private prevLootTotal = 0;
  private prevMeleeTimer = 0;
  private prevReloadTimer = 0;
  private prevFlashlightOn = true;
  private prevHealingActive = false;
  private zombiePrevHp = new Map<string, number>();
  private shotFlashTimer = 0;
  private walkAnimTime = 0;
  private hudSyncAccumulator = 0;

  constructor() {
    super({ key: 'SurvivalActionScene' });
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.3,
        size: 2.5,
        color: 0xffffff,
      });
    }
  }

  public bindRuntime(
    world: ActionWorldState,
    bridge: ExternalControlBridge,
    onHudSync: (world: ActionWorldState) => void,
    isPausedRef: () => boolean
  ): void {
    this.worldState = world;
    this.bridge = bridge;
    this.onHudSync = onHudSync;
    this.isPausedRef = isPausedRef;
    this.prevShotsFired = world.shotsFired;
    this.prevZombiesKilled = world.zombiesKilled;
    this.prevPlayerHp = world.player.hp;
    this.prevReloadTimer = world.player.reloadTimer;
    this.prevFlashlightOn = world.player.flashlight.enabled;
    this.prevHealingActive = !!world.player.healing?.active;
    this.prevLootTotal =
      world.runLoot.comida +
      world.runLoot.medicamentos +
      world.runLoot.municao +
      world.runLoot.materiais;

    this.zombiePrevHp.clear();
    for (const z of world.zombies) {
      this.zombiePrevHp.set(z.id, z.hp);
    }

    if (this.mapGraphics) {
      this.buildStaticEnvironment();
    }
  }

  preload(): void {
    this.load.spritesheet('survivor_sheet', '/assets/pixel/survivor_sheet.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('zombies_sheet', '/assets/pixel/zombies_sheet.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet('urban_tileset', '/assets/pixel/urban_tileset.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('vehicles_sheet', '/assets/pixel/vehicles_sheet.png', {
      frameWidth: 128,
      frameHeight: 64,
    });
  }

  create(): void {
    // Enforce crisp nearest-neighbor pixel art filtering on loaded textures
    ['survivor_sheet', 'zombies_sheet', 'urban_tileset', 'vehicles_sheet'].forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    this.cameras.main.setBounds(
      0,
      0,
      this.worldState.worldWidth,
      this.worldState.worldHeight
    );
    this.cameras.main.setBackgroundColor('#0d0c0a');
    this.cameras.main.centerOn(this.worldState.player.x, this.worldState.player.y);

    this.mapGraphics = this.add.graphics().setDepth(1);
    this.staticLayerGroup = this.add.group();
    this.decalGraphics = this.add.graphics().setDepth(4);
    this.shadowGraphics = this.add.graphics().setDepth(8);
    this.dynamicGraphics = this.add.graphics().setDepth(22);
    this.lightingGraphics = this.add.graphics().setDepth(35);

    this.buildStaticEnvironment();
    this.syncEntitySprites();

    // Pointer listeners on canvas
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseScreenX = pointer.x;
      this.mouseScreenY = pointer.y;
      this.hasMouseMoved = true;
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        this.mouseScreenX = pointer.x;
        this.mouseScreenY = pointer.y;
        this.hasMouseMoved = true;
        this.mouseDown = true;
        this.mouseJustPressed = true;
      }
    });

    this.input.on('pointerup', () => {
      this.mouseDown = false;
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const code = e.code;
      if (!this.keysPressed.has(code)) {
        this.justPressedKeys.add(code);
      }
      this.keysPressed.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    };

    const clearInputs = () => {
      this.keysPressed.clear();
      this.justPressedKeys.clear();
      this.mouseDown = false;
      this.mouseJustPressed = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    });
  }

  private spawnParticles(
    x: number,
    y: number,
    count: number,
    color: number,
    speedMin: number,
    speedMax: number,
    baseAngle?: number,
    spread = Math.PI * 2,
    sizeMin = 1.8,
    sizeMax = 3.6
  ): void {
    const actualCount = this.bridge?.reducedEffects ? Math.max(2, Math.floor(count * 0.45)) : count;
    for (let i = 0; i < actualCount; i++) {
      const p = this.particlePool[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;

      const angle =
        baseAngle !== undefined
          ? baseAngle + (Math.random() - 0.5) * spread
          : Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.maxLife = 0.16 + Math.random() * 0.22;
      p.life = p.maxLife;
      p.size = sizeMin + Math.random() * (sizeMax - sizeMin);
      p.color = color;
    }
  }

  private stampBloodDecal(x: number, y: number, radius = 9): void {
    if (!this.decalGraphics) return;
    const r = this.bridge?.reducedEffects ? radius * 0.65 : radius;
    this.decalGraphics.fillStyle(0x3b0b09, 0.72);
    this.decalGraphics.fillEllipse(x, y, r * 2.1, r * 1.5);
    this.decalGraphics.fillStyle(0x59120e, 0.8);
    this.decalGraphics.fillCircle(x + 2, y - 1, r * 0.65);
  }

  private buildStaticEnvironment(): void {
    const g = this.mapGraphics;
    g.clear();
    this.decalGraphics.clear();
    this.staticLayerGroup.clear(true, true);
    this.lootSpriteMap.clear();
    this.zombieCorpseDrawn.clear();

    const W = this.worldState.worldWidth;
    const H = this.worldState.worldHeight;
    const hasTileset = this.textures.exists('urban_tileset');
    const hasVehicles = this.textures.exists('vehicles_sheet');

    // 1. Base Weathered Concrete Sidewalk TileSprite across the urban block
    g.fillStyle(0x1e1b18, 1);
    g.fillRect(0, 0, W, H);

    if (hasTileset) {
      const sidewalkTs = this.add
        .tileSprite(W * 0.5, H * 0.5, W, H, 'urban_tileset', 2)
        .setDepth(1)
        .setAlpha(0.92);
      this.staticLayerGroup.add(sidewalkTs);
    }

    // 2. Deteriorated Asphalt Roads with Sidewalk Curbs & Potholes
    // Curb stone borders (depth 1) + Textured Asphalt TileSprites (depth 2)
    g.fillStyle(0x2e2925, 1);
    g.fillRect(28, 452, W - 56, 216);
    g.fillRect(612, 28, 276, H - 56);
    g.fillRect(28, 852, 928, 232);

    g.fillStyle(0x141312, 1);
    g.fillRect(28, 460, W - 56, 200);
    g.fillRect(620, 28, 260, H - 56);
    g.fillRect(28, 860, 920, 220);

    if (hasTileset) {
      const roadHoriz = this.add
        .tileSprite(28 + (W - 56) * 0.5, 460 + 100, W - 56, 200, 'urban_tileset', 0)
        .setDepth(2);
      const roadVert = this.add
        .tileSprite(620 + 130, 28 + (H - 56) * 0.5, 260, H - 56, 'urban_tileset', 0)
        .setDepth(2);
      const roadSouth = this.add
        .tileSprite(28 + 460, 860 + 110, 920, 220, 'urban_tileset', 0)
        .setDepth(2);
      this.staticLayerGroup.add(roadHoriz);
      this.staticLayerGroup.add(roadVert);
      this.staticLayerGroup.add(roadSouth);

      // Curated cracked asphalt patches (frame 1) & overgrowth along building walls (frame 10)
      [
        [420, 520],
        [690, 590],
        [740, 380],
        [770, 740],
        [290, 930],
        [540, 980],
        [1080, 560],
      ].forEach(([cx, cy]) => {
        const crack = this.add.image(cx, cy, 'urban_tileset', 1).setDepth(2).setScale(1.5);
        this.staticLayerGroup.add(crack);
      });

      [
        [120, 140],
        [125, 390],
        [590, 135],
        [920, 145],
        [1430, 390],
        [940, 720],
        [940, 1030],
        [75, 835],
      ].forEach(([wx, wy]) => {
        const weed = this.add.image(wx, wy, 'urban_tileset', 10).setDepth(2).setAlpha(0.75);
        this.staticLayerGroup.add(weed);
      });
    }

    // Road asphalt oil slicks and potholes
    g.fillStyle(0x0b0a09, 0.65);
    g.fillEllipse(520, 540, 54, 24);
    g.fillEllipse(760, 420, 44, 32);
    g.fillEllipse(730, 760, 52, 28);
    g.fillEllipse(310, 950, 58, 26);

    // Faded worn ochre dashed road lines
    g.fillStyle(0x705826, 0.42);
    for (let rx = 70; rx < W - 90; rx += 76) {
      g.fillRect(rx, 557, 34, 5);
    }
    for (let ry = 70; ry < H - 90; ry += 76) {
      g.fillRect(747, ry, 5, 34);
    }

    // Manhole covers on the avenues
    if (hasTileset) {
      [
        [680, 560],
        [750, 310],
        [750, 820],
        [380, 960],
      ].forEach(([mx, my]) => {
        const mh = this.add.image(mx, my, 'urban_tileset', 11).setDepth(2).setAlpha(0.85);
        this.staticLayerGroup.add(mh);
      });
    }

    // 3. Building Interiors (Tiled Floors, Thresholds, Environmental Debris & Subtle Stencil Markings)
    for (const bld of this.worldState.buildings) {
      // Cast exterior building drop shadow
      g.fillStyle(0x080706, 0.65);
      g.fillRect(bld.x + 8, bld.y + 10, bld.width, bld.height);

      const tileFrame =
        bld.id === 'bld_mercado' ? 3 : bld.id === 'bld_farmacia' ? 4 : 5;

      if (hasTileset) {
        const ts = this.add
          .tileSprite(
            bld.x + bld.width * 0.5,
            bld.y + bld.height * 0.5,
            bld.width,
            bld.height,
            'urban_tileset',
            tileFrame
          )
          .setDepth(2);
        this.staticLayerGroup.add(ts);
      } else {
        g.fillStyle(bld.floorColor, 1);
        g.fillRect(bld.x, bld.y, bld.width, bld.height);
      }

      // Interior grime vignette along walls
      g.lineStyle(6, 0x0d0b09, 0.65);
      g.strokeRect(bld.x + 3, bld.y + 3, bld.width - 6, bld.height - 6);

      // Subtle floor stencil label (diegetic painted floor marking)
      const txt = this.add.text(bld.x + 28, bld.y + 26, bld.name.toUpperCase(), {
        fontFamily: 'Oswald, sans-serif',
        fontSize: '13px',
        color: '#6e6459',
        fontStyle: 'bold',
      });
      txt.setAlpha(0.55).setDepth(3);
      this.staticLayerGroup.add(txt);
    }

    // Environmental storytelling decals (dried blood trails near ambulance & doorways, shattered glass)
    if (hasTileset) {
      [
        [805, 315],
        [295, 430],
        [930, 250],
        [1190, 695],
      ].forEach(([bx, by]) => {
        const blood = this.add.image(bx, by, 'urban_tileset', 8).setDepth(3).setScale(1.25);
        this.staticLayerGroup.add(blood);
      });
      [
        [330, 435],
        [570, 260],
        [1180, 412],
        [950, 860],
      ].forEach(([gx, gy]) => {
        const glass = this.add.image(gx, gy, 'urban_tileset', 9).setDepth(3).setScale(1.2);
        this.staticLayerGroup.add(glass);
      });
    }

    // 4. Extraction Zone (Portão do Abrigo - Fortified Southwest Safe Haven Gate)
    const ext = this.worldState.extractionZone;
    g.fillStyle(0x11241b, 0.72);
    g.fillCircle(ext.x, ext.y, ext.radius);
    g.lineStyle(2, 0x3b7a57, 0.85);
    g.strokeCircle(ext.x, ext.y, ext.radius);
    // Painted chevron stripes inside extraction pad
    g.lineStyle(2, 0x52b788, 0.35);
    g.strokeCircle(ext.x, ext.y, ext.radius * 0.62);

    const extLabel = this.add.text(ext.x - 52, ext.y + ext.radius + 6, 'PORTÃO DO ABRIGO', {
      fontFamily: 'Oswald, sans-serif',
      fontSize: '12px',
      color: '#52b788',
      fontStyle: 'bold',
    });
    extLabel.setDepth(3).setAlpha(0.85);
    this.staticLayerGroup.add(extLabel);

    // 5. Solid Obstacles: Pixel-Art Brick Walls, Abandoned Vehicles, Store Shelves & Concrete Barriers
    const vehicleFrameById: Record<string, number> = {
      car_avenida_1: 0,
      car_avenida_2: 1,
      car_ambulancia: 2,
      car_viatura: 3,
    };

    for (const obs of this.worldState.obstacles) {
      // Cast directional ground shadow (South-East)
      g.fillStyle(0x070605, 0.7);
      g.fillRect(obs.x + 5, obs.y + 6, obs.width, obs.height);

      if (obs.kind === 'wall') {
        if (hasTileset) {
          const wallTile = this.add
            .tileSprite(
              obs.x + obs.width * 0.5,
              obs.y + obs.height * 0.5,
              obs.width,
              obs.height,
              'urban_tileset',
              7
            )
            .setDepth(6);
          this.staticLayerGroup.add(wallTile);
        } else {
          g.fillStyle(0x2e241e, 1);
          g.fillRect(obs.x, obs.y, obs.width, obs.height);
        }
        g.lineStyle(1.5, 0x120e0c, 0.95);
        g.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.kind === 'car') {
        if (hasVehicles) {
          const vFrame = vehicleFrameById[obs.id] ?? 0;
          const carSprite = this.add
            .image(
              obs.x + obs.width * 0.5,
              obs.y + obs.height * 0.5,
              'vehicles_sheet',
              vFrame
            )
            .setDisplaySize(obs.width + 6, obs.height + 6)
            .setDepth(7);
          this.staticLayerGroup.add(carSprite);
        } else {
          g.fillStyle(0x3c2824, 1);
          g.fillRoundedRect(obs.x, obs.y, obs.width, obs.height, 4);
        }
      } else if (obs.kind === 'crate') {
        // Interior store gondola / pharmacy counter / workshop bench
        g.fillStyle(0x171310, 1);
        g.fillRect(obs.x, obs.y, obs.width, obs.height);
        g.fillStyle(0x3b2d20, 1);
        g.fillRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        g.lineStyle(1.5, 0x54402e, 0.9);
        g.strokeRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        // Divided shelf compartments
        for (let sx = obs.x + 26; sx < obs.x + obs.width - 16; sx += 26) {
          g.lineBetween(sx, obs.y + 2, sx, obs.y + obs.height - 2);
        }
      } else {
        // Concrete roadblock / wooden barricade
        g.fillStyle(0x1a1917, 1);
        g.fillRect(obs.x, obs.y, obs.width, obs.height);
        g.fillStyle(0x3d3a36, 1);
        g.fillRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        // Hazard weathering stripes
        g.fillStyle(0x8c5828, 0.7);
        g.fillRect(obs.x + 6, obs.y + 4, 10, obs.height - 8);
        g.fillRect(obs.x + obs.width - 16, obs.y + 4, 10, obs.height - 8);
      }
    }

    // 6. Create Pixel-Art Supply Crate Sprites for Loot Spots
    if (hasTileset) {
      for (const spot of this.worldState.lootSpots) {
        const spr = this.add
          .sprite(spot.x, spot.y, 'urban_tileset', spot.looted ? 13 : 12)
          .setDepth(6)
          .setScale(1.05);
        this.staticLayerGroup.add(spr);
        this.lootSpriteMap.set(spot.id, spr);
      }
    }
  }

  private syncEntitySprites(): void {
    if (!this.textures.exists('survivor_sheet') || !this.textures.exists('zombies_sheet')) {
      return;
    }

    if (!this.playerSprite) {
      this.playerSprite = this.add
        .sprite(this.worldState.player.x, this.worldState.player.y, 'survivor_sheet', 0)
        .setDepth(16)
        .setScale(1.32);
    }

    for (const z of this.worldState.zombies) {
      let spr = this.zombieSpriteMap.get(z.id);
      if (!spr) {
        const baseScale =
          z.archetype === 'bruto' ? 1.54 : z.archetype === 'corredor' ? 1.24 : 1.32;
        const rowOffset =
          z.archetype === 'bruto' ? 16 : z.archetype === 'corredor' ? 8 : 0;
        spr = this.add
          .sprite(z.x, z.y, 'zombies_sheet', rowOffset)
          .setDepth(14)
          .setScale(baseScale);
        this.zombieSpriteMap.set(z.id, spr);
      }
    }
  }

  update(_time: number, deltaMs: number): void {
    if (!this.worldState) return;

    if (this.isPausedRef() || this.worldState.status !== 'playing') {
      this.justPressedKeys.clear();
      this.mouseJustPressed = false;
      this.renderDynamicEntities(0);
      return;
    }

    const rawDt = deltaMs / 1000;
    const clampedDt = Math.min(Math.max(rawDt, 0), 0.05);

    const input: ActionInputState = createDefaultInputState();

    let keyMoveX = 0;
    let keyMoveY = 0;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) keyMoveX -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) keyMoveX += 1;
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) keyMoveY -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) keyMoveY += 1;

    input.moveX = Math.abs(this.bridge.joyMoveX) > 0.05 ? this.bridge.joyMoveX : keyMoveX;
    input.moveY = Math.abs(this.bridge.joyMoveY) > 0.05 ? this.bridge.joyMoveY : keyMoveY;

    if (this.bridge.aimAngle !== null) {
      input.aimAngle = this.bridge.aimAngle;
    } else if (this.hasMouseMoved && (this.mouseDown || this.mouseJustPressed)) {
      const worldPoint = this.cameras.main.getWorldPoint(
        this.mouseScreenX,
        this.mouseScreenY
      );
      input.aimAngle = Math.atan2(
        worldPoint.y - this.worldState.player.y,
        worldPoint.x - this.worldState.player.x
      );
    }

    input.attackHeld =
      this.mouseDown ||
      this.bridge.attackHeld ||
      this.keysPressed.has('KeyJ') ||
      this.keysPressed.has('Enter');

    input.attackJustPressed =
      this.mouseJustPressed ||
      this.bridge.queuedAttack ||
      this.justPressedKeys.has('KeyJ') ||
      this.justPressedKeys.has('Enter');

    input.sprintHeld =
      this.bridge.sprintHeld ||
      this.keysPressed.has('ShiftLeft') ||
      this.keysPressed.has('ShiftRight');

    input.dodgeJustPressed =
      this.bridge.queuedDodge ||
      this.justPressedKeys.has('Space');

    input.interactJustPressed =
      this.bridge.queuedInteract ||
      this.justPressedKeys.has('KeyE');

    input.toggleFlashlightJustPressed =
      this.bridge.queuedToggleFlashlight ||
      this.justPressedKeys.has('KeyF');

    input.reloadJustPressed =
      this.bridge.queuedReload ||
      this.justPressedKeys.has('KeyR');

    input.switchWeaponJustPressed =
      this.bridge.queuedSwitchWeapon ||
      this.justPressedKeys.has('KeyQ') ||
      this.justPressedKeys.has('Digit1') ||
      this.justPressedKeys.has('Digit2');

    input.healJustPressed =
      this.bridge.queuedHeal ||
      this.justPressedKeys.has('KeyH') ||
      this.justPressedKeys.has('KeyC');

    // Detect dry-fire attempt / auto-reload trigger when pistol clip is empty
    const pBefore = this.worldState.player;
    if (
      input.attackJustPressed &&
      pBefore.equippedWeapon === 'pistola' &&
      pBefore.ammoInClip <= 0
    ) {
      if (pBefore.reloadTimer <= 0) {
        soundFX.playEmptyClick();
      }
    }

    // Clear one-shot edges
    this.justPressedKeys.clear();
    this.mouseJustPressed = false;
    this.bridge.queuedAttack = false;
    this.bridge.queuedDodge = false;
    this.bridge.queuedInteract = false;
    this.bridge.queuedReload = false;
    this.bridge.queuedSwitchWeapon = false;
    this.bridge.queuedHeal = false;
    this.bridge.queuedToggleFlashlight = false;

    // Step simulation
    stepWorld(this.worldState, input, rawDt);

    const p = this.worldState.player;
    this.shotFlashTimer = Math.max(0, this.shotFlashTimer - clampedDt);

    // Update continuous procedural ambient soundscape based on active district and indoor presence
    soundFX.setAmbientDistrict(
      this.worldState.districtId === 'centro_comercial'
        ? 'commercial'
        : this.worldState.districtId === 'complexo_medico'
        ? 'medical'
        : 'residential',
      this.worldState.isInsideBuilding
    );

    // Flashlight switch click audio
    if (p.flashlight.enabled !== this.prevFlashlightOn) {
      soundFX.playFlashlight(p.flashlight.enabled);
      this.prevFlashlightOn = p.flashlight.enabled;
    }

    // Healing channel audio
    if (p.healing?.active && !this.prevHealingActive) {
      soundFX.playHealingProgress();
      this.prevHealingActive = true;
    } else if (!p.healing?.active && this.prevHealingActive) {
      this.prevHealingActive = false;
    }

    // Healing completed audio chime
    if (p.hp > this.prevPlayerHp) {
      soundFX.playHealingComplete();
    }

    // Trigger reload audio when reload starts
    if (p.reloadTimer > 0 && this.prevReloadTimer <= 0) {
      soundFX.playReload();
    }
    this.prevReloadTimer = p.reloadTimer;

    // Gunshot audio, muzzle blast & ejected brass casing
    if (this.worldState.shotsFired > this.prevShotsFired) {
      this.prevShotsFired = this.worldState.shotsFired;
      this.shotFlashTimer = 0.09;
      soundFX.playShot();
      const mx = p.x + Math.cos(p.facingAngle) * (p.radius + 14);
      const my = p.y + Math.sin(p.facingAngle) * (p.radius + 14);
      this.spawnParticles(mx, my, 7, 0xf59e0b, 110, 260, p.facingAngle, 0.45, 2, 3.8);
      // Brass shell casing ejecting to the right of the pistol
      const ejectAngle = p.facingAngle + Math.PI * 0.48;
      this.spawnParticles(p.x, p.y, 1, 0xd99b26, 75, 110, ejectAngle, 0.25, 2, 2.4);
    }

    // Melee slash audio & steel spark arc
    if (p.meleeSwingTimer > this.prevMeleeTimer) {
      soundFX.playMelee();
      const mx = p.x + Math.cos(p.facingAngle) * (p.radius + 18);
      const my = p.y + Math.sin(p.facingAngle) * (p.radius + 18);
      this.spawnParticles(mx, my, 6, 0xcbd5e1, 70, 150, p.facingAngle, 1.0, 1.8, 3.0);
    }
    this.prevMeleeTimer = p.meleeSwingTimer;

    // Detect individual zombie hits & kills for authentic impact splatters and permanent blood pools
    for (const z of this.worldState.zombies) {
      const prevHp = this.zombiePrevHp.get(z.id) ?? z.hp;
      if (z.hp < prevHp) {
        soundFX.playHit();
        const hitAngle = Math.atan2(z.y - p.y, z.x - p.x);
        this.spawnParticles(z.x, z.y, 10, 0x8c1d15, 65, 190, hitAngle, 0.95, 2, 3.8);
        this.stampBloodDecal(z.x + Math.cos(hitAngle) * 6, z.y + Math.sin(hitAngle) * 6, 6);
      }
      if (z.dead && !this.zombieCorpseDrawn.has(z.id)) {
        this.zombieCorpseDrawn.add(z.id);
        this.stampBloodDecal(z.x, z.y, z.archetype === 'bruto' ? 14 : 10);
      }
      this.zombiePrevHp.set(z.id, z.hp);
    }

    if (this.worldState.zombiesKilled > this.prevZombiesKilled) {
      this.prevZombiesKilled = this.worldState.zombiesKilled;
    }

    if (p.hp < this.prevPlayerHp) {
      soundFX.playDanger();
      this.spawnParticles(p.x, p.y, 12, 0x991b1b, 60, 175);
      this.stampBloodDecal(p.x, p.y, 8);
    }
    this.prevPlayerHp = p.hp;

    const currentLootTotal =
      this.worldState.runLoot.comida +
      this.worldState.runLoot.medicamentos +
      this.worldState.runLoot.municao +
      this.worldState.runLoot.materiais;
    if (currentLootTotal > this.prevLootTotal) {
      this.prevLootTotal = currentLootTotal;
      soundFX.playLoot();
      this.spawnParticles(p.x, p.y, 8, 0xd9822b, 45, 110, -Math.PI * 0.5, Math.PI, 1.8, 3);
    }

    // Update pooled particles
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const pt = this.particlePool[i];
      if (!pt.active) continue;
      pt.life -= clampedDt;
      if (pt.life <= 0) {
        pt.active = false;
        continue;
      }
      pt.x += pt.vx * clampedDt;
      pt.y += pt.vy * clampedDt;
    }

    // Smooth camera follow + comfort-aware camera shake
    const cam = this.cameras.main;
    const targetCamX = p.x - cam.width * 0.5;
    const targetCamY = p.y - cam.height * 0.5;
    const lerp = Math.min(1, clampedDt * 9);
    const shakeScale = this.bridge?.reducedEffects ? 0 : 8.5;
    const shakeMag =
      this.worldState.cameraShakeTrauma * this.worldState.cameraShakeTrauma * shakeScale;
    const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

    cam.scrollX = Phaser.Math.Clamp(
      cam.scrollX + (targetCamX - cam.scrollX) * lerp + shakeX,
      0,
      Math.max(0, this.worldState.worldWidth - cam.width)
    );
    cam.scrollY = Phaser.Math.Clamp(
      cam.scrollY + (targetCamY - cam.scrollY) * lerp + shakeY,
      0,
      Math.max(0, this.worldState.worldHeight - cam.height)
    );

    this.renderDynamicEntities(clampedDt);

    this.hudSyncAccumulator += clampedDt;
    if (
      this.hudSyncAccumulator >= 0.065 ||
      this.worldState.status !== 'playing'
    ) {
      this.hudSyncAccumulator = 0;
      this.onHudSync(this.worldState);
    }
  }

  private computeZombieFrame(z: ZombieEntity): number {
    const rowOffset =
      z.archetype === 'bruto' ? 16 : z.archetype === 'corredor' ? 8 : 0;
    if (z.dead) {
      return rowOffset + 7; // Sprawled corpse sprite
    }
    if (z.hitFlashTimer > 0) {
      return rowOffset + 6; // Stagger hurt frame
    }
    if (z.isWindingUp) {
      const totalWindup = z.archetype === 'bruto' ? 0.45 : 0.28;
      return z.windupTimer > totalWindup * 0.5 ? rowOffset + 4 : rowOffset + 5;
    }
    const speed = Math.hypot(z.vx, z.vy);
    if (speed > 6) {
      const rate = z.archetype === 'corredor' ? 11 : z.archetype === 'bruto' ? 5.5 : 7;
      const stepIdx = Math.floor(this.worldState.elapsedTime * rate) % 4;
      return rowOffset + stepIdx;
    }
    return rowOffset;
  }

  private renderDynamicEntities(dt: number): void {
    this.syncEntitySprites();

    const sG = this.shadowGraphics;
    const dG = this.dynamicGraphics;
    const lG = this.lightingGraphics;
    sG.clear();
    dG.clear();
    lG.clear();

    const w = this.worldState;
    const p = w.player;
    const pulse = 0.6 + 0.4 * Math.sin(w.elapsedTime * 4.2);

    // 1. Extraction Zone Subtle Tactical Beacon
    const ext = w.extractionZone;
    dG.lineStyle(2, 0x52b788, 0.35 + pulse * 0.4);
    dG.strokeCircle(ext.x, ext.y, ext.radius - 6 + pulse * 5);

    // 2. Update Loot Crate Sprites & Subtle Interaction / Looting Rings
    const colorMap = {
      comida: 0xd9822b,
      medicamentos: 0xc94a38,
      municao: 0xc27829,
      materiais: 0x6c8ca8,
      misto: 0x52b788,
    };

    for (const spot of w.lootSpots) {
      const spr = this.lootSpriteMap.get(spot.id);
      if (spr) {
        spr.setFrame(spot.looted ? 13 : 12);
        spr.setAlpha(spot.looted ? 0.55 : 1);
      }
      if (!spot.looted) {
        const accent = colorMap[spot.kind];
        const isBeingLooted = w.activeLooting?.spotId === spot.id;

        if (isBeingLooted && w.activeLooting) {
          // Looting in progress: pulsing amber ring + progress arc
          const progress = Math.min(1, w.activeLooting.progress / w.activeLooting.duration);
          dG.lineStyle(3, 0x10b981, 0.95);
          dG.beginPath();
          dG.arc(
            spot.x,
            spot.y,
            spot.radius + 8,
            -Math.PI / 2,
            -Math.PI / 2 + progress * Math.PI * 2,
            false
          );
          dG.strokePath();

          // Progress indicator at player position too
          dG.lineStyle(2, 0x10b981, 0.85);
          dG.beginPath();
          dG.arc(
            p.x,
            p.y,
            p.radius + 14,
            -Math.PI / 2,
            -Math.PI / 2 + progress * Math.PI * 2,
            false
          );
          dG.strokePath();
        } else {
          // Available for looting: subtle dotted aura
          dG.lineStyle(1.5, accent, 0.28 + pulse * 0.32);
          dG.strokeCircle(spot.x, spot.y, spot.radius * 0.58);
        }
      }
    }

    // 2b. Acoustic Sound Wave Propagation Rings (Diegetic Visual Noise Echoes)
    for (const ne of w.noiseEvents) {
      const lifeFraction = Math.max(0, ne.timer / ne.duration);
      const currentRadius = ne.radius * (1 - lifeFraction);
      const alpha = lifeFraction * (ne.source === 'gunshot' ? 0.45 : 0.25);
      const ringColor = ne.source === 'gunshot' ? 0xf59e0b : ne.source === 'sprint' ? 0x94a3b8 : 0x52b788;

      dG.lineStyle(1.8, ringColor, alpha);
      dG.strokeCircle(ne.x, ne.y, currentRadius);
    }

    // 3. Update Zombie Pixel-Art Sprites, Shadows, Windup Telegraphs & Health Bars
    for (const z of w.zombies) {
      const spr = this.zombieSpriteMap.get(z.id);
      if (spr) {
        spr.setPosition(z.x, z.y);
        spr.setRotation(z.facingAngle);
        spr.setFrame(this.computeZombieFrame(z));
        spr.setDepth(z.dead ? 5 : 14);

        if (z.hitFlashTimer > 0 && !this.bridge?.reducedEffects) {
          spr.setTintFill(0xf5f0e6);
        } else {
          spr.clearTint();
        }
        spr.setAlpha(z.dead ? 0.92 : 1);
      }

      if (!z.dead) {
        // Ground contact shadow under living zombie
        sG.fillStyle(0x050404, 0.62);
        sG.fillEllipse(z.x + 2, z.y + 4, z.radius * 1.9, z.radius * 1.45);

        // Attack windup danger telegraph
        if (z.isWindingUp) {
          dG.lineStyle(2, 0xb93829, 0.85);
          dG.strokeCircle(z.x, z.y, z.attackRange);
          dG.fillStyle(0xb93829, 0.14);
          dG.fillCircle(z.x, z.y, z.attackRange);
        }

        // Diegetic slim health bar for wounded zombies
        if (z.hp < z.maxHp) {
          const barW = z.radius * 2.0;
          const barX = z.x - barW * 0.5;
          const barY = z.y - z.radius - 11;
          dG.fillStyle(0x0d0b09, 0.9);
          dG.fillRect(barX - 1, barY - 1, barW + 2, 5);
          dG.fillStyle(0xb93829, 1);
          dG.fillRect(barX, barY, barW * (z.hp / z.maxHp), 3);
        }
      }
    }

    // 4. Update Protagonist Pixel-Art Sprite, Walk/Run Cadence, Shadows & Weapon Sight
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 10) {
      this.walkAnimTime += dt * (p.sprinting ? 12.5 : 8.5);
    } else {
      this.walkAnimTime += dt * 2.0;
    }

    if (this.playerSprite) {
      this.playerSprite.setPosition(p.x, p.y);
      this.playerSprite.setRotation(p.facingAngle);

      const isMachete = p.equippedWeapon === 'facao';
      let frame = isMachete ? 8 : 0;

      if (!isMachete && this.shotFlashTimer > 0) {
        frame = 6; // Pistol fire + muzzle flash frame
      } else if (!isMachete && p.reloadTimer > 0) {
        frame = 7; // Pistol reload frame
      } else if (isMachete && p.meleeSwingTimer > 0) {
        frame = p.meleeSwingTimer > 0.1 ? 14 : 15; // 2-stage machete cleave
      } else if (speed > 12) {
        const stepFrame = Math.floor(this.walkAnimTime) % 4;
        frame = (isMachete ? 10 : 2) + stepFrame;
      } else {
        const breathFrame = Math.floor(this.walkAnimTime) % 2;
        frame = (isMachete ? 8 : 0) + breathFrame;
      }

      this.playerSprite.setFrame(frame);

      // Subtle sprint lean / dodge scale feedback
      const scaleMod = p.dodgeTimer > 0 ? 1.42 : p.sprinting ? 1.37 : 1.32;
      this.playerSprite.setScale(scaleMod);

      if (p.hurtFlashTimer > 0 && !this.bridge?.reducedEffects) {
        this.playerSprite.setTint(0xef4444);
      } else if (p.dodgeTimer > 0) {
        this.playerSprite.setTint(0x93c5fd);
      } else {
        this.playerSprite.clearTint();
      }
    }

    // Survivor ground shadow
    sG.fillStyle(0x050404, 0.68);
    sG.fillEllipse(p.x + 2, p.y + 4, p.radius * 2.0, p.radius * 1.5);

    const pCos = Math.cos(p.facingAngle);
    const pSin = Math.sin(p.facingAngle);

    // Subtle tactical aim line
    dG.lineStyle(1, 0xd9822b, 0.22);
    dG.lineBetween(
      p.x + pCos * (p.radius + 10),
      p.y + pSin * (p.radius + 10),
      p.x + pCos * 165,
      p.y + pSin * 165
    );

    // Muzzle flash light burst when firing
    if (this.shotFlashTimer > 0 && !this.bridge?.reducedEffects) {
      const mx = p.x + pCos * (p.radius + 16);
      const my = p.y + pSin * (p.radius + 16);
      dG.fillStyle(0xf59e0b, 0.45);
      dG.fillCircle(mx, my, 18);
      dG.fillStyle(0xfef3c7, 0.85);
      dG.fillCircle(mx, my, 7);
    }

    // Melee cleave arc visual confirmation
    if (p.meleeSwingTimer > 0) {
      dG.lineStyle(4, 0xe2e8f0, (p.meleeSwingTimer / 0.2) * 0.85);
      dG.beginPath();
      dG.arc(
        p.x,
        p.y,
        48,
        p.facingAngle - 0.85,
        p.facingAngle + 0.85,
        false
      );
      dG.strokePath();
    }

    // Reloading progress ring around player
    if (p.reloadTimer > 0) {
      const progress = 1 - p.reloadTimer / p.reloadDuration;
      dG.lineStyle(2.5, 0xd9822b, 0.9);
      dG.beginPath();
      dG.arc(
        p.x,
        p.y,
        p.radius + 9,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
        false
      );
      dG.strokePath();
    }

    // 5. Active Bullets with high-velocity tracer tail
    for (const b of w.bullets) {
      if (!b.active) continue;
      const bMag = Math.hypot(b.vx, b.vy) || 1;
      const tailX = b.x - (b.vx / bMag) * 14;
      const tailY = b.y - (b.vy / bMag) * 14;
      dG.lineStyle(2, 0xf59e0b, 0.55);
      dG.lineBetween(tailX, tailY, b.x, b.y);
      dG.fillStyle(0xfef3c7, 1);
      dG.fillCircle(b.x, b.y, 2.5);
    }

    // 6. Pooled Particles (Blood droplets, sparks, shell casings)
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const pt = this.particlePool[i];
      if (!pt.active) continue;
      dG.fillStyle(pt.color, Math.max(0, pt.life / pt.maxLife));
      dG.fillCircle(pt.x, pt.y, pt.size);
    }

    // 7. Floating Combat / Loot Feedbacks
    // (Rendered cleanly via Phaser graphics/text or HUD banner)

    // Healing canalization progress arc and medical cross badge over player
    if (p.healing?.active) {
      const hProg = Math.min(1, p.healing.progress / p.healing.duration);
      dG.lineStyle(3, 0x10b981, 0.95);
      dG.beginPath();
      dG.arc(p.x, p.y, p.radius + 18, -Math.PI / 2, -Math.PI / 2 + hProg * Math.PI * 2, false);
      dG.strokePath();

      const crossY = p.y - p.radius - 22;
      dG.fillStyle(0x10b981, 0.95);
      dG.fillRect(p.x - 2, crossY - 6, 4, 12);
      dG.fillRect(p.x - 6, crossY - 2, 12, 4);
    }

    // 8. Atmospheric Darkness & Directional Flashlight Cone (Darkwood / Project Zomboid mood)
    this.renderAtmosphericLighting(lG);
  }

  private renderAtmosphericLighting(lG: Phaser.GameObjects.Graphics): void {
    const w = this.worldState;
    const p = w.player;

    // 1. Full-screen ambient atmospheric darkness based on day/night cycle & building interior
    const darknessAlpha = Math.min(0.85, Math.max(0.12, w.ambientDarkness));
    lG.fillStyle(0x06080b, darknessAlpha);
    lG.fillRect(0, 0, w.worldWidth, w.worldHeight);

    // 2. Flashlight or Lantern beam cutting through darkness
    if (p.flashlight.enabled && p.flashlight.battery > 0) {
      const beamLength = p.flashlight.range;
      const halfCone = p.flashlight.coneAngle * 0.5;
      const a1 = p.facingAngle - halfCone;
      const a2 = p.facingAngle + halfCone;

      // Outer warm tungsten cone
      lG.fillStyle(0xfde68a, 0.28);
      lG.beginPath();
      lG.moveTo(p.x, p.y);
      lG.arc(p.x, p.y, beamLength, a1, a2, false);
      lG.closePath();
      lG.fillPath();

      // Focused inner high-intensity core
      lG.fillStyle(0xfffbeb, 0.35);
      lG.beginPath();
      lG.moveTo(p.x, p.y);
      lG.arc(
        p.x,
        p.y,
        beamLength * 0.75,
        p.facingAngle - halfCone * 0.55,
        p.facingAngle + halfCone * 0.55,
        false
      );
      lG.closePath();
      lG.fillPath();

      // Center bright needle
      lG.fillStyle(0xffffff, 0.25);
      lG.beginPath();
      lG.moveTo(p.x, p.y);
      lG.arc(p.x, p.y, beamLength * 0.45, p.facingAngle - 0.15, p.facingAngle + 0.15, false);
      lG.closePath();
      lG.fillPath();

      // Close 360-degree survivor body lantern illumination
      lG.fillStyle(0xfbbf24, 0.2);
      lG.fillCircle(p.x, p.y, 75);
    } else {
      // When flashlight is off / dead: pitch-black claustrophobic survival aura
      lG.fillStyle(0xd97706, 0.08);
      lG.fillCircle(p.x, p.y, 45);
    }

    // 3. Extraction Gate emergency flare & guide light
    const pulse = 0.5 + 0.5 * Math.sin(w.elapsedTime * 3.5);
    lG.fillStyle(0x10b981, 0.18 + pulse * 0.12);
    lG.fillCircle(w.extractionZone.x, w.extractionZone.y, w.extractionZone.radius * 1.5);
  }
}
