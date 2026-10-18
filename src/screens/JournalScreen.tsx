import { useState } from 'react';
import { ATTRIBUTE_DESCRIPTIONS, ATTRIBUTE_LABELS } from '../data/survivors.ts';
import type { AttributeType, CampaignState } from '../game/types.ts';
import { AttributeIconSvg } from '../components/SvgArt.tsx';

const ATTRIBUTE_KEYS: AttributeType[] = [
  'combate',
  'percepcao',
  'tecnica',
  'resistencia',
];

interface JournalScreenProps {
  state: CampaignState;
  onResetCampaign: () => void;
}

export function JournalScreen({ state, onResetCampaign }: JournalScreenProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="space-y-6">
      {/* Campaign Statistics */}
      <section className="rounded-2xl bg-[#1b1714] border border-[#302822] p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
            Registros de Sobrevivência
          </p>
          <h2 className="font-display text-2xl font-bold text-[#f5f0e6] uppercase">
            Estatísticas e Diário do Abrigo
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#14110f] border border-[#26201b] p-3">
            <div className="text-xs text-[#9e9185]">Dias Sobrevividos</div>
            <div className="font-mono-tabular text-2xl font-bold text-[#f5f0e6] mt-1">
              {state.day}
            </div>
          </div>
          <div className="rounded-xl bg-[#14110f] border border-[#26201b] p-3">
            <div className="text-xs text-[#9e9185]">Expedições Concluídas</div>
            <div className="font-mono-tabular text-2xl font-bold text-[#d9822b] mt-1">
              {state.stats.expeditionsCompleted}
            </div>
          </div>
          <div className="rounded-xl bg-[#14110f] border border-[#26201b] p-3">
            <div className="text-xs text-[#9e9185]">Eventos Resolvidos</div>
            <div className="font-mono-tabular text-2xl font-bold text-[#f5f0e6] mt-1">
              {state.stats.cardsResolved}
            </div>
          </div>
          <div className="rounded-xl bg-[#14110f] border border-[#26201b] p-3">
            <div className="text-xs text-[#9e9185]">Recursos Coletados</div>
            <div className="font-mono-tabular text-2xl font-bold text-[#52b788] mt-1">
              {state.stats.totalResourcesLooted}
            </div>
          </div>
        </div>
      </section>

      {/* Attributes Reference Guide */}
      <section className="rounded-2xl bg-[#1b1714] border border-[#302822] p-5 space-y-3">
        <h3 className="font-display text-lg font-bold text-[#f5f0e6] uppercase">
          Guia de Atributos e Regras
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ATTRIBUTE_KEYS.map((attr) => (
            <div
              key={attr}
              className="rounded-xl bg-[#14110f] border border-[#26201b] p-3 flex items-start gap-3"
            >
              <AttributeIconSvg attribute={attr} className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[#f0ebe1]">
                  {ATTRIBUTE_LABELS[attr]}
                </div>
                <p className="text-xs text-[#9e9185] mt-0.5 leading-relaxed">
                  {ATTRIBUTE_DESCRIPTIONS[attr]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full Chronological Log */}
      <section className="rounded-2xl bg-[#1b1714] border border-[#302822] p-5 space-y-3">
        <h3 className="font-display text-lg font-bold text-[#f5f0e6] uppercase">
          Histórico Completo da Campanha
        </h3>
        <ul className="divide-y divide-[#26201b] text-xs max-h-80 overflow-y-auto pr-1">
          {state.history.map((entry) => (
            <li
              key={entry.id}
              className="py-2.5 flex items-start justify-between gap-3"
            >
              <span
                className={
                  entry.type === 'danger'
                    ? 'text-[#e05246]'
                    : entry.type === 'warning'
                    ? 'text-[#d9822b]'
                    : entry.type === 'success'
                    ? 'text-[#52b788]'
                    : 'text-[#c7bdb1]'
                }
              >
                {entry.text}
              </span>
              <span className="font-mono-tabular text-[11px] text-[#786d63] whitespace-nowrap shrink-0">
                Dia {entry.day}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Destructive Action: Reset Campaign with Explicit Confirmation */}
      <section className="rounded-2xl bg-[#1f1615] border border-[#522520] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-[#f5f0e6] uppercase">
            Zona de Risco — Reiniciar Campanha
          </h3>
          <p className="text-xs text-[#b5a99c]">
            Apaga o progresso salvo no dispositivo e inicia uma nova campanha a partir do Dia 1.
          </p>
        </div>

        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#2b1a18] hover:bg-[#3d221f] text-[#e05246] border border-[#6e2920] text-xs font-bold whitespace-nowrap transition-colors"
          >
            Reiniciar Campanha
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmingReset(false);
                onResetCampaign();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#b93829] hover:bg-[#cc4333] text-white text-xs font-bold whitespace-nowrap"
            >
              Confirmar Exclusão e Reiniciar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#241f1b] text-[#c7bdb1] text-xs font-semibold whitespace-nowrap"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
