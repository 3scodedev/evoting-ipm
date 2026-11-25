import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(
  new URL('./use-debounced-callback.ts', import.meta.url),
  'utf8'
);

describe('useDebouncedCallback', () => {
  test('uses a ref for the callback so identity stays stable', () => {
    expect(src).toContain('fnRef.current = fn');
  });

  test('clears a pending timer before scheduling a new one', () => {
    expect(src).toContain('if (timer.current) clearTimeout(timer.current)');
  });

  test('clears the timer on unmount', () => {
    expect(src).toMatch(/useEffect\(\s*\(\)\s*=>\s*\(\)\s*=>/);
  });

  test('debounce delay is a parameter with a sane default', () => {
    expect(src).toContain('delay = 500');
  });

  test('exposes the debounced fn via useCallback with delay dep', () => {
    expect(src).toMatch(/useCallback\(\s*\(\.\.\.args: A\)[\s\S]*?\[delay\]\s*\)/);
  });
});

describe('admin pages wiring', () => {
  const pages = [
    'src/app/admin/dashboard/page.tsx',
    'src/app/admin/reports/page.tsx',
    'src/app/admin/kiosks/page.tsx',
  ];

  for (const p of pages) {
    test(`${p} debounces realtime reloads`, () => {
      const code = readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
      expect(code).toContain('useDebouncedCallback');
      expect(code).toContain('debouncedLoad');
    });
  }

  test('dashboard no longer does a count-exact scan on votes', () => {
    const code = readFileSync(
      new URL('../app/admin/dashboard/page.tsx', import.meta.url),
      'utf8'
    );
    // Cocokkan pola query sebenarnya, bukan komentar yang menjelaskan penghapusannya.
    expect(code).not.toMatch(/from\('votes'\)\s*\.select\([^)]*head:\s*true/);
    expect(code).not.toMatch(/from\('votes'\)\s*\.select\([^)]*count:\s*'exact'/);
  });

  test('dashboard patches vote total from realtime INSERT without refetch', () => {
    const code = readFileSync(
      new URL('../app/admin/dashboard/page.tsx', import.meta.url),
      'utf8'
    );
    expect(code).toContain("event: 'INSERT'");
    expect(code).toContain('s.votes + 1');
  });

  test('reports no longer subscribes to the votes table', () => {
    const code = readFileSync(
      new URL('../app/admin/reports/page.tsx', import.meta.url),
      'utf8'
    );
    expect(code).not.toMatch(/table: 'votes'/);
  });

  test('reports polling is 30s, not 5s', () => {
    const code = readFileSync(
      new URL('../app/admin/reports/page.tsx', import.meta.url),
      'utf8'
    );
    expect(code).toContain('setInterval(load, 30_000)');
    expect(code).not.toContain('setInterval(load, 5000)');
  });

  test('kiosks polling is 30s, not 10s', () => {
    const code = readFileSync(
      new URL('../app/admin/kiosks/page.tsx', import.meta.url),
      'utf8'
    );
    expect(code).toContain('setInterval(load, 30_000)');
    expect(code).not.toContain('setInterval(load, 10_000)');
  });
});
