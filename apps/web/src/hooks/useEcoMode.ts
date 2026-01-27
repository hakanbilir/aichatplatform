import { useState, useEffect } from 'react';

export function useEcoMode() {
  const [isEcoMode, setIsEcoMode] = useState<boolean>(() => {
    // Check if window is defined (SSR safety)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('eco-mode');
      if (stored !== null) return stored === 'true';
      // Auto-detect preference
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

  const toggleEcoMode = () => setIsEcoMode(prev => !prev);

  return { isEcoMode, toggleEcoMode };
}
