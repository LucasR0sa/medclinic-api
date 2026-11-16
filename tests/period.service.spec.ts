import { periodsOverlap } from '../src/services/period.service';

/** Caso mínimo 1 (Seção 4.5): os cinco cenários de sobreposição. Base: 10:00-10:30. */
describe('periodsOverlap', () => {
  const base = { start: 600, end: 630 }; // 10:00-10:30, em minutos do dia

  it.each([
    ['um ANTES do outro (09:00-09:30)', { start: 540, end: 570 }, false],
    ['um DEPOIS do outro (11:00-11:30)', { start: 660, end: 690 }, false],
    ['ENCOSTADO no fim (10:30-11:00) não conflita', { start: 630, end: 660 }, false],
    ['ENCOSTADO no início (09:30-10:00) não conflita', { start: 570, end: 600 }, false],
    ['um DENTRO do outro (10:10-10:20)', { start: 610, end: 620 }, true],
    ['CRUZANDO a borda (10:20-10:50)', { start: 620, end: 650 }, true],
    ['período idêntico', { start: 600, end: 630 }, true],
  ])('%s', (_cenario, other, expected) => {
    expect(periodsOverlap(base, other)).toBe(expected);
    expect(periodsOverlap(other, base)).toBe(expected); // a regra é simétrica
  });
});
