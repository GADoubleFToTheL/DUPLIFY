import { describe, expect, it } from 'vitest';
import { partLabel, partPhraseAcc } from './speech';

describe('Sprachausgabe', () => {
  it('bildet kindgerechte Sätze', () => {
    expect(partPhraseAcc('brick-2x4', 'rot')).toBe('den großen roten Stein');
    expect(partPhraseAcc('brick-2x2', 'lila')).toBe('den kleinen lila Stein');
    expect(partPhraseAcc('door', 'blau')).toBe('die blaue Tür');
    expect(partPhraseAcc('window', 'weiss')).toBe('das weiße Fenster');
    expect(partPhraseAcc('brick-2x4', 'gelb', 'eyes')).toBe('den gelben Augenstein');
    expect(partPhraseAcc('figure', null)).toBe('die Figur');
  });

  it('beschriftet Teile', () => {
    expect(partLabel('brick-2x4', 'rot')).toBe('Großer roter Stein');
    expect(partLabel('window', 'gelb')).toBe('Gelbes Fenster');
    expect(partLabel('flower', 'rosa')).toBe('Rosa Blume');
  });
});
