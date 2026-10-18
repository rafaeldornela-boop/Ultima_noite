import type { EquipmentDef, EquipmentId, ResourceStock, ResourceType } from '../game/types.ts';

export interface ResourceMetadata {
  id: ResourceType;
  name: string;
  shortName: string;
  description: string;
  unitWeight: number; // Weight/space occupied per unit inside the expedition backpack
  maxStorage: number;
}

export const RESOURCE_ORDER: ResourceType[] = [
  'comida',
  'medicamentos',
  'materiais',
  'ferramentas',
  'municao',
];

export const RESOURCES_META: Record<ResourceType, ResourceMetadata> = {
  comida: {
    id: 'comida',
    name: 'Comida',
    shortName: 'Comida',
    description: 'Rações enlatadas e água potável. Consumida todas as manhãs (1 por sobrevivente vivo).',
    unitWeight: 1,
    maxStorage: 50,
  },
  medicamentos: {
    id: 'medicamentos',
    name: 'Medicamentos',
    shortName: 'Remédios',
    description: 'Antibióticos, ataduras e analgésicos usados para tratar ferimentos e restaurar saúde.',
    unitWeight: 1,
    maxStorage: 30,
  },
  materiais: {
    id: 'materiais',
    name: 'Materiais',
    shortName: 'Materiais',
    description: 'Madeira, chapas metálicas e parafusos essenciais para erguer melhorias no abrigo.',
    unitWeight: 2,
    maxStorage: 60,
  },
  ferramentas: {
    id: 'ferramentas',
    name: 'Ferramentas',
    shortName: 'Ferram.',
    description: 'Alicates, chaves e peças de precisão para oficina, reparos e arrombamentos.',
    unitWeight: 2,
    maxStorage: 25,
  },
  municao: {
    id: 'municao',
    name: 'Munição',
    shortName: 'Munição',
    description: 'Cartuchos escassos. Garantem vantagem decisiva em confrontos armados.',
    unitWeight: 1,
    maxStorage: 40,
  },
};

export const INITIAL_RESOURCES: ResourceStock = {
  comida: 6,
  medicamentos: 3,
  materiais: 6,
  ferramentas: 3,
  municao: 4,
};

export const DEFAULT_MAX_RESOURCES: ResourceStock = {
  comida: 50,
  medicamentos: 30,
  materiais: 60,
  ferramentas: 25,
  municao: 40,
};

export const EQUIPMENT_CATALOG: Record<EquipmentId, EquipmentDef> = {
  pe_de_cabra: {
    id: 'pe_de_cabra',
    name: 'Pé de Cabra Forjado',
    description: '+2 em Técnica ao forçar portas, grades e caixas trancadas.',
    bonusAttribute: 'tecnica',
    bonusAmount: 2,
    requiresResource: {
      type: 'ferramentas',
      amount: 1,
    },
  },
  pistola_9mm: {
    id: 'pistola_9mm',
    name: 'Pistola Tática 9mm',
    description: '+2 em Combate durante a expedição (requer pelo menos 1 Munição no estoque).',
    bonusAttribute: 'combate',
    bonusAmount: 2,
    requiresResource: {
      type: 'municao',
      amount: 1,
    },
  },
  kit_primeiros_socorros: {
    id: 'kit_primeiros_socorros',
    name: 'Bolsa de Trauma',
    description: '+1 em Resistência da equipe e reduz dano recebido em campo.',
    bonusAttribute: 'resistencia',
    bonusAmount: 1,
    requiresResource: {
      type: 'medicamentos',
      amount: 1,
    },
  },
  lanterna_tatica: {
    id: 'lanterna_tatica',
    name: 'Lanterna de Foco Longo',
    description: '+2 em Percepção ao vasculhar corredores escuros e detectar ameaças.',
    bonusAttribute: 'percepcao',
    bonusAmount: 2,
  },
};

export const EQUIPMENT_LIST: EquipmentDef[] = Object.values(EQUIPMENT_CATALOG);
