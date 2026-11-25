'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Menunda pemanggilan callback sampai tidak ada panggilan baru selama `delay`.
 *
 * Dipakai halaman admin untuk meredam burst event realtime: alih-alih
 * me-refetch 5 query setiap kali satu suara masuk, beberapa event beruntun
 * digabung menjadi satu reload.
 *
 * Identitas callback yang dikembalikan stabil (tidak berubah antar render),
 * jadi aman dipakai sebagai dependency useEffect yang memasang channel realtime.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 500
) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay]
  );
}
