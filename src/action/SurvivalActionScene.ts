import Phaser from 'phaser';
import {
  computeTacticalCameraView,
  createDefaultInputState,
  findInteractableAtWorldPoint,
  getEffectiveVisionRanges,
  getRayObstacleDistance,
  isSegmentBlockedByWall,
  stepWorld,
  WEAPON_CONFIG,
} from './actionRules.ts';
import type {
  ActionInputState,
  ActionWorldState,
  LootSpot,
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
  tryInteractAtScreenPoint?: (clientX: number, clientY: number) => boolean;
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
  private roofGraphics!: Phaser.GameObjects.Graphics;
  private aimGraphics!: Phaser.GameObjects.Graphics;
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
  private renderedDistrictId = '';

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

  public tryInteractAtScreenPoint(clientX: number, clientY: number): boolean {
    if (!this.worldState || !this.cameras?.main || !this.sys?.game?.canvas) {
      return false;
    }
    const canvas = this.sys.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const scaleX = this.scale.width / rect.width;
    const scaleY = this.scale.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const worldPoint = this.cameras.main.getWorldPoint(canvasX, canvasY);

    const hit = findInteractableAtWorldPoint(this.worldState, worldPoint.x, worldPoint.y);
    if (hit) {
      this.bridge.queuedInteract = true;
      return true;
    }
    return false;
  }

  public bindRuntime(
    world: ActionWorldState,
    bridge: ExternalControlBridge,
    onHudSync: (world: ActionWorldState) => void,
    isPausedRef: () => boolean
  ): void {
    this.worldState = world;
    this.bridge = bridge;
    this.bridge.tryInteractAtScreenPoint = (clientX: number, clientY: number) =>
      this.tryInteractAtScreenPoint(clientX, clientY);
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

    // Create a 2x2 white pixel texture for particles
    if (!this.textures.exists('pixel')) {
      const pG = this.make.graphics({ x: 0, y: 0 });
      pG.fillStyle(0xffffff, 1);
      pG.fillRect(0, 0, 2, 2);
      pG.generateTexture('pixel', 2, 2);
      pG.destroy();
    }

    this.cameras.main.setBounds(
      0,
      0,
      this.worldState.worldWidth,
      this.worldState.worldHeight
    );
    this.cameras.main.setBackgroundColor('#0d0c0a');
    const initialView = computeTacticalCameraView(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(initialView.zoom);
    this.cameras.main.centerOn(this.worldState.player.x, this.worldState.player.y);

    this.mapGraphics = this.add.graphics().setDepth(1);
    this.staticLayerGroup = this.add.group();
    this.decalGraphics = this.add.graphics().setDepth(4);
    this.shadowGraphics = this.add.graphics().setDepth(8);
    this.dynamicGraphics = this.add.graphics().setDepth(22);
    this.roofGraphics = this.add.graphics().setDepth(25);
    this.aimGraphics = this.add.graphics().setDepth(28);
    this.lightingGraphics = this.add.graphics().setDepth(35);

    this.buildStaticEnvironment();
    this.syncEntitySprites();

    // Pointer listeners on canvas (supports tapping directly on contextual objects without altering aim direction)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Check if tapping directly on an eligible contextual object (including car/furniture body) or extraction gate
      const hitInteractable = findInteractableAtWorldPoint(
        this.worldState,
        worldPoint.x,
        worldPoint.y
      );
      if (hitInteractable) {
        this.bridge.queuedInteract = true;
        return;
      }
    });

    const releaseMouse = () => {
      this.mouseDown = false;
    };

    this.input.on('pointerup', releaseMouse);
    this.input.on('pointerupoutside', releaseMouse);
    this.input.on('gameout', releaseMouse);

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
      if (this.bridge) {
        this.bridge.joyMoveX = 0;
        this.bridge.joyMoveY = 0;
        this.bridge.attackHeld = false;
        this.bridge.sprintHeld = false;
      }
    };

    const onScaleResize = () => {
      if (!this.worldState || !this.cameras?.main) return;
      this.syncCameraToViewport(0);
      this.renderDynamicEntities(0);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    this.scale.on(Phaser.Scale.Events.RESIZE, onScaleResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
      this.scale.off(Phaser.Scale.Events.RESIZE, onScaleResize);
    });
  }

  private syncCameraToViewport(clampedDt: number): void {
    const cam = this.cameras?.main;
    if (!cam || !this.worldState) return;

    const p = this.worldState.player;
    const view = computeTacticalCameraView(cam.width, cam.height);
    if (Math.abs(cam.zoom - view.zoom) > 0.002) {
      cam.setZoom(view.zoom);
    }

    const halfVisW = (cam.width / cam.zoom) * 0.5;
    const halfVisH = (cam.height / cam.zoom) * 0.5;
    const minScrollX = halfVisW - cam.width * 0.5;
    const maxScrollX = Math.max(
      minScrollX,
      this.worldState.worldWidth - halfVisW - cam.width * 0.5
    );
    const minScrollY = halfVisH - cam.height * 0.5;
    const maxScrollY = Math.max(
      minScrollY,
      this.worldState.worldHeight - halfVisH - cam.height * 0.5
    );

    const targetCamX = p.x - cam.width * 0.5;
    const targetCamY = p.y - cam.height * 0.5;

    if (clampedDt <= 0) {
      cam.scrollX = Phaser.Math.Clamp(targetCamX, minScrollX, maxScrollX);
      cam.scrollY = Phaser.Math.Clamp(targetCamY, minScrollY, maxScrollY);
      return;
    }

    const lerp = Math.min(1, clampedDt * 9);
    const shakeScale = this.bridge?.reducedEffects ? 0 : 8.5;
    const shakeMag =
      this.worldState.cameraShakeTrauma * this.worldState.cameraShakeTrauma * shakeScale;
    const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

    cam.scrollX = Phaser.Math.Clamp(
      cam.scrollX + (targetCamX - cam.scrollX) * lerp + shakeX,
      minScrollX,
      maxScrollX
    );
    cam.scrollY = Phaser.Math.Clamp(
      cam.scrollY + (targetCamY - cam.scrollY) * lerp + shakeY,
      minScrollY,
      maxScrollY
    );
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
    for (const spr of this.zombieSpriteMap.values()) {
      spr.destroy();
    }
    this.zombieSpriteMap.clear();
    this.renderedDistrictId = this.worldState.districtId;

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

    // 3. Building Interiors (Tiled Floors, Architectural Doors, Windows & Stencil Markings)
    for (const bld of this.worldState.buildings) {
      // Cast exterior building drop shadow
      g.fillStyle(0x080706, 0.65);
      g.fillRect(bld.x + 8, bld.y + 10, bld.width, bld.height);

      const tileFrame =
        bld.id.includes('mercado') || bld.id.includes('mercearia')
          ? 3
          : bld.id.includes('farmacia') || bld.id.includes('pronto') || bld.id.includes('laboratorio')
          ? 4
          : 5;

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

      // Render explicit architectural Doorways & Threshold Mats (visible inside & outside)
      for (const door of bld.doors ?? []) {
        g.fillStyle(0x3b2a1d, 0.95);
        g.fillRect(door.x - 2, door.y - 2, door.width + 4, door.height + 4);
        g.lineStyle(1.8, 0xd9822b, 0.85);
        g.strokeRect(door.x - 1, door.y - 1, door.width + 2, door.height + 2);

        // Open wooden/metal door leaf swung ajar inside the building
        g.fillStyle(0x6b4c35, 0.95);
        if (door.orientation === 'horizontal') {
          const leafY = door.side === 'south' ? door.y - 26 : door.y + door.height + 2;
          g.fillRect(door.x + 2, leafY, 7, 24);
          g.lineStyle(1, 0xfbbf24, 0.7);
          g.strokeRect(door.x + 2, leafY, 7, 24);
        } else {
          const leafX = door.side === 'east' ? door.x - 26 : door.x + door.width + 2;
          g.fillRect(leafX, door.y + 2, 24, 7);
          g.lineStyle(1, 0xfbbf24, 0.7);
          g.strokeRect(leafX, door.y + 2, 24, 7);
        }
      }

      // Render architectural Windows along wall gaps
      for (const win of bld.windows ?? []) {
        g.fillStyle(0x1e293b, 0.85);
        g.fillRect(win.x, win.y, win.width, win.height);
        g.lineStyle(1.4, 0x64748b, 0.8);
        g.strokeRect(win.x, win.y, win.width, win.height);
        g.lineStyle(1, 0x94a3b8, 0.55);
        if (win.orientation === 'horizontal') {
          g.lineBetween(win.x + 4, win.y + win.height * 0.5, win.x + win.width - 4, win.y + win.height * 0.5);
        } else {
          g.lineBetween(win.x + win.width * 0.5, win.y + 4, win.x + win.width * 0.5, win.y + win.height - 4);
        }
      }

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

    // 4. Extraction Zone (Fortified Safe Haven Gate / District Extraction Point)
    const ext = this.worldState.extractionZone;
    g.fillStyle(0x11241b, 0.72);
    g.fillCircle(ext.x, ext.y, ext.radius);
    g.lineStyle(2, 0x3b7a57, 0.85);
    g.strokeCircle(ext.x, ext.y, ext.radius);
    // Painted chevron stripes inside extraction pad
    g.lineStyle(2, 0x52b788, 0.35);
    g.strokeCircle(ext.x, ext.y, ext.radius * 0.62);

    const extLabel = this.add.text(
      ext.x - 64,
      ext.y + ext.radius + 6,
      (ext.label || 'PONTO DE EXTRAÇÃO').toUpperCase(),
      {
        fontFamily: 'Oswald, sans-serif',
        fontSize: '12px',
        color: '#52b788',
        fontStyle: 'bold',
      }
    );
    extLabel.setDepth(3).setAlpha(0.88);
    this.staticLayerGroup.add(extLabel);

    // 4b. Connected City Street Passages (Avenues & Corridors linking neighboring districts)
    for (const conn of this.worldState.connections ?? []) {
      // Paved asphalt passage extending through the perimeter wall gap
      if (conn.direction === 'east' || conn.direction === 'west') {
        const rx = conn.direction === 'east' ? W - 92 : 0;
        g.fillStyle(0x141312, 0.98);
        g.fillRect(rx, conn.y - 96, 92, 192);
        g.fillStyle(0xd99b26, 0.55);
        g.fillRect(rx + 12, conn.y - 3, 28, 6);
        g.fillRect(rx + 52, conn.y - 3, 28, 6);
      } else {
        const ry = conn.direction === 'south' ? H - 92 : 0;
        g.fillStyle(0x141312, 0.98);
        g.fillRect(conn.x - 115, ry, 230, 92);
        g.fillStyle(0xd99b26, 0.55);
        g.fillRect(conn.x - 3, ry + 12, 6, 28);
        g.fillRect(conn.x - 3, ry + 52, 6, 28);
      }

      // Transit zone circle on the avenue
      g.fillStyle(0x1e293b, 0.72);
      g.fillCircle(conn.x, conn.y, conn.radius);
      g.lineStyle(2, 0x38bdf8, 0.82);
      g.strokeCircle(conn.x, conn.y, conn.radius);
      g.lineStyle(1.5, 0xf59e0b, 0.48);
      g.strokeCircle(conn.x, conn.y, conn.radius * 0.65);

      const arrowPrefix =
        conn.direction === 'east'
          ? 'LESTE → '
          : conn.direction === 'west'
          ? '← OESTE '
          : conn.direction === 'south'
          ? 'SUL ↓ '
          : '↑ NORTE ';
      const connLabelX = Math.max(18, Math.min(W - 245, conn.x - 76));
      const connLabel = this.add.text(
        connLabelX,
        conn.direction === 'south' ? conn.y - conn.radius - 20 : conn.y + conn.radius + 6,
        `${arrowPrefix}${conn.toDistrictName.toUpperCase()}`,
        {
          fontFamily: 'Oswald, sans-serif',
          fontSize: '12px',
          color: '#38bdf8',
          fontStyle: 'bold',
          backgroundColor: '#090d14cc',
          padding: { x: 5, y: 2 },
        }
      );
      connLabel.setDepth(4).setAlpha(0.92);
      this.staticLayerGroup.add(connLabel);
    }

    // 5. Solid Obstacles: Pixel-Art Brick Walls, Abandoned Vehicles, Store Shelves & Concrete Barriers
    const vehicleFrameById: Record<string, number> = {
      car_avenida_1: 0,
      car_avenida_2: 1,
      car_ambulancia: 2,
      car_viatura: 3,
      car_sedan: 0,
      car_pickup: 1,
      car_kombi: 2,
      c_viatura_1: 3,
      c_ambulancia: 2,
      c_carro_batido: 0,
      c_carro_sul: 1,
      m_caminhao_tropa: 1,
      m_ambulancia_isolamento: 2,
    };

    for (const obs of this.worldState.obstacles) {
      // Cast directional ground shadow (South-East)
      g.fillStyle(0x070605, 0.65);
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
          g.fillStyle(0x3a2e27, 1);
          g.fillRect(obs.x, obs.y, obs.width, obs.height);
        }
        g.lineStyle(1.5, 0x181310, 0.95);
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
          g.fillStyle(0x4a322d, 1);
          g.fillRoundedRect(obs.x, obs.y, obs.width, obs.height, 4);
        }
      } else if (obs.kind === 'crate') {
        // Interior store gondola / pharmacy counter / workshop bench
        g.fillStyle(0x1c1713, 1);
        g.fillRect(obs.x, obs.y, obs.width, obs.height);
        g.fillStyle(0x473627, 1);
        g.fillRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        g.lineStyle(1.5, 0x69503a, 0.9);
        g.strokeRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        // Divided shelf compartments
        for (let sx = obs.x + 26; sx < obs.x + obs.width - 16; sx += 26) {
          g.lineBetween(sx, obs.y + 2, sx, obs.y + obs.height - 2);
        }
      } else {
        // Concrete roadblock / wooden barricade
        g.fillStyle(0x211f1d, 1);
        g.fillRect(obs.x, obs.y, obs.width, obs.height);
        g.fillStyle(0x4a4641, 1);
        g.fillRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
        // Hazard weathering stripes
        g.fillStyle(0x9e632d, 0.75);
        g.fillRect(obs.x + 6, obs.y + 4, 10, obs.height - 8);
        g.fillRect(obs.x + obs.width - 16, obs.y + 4, 10, obs.height - 8);
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

  private renderImpacts(world: ActionWorldState) {
    if (!world.impactEvents) return;

    for (const impact of world.impactEvents) {
      if (!this.processedImpacts) this.processedImpacts = new Set<string>();
      if (this.processedImpacts.has(impact.id)) continue;
      this.processedImpacts.add(impact.id);

      // Clean up old processed IDs occasionally
      if (this.processedImpacts.size > 200) {
        this.processedImpacts.clear();
      }

      this.spawnImpactVisual(impact);
    }
  }

  private spawnImpactVisual(impact: any) {
    const { x, y, angle, kind } = impact;
    
    // Impact Flash
    const flash = this.add.circle(x, y, 3, 0xffffff, 0.9);
    flash.setDepth(30);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 80,
      onComplete: () => flash.destroy()
    });

    // Particles based on kind
    let color = 0xcccccc;
    let count = 5;
    let speed = 120;
    let lifespan = 350;

    if (kind === 'zombie') {
      color = 0x991b1b; // Blood red
      count = 14;
      speed = 180;
      lifespan = 450;
      
      // Permanent blood splat on floor (graphics decal)
      this.decalGraphics.fillStyle(0x7f1d1d, 0.45);
      this.decalGraphics.fillCircle(x + (Math.random()-0.5)*4, y + (Math.random()-0.5)*4, 2 + Math.random() * 4);
    } else if (kind === 'wall' || kind === 'barrier' || kind === 'crate') {
      color = 0x64748b; // Slate gray / Dust
      count = 7;
      speed = 100;
    } else if (kind === 'car') {
      color = 0xfacc15; // Sparks / Yellow
      count = 10;
      speed = 220;
      lifespan = 250;
    }

    const emitter = this.add.particles(x, y, 'pixel', {
      speed: { min: speed * 0.4, max: speed },
      angle: { min: Phaser.Math.RadToDeg(angle) - 40, max: Phaser.Math.RadToDeg(angle) + 40 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan,
      quantity: count,
      tint: color,
      emitting: false
    });
    emitter.setDepth(20);
    emitter.explode();
    this.time.delayedCall(lifespan + 100, () => emitter.destroy());
  }

  private processedImpacts: Set<string> = new Set();


  update(_time: number, deltaMs: number): void {
    if (!this.worldState) return;

    if (this.isPausedRef() || this.worldState.status !== 'playing') {
      this.justPressedKeys.clear();
      this.mouseJustPressed = false;
      this.syncCameraToViewport(0);
      this.renderDynamicEntities(0);
      this.renderImpacts(this.worldState);
      return;
    }

    this.renderImpacts(this.worldState);

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

    if (this.bridge.aimAngle !== null && Number.isFinite(this.bridge.aimAngle)) {
      input.aimAngle = this.bridge.aimAngle;
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

    // Handle seamless connected city transition if player moved into an adjacent district
    let districtTransitioned = false;
    if (this.worldState.districtId !== this.renderedDistrictId) {
      districtTransitioned = true;
      this.buildStaticEnvironment();
      this.syncEntitySprites();
      this.zombiePrevHp.clear();
      for (const z of this.worldState.zombies) {
        this.zombiePrevHp.set(z.id, z.hp);
      }
      if (this.cameras?.main) {
        this.cameras.main.setBounds(
          0,
          0,
          this.worldState.worldWidth,
          this.worldState.worldHeight
        );
        this.syncCameraToViewport(0);
      }
    }

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

    // Smooth camera follow + zoom-aware clamping + comfort-aware camera shake
    this.syncCameraToViewport(clampedDt);

    this.renderDynamicEntities(clampedDt);

    const immediateHudSync =
      districtTransitioned ||
      input.toggleFlashlightJustPressed ||
      input.switchWeaponJustPressed ||
      input.interactJustPressed ||
      input.healJustPressed;

    this.hudSyncAccumulator += clampedDt;
    if (
      immediateHudSync ||
      this.hudSyncAccumulator >= 0.055 ||
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
      const totalWindup = z.archetype === 'bruto' ? 0.45 : 0.34;
      return z.windupTimer > totalWindup * 0.5 ? rowOffset + 4 : rowOffset + 5;
    }
    const speed = Math.hypot(z.vx, z.vy);
    if (speed > 4) {
      const rate = z.archetype === 'corredor' ? 9 : z.archetype === 'bruto' ? 4.5 : 5.5;
      const stepIdx = Math.floor(this.worldState.elapsedTime * rate) % 4;
      return rowOffset + stepIdx;
    }
    return rowOffset;
  }

  private renderLootObjectVisual(
    dG: Phaser.GameObjects.Graphics,
    spot: LootSpot,
    isNearest: boolean,
    isBeingLooted: boolean,
    pulse: number
  ): void {
    const { x, y, containerType, looted } = spot;
    const alpha = looted ? 0.48 : 0.96;

    // If linked to an existing vehicle or counter obstacle, render a contextual compartment marker on the object
    if (containerType === 'porta_malas' || containerType === 'porta_luvas') {
      const latchW = 22;
      const latchH = 10;
      dG.fillStyle(looted ? 0x1f2421 : 0x2b221a, alpha);
      dG.fillRect(x - latchW * 0.5, y - latchH * 0.5, latchW, latchH);
      dG.lineStyle(1.5, looted ? 0x475569 : 0xd9822b, alpha);
      dG.strokeRect(x - latchW * 0.5, y - latchH * 0.5, latchW, latchH);
      if (looted) {
        // Open trunk lid flap
        dG.fillStyle(0x0f1317, 0.75);
        dG.fillRect(x - 8, y - 4, 16, 6);
      }
    } else if (containerType === 'geladeira') {
      // Top-down refrigerator unit with metallic door & handle
      dG.fillStyle(0x090807, 0.55);
      dG.fillRect(x - 15, y - 13, 34, 30);
      dG.fillStyle(looted ? 0x475569 : 0x94a3b8, alpha);
      dG.fillRect(x - 16, y - 14, 32, 28);
      dG.lineStyle(1.5, 0x1e293b, alpha);
      dG.strokeRect(x - 16, y - 14, 32, 28);
      // Door seal & handle
      dG.fillStyle(0x334155, alpha);
      dG.fillRect(x - 14, y + 8, 28, 4);
      if (looted) {
        // Door swung ajar
        dG.lineStyle(2.5, 0x64748b, 0.85);
        dG.lineBetween(x - 14, y + 12, x - 4, y + 24);
      }
    } else if (containerType === 'armario') {
      // Top-down tall cabinet with double doors
      dG.fillStyle(0x090807, 0.55);
      dG.fillRect(x - 17, y - 11, 38, 26);
      dG.fillStyle(looted ? 0x2b231d : 0x4a3728, alpha);
      dG.fillRect(x - 18, y - 12, 36, 24);
      dG.lineStyle(1.5, 0x78593f, alpha);
      dG.strokeRect(x - 18, y - 12, 36, 24);
      dG.lineBetween(x, y - 12, x, y + 12);
      if (looted) {
        // Open cabinet doors
        dG.lineStyle(2, 0x6b4f38, 0.85);
        dG.lineBetween(x - 17, y + 12, x - 24, y + 20);
        dG.lineBetween(x + 17, y + 12, x + 24, y + 20);
      }
    } else if (containerType === 'gaveta') {
      // Top-down dresser / desk with sliding drawer
      dG.fillStyle(0x090807, 0.55);
      dG.fillRect(x - 15, y - 11, 34, 24);
      dG.fillStyle(looted ? 0x29211b : 0x523a28, alpha);
      dG.fillRect(x - 16, y - 12, 32, 22);
      dG.lineStyle(1.5, 0x855f42, alpha);
      dG.strokeRect(x - 16, y - 12, 32, 22);
      // Sliding drawer compartment
      const slideOffset = looted ? 8 : isBeingLooted ? 4 : 0;
      dG.fillStyle(0x3b291c, alpha);
      dG.fillRect(x - 11, y + 4 + slideOffset, 22, 8);
      dG.lineStyle(1, 0xa37855, alpha);
      dG.strokeRect(x - 11, y + 4 + slideOffset, 22, 8);
    } else if (containerType === 'gondola') {
      // Top-down shelving rack with supply items
      dG.fillStyle(0x1f2421, alpha);
      dG.fillRect(x - 18, y - 10, 36, 20);
      dG.lineStyle(1.5, looted ? 0x475569 : 0x52b788, alpha);
      dG.strokeRect(x - 18, y - 10, 36, 20);
      if (!looted) {
        dG.fillStyle(0xd9822b, 0.9);
        dG.fillRect(x - 12, y - 6, 8, 6);
        dG.fillStyle(0x38bdf8, 0.85);
        dG.fillRect(x + 2, y - 5, 10, 5);
      }
    } else if (containerType === 'cofre') {
      // Reinforced steel safe with combination dial
      dG.fillStyle(0x090807, 0.6);
      dG.fillRect(x - 14, y - 13, 32, 28);
      dG.fillStyle(looted ? 0x1e293b : 0x334155, alpha);
      dG.fillRect(x - 15, y - 14, 30, 26);
      dG.lineStyle(2, looted ? 0x475569 : 0x94a3b8, alpha);
      dG.strokeRect(x - 15, y - 14, 30, 26);
      dG.fillStyle(looted ? 0x64748b : 0xf59e0b, alpha);
      dG.fillCircle(x + 5, y, 4);
    } else if (containerType === 'maca') {
      // Hospital surgical gurney / stretcher
      dG.fillStyle(0x090807, 0.5);
      dG.fillRect(x - 18, y - 10, 38, 22);
      dG.fillStyle(looted ? 0x334155 : 0xcbd5e1, alpha);
      dG.fillRoundedRect(x - 18, y - 11, 36, 20, 3);
      dG.lineStyle(1.5, 0x64748b, alpha);
      dG.strokeRoundedRect(x - 18, y - 11, 36, 20, 3);
      if (!looted) {
        dG.fillStyle(0xef4444, 0.85);
        dG.fillRect(x - 4, y - 6, 8, 8);
      }
    } else {
      // Workbench / tool table ('bancada')
      dG.fillStyle(0x090807, 0.55);
      dG.fillRect(x - 18, y - 11, 38, 24);
      dG.fillStyle(looted ? 0x26211d : 0x47382b, alpha);
      dG.fillRect(x - 18, y - 12, 36, 22);
      dG.lineStyle(1.5, 0x6c8ca8, alpha);
      dG.strokeRect(x - 18, y - 12, 36, 22);
    }

    // State indicator: Available vs Searching vs Searched (only shown when object is inside player's visible FOV)
    if (!looted && (spot.isVisibleToPlayer || isBeingLooted || isNearest)) {
      if (isBeingLooted && this.worldState.activeLooting) {
        const progress = Math.min(
          1,
          this.worldState.activeLooting.progress / this.worldState.activeLooting.duration
        );
        dG.lineStyle(3, 0x10b981, 0.95);
        dG.beginPath();
        dG.arc(
          x,
          y,
          spot.radius * 0.72,
          -Math.PI / 2,
          -Math.PI / 2 + progress * Math.PI * 2,
          false
        );
        dG.strokePath();
      } else if (isNearest) {
        // Highlighted eligible object in interaction range
        dG.lineStyle(2, 0xf59e0b, 0.65 + pulse * 0.3);
        dG.strokeCircle(x, y, spot.radius * 0.68);
      } else {
        // Discreet glint showing object has not been searched yet (only when visually seen)
        dG.lineStyle(1.2, 0xd9822b, 0.22 + pulse * 0.2);
        dG.strokeCircle(x, y, 16);
      }
    }
  }

  private renderBuildingRoofs(rG: Phaser.GameObjects.Graphics): void {
    const w = this.worldState;
    for (const bld of w.buildings) {
      const alpha =
        bld.roofAlpha ?? (w.player.isInsideBuilding === bld.id ? 0.0 : 1.0);
      if (alpha <= 0.01) continue;

      const rx = bld.x;
      const ry = bld.y;
      const rw = bld.width;
      const rh = bld.height;

      // Choose weathered architectural roof palette based on building type
      const isResidential = bld.id.includes('casa');
      const isMedical = bld.id.includes('farmacia') || bld.id.includes('pronto') || bld.id.includes('necroterio');
      const baseColor = isResidential ? 0x422b21 : isMedical ? 0x263238 : 0x2f2c28;
      const northSlopeColor = isResidential ? 0x4f3428 : isMedical ? 0x2f3e46 : 0x383430;
      const southSlopeColor = isResidential ? 0x332119 : isMedical ? 0x1c262b : 0x24211e;
      const ridgeColor = isResidential ? 0x694636 : isMedical ? 0x475569 : 0x524c46;

      // 1. Opaque interior mask so furniture, floors, and zombies inside are concealed when outside
      rG.fillStyle(baseColor, alpha);
      rG.fillRect(rx + 4, ry + 4, rw - 8, rh - 8);

      // 2. Pitched Top-Down Roof Planes (North & South slopes)
      const midY = ry + rh * 0.5;
      const inset = 6;
      rG.fillStyle(northSlopeColor, alpha);
      rG.fillRect(rx + inset, ry + inset, rw - inset * 2, rh * 0.5 - inset);

      rG.fillStyle(southSlopeColor, alpha);
      rG.fillRect(rx + inset, midY, rw - inset * 2, rh * 0.5 - inset);

      // 3. Corrugated Shingle / Metal Seam Ribs across the roof
      rG.lineStyle(1, 0x14110f, alpha * 0.42);
      const ribStep = isResidential ? 24 : 32;
      for (let x = rx + inset + ribStep; x < rx + rw - inset; x += ribStep) {
        rG.lineBetween(x, ry + inset, x, ry + rh - inset);
      }

      // Horizontal shingle overlap lines
      const hStep = isResidential ? 28 : 42;
      for (let y = ry + inset + hStep; y < ry + rh - inset; y += hStep) {
        rG.lineBetween(rx + inset, y, rx + rw - inset, y);
      }

      // 4. Gabled East/West Hips & Central Roof Ridge Beam
      const ridgeInset = Math.min(68, rw * 0.18);
      rG.lineStyle(2.5, ridgeColor, alpha * 0.9);
      rG.lineBetween(rx + ridgeInset, midY, rx + rw - ridgeInset, midY);
      rG.lineStyle(1.8, ridgeColor, alpha * 0.75);
      rG.lineBetween(rx + inset, ry + inset, rx + ridgeInset, midY);
      rG.lineBetween(rx + inset, ry + rh - inset, rx + ridgeInset, midY);
      rG.lineBetween(rx + rw - inset, ry + inset, rx + rw - ridgeInset, midY);
      rG.lineBetween(rx + rw - inset, ry + rh - inset, rx + rw - ridgeInset, midY);

      // 5. Rooftop HVAC / Vent / Skylight Detail
      const ventX = rx + rw * 0.66;
      const ventY = midY - 22;
      rG.fillStyle(0x1c1917, alpha * 0.9);
      rG.fillRect(ventX, ventY, 36, 26);
      rG.lineStyle(1.5, 0x57534e, alpha * 0.85);
      rG.strokeRect(ventX, ventY, 36, 26);
      rG.lineBetween(ventX + 6, ventY + 8, ventX + 30, ventY + 8);
      rG.lineBetween(ventX + 6, ventY + 16, ventX + 30, ventY + 16);

      // 6. Roof Eave Perimeter Border
      rG.lineStyle(2, 0x0f0d0b, alpha * 0.95);
      rG.strokeRect(rx + 4, ry + 4, rw - 8, rh - 8);
      rG.lineStyle(1, ridgeColor, alpha * 0.55);
      rG.strokeRect(rx + 6, ry + 6, rw - 12, rh - 12);

      // 7. Exterior Doorway Canopies & Entrance Thresholds (drawn on top of roof eaves so entrances are clearly visible from outside)
      for (const door of bld.doors ?? []) {
        rG.fillStyle(0x1f1915, alpha * 0.96);
        rG.fillRect(door.x - 2, door.y - 2, door.width + 4, door.height + 4);
        rG.lineStyle(2, 0xf59e0b, alpha * 0.9);
        rG.strokeRect(door.x - 1, door.y - 1, door.width + 2, door.height + 2);
      }
    }
  }

  private renderDynamicEntities(dt: number): void {
    this.syncEntitySprites();

    const sG = this.shadowGraphics;
    const dG = this.dynamicGraphics;
    const rG = this.roofGraphics;
    const aG = this.aimGraphics;
    const lG = this.lightingGraphics;
    sG.clear();
    dG.clear();
    rG.clear();
    aG.clear();
    lG.clear();

    const w = this.worldState;
    const p = w.player;
    const pulse = 0.6 + 0.4 * Math.sin(w.elapsedTime * 4.2);

    // 1. Extraction Zone Subtle Tactical Beacon
    const ext = w.extractionZone;
    dG.lineStyle(2, 0x52b788, 0.35 + pulse * 0.4);
    dG.strokeCircle(ext.x, ext.y, ext.radius - 6 + pulse * 5);

    // 1b. Connected District Street Passage Beacons
    for (const conn of w.connections ?? []) {
      const isActiveConn =
        w.activePrompt?.targetType === 'transition' && w.activePrompt.id === conn.id;
      dG.lineStyle(isActiveConn ? 2.8 : 1.8, 0x38bdf8, (isActiveConn ? 0.65 : 0.28) + pulse * 0.32);
      dG.strokeCircle(conn.x, conn.y, conn.radius - 5 + pulse * 4);
    }

    // 2. Render Contextual Searchable Furniture & Vehicle Compartments
    for (const spot of w.lootSpots) {
      const isBeingLooted = w.activeLooting?.spotId === spot.id;
      const isNearest = w.activePrompt?.targetType === 'loot' && w.activePrompt.id === spot.id;
      // Only render interactive loot details if visible or inside an open roof building
      const insideClosedBuilding = w.buildings.some(
        (b) =>
          (b.roofAlpha ?? 1) > 0.75 &&
          spot.x > b.x + 12 &&
          spot.x < b.x + b.width - 12 &&
          spot.y > b.y + 12 &&
          spot.y < b.y + b.height - 12
      );
      if (!insideClosedBuilding) {
        this.renderLootObjectVisual(dG, spot, isNearest, isBeingLooted, pulse);
      }

      if (isBeingLooted && w.activeLooting) {
        const progress = Math.min(1, w.activeLooting.progress / w.activeLooting.duration);
        aG.lineStyle(2.5, 0x10b981, 0.9);
        aG.beginPath();
        aG.arc(
          p.x,
          p.y,
          p.radius + 13,
          -Math.PI / 2,
          -Math.PI / 2 + progress * Math.PI * 2,
          false
        );
        aG.strokePath();
      }
    }

    // 2b. Acoustic Sound Wave Propagation Rings (Diegetic Visual Noise Echoes)
    for (const ne of w.noiseEvents) {
      const lifeFraction = Math.max(0, ne.timer / ne.duration);
      const currentRadius = ne.radius * (1 - lifeFraction);
      const alpha = lifeFraction * (ne.source === 'gunshot' ? 0.45 : 0.28);
      const ringColor =
        ne.source === 'gunshot'
          ? 0xf59e0b
          : ne.source === 'melee'
          ? 0xe09132
          : ne.source === 'sprint'
          ? 0x94a3b8
          : 0x52b788;

      dG.lineStyle(1.8, ringColor, alpha);
      dG.strokeCircle(ne.x, ne.y, currentRadius);
    }

    const engagedSet = new Set(p.engagedTargetIds ?? []);

    // 3. Update Zombie Sprites with Tactical FOV Visibility (Visible vs Penumbra vs Hidden)
    for (const z of w.zombies) {
      const vis = z.visibility ?? 'hidden';
      const spr = this.zombieSpriteMap.get(z.id);
      if (spr) {
        spr.setPosition(z.x, z.y);
        spr.setRotation(z.facingAngle);
        spr.setFrame(this.computeZombieFrame(z));
        spr.setDepth(z.dead ? 5 : 14);

        if (z.dead) {
          spr.setVisible(vis !== 'hidden');
          spr.clearTint();
          spr.setAlpha(vis === 'visible' ? 0.9 : 0.38);
        } else if (vis === 'hidden') {
          // Do NOT expose unseen zombies behind walls or in darkness
          spr.setVisible(false);
        } else if (vis === 'penumbra') {
          spr.setVisible(true);
          spr.setTint(0x475569);
          spr.setAlpha(0.45);
        } else {
          spr.setVisible(true);
          if (z.hitFlashTimer > 0 && !this.bridge?.reducedEffects) {
            spr.setTintFill(0xf5f0e6);
          } else {
            spr.clearTint();
          }
          spr.setAlpha(1);
        }
      }

      if (!z.dead && vis !== 'hidden') {
        // Ground contact shadow under visible/penumbra zombie
        sG.fillStyle(0x050404, vis === 'visible' ? 0.62 : 0.28);
        sG.fillEllipse(z.x + 2, z.y + 4, z.radius * 1.9, z.radius * 1.45);

        // Bullet Echo Target Engagement Highlight when zombie is inside valid attack cone and visible
        if (vis === 'visible' && engagedSet.has(z.id)) {
          const isPrimary = p.engagedTargetId === z.id;
          const ringR = z.radius + (isPrimary ? 7 : 5);
          const engColor = isPrimary ? 0xef4444 : 0xf97316;

          dG.fillStyle(engColor, isPrimary ? 0.16 : 0.10);
          dG.fillCircle(z.x, z.y, ringR);
          dG.lineStyle(isPrimary ? 2.0 : 1.5, engColor, 0.85);
          dG.strokeCircle(z.x, z.y, ringR);

          // 4 tactical corner bracket ticks around engaged target
          const bracketR = ringR + 3;
          for (let bIdx = 0; bIdx < 4; bIdx++) {
            const baseA = bIdx * (Math.PI * 0.5) + Math.PI * 0.25;
            dG.beginPath();
            dG.arc(z.x, z.y, bracketR, baseA - 0.24, baseA + 0.24, false);
            dG.strokePath();
          }
        }

        // Attack windup danger telegraph (when visible)
        if (z.isWindingUp) {
          dG.lineStyle(2, 0xb93829, 0.85);
          dG.strokeCircle(z.x, z.y, z.attackRange);
          dG.fillStyle(0xb93829, 0.14);
          dG.fillCircle(z.x, z.y, z.attackRange);
        }

        // Diegetic slim health bar for wounded visible zombies
        if (vis === 'visible' && z.hp < z.maxHp) {
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

    // 3b. Render Building Roofs (depth 25: conceals interior when outside, fades smoothly when entering)
    this.renderBuildingRoofs(rG);

    // 4. Update Protagonist Pixel-Art Sprite, Walk/Run Cadence, Shadows & Bullet Echo Dynamic Aim Funnel
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 10) {
      this.walkAnimTime += dt * (p.sprinting ? 12.5 : 8.5);
    } else {
      this.walkAnimTime += dt * 2.0;
    }

    const isMachete = p.equippedWeapon === 'facao';

    if (this.playerSprite) {
      this.playerSprite.setPosition(p.x, p.y);
      this.playerSprite.setRotation(p.facingAngle);

      let frame = isMachete ? 8 : 0;

      if (!isMachete && this.shotFlashTimer > 0) {
        frame = 6; // Pistol fire + muzzle flash frame
      } else if (!isMachete && p.reloadTimer > 0) {
        frame = 7; // Pistol reload frame
      } else if (isMachete && p.meleeSwingTimer > 0) {
        frame = p.meleeSwingTimer > 0.08 ? 14 : 15; // 2-stage machete cleave
      } else if (speed > 12) {
        const stepFrame = Math.floor(this.walkAnimTime) % 4;
        frame = (isMachete ? 10 : 2) + stepFrame;
      } else {
        const breathFrame = Math.floor(this.walkAnimTime) % 2;
        frame = (isMachete ? 8 : 0) + breathFrame;
      }

      this.playerSprite.setFrame(frame);

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
    const hasTargetInCone = engagedSet.size > 0;

    // --- BULLET ECHO DYNAMIC DIRECTIONAL AIM FUNNEL / CONE ---
    if (!isMachete) {
      // PISTOL AIM: Dynamic Bullet Echo funnel (widens while moving, narrows smoothly when stationary)
      const cfg = WEAPON_CONFIG.pistola;
      const maxSight = cfg.sightRange;
      const currentSpread = p.aimSpreadRad ?? cfg.minConeAngleRad;
      const halfCone = currentSpread * 0.5;
      const focusFactor =
        1 -
        Math.max(
          0,
          Math.min(
            1,
            (currentSpread - cfg.minConeAngleRad) /
              Math.max(0.001, cfg.maxConeAngleRad - cfg.minConeAngleRad)
          )
        );

      const raySteps = 20;
      const coneColor = hasTargetInCone ? 0xef4444 : 0xf59e0b;
      const edgeColor = hasTargetInCone ? 0xf87171 : 0xfbbf24;
      const fillAlpha = hasTargetInCone
        ? 0.14 + focusFactor * 0.08
        : 0.08 + focusFactor * 0.07;
      const strokeAlpha = hasTargetInCone
        ? 0.78 + focusFactor * 0.18
        : 0.45 + focusFactor * 0.35;

      const originX = p.x + pCos * 10;
      const originY = p.y + pSin * 10;

      // 1. Obstacle-clipped translucent Bullet Echo funnel body
      aG.fillStyle(coneColor, fillAlpha);
      aG.beginPath();
      aG.moveTo(originX, originY);
      for (let i = 0; i <= raySteps; i++) {
        const a = p.facingAngle - halfCone + (i / raySteps) * (halfCone * 2);
        const rDist = getRayObstacleDistance(p.x, p.y, a, maxSight, w.obstacles, false);
        aG.lineTo(p.x + Math.cos(a) * rDist, p.y + Math.sin(a) * rDist);
      }
      aG.closePath();
      aG.fillPath();

      // 2. Crisp Left & Right Funnel Boundary Rays
      const leftAngle = p.facingAngle - halfCone;
      const rightAngle = p.facingAngle + halfCone;
      const leftDist = getRayObstacleDistance(p.x, p.y, leftAngle, maxSight, w.obstacles, false);
      const rightDist = getRayObstacleDistance(p.x, p.y, rightAngle, maxSight, w.obstacles, false);

      aG.lineStyle(1.9, edgeColor, strokeAlpha);
      aG.lineBetween(
        originX,
        originY,
        p.x + Math.cos(leftAngle) * leftDist,
        p.y + Math.sin(leftAngle) * leftDist
      );
      aG.lineBetween(
        originX,
        originY,
        p.x + Math.cos(rightAngle) * rightDist,
        p.y + Math.sin(rightAngle) * rightDist
      );

      // 3. Outer range arc & mid-range tactical arc (Bullet Echo signature cone arcs)
      const centerDist = getRayObstacleDistance(
        p.x,
        p.y,
        p.facingAngle,
        maxSight,
        w.obstacles,
        false
      );
      const outerArcR = Math.min(maxSight, centerDist, leftDist, rightDist);
      if (outerArcR > 40) {
        aG.lineStyle(1.4, edgeColor, strokeAlpha * 0.72);
        aG.beginPath();
        aG.arc(p.x, p.y, outerArcR, leftAngle, rightAngle, false);
        aG.strokePath();
      }
      const midArcR = outerArcR * 0.55;
      if (midArcR > 32) {
        aG.lineStyle(1.0, edgeColor, strokeAlpha * 0.35);
        aG.beginPath();
        aG.arc(p.x, p.y, midArcR, leftAngle, rightAngle, false);
        aG.strokePath();
      }

      // 4. Center Focus Guideline (brightens as cone narrows when steady)
      if (centerDist > p.radius + 14) {
        aG.lineStyle(1.2, edgeColor, 0.22 + focusFactor * 0.45);
        aG.lineBetween(
          p.x + pCos * (p.radius + 12),
          p.y + pSin * (p.radius + 12),
          p.x + pCos * centerDist,
          p.y + pSin * centerDist
        );
      }
    } else {
      // MACHETE AIM: Directional Attack Cone (84px reach, 65 deg opening) clipped against obstacles
      const reach = WEAPON_CONFIG.facao.reach;
      const halfCone = WEAPON_CONFIG.facao.coneAngleRad * 0.5;
      const raySteps = 16;

      const coneColor = hasTargetInCone ? 0xef4444 : 0xd9822b;
      const isSwinging = p.meleeSwingTimer > 0;
      const fillAlpha = isSwinging ? 0.28 : hasTargetInCone ? 0.22 : 0.14;
      const strokeAlpha = isSwinging ? 0.88 : hasTargetInCone ? 0.78 : 0.50;

      aG.fillStyle(coneColor, fillAlpha);
      aG.lineStyle(1.7, coneColor, strokeAlpha);
      aG.beginPath();
      aG.moveTo(p.x + pCos * 10, p.y + pSin * 10);

      for (let i = 0; i <= raySteps; i++) {
        const a = p.facingAngle - halfCone + (i / raySteps) * (halfCone * 2);
        const rDist = getRayObstacleDistance(p.x, p.y, a, reach, w.obstacles, false);
        aG.lineTo(p.x + Math.cos(a) * rDist, p.y + Math.sin(a) * rDist);
      }

      aG.closePath();
      aG.fillPath();
      aG.strokePath();

      // Active slash sweep during melee swing
      if (isSwinging) {
        const swingRatio = 1 - p.meleeSwingTimer / WEAPON_CONFIG.facao.swingDuration;
        const sweepAngle = p.facingAngle - halfCone + swingRatio * (halfCone * 2);
        const sweepDist = getRayObstacleDistance(p.x, p.y, sweepAngle, reach, w.obstacles, false);

        aG.lineStyle(3.5, 0xf8fafc, 0.9 * (1 - swingRatio * 0.4));
        aG.beginPath();
        aG.arc(
          p.x,
          p.y,
          Math.min(reach * 0.88, sweepDist),
          p.facingAngle - halfCone,
          sweepAngle,
          false
        );
        aG.strokePath();
      }
    }

    // Muzzle flash light burst when firing pistol
    if (this.shotFlashTimer > 0 && !this.bridge?.reducedEffects) {
      const mx = p.x + pCos * (p.radius + 16);
      const my = p.y + pSin * (p.radius + 16);
      aG.fillStyle(0xf59e0b, 0.45);
      aG.fillCircle(mx, my, 18);
      aG.fillStyle(0xfef3c7, 0.85);
      aG.fillCircle(mx, my, 7);
    }

    // Reloading progress ring around player
    if (p.reloadTimer > 0) {
      const progress = 1 - p.reloadTimer / p.reloadDuration;
      aG.lineStyle(2.5, 0xd9822b, 0.9);
      aG.beginPath();
      aG.arc(
        p.x,
        p.y,
        p.radius + 9,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
        false
      );
      aG.strokePath();
    }

    // 5. Active Bullets with high-velocity tracer tail
    for (const b of w.bullets) {
      if (!b.active) continue;
      const bMag = Math.hypot(b.vx, b.vy) || 1;
      const tailX = b.x - (b.vx / bMag) * 14;
      const tailY = b.y - (b.vy / bMag) * 14;
      aG.lineStyle(2, 0xf59e0b, 0.55);
      aG.lineBetween(tailX, tailY, b.x, b.y);
      aG.fillStyle(0xfef3c7, 1);
      aG.fillCircle(b.x, b.y, 2.5);
    }

    // 6. Pooled Particles (Blood droplets, sparks, shell casings)
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const pt = this.particlePool[i];
      if (!pt.active) continue;
      aG.fillStyle(pt.color, Math.max(0, pt.life / pt.maxLife));
      aG.fillCircle(pt.x, pt.y, pt.size);
    }

    // 7. Healing canalization progress arc and medical cross badge over player
    if (p.healing?.active) {
      const hProg = Math.min(1, p.healing.progress / p.healing.duration);
      aG.lineStyle(3, 0x10b981, 0.95);
      aG.beginPath();
      aG.arc(p.x, p.y, p.radius + 18, -Math.PI / 2, -Math.PI / 2 + hProg * Math.PI * 2, false);
      aG.strokePath();

      const crossY = p.y - p.radius - 22;
      aG.fillStyle(0x10b981, 0.95);
      aG.fillRect(p.x - 2, crossY - 6, 4, 12);
      aG.fillRect(p.x - 6, crossY - 2, 12, 4);
    }

    // 8. Bullet Echo Tactical Field of View, Penumbra, Flashlight Beam & Discrete Acoustic Cues
    this.renderAtmosphericLighting(lG, aG);
  }

  private renderAtmosphericLighting(
    lG: Phaser.GameObjects.Graphics,
    aG: Phaser.GameObjects.Graphics
  ): void {
    const w = this.worldState;
    const p = w.player;

    const {
      closeRadius,
      coneRange,
      coneAngleRad,
      flashlightActive,
      flashlightRange,
      flashlightConeAngleRad,
    } = getEffectiveVisionRanges(w);

    const baseDarkness = Math.min(0.62, Math.max(0.18, w.ambientDarkness));
    const penumbraDarkness = baseDarkness * 0.52;
    const outerCoverRadius = Math.max(2200, Math.hypot(w.worldWidth, w.worldHeight));

    // Effective forward visioncone opening & range
    const activeForwardRange = flashlightActive ? flashlightRange : coneRange;
    const activeHalfCone = (flashlightActive ? flashlightConeAngleRad : coneAngleRad) * 0.5;
    const a1 = p.facingAngle - activeHalfCone;
    const a2 = p.facingAngle + activeHalfCone;

    // 1. Outer Darkness Layer outside the forward cone and outside the close perception ring
    lG.fillStyle(0x05070a, baseDarkness);
    lG.beginPath();
    lG.arc(p.x, p.y, outerCoverRadius, a2, a1 + Math.PI * 2, false);
    lG.arc(p.x, p.y, closeRadius, a1 + Math.PI * 2, a2, true);
    lG.closePath();
    lG.fillPath();

    // 2. Outer Darkness Layer beyond the forward perception/flashlight range
    lG.fillStyle(0x05070a, baseDarkness);
    lG.beginPath();
    lG.arc(p.x, p.y, outerCoverRadius, a1, a2, false);
    lG.arc(p.x, p.y, activeForwardRange, a2, a1, true);
    lG.closePath();
    lG.fillPath();

    // 3. Obstacle-Cast Shadow Polygons inside the forward cone (walls, cars, furniture block light & sight)
    const raySteps = 28;
    for (let i = 0; i < raySteps; i++) {
      const ra1 = a1 + (i / raySteps) * (activeHalfCone * 2);
      const ra2 = a1 + ((i + 1) / raySteps) * (activeHalfCone * 2);
      const d1 = getRayObstacleDistance(p.x, p.y, ra1, activeForwardRange, w.obstacles, false);
      const d2 = getRayObstacleDistance(p.x, p.y, ra2, activeForwardRange, w.obstacles, false);

      if (d1 < activeForwardRange - 4 || d2 < activeForwardRange - 4) {
        lG.fillStyle(0x05070a, Math.min(0.72, baseDarkness + 0.14));
        lG.beginPath();
        lG.moveTo(p.x + Math.cos(ra1) * d1, p.y + Math.sin(ra1) * d1);
        lG.lineTo(
          p.x + Math.cos(ra1) * activeForwardRange,
          p.y + Math.sin(ra1) * activeForwardRange
        );
        lG.lineTo(
          p.x + Math.cos(ra2) * activeForwardRange,
          p.y + Math.sin(ra2) * activeForwardRange
        );
        lG.lineTo(p.x + Math.cos(ra2) * d2, p.y + Math.sin(ra2) * d2);
        lG.closePath();
        lG.fillPath();
      }
    }

    // 4. Penumbra Transition Band around close peripheral awareness ring
    lG.lineStyle(18, 0x05070a, penumbraDarkness);
    lG.strokeCircle(p.x, p.y, closeRadius + 9);

    // 5. Directional Flashlight Beam Illumination (distinct warm high-visibility beam when ON)
    if (flashlightActive) {
      lG.fillStyle(0xfef3c7, 0.17);
      lG.lineStyle(1.4, 0xfde68a, 0.32);
      lG.beginPath();
      lG.moveTo(p.x, p.y);
      for (let i = 0; i <= raySteps; i++) {
        const ra = a1 + (i / raySteps) * (activeHalfCone * 2);
        const rDist = getRayObstacleDistance(
          p.x,
          p.y,
          ra,
          flashlightRange,
          w.obstacles,
          false
        );
        lG.lineTo(p.x + Math.cos(ra) * rDist, p.y + Math.sin(ra) * rDist);
      }
      lG.closePath();
      lG.fillPath();
      lG.strokePath();

      // High-intensity center flashlight core
      const coreHalf = activeHalfCone * 0.42;
      lG.fillStyle(0xffffff, 0.11);
      lG.beginPath();
      lG.moveTo(p.x, p.y);
      for (let i = 0; i <= 10; i++) {
        const ra = p.facingAngle - coreHalf + (i / 10) * (coreHalf * 2);
        const rDist = getRayObstacleDistance(
          p.x,
          p.y,
          ra,
          flashlightRange * 0.78,
          w.obstacles,
          false
        );
        lG.lineTo(p.x + Math.cos(ra) * rDist, p.y + Math.sin(ra) * rDist);
      }
      lG.closePath();
      lG.fillPath();

      // Close 360-degree lantern bounce around survivor
      lG.fillStyle(0xfde68a, 0.09);
      lG.fillCircle(p.x, p.y, closeRadius * 0.85);
    } else {
      // Flashlight OFF: subtle close-awareness perimeter ring
      lG.lineStyle(1.2, 0x94a3b8, 0.16);
      lG.strokeCircle(p.x, p.y, closeRadius * 0.85);
    }

    // 6. Discrete Directional Acoustic Threat Indicators (sound != sight: indicates direction & distance band of unseen threats)
    const acousticWave = 0.5 + 0.5 * Math.sin(w.elapsedTime * 7.5);
    for (const cue of w.acousticCues ?? []) {
      const cueColor =
        cue.distanceBand === 'perto'
          ? 0xef4444
          : cue.distanceBand === 'medio'
          ? 0xf59e0b
          : 0x94a3b8;
      const ringR =
        cue.distanceBand === 'perto' ? 54 : cue.distanceBand === 'medio' ? 66 : 78;
      const span =
        cue.distanceBand === 'perto' ? 0.34 : cue.distanceBand === 'medio' ? 0.26 : 0.2;
      const alpha = (0.45 + 0.4 * acousticWave) * cue.intensity;

      // Double acoustic wave arcs on player's directional compass ring
      aG.lineStyle(cue.distanceBand === 'perto' ? 3.0 : 2.2, cueColor, alpha);
      aG.beginPath();
      aG.arc(p.x, p.y, ringR, cue.angle - span, cue.angle + span, false);
      aG.strokePath();

      aG.lineStyle(1.4, cueColor, alpha * 0.65);
      aG.beginPath();
      aG.arc(
        p.x,
        p.y,
        ringR + 6 + acousticWave * 4,
        cue.angle - span * 0.75,
        cue.angle + span * 0.75,
        false
      );
      aG.strokePath();
    }

    // 7. Extraction Gate emergency beacon light
    const pulse = 0.5 + 0.5 * Math.sin(w.elapsedTime * 3.5);
    lG.fillStyle(0x10b981, 0.14 + pulse * 0.10);
    lG.fillCircle(w.extractionZone.x, w.extractionZone.y, w.extractionZone.radius * 1.35);
  }
}

