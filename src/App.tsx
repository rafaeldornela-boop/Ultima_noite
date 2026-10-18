import { useCallback, useEffect, useState } from 'react';
import { ResourceBar } from './components/ResourceBar.tsx';
import { TitleEmblemSvg } from './components/SvgArt.tsx';
import {
  advanceToNextDay,
  advanceToPreparation,
  buildUpgrade,
  concludeExpeditionReturn,
  createInitialCampaign,
  healSurvivor,
  resolveCardOption,
  retreatFromExpedition,
  startExpedition,
} from './game/rules.ts';
import type {
  CampaignState,
  EquipmentId,
  LocationId,
  ShelterUpgradeId,
} from './game/types.ts';
import { ExpeditionScreen } from './screens/ExpeditionScreen.tsx';
import { JournalScreen } from './screens/JournalScreen.tsx';
import { ShelterScreen } from './screens/ShelterScreen.tsx';
import { TitleScreen } from './screens/TitleScreen.tsx';
import { UpgradesScreen } from './screens/UpgradesScreen.tsx';
import {
  loadCampaignState,
  resetCampaignState,
  saveCampaignState,
} from './storage/campaignStorage.ts';
import { soundFX } from './utils/sound.ts';

type ShellState = 'title' | 'playing' | 'paused' | 'gameover';
type ActiveTab = 'abrigo' | 'expedicao' | 'melhorias' | 'diario';

