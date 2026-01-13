import { useState, useEffect } from 'react';

/**
 * Custom hook để debounce một value
 * @param value - Giá trị cần debounce
 * @param delay - Thời gian delay (ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
