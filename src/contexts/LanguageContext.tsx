import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n, t } = useTranslation();

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // Normalize language to just 'en' or 'es' 
  const normalizedLanguage = i18n.language.startsWith('en') ? 'en' : 
                            i18n.language.startsWith('es') ? 'es' : 'en';

  useEffect(() => {
    // Set initial language from localStorage or browser preference
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && ['en', 'es'].includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    } else {
      // Default to English if no valid language found
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  return (
    <LanguageContext.Provider value={{
      language: normalizedLanguage,
      setLanguage,
      t,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}