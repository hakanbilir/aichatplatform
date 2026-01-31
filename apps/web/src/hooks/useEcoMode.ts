import { useState, useEffect } from 'react';

export function useEcoMode() {
  const [ecoMode, setEcoMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('eco-mode');
    if (stored) {
        const isEco = stored === 'true';
        setEcoMode(isEco);
        if (isEco) document.body.setAttribute('data-eco-mode', 'true');
    }
  }, []);

  const toggleEcoMode = () => {
    setEcoMode(prev => {
        const next = !prev;
        localStorage.setItem('eco-mode', String(next));
        if (next) document.body.setAttribute('data-eco-mode', 'true');
        else document.body.removeAttribute('data-eco-mode');
        return next;
    });
  };

  return { ecoMode, toggleEcoMode };
}
