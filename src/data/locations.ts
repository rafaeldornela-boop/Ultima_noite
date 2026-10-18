import type { LocationDef, LocationId } from '../game/types.ts';

export const LOCATIONS: Record<LocationId, LocationDef> = {
  supermercado: {
    id: 'supermercado',
    name: 'Supermercado Alvorada',
    subtitle: 'Setor Comercial Saqueado',
    description:
      'Gôndolas tombadas e corredores escuros. Ainda restam enlatados e suprimentos básicos no depósito dos fundos, mas o barulho atrai errantes famintos.',
    danger: 'Moderado',
    dangerLevelNum: 1,
    primaryResources: ['comida', 'materiais', 'ferramentas'],
    expeditionLength: 4,
  },
  farmacia: {
    id: 'farmacia',
    name: 'Farmácia Central 24h',
    subtitle: 'Avenida Principal',
    description:
      'Vitrines estilhaçadas e grade de ferro parcialmente arriada. O estoque controlado nos fundos guarda antibióticos e kits cirúrgicos valiosos.',
    danger: 'Alto',
    dangerLevelNum: 2,
    primaryResources: ['medicamentos', 'comida'],
    expeditionLength: 4,
  },
  delegacia: {
    id: 'delegacia',
    name: '4º Distrito Policial',
    subtitle: 'Zona Bloqueada',
    description:
      'Prédio fortificado que colapsou durante o pânico inicial. O paiol contém munição e ferramentas pesadas, porém corredores estreitos escondem infectados blindados.',
    danger: 'Extremo',
    dangerLevelNum: 3,
    primaryResources: ['municao', 'ferramentas', 'materiais'],
    expeditionLength: 4,
  },
  casas_abandonadas: {
    id: 'casas_abandonadas',
    name: 'Casas Abandonadas',
    subtitle: 'Vila Residencial',
    description:
      'Quarteirão silencioso de sobrados fechados às pressas. Despensas domésticas, garagens com ferramentas e oficinas caseiras oferecem coleta equilibrada.',
    danger: 'Moderado',
    dangerLevelNum: 1,
    primaryResources: ['materiais', 'comida', 'ferramentas'],
    expeditionLength: 4,
  },
};

export const LOCATION_LIST: LocationDef[] = [
  LOCATIONS.supermercado,
  LOCATIONS.casas_abandonadas,
  LOCATIONS.farmacia,
  LOCATIONS.delegacia,
];
