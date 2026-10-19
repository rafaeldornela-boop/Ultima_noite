import {
  ACTION_STASH_SCHEMA_VERSION,
  type ActionLootBag,
  type PersistentShelterStash,
  type ShelterSurvivor,
  type ShelterUpgradeState,
} from '../action/actionTypes.ts';
import {
  computeEvacuationProgress,
  createInitialPersistentStash,
  createInitialSurvivors,
  createInitialUpgrades,
} from '../action/actionRules.ts';
import {
  defaultStorageAdapter,
  type StorageAdapter,
} from './campaignStorage.ts';

export const ACTION_STORAGE_KEY = 'ultimo_dia_topdown_stash_v1';

function sanitizeLootBag(raw: unknown, fallback: ActionLootBag): ActionLootBag {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const obj = raw as Record<string, unknown>;
  const clamp = (val: unknown, def: number) =>
    typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : def;

  return {
    comida: clamp(obj.comida, fallback.comida),
    medicamentos: clamp(obj.medicamentos, fallback.medicamentos),
    municao: clamp(obj.municao, fallback.municao),
    materiais: clamp(obj.materiais, fallback.materiais),
  };
}

function sanitizeUpgrades(raw: unknown): ShelterUpgradeState {
  const base = createInitialUpgrades();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  const clampLvl = (val: unknown) =>
    typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.min(2, Math.floor(val))) : 0;
  return {
    oficina: clampLvl(obj.oficina),
    enfermaria: clampLvl(obj.enfermaria),
    torre_radio: clampLvl(obj.torre_radio),
    muralha: clampLvl(obj.muralha),
  };
}

function sanitizeSurvivors(raw: unknown): ShelterSurvivor[] {
  const defaults = createInitialSurvivors();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  return defaults.map((def) => {
    const found = raw.find(
      (item) => item && typeof item === 'object' && (item as Record<string, unknown>).id === def.id
    ) as Record<string, unknown> | undefined;
    if (!found) return def;
    const maxHp = Math.max(50, Math.floor(Number(found.maxHp) || def.maxHp));
    const hp = Math.max(0, Math.min(maxHp, Math.floor(Number(found.hp) ?? def.hp)));
    const rawStatus = found.status;
    const status =
      rawStatus === 'ferido' || rawStatus === 'exausto' || rawStatus === 'morto'
        ? rawStatus
        : 'saudavel';
    return {
      id: def.id,
      name: typeof found.name === 'string' && found.name ? found.name : def.name,
      role: typeof found.role === 'string' && found.role ? found.role : def.role,
      hp,
      maxHp,
      status: hp <= 0 ? 'morto' : status,
    };
  });
}

export function validateActionStash(raw: unknown): PersistentShelterStash | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.schemaVersion !== 'number') return null;

  const initial = createInitialPersistentStash();
  const totalStash = sanitizeLootBag(candidate.totalStash, initial.totalStash);
  const survivors = sanitizeSurvivors(candidate.survivors);
  const upgrades = sanitizeUpgrades(candidate.upgrades);
  const activeSurvivorId =
    typeof candidate.activeSurvivorId === 'string' &&
    survivors.some((s) => s.id === candidate.activeSurvivorId && s.status !== 'morto')
      ? candidate.activeSurvivorId
      : survivors.find((s) => s.status !== 'morto')?.id ?? 'surv_elena';

  const result: PersistentShelterStash = {
    schemaVersion: ACTION_STASH_SCHEMA_VERSION,
    totalStash,
    runsStarted:
      typeof candidate.runsStarted === 'number' && candidate.runsStarted >= 0
        ? Math.floor(candidate.runsStarted)
        : 0,
    runsExtracted:
      typeof candidate.runsExtracted === 'number' && candidate.runsExtracted >= 0
        ? Math.floor(candidate.runsExtracted)
        : 0,
    runsDied:
      typeof candidate.runsDied === 'number' && candidate.runsDied >= 0
        ? Math.floor(candidate.runsDied)
        : 0,
    totalZombiesKilled:
      typeof candidate.totalZombiesKilled === 'number' && candidate.totalZombiesKilled >= 0
        ? Math.floor(candidate.totalZombiesKilled)
        : 0,
    extractedRunIds: Array.isArray(candidate.extractedRunIds)
      ? candidate.extractedRunIds.filter((id): id is string => typeof id === 'string')
      : [],
    lastRunSummary:
      candidate.lastRunSummary && typeof candidate.lastRunSummary === 'object'
        ? (candidate.lastRunSummary as PersistentShelterStash['lastRunSummary'])
        : null,
    updatedAt:
      typeof candidate.updatedAt === 'string'
        ? candidate.updatedAt
        : new Date().toISOString(),
    day:
      typeof candidate.day === 'number' && candidate.day >= 1
        ? Math.floor(candidate.day)
        : 1,
    survivors,
    activeSurvivorId,
    upgrades,
    evacuationCompleted: Boolean(candidate.evacuationCompleted),
    evacuationProgress: 0,
    shelterLog: Array.isArray(candidate.shelterLog)
      ? candidate.shelterLog.filter((item): item is string => typeof item === 'string').slice(0, 14)
      : initial.shelterLog,
  };

  result.evacuationProgress = result.evacuationCompleted
    ? 100
    : typeof candidate.evacuationProgress === 'number' && candidate.evacuationProgress > 0
    ? Math.min(99, Math.max(0, Math.floor(candidate.evacuationProgress)))
    : computeEvacuationProgress(result);

  return result;
}

export async function saveActionStash(
  stash: PersistentShelterStash,
  adapter: StorageAdapter = defaultStorageAdapter
): Promise<boolean> {
  try {
    await adapter.setItem(ACTION_STORAGE_KEY, JSON.stringify(stash));
    return true;
  } catch {
    return false;
  }
}

export async function loadActionStash(
  adapter: StorageAdapter = defaultStorageAdapter
): Promise<PersistentShelterStash> {
  try {
    const raw = await adapter.getItem(ACTION_STORAGE_KEY);
    if (!raw) {
      const fresh = createInitialPersistentStash();
      await saveActionStash(fresh, adapter);
      return fresh;
    }

    const parsed: unknown = JSON.parse(raw);
    const validated = validateActionStash(parsed);
    if (!validated) {
      const fresh = createInitialPersistentStash();
      await saveActionStash(fresh, adapter);
      return fresh;
    }
    return validated;
  } catch {
    const fresh = createInitialPersistentStash();
    await saveActionStash(fresh, adapter);
    return fresh;
  }
}

export async function resetActionStash(
  adapter: StorageAdapter = defaultStorageAdapter
): Promise<PersistentShelterStash> {
  await adapter.removeItem(ACTION_STORAGE_KEY);
  const fresh = createInitialPersistentStash();
  await saveActionStash(fresh, adapter);
  return fresh;
}
