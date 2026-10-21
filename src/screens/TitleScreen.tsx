import { useState } from 'react';
import {
  CITY_OBJECTIVES_CATALOG,
  DEFAULT_MAX_CARRY_CAPACITY,
  purchaseShelterUpgrade,
  SHELTER_UPGRADE_CATALOG,
} from '../action/actionRules.ts';
import type {
  DistrictId,
  PersistentShelterStash,
  ShelterUpgradeId,
} from '../action/actionTypes.ts';
import { DISTRICTS } from '../action/mapData.ts';
import { CityCinematicBackdropSvg, DistrictVisualCardArt } from '../components/CityArt.tsx';
import { ResourceIconSvg, TitleEmblemSvg } from '../components/SvgArt.tsx';

interface TitleScreenProps {
  stash: PersistentShelterStash;
  onStartGame: (districtId: DistrictId) => void;
  onResetStash: () => void;
  onUpdateStash: (nextStash: PersistentShelterStash) => void;
}

type ActiveModal = 'none' | 'gear' | 'objectives' | 'history';

export function TitleScreen({
  stash,
  onStartGame,
  onResetStash,
  onUpdateStash,
}: TitleScreenProps) {
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictId>('vila_esperanca');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const selectedDef =
    DISTRICTS.find((d) => d.id === selectedDistrict) ?? DISTRICTS[0];

  const discoveredSet = new Set<DistrictId>(
    stash.discoveredDistricts ?? ['vila_esperanca']
  );
  const completedObjSet = new Set<string>(stash.completedObjectiveIds ?? []);
  const discoveredIntelIds = new Set<string>(stash.discoveredIntelIds ?? []);

  // Calculate operator stats from field equipment upgrades
  const workshopLvl = stash.upgrades?.oficina ?? 0;
  const enfLvl = stash.upgrades?.enfermaria ?? 0;
  const radioLvl = stash.upgrades?.torre_radio ?? 0;

  const operatorMaxHp = 100 + enfLvl * 15;
  const carryCapacity = DEFAULT_MAX_CARRY_CAPACITY + workshopLvl * 6;
  const bonusReserveAmmo = workshopLvl * 4;
  const flashlightBonusPx = radioLvl * 38;

  const handleUpgradeGear = (upgradeId: ShelterUpgradeId) => {
    const res = purchaseShelterUpgrade(stash, upgradeId);
    setFeedbackBanner(res.message);
    if (res.ok) {
      onUpdateStash(res.stash);
    }
  };

  const discoveredIntelEntries = CITY_OBJECTIVES_CATALOG.filter(
    (obj) => discoveredIntelIds.has(obj.intelId) || completedObjSet.has(obj.id)
  );

  return (
    <main className="relative min-h-screen w-full bg-[#0a0807] text-[#ebe5dc] overflow-x-hidden flex flex-col justify-between select-none font-sans">
      {/* High-Impact Cinematic City Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 scale-110 blur-[1px] opacity-40">
          <CityCinematicBackdropSvg />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/95 via-[#0a0807]/40 to-[#0a0807]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,8,7,0.8)_100%)]" />
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 py-6 landscape:py-4 flex-1 flex flex-col gap-6">
        
        {/* HEADER: Identity Branding & Permanent Stash Strip */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-3">
              <TitleEmblemSvg className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_20px_rgba(224,145,50,0.4)]" />
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#e09132] opacity-80">
                  Sobrevivência Urbana
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tighter text-white leading-none">
                  Último Dia
                </h1>
              </div>
            </div>
          </div>

          {/* Quick-Access Resources & Workbench */}
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm shadow-xl">
               <div className="flex items-center gap-1.5" title="Comida">
                 <ResourceIconSvg type="comida" className="w-4 h-4" />
                 <span className="font-mono text-sm font-bold">{stash.totalStash.comida}</span>
               </div>
               <div className="flex items-center gap-1.5" title="Medicamentos">
                 <ResourceIconSvg type="medicamentos" className="w-4 h-4" />
                 <span className="font-mono text-sm font-bold">{stash.totalStash.medicamentos}</span>
               </div>
               <div className="flex items-center gap-1.5" title="Munição">
                 <ResourceIconSvg type="municao" className="w-4 h-4" />
                 <span className="font-mono text-sm font-bold">{stash.totalStash.municao}</span>
               </div>
               <div className="flex items-center gap-1.5" title="Materiais">
                 <ResourceIconSvg type="materiais" className="w-4 h-4" />
                 <span className="font-mono text-sm font-bold">{stash.totalStash.materiais}</span>
               </div>
             </div>

             <button
               type="button"
               onClick={() => setActiveModal('gear')}
               className="w-10 h-10 rounded-sm bg-[#e09132] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
               title="Oficina de Campo"
             >
               <span className="text-xl">🛠️</span>
             </button>
          </div>
        </header>

        {/* CENTERPIECE: Connected City Map with Visual District Cards */}
        <section className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#38bdf8]">
              Mapa da Cidade
            </h2>
            <p className="text-xs text-[#8c8277] uppercase tracking-widest">
              Selecione um distrito conectado para iniciar a incursão
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto w-full">
            {DISTRICTS.map((dist) => {
              const active = dist.id === selectedDistrict;
              const isDiscovered = discoveredSet.has(dist.id);
              const threat = dist.id === 'vila_esperanca' ? 'BAIXA' : dist.id === 'centro_comercial' ? 'MÉDIA' : 'ALTA';
              const threatColor = dist.id === 'vila_esperanca' ? 'text-green-500' : dist.id === 'centro_comercial' ? 'text-orange-500' : 'text-red-500';

              return (
                <button
                  key={dist.id}
                  onClick={() => setSelectedDistrict(dist.id)}
                  className={`group relative aspect-[4/3] rounded-sm overflow-hidden border-2 transition-all ${
                    active ? 'border-[#e09132] shadow-[0_0_30px_rgba(224,145,50,0.3)] scale-105 z-10' : 'border-white/5 opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <DistrictVisualCardArt districtId={dist.id} className="w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent ${active ? 'opacity-90' : 'opacity-70'}`} />
                  
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                    <div className="flex items-center justify-between mb-1">
                       <span className={`text-[10px] font-black tracking-widest ${threatColor}`}>AMEAÇA {threat}</span>
                       {!isDiscovered && <span className="bg-[#e09132] text-black text-[9px] font-black px-1.5 py-0.5 rounded-xs">NOVO</span>}
                    </div>
                    <h3 className="font-display text-lg font-black uppercase text-white group-hover:text-[#e09132] transition-colors">
                      {dist.name}
                    </h3>
                    <p className="text-[10px] text-[#a8a29e] line-clamp-1 opacity-80">
                      {dist.tagline}
                    </p>
                  </div>

                  {active && (
                    <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-[#e09132] animate-ping" />
                  )}
                </button>
              );
            })}

            {/* Locked Sector */}
            <div className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-white/5 bg-black/80 opacity-40">
              <DistrictVisualCardArt districtId="zona_industrial" isLocked={true} className="w-full h-full object-cover grayscale" />
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                <span className="text-2xl">🔒</span>
                <span className="text-[10px] font-black tracking-[0.2em] text-white/40">ZONA INDUSTRIAL</span>
              </div>
            </div>
          </div>
        </section>

        {/* PRIMARY CALL-TO-ACTION */}
        <footer className="mt-auto pt-6 flex flex-col items-center gap-4">
           <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-[#8c8277]">
             <div className="flex items-center gap-2">
               <span className="text-[#52b788]">♥</span> {operatorMaxHp} PV
             </div>
             <div className="flex items-center gap-2">
               <span className="text-[#e09132]">🎒</span> {carryCapacity} ITENS
             </div>
             <div className="flex items-center gap-2">
               <span className="text-[#38bdf8]">🔫</span> 12/{18 + bonusReserveAmmo} AMMO
             </div>
           </div>

           <button
             type="button"
             data-testid="start-incursion-btn"
             onClick={() => onStartGame(selectedDistrict)}
             className="relative group w-full max-w-2xl overflow-hidden rounded-sm bg-[#99261a] hover:bg-[#b32e20] transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(153,38,26,0.5)] border border-white/10"
           >
             <div className="relative z-10 py-5 flex items-center justify-center gap-4 cursor-pointer">
                <span className="text-2xl group-hover:rotate-12 transition-transform">⚠️</span>
                <span className="font-display text-xl sm:text-2xl font-black uppercase tracking-[0.1em] text-white">
                  Iniciar Incursão
                </span>
             </div>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
           </button>

           <div className="flex items-center gap-6">
             <button onClick={() => setActiveModal('objectives')} className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8] hover:underline flex items-center gap-1.5">
               📋 Missões ({completedObjSet.size}/4)
             </button>
             <button onClick={() => setActiveModal('history')} className="text-[10px] font-black uppercase tracking-widest text-[#52b788] hover:underline flex items-center gap-1.5">
               📜 Histórico
             </button>
             {stash.runsStarted > 0 && (
               <button onClick={onResetStash} className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 hover:underline">
                 Reiniciar Progresso
               </button>
             )}
           </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: BANCADA DE EQUIPAMENTO (OPERATOR FIELD LOADOUT UPGRADES)          */}
      {/* ========================================================================= */}
      {activeModal === 'gear' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            data-testid="operator-loadout-card"
            className="w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-sm bg-[#14100d] border border-[#3e2e22] p-4 sm:p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#292019] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎒</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#e09132]">
                    Zona Segura · Oficina de Campo
                  </span>
                  <h2 className="font-display text-base sm:text-lg font-bold uppercase text-[#f5f1ea]">
                    Equipamentos do Operador
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="px-2.5 py-1 rounded-sm bg-[#221811] hover:bg-[#2e2017] border border-[#3d2a1d] text-xs font-bold text-[#e09132]"
              >
                Fechar ✕
              </button>
            </div>

            {/* Operator Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Saúde Máxima</div>
                <div className="font-mono-tabular text-sm font-bold text-[#52b788]">
                  {operatorMaxHp} PV
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Capacidade Mochila</div>
                <div className="font-mono-tabular text-sm font-bold text-[#e09132]">
                  {carryCapacity} itens
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Munição 9mm</div>
                <div className="font-mono-tabular text-sm font-bold text-[#f5f1ea]">
                  12/{18 + bonusReserveAmmo}
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Foco Lanterna</div>
                <div className="font-mono-tabular text-sm font-bold text-[#38bdf8]">
                  {320 + flashlightBonusPx}px
                </div>
              </div>
            </div>

            {/* Workbench Upgrades Section */}
            <div
              data-testid="gear-workbench-drawer"
              className="rounded-sm bg-[#0c0908] border border-[#2b211a] p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#e09132]">
                <span>Melhorias com Recursos Salvos</span>
                <span className="text-[#8c8277] font-mono-tabular">
                  Mat: {stash.totalStash.materiais} · Rem: {stash.totalStash.medicamentos}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(SHELTER_UPGRADE_CATALOG) as ShelterUpgradeId[]).map(
                  (upId) => {
                    const def = SHELTER_UPGRADE_CATALOG[upId];
                    const lvl = stash.upgrades?.[upId] ?? 0;
                    const isMax = lvl >= def.maxLevel;
                    const nextCost = !isMax ? def.costs[lvl] : null;

                    return (
                      <div
                        key={upId}
                        className="p-2.5 rounded-sm bg-[#14100d] border border-[#261d16] flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-[#f5f1ea]">
                            <span>{def.name}</span>
                            <span className="font-mono-tabular text-[#e09132] text-[10px]">
                              Nv. {lvl}/{def.maxLevel}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#9c9185] leading-tight mt-1">
                            {def.effectSummary(lvl)}
                          </p>
                        </div>

                        {isMax ? (
                          <span className="text-[10px] font-bold uppercase text-[#52b788]">
                            ✓ Nível Máximo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgradeGear(upId)}
                            className="min-h-[32px] px-2.5 py-1 rounded-sm bg-[#22170f] hover:bg-[#302115] border border-[#e09132]/60 text-[10px] font-bold uppercase tracking-wider text-[#fef3c7]"
                          >
                            Aprimorar (
                            {Object.entries(nextCost ?? {})
                              .map(([k, v]) => `${v} ${k.slice(0, 3)}`)
                              .join(', ')}
                            )
                          </button>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: OBJETIVOS E INTELIGÊNCIA NARRATIVA DA CIDADE                     */}
      {/* ========================================================================= */}
      {activeModal === 'objectives' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-sm bg-[#14100d] border border-[#3e2e22] p-4 sm:p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#292019] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#38bdf8]">
                    Inteligência Tática · Missões de Exploração
                  </span>
                  <h2 className="font-display text-base sm:text-lg font-bold uppercase text-[#f5f1ea]">
                    Objetivos & Relatos da Cidade
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="px-2.5 py-1 rounded-sm bg-[#221811] hover:bg-[#2e2017] border border-[#3d2a1d] text-xs font-bold text-[#e09132]"
              >
                Fechar ✕
              </button>
            </div>

            {/* City Objectives Panel */}
            <div
              data-testid="city-objectives-panel"
              className="space-y-2"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#e09132]">
                Missões de Incursão na Cidade ({completedObjSet.size}/4)
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {CITY_OBJECTIVES_CATALOG.map((obj) => {
                  const done = completedObjSet.has(obj.id);
                  return (
                    <div
                      key={obj.id}
                      className={`p-2.5 rounded-sm border text-xs ${
                        done
                          ? 'bg-[#102419] border-[#22573a] text-[#a7f3d0]'
                          : 'bg-[#0c0908] border-[#241c16] text-[#ebe5dc]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          {done ? '✓ ' : '◎ '}
                          {obj.title}
                        </span>
                        <span className="text-[9px] font-mono-tabular uppercase px-1.5 py-0.5 rounded-xs bg-[#000000]/40">
                          {done ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#9c9185] mt-0.5 leading-snug">
                        {obj.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Environmental Intel Records */}
            <div
              data-testid="environmental-intel-panel"
              className="pt-2 border-t border-[#241c16] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#38bdf8]">
                  Relatos e Documentos Descobertos
                </span>
                <span className="text-[10px] font-mono-tabular text-[#8c8277]">
                  {discoveredIntelEntries.length}/{CITY_OBJECTIVES_CATALOG.length}
                </span>
              </div>

              {discoveredIntelEntries.length === 0 ? (
                <div className="rounded-sm bg-[#0c0908] border border-[#211c18] p-3 text-[11px] text-[#9c9185] leading-relaxed">
                  Vasculhe farmácias, viaturas abandonadas, comércios e salas médicas durante as incursões para resgatar documentos com rotas e registros de sobreviventes.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {discoveredIntelEntries.map((rec) => (
                    <div
                      key={rec.intelId}
                      className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2 text-[10px] space-y-0.5"
                    >
                      <div className="font-bold text-[#e09132]">
                        📄 {rec.intelTitle}
                      </div>
                      <p className="text-[#b8afa4] leading-snug">{rec.intelSummary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: HISTÓRICO DA ÚLTIMA INCURSÃO                                     */}
      {/* ========================================================================= */}
      {activeModal === 'history' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            data-testid="last-run-report"
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-sm bg-[#14100d] border border-[#3e2e22] p-4 sm:p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#292019] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#52b788]">
                    Registro de Batalha
                  </span>
                  <h2 className="font-display text-base sm:text-lg font-bold uppercase text-[#f5f1ea]">
                    Último Relatório de Incursão
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="px-2.5 py-1 rounded-sm bg-[#221811] hover:bg-[#2e2017] border border-[#3d2a1d] text-xs font-bold text-[#e09132]"
              >
                Fechar ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Extrações</div>
                <div className="font-mono-tabular text-sm font-bold text-[#52b788]">
                  {stash.runsExtracted}
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Quedas</div>
                <div className="font-mono-tabular text-sm font-bold text-[#ef4444]">
                  {stash.runsDied}
                </div>
              </div>
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-2">
                <div className="text-[9px] uppercase text-[#8c8277]">Abates</div>
                <div className="font-mono-tabular text-sm font-bold text-[#e09132]">
                  {stash.totalZombiesKilled}
                </div>
              </div>
            </div>

            {stash.lastRunSummary ? (
              <div className="rounded-sm bg-[#0c0908] border border-[#241c16] p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold uppercase text-xs ${
                      stash.lastRunSummary.outcome === 'extracted'
                        ? 'text-[#52b788]'
                        : 'text-[#e09132]'
                    }`}
                  >
                    {stash.lastRunSummary.outcome === 'extracted'
                      ? `✓ Extração (${stash.lastRunSummary.districtName})`
                      : `⚠ Queda em Combate (${stash.lastRunSummary.districtName})`}
                  </span>
                  <span className="font-mono-tabular text-[10px] text-[#8c8277]">
                    {stash.lastRunSummary.zombiesKilled} abates · {stash.lastRunSummary.durationSeconds}s
                  </span>
                </div>

                <div className="text-[11px] font-mono-tabular text-[#52b788]">
                  Salvo no Estoque: +{stash.lastRunSummary.lootGained.comida} Comida, +
                  {stash.lastRunSummary.lootGained.medicamentos} Remédios, +
                  {stash.lastRunSummary.lootGained.municao} Munição, +
                  {stash.lastRunSummary.lootGained.materiais} Materiais
                </div>

                {stash.lastRunSummary.outcome === 'dead' && stash.lastRunSummary.lootLost && (
                  <div className="text-[10px] font-mono-tabular text-[#ef4444]">
                    Perdido na queda (50% da mochila): -{stash.lastRunSummary.lootLost.comida} Com, -
                    {stash.lastRunSummary.lootLost.medicamentos} Rem, -
                    {stash.lastRunSummary.lootLost.municao} Mun, -
                    {stash.lastRunSummary.lootLost.materiais} Mat
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#8c8277] text-center py-4">
                Nenhuma incursão registrada nesta sessão.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
