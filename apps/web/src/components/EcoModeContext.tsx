import React, { createContext, useContext, useState, useEffect } from 'react';

interface EcoModeContextType {
  isEcoMode: boolean;
  toggleEcoMode: () => void;
}

const EcoModeContext = createContext<EcoModeContextType>({
  isEcoMode: false,
  toggleEcoMode: () => {},
});

export const useEcoMode = () => useContext(EcoModeContext);

export const EcoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEcoMode, setIsEcoMode] = useState(false);

  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsEcoMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsEcoMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleEcoMode = () => setIsEcoMode(prev => !prev);

  // Apply eco-mode class to body for global CSS overrides
  useEffect(() => {
    if (isEcoMode) {
      document.body.classList.add('eco-mode');
      // Override CSS variables for eco mode
      document.documentElement.style.setProperty('--blur', '0px');
      document.documentElement.style.setProperty('--saturation', '100%');
    } else {
      document.body.classList.remove('eco-mode');
      document.documentElement.style.setProperty('--blur', '30px');
      document.documentElement.style.setProperty('--saturation', '200%');
    }
  }, [isEcoMode]);

  return (
    <EcoModeContext.Provider value={{ isEcoMode, toggleEcoMode }}>
      {children}
    </EcoModeContext.Provider>
  );
};
