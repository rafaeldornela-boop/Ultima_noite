import { useState } from 'react';
import { LOCATIONS, LOCATION_LIST } from '../data/locations.ts';
import {
  EQUIPMENT_LIST,
  RESOURCE_ORDER,
  RESOURCES_META,
} from '../data/resources.ts';
import { ATTRIBUTE_LABELS } from '../data/survivors.ts';
import {
  calculateBackpackCapacity,
  canEquipItem,
  canSelectCardOption,
  getAvailableSurvivorsForExpedition,
  getCurrentExpeditionCard,
  getTeamAttributeScore,
} from '../game/rules.ts';
import type {
  AttributeType,
  CampaignState,
  EquipmentId,
  LocationId,
} from '../game/types.ts';
import {
  AttributeIconSvg,
  LocationIllustrationSvg,
  ResourceIconSvg,
} from '../components/SvgArt.tsx';
import { SurvivorCard } from '../components/SurvivorCard.tsx';

const ATTRIBUTE_KEYS: AttributeType[] = [
  'combate',
  'percepcao',
  'tecnica',
  'resistencia',
];

interface ExpeditionScreenProps {
  state: CampaignState;
  onStartExpedition: (
    locationId: LocationId,
    teamIds: string[],
    equipmentIds: EquipmentId[]
  ) => void;
  onResolveCardOption: (optionId: string) => void;
  onRetreatExpedition: () => void;
  onConcludeReturn: () => void;
  onAdvanceNextDay: () => void;
  onHealSurvivor: (survivorId: string) => void;
}

