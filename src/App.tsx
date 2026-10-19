import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyExtractionToStash,
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
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0c0a]">
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
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-sm bg-[#14110f] border border-[#332a24] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#241f1b] pb-3">
              <TitleEmblemSvg className="w-11 h-11 shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c87a28]">
                  Operação Suspensa
                </p>
                <h2
                  id="pause-modal-title"
                  className="font-display text-2xl font-bold text-[#ebe5dc] uppercase"
                >
                  Setor Vila Esperança
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#8c8277]">Saúde</div>
                <div className="font-mono-tabular text-lg font-bold text-[#ebe5dc]">
                  {Math.round(worldStateRef.current.player.hp)} PV
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#8c8277]">Abates</div>
                <div className="font-mono-tabular text-lg font-bold text-[#c87a28]">
                  {worldStateRef.current.zombiesKilled}
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#8c8277]">Extrações</div>
                <div className="font-mono-tabular text-lg font-bold text-[#52b788]">
                  {stash.runsExtracted}
                </div>
              </div>
            </div>

            {/* Comfort & Audio Options */}
            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8c8277]">
                Opções de Conforto Visual e Áudio
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setReducedEffects((prev) => !prev)}
                  className="min-h-[40px] px-3 py-1.5 rounded-sm bg-[#161311] hover:bg-[#1f1b18] border border-[#2e2722] flex items-center justify-between text-xs text-[#d6cec2]"
                >
                  <span>Reduzir Tremor de Câmera e Clarões</span>
                  <span
                    className={`font-mono-tabular font-bold uppercase ${
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
                  className="min-h-[40px] px-3 py-1.5 rounded-sm bg-[#161311] hover:bg-[#1f1b18] border border-[#2e2722] flex items-center justify-between text-xs text-[#d6cec2]"
                >
                  <span>Áudio de Combate e Ambiente [M]</span>
                  <span
                    className={`font-mono-tabular font-bold uppercase ${
                      !isMuted ? 'text-[#52b788]' : 'text-[#c94a38]'
                    }`}
                  >
                    {isMuted ? 'Silenciado' : 'Ativo'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="min-h-[46px] w-full rounded-sm bg-[#b86f24] hover:bg-[#c87a28] text-[#0d0c0a] font-display text-base font-bold uppercase tracking-wider"
              >
                Retomar Incursão
              </button>
              <button
                type="button"
                onClick={() => startNewRun()}
                className="min-h-[46px] w-full rounded-sm bg-[#241a17] hover:bg-[#30221e] text-[#ebe5dc] border border-[#422f29] text-xs font-bold uppercase tracking-wider"
              >
                Reiniciar Incursão
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="min-h-[46px] w-full rounded-sm bg-[#161311] hover:bg-[#1f1b18] text-[#b8afa4] border border-[#29221d] text-xs font-bold uppercase tracking-wider"
              >
                Recuar ao Menu do Abrigo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTCOME MODAL: EXTRACTION VICTORY OR COMBAT DEFEAT */}
      {shellState === 'gameover' && endSnapshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="outcome-modal-title"
          className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-4"
        >
          <div
            className={`w-full max-w-md rounded-sm p-6 space-y-5 shadow-2xl border ${
              isVictory
                ? 'bg-[#121a15] border-[#3e6b4e]'
                : 'bg-[#1a1110] border-[#8f241b]'
            }`}
          >
            <div className="space-y-1 border-b border-[#26201b] pb-3">
              <p
                className={`text-[11px] font-bold uppercase tracking-widest ${
                  isVictory ? 'text-[#52b788]' : 'text-[#c94a38]'
                }`}
              >
                {isVictory
                  ? 'Extração Concluída · Suprimentos Salvos'
                  : 'Baixa em Combate · Saque Perdido'}
              </p>
              <h2
                id="outcome-modal-title"
                className="font-display text-2xl sm:text-3xl font-bold text-[#ebe5dc] uppercase"
              >
                {isVictory
                  ? 'Portão do Abrigo Alcançado'
                  : 'Sobrevivente Abatido na Zona Urbana'}
              </h2>
              <p className="text-xs text-[#b8afa4] leading-relaxed">
                {isVictory
                  ? 'Os recursos coletados na mochila foram transferidos uma única vez para o inventário permanente do abrigo.'
                  : 'Sem retorno ao Portão de Extração, os suprimentos coletados nesta incursão permaneceram na zona infectada.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#8c8277]">Abates</div>
                <div className="font-mono-tabular text-xl font-bold text-[#ebe5dc]">
                  {endSnapshot.zombiesKilled}
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#8c8277]">Duração</div>
                <div className="font-mono-tabular text-xl font-bold text-[#c87a28]">
                  {Math.max(1, Math.round(endSnapshot.elapsedTime))}s
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#8c8277]">Extrações</div>
                <div className="font-mono-tabular text-xl font-bold text-[#52b788]">
                  {stash.runsExtracted}
                </div>
              </div>
            </div>

            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#c87a28]">
                {isVictory
                  ? 'Saque Extraído (e Total no Abrigo):'
                  : 'Estoque Preservado no Abrigo:'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs font-mono-tabular">
                <div className="flex items-center justify-between gap-2 bg-[#14110f] px-3 py-1.5 rounded-sm border border-[#211c18]">
                  <span className="inline-flex items-center gap-1.5 text-[#b8afa4]">
                    <ResourceIconSvg type="comida" className="w-3.5 h-3.5 shrink-0" />
                    Rações
                  </span>
                  <span className="font-bold text-[#ebe5dc] whitespace-nowrap">
                    {isVictory ? `+${endSnapshot.runLoot.comida} ` : ''}({stash.totalStash.comida})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#14110f] px-3 py-1.5 rounded-sm border border-[#211c18]">
                  <span className="inline-flex items-center gap-1.5 text-[#b8afa4]">
                    <ResourceIconSvg type="medicamentos" className="w-3.5 h-3.5 shrink-0" />
                    Remédios
                  </span>
                  <span className="font-bold text-[#ebe5dc] whitespace-nowrap">
                    {isVictory ? `+${endSnapshot.runLoot.medicamentos} ` : ''}({stash.totalStash.medicamentos})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#14110f] px-3 py-1.5 rounded-sm border border-[#211c18]">
                  <span className="inline-flex items-center gap-1.5 text-[#b8afa4]">
                    <ResourceIconSvg type="municao" className="w-3.5 h-3.5 shrink-0" />
                    Munição
                  </span>
                  <span className="font-bold text-[#ebe5dc] whitespace-nowrap">
                    {isVictory ? `+${endSnapshot.runLoot.municao} ` : ''}({stash.totalStash.municao})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#14110f] px-3 py-1.5 rounded-sm border border-[#211c18]">
                  <span className="inline-flex items-center gap-1.5 text-[#b8afa4]">
                    <ResourceIconSvg type="materiais" className="w-3.5 h-3.5 shrink-0" />
                    Sucata
                  </span>
                  <span className="font-bold text-[#ebe5dc] whitespace-nowrap">
                    {isVictory ? `+${endSnapshot.runLoot.materiais} ` : ''}({stash.totalStash.materiais})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewRun()}
                className="min-h-[46px] flex-1 rounded-sm bg-[#8f241b] hover:bg-[#a82c21] border border-[#b93829] text-[#ebe5dc] font-display text-base font-bold uppercase tracking-wider"
              >
                {isVictory ? 'Nova Incursão' : 'Tentar Novamente'}
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="min-h-[46px] px-5 rounded-sm bg-[#161311] hover:bg-[#211c19] text-[#d6cec2] border border-[#2e2722] text-xs font-bold uppercase tracking-wider"
              >
                Menu do Abrigo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
