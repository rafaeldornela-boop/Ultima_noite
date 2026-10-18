import type { AttributeType, InjuryState, Survivor } from '../game/types.ts';

export const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
  combate: 'Combate',
  percepcao: 'Percepção',
  tecnica: 'Técnica',
  resistencia: 'Resistência',
};

export const ATTRIBUTE_DESCRIPTIONS: Record<AttributeType, string> = {
  combate: 'Eficiência em confrontos diretos, contenção de infectados e uso de armas.',
  percepcao: 'Capacidade de detectar emboscadas, ouvir ruídos e achar rotas ou suprimentos ocultos.',
  tecnica: 'Habilidade para destrancar portas, reparar equipamentos e desarmar armadilhas.',
  resistencia: 'Vigor físico para suportar traumas, carregar mais peso na mochila e resistir à fome.',
};

export const INJURY_LABELS: Record<InjuryState, string> = {
  saudavel: 'Saudável',
  ferido: 'Ferido',
  grave: 'Ferimento Grave',
  morto: 'Morto',
};

export const INITIAL_SURVIVORS: Survivor[] = [
  {
    id: 'surv_helena',
    name: 'Helena Vargas',
    role: 'Ex-Bombeira Militar',
    bio: 'Acostumada a entrar em prédios em colapso quando todos fogem. Mantém a calma sob pressão e lidera pelo exemplo.',
    portraitId: 'helena',
    attributes: {
      combate: 4,
      percepcao: 3,
      tecnica: 2,
      resistencia: 4,
    },
    health: 100,
    maxHealth: 100,
    injury: 'saudavel',
    available: true,
  },
  {
    id: 'surv_marcos',
    name: 'Marcos "Ferreiro" Silva',
    role: 'Mecânico e Serralheiro',
    bio: 'Conhece cada fechadura e beco industrial da zona sul. Capaz de abrir portas emperradas sem fazer alarde.',
    portraitId: 'marcos',
    attributes: {
      combate: 2,
      percepcao: 3,
      tecnica: 5,
      resistencia: 3,
    },
    health: 100,
    maxHealth: 100,
    injury: 'saudavel',
    available: true,
  },
  {
    id: 'surv_caio',
    name: 'Dr. Caio Mendes',
    role: 'Socorrista de Emergência',
    bio: 'Trabalhou nas últimas ambulâncias antes da queda. Olhos atentos para encontrar medicamentos e evitar riscos desnecessários.',
    portraitId: 'caio',
    attributes: {
      combate: 2,
      percepcao: 5,
      tecnica: 3,
      resistencia: 2,
    },
    health: 100,
    maxHealth: 100,
    injury: 'saudavel',
    available: true,
  },
];

export const RECRUITABLE_SURVIVORS_POOL: Survivor[] = [
  {
    id: 'surv_elena',
    name: 'Elena Costa',
    role: 'Batedora Urbana',
    bio: 'Sobreviveu sozinha nos telhados por três semanas. Ágil, silenciosa e exímia conhecedora de rotas de fuga.',
    portraitId: 'elena',
    attributes: {
      combate: 3,
      percepcao: 4,
      tecnica: 3,
      resistencia: 3,
    },
    health: 85,
    maxHealth: 100,
    injury: 'saudavel',
    available: true,
  },
];

export function cloneInitialSurvivors(): Survivor[] {
  return INITIAL_SURVIVORS.map((s) => ({
    ...s,
    attributes: { ...s.attributes },
  }));
}
