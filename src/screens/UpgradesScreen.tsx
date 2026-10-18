import { RESOURCES_META } from '../data/resources.ts';
import { SHELTER_UPGRADES, UPGRADE_ORDER } from '../data/upgrades.ts';
import { canAffordUpgrade } from '../game/rules.ts';
import type {
  CampaignState,
  ResourceType,
  ShelterUpgradeId,
} from '../game/types.ts';
import { ResourceIconSvg } from '../components/SvgArt.tsx';

interface UpgradesScreenProps {
  state: CampaignState;
  onBuildUpgrade: (upgradeId: ShelterUpgradeId) => void;
}

export function UpgradesScreen({ state, onBuildUpgrade }: UpgradesScreenProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#d9822b]">
          Infraestrutura e Defesa
        </p>
        <h2 className="font-display text-2xl font-bold text-[#f5f0e6] uppercase">
          Melhorias do Abrigo
        </h2>
        <p className="text-xs sm:text-sm text-[#b5a99c] max-w-2xl">
          Invista Materiais, Ferramentas e Medicamentos coletados nas expedições para fortalecer o abrigo de forma permanente.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {UPGRADE_ORDER.map((upgradeId) => {
          const def = SHELTER_UPGRADES[upgradeId];
          const upgState = state.upgrades[upgradeId];
          const isBuilt = upgState.level >= upgState.maxLevel;
          const check = canAffordUpgrade(state, upgradeId);

          return (
            <article
              key={upgradeId}
              className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 ${
                isBuilt
                  ? 'bg-[#18211b] border-[#33523e]'
                  : 'bg-[#1b1714] border-[#302822]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-[#f5f0e6]">
                    {def.name}
                  </h3>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      isBuilt ? 'text-[#52b788]' : 'text-[#d9822b]'
                    }`}
                  >
                    {isBuilt ? 'Construída' : 'Não Construída'}
                  </span>
                </div>

                <p className="text-xs text-[#b5a99c] leading-relaxed">
                  {def.description}
                </p>

                <div className="rounded-xl bg-[#14110f] border border-[#26201b] p-3 space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#d9822b]">
                    Benefício nas Regras:
                  </div>
                  <p className="text-xs text-[#e7e2da] leading-relaxed">
                    {def.effectDescription}
                  </p>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-[#9e9185]">
                    Custo de Construção:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(def.cost).map(([resKey, needed]) => {
                      const rType = resKey as ResourceType;
                      const current = state.resources[rType] ?? 0;
                      const enough = current >= (needed ?? 0);

                      return (
                        <div
                          key={resKey}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-tabular flex items-center gap-1.5 ${
                            isBuilt || enough
                              ? 'bg-[#151210] border-[#2c2520] text-[#e7e2da]'
                              : 'bg-[#241614] border-[#6e2920] text-[#e05246]'
                          }`}
                        >
                          <ResourceIconSvg type={rType} className="w-3.5 h-3.5" />
                          <span>
                            {RESOURCES_META[rType].name}: {current}/{needed}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#29221d]">
                <button
                  type="button"
                  disabled={isBuilt || !check.canBuild}
                  onClick={() => onBuildUpgrade(upgradeId)}
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl font-display text-sm font-bold tracking-wider uppercase transition-colors ${
                    isBuilt
                      ? 'bg-[#1f3025] text-[#52b788] cursor-default'
                      : check.canBuild
                      ? 'bg-[#d9822b] hover:bg-[#e5923e] text-[#12100e]'
                      : 'bg-[#161311] text-[#635950] border border-[#241f1b] cursor-not-allowed'
                  }`}
                >
                  {isBuilt
                    ? 'Melhoria Ativa no Abrigo'
                    : check.canBuild
                    ? `Construir ${def.name}`
                    : check.reason ?? 'Recursos Insuficientes'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
