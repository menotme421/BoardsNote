type StorageKey = 'theme' | 'app_font' | 'files';

const PREFIX = 'boardsnote:';

function getFullKey(key: StorageKey): string {
  return `${PREFIX}${key}`;
}

function getLegacyKey(key: StorageKey): string {
  const legacyMap: Record<StorageKey, string> = {
    theme: 'inkframe_theme',
    app_font: 'inkframe_app_font',
    files: 'inkframe_files',
  };
  return legacyMap[key];
}

export const storage = {
  get<T>(key: StorageKey): T | null {
    try {
      const fullKey = getFullKey(key);
      const item = localStorage.getItem(fullKey);
      if (item) {
        return JSON.parse(item) as T;
      }
      
      // Fallback to legacy key for migration
      const legacyKey = getLegacyKey(key);
      const legacyItem = localStorage.getItem(legacyKey);
      if (legacyItem) {
        const parsed = JSON.parse(legacyItem) as T;
        // Migrate to new key
        this.set(key, parsed);
        return parsed;
      }
      
      return null;
    } catch {
      return null;
    }
  },

  set<T>(key: StorageKey, value: T): { success: true } | { success: false; error: 'quota_exceeded' | 'unknown' } {
    try {
      const fullKey = getFullKey(key);
      const serialized = JSON.stringify(value);
      localStorage.setItem(fullKey, serialized);
      return { success: true };
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.error(`Storage quota exceeded when setting ${key}`);
        return { success: false, error: 'quota_exceeded' };
      }
      console.error(`Failed to set storage key ${key}:`, e);
      return { success: false, error: 'unknown' };
    }
  },

  remove(key: StorageKey): { success: boolean } {
    try {
      const fullKey = getFullKey(key);
      localStorage.removeItem(fullKey);
      return { success: true };
    } catch (e) {
      console.error(`Failed to remove storage key ${key}:`, e);
      return { success: false };
    }
  },
};
