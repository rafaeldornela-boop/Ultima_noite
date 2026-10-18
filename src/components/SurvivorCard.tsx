import { ATTRIBUTE_LABELS, INJURY_LABELS } from '../data/survivors.ts';
import type { AttributeType, Survivor } from '../game/types.ts';
import { AttributeIconSvg, ResourceIconSvg, SurvivorPortraitSvg } from './SvgArt.tsx';

const ATTRIBUTE_KEYS: AttributeType[] = [
  'combate',
  'percepcao',
  'tecnica',
  'resistencia',
];

interface SurvivorCardProps {
  survivor: Survivor;
  medicinesAvailable: number;
  hasInfirmary: boolean;
  onHeal?: (survivorId: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (survivorId: string) => void;
}

export function SurvivorCard({
  survivor,
  medicinesAvailable,
  hasInfirmary,
  onHeal,
  selectable = false,
  selected = false,
  onToggleSelect,
}: SurvivorCardProps) {
  const isDead = survivor.injury === 'morto' || survivor.health <= 0;
  const needsHealing =
    !isDead && (survivor.health < survivor.maxHealth || survivor.injury !== 'saudavel');
  const canHeal = needsHealing && medicinesAvailable > 0 && Boolean(onHeal);
  const healBonus = hasInfirmary ? 50 : 30;

  const injuryColor =
    survivor.injury === 'morto'
      ? 'text-[#9ca3af]'
      : survivor.injury === 'grave'
      ? 'text-[#e05246]'
      : survivor.injury === 'ferido'
      ? 'text-[#d9822b]'
      : 'text-[#52b788]';

  // 5 discrete vitality pips for HUD clarity
  const totalPips = 5;
  const filledPips = isDead ? 0 : Math.ceil((survivor.health / survivor.maxHealth) * totalPips);

  return (
    <article
      className={`rounded-xl bg-[#1b1714] border transition-colors p-4 flex flex-col justify-between gap-3 ${
        isDead
          ? 'border-[#29231e] opacity-65'
          : selected
          ? 'border-[#d9822b] bg-[#231d18]'
          : 'border-[#2f2722]'
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Portrait, Name, Role, Health */}
        <div className="flex items-start gap-3">
          <SurvivorPortraitSvg
            portraitId={survivor.portraitId}
            isDead={isDead}
            className="w-14 h-14 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold tracking-wide text-[#f0ebe1] truncate">
                {survivor.name}
              </h3>
              <span className={`text-xs font-semibold whitespace-nowrap ${injuryColor}`}>
                {INJURY_LABELS[survivor.injury]}
              </span>
            </div>

            <p className="text-xs text-[#9e9185] mt-0.5">
              {survivor.role}
              <span aria-hidden="true"> · </span>
              <span>
                {isDead
                  ? 'Baixa Permanente'
                  : survivor.available
                  ? 'Apto para Missão'
                  : 'Indisponível'}
              </span>
            </p>

            {/* Health readout + discrete pips */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" aria-label={`Saúde: ${survivor.health} de ${survivor.maxHealth}`}>
                {Array.from({ length: totalPips }).map((_, idx) => {
                  const isFull = idx < filledPips;
                  const isDamaged =
                    isFull && idx === filledPips - 1 && survivor.health % 20 !== 0;
                  return (
                    <span
                      key={idx}
                      className={`h-2.5 w-5 rounded-sm border ${
                        !isFull
                          ? 'bg-[#12100e] border-[#332b25]'
                          : isDamaged
                          ? 'bg-[#d9822b] border-[#e09132]'
                          : survivor.health <= 35
                          ? 'bg-[#b93829] border-[#e05246]'
                          : 'bg-[#458b69] border-[#52b788]'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="font-mono-tabular text-xs font-bold text-[#e7e2da]">
                {Math.round(survivor.health)}/{survivor.maxHealth} PV
              </span>
            </div>
          </div>
        </div>

        {/* Short bio */}
        <p className="text-xs text-[#b5a99c] leading-relaxed">{survivor.bio}</p>

        {/* Attributes 1..5 Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#29221d]">
          {ATTRIBUTE_KEYS.map((attr) => {
            const val = survivor.attributes[attr];
            return (
              <div
                key={attr}
                className="flex items-center justify-between bg-[#14110f] px-2.5 py-1.5 rounded border border-[#26201b]"
              >
                <div className="flex items-center gap-1.5">
                  <AttributeIconSvg attribute={attr} className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs text-[#c7bdb1]">{ATTRIBUTE_LABELS[attr]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono-tabular text-xs font-bold text-[#f0ebe1]">
                    {val}
                  </span>
                  <span className="text-[10px] text-[#786d63]">/5</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons: Heal or Select for Expedition */}
      {(onHeal || selectable) && (
        <div className="pt-2 border-t border-[#29221d] flex flex-wrap items-center gap-2">
          {onHeal && !isDead && (
            <button
              type="button"
              disabled={!canHeal}
              onClick={() => onHeal(survivor.id)}
              className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                canHeal
                  ? 'bg-[#2a1d1b] hover:bg-[#382421] text-[#f0ebe1] border border-[#8c2d23]'
                  : 'bg-[#161311] text-[#635950] border border-[#241f1b] cursor-not-allowed'
              }`}
            >
              <ResourceIconSvg type="medicamentos" className="w-4 h-4 shrink-0" />
              <span>
                {needsHealing
                  ? `Tratar (+${healBonus} PV · -1 Remédio)`
                  : 'Saúde Completa'}
              </span>
            </button>
          )}

          {selectable && !isDead && onToggleSelect && (
            <button
              type="button"
              onClick={() => onToggleSelect(survivor.id)}
              className={`min-h-[44px] flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                selected
                  ? 'bg-[#d9822b] text-[#12100e] hover:bg-[#e5923e]'
                  : 'bg-[#26201b] text-[#e7e2da] hover:bg-[#332b24] border border-[#3d332b]'
              }`}
            >
              {selected ? 'Selecionado na Equipe' : 'Incluir na Equipe'}
            </button>
          )}

          {isDead && (
            <div className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-[#141210] border border-[#26211d] text-center text-xs text-[#786e65] flex items-center justify-center">
              Personagem morto permanentemente — não pode ser recuperado
            </div>
          )}
        </div>
      )}
    </article>
  );
}
