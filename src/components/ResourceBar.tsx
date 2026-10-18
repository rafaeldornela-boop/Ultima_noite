import { RESOURCE_ORDER, RESOURCES_META } from '../data/resources.ts';
import type { CampaignState, CyclePhase } from '../game/types.ts';
import { ResourceIconSvg } from './SvgArt.tsx';

const PHASE_LABELS: Record<CyclePhase, string> = {
  manha: '1. Manhã',
  preparacao: '2. Preparação',
  expedicao: '3. Expedição',
  retorno: '4. Retorno',
  novo_dia: '5. Novo Dia',
  derrota: 'Fim da Linha',
};

interface ResourceBarProps {
  state: CampaignState;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenPause: () => void;
}

export function ResourceBar({
  state,
  isMuted,
  onToggleMute,
  onOpenPause,
}: ResourceBarProps) {
  const livingCount = state.survivors.filter(
    (s) => s.injury !== 'morto' && s.health > 0
  ).length;

  return (
    <div className="bg-[#171412] border-b border-[#2c2520] px-3 py-2">
      <div className="max-w-6xl mx-auto flex flex-col gap-2">
        {/* Top Row: Day, Cycle Phase, Survivors Count, Utility Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-lg font-bold tracking-wide text-[#f0ebe1] uppercase whitespace-nowrap">
              Dia <span className="font-mono-tabular text-[#d9822b]">{state.day}</span>
            </span>
            <span className="text-[#5c4f45]" aria-hidden="true">·</span>
            <span className="text-xs font-semibold text-[#d9822b] tracking-wide whitespace-nowrap truncate">
              {PHASE_LABELS[state.phase]}
            </span>
            <span className="text-[#5c4f45] hidden sm:inline" aria-hidden="true">·</span>
            <span className="text-xs text-[#a89d91] hidden sm:inline whitespace-nowrap">
              Vivos: <strong className="font-mono-tabular text-[#e7e2da]">{livingCount}/{state.survivors.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              aria-label={isMuted ? 'Ativar som [M]' : 'Silenciar som [M]'}
              title={isMuted ? 'Ativar som (M)' : 'Silenciar som (M)'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-9 h-9 rounded-lg bg-[#221d1a] border border-[#362d27] hover:border-[#d9822b] flex items-center justify-center text-[#c7bdb1] transition-colors"
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
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Menu de Pausa [P]"
              title="Pausa (P / Esc)"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPause();
              }}
              className="w-9 h-9 rounded-lg bg-[#221d1a] border border-[#362d27] hover:border-[#d9822b] flex items-center justify-center text-[#c7bdb1] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Row: 5 Resources Bar */}
        <div
          className="grid grid-cols-5 gap-1.5 pt-1 border-t border-[#241e1a]"
          aria-label="Estoque de recursos do abrigo"
        >
          {RESOURCE_ORDER.map((resKey) => {
            const meta = RESOURCES_META[resKey];
            const amount = state.resources[resKey];
            const isLow =
              (resKey === 'comida' && amount < livingCount) || amount === 0;

            return (
              <div
                key={resKey}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-1.5 sm:px-2.5 py-1 rounded bg-[#1d1815] border ${
                  isLow ? 'border-[#8c2d23]' : 'border-[#2c2520]'
                }`}
                title={`${meta.name}: ${amount}/${state.maxResources[resKey]} (${meta.description})`}
              >
                <div className="flex items-center justify-between sm:justify-start gap-1">
                  <ResourceIconSvg type={resKey} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="text-[11px] text-[#b0a498] hidden sm:inline whitespace-nowrap">
                    {meta.name}
                  </span>
                  <span
                    className={`font-mono-tabular text-xs font-bold sm:hidden ${
                      isLow ? 'text-[#e05246]' : 'text-[#f0ebe1]'
                    }`}
                  >
                    {Math.round(amount)}
                  </span>
                </div>
                <span className="text-[10px] text-[#b0a498] sm:hidden truncate mt-0.5">
                  {meta.shortName}
                </span>
                <span
                  className={`font-mono-tabular text-xs font-bold hidden sm:inline ml-1 ${
                    isLow ? 'text-[#e05246]' : 'text-[#f0ebe1]'
                  }`}
                >
                  {Math.round(amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
