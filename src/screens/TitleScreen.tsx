import { useEffect, useState } from 'react';
import type { PersistentShelterStash } from '../action/actionTypes.ts';
import {
  ResourceIconSvg,
  TitleBackdropSvg,
  TitleEmblemSvg,
} from '../components/SvgArt.tsx';

interface TitleScreenProps {
  stash: PersistentShelterStash;
  onStartGame: () => void;
  onResetStash: () => void;
}

export function TitleScreen({
  stash,
  onStartGame,
  onResetStash,
}: TitleScreenProps) {
  const [confirmReset, setConfirmReset] = useState(false);

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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0e0c0a] flex flex-col justify-between p-5 sm:p-10 select-none">
      {/* Atmospheric Post-Apocalyptic Key-Art Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <TitleBackdropSvg />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0c0a]/96 via-[#0e0c0a]/80 to-[#0e0c0a]/35" />
      </div>

      {/* Main Left-Third Negative Space Lockup */}
      <div className="relative z-10 max-w-xl my-auto flex flex-col items-start gap-5">
        <div className="flex items-center gap-4">
          <TitleEmblemSvg className="w-16 h-16 md:w-20 md:h-20 shrink-0" />
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#c87a28]">
              Sobrevivência Urbana Tática · Offline
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#ebe5dc] uppercase leading-none mt-1">
              Último Dia
            </h1>
            <p className="font-display text-lg sm:text-xl font-semibold tracking-[0.26em] text-[#9e2a22] uppercase mt-1">
              Setor Vila Esperança
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#b8afa4] max-w-lg leading-relaxed">
          A zona comercial caiu. Avance sob visibilidade restrita pela Vila Esperança, controle o recuo e a munição da Pistola 9mm ou abra caminho no facão contra errantes, corredores e brutos blindados. O saque só é salvo se você cruzar o Portão de Extração com vida.
        </p>

        {/* Persistent Shelter Stash Readout (Utilitarian Industrial Panel) */}
        <div
          className="w-full rounded-sm bg-[#12100e]/95 border border-[#2e2722] p-3.5 space-y-2.5 shadow-2xl"
          aria-label="Estoque persistido no abrigo"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-b border-[#241f1b] pb-2">
            <span className="font-bold uppercase tracking-widest text-[#c87a28]">
              Inventário do Abrigo
            </span>
            <span className="text-[#8c8277] font-mono-tabular">
              Extrações: {stash.runsExtracted} · Baixas: {stash.runsDied} · Abates: {stash.totalZombiesKilled}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ResourceIconSvg type="comida" className="w-4 h-4 shrink-0" />
                <span className="text-xs text-[#b8afa4]">Rações</span>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-[#ebe5dc]">
                {stash.totalStash.comida}
              </span>
            </div>

            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ResourceIconSvg type="medicamentos" className="w-4 h-4 shrink-0" />
                <span className="text-xs text-[#b8afa4]">Remédios</span>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-[#ebe5dc]">
                {stash.totalStash.medicamentos}
              </span>
            </div>

            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ResourceIconSvg type="municao" className="w-4 h-4 shrink-0" />
                <span className="text-xs text-[#b8afa4]">Munição</span>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-[#ebe5dc]">
                {stash.totalStash.municao}
              </span>
            </div>

            <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ResourceIconSvg type="materiais" className="w-4 h-4 shrink-0" />
                <span className="text-xs text-[#b8afa4]">Sucata</span>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-[#ebe5dc]">
                {stash.totalStash.materiais}
              </span>
            </div>
          </div>
        </div>

        {/* Primary & Secondary CTAs (Utilitarian Tactical Buttons) */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="min-h-[48px] px-8 py-3 rounded-sm bg-[#8f241b] hover:bg-[#a82c21] border border-[#b93829] active:scale-[0.99] text-[#f5f0e6] font-display text-base sm:text-lg font-bold tracking-[0.14em] uppercase transition-colors shadow-lg shadow-black/60 whitespace-nowrap"
          >
            Iniciar Incursão
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setConfirmReset(true);
              }}
              className="min-h-[48px] px-5 py-3 rounded-sm bg-[#161311] hover:bg-[#211c19] text-[#a89d91] border border-[#2e2722] text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap"
            >
              Zerar Campanha
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setConfirmReset(false);
                onResetStash();
              }}
              className="min-h-[48px] px-5 py-3 rounded-sm bg-[#5e1410] hover:bg-[#781a15] border border-[#9e2a22] text-white text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
            >
              Confirmar Exclusão
            </button>
          )}
        </div>
      </div>

      {/* Bottom Safe Margin Control Hint */}
      <div className="relative z-10 pt-4 text-[11px] text-[#7a7066] tracking-wide">
        WASD ou Analógico Esq.: Mover · Mouse ou Analógico Dir.: Mirar e Atacar · Q: Arma · R: Recarregar · E: Saquear/Extrair · Espaço: Esquiva
      </div>
    </div>
  );
}
