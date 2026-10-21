import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  buildMinimapSnapshot,
  DEFAULT_MAX_CARRY_CAPACITY,
  getCarryLoad,
} from '../action/actionRules.ts';
import {
  createExternalControlBridge,
  type ExternalControlBridge,
  SurvivalActionScene,
} from '../action/SurvivalActionScene.ts';
import type { ActionWorldState, MinimapSnapshot } from '../action/actionTypes.ts';
import { ResourceIconSvg } from './SvgArt.tsx';

interface PhaserArenaProps {
  worldStateRef: React.MutableRefObject<ActionWorldState>;
  isPaused: boolean;
  isMuted: boolean;
  reducedEffects: boolean;
  onToggleMute: () => void;
  onToggleReducedEffects: () => void;
  onTogglePause: () => void;
  onRunFinished: (finalWorld: ActionWorldState) => void;
}

interface HudReadout {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  weapon: 'pistola' | 'facao';
  ammoInClip: number;
  clipSize: number;
  ammoReserve: number;
  isReloading: boolean;
  lootComida: number;
  lootMedicamentos: number;
  lootMunicao: number;
  lootMateriais: number;
  lootTotal: number;
  maxCarryCapacity: number;
  isBackpackFull: boolean;
  zombiesKilled: number;
  zombiesRemaining: number;
  promptLabel: string | null;
  promptActionVerb: string | null;
  promptType: 'loot' | 'extraction' | 'transition' | null;
  isSearchingLoot: boolean;
  lootSearchProgress: number;
  banner: string;
  distToExtractionMeters: number;
  angleToExtractionRad: number;
  districtId: string;
  districtName: string;
  timeOfDay: string;
  isInsideBuilding: boolean;
  currentBuildingName: string | null;
  flashlightEnabled: boolean;
  flashlightBattery: number;
  isHealing: boolean;
  healingProgress: number;
  healingDuration: number;
  activeObjectiveText: string | null;
  objectivesCompletedCount: number;
  objectivesTotalCount: number;
  visitedDistrictsCount: number;
  activeLootClue: string | null;
  minimap: MinimapSnapshot;
}

function buildHudReadout(w: ActionWorldState): HudReadout {
  const minimap = buildMinimapSnapshot(w, 128, 96);
  const lootTotal = getCarryLoad(w.runLoot);
  const maxCarryCapacity = w.maxCarryCapacity ?? DEFAULT_MAX_CARRY_CAPACITY;

  return {
    hp: Math.round(w.player.hp),
    maxHp: w.player.maxHp,
    stamina: Math.round(w.player.stamina),
    maxStamina: w.player.maxStamina,
    weapon: w.player.equippedWeapon,
    ammoInClip: w.player.ammoInClip,
    clipSize: w.player.clipSize,
    ammoReserve: w.player.ammoReserve,
    isReloading: w.player.reloadTimer > 0,
    lootComida: w.runLoot.comida,
    lootMedicamentos: w.runLoot.medicamentos,
    lootMunicao: w.runLoot.municao,
    lootMateriais: w.runLoot.materiais,
    lootTotal,
    maxCarryCapacity,
    isBackpackFull: lootTotal >= maxCarryCapacity,
    zombiesKilled: w.zombiesKilled,
    zombiesRemaining: w.zombies.filter((z) => !z.dead).length,
    promptLabel: w.activePrompt ? w.activePrompt.label : null,
    promptActionVerb: w.activePrompt
      ? w.activePrompt.actionVerb || w.activePrompt.label
      : null,
    promptType: w.activePrompt ? w.activePrompt.targetType : null,
    isSearchingLoot: !!w.activeLooting,
    lootSearchProgress: w.activeLooting
      ? Math.min(100, Math.round((w.activeLooting.progress / w.activeLooting.duration) * 100))
      : 0,
    banner: w.lastEventBanner,
    distToExtractionMeters: minimap.extraction.distanceMeters,
    angleToExtractionRad: minimap.extraction.bearingRad,
    districtId: w.districtId,
    districtName: w.districtName,
    timeOfDay: w.timeOfDay,
    isInsideBuilding: w.isInsideBuilding,
    currentBuildingName: w.currentBuildingName,
    flashlightEnabled: w.player.flashlight.enabled,
    flashlightBattery: Math.round(w.player.flashlight.battery),
    isHealing: !!w.player.healing?.active,
    healingProgress: w.player.healing ? w.player.healing.progress : 0,
    healingDuration: w.player.healing ? w.player.healing.duration : 1,
    activeObjectiveText: (() => {
      const objs = w.objectives ?? [];
      const currentDistrictObj = objs.find(
        (o) => o.districtId === w.districtId && !o.completed
      );
      const fallbackObj = objs.find((o) => !o.completed) ?? objs[0];
      const chosen = currentDistrictObj ?? fallbackObj;
      if (!chosen) return null;
      return chosen.completed
        ? `✓ ${chosen.title}`
        : `◎ ${chosen.title}`;
    })(),
    objectivesCompletedCount: (w.objectives ?? []).filter((o) => o.completed).length,
    objectivesTotalCount: (w.objectives ?? []).length,
    visitedDistrictsCount: (w.visitedDistricts ?? [w.districtId]).length,
    activeLootClue: w.activeLooting
      ? w.lootSpots.find((s) => s.id === w.activeLooting!.spotId)?.clueText ?? null
      : null,
    minimap,
  };
}

