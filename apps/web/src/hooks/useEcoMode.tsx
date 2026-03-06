import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface EcoModeContextType {
  isEcoMode: boolean;
  toggleEcoMode: () => void;
}

const EcoModeContext = createContext<EcoModeContextType | undefined>(undefined);

export const EcoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEcoMode, setIsEcoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('eco-mode');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isEcoMode) {
      document.body.setAttribute('data-eco-mode', 'true');
    } else {
      document.body.removeAttribute('data-eco-mode');
    }
    localStorage.setItem('eco-mode', String(isEcoMode));
  }, [isEcoMode]);

  // Optimized with useCallback to prevent unnecessary re-renders of React.memo components consuming this context (e.g. ChatSettingsBar)
  const toggleEcoMode = useCallback(() => setIsEcoMode((prev) => !prev), []);

  return (
    <EcoModeContext.Provider value={{ isEcoMode, toggleEcoMode }}>
      {children}
    </EcoModeContext.Provider>
  );
};

export function useEcoMode() {
  const context = useContext(EcoModeContext);
  if (!context) {
    throw new Error('useEcoMode must be used within an EcoModeProvider');
  }
  return context;
}
