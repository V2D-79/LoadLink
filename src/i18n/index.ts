/**
 * src/i18n/index.ts
 *
 * i18next initialization with expo-localization.
 * Supports English, Marathi, Hindi. Language persisted in AsyncStorage.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import mr from './locales/mr.json';
import hi from './locales/hi.json';

const LANGUAGE_KEY = '@loadlink_language';

const resources = {
  en: { translation: en },
  mr: { translation: mr },
  hi: { translation: hi },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: '\u092E\u0930\u093E\u0920\u0940' },
  { code: 'hi', label: '\u0939\u093F\u0928\u094D\u0926\u0940' },
] as const;

async function getInitialLanguage(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && ['en', 'mr', 'hi'].includes(saved)) return saved;
  } catch {
    // Ignore read error, use device locale
  }
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
  if (['mr', 'hi'].includes(deviceLang)) return deviceLang;
  return 'en';
}

export async function changeLanguage(lang: string): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

// Initialize synchronously with 'en' as default,
// then override with async-resolved language
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Load saved language preference asynchronously
getInitialLanguage().then((lang) => {
  if (lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
