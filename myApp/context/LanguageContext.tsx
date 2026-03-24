import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import i18n from '@/constants/translations';

type LanguageContextType = {
  locale: string;
  setLanguage: (langCode: string) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState(i18n.locale);

  useEffect(() => {
    const loadLang = async () => {
      try {
        const savedLang = await SecureStore.getItemAsync('selectedLanguage');
        if (savedLang) {
          i18n.locale = savedLang;
          setLocaleState(savedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLang();
  }, []);

  const setLanguage = async (langCode: string) => {
    try {
      await SecureStore.setItemAsync('selectedLanguage', langCode);
      i18n.locale = langCode;
      setLocaleState(langCode);
    } catch (e) {
      console.error('Failed to set language', e);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