function formatTimeOfDayLabel(timeOfDay: string): string {
  switch (timeOfDay) {
    case 'dia':
      return '☀️ Dia';
    case 'entardecer':
    case 'crepusculo':
      return '🌅 Crepúsculo';
    case 'madrugada':
      return '🌘 Madrugada';
    case 'noite':
    default:
      return '🌙 Noite';
  }
}

export function PhaserArena({
  worldStateRef,
  isPaused,
  isMuted,
  reducedEffects,
  onToggleMute,
  onTogglePause,
  onRunFinished,
}: PhaserArenaProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bridgeRef = useRef<ExternalControlBridge>(createExternalControlBridge());
  const isPausedRef = useRef(isPaused);
  const onRunFinishedRef = useRef(onRunFinished);

  isPausedRef.current = isPaused;
  onRunFinishedRef.current = onRunFinished;
  bridgeRef.current.reducedEffects = reducedEffects;

  const [hud, setHud] = useState<HudReadout>(() =>
    buildHudReadout(worldStateRef.current)
  );

  const [viewport, setViewport] = useState<{
    width: number;
    height: number;
    isLandscape: boolean;
  }>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 915;
    const h = typeof window !== 'undefined' ? window.innerHeight : 412;
    return { width: w, height: h, isLandscape: w >= h };
  });
  const prevLandscapeRef = useRef<boolean>(viewport.isLandscape);

  // Floating Movement Joystick state (left half of screen)
  const [floatingJoy, setFloatingJoy] = useState<{
    visible: boolean;
    startX: number;
    startY: number;
    knobX: number;
    knobY: number;
  }>({
    visible: false,
    startX: 0,
    startY: 0,
    knobX: 0,
    knobY: 0,
  });
  const leftPointerIdRef = useRef<number | null>(null);

  // Dedicated Aim Dial state (only control allowed to change aimAngle)
  const aimStickRef = useRef<HTMLDivElement | null>(null);
  const aimKnobRef = useRef<HTMLDivElement | null>(null);
  const aimPointerIdRef = useRef<number | null>(null);
  const [aimLockedAngle, setAimLockedAngle] = useState<number>(0);

  // Dedicated Right-Side Fire Button state (never alters or resets aimAngle)
  const firePointerIdRef = useRef<number | null>(null);
  const [isFireHeld, setIsFireHeld] = useState(false);

  const resetLeftJoystick = useCallback(() => {
    leftPointerIdRef.current = null;
    bridgeRef.current.joyMoveX = 0;
    bridgeRef.current.joyMoveY = 0;
    bridgeRef.current.sprintHeld = false;
    setFloatingJoy((prev) =>
      prev.visible ? { ...prev, visible: false, knobX: 0, knobY: 0 } : prev
    );
  }, []);

  const releaseAimStick = useCallback(() => {
    aimPointerIdRef.current = null;
    // IMPORTANT: Do NOT reset bridgeRef.current.aimAngle to null!
    // The established aim direction must remain stable after adjusting the aim control.
    if (aimKnobRef.current) {
      aimKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  }, []);

  const releaseFireButton = useCallback(() => {
    firePointerIdRef.current = null;
    bridgeRef.current.attackHeld = false;
    setIsFireHeld(false);
  }, []);

  // Global window pointer/touch/blur safety listeners so controls NEVER stay stuck
  // and each pointer is released independently without interfering with other fingers
  useEffect(() => {
    const handleGlobalPointerEnd = (e: PointerEvent) => {
      if (leftPointerIdRef.current !== null && e.pointerId === leftPointerIdRef.current) {
        resetLeftJoystick();
      }
      if (aimPointerIdRef.current !== null && e.pointerId === aimPointerIdRef.current) {
        releaseAimStick();
      }
      if (firePointerIdRef.current !== null && e.pointerId === firePointerIdRef.current) {
        releaseFireButton();
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        resetLeftJoystick();
        releaseAimStick();
        releaseFireButton();
      }
    };

    const handleGlobalResetAll = () => {
      resetLeftJoystick();
      releaseAimStick();
      releaseFireButton();
    };

    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
    window.addEventListener('blur', handleGlobalResetAll);
    document.addEventListener('visibilitychange', handleGlobalResetAll);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
      window.removeEventListener('blur', handleGlobalResetAll);
      document.removeEventListener('visibilitychange', handleGlobalResetAll);
    };
  }, [resetLeftJoystick, releaseAimStick, releaseFireButton]);

  // Live viewport resize & rotation listener: resizes Phaser canvas and reorganizes HUD
  // without restarting the match, losing resources, or resetting aim direction.
  useEffect(() => {
    const syncDimensions = () => {
      const el = mountRef.current;
      const w = Math.max(240, el?.clientWidth || window.innerWidth || 915);
      const h = Math.max(240, el?.clientHeight || window.innerHeight || 412);
      const isLandscape = w >= h;

      if (prevLandscapeRef.current !== isLandscape) {
        prevLandscapeRef.current = isLandscape;
        resetLeftJoystick();
        releaseAimStick();
        releaseFireButton();
      }

      setViewport((prev) =>
        prev.width === w && prev.height === h && prev.isLandscape === isLandscape
          ? prev
          : { width: w, height: h, isLandscape }
      );

      if (gameRef.current && gameRef.current.scale) {
        if (gameRef.current.scale.width !== w || gameRef.current.scale.height !== h) {
          gameRef.current.scale.resize(w, h);
        }
      }
    };

    syncDimensions();
    window.addEventListener('resize', syncDimensions);
    window.addEventListener('orientationchange', syncDimensions);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mountRef.current) {
      observer = new ResizeObserver(() => syncDimensions());
      observer.observe(mountRef.current);
    }

    return () => {
      window.removeEventListener('resize', syncDimensions);
      window.removeEventListener('orientationchange', syncDimensions);
      observer?.disconnect();
    };
  }, [resetLeftJoystick, releaseAimStick, releaseFireButton]);

  // Also reset movement and active hold states if game becomes paused (preserving aimAngle)
  useEffect(() => {
    if (isPaused) {
      resetLeftJoystick();
      releaseAimStick();
      releaseFireButton();
    }
  }, [isPaused, resetLeftJoystick, releaseAimStick, releaseFireButton]);

  const handleHudSync = useCallback((w: ActionWorldState) => {
    const win = window as unknown as {
      __ULTIMO_DIA_WORLD__?: ActionWorldState;
      __ULTIMO_DIA_BRIDGE__?: ExternalControlBridge;
    };
    win.__ULTIMO_DIA_WORLD__ = w;
    win.__ULTIMO_DIA_BRIDGE__ = bridgeRef.current;
    setHud(buildHudReadout(w));
    if (w.status === 'extracted' || w.status === 'dead') {
      onRunFinishedRef.current(w);
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const scene = new SurvivalActionScene();
    scene.bindRuntime(
      worldStateRef.current,
      bridgeRef.current,
      handleHudSync,
      () => isPausedRef.current
    );

    const game = new Phaser.Game({
      type: isHeadless ? Phaser.CANVAS : Phaser.AUTO,
      parent: container,
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
      backgroundColor: '#0d0c0a',
      pixelArt: true,
      antialias: false,
      fps: isHeadless ? { target: 20, forceSetTimeOut: true } : { target: 60 },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
      audio: {
        noAudio: true,
      },
      banner: false,
    });
    gameRef.current = game;

    (window as unknown as { __ULTIMO_DIA_WORLD__?: ActionWorldState }).__ULTIMO_DIA_WORLD__ =
      worldStateRef.current;

    return () => {
      gameRef.current = null;
      game.destroy(true);
    };
  }, [handleHudSync, worldStateRef]);

  // Floating Touch Joystick handlers (left half of the screen)
  const maxJoyRadius = 52;
  const deadzoneRadius = 6;
  const leftStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onLeftZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerIdRef.current !== null) return;
    if ((e.target as HTMLElement).closest('button, [role="button"], [role="group"]')) return;

    // If the player tapped directly on a searchable car, furniture object, or extraction zone,
    // trigger the contextual interaction and do NOT activate the left movement joystick!
    if (bridgeRef.current.tryInteractAtScreenPoint?.(e.clientX, e.clientY)) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events without active pointerId
    }
    leftPointerIdRef.current = e.pointerId;
    leftStartRef.current = { x: e.clientX, y: e.clientY };

    setFloatingJoy({
      visible: true,
      startX: e.clientX,
      startY: e.clientY,
      knobX: 0,
      knobY: 0,
    });
    bridgeRef.current.joyMoveX = 0;
    bridgeRef.current.joyMoveY = 0;
    bridgeRef.current.sprintHeld = false;
  };

  const onLeftZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - leftStartRef.current.x;
    const dy = e.clientY - leftStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= deadzoneRadius) {
      bridgeRef.current.joyMoveX = 0;
      bridgeRef.current.joyMoveY = 0;
      bridgeRef.current.sprintHeld = false;
      setFloatingJoy((prev) => (prev.visible ? { ...prev, knobX: 0, knobY: 0 } : prev));
      return;
    }

    const clampedDist = Math.min(dist, maxJoyRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    const nx = maxJoyRadius > 0 ? kx / maxJoyRadius : 0;
    const ny = maxJoyRadius > 0 ? ky / maxJoyRadius : 0;

    bridgeRef.current.joyMoveX = nx;
    bridgeRef.current.joyMoveY = ny;
    bridgeRef.current.sprintHeld = clampedDist > maxJoyRadius * 0.88;

    setFloatingJoy((prev) =>
      prev.visible
        ? {
            ...prev,
            knobX: kx,
            knobY: ky,
          }
        : prev
    );
  };

  const onLeftZonePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerIdRef.current === e.pointerId) {
      resetLeftJoystick();
    }
  };

  // Dedicated Aim Stick handler (ONLY control responsible for changing aimAngle)
  const updateAimStick = (clientX: number, clientY: number) => {
    const el = aimStickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxRadius = rect.width * 0.42;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    if (dist > 4) {
      bridgeRef.current.aimAngle = angle;
      setAimLockedAngle(angle);
    }

    if (aimKnobRef.current) {
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      aimKnobRef.current.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0)`;
    }
  };

  const hpPercent = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const staminaPercent = Math.max(
    0,
    Math.min(100, (hud.stamina / hud.maxStamina) * 100)
  );
  const isLandscape = viewport.isLandscape;
  const isCompactLandscape = isLandscape && viewport.height <= 430;
  const timeOfDayLabel = formatTimeOfDayLabel(hud.timeOfDay);

  return (
    <div
      data-testid="phaser-arena-shell"
      data-orientation={isLandscape ? 'landscape' : 'portrait'}
      className="fixed inset-0 w-full h-full overflow-hidden bg-[#0d0c0a] select-none"
    >
      {/* Isolated Phaser Canvas Mount */}
      <div
        ref={mountRef}
        data-testid="phaser-arena-canvas"
        className="w-full h-full"
      />

      {/* Balanced Peripheral Vignette (preserves center and ambient visibility) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_52%,rgba(8,7,6,0.20)_80%,rgba(5,4,4,0.45)_100%)]"
      />

      {/* Critical Low HP Peripheral Vignette (respects reducedEffects comfort mode) */}
      {hud.hp <= 30 && !reducedEffects && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-[4px] border-[#8f241b]/45"
        />
      )}

      {/* FLOATING JOYSTICK TOUCH SURFACE (Covers the left 48% of the screen, below HUD buttons) */}
      <div
        data-testid="floating-joystick-touchzone"
        onPointerDown={onLeftZonePointerDown}
        onPointerMove={onLeftZonePointerMove}
        onPointerUp={onLeftZonePointerUp}
        onPointerCancel={onLeftZonePointerUp}
        onLostPointerCapture={onLeftZonePointerUp}
        className="fixed inset-y-0 left-0 w-[48%] z-20 touch-none"
      >
        {/* Floating Joystick Base and Knob (Only visible when actively touching) */}
        {floatingJoy.visible && (
          <div
            style={{
              left: floatingJoy.startX,
              top: floatingJoy.startY,
              transform: 'translate(-50%, -50%)',
            }}
            className="pointer-events-none absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#110f0d]/60 border border-[#c87a28]/60 flex items-center justify-center shadow-2xl"
          >
            <div className="w-full h-[1px] bg-[#c87a28]/30 absolute" />
            <div className="h-full w-[1px] bg-[#c87a28]/30 absolute" />

            <div
              style={{
                transform: `translate3d(${floatingJoy.knobX.toFixed(1)}px, ${floatingJoy.knobY.toFixed(1)}px, 0)`,
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#2b241d]/95 border border-[#e09132] shadow-lg flex items-center justify-center"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#e09132]" />
            </div>
          </div>
        )}
      </div>

      {/* Full-Viewport Landscape-First Tactical HUD Wrapper (z-30 so buttons are never blocked by touch zone) */}
      <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between safe-area-hud">
        {/* TOP PERIMETER BAR: Vitals & Weapon (Left) | Time, Sector & Extraction (Center) | Backpack & System (Right) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-1.5">
            {/* Top-Left Perimeter Dock: Compact Horizontal Strip in Landscape, Compact Stack in Portrait */}
            <div
              data-testid="hud-top-left"
              className={`pointer-events-auto shrink-0 rounded-sm bg-[#110f0d]/88 border border-[#2e2722] shadow-lg ${
                isLandscape
                  ? 'flex items-center gap-2 px-2 py-1'
                  : 'flex flex-col gap-1.5 p-2 w-44'
              }`}
            >
              {/* Vitals Block (HP & Stamina) */}
              <div className={isLandscape ? 'w-24 lg:w-32 space-y-1.5' : 'w-full space-y-1.5'}>
                {/* HP Bar */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[9px] leading-none">
                    <span className="font-bold uppercase tracking-wider text-[#ef4444] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Saúde
                    </span>
                    <span className="font-mono-tabular font-bold text-[#ebe5dc]">
                      {hud.hp}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#090807] border border-[#241f1b] overflow-hidden rounded-full">
                    <div
                      className={`h-full transition-transform duration-200 origin-left ${
                        hud.hp <= 30
                          ? 'bg-gradient-to-r from-[#7f1d1d] to-[#ef4444]'
                          : 'bg-gradient-to-r from-[#166534] to-[#22c55e]'
                      }`}
                      style={{ transform: `scaleX(${hpPercent / 100})` }}
                    />
                  </div>
                </div>

                {/* Stamina Bar */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[8px] leading-none">
                    <span className="uppercase tracking-wider text-[#38bdf8] font-bold">
                      Fôlego
                    </span>
                    <span className="font-mono-tabular text-[#b8afa4]">
                      {hud.stamina}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#090807] border border-[#1f1a17] overflow-hidden rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-[#0369a1] to-[#38bdf8] transition-transform duration-75 origin-left"
                      style={{ transform: `scaleX(${staminaPercent / 100})` }}
                    />
                  </div>
                </div>
              </div>

              {/* Equipped Weapon, Ammo Readout & Switch Button */}
              <div
                className={
                  isLandscape
                    ? 'pl-2 border-l border-[#241f1b] flex items-center gap-2'
                    : 'pt-1 border-t border-[#241f1b] flex items-center justify-between gap-2'
                }
              >
                <div className="min-w-[60px]">
                  <div className="text-[9px] uppercase tracking-wider text-[#f59e0b] font-black truncate leading-tight flex items-center gap-1">
                    {hud.weapon === 'pistola' ? '🔫 PISTOLA' : '🗡️ FACÃO'}
                  </div>
                  <div className="mt-0.5 space-y-1">
                    {hud.weapon === 'pistola' ? (
                      <>
                        <div className="flex items-end gap-1 leading-none">
                          <span className={`font-mono-tabular text-sm font-black ${hud.ammoInClip === 0 ? 'text-[#ef4444]' : 'text-[#ebe5dc]'}`}>
                            {hud.ammoInClip}
                          </span>
                          <span className="text-[10px] font-bold text-[#8c8277] mb-0.5">/{hud.ammoReserve}</span>
                        </div>
                        {/* Ammo Clip Capacity Bar */}
                        <div className="h-1 w-full bg-[#090807] border border-[#241f1b] overflow-hidden rounded-full">
                           <div
                             className={`h-full transition-all duration-300 origin-left ${hud.isReloading ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#e09132]'}`}
                             style={{ transform: `scaleX(${hud.isReloading ? 1 : hud.ammoInClip / hud.clipSize})` }}
                           />
                        </div>
                      </>
                    ) : (
                      <div className="text-[9px] font-bold text-[#52b788] uppercase tracking-widest leading-none">C. CORPO</div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-switch-weapon"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    bridgeRef.current.queuedSwitchWeapon = true;
                  }}
                  className="min-h-[32px] px-2 py-0.5 rounded-sm bg-[#1c1815] hover:bg-[#29231e] active:scale-95 border border-[#382f28] text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[#ebe5dc] whitespace-nowrap shrink-0 touch-none"
                >
                  {hud.weapon === 'pistola' ? '🗡️ Facão' : '🔫 Pistola'}
                  <span className="hidden lg:inline text-[#8c8277]"> [Q]</span>
                </button>
              </div>
            </div>

            {/* Top-Center Perimeter Strip (Landscape): Time of Day, Sector/Building & Extraction Distance */}
            {isLandscape && (
              <div
                data-testid="hud-top-center"
                className="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-center px-1"
              >
                <div className="max-w-full rounded-sm bg-[#110f0d]/88 border border-[#2e2722] px-2 py-1 text-[9px] lg:text-[10px] text-[#d6cec2] flex items-center gap-1.5 shadow whitespace-nowrap overflow-hidden">
                  <span
                    data-testid="hud-time-of-day"
                    className="font-bold uppercase tracking-wider text-[#fef3c7] shrink-0"
                  >
                    {timeOfDayLabel}
                  </span>
                  <span aria-hidden="true" className="text-[#4a3e35] shrink-0">·</span>
                  <span
                    data-testid="hud-district-name"
                    className="font-bold uppercase tracking-wider text-[#e09132] truncate max-w-[90px] md:max-w-[150px] lg:max-w-[200px]"
                  >
                    {hud.isInsideBuilding && hud.currentBuildingName
                      ? `🏢 ${hud.currentBuildingName}`
                      : hud.districtName}
                  </span>
                  <span aria-hidden="true" className="text-[#4a3e35] shrink-0">·</span>
                  <span className="font-bold uppercase tracking-wider text-[#52b788] font-mono-tabular shrink-0">
                    Extração {hud.distToExtractionMeters}m
                  </span>
                  {hud.objectivesTotalCount > 0 && (
                    <>
                      <span aria-hidden="true" className="text-[#4a3e35] shrink-0 hidden sm:inline">·</span>
                      <span
                        data-testid="hud-objective-summary"
                        className="hidden sm:inline font-bold uppercase tracking-wider text-[#38bdf8] font-mono-tabular shrink-0"
                      >
                        Obj {hud.objectivesCompletedCount}/{hud.objectivesTotalCount}
                      </span>
                    </>
                  )}
                </div>
                {!isCompactLandscape && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] font-bold text-[#d6cec2] bg-[#0d0b09]/90 px-3 py-1 rounded-sm border border-[#382f28] shadow-md flex items-center gap-2">
                      <span className="text-[#38bdf8]">{hud.activeObjectiveText ?? 'EXPLORE A CIDADE'}</span>
                      {hud.activeLootClue && (
                        <>
                          <span className="text-[#4a3e35]">|</span>
                          <span className="text-[#fef3c7] italic">"{hud.activeLootClue}"</span>
                        </>
                      )}
                    </div>
                    <div className="text-[9px] text-[#8c8277] uppercase tracking-widest animate-pulse">
                      {hud.banner}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top-Right Perimeter Dock: Backpack Capacity, Loot Counters & Audio/Pause */}
            <div
              data-testid="hud-top-right"
              className="pointer-events-auto shrink-0 flex items-start gap-1"
            >
              <div
                className={`rounded-sm bg-[#110f0d]/88 border px-2.5 py-1.5 shadow-lg ${
                  hud.isBackpackFull ? 'border-[#ef4444] animate-pulse' : 'border-[#2e2722]'
                }`}
                aria-label="Saque coletado na incursão"
              >
                <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-wider mb-1.5 whitespace-nowrap">
                  <span className={hud.isBackpackFull ? 'text-[#ef4444]' : 'text-[#8c8277]'}>
                    🎒 MOCHILA {hud.lootTotal}/{hud.maxCarryCapacity}
                  </span>
                </div>
                {/* Backpack Capacity Bar */}
                <div className="h-1.5 w-full bg-[#090807] border border-[#241f1b] overflow-hidden rounded-full mb-2">
                  <div
                    className={`h-full transition-all duration-300 origin-left ${hud.isBackpackFull ? 'bg-[#ef4444]' : 'bg-[#52b788]'}`}
                    style={{ transform: `scaleX(${Math.min(1, hud.lootTotal / hud.maxCarryCapacity)})` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-x-2">
                  <div className="flex flex-col items-center">
                    <ResourceIconSvg type="comida" className="w-3 h-3 mb-0.5" />
                    <span className="font-mono text-[10px] font-black text-[#ebe5dc]">{hud.lootComida}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ResourceIconSvg type="medicamentos" className="w-3 h-3 mb-0.5" />
                    <span className="font-mono text-[10px] font-black text-[#ebe5dc]">{hud.lootMedicamentos}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ResourceIconSvg type="municao" className="w-3 h-3 mb-0.5" />
                    <span className="font-mono text-[10px] font-black text-[#ebe5dc]">{hud.lootMunicao}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ResourceIconSvg type="materiais" className="w-3 h-3 mb-0.5" />
                    <span className="font-mono text-[10px] font-black text-[#ebe5dc]">{hud.lootMateriais}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row gap-1">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isMuted ? 'Ativar som [M]' : 'Silenciar som [M]'}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMute();
                  }}
                  className="w-8 h-8 lg:w-9 lg:h-9 rounded-sm bg-[#110f0d]/88 border border-[#2e2722] hover:border-[#c87a28] flex items-center justify-center text-[#d6cec2] touch-none"
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pausar Jogo [P]"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTogglePause();
                  }}
                  className="w-8 h-8 lg:w-9 lg:h-9 rounded-sm bg-[#110f0d]/88 border border-[#2e2722] hover:border-[#c87a28] flex items-center justify-center text-[#d6cec2] touch-none"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="6" y="4" width="4" height="16" rx="0.5" />
                    <rect x="14" y="4" width="4" height="16" rx="0.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Portrait Sub-Row: Time/Sector Readout + Discreet Orientation Guidance */}
          {!isLandscape && (
            <div className="flex flex-col items-center gap-1">
              <div
                data-testid="hud-top-center"
                className="rounded-sm bg-[#110f0d]/88 border border-[#2e2722] px-2.5 py-0.5 text-[10px] text-[#d6cec2] flex items-center gap-2 shadow whitespace-nowrap"
              >
                <span
                  data-testid="hud-time-of-day"
                  className="font-bold uppercase tracking-wider text-[#fef3c7]"
                >
                  {timeOfDayLabel}
                </span>
                <span aria-hidden="true" className="text-[#4a3e35]">·</span>
                <span className="font-bold uppercase tracking-wider text-[#e09132] truncate max-w-[140px]">
                  {hud.isInsideBuilding && hud.currentBuildingName
                    ? `🏢 ${hud.currentBuildingName}`
                    : hud.districtName}
                </span>
                <span aria-hidden="true" className="text-[#4a3e35]">·</span>
                <span className="font-bold uppercase tracking-wider text-[#52b788] font-mono-tabular">
                  Abrigo {hud.distToExtractionMeters}m
                </span>
              </div>

              <div
                data-testid="portrait-orientation-hint"
                role="status"
                aria-live="polite"
                className="px-2.5 py-1 rounded-sm bg-[#17120e]/92 border border-[#c87a28]/65 text-[10px] font-semibold text-[#fef3c7] flex items-center gap-1.5 shadow-md"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 text-[#e09132] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <path d="M2 12h3M19 12h3" />
                </svg>
                <span>Gire o aparelho para a horizontal para melhor visão tática</span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM PERIMETER: Left Thumb Zone | Center Contextual Interaction | Right-Thumb Tactical Cluster */}
        <div className="flex flex-col gap-1.5 mt-auto">
          {/* In Portrait, show contextual prompt centered above the thumb row so it never collides horizontally */}
          {!isLandscape && (hud.promptActionVerb || hud.isSearchingLoot) && (
            <div className="flex justify-center pointer-events-auto">
              <button
                type="button"
                data-testid="contextual-interact-prompt"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.currentTarget.blur();
                  bridgeRef.current.queuedInteract = true;
                }}
                className={`min-h-[34px] px-3 py-1 rounded-sm font-display text-xs font-bold uppercase tracking-wider shadow-xl border transition-transform active:scale-95 flex items-center gap-1.5 whitespace-nowrap touch-none ${
                  hud.promptType === 'extraction'
                    ? 'bg-[#132a1f]/95 border-[#52b788] text-[#ebe5dc]'
                    : hud.promptType === 'transition'
                    ? 'bg-[#102330]/95 border-[#38bdf8] text-[#e0f2fe]'
                    : hud.isBackpackFull
                    ? 'bg-[#2b1412]/95 border-[#ef4444] text-[#fca5a5]'
                    : 'bg-[#1c1612]/95 border-[#e09132] text-[#fef3c7]'
                }`}
              >
                {hud.isSearchingLoot ? (
                  <span>Vasculhando... {hud.lootSearchProgress}%</span>
                ) : hud.isBackpackFull && hud.promptType === 'loot' ? (
                  <span>Mochila Cheia ({hud.promptLabel})</span>
                ) : (
                  <span>{hud.promptActionVerb}</span>
                )}
              </button>
            </div>
          )}

          <div className="flex items-end justify-between gap-2">
            {/* Bottom-Left Ergonomic Thumb Anchor Hint */}
            <div className="pointer-events-none select-none pl-1 pb-1 flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full border border-[#c87a28]/35 bg-[#110f0d]/55 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#c87a28]/65" />
              </div>
              <div className="text-[9px] text-[#9c9185]/80 uppercase tracking-wider font-mono leading-tight">
                <div>Mover</div>
                <div className="text-[8px] text-[#7a7066]">Polegar Esq.</div>
              </div>
            </div>

            {/* Bottom-Center Contextual Interaction Prompt in Landscape */}
            {isLandscape && (
              <div className="flex flex-col items-center gap-1 min-w-0">
                {(hud.promptActionVerb || hud.isSearchingLoot) && (
                  <div className="pointer-events-auto">
                    <button
                      type="button"
                      data-testid="contextual-interact-prompt"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        bridgeRef.current.queuedInteract = true;
                      }}
                      className={`min-h-[34px] px-3 py-1 rounded-sm font-display text-xs font-bold uppercase tracking-wider shadow-xl border transition-transform active:scale-95 flex items-center gap-1.5 whitespace-nowrap touch-none ${
                        hud.promptType === 'extraction'
                          ? 'bg-[#132a1f]/95 border-[#52b788] text-[#ebe5dc]'
                          : hud.promptType === 'transition'
                          ? 'bg-[#102330]/95 border-[#38bdf8] text-[#e0f2fe]'
                          : hud.isBackpackFull
                          ? 'bg-[#2b1412]/95 border-[#ef4444] text-[#fca5a5]'
                          : 'bg-[#1c1612]/95 border-[#e09132] text-[#fef3c7]'
                      }`}
                    >
                      {hud.isSearchingLoot ? (
                        <span>Vasculhando... {hud.lootSearchProgress}%</span>
                      ) : hud.isBackpackFull && hud.promptType === 'loot' ? (
                        <span>Mochila Cheia ({hud.promptLabel})</span>
                      ) : (
                        <span>
                          {hud.promptActionVerb}{' '}
                          <span className="hidden lg:inline opacity-75">[E]</span>
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom-Right Ergonomic Thumb Cluster:
                In Landscape: Utility Column beside Aim + Fire (saves vertical height)
                In Portrait: Utility Row above Aim + Fire (saves horizontal width) */}
            <div
              data-testid="hud-right-cluster"
              className={`pointer-events-auto flex ${
                isLandscape ? 'flex-row items-end gap-2' : 'flex-col items-end gap-1.5'
              }`}
            >
              {/* Compact Tactical Utility Group */}
              <div
                className={
                  isLandscape
                    ? 'flex flex-col items-stretch gap-1 pb-0.5'
                    : 'flex flex-row items-center gap-1'
                }
              >
                {/* Flashlight Toggle Button (ON / OFF reliable toggle) */}
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-flashlight-toggle"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    bridgeRef.current.queuedToggleFlashlight = true;
                  }}
                  className={`min-h-[32px] px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap flex items-center justify-between gap-1.5 touch-none ${
                    hud.flashlightEnabled && hud.flashlightBattery > 0
                      ? 'bg-[#2b2416]/95 border-[#f59e0b] text-[#fef3c7] shadow-md'
                      : 'bg-[#12100e]/88 border-[#2e2722] text-[#8c8277]'
                  }`}
                >
                  <span>🔦 {hud.flashlightEnabled && hud.flashlightBattery > 0 ? 'ON' : 'OFF'}</span>
                  <span
                    className={`font-mono text-[9px] ${
                      hud.flashlightBattery < 20 ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                    }`}
                  >
                    {hud.flashlightBattery}%
                  </span>
                </button>

                {/* Contextual Search / Extract / Transit Button */}
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-interact-btn"
                  disabled={!hud.promptLabel && !hud.isSearchingLoot}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    bridgeRef.current.queuedInteract = true;
                  }}
                  className={`min-h-[32px] px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap touch-none ${
                    hud.promptLabel || hud.isSearchingLoot
                      ? hud.promptType === 'extraction'
                        ? 'bg-[#193326]/95 border-[#52b788] text-[#ebe5dc]'
                        : hud.promptType === 'transition'
                        ? 'bg-[#102330]/95 border-[#38bdf8] text-[#e0f2fe]'
                        : 'bg-[#261d14]/95 border-[#e09132] text-[#fef3c7]'
                      : 'bg-[#12100e]/65 border-[#241f1b] text-[#6e655c] opacity-60'
                  }`}
                >
                  {hud.promptType === 'extraction'
                    ? '🚪 Extrair'
                    : hud.promptType === 'transition'
                    ? '🛣️ Avançar'
                    : hud.isSearchingLoot
                    ? `🔍 ${hud.lootSearchProgress}%`
                    : '🔍 Vasculhar'}
                </button>

                {/* Medical Bandaging Button */}
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-heal-btn"
                  disabled={hud.lootMedicamentos <= 0 || (hud.hp >= hud.maxHp && !hud.isHealing)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    bridgeRef.current.queuedHeal = true;
                  }}
                  className={`min-h-[32px] px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors flex items-center justify-between gap-1 touch-none ${
                    hud.isHealing
                      ? 'bg-[#132a1f]/95 border-[#10b981] text-[#10b981]'
                      : 'bg-[#1c1210]/88 hover:bg-[#291815] disabled:opacity-45 border-[#54221c] text-[#ebe5dc]'
                  }`}
                >
                  {hud.isHealing ? (
                    <span>🩹 {Math.round((hud.healingProgress / hud.healingDuration) * 100)}%</span>
                  ) : (
                    <span>🩹 Curar ({hud.lootMedicamentos})</span>
                  )}
                </button>
              </div>

              {/* Aim + Fire Controls Row */}
              <div className="flex items-end gap-2">

            {/* Dedicated Directional Aim Control (ONLY control that updates aimAngle) */}
            <div className="flex flex-col items-center gap-0.5">
              <div
                ref={aimStickRef}
                role="group"
                tabIndex={-1}
                data-testid="hud-aim-stick"
                aria-label="Controle Exclusivo de Mira Direcional"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore synthetic events without active pointerId
                  }
                  aimPointerIdRef.current = e.pointerId;
                  updateAimStick(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (aimPointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    updateAimStick(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={(e) => {
                  if (aimPointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    releaseAimStick();
                  }
                }}
                onPointerCancel={(e) => {
                  if (aimPointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    releaseAimStick();
                  }
                }}
                onLostPointerCapture={(e) => {
                  if (aimPointerIdRef.current === e.pointerId) {
                    releaseAimStick();
                  }
                }}
                className="w-[74px] h-[74px] sm:w-[84px] sm:h-[84px] rounded-full bg-[#121619]/85 border border-[#38bdf8]/60 flex items-center justify-center touch-none relative shadow-lg"
              >
                <div className="w-full h-[1px] bg-[#38bdf8]/25 absolute pointer-events-none" />
                <div className="h-full w-[1px] bg-[#38bdf8]/25 absolute pointer-events-none" />
                {/* Locked Aim Direction Indicator Ring */}
                <div
                  style={{
                    transform: `rotate(${((aimLockedAngle * 180) / Math.PI).toFixed(1)}deg)`,
                  }}
                  className="w-full h-full absolute pointer-events-none flex items-center justify-end pr-1"
                >
                  <div className="w-2 h-2 rounded-full bg-[#38bdf8] shadow" />
                </div>
                <div
                  ref={aimKnobRef}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#162736]/95 border border-[#38bdf8] shadow-md pointer-events-none flex items-center justify-center text-[8px] font-bold uppercase tracking-wider text-[#e0f2fe]"
                >
                  Mirar
                </div>
              </div>
              <span className="text-[8px] text-[#93c5fd]/85 font-bold uppercase tracking-wider leading-none">
                Mira 360°
              </span>
            </div>

            {/* Dedicated Right-Side Fire / Attack Button (NEVER changes, recalculates, or resets aim direction) */}
            <div className="flex flex-col items-center gap-0.5">
              <div
                role="button"
                tabIndex={-1}
                data-testid="hud-aim-attack-stick"
                data-fire-btn="true"
                aria-label="Botão de Disparo e Ataque"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore synthetic events without active pointerId
                  }
                  firePointerIdRef.current = e.pointerId;
                  setIsFireHeld(true);
                  // Only trigger attack in the already-established aim direction!
                  bridgeRef.current.queuedAttack = true;
                  bridgeRef.current.attackHeld = true;
                }}
                onPointerMove={(e) => {
                  if (firePointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    // Maintain continuous fire without touching aimAngle
                    bridgeRef.current.attackHeld = true;
                  }
                }}
                onPointerUp={(e) => {
                  if (firePointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    releaseFireButton();
                  }
                }}
                onPointerCancel={(e) => {
                  if (firePointerIdRef.current === e.pointerId) {
                    e.stopPropagation();
                    releaseFireButton();
                  }
                }}
                onLostPointerCapture={(e) => {
                  if (firePointerIdRef.current === e.pointerId) {
                    releaseFireButton();
                  }
                }}
                className={`w-[74px] h-[74px] sm:w-[84px] sm:h-[84px] rounded-full bg-[#171110]/88 border-2 flex items-center justify-center touch-none relative transition-transform ${
                  isFireHeld ? 'scale-95' : ''
                } ${
                  hud.weapon === 'facao' ? 'border-[#d9822b]' : 'border-[#c94a38]'
                }`}
              >
                <div
                  className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full shadow-md pointer-events-none flex items-center justify-center text-[9px] font-bold uppercase tracking-wider text-[#ebe5dc] border ${
                    hud.weapon === 'facao'
                      ? 'bg-[#6b3c14]/95 border-[#e09132]'
                      : 'bg-[#6e1d16]/95 border-[#ef4444]'
                  }`}
                >
                  {hud.weapon === 'facao' ? 'Golpear' : 'Atirar'}
                </div>
              </div>
              <span className="text-[8px] text-[#b8afa4]/85 font-bold uppercase tracking-wider leading-none">
                {hud.weapon === 'facao' ? 'Golpe' : 'Disparo'}
              </span>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


