import { useEffect, useState } from 'react';
import {
  CAMPAIGN_EVACUATION_GOAL,
  createInitialUpgrades,
  executeEvacuation,
  getShelterUpgradeCost,
  healShelterSurvivor,
  selectActiveSurvivor,
  SHELTER_UPGRADE_CATALOG,
  upgradeShelterStation,
} from '../action/actionRules.ts';
import type {
  DistrictId,
  PersistentShelterStash,
  ShelterUpgradeId,
} from '../action/actionTypes.ts';
import { DISTRICTS } from '../action/mapData.ts';
import {
  ResourceIconSvg,
  TitleBackdropSvg,
  TitleEmblemSvg,
} from '../components/SvgArt.tsx';

interface TitleScreenProps {
  stash: PersistentShelterStash;
  onStartGame: (districtId: DistrictId) => void;
  onResetStash: () => void;
  onUpdateStash?: (nextStash: PersistentShelterStash) => void;
}

export function TitleScreen({
  stash,
  onStartGame,
  onResetStash,
  onUpdateStash,
}: TitleScreenProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId>('vila_esperanca');
  const [activeTab, setActiveTab] = useState<'operacao' | 'sobreviventes' | 'melhorias'>('operacao');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame(selectedDistrict);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, selectedDistrict]);

  const survivors = stash.survivors ?? [];
  const upgradesMap = stash.upgrades ?? createInitialUpgrades();
  const upgradeEntries = (Object.keys(SHELTER_UPGRADE_CATALOG) as ShelterUpgradeId[]).map((id) => ({
    ...SHELTER_UPGRADE_CATALOG[id],
    level: upgradesMap[id] ?? 0,
  }));
  const activeSurvivor =
    survivors.find((s) => s.id === stash.activeSurvivorId && s.status !== 'morto') ||
    survivors.find((s) => s.status !== 'morto');
  const evacProgress = stash.evacuationProgress ?? 0;

  const handleUpgrade = (upgradeId: ShelterUpgradeId) => {
    if (!onUpdateStash) return;
    const res = upgradeShelterStation(stash, upgradeId);
    setStatusMessage(res.message);
    if (res.ok) {
      onUpdateStash(res.stash);
    }
  };

  const handleHealSurvivor = (survivorId: string) => {
    if (!onUpdateStash) return;
    const res = healShelterSurvivor(stash, survivorId);
    setStatusMessage(res.message);
    if (res.ok) {
      onUpdateStash(res.stash);
    }
  };

  const handleSelectSurvivor = (survivorId: string) => {
    if (!onUpdateStash) return;
    const nextStash = selectActiveSurvivor(stash, survivorId);
    onUpdateStash(nextStash);
    setStatusMessage('Operador selecionado para a próxima incursão.');
  };

  const handleEvacuate = () => {
    if (!onUpdateStash) return;
    const res = executeEvacuation(stash);
    setStatusMessage(res.message);
    if (res.ok) {
      onUpdateStash(res.stash);
    }
  };

  return (
    <div className="relative min-h-dvh w-full overflow-y-auto bg-[#0e0c0a] flex flex-col justify-between safe-area-screen sm:px-5 sm:py-3 select-none">
      {/* Atmospheric Post-Apocalyptic Key-Art Backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <TitleBackdropSvg />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0c0a]/96 via-[#0e0c0a]/86 to-[#0e0c0a]/55" />
      </div>

      {/* Responsive Landscape 2-Column / Portrait 1-Column Command Layout */}
      <div className="relative z-10 w-full max-w-5xl mx-auto my-auto grid grid-cols-1 landscape:grid-cols-12 lg:grid-cols-12 gap-2.5 sm:gap-4 items-start">
        {/* LEFT COLUMN (5 cols in landscape): Title Lockup, Shelter Stash & Primary CTA */}
        <div className="landscape:col-span-5 lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <TitleEmblemSvg className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.18em] uppercase text-[#c87a28]">
                Sobrevivência Urbana Tática · Dia {stash.day ?? 1}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#ebe5dc] uppercase leading-none mt-0.5">
                Último Dia
              </h1>
              <p className="font-display text-xs sm:text-sm font-semibold tracking-[0.22em] text-[#9e2a22] uppercase mt-0.5">
                Setor Vila Esperança
              </p>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-[#b8afa4] leading-relaxed landscape:hidden lg:block">
            Avance sob visibilidade tática restrita, escute ameaças ocultas na escuridão, gerencie os sobreviventes e expanda as estações do abrigo para preparar a evacuação final.
          </p>

          {/* Persistent Shelter Stash Readout + Evacuation Progress */}
          <div
            className="w-full rounded-sm bg-[#12100e]/95 border border-[#2e2722] p-2 sm:p-2.5 space-y-1.5 shadow-2xl"
            aria-label="Estoque persistido no abrigo"
          >
            <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] sm:text-[10px] border-b border-[#241f1b] pb-1">
              <span className="font-bold uppercase tracking-widest text-[#c87a28]">
                Inventário do Abrigo · Dia {stash.day ?? 1}
              </span>
              <span className="text-[#8c8277] font-mono-tabular">
                Extrações: {stash.runsExtracted} · Baixas: {stash.runsDied} · Abates: {stash.totalZombiesKilled}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 landscape:grid-cols-2 lg:grid-cols-4 gap-1.5">
              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2 py-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ResourceIconSvg type="comida" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-[#b8afa4]">Rações</span>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                  {stash.totalStash.comida}
                </span>
              </div>

              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2 py-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ResourceIconSvg type="medicamentos" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-[#b8afa4]">Remédios</span>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                  {stash.totalStash.medicamentos}
                </span>
              </div>

              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2 py-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ResourceIconSvg type="municao" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-[#b8afa4]">Munição</span>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                  {stash.totalStash.municao}
                </span>
              </div>

              <div className="rounded-sm bg-[#0c0a09] border border-[#241f1b] px-2 py-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ResourceIconSvg type="materiais" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-[#b8afa4]">Sucata</span>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-[#ebe5dc]">
                  {stash.totalStash.materiais}
                </span>
              </div>
            </div>

            {/* Campaign Evacuation Goal Bar */}
            <div className="pt-1 border-t border-[#241f1b] space-y-1">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                <span className="font-bold uppercase tracking-wider text-[#52b788] truncate pr-2">
                  {stash.evacuationCompleted
                    ? '✅ Evacuação Concluída — Resgate Aéreo Realizado'
                    : `Plano de Evacuação (Rádio Nv.${CAMPAIGN_EVACUATION_GOAL.radioLevelRequired} + Suprimentos)`}
                </span>
                <span className="font-mono-tabular font-bold text-[#ebe5dc] shrink-0">
                  {evacProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#090807] border border-[#1f1a17] overflow-hidden">
                <div
                  className="h-full bg-[#52b788] transition-all duration-150"
                  style={{ width: `${Math.min(100, evacProgress)}%` }}
                />
              </div>
              {evacProgress >= 80 && !stash.evacuationCompleted && (
                <button
                  type="button"
                  data-testid="shelter-evacuate-btn"
                  onClick={handleEvacuate}
                  className="mt-1 w-full py-1.5 px-3 rounded-sm bg-[#193326] hover:bg-[#224634] border border-[#52b788] text-[#ebe5dc] text-[11px] font-bold uppercase tracking-wider"
                >
                  🚁 Acionar Evacuação Final do Abrigo
                </button>
              )}
            </div>
          </div>

          {/* Primary & Secondary CTAs (Utilitarian Tactical Buttons) */}
          <div className="w-full flex flex-row items-center gap-2">
            <button
              type="button"
              data-start="true"
              data-testid="start-incursion-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame(selectedDistrict);
              }}
              className="min-h-[40px] sm:min-h-[42px] flex-1 px-4 py-2 rounded-sm bg-[#8f241b] hover:bg-[#a82c21] border border-[#b93829] active:scale-[0.99] text-[#f5f0e6] font-display text-sm sm:text-base font-bold tracking-[0.14em] uppercase transition-colors shadow-lg shadow-black/60 whitespace-nowrap"
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
                className="min-h-[40px] sm:min-h-[42px] px-3 py-2 rounded-sm bg-[#161311] hover:bg-[#211c19] text-[#a89d91] border border-[#2e2722] text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap"
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
                className="min-h-[40px] sm:min-h-[42px] px-3 py-2 rounded-sm bg-[#5e1410] hover:bg-[#781a15] border border-[#9e2a22] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
              >
                Confirmar Exclusão
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols in landscape): Shelter Management Tabs & Active Panel */}
        <div className="landscape:col-span-7 lg:col-span-7 flex flex-col gap-2 w-full">
          {/* Navigation Tabs: Setor de Operação | Equipe do Abrigo | Melhorias */}
          <div className="w-full grid grid-cols-3 gap-1.5 border-b border-[#2b241e] pb-1.5">
            <button
              type="button"
              data-testid="tab-operacao"
              onClick={() => setActiveTab('operacao')}
              className={`min-h-[36px] px-1.5 py-1.5 rounded-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-colors text-center truncate ${
                activeTab === 'operacao'
                  ? 'bg-[#1e1713] border-[#e09132] text-[#e09132]'
                  : 'bg-[#12100e] border-[#26201b] text-[#a89d91]'
              }`}
            >
              1. Incursão ({activeSurvivor ? activeSurvivor.name.split(' ')[0] : 'Equipe'})
            </button>
            <button
              type="button"
              data-testid="tab-sobreviventes"
              onClick={() => setActiveTab('sobreviventes')}
              className={`min-h-[36px] px-1.5 py-1.5 rounded-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-colors text-center truncate ${
                activeTab === 'sobreviventes'
                  ? 'bg-[#1e1713] border-[#e09132] text-[#e09132]'
                  : 'bg-[#12100e] border-[#26201b] text-[#a89d91]'
              }`}
            >
              2. Sobreviventes ({survivors.filter((s) => s.status !== 'morto').length}/{survivors.length})
            </button>
            <button
              type="button"
              data-testid="tab-melhorias"
              onClick={() => setActiveTab('melhorias')}
              className={`min-h-[36px] px-1.5 py-1.5 rounded-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-colors text-center truncate ${
                activeTab === 'melhorias'
                  ? 'bg-[#1e1713] border-[#e09132] text-[#e09132]'
                  : 'bg-[#12100e] border-[#26201b] text-[#a89d91]'
              }`}
            >
              3. Estações ({upgradeEntries.reduce((s, u) => s + u.level, 0)})
            </button>
          </div>

          {statusMessage && (
            <div
              data-testid="shelter-status-banner"
              className="w-full rounded-sm bg-[#1b1612] border border-[#c87a28]/60 px-3 py-1.5 text-xs text-[#fef3c7]"
            >
              {statusMessage}
            </div>
          )}

          {/* TAB 1: District Exploration Selector */}
          {activeTab === 'operacao' && (
            <div className="w-full space-y-2" aria-label="Seleção do Distrito de Incursão">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-[#c87a28]">
                  Setor de Operação
                </span>
                <span className="text-[#8c8277]">
                  {selectedDistrict === 'vila_esperanca'
                    ? '🍃 Vento Uivante & Becos'
                    : selectedDistrict === 'centro_comercial'
                    ? '🚨 Sirenes Distantes & Avenidas'
                    : '⚡ Geradores & Corredores'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 landscape:grid-cols-3 gap-2">
                {DISTRICTS.map((d) => {
                  const isSelected = selectedDistrict === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDistrict(d.id)}
                      className={`text-left p-2.5 rounded-sm border transition-all ${
                        isSelected
                          ? 'bg-[#1e1713] border-[#e09132] shadow-md shadow-amber-950/40 ring-1 ring-[#e09132]'
                          : 'bg-[#100e0c]/90 border-[#2b241e] hover:border-[#4a3e35]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold uppercase tracking-wide ${
                            isSelected ? 'text-[#e09132]' : 'text-[#ebe5dc]'
                          }`}
                        >
                          {d.id === 'vila_esperanca'
                            ? '1. Residencial'
                            : d.id === 'centro_comercial'
                            ? '2. Comercial'
                            : '3. Hospitalar'}
                        </span>
                        <span className="text-[10px] text-[#8c8277]">
                          {d.initialTimeOfDay === 'noite'
                            ? '🌙 Noite'
                            : d.initialTimeOfDay === 'madrugada'
                            ? '🌘 Escuro'
                            : '🌅 Crepúsculo'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#a89d91] line-clamp-1 mt-0.5">{d.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Survivors Roster & Medical Treatment */}
          {activeTab === 'sobreviventes' && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 landscape:grid-cols-3 gap-2">
              {survivors.map((surv) => {
                const isSelected = stash.activeSurvivorId === surv.id;
                const isDead = surv.status === 'morto';
                return (
                  <div
                    key={surv.id}
                    data-testid={`survivor-card-${surv.id}`}
                    className={`rounded-sm p-2.5 border flex flex-col justify-between gap-2 ${
                      isDead
                        ? 'bg-[#140d0c]/80 border-[#4a1c18] opacity-65'
                        : isSelected
                        ? 'bg-[#1c1612] border-[#e09132]'
                        : 'bg-[#12100e] border-[#2b241e]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#ebe5dc]">{surv.name}</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                            surv.status === 'saudavel'
                              ? 'bg-[#132a1f] text-[#52b788]'
                              : surv.status === 'ferido'
                              ? 'bg-[#3b1d11] text-[#f59e0b]'
                              : 'bg-[#3d1210] text-[#ef4444]'
                          }`}
                        >
                          {surv.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8c8277]">{surv.role}</p>
                      <div className="mt-1 text-[11px] font-mono-tabular text-[#d6cec2]">
                        PV: {surv.hp}/{surv.maxHp}
                      </div>
                    </div>

                    {!isDead && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          data-testid={`select-survivor-${surv.id}`}
                          disabled={isSelected}
                          onClick={() => handleSelectSurvivor(surv.id)}
                          className="flex-1 py-1 px-2 rounded-sm bg-[#1f1a16] hover:bg-[#2c241e] disabled:opacity-50 border border-[#3a3028] text-[10px] font-bold uppercase text-[#ebe5dc]"
                        >
                          {isSelected ? 'Ativo' : 'Selecionar'}
                        </button>
                        {surv.hp < surv.maxHp && (
                          <button
                            type="button"
                            data-testid={`heal-survivor-${surv.id}`}
                            disabled={stash.totalStash.medicamentos < 1}
                            onClick={() => handleHealSurvivor(surv.id)}
                            className="py-1 px-2 rounded-sm bg-[#132a1f] hover:bg-[#1b3d2d] disabled:opacity-40 border border-[#3e6b4e] text-[10px] font-bold uppercase text-[#52b788]"
                          >
                            🩹 Curar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Shelter Upgrades & Base Stations */}
          {activeTab === 'melhorias' && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2 gap-2">
              {upgradeEntries.map((up) => {
                const cost = getShelterUpgradeCost(up.id, up.level);
                const isMax = up.level >= up.maxLevel;
                return (
                  <div
                    key={up.id}
                    data-testid={`upgrade-card-${up.id}`}
                    className="rounded-sm bg-[#12100e] border border-[#2b241e] p-2.5 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-[#e09132]">
                          {up.name}
                        </span>
                        <span className="text-[10px] font-mono-tabular text-[#ebe5dc]">
                          Nv. {up.level}/{up.maxLevel}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#a89d91] mt-0.5">{up.description}</p>
                      <p className="text-[10px] text-[#52b788] mt-1 font-mono-tabular">
                        {up.effectSummary(up.level)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#211c18]">
                      {cost && !isMax ? (
                        <span className="text-[10px] font-mono-tabular text-[#b8afa4]">
                          Custo: {cost.materiais ?? 0} Sucata
                          {cost.medicamentos ? ` · ${cost.medicamentos} Rem.` : ''}
                          {cost.comida ? ` · ${cost.comida} Raç.` : ''}
                          {cost.municao ? ` · ${cost.municao} Mun.` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-[#52b788]">
                          Nível Máximo
                        </span>
                      )}

                      {!isMax && (
                        <button
                          type="button"
                          data-testid={`btn-upgrade-${up.id}`}
                          onClick={() => handleUpgrade(up.id)}
                          className="py-1 px-2.5 rounded-sm bg-[#261d14] hover:bg-[#36291c] border border-[#c87a28] text-[10px] font-bold uppercase text-[#fef3c7]"
                        >
                          Aprimorar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Safe Margin Control Hint */}
      <div className="relative z-10 pt-2 text-[10px] sm:text-[11px] text-[#7a7066] tracking-wide max-w-5xl mx-auto w-full">
        WASD ou Analógico Esq.: Mover · Controle de Mira: Apontar · Botão Dir.: Disparar/Golpear · Q: Arma · R: Recarregar · E: Saquear/Extrair
      </div>
    </div>
  );
}
