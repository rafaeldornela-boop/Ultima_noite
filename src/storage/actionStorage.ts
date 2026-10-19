import {
  ACTION_STASH_SCHEMA_VERSION,
  type ActionLootBag,
  type PersistentShelterStash,
} from '../action/actionTypes.ts';
import { createInitialPersistentStash } from '../action/actionRules.ts';
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

export function validateActionStash(raw: unknown): PersistentShelterStash | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.schemaVersion !== 'number') return null;

  const initial = createInitialPersistentStash();
  const totalStash = sanitizeLootBag(candidate.totalStash, initial.totalStash);

  return {
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
  };
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
