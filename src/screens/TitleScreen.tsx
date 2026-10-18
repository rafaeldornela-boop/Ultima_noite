import { useEffect } from 'react';
import { TitleBackdropSvg, TitleEmblemSvg } from '../components/SvgArt.tsx';
import type { CampaignState } from '../game/types.ts';

interface TitleScreenProps {
  state: CampaignState;
  hadSavedData: boolean;
  onStartGame: () => void;
  onNewCampaign: () => void;
}

export function TitleScreen({
  state,
  hadSavedData,
  onStartGame,
  onNewCampaign,
}: TitleScreenProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const livingCount = state.survivors.filter(
    (s) => s.injury !== 'morto' && s.health > 0
  ).length;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#12100e] flex flex-col justify-between p-6 md:p-12 select-none">
      {/* Key-Art SVG Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <TitleBackdropSvg />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12100e]/95 via-[#12100e]/70 to-transparent" />
      </div>

      {/* Main Left-Third Negative Space Lockup */}
      <div className="relative z-10 max-w-xl my-auto flex flex-col items-start gap-6">
        <div className="flex items-center gap-4">
          <TitleEmblemSvg className="w-16 h-16 md:w-20 md:h-20 shrink-0" />
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#d9822b]">
              Sobrevivência Narrativa · Offline
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#f5f0e6] uppercase leading-none mt-1">
              Último Dia
            </h1>
            <p className="font-display text-xl sm:text-2xl font-medium tracking-widest text-[#b93829] uppercase mt-1">
              Sobrevivência
            </p>
          </div>
        </div>

        <p className="text-sm sm:text-base text-[#c7bdb1] max-w-md leading-relaxed">
          Mantenha o abrigo de pé, racionando comida, escolhendo quem arrisca a vida
          nas ruínas e enfrentando decisões onde cada erro custa sangue ou morte permanente.
        </p>

        {/* Primary & Secondary CTAs (<= 3 menu actions total) */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="min-h-[48px] px-8 py-3.5 rounded-xl bg-[#b93829] hover:bg-[#cc4333] active:scale-[0.99] text-[#f5f0e6] font-display text-lg font-bold tracking-wider uppercase transition-all shadow-lg shadow-black/50 whitespace-nowrap"
          >
            {hadSavedData && state.day > 1
              ? `Continuar Campanha (Dia ${state.day})`
              : 'Entrar no Abrigo'}
          </button>

          {hadSavedData && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onNewCampaign();
              }}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#1e1916] hover:bg-[#2a231e] text-[#c7bdb1] border border-[#382f28] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Nova Campanha
            </button>
          )}
        </div>

        <div className="text-xs text-[#9e9185] flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="whitespace-nowrap">Campanha Local Ativa: Dia {state.day}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{livingCount} Sobreviventes Vivos</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Salvo Automaticamente</span>
        </div>
      </div>

      {/* Bottom Safe Margin Control Hint */}
      <div className="relative z-10 pt-6 text-xs text-[#8a7d71]">
        Toque ou clique para decidir · Enter ou Espaço para iniciar · P ou Esc para pausar · M para som
      </div>
    </div>
  );
}
