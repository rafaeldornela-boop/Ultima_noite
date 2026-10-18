import { RESOURCES_META } from '../data/resources.ts';
import { SHELTER_UPGRADES, UPGRADE_ORDER } from '../data/upgrades.ts';
import { SurvivorCard } from '../components/SurvivorCard.tsx';
import type { CampaignState } from '../game/types.ts';

interface ShelterScreenProps {
  state: CampaignState;
  onAdvanceToPrep: () => void;
  onGoToExpeditionScreen: () => void;
  onConcludeReturn: () => void;
  onAdvanceNextDay: () => void;
  onHealSurvivor: (survivorId: string) => void;
  onGoToUpgrades: () => void;
}

export function ShelterScreen({
  state,
  onAdvanceToPrep,
  onGoToExpeditionScreen,
  onConcludeReturn,
  onAdvanceNextDay,
  onHealSurvivor,
  onGoToUpgrades,
}: ShelterScreenProps) {
  const livingSurvivors = state.survivors.filter(
    (s) => s.injury !== 'morto' && s.health > 0
  );
  const hasInfirmary = state.upgrades.enfermaria.level > 0;

  return (
    <div className="space-y-6">
      {/* Cycle Step Hero Card */}
      <section className="rounded-2xl bg-[#1c1714] border border-[#332a24] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
            Ciclo Diário do Abrigo · Dia {state.day}
          </div>

          {state.phase === 'manha' && (
            <>
              <h2 className="font-display text-2xl font-bold text-[#f5f0e6]">
                Etapa 1: Manhã — Verificação e Racionamento
              </h2>
              <p className="text-sm text-[#c7bdb1] leading-relaxed">
                {state.lastMorningReport?.summary ??
                  'Verifique o estado de saúde dos sobreviventes, trate ferimentos urgentes e prepare a equipe para sair em busca de suprimentos.'}
              </p>
              {state.lastMorningReport?.injuriesWorsened &&
                state.lastMorningReport.injuriesWorsened.length > 0 && (
                  <ul className="pt-1 space-y-1 text-xs text-[#e05246]">
                    {state.lastMorningReport.injuriesWorsened.map((msg, i) => (
                      <li key={i}>Alerta: {msg}</li>
                    ))}
                  </ul>
                )}
            </>
          )}

          {state.phase === 'preparacao' && (
            <>
              <h2 className="font-display text-2xl font-bold text-[#f5f0e6]">
                Etapa 2: Preparação da Expedição
              </h2>
              <p className="text-sm text-[#c7bdb1] leading-relaxed">
                O abrigo está pronto. Escolha quais sobreviventes sairão hoje, selecione o destino e defina os equipamentos antes do anoitecer.
              </p>
            </>
          )}

          {state.phase === 'expedicao' && (
            <>
              <h2 className="font-display text-2xl font-bold text-[#f5f0e6]">
                Etapa 3: Expedição em Andamento
              </h2>
              <p className="text-sm text-[#c7bdb1] leading-relaxed">
                Sua equipe está explorando as ruínas neste momento. Continue tomando decisões nas cartas de evento ou ordene a retirada.
              </p>
            </>
          )}

          {state.phase === 'retorno' && (
            <>
              <h2 className="font-display text-2xl font-bold text-[#f5f0e6]">
                Etapa 4: Retorno da Equipe
              </h2>
              <p className="text-sm text-[#c7bdb1] leading-relaxed">
                A equipe regressou aos portões do abrigo. Transfira os suprimentos coletados na mochila para o estoque central.
              </p>
            </>
          )}

          {state.phase === 'novo_dia' && (
            <>
              <h2 className="font-display text-2xl font-bold text-[#f5f0e6]">
                Etapa 5: Fim do Dia — Preparar Vigília Noturna
              </h2>
              <p className="text-sm text-[#c7bdb1] leading-relaxed">
                Os recursos da expedição já foram guardados. Aproveite para construir melhorias no abrigo ou tratar feridos antes de encerrar o Dia {state.day}.
              </p>
            </>
          )}
        </div>

        {/* Primary Action for the Current Cycle Stage */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-2.5">
          {state.phase === 'manha' && (
            <button
              type="button"
              onClick={() => {
                onAdvanceToPrep();
                onGoToExpeditionScreen();
              }}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#b93829] hover:bg-[#cc4333] text-[#f5f0e6] font-display text-base font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
            >
              Preparar Expedição
            </button>
          )}

          {state.phase === 'preparacao' && (
            <button
              type="button"
              onClick={onGoToExpeditionScreen}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#d9822b] hover:bg-[#e5923e] text-[#12100e] font-display text-base font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
            >
              Escolher Equipe e Local
            </button>
          )}

          {state.phase === 'expedicao' && (
            <button
              type="button"
              onClick={onGoToExpeditionScreen}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#b93829] hover:bg-[#cc4333] text-[#f5f0e6] font-display text-base font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
            >
              Continuar Exploração
            </button>
          )}

          {state.phase === 'retorno' && (
            <button
              type="button"
              onClick={onConcludeReturn}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#458b69] hover:bg-[#52a37c] text-[#f5f0e6] font-display text-base font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
            >
              Guardar Saque no Abrigo
            </button>
          )}

          {state.phase === 'novo_dia' && (
            <button
              type="button"
              onClick={onAdvanceNextDay}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#d9822b] hover:bg-[#e5923e] text-[#12100e] font-display text-base font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
            >
              Avançar para o Dia {state.day + 1}
            </button>
          )}
        </div>
      </section>

      {/* Overnight & Rations Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#191512] border border-[#2b241f] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#e7e2da]">
              Consumo Diário de Alimentação
            </h3>
            <span className="font-mono-tabular text-xs font-semibold text-[#d9822b]">
              {livingSurvivors.length} Comida / manhã
            </span>
          </div>
          <p className="text-xs text-[#9e9185] leading-relaxed">
            Estoque atual de Comida ({state.resources.comida}) garante{' '}
            <strong className="font-mono-tabular text-[#f0ebe1]">
              {livingSurvivors.length > 0
                ? Math.floor(state.resources.comida / livingSurvivors.length)
                : 0}
            </strong>{' '}
            manhã(s) completa(s) sem racionamento de fome.
          </p>
        </div>

        <div className="rounded-xl bg-[#191512] border border-[#2b241f] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#e7e2da]">
              Defesa e Estrutura do Abrigo
            </h3>
            <button
              type="button"
              onClick={onGoToUpgrades}
              className="text-xs font-semibold text-[#d9822b] hover:underline whitespace-nowrap"
            >
              Gerenciar Melhorias
            </button>
          </div>
          <div className="text-xs text-[#9e9185] flex flex-wrap items-center gap-x-2 gap-y-1">
            {UPGRADE_ORDER.map((upgId, idx) => {
              const built = state.upgrades[upgId].level > 0;
              return (
                <span key={upgId}>
                  {idx > 0 && <span aria-hidden="true">· </span>}
                  <span className={built ? 'text-[#52b788] font-semibold' : 'text-[#786d63]'}>
                    {SHELTER_UPGRADES[upgId].name}: {built ? 'Ativa' : 'Pendente'}
                  </span>
                </span>
              );
            })}
          </div>
          {state.lastNightReport && (
            <p className="text-xs text-[#b5a99c] pt-1">
              Última noite: {state.lastNightReport.eventTitle}
            </p>
          )}
        </div>
      </div>

      {/* Survivors Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-[#f0ebe1] uppercase">
              Grupo de Sobreviventes
            </h2>
            <p className="text-xs text-[#9e9185]">
              Trate feridos com Medicamentos ({state.resources.medicamentos}{' '}
              {RESOURCES_META.medicamentos.shortName} disponíveis) antes de enviá-los em missão.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {state.survivors.map((survivor) => (
            <SurvivorCard
              key={survivor.id}
              survivor={survivor}
              medicinesAvailable={state.resources.medicamentos}
              hasInfirmary={hasInfirmary}
              onHeal={onHealSurvivor}
            />
          ))}
        </div>
      </section>

      {/* Recent Happenings Log */}
      <section className="rounded-xl bg-[#171412] border border-[#29221d] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold tracking-wide text-[#e7e2da] uppercase">
            Acontecimentos Recentes
          </h3>
          <span className="text-xs text-[#8a7d71]">
            Últimos registros da campanha
          </span>
        </div>

        <ul className="divide-y divide-[#241f1b] text-xs">
          {state.history.slice(0, 5).map((item) => (
            <li key={item.id} className="py-2 flex items-start justify-between gap-3">
              <span
                className={
                  item.type === 'danger'
                    ? 'text-[#e05246]'
                    : item.type === 'warning'
                    ? 'text-[#d9822b]'
                    : item.type === 'success'
                    ? 'text-[#52b788]'
                    : 'text-[#c7bdb1]'
                }
              >
                {item.text}
              </span>
              <span className="font-mono-tabular text-[11px] text-[#786d63] whitespace-nowrap shrink-0">
                Dia {item.day}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
