import { useRef, useCallback } from 'react';

export function useSpecular<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<T> | MouseEvent) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ref.current.style.setProperty('--local-x', `${x}px`);
      ref.current.style.setProperty('--local-y', `${y}px`);
    }
  }, []);

  return { ref, handleMouseMove };
}
