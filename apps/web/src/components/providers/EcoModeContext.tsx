import React, { createContext, useContext, useState, useEffect } from 'react';

interface EcoModeContextType {
  isEcoMode: boolean;
  toggleEcoMode: () => void;
}

const EcoModeContext = createContext<EcoModeContextType | undefined>(undefined);

export const EcoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEcoMode, setIsEcoMode] = useState<boolean>(() => {
    // Check local storage or media query
    const saved = localStorage.getItem('eco-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    localStorage.setItem('eco-mode', String(isEcoMode));
    if (isEcoMode) {
      document.body.classList.add('eco-mode');
    } else {
      document.body.classList.remove('eco-mode');
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
