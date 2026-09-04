// Web storage backend for i18n preferences (locale/currency). Metro resolves
// i18nStorage.native.ts over this file on iOS/Android via the `.native`
// platform extension, mirroring supabase.ts / supabase.native.ts.

/** Synchronous read — available on web (localStorage); null on native. */
export function getI18nItemSync(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

/** Async read used to hydrate the provider after mount. */
export async function loadI18nItem(key: string): Promise<string | null> {
  return getI18nItemSync(key);
}

/** Fire-and-forget persist. */
export function saveI18nItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}
