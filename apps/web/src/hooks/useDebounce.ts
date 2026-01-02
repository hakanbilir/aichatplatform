import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value.
 * Returns the value after it has stopped changing for the specified delay.
 * Useful for search inputs to prevent excessive filtering or API calls.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on component unmount)
    // Değer değişirse (veya bileşen kaldırılırsa) zaman aşımını iptal et
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
