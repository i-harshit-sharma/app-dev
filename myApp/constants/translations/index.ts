import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './en.json';
import es from './es.json';
import hi from './hi.json';

const i18n = new I18n({
  en,
  es,
  hi,
});

i18n.defaultLocale = 'en';
i18n.locale = Localization.getLocales?.()?.[0]?.languageTag ?? 'en';
i18n.enableFallback = true;

export default i18n;
