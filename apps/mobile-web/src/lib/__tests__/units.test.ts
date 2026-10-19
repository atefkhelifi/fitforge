import { describe, expect, it } from 'vitest';

import {
  cmToFtIn,
  convertWeightText,
  heightFields,
  formatHeight,
  formatWeight,
  fromDisplayWeight,
  ftInToCm,
  kgToLb,
  lbToKg,
  loadStep,
  suggestedDisplayWeight,
  toDisplayWeight,
  weightText,
  weightUnit,
} from '../units';

describe('weight', () => {
  it('converts between kg and lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
    expect(lbToKg(220.462)).toBeCloseTo(100, 2);
    expect(kgToLb(0)).toBe(0);
  });

  it('is the identity in metric', () => {
    expect(toDisplayWeight(62.5, 'metric')).toBe(62.5);
    expect(fromDisplayWeight(62.5, 'metric')).toBe(62.5);
  });

  it('round-trips a typed value through storage without visible drift', () => {
    for (const lb of [45, 95, 135, 185, 225, 315, 132.5]) {
      const storedKg = fromDisplayWeight(lb, 'imperial');
      expect(weightText(storedKg, 'imperial')).toBe(String(lb));
    }
    for (const kg of [20, 60, 62.5, 100, 142.5]) {
      expect(weightText(fromDisplayWeight(kgToLb(kg), 'imperial') , 'metric')).toBe(String(kg));
    }
  });

  it('formats with unit and without trailing zeros', () => {
    expect(formatWeight(62.5, 'metric')).toBe('62.5 kg');
    expect(formatWeight(60, 'metric')).toBe('60 kg');
    expect(formatWeight(61.235, 'imperial')).toBe('135 lb');
    expect(weightUnit('imperial')).toBe('lb');
    expect(weightUnit('metric')).toBe('kg');
  });
});

describe('height', () => {
  it('converts 180 cm to 5 ft 11 in and back within an inch', () => {
    expect(cmToFtIn(180)).toEqual({ ft: 5, inch: 11 });
    expect(Math.abs(ftInToCm(5, 11) - 180)).toBeLessThan(1.3);
  });

  it('handles whole feet and rolls inches over', () => {
    expect(cmToFtIn(182.88)).toEqual({ ft: 6, inch: 0 });
    expect(cmToFtIn(152.4)).toEqual({ ft: 5, inch: 0 });
    expect(ftInToCm(6, 0)).toBeCloseTo(182.88, 2);
  });

  it('formats in both systems', () => {
    expect(formatHeight(180, 'metric')).toBe('180 cm');
    expect(formatHeight(180, 'imperial')).toBe('5 ft 11 in');
  });
});

describe('load suggestions', () => {
  it('uses plate-sized steps in each system', () => {
    expect(loadStep('metric')).toBe(2.5);
    expect(loadStep('imperial')).toBe(5);
  });

  it('rounds a kg guess to a whole step in the chosen units', () => {
    expect(suggestedDisplayWeight(60, 'metric')).toBe(60);
    expect(suggestedDisplayWeight(61, 'metric')).toBe(60);
    expect(suggestedDisplayWeight(60, 'imperial')).toBe(130); // 132.3 lb
    expect(suggestedDisplayWeight(22, 'imperial')).toBe(50); // 48.5 lb
  });
});

describe('switching units while typing', () => {
  it('converts what was typed and keeps nothing for invalid input', () => {
    expect(convertWeightText('80', 'metric', 'imperial')).toBe('176.4');
    expect(convertWeightText('176,4', 'imperial', 'metric')).toBe('80');
    expect(convertWeightText('135', 'imperial', 'imperial')).toBe('135');
    expect(convertWeightText('', 'metric', 'imperial')).toBe('');
    expect(convertWeightText('abc', 'metric', 'imperial')).toBe('');
  });

  it('fills the height fields for both systems', () => {
    expect(heightFields(180)).toEqual({ cm: '180', ft: '5', inch: '11' });
    expect(heightFields(152.4)).toEqual({ cm: '152', ft: '5', inch: '0' });
  });
});