export default function App() {
  const [campaign, setCampaign] = useState<CampaignState>(() =>
    createInitialCampaign()
  );
  const [hadSavedData, setHadSavedData] = useState(false);
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('abrigo');
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Load saved campaign on startup
  useEffect(() => {
    let mounted = true;
    loadCampaignState().then(({ state, hadSavedData: saved, recoveredFromError }) => {
      if (!mounted) return;
      setCampaign(state);
      setHadSavedData(saved);
      setIsLoaded(true);
      if (state.phase === 'derrota') {
        setShellState('gameover');
      }
      if (recoveredFromError) {
        showToast('Dados anteriores inválidos foram recuperados em uma nova campanha.');
      }
    });
    return () => {
      mounted = false;
    };
  }, [showToast]);

  // Sync document.body.dataset.state for Game Shell contract
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const effectiveState: ShellState =
        campaign.phase === 'derrota' && shellState !== 'title'
          ? 'gameover'
          : shellState;
      document.body.dataset.state = effectiveState;
    }
  }, [shellState, campaign.phase]);

  // Reset scroll position to top when navigating tabs, changing cycle phases, or advancing cards
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [activeTab, campaign.phase, campaign.activeExpedition?.currentCardIndex]);

  // Persist campaign changes automatically
  const updateAndSaveCampaign = useCallback((updater: (prev: CampaignState) => CampaignState) => {
    setCampaign((prev) => {
      const next = updater(prev);
      saveCampaignState(next).catch(() => {});
      if (next.phase === 'derrota') {
        setShellState('gameover');
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts (Escape / P for pause, M for mute)
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

  const handleStartGame = useCallback(() => {
    soundFX.playClick();
    if (campaign.phase === 'derrota') {
      resetCampaignState().then((fresh) => {
        setCampaign(fresh);
        setHadSavedData(true);
        setActiveTab('abrigo');
        setShellState('playing');
      });
    } else {
      setShellState('playing');
    }
  }, [campaign.phase]);

  const handleResetCampaign = useCallback(() => {
    soundFX.playDanger();
    resetCampaignState().then((fresh) => {
      setCampaign(fresh);
      setHadSavedData(true);
      setActiveTab('abrigo');
      setShellState('playing');
      showToast('Nova campanha iniciada no Dia 1.');
    });
  }, [showToast]);

  const handleAdvanceToPrep = useCallback(() => {
    soundFX.playClick();
    updateAndSaveCampaign((prev) => advanceToPreparation(prev));
  }, [updateAndSaveCampaign]);

  const handleHealSurvivor = useCallback(
    (survivorId: string) => {
      soundFX.playSuccess();
      updateAndSaveCampaign((prev) => healSurvivor(prev, survivorId));
      showToast('Tratamento médico aplicado.');
    },
    [updateAndSaveCampaign, showToast]
  );

  const handleBuildUpgrade = useCallback(
    (upgradeId: ShelterUpgradeId) => {
      soundFX.playSuccess();
      updateAndSaveCampaign((prev) => buildUpgrade(prev, upgradeId));
      showToast('Melhoria construída no abrigo!');
    },
    [updateAndSaveCampaign, showToast]
  );

  const handleStartExpedition = useCallback(
    (locationId: LocationId, teamIds: string[], equipmentIds: EquipmentId[]) => {
      soundFX.playClick();
      updateAndSaveCampaign((prev) =>
        startExpedition(prev, locationId, teamIds, equipmentIds)
      );
      setActiveTab('expedicao');
    },
    [updateAndSaveCampaign]
  );

  const handleResolveCardOption = useCallback(
    (optionId: string) => {
      soundFX.playClick();
      updateAndSaveCampaign((prev) => resolveCardOption(prev, optionId));
    },
    [updateAndSaveCampaign]
  );

  const handleRetreatExpedition = useCallback(() => {
    soundFX.playDanger();
    updateAndSaveCampaign((prev) => retreatFromExpedition(prev));
    showToast('Retirada tática ordenada.');
  }, [updateAndSaveCampaign, showToast]);

  const handleConcludeReturn = useCallback(() => {
    soundFX.playSuccess();
    updateAndSaveCampaign((prev) => concludeExpeditionReturn(prev));
    showToast('Suprimentos guardados no estoque do abrigo.');
  }, [updateAndSaveCampaign, showToast]);

  const handleAdvanceNextDay = useCallback(() => {
    soundFX.playClick();
    updateAndSaveCampaign((prev) => advanceToNextDay(prev));
    setActiveTab('abrigo');
    showToast(`Amanheceu no abrigo.`);
  }, [updateAndSaveCampaign, showToast]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#12100e] text-[#e7e2da] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-display text-xl uppercase tracking-wider text-[#d9822b]">
            Carregando Abrigo...
          </div>
        </div>
      </div>
    );
  }

  // TITLE SCREEN
  if (shellState === 'title') {
    return (
      <TitleScreen
        state={campaign}
        hadSavedData={hadSavedData}
        onStartGame={handleStartGame}
        onNewCampaign={handleResetCampaign}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] text-[#e7e2da] flex flex-col justify-between pb-20">
      {/* Top Game HUD */}
      <ResourceBar
        state={campaign}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = soundFX.toggleMute();
          setIsMuted(next);
        }}
        onOpenPause={() => setShellState('paused')}
      />

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-6xl mx-auto w-full px-4 pt-3"
        >
          <div className="rounded-xl bg-[#241e19] border border-[#d9822b] px-4 py-2.5 text-xs font-semibold text-[#f5f0e6] flex items-center justify-between">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-[#9e9185] hover:text-white ml-3"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-5">
        {activeTab === 'abrigo' && (
          <ShelterScreen
            state={campaign}
            onAdvanceToPrep={handleAdvanceToPrep}
            onGoToExpeditionScreen={() => setActiveTab('expedicao')}
            onConcludeReturn={handleConcludeReturn}
            onAdvanceNextDay={handleAdvanceNextDay}
            onHealSurvivor={handleHealSurvivor}
            onGoToUpgrades={() => setActiveTab('melhorias')}
          />
        )}

        {activeTab === 'expedicao' && (
          <ExpeditionScreen
            state={campaign}
            onStartExpedition={handleStartExpedition}
            onResolveCardOption={handleResolveCardOption}
            onRetreatExpedition={handleRetreatExpedition}
            onConcludeReturn={handleConcludeReturn}
            onAdvanceNextDay={handleAdvanceNextDay}
            onHealSurvivor={handleHealSurvivor}
          />
        )}

        {activeTab === 'melhorias' && (
          <UpgradesScreen
            state={campaign}
            onBuildUpgrade={handleBuildUpgrade}
          />
        )}

        {activeTab === 'diario' && (
          <JournalScreen
            state={campaign}
            onResetCampaign={handleResetCampaign}
          />
        )}
      </main>

      {/* Fixed Bottom Thumb-Zone Navigation Bar */}
      <nav
        aria-label="Navegação Principal do Jogo"
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#161311] border-t border-[#2d2520] px-2"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-4 h-16 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('abrigo');
            }}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors ${
              activeTab === 'abrigo'
                ? 'bg-[#251f1b] text-[#d9822b] font-bold'
                : 'text-[#a89d91] hover:text-[#f0ebe1]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" />
              <path d="M9 21V12h6v9" />
            </svg>
            <span className="text-[11px] mt-0.5 whitespace-nowrap">Abrigo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              if (campaign.phase === 'manha') {
                handleAdvanceToPrep();
              }
              setActiveTab('expedicao');
            }}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors ${
              activeTab === 'expedicao'
                ? 'bg-[#251f1b] text-[#d9822b] font-bold'
                : 'text-[#a89d91] hover:text-[#f0ebe1]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
            <span className="text-[11px] mt-0.5 whitespace-nowrap">
              {campaign.phase === 'expedicao' ? 'Em Missão' : 'Expedição'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('melhorias');
            }}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors ${
              activeTab === 'melhorias'
                ? 'bg-[#251f1b] text-[#d9822b] font-bold'
                : 'text-[#a89d91] hover:text-[#f0ebe1]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span className="text-[11px] mt-0.5 whitespace-nowrap">Melhorias</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setActiveTab('diario');
            }}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors ${
              activeTab === 'diario'
                ? 'bg-[#251f1b] text-[#d9822b] font-bold'
                : 'text-[#a89d91] hover:text-[#f0ebe1]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="text-[11px] mt-0.5 whitespace-nowrap">Diário</span>
          </button>
        </div>
      </nav>

      {/* PAUSE MODAL */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#1c1714] border-2 border-[#3d3129] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <TitleEmblemSvg className="w-12 h-12 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
                  Jogo Pausado
                </p>
                <h2
                  id="pause-modal-title"
                  className="font-display text-2xl font-bold text-[#f5f0e6] uppercase"
                >
                  Último Dia — Abrigo
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-[#14110f] border border-[#29221d] p-2.5">
                <div className="text-[11px] text-[#9e9185]">Dia Atual</div>
                <div className="font-mono-tabular text-lg font-bold text-[#f5f0e6]">
                  {campaign.day}
                </div>
              </div>
              <div className="rounded-xl bg-[#14110f] border border-[#29221d] p-2.5">
                <div className="text-[11px] text-[#9e9185]">Expedições</div>
                <div className="font-mono-tabular text-lg font-bold text-[#d9822b]">
                  {campaign.stats.expeditionsCompleted}
                </div>
              </div>
              <div className="rounded-xl bg-[#14110f] border border-[#29221d] p-2.5">
                <div className="text-[11px] text-[#9e9185]">Eventos</div>
                <div className="font-mono-tabular text-lg font-bold text-[#f5f0e6]">
                  {campaign.stats.cardsResolved}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="min-h-[48px] w-full rounded-xl bg-[#d9822b] hover:bg-[#e5923e] text-[#12100e] font-display text-base font-bold uppercase tracking-wider"
              >
                Retomar Campanha
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="min-h-[48px] w-full rounded-xl bg-[#241f1b] hover:bg-[#302923] text-[#e7e2da] border border-[#382f28] text-sm font-semibold"
              >
                Tela Inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER (DEFEAT) MODAL */}
      {(shellState === 'gameover' || campaign.phase === 'derrota') && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#1f1514] border-2 border-[#8c2d23] p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#e05246]">
                Abrigo Silenciado · Queda Total
              </p>
              <h2
                id="gameover-modal-title"
                className="font-display text-3xl font-bold text-[#f5f0e6] uppercase"
              >
                Todos os Sobreviventes Morreram
              </h2>
              <p className="text-xs text-[#c7bdb1] leading-relaxed pt-1">
                Sem ninguém vivo para manter as barricadas erguidas, o abrigo foi tomado. A morte é permanente, mas um novo grupo ainda pode tentar sobreviver.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-[#14100f] border border-[#38221f] p-3">
                <div className="text-[11px] text-[#9e9185]">Dias Sobrevividos</div>
                <div className="font-mono-tabular text-xl font-bold text-[#f5f0e6]">
                  {campaign.day}
                </div>
              </div>
              <div className="rounded-xl bg-[#14100f] border border-[#38221f] p-3">
                <div className="text-[11px] text-[#9e9185]">Expedições</div>
                <div className="font-mono-tabular text-xl font-bold text-[#d9822b]">
                  {campaign.stats.expeditionsCompleted}
                </div>
              </div>
              <div className="rounded-xl bg-[#14100f] border border-[#38221f] p-3">
                <div className="text-[11px] text-[#9e9185]">Saque Total</div>
                <div className="font-mono-tabular text-xl font-bold text-[#52b788]">
                  {campaign.stats.totalResourcesLooted}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-start="true"
              onClick={handleResetCampaign}
              className="min-h-[48px] w-full rounded-xl bg-[#b93829] hover:bg-[#cc4333] text-[#f5f0e6] font-display text-base font-bold uppercase tracking-wider"
            >
              Iniciar Nova Campanha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