export function ExpeditionScreen({
  state,
  onStartExpedition,
  onResolveCardOption,
  onRetreatExpedition,
  onConcludeReturn,
  onAdvanceNextDay,
  onHealSurvivor,
}: ExpeditionScreenProps) {
  const availableSurvivors = getAvailableSurvivorsForExpedition(state);

  const [selectedLocation, setSelectedLocation] =
    useState<LocationId>('supermercado');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() =>
    availableSurvivors.slice(0, 2).map((s) => s.id)
  );
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<
    EquipmentId[]
  >(['lanterna_tatica']);
  const [confirmRetreat, setConfirmRetreat] = useState(false);

  // Keep selectedTeamIds valid if someone died
  const validSelectedTeamIds = selectedTeamIds.filter((id) =>
    availableSurvivors.some((s) => s.id === id)
  );
  const effectiveTeamIds =
    validSelectedTeamIds.length > 0
      ? validSelectedTeamIds
      : availableSurvivors.slice(0, 1).map((s) => s.id);

  const toggleSurvivor = (id: string) => {
    setSelectedTeamIds((prev) => {
      const cleaned = prev.filter((item) =>
        availableSurvivors.some((s) => s.id === item)
      );
      if (cleaned.includes(id)) {
        if (cleaned.length <= 1) return cleaned; // Keep at least 1 selected for preview
        return cleaned.filter((item) => item !== id);
      }
      if (cleaned.length >= 3) return cleaned;
      return [...cleaned, id];
    });
  };

  const toggleEquipment = (eqId: EquipmentId) => {
    if (!canEquipItem(state, eqId)) return;
    setSelectedEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((i) => i !== eqId) : [...prev, eqId]
    );
  };

  // CASE 1: Active Expedition in progress
  if (state.phase === 'expedicao' && state.activeExpedition) {
    const exp = state.activeExpedition;
    const loc = LOCATIONS[exp.locationId];
    const currentCard = getCurrentExpeditionCard(state);
    const weightPercent =
      exp.maxBackpackCapacity > 0
        ? Math.min(
            100,
            Math.round((exp.currentBackpackWeight / exp.maxBackpackCapacity) * 100)
          )
        : 0;

    return (
      <div className="space-y-5">
        {/* Expedition Top Bar: Destination, Progress & Backpack Meter */}
        <section className="rounded-2xl bg-[#1b1714] border border-[#332a24] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
                Em Missão · {loc.name}
              </div>
              <h2 className="font-display text-xl font-bold text-[#f5f0e6]">
                Evento {Math.min(exp.currentCardIndex + 1, exp.deckCardIds.length)} de{' '}
                {exp.deckCardIds.length}
              </h2>
            </div>

            {!confirmRetreat ? (
              <button
                type="button"
                onClick={() => setConfirmRetreat(true)}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#261e1b] hover:bg-[#332622] text-[#e7e2da] border border-[#4a3731] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Recuar para o Abrigo
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRetreat(false);
                    onRetreatExpedition();
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#b93829] hover:bg-[#cc4333] text-white text-xs font-bold whitespace-nowrap"
                >
                  Confirmar Retirada
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRetreat(false)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#241f1b] text-[#c7bdb1] text-xs font-semibold whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Backpack Weight Progress Bar */}
          <div className="space-y-1.5 pt-2 border-t border-[#29221d]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#c7bdb1]">
                Ocupação da Mochila da Equipe
              </span>
              <span className="font-mono-tabular font-bold text-[#f0ebe1]">
                {exp.currentBackpackWeight} / {exp.maxBackpackCapacity} espaços ({weightPercent}%)
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-[#12100e] border border-[#2c2520] overflow-hidden">
              <div
                className={`h-full transition-transform duration-150 origin-left ${
                  weightPercent >= 90
                    ? 'bg-[#b93829]'
                    : weightPercent >= 70
                    ? 'bg-[#d9822b]'
                    : 'bg-[#458b69]'
                }`}
                style={{ transform: `scaleX(${weightPercent / 100})` }}
              />
            </div>

            {/* Loot currently in backpack */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#b5a99c]">
              <span>Na mochila:</span>
              {RESOURCE_ORDER.map((resKey) => {
                const qty = exp.backpackLoot[resKey];
                if (qty <= 0) return null;
                return (
                  <span
                    key={resKey}
                    className="inline-flex items-center gap-1 font-mono-tabular text-[#f0ebe1]"
                  >
                    <ResourceIconSvg type={resKey} className="w-3.5 h-3.5" />
                    <span>
                      +{qty} {RESOURCES_META[resKey].shortName} (peso{' '}
                      {qty * RESOURCES_META[resKey].unitWeight})
                    </span>
                  </span>
                );
              })}
              {exp.currentBackpackWeight === 0 && (
                <span className="text-[#786d63]">Nenhum item coletado ainda</span>
              )}
            </div>
          </div>
        </section>

        {/* Last Resolution Feedback Banner */}
        {exp.lastResolution && (
          <section
            aria-live="polite"
            className={`rounded-xl p-4 border space-y-2 ${
              exp.lastResolution.succeeded
                ? 'bg-[#17211b] border-[#2d4a3a]'
                : 'bg-[#261816] border-[#6e2920]'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#f0ebe1]">
                Resultado Anterior: {exp.lastResolution.cardTitle}
              </span>
              <span
                className={`font-semibold ${
                  exp.lastResolution.succeeded
                    ? 'text-[#52b788]'
                    : 'text-[#e05246]'
                }`}
              >
                {exp.lastResolution.succeeded ? 'Sucesso na Ação' : 'Complicação'}
              </span>
            </div>
            <p className="text-xs text-[#e7e2da] leading-relaxed">
              {exp.lastResolution.narrative}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#c7bdb1]">
              {Object.entries(exp.lastResolution.lootAdded).map(([k, v]) =>
                v ? (
                  <span key={k} className="text-[#52b788] font-mono-tabular font-semibold">
                    +{v} {RESOURCES_META[k as keyof typeof RESOURCES_META].name} na mochila
                  </span>
                ) : null
              )}
              {Object.entries(exp.lastResolution.lootDiscarded).map(([k, v]) =>
                v ? (
                  <span key={k} className="text-[#d9822b] font-mono-tabular">
                    {v} {RESOURCES_META[k as keyof typeof RESOURCES_META].name} deixado(s) (mochila cheia)
                  </span>
                ) : null
              )}
              {exp.lastResolution.damageTaken.map((d, idx) => (
                <span key={idx} className="text-[#e05246] font-semibold">
                  {d.survivorName}: -{d.amount} PV {d.died ? '(MORTE PERMANENTE)' : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Active Event Card */}
        {currentCard && (
          <article className="rounded-2xl bg-[#1c1714] border-2 border-[#3d322a] overflow-hidden shadow-xl">
            <div className="p-5 bg-[#221c18] border-b border-[#332a24] flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#d9822b] uppercase tracking-wider">
                  {currentCard.dangerTag} · {currentCard.context}
                </p>
                <h3 className="font-display text-2xl font-bold text-[#f5f0e6] mt-0.5">
                  {currentCard.title}
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm sm:text-base text-[#e7e2da] leading-relaxed">
                {currentCard.description}
              </p>

              {/* Decision Options */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#9e9185]">
                  Escolha a ação da equipe:
                </div>

                {currentCard.options.map((opt) => {
                  const check = canSelectCardOption(state, opt);
                  const teamAttrScore = opt.testedAttribute
                    ? getTeamAttributeScore(
                        state,
                        exp.teamIds,
                        exp.equipmentIds,
                        opt.testedAttribute
                      )
                    : null;

                  const riskColor =
                    opt.risk === 'Alto' || opt.risk === 'Crítico'
                      ? 'text-[#e05246]'
                      : opt.risk === 'Moderado'
                      ? 'text-[#d9822b]'
                      : 'text-[#52b788]';

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!check.allowed}
                      onClick={() => onResolveCardOption(opt.id)}
                      className={`w-full text-left rounded-xl p-4 border transition-all flex flex-col gap-2 ${
                        check.allowed
                          ? 'bg-[#161311] hover:bg-[#231d19] border-[#382f28] hover:border-[#d9822b] active:scale-[0.99]'
                          : 'bg-[#13110f] border-[#221d19] opacity-55 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-display text-base font-bold text-[#f5f0e6]">
                          {opt.label}
                        </span>
                        <span className={`text-xs font-semibold ${riskColor}`}>
                          Risco {opt.risk}
                        </span>
                      </div>

                      <p className="text-xs text-[#b5a99c] leading-relaxed">
                        {opt.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-[#9e9185]">
                        {opt.testedAttribute && opt.difficulty !== undefined && (
                          <span className="inline-flex items-center gap-1 font-mono-tabular text-[#e7e2da]">
                            <AttributeIconSvg
                              attribute={opt.testedAttribute}
                              className="w-3.5 h-3.5"
                            />
                            <span>
                              {ATTRIBUTE_LABELS[opt.testedAttribute]}: Equipe {teamAttrScore} vs Alvo{' '}
                              {opt.difficulty}
                            </span>
                          </span>
                        )}

                        {opt.requirements?.resource && opt.requirements.amount && (
                          <span className="font-mono-tabular text-[#d9822b]">
                            Requer {opt.requirements.amount}{' '}
                            {RESOURCES_META[opt.requirements.resource].name}
                          </span>
                        )}

                        {!check.allowed && check.reason && (
                          <span className="text-[#e05246] font-semibold">
                            Indisponível: {check.reason}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        )}
      </div>
    );
  }

  // CASE 2: Expedition Return Summary ('retorno')
  if (state.phase === 'retorno' && state.activeExpedition) {
    const exp = state.activeExpedition;
    const loc = LOCATIONS[exp.locationId];

    return (
      <div className="space-y-6">
        <section className="rounded-2xl bg-[#1c1714] border border-[#332a24] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
                Etapa 4: Relatório de Retorno · {loc.name}
              </p>
              <h2 className="font-display text-2xl font-bold text-[#f5f0e6] mt-0.5">
                {exp.status === 'concluida'
                  ? 'Rota de Exploração Concluída'
                  : 'Retirada Tática Executada'}
              </h2>
            </div>
            <span className="font-mono-tabular text-xs text-[#b5a99c]">
              Peso transportado: {exp.currentBackpackWeight}/{exp.maxBackpackCapacity}
            </span>
          </div>

          {exp.lastResolution && (
            <div className="rounded-xl bg-[#151210] border border-[#29221d] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#d9822b]">
                Último Evento ({exp.lastResolution.cardTitle}):
              </div>
              <p className="text-xs text-[#e7e2da] leading-relaxed">
                {exp.lastResolution.narrative}
              </p>
            </div>
          )}

          {/* Loot Summary to be added to Shelter */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#e7e2da]">
              Itens na Mochila Prontos para Transferência:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {RESOURCE_ORDER.map((resKey) => {
                const count = exp.backpackLoot[resKey];
                return (
                  <div
                    key={resKey}
                    className={`rounded-xl p-3 border flex items-center justify-between ${
                      count > 0
                        ? 'bg-[#1c241e] border-[#385743]'
                        : 'bg-[#151210] border-[#26201b] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ResourceIconSvg type={resKey} className="w-4 h-4" />
                      <span className="text-xs text-[#c7bdb1]">
                        {RESOURCES_META[resKey].shortName}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-sm font-bold text-[#f0ebe1]">
                      +{count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={exp.rewardsClaimed}
              onClick={onConcludeReturn}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-[#458b69] hover:bg-[#52a37c] disabled:opacity-50 text-[#f5f0e6] font-display text-base font-bold tracking-wider uppercase transition-colors"
            >
              {exp.rewardsClaimed
                ? 'Recursos Já Incorporados'
                : 'Incorporar Recursos ao Abrigo'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // CASE 3: Novo Dia (Expedition already finished today)
  if (state.phase === 'novo_dia') {
    return (
      <div className="rounded-2xl bg-[#1c1714] border border-[#332a24] p-6 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#52b788]">
          Expedição do Dia {state.day} Finalizada
        </div>
        <h2 className="font-display text-2xl font-bold text-[#f5f0e6]">
          Os Suprimentos Foram Guardados no Abrigo
        </h2>
        <p className="text-sm text-[#c7bdb1] max-w-xl leading-relaxed">
          A equipe já retornou da missão de hoje. Verifique se há feridos que precisam de Medicamentos ou construa melhorias antes de avançar para o próximo dia.
        </p>
        <button
          type="button"
          onClick={onAdvanceNextDay}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-[#d9822b] hover:bg-[#e5923e] text-[#12100e] font-display text-base font-bold tracking-wider uppercase transition-colors"
        >
          Encerrar Dia {state.day} e Dormir
        </button>
      </div>
    );
  }

  // CASE 4: Preparation Phase ('manha' or 'preparacao')
  const previewCapacity = calculateBackpackCapacity(
    state,
    effectiveTeamIds,
    selectedEquipmentIds
  );

  return (
    <div className="space-y-6">
      {/* Step 1: Choose Destination Location */}
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
            Passo 1 de 3 · Destino da Missão
          </p>
          <h2 className="font-display text-xl font-bold text-[#f5f0e6] uppercase">
            Escolha o Local de Exploração
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCATION_LIST.map((loc) => {
            const isSelected = selectedLocation === loc.id;
            const dangerColor =
              loc.danger === 'Extremo'
                ? 'text-[#e05246]'
                : loc.danger === 'Alto'
                ? 'text-[#d9822b]'
                : 'text-[#52b788]';

            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocation(loc.id)}
                className={`text-left rounded-2xl overflow-hidden border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#231d18] border-[#d9822b] ring-1 ring-[#d9822b]'
                    : 'bg-[#191512] border-[#2c2520] hover:border-[#473b32]'
                }`}
              >
                <div>
                  <LocationIllustrationSvg
                    locationId={loc.id}
                    className="w-full h-28 object-cover border-b border-[#29221d]"
                  />
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-[#f5f0e6]">
                        {loc.name}
                      </h3>
                      <span className={`text-xs font-semibold ${dangerColor}`}>
                        Perigo {loc.danger}
                      </span>
                    </div>
                    <p className="text-xs text-[#b5a99c] leading-relaxed">
                      {loc.description}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-[#14110f] border-t border-[#241f1b] flex items-center justify-between text-xs text-[#9e9185]">
                  <div className="flex items-center gap-2">
                    <span>Recursos prováveis:</span>
                    <div className="flex items-center gap-1.5">
                      {loc.primaryResources.map((r) => (
                        <ResourceIconSvg key={r} type={r} className="w-4 h-4" />
                      ))}
                    </div>
                  </div>
                  <span className="font-mono-tabular">
                    {loc.expeditionLength} eventos
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Select Equipment Loadout */}
      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
            Passo 2 de 3 · Equipamentos Táticos
          </p>
          <h2 className="font-display text-xl font-bold text-[#f5f0e6] uppercase">
            Selecione os Equipamentos da Equipe
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EQUIPMENT_LIST.map((eq) => {
            const available = canEquipItem(state, eq.id);
            const isChecked =
              available && selectedEquipmentIds.includes(eq.id);

            return (
              <button
                key={eq.id}
                type="button"
                disabled={!available}
                onClick={() => toggleEquipment(eq.id)}
                className={`min-h-[48px] text-left rounded-xl p-3.5 border transition-colors flex flex-col justify-between gap-2 ${
                  !available
                    ? 'bg-[#14110f] border-[#221d19] opacity-50 cursor-not-allowed'
                    : isChecked
                    ? 'bg-[#241e19] border-[#d9822b]'
                    : 'bg-[#191512] border-[#2c2520] hover:border-[#42372f]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#f0ebe1]">
                      {eq.name}
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold text-[#d9822b]">
                      +{eq.bonusAmount} {ATTRIBUTE_LABELS[eq.bonusAttribute]}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9e9185] leading-relaxed">
                    {eq.description}
                  </p>
                </div>

                <div className="text-[11px] font-semibold">
                  {!available && eq.requiresResource ? (
                    <span className="text-[#e05246]">
                      Sem {RESOURCES_META[eq.requiresResource.type].name} no abrigo
                    </span>
                  ) : isChecked ? (
                    <span className="text-[#52b788]">Equipado na Mochila</span>
                  ) : (
                    <span className="text-[#8a7d71]">Toque para equipar</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Select Survivors & Inspect Team Aptitudes */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
              Passo 3 de 3 · Escalação ({effectiveTeamIds.length} selecionado(s))
            </p>
            <h2 className="font-display text-xl font-bold text-[#f5f0e6] uppercase">
              Escolha os Sobreviventes da Expedição
            </h2>
          </div>

          <div className="text-xs text-[#b5a99c] font-mono-tabular">
            Capacidade da Mochila:{' '}
            <strong className="text-[#d9822b]">{previewCapacity} espaços</strong>
          </div>
        </div>

        {/* Live Team Aptitudes Summary Strip */}
        <div className="rounded-xl bg-[#171412] border border-[#2c2520] p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ATTRIBUTE_KEYS.map((attr) => {
            const score = getTeamAttributeScore(
              state,
              effectiveTeamIds,
              selectedEquipmentIds.filter((id) => canEquipItem(state, id)),
              attr
            );
            return (
              <div
                key={attr}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1d1815] border border-[#2b241f]"
              >
                <div className="flex items-center gap-1.5">
                  <AttributeIconSvg attribute={attr} className="w-4 h-4" />
                  <span className="text-xs text-[#c7bdb1]">
                    {ATTRIBUTE_LABELS[attr]}
                  </span>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-[#f0ebe1]">
                  {score}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {state.survivors.map((survivor) => (
            <SurvivorCard
              key={survivor.id}
              survivor={survivor}
              medicinesAvailable={state.resources.medicamentos}
              hasInfirmary={state.upgrades.enfermaria.level > 0}
              onHeal={onHealSurvivor}
              selectable={true}
              selected={effectiveTeamIds.includes(survivor.id)}
              onToggleSelect={toggleSurvivor}
            />
          ))}
        </div>
      </section>

      {/* Launch Expedition Action Bar */}
      <section className="rounded-2xl bg-[#1e1815] border border-[#3d3129] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-[#c7bdb1] space-y-0.5">
          <div className="font-bold text-sm text-[#f5f0e6]">
            Destino: {LOCATIONS[selectedLocation].name} · Equipe: {effectiveTeamIds.length}{' '}
            sobrevivente(s)
          </div>
          <div>
            Mochila máxima: {previewCapacity} espaços · Perigo:{' '}
            {LOCATIONS[selectedLocation].danger}
          </div>
        </div>

        <button
          type="button"
          disabled={effectiveTeamIds.length === 0}
          onClick={() =>
            onStartExpedition(
              selectedLocation,
              effectiveTeamIds,
              selectedEquipmentIds.filter((id) => canEquipItem(state, id))
            )
          }
          className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-[#b93829] hover:bg-[#cc4333] disabled:opacity-50 text-[#f5f0e6] font-display text-base font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
        >
          Iniciar Expedição Agora
        </button>
      </section>
    </div>
  );
}
