import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS, type SupportedLanguage } from '@/locales';
import { useAuth } from './AuthContext';
import api from '@/services/api';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
  languageNames: typeof LANGUAGE_NAMES;
  languageFlags: typeof LANGUAGE_FLAGS;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [language, setLanguageState] = useState<SupportedLanguage>(
    (i18n.language?.substring(0, 2) as SupportedLanguage) || 'en'
  );

  // Sync language with user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.language) {
      const userLang = user.language as SupportedLanguage;
      if (SUPPORTED_LANGUAGES.includes(userLang) && userLang !== language) {
        setLanguageState(userLang);
        i18n.changeLanguage(userLang);
      }
    }
  }, [isAuthenticated, user?.language, i18n, language]);

  // Update i18n when language changes
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;

    setLanguageState(lang);
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);

    // Save to server if authenticated
    if (isAuthenticated) {
      try {
        await api.updateProfile({ language: lang });
      } catch (error) {
        console.error('Failed to save language preference to server:', error);
      }
    }
  }, [i18n, isAuthenticated]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        availableLanguages: SUPPORTED_LANGUAGES,
        languageNames: LANGUAGE_NAMES,
        languageFlags: LANGUAGE_FLAGS,
      }}
    >
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

