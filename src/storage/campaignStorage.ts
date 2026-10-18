import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { createInitialCampaign, validateAndMigrateCampaign } from '../game/rules.ts';
import type { CampaignState } from '../game/types.ts';

export const STORAGE_KEY = 'ultimo_dia_sobrevivencia_campaign_v1';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class HybridStorageAdapter implements StorageAdapter {
  private isNativePlatform(): boolean {
    try {
      return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isNativePlatform()) {
      try {
        const result = await Preferences.get({ key });
        if (result.value !== null && result.value !== undefined) {
          return result.value;
        }
      } catch {
        // Fallback to localStorage below
      }
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore storage access errors
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isNativePlatform()) {
      try {
        await Preferences.set({ key, value });
      } catch {
        // Continue to localStorage fallback
      }
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota or private browsing errors
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isNativePlatform()) {
      try {
        await Preferences.remove({ key });
      } catch {
        // Continue to localStorage fallback
      }
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  }
}

export function createMemoryStorageAdapter(initialValue?: string): StorageAdapter {
  const map = new Map<string, string>();
  if (initialValue !== undefined) {
    map.set(STORAGE_KEY, initialValue);
  }
  return {
    async getItem(key: string) {
      return map.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      map.set(key, value);
    },
    async removeItem(key: string) {
      map.delete(key);
    },
  };
}

export const defaultStorageAdapter = new HybridStorageAdapter();

export async function saveCampaignState(
  state: CampaignState,
  adapter: StorageAdapter = defaultStorageAdapter
): Promise<boolean> {
  try {
    const serialized = JSON.stringify(state);
    await adapter.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export async function loadCampaignState(
  adapter: StorageAdapter = defaultStorageAdapter
): Promise<{ state: CampaignState; hadSavedData: boolean; recoveredFromError: boolean }> {
  try {
    const raw = await adapter.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createInitialCampaign();
      await saveCampaignState(fresh, adapter);
      return { state: fresh, hadSavedData: false, recoveredFromError: false };
    }

    const parsed: unknown = JSON.parse(raw);
    const validated = validateAndMigrateCampaign(parsed);

    if (!validated) {
      const fallback = createInitialCampaign();
      await saveCampaignState(fallback, adapter);
      return { state: fallback, hadSavedData: false, recoveredFromError: true };
    }

    return { state: validated, hadSavedData: true, recoveredFromError: false };
  } catch {
    const recovered = createInitialCampaign();
    await saveCampaignState(recovered, adapter);
    return { state: recovered, hadSavedData: false, recoveredFromError: true };
  }
}

export async function resetCampaignState(
  adapter: StorageAdapter = defaultStorageAdapter
): Promise<CampaignState> {
  await adapter.removeItem(STORAGE_KEY);
  const fresh = createInitialCampaign();
  await saveCampaignState(fresh, adapter);
  return fresh;
}
