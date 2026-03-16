import { useRef, useCallback, useEffect } from "react";

export function useDebounce<T extends (...args: any[]) => any>(fn: T,  delayMs: number): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
  }, [delayMs]);
}

export function useDebouncedRef(delayMs: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((fn: () => void) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(fn, delayMs);
  }, [delayMs]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { schedule, cancel };
}
