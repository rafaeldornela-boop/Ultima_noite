import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { buildMinimapSnapshot } from '../action/actionRules.ts';
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
  zombiesKilled: number;
  zombiesRemaining: number;
  promptLabel: string | null;
  promptType: 'loot' | 'extraction' | null;
  banner: string;
  distToExtractionMeters: number;
  angleToExtractionRad: number;
  minimap: MinimapSnapshot;
}

function buildHudReadout(w: ActionWorldState): HudReadout {
  const minimap = buildMinimapSnapshot(w, 128, 96);

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
    zombiesKilled: w.zombiesKilled,
    zombiesRemaining: w.zombies.filter((z) => !z.dead).length,
    promptLabel: w.activePrompt ? w.activePrompt.label : null,
    promptType: w.activePrompt ? w.activePrompt.targetType : null,
    banner: w.lastEventBanner,
    distToExtractionMeters: minimap.extraction.distanceMeters,
    angleToExtractionRad: minimap.extraction.bearingRad,
    minimap,
  };
}

export function PhaserArena({
  worldStateRef,
  isPaused,
  isMuted,
  reducedEffects,
  onToggleMute,
  onToggleReducedEffects,
  onTogglePause,
  onRunFinished,
}: PhaserArenaProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const bridgeRef = useRef<ExternalControlBridge>(createExternalControlBridge());
  const isPausedRef = useRef(isPaused);
  const onRunFinishedRef = useRef(onRunFinished);

  isPausedRef.current = isPaused;
  onRunFinishedRef.current = onRunFinished;
  bridgeRef.current.reducedEffects = reducedEffects;

  const [hud, setHud] = useState<HudReadout>(() =>
    buildHudReadout(worldStateRef.current)
  );

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

  // Right virtual aim/attack pad visual state
  const rightStickRef = useRef<HTMLDivElement | null>(null);
  const rightKnobRef = useRef<HTMLDivElement | null>(null);
  const rightPointerIdRef = useRef<number | null>(null);

  const handleHudSync = useCallback((w: ActionWorldState) => {
    (window as unknown as { __ULTIMO_DIA_WORLD__?: ActionWorldState }).__ULTIMO_DIA_WORLD__ = w;
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

    (window as unknown as { __ULTIMO_DIA_WORLD__?: ActionWorldState }).__ULTIMO_DIA_WORLD__ =
      worldStateRef.current;

    return () => {
      game.destroy(true);
    };
  }, [handleHudSync, worldStateRef]);

  // Floating Touch Joystick handlers (left 50% of the screen)
  const maxJoyRadius = 52;

  const onLeftZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only capture if not clicking an interactive button/element and left pointer not already active
    if (leftPointerIdRef.current !== null) return;
    if ((e.target as HTMLElement).closest('button, [role="button"], [role="group"]')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    leftPointerIdRef.current = e.pointerId;

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

    setFloatingJoy((prev) => {
      if (!prev.visible) return prev;
      const dx = e.clientX - prev.startX;
      const dy = e.clientY - prev.startY;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxJoyRadius);
      const angle = Math.atan2(dy, dx);

      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;

      const nx = maxJoyRadius > 0 ? kx / maxJoyRadius : 0;
      const ny = maxJoyRadius > 0 ? ky / maxJoyRadius : 0;

      bridgeRef.current.joyMoveX = nx;
      bridgeRef.current.joyMoveY = ny;
      bridgeRef.current.sprintHeld = clampedDist > maxJoyRadius * 0.88;

      return {
        ...prev,
        knobX: kx,
        knobY: ky,
      };
    });
  };

  const onLeftZonePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerIdRef.current === e.pointerId) {
      leftPointerIdRef.current = null;
      bridgeRef.current.joyMoveX = 0;
      bridgeRef.current.joyMoveY = 0;
      bridgeRef.current.sprintHeld = false;
      setFloatingJoy((prev) => ({ ...prev, visible: false }));
    }
  };

  // Right Touch Aim & Attack Stick handlers
  const updateRightStick = (clientX: number, clientY: number) => {
    const el = rightStickRef.current;
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

    if (dist > 8) {
      bridgeRef.current.aimAngle = angle;
    }
    bridgeRef.current.attackHeld = true;

    if (rightKnobRef.current) {
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      rightKnobRef.current.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0)`;
    }
  };

  const resetRightStick = () => {
    rightPointerIdRef.current = null;
    bridgeRef.current.attackHeld = false;
    bridgeRef.current.aimAngle = null;
    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  };

  const hpPercent = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const staminaPercent = Math.max(
    0,
    Math.min(100, (hud.stamina / hud.maxStamina) * 100)
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0c0a] select-none">
      {/* Isolated Phaser Canvas Mount */}
      <div
        ref={mountRef}
        data-testid="phaser-arena-canvas"
        className="w-full h-full"
      />

      {/* Seamless Darkwood-inspired Peripheral Darkness Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_26%,rgba(8,7,6,0.42)_62%,rgba(5,4,4,0.84)_100%)]"
      />

      {/* Critical Low HP Peripheral Vignette (respects reducedEffects comfort mode) */}
      {hud.hp <= 30 && !reducedEffects && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 border-[6px] border-[#8f241b]/45"
        />
      )}

      {/* Full-Viewport Utilitarian Survival HUD Wrapper */}
      <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-2 sm:p-3.5">
        {/* TOP PERIMETER BAR: Left Vitals & Weapon | Center Status | Right Loot, Minimap & Controls */}
        <div className="flex items-start justify-between gap-2">
          {/* Top-Left Cluster: Utilitarian Field Vitals & Equipped Weapon */}
          <div className="pointer-events-auto rounded-sm bg-[#110f0d]/92 border border-[#2e2722] p-2 sm:p-2.5 w-44 sm:w-56 space-y-1.5 shadow-xl">
            {/* HP Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-widest text-[#b8afa4]">
                  Integridade
                </span>
                <span className="font-mono-tabular font-bold text-[#ebe5dc]">
                  {hud.hp}/{hud.maxHp} PV
                </span>
              </div>
              <div className="h-2 w-full bg-[#090807] border border-[#241f1b] overflow-hidden">
                <div
                  className={`h-full transition-transform duration-100 origin-left ${
                    hud.hp <= 30
                      ? 'bg-[#9e2a22]'
                      : hud.hp <= 60
                      ? 'bg-[#b86f24]'
                      : 'bg-[#3e6b4e]'
                  }`}
                  style={{ transform: `scaleX(${hpPercent / 100})` }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[9px]">
                <span className="uppercase tracking-widest text-[#8c8277]">
                  Fôlego
                </span>
                <span className="font-mono-tabular text-[#b8afa4]">
                  {hud.stamina}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#090807] border border-[#1f1a17] overflow-hidden">
                <div
                  className="h-full bg-[#b8732a] transition-transform duration-75 origin-left"
                  style={{ transform: `scaleX(${staminaPercent / 100})` }}
                />
              </div>
            </div>

            {/* Equipped Weapon & Ammo Readout */}
            <div className="pt-1.5 border-t border-[#241f1b] flex items-center justify-between gap-1.5">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-widest text-[#c87a28] font-bold truncate">
                  {hud.weapon === 'pistola' ? 'Pistola 9mm' : 'Facão Tático'}
                </div>
                <div className="font-mono-tabular text-xs sm:text-sm font-bold text-[#ebe5dc]">
                  {hud.weapon === 'pistola' ? (
                    hud.isReloading ? (
                      <span className="text-[#c87a28] text-[10px]">RECARREGANDO...</span>
                    ) : (
                      <span className={hud.ammoInClip === 0 ? 'text-[#c94a38]' : ''}>
                        {hud.ammoInClip}
                        <span className="text-[11px] text-[#8c8277]">
                          /{hud.ammoReserve}
                        </span>
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-[#9e9185]">Lâmina Curta</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  bridgeRef.current.queuedSwitchWeapon = true;
                }}
                className="min-h-[36px] px-2 py-1 rounded-sm bg-[#1c1815] hover:bg-[#29231e] border border-[#382f28] text-[10px] font-bold uppercase tracking-wider text-[#ebe5dc] whitespace-nowrap shrink-0"
              >
                Arma<span className="hidden sm:inline"> [Q]</span>
              </button>
            </div>
          </div>

          {/* Top-Center Cluster: Field Radio / Status Feed (Desktop) */}
          <div className="hidden md:flex flex-col items-center gap-1 max-w-md text-center">
            <div className="rounded-sm bg-[#110f0d]/90 border border-[#2e2722] px-3 py-1 text-[11px] text-[#d6cec2] flex items-center gap-2.5 shadow">
              <span className="font-bold uppercase tracking-wider text-[#52b788]">
                Portão SO: {hud.distToExtractionMeters}m
              </span>
              <span aria-hidden="true" className="text-[#4a3e35]">|</span>
              <span className="font-mono-tabular text-[#b8afa4]">
                Abates: {hud.zombiesKilled}
              </span>
              <span aria-hidden="true" className="text-[#4a3e35]">|</span>
              <span className="font-mono-tabular text-[#8c8277]">
                Hostis: {hud.zombiesRemaining}
              </span>
            </div>
            <div className="text-[11px] text-[#b8afa4] bg-[#0d0b09]/85 px-2.5 py-0.5 rounded-sm border border-[#211c18]">
              {hud.banner}
            </div>
          </div>

          {/* Top-Right Cluster: Backpack Loot & Controls */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5">
            <div className="flex items-start gap-1.5">
              <div
                className="rounded-sm bg-[#110f0d]/92 border border-[#2e2722] px-2.5 py-1.5 shadow-xl"
                aria-label="Saque coletado na incursão"
              >
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#8c8277] mb-1 whitespace-nowrap">
                  Mochila · {hud.distToExtractionMeters}m
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1">
                    <ResourceIconSvg type="comida" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                      {hud.lootComida}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ResourceIconSvg type="medicamentos" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                      {hud.lootMedicamentos}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ResourceIconSvg type="municao" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                      {hud.lootMunicao}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ResourceIconSvg type="materiais" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                      {hud.lootMateriais}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-1">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isMuted ? 'Ativar som [M]' : 'Silenciar som [M]'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMute();
                  }}
                  className="w-9 h-9 rounded-sm bg-[#110f0d]/92 border border-[#2e2722] hover:border-[#c87a28] flex items-center justify-center text-[#d6cec2]"
                >
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pausar Jogo [P]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTogglePause();
                  }}
                  className="w-9 h-9 rounded-sm bg-[#110f0d]/92 border border-[#2e2722] hover:border-[#c87a28] flex items-center justify-center text-[#d6cec2]"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="6" y="4" width="4" height="16" rx="0.5" />
                    <rect x="14" y="4" width="4" height="16" rx="0.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PERIMETER TOUCH & TACTICAL ACTION CONTROLS */}
        <div className="flex flex-col gap-1.5 pb-0.5 mt-auto">
          {/* Contextual Interaction Banner anchored above the bottom bar (keeps center playfield clear) */}
          {hud.promptLabel && (
            <div className="pointer-events-auto self-center">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  bridgeRef.current.queuedInteract = true;
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-sm font-display text-xs font-bold uppercase tracking-widest shadow-xl border transition-transform active:scale-95 ${
                  hud.promptType === 'extraction'
                    ? 'bg-[#132a1f]/95 border-[#52b788] text-[#ebe5dc]'
                    : 'bg-[#1c1612]/95 border-[#c87a28] text-[#ebe5dc]'
                }`}
              >
                [E] {hud.promptLabel}
              </button>
            </div>
          )}

          {/* Discreet Utilitarian Tactical Action Strip (Dodge button removed per specification) */}
          <div className="pointer-events-auto flex items-center justify-end gap-1.5 w-full sm:w-auto sm:self-end">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                bridgeRef.current.queuedInteract = true;
              }}
              className={`min-h-[42px] px-3 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
                hud.promptLabel
                  ? 'bg-[#193326]/90 border-[#52b788] text-[#ebe5dc]'
                  : 'bg-[#12100e]/82 border-[#2e2722] text-[#9e9185]'
              }`}
            >
              {hud.promptType === 'extraction' ? 'Extrair' : 'Saquear'}
              <span className="hidden sm:inline"> [E]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              disabled={hud.lootMedicamentos <= 0 || hud.hp >= hud.maxHp}
              onClick={(e) => {
                e.currentTarget.blur();
                bridgeRef.current.queuedHeal = true;
              }}
              className="min-h-[42px] px-3 py-1 rounded-sm bg-[#1c1210]/85 hover:bg-[#291815] disabled:opacity-40 border border-[#54221c] text-[11px] font-bold uppercase tracking-wider text-[#ebe5dc] whitespace-nowrap"
            >
              Curar ({hud.lootMedicamentos})
              <span className="hidden sm:inline"> [H]</span>
            </button>
          </div>

          {/* Dual Thumbsticks Row: Left side has floating touch zone; Right side has Directional Aim & Fire button */}
          <div className="flex items-end justify-between gap-2">
            {/* Left movement guidance text hint (minimal, non-intrusive) */}
            <div className="pointer-events-none select-none pl-2 pb-2 text-[10px] text-[#7a7066]/70 uppercase tracking-widest font-mono">
              Toque e arraste para mover
            </div>

            {/* Bottom-Right: Combined Directional Aim & Fire Stick */}
            <div className="pointer-events-auto flex flex-col items-center gap-0.5">
              <div
                ref={rightStickRef}
                role="button"
                tabIndex={-1}
                aria-label="Controle de Mira, Disparo e Recarga"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  rightPointerIdRef.current = e.pointerId;
                  bridgeRef.current.queuedAttack = true;
                  updateRightStick(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (rightPointerIdRef.current === e.pointerId) {
                    updateRightStick(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={(e) => {
                  if (rightPointerIdRef.current === e.pointerId) {
                    resetRightStick();
                  }
                }}
                onPointerCancel={(e) => {
                  if (rightPointerIdRef.current === e.pointerId) {
                    resetRightStick();
                  }
                }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#171110]/60 border border-[#54221c] flex items-center justify-center touch-none relative"
              >
                <div className="w-full h-[1px] bg-[#3d1c18]/60 absolute pointer-events-none" />
                <div className="h-full w-[1px] bg-[#3d1c18]/60 absolute pointer-events-none" />
                <div
                  ref={rightKnobRef}
                  className="w-10 h-10 rounded-full bg-[#6e1d16]/90 border border-[#c94a38] shadow-md pointer-events-none flex items-center justify-center text-[9px] font-bold uppercase tracking-wider text-[#ebe5dc]"
                >
                  Atirar
                </div>
              </div>
              <span className="text-[9px] text-[#9e473c] font-bold uppercase tracking-widest">
                Disparo / Recarga
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING JOYSTICK TOUCH SURFACE (Covers the left 50% of the screen) */}
      <div
        data-testid="floating-joystick-touchzone"
        onPointerDown={onLeftZonePointerDown}
        onPointerMove={onLeftZonePointerMove}
        onPointerUp={onLeftZonePointerUp}
        onPointerCancel={onLeftZonePointerUp}
        className="fixed inset-y-0 left-0 w-1/2 z-20 touch-none"
        style={{ pointerEvents: floatingJoy.visible ? 'auto' : 'auto' }}
      >
        {/* Floating Joystick Base and Knob (Only visible when touching) */}
        {floatingJoy.visible && (
          <div
            style={{
              left: floatingJoy.startX,
              top: floatingJoy.startY,
              transform: 'translate(-50%, -50%)',
            }}
            className="pointer-events-none absolute w-28 h-28 rounded-full bg-[#110f0d]/65 border border-[#c87a28]/60 flex items-center justify-center shadow-2xl"
          >
            {/* Crosshairs */}
            <div className="w-full h-[1px] bg-[#c87a28]/35 absolute" />
            <div className="h-full w-[1px] bg-[#c87a28]/35 absolute" />

            {/* Floating Knob */}
            <div
              style={{
                transform: `translate3d(${floatingJoy.knobX.toFixed(1)}px, ${floatingJoy.knobY.toFixed(1)}px, 0)`,
              }}
              className="w-11 h-11 rounded-full bg-[#2b241d]/95 border border-[#e09132] shadow-lg flex items-center justify-center"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#e09132]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
