import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyExtractionToStash,
  calculateDeathLootPenalty,
  createInitialPersistentStash,
  createInitialWorldState,
} from './action/actionRules.ts';
import type {
  ActionWorldState,
  DistrictId,
  PersistentShelterStash,
} from './action/actionTypes.ts';
import { PhaserArena } from './components/PhaserArena.tsx';
import { ResourceIconSvg, TitleEmblemSvg } from './components/SvgArt.tsx';
import { TitleScreen } from './screens/TitleScreen.tsx';
import {
  loadActionStash,
  resetActionStash,
  saveActionStash,
} from './storage/actionStorage.ts';
import { soundFX } from './utils/sound.ts';

type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const [stash, setStash] = useState<PersistentShelterStash>(() =>
    createInitialPersistentStash()
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const [shellState, setShellState] = useState<ShellState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [isMuted, setIsMuted] = useState(false);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [runKey, setRunKey] = useState(1);
  const worldStateRef = useRef<ActionWorldState>(createInitialWorldState());
  const [endSnapshot, setEndSnapshot] = useState<ActionWorldState | null>(null);

  useEffect(() => {
    let mounted = true;
    loadActionStash().then((loaded) => {
      if (!mounted) return;
      setStash(loaded);
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
  }, [shellState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        const nextMuted = soundFX.toggleMute();
        setIsMuted(nextMuted);
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        setShellState((prev) => {
          if (prev === 'playing') return 'paused';
          if (prev === 'paused') return 'playing';
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startNewRun = useCallback(
    (districtId: DistrictId = 'vila_esperanca') => {
      soundFX.playClick();
      const freshWorld = createInitialWorldState(undefined, districtId, stash);
      worldStateRef.current = freshWorld;
      setEndSnapshot(null);
      setRunKey((prev) => prev + 1);
      setShellState('playing');
    },
    [stash]
  );

  const handleUpdateStash = useCallback((nextStash: PersistentShelterStash) => {
    setStash(nextStash);
    saveActionStash(nextStash).catch(() => {});
  }, []);

  const handleResetStash = useCallback(() => {
    soundFX.playDanger();
    resetActionStash().then((fresh) => {
      setStash(fresh);
    });
  }, []);

  const handleRunFinished = useCallback((finalWorld: ActionWorldState) => {
    if (finalWorld.extractionProcessed) return;
    finalWorld.extractionProcessed = true;

    if (finalWorld.status === 'extracted') {
      soundFX.playSuccess();
    } else {
      soundFX.playDanger();
    }

    setEndSnapshot({
      ...finalWorld,
      runLoot: { ...finalWorld.runLoot },
    });

    setStash((prevStash) => {
      const updated = applyExtractionToStash(prevStash, finalWorld);
      saveActionStash(updated).catch(() => {});
      return updated;
    });

    setShellState('gameover');
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0d0c0a] text-[#ebe5dc] flex items-center justify-center p-6">
        <div className="font-display text-xl uppercase tracking-widest text-[#c87a28]">
          Carregando Setor Vila Esperança...
        </div>
      </div>
    );
  }

  if (shellState === 'title') {
    return (
      <TitleScreen
        stash={stash}
        onStartGame={startNewRun}
        onResetStash={handleResetStash}
        onUpdateStash={handleUpdateStash}
      />
    );
  }

  const isVictory = endSnapshot?.status === 'extracted';

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#0d0c0a]">
      <PhaserArena
        key={runKey}
        worldStateRef={worldStateRef}
        isPaused={shellState !== 'playing'}
        isMuted={isMuted}
        reducedEffects={reducedEffects}
        onToggleMute={() => {
          const next = soundFX.toggleMute();
          setIsMuted(next);
        }}
        onToggleReducedEffects={() => setReducedEffects((prev) => !prev)}
        onTogglePause={() =>
          setShellState((prev) => (prev === 'playing' ? 'paused' : 'playing'))
        }
        onRunFinished={handleRunFinished}
      />

      {/* PAUSE MODAL */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-md landscape:max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-sm bg-[#14110f] border border-[#332a24] p-4 sm:p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#241f1b] pb-2.5">
              <TitleEmblemSvg className="w-10 h-10 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#c87a28]">
                  Operação Suspensa
                </p>
                <h2
                  id="pause-modal-title"
                  className="font-display text-xl sm:text-2xl font-bold text-[#ebe5dc] uppercase leading-tight"
                >
                  {worldStateRef.current.districtName || 'Setor Vila Esperança'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Saúde</div>
                <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#ebe5dc]">
                  {Math.round(worldStateRef.current.player.hp)} PV
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Abates</div>
                <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#c87a28]">
                  {worldStateRef.current.zombiesKilled}
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Extrações</div>
                <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#52b788]">
                  {stash.runsExtracted}
                </div>
              </div>
            </div>

            {/* Comfort & Audio Options */}
            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5 space-y-1.5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#8c8277]">
                Opções de Conforto Visual e Áudio
              </div>
              <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setReducedEffects((prev) => !prev)}
                  className="min-h-[38px] px-2.5 py-1 rounded-sm bg-[#161311] hover:bg-[#1f1b18] border border-[#2e2722] flex items-center justify-between gap-2 text-[11px] text-[#d6cec2]"
                >
                  <span className="truncate">Reduzir Tremor e Clarões</span>
                  <span
                    className={`font-mono-tabular font-bold uppercase shrink-0 ${
                      reducedEffects ? 'text-[#52b788]' : 'text-[#8c8277]'
                    }`}
                  >
                    {reducedEffects ? 'Ativado' : 'Padrão'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = soundFX.toggleMute();
                    setIsMuted(next);
                  }}
                  className="min-h-[38px] px-2.5 py-1 rounded-sm bg-[#161311] hover:bg-[#1f1b18] border border-[#2e2722] flex items-center justify-between gap-2 text-[11px] text-[#d6cec2]"
                >
                  <span className="truncate">Áudio de Combate [M]</span>
                  <span
                    className={`font-mono-tabular font-bold uppercase shrink-0 ${
                      !isMuted ? 'text-[#52b788]' : 'text-[#c94a38]'
                    }`}
                  >
                    {isMuted ? 'Silenciado' : 'Ativo'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col landscape:flex-row sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="min-h-[42px] flex-1 px-4 rounded-sm bg-[#b86f24] hover:bg-[#c87a28] text-[#0d0c0a] font-display text-sm sm:text-base font-bold uppercase tracking-wider whitespace-nowrap"
              >
                Retomar Incursão
              </button>
              <button
                type="button"
                onClick={() => startNewRun()}
                className="min-h-[42px] px-4 rounded-sm bg-[#241a17] hover:bg-[#30221e] text-[#ebe5dc] border border-[#422f29] text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              >
                Reiniciar Incursão
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="min-h-[42px] px-4 rounded-sm bg-[#161311] hover:bg-[#1f1b18] text-[#b8afa4] border border-[#29221d] text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              >
                Recuar ao Abrigo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTCOME MODAL: EXTRACTION VICTORY OR COMBAT DEFEAT WITH 50% RECOVERY */}
      {shellState === 'gameover' && endSnapshot && (() => {
        const deathPenalty = calculateDeathLootPenalty(endSnapshot.runLoot);
        const completedObjectivesCount = (endSnapshot.objectives ?? []).filter((o) => o.completed).length;
        const visitedSectorsCount = (endSnapshot.visitedDistricts ?? [endSnapshot.districtId]).length;

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="outcome-modal-title"
            className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <div
              className={`w-full max-w-md landscape:max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-sm p-4 sm:p-5 space-y-3.5 shadow-2xl border ${
                isVictory
                  ? 'bg-[#121a15] border-[#3e6b4e]'
                  : 'bg-[#1a1110] border-[#8f241b]'
              }`}
            >
              <div className="space-y-1 border-b border-[#26201b] pb-2.5">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    isVictory ? 'text-[#52b788]' : 'text-[#c94a38]'
                  }`}
                >
                  {isVictory
                    ? 'Extração Concluída · Suprimentos Salvos'
                    : 'Baixa na Cidade · Penalidade Parcial (50%)'}
                </p>
                <h2
                  id="outcome-modal-title"
                  className="font-display text-xl sm:text-2xl font-bold text-[#ebe5dc] uppercase leading-tight"
                >
                  {isVictory
                    ? `Rota de Extração Concluída (${endSnapshot.districtName})`
                    : `Abatido em ${endSnapshot.districtName}`}
                </h2>
                <p className="text-[11px] text-[#b8afa4] leading-relaxed">
                  {isVictory
                    ? 'Você alcançou o ponto de extração com vida. Todo o saque temporário da mochila foi salvo no estoque permanente da Zona Segura.'
                    : 'Você caiu antes da extração: 50% do saque temporário coletado nesta incursão foi perdido na queda e 50% foi recuperado para a Zona Segura. Seu estoque permanente anterior foi integralmente preservado.'}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                  <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Abates</div>
                  <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#ebe5dc]">
                    {endSnapshot.zombiesKilled}
                  </div>
                </div>
                <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                  <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Setores</div>
                  <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#38bdf8]">
                    {visitedSectorsCount}/3
                  </div>
                </div>
                <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                  <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Objetivos</div>
                  <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#c87a28]">
                    {completedObjectivesCount}
                  </div>
                </div>
                <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2">
                  <div className="text-[9px] uppercase tracking-wider text-[#8c8277]">Extrações</div>
                  <div className="font-mono-tabular text-base sm:text-lg font-bold text-[#52b788]">
                    {stash.runsExtracted}
                  </div>
                </div>
              </div>

              {isVictory ? (
                <div
                  data-testid="outcome-loot-summary"
                  className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-3 space-y-2"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#52b788]">
                    Saque Extraído (e Estoque Final na Zona Segura):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono-tabular">
                    {(
                      [
                        { key: 'comida', label: 'Comida' },
                        { key: 'medicamentos', label: 'Remédios' },
                        { key: 'municao', label: 'Munição' },
                        { key: 'materiais', label: 'Materiais' },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-1.5 bg-[#14110f] px-2.5 py-1.5 rounded-sm border border-[#211c18]"
                      >
                        <span className="inline-flex items-center gap-1 text-[#b8afa4] text-[11px]">
                          <ResourceIconSvg type={item.key} className="w-3.5 h-3.5 shrink-0" />
                          {item.label}
                        </span>
                        <span className="font-bold text-[#ebe5dc] whitespace-nowrap text-[11px]">
                          +{endSnapshot.runLoot[item.key]} ({stash.totalStash[item.key]})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  data-testid="outcome-death-penalty-breakdown"
                  className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-[#c94a38]">Balanço da Queda (Perda 50% · Recuperação 50%)</span>
                    <span className="text-[#8c8277]">Estoque Permanente Preservado</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono-tabular">
                    {(
                      [
                        { key: 'comida', label: 'Comida' },
                        { key: 'medicamentos', label: 'Remédios' },
                        { key: 'municao', label: 'Munição' },
                        { key: 'materiais', label: 'Materiais' },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.key}
                        data-testid={`penalty-row-${item.key}`}
                        className="flex items-center justify-between gap-2 bg-[#14110f] px-2.5 py-1.5 rounded-sm border border-[#211c18]"
                      >
                        <span className="inline-flex items-center gap-1.5 text-[#d6cec2] font-sans font-semibold">
                          <ResourceIconSvg type={item.key} className="w-3.5 h-3.5 shrink-0" />
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-[#ef4444]" title="Perdido na incursão">
                            -{deathPenalty.lost[item.key]} perd.
                          </span>
                          <span className="text-[#52b788]" title="Recuperado para a Zona Segura">
                            +{deathPenalty.recovered[item.key]} rec.
                          </span>
                          <span className="font-bold text-[#ebe5dc]" title="Estoque Permanente Final">
                            Total: {stash.totalStash[item.key]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col landscape:flex-row sm:flex-row gap-2">
                <button
                  type="button"
                  data-start="true"
                  data-testid="outcome-retry-btn"
                  onClick={() => startNewRun(endSnapshot.districtId)}
                  className="min-h-[44px] flex-1 rounded-sm bg-[#8f241b] hover:bg-[#a82c21] border border-[#b93829] text-[#ebe5dc] font-display text-sm sm:text-base font-bold uppercase tracking-wider"
                >
                  {isVictory ? 'Nova Incursão' : 'Tentar Novamente'}
                </button>
                <button
                  type="button"
                  data-testid="outcome-return-hub-btn"
                  onClick={() => setShellState('title')}
                  className="min-h-[44px] px-5 rounded-sm bg-[#161311] hover:bg-[#211c19] text-[#d6cec2] border border-[#2e2722] text-xs font-bold uppercase tracking-wider"
                >
                  Zona Segura (Mapa & Equipamento)
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
