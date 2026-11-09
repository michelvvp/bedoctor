import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIM_DIR = join(import.meta.dirname, '..', 'src', 'sim');
const UI_DIR = join(import.meta.dirname, '..', 'src', 'ui');

function imports(dir: string): { file: string; from: string }[] {
  const found: { file: string; from: string }[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts')) continue;
    const source = readFileSync(join(dir, file), 'utf8');
    for (const m of source.matchAll(/from\s+'([^']+)'/g)) found.push({ file, from: m[1]! });
  }
  return found;
}

describe('camadas', () => {
  it('a simulação só importa a própria sim/', () => {
    for (const { file, from } of imports(SIM_DIR)) {
      expect(from.startsWith('./'), `${file} importa ${from}`).toBe(true);
    }
  });

  it('a ui/ só fala com o jogo pela GameApi', () => {
    for (const { file, from } of imports(UI_DIR)) {
      const ok = from === '../game/api' || from.startsWith('./');
      expect(ok, `${file} importa ${from}`).toBe(true);
    }
  });
});
