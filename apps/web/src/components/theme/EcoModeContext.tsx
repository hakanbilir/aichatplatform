import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface EcoModeContextType {
  isEcoMode: boolean;
  toggleEcoMode: () => void;
}

const EcoModeContext = createContext<EcoModeContextType | undefined>(undefined);

export const EcoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEcoMode, setIsEcoMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsEcoMode(true);
    }

    const handler = (e: MediaQueryListEvent) => setIsEcoMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isEcoMode) {
      document.body.setAttribute('data-eco-mode', 'true');
    } else {
      document.body.removeAttribute('data-eco-mode');
    }
  }, [isEcoMode]);

  const toggleEcoMode = () => setIsEcoMode((prev) => !prev);

  return (
    <EcoModeContext.Provider value={{ isEcoMode, toggleEcoMode }}>
      {children}
    </EcoModeContext.Provider>
  );
};

export const useEcoMode = () => {
  const context = useContext(EcoModeContext);
  if (!context) {
    throw new Error('useEcoMode must be used within an EcoModeProvider');
  }
  return context;
};
