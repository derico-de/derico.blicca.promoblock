import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { locales } from '../src/i18n';

/** What the editor does with a bundle's `locales` export, made the global instance. */
export function editorIn(language: string) {
  const i18n = createInstance();
  void i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    resources: Object.fromEntries(
      Object.entries(locales).map(([name, catalog]) => [name, { common: catalog }]),
    ),
    interpolation: { escapeValue: false },
  });
  return i18n;
}
