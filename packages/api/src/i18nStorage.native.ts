import AsyncStorage from "@react-native-async-storage/async-storage";

// Native storage backend for i18n preferences (locale/currency). React Native
// has no localStorage; AsyncStorage (already used by supabase.native.ts for
// sessions) persists the chosen language/currency across cold starts. Metro
// resolves this file over i18nStorage.ts via the `.native` extension.

/** Synchronous read — AsyncStorage is async-only, so native returns null. */
export function getI18nItemSync(_key: string): string | null {
  return null;
}

/** Async read used to hydrate the provider after mount. */
export async function loadI18nItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Fire-and-forget persist. */
export function saveI18nItem(key: string, value: string): void {
  AsyncStorage.setItem(key, value).catch(() => {});
}
