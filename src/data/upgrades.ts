import type { ShelterUpgradeDef, ShelterUpgradeId } from '../game/types.ts';

export const SHELTER_UPGRADES: Record<ShelterUpgradeId, ShelterUpgradeDef> = {
  barricadas: {
    id: 'barricadas',
    name: 'Barricadas Reforçadas',
    description: 'Chapas de aço, vigas cruzadas e alertas sonoros nas janelas e acessos térreos do abrigo.',
    benefitSummary: 'Reduz drasticamente o risco de invasões noturnas e perdas de recursos à noite.',
    cost: {
      materiais: 5,
      ferramentas: 2,
    },
    effectDescription: 'Evita danos e saques em ataques noturnos comuns e protege o perímetro do abrigo.',
  },
  enfermaria: {
    id: 'enfermaria',
    name: 'Enfermaria Improvisada',
    description: 'Maca esterilizada, soro e bancada limpa para suturas e controle de infecções.',
    benefitSummary: 'Aumenta a cura de Medicamentos de +30 para +50 de Saúde e recupera Ferimento Grave diretamente.',
    cost: {
      materiais: 4,
      medicamentos: 2,
      ferramentas: 1,
    },
    effectDescription: 'Tratamentos médicos restauram +50 PV (em vez de +30 PV) e curam qualquer grau de ferimento.',
  },
  oficina: {
    id: 'oficina',
    name: 'Oficina de Manutenção',
    description: 'Bancada com torno mecânico, costura pesada de alforjes e manutenção de ferramentas.',
    benefitSummary: 'Aumenta a capacidade da mochila da expedição em +6 espaços e soma +1 em testes de Técnica.',
    cost: {
      materiais: 5,
      ferramentas: 3,
    },
    effectDescription: '+6 de capacidade máxima na mochila de expedição e +1 de bônus passivo em Técnica.',
  },
};

export const UPGRADE_ORDER: ShelterUpgradeId[] = [
  'barricadas',
  'enfermaria',
  'oficina',
];
