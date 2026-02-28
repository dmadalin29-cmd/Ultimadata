import { createContext, useContext, useState, useEffect } from 'react';
import { translations, supportedLanguages } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('x67_language');
    if (saved && translations[saved]) return saved;
    
    // Check browser language
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang && translations[browserLang]) return browserLang;
    
    // Default to Romanian
    return 'ro';
  });

  useEffect(() => {
    localStorage.setItem('x67_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }
    
    return value || key;
  };

  const changeLanguage = (lang) => {
    if (translations[lang] && lang !== language) {
      localStorage.setItem('x67_language', lang);
      // Reload page to apply translations everywhere
      window.location.reload();
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: changeLanguage, 
      t, 
      languages: supportedLanguages 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { translations, supportedLanguages };
