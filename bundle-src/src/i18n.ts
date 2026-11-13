/**
 * The editor strings (block add-on contract §1.14). The `en` catalog doubles
 * as the fallback where no i18n instance holds ours, as in a test or an
 * Aurora app that has not collected `locales/`.
 */
import { getI18n } from 'react-i18next';
import de from '../locales/de/common.json';
import en from '../locales/en/common.json';

export const locales = { de, en };

function english(key: string): string {
  const found = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
  return typeof found === 'string' ? found : key;
}

export function translate(key: string): string {
  const fallback = english(key);
  return getI18n()?.t(key, { defaultValue: fallback }) ?? fallback;
}
