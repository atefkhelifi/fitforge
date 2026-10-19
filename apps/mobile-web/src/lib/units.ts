export type Units = 'metric' | 'imperial';

// Data is always stored in kg and cm. These helpers convert for display and for what the user types.

const LB_PER_KG = 2.20462262185;
const CM_PER_INCH = 2.54;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

export const weightUnit = (units: Units) => (units === 'imperial' ? 'lb' : 'kg');

/** kg to the number shown in the chosen units. */
export const toDisplayWeight = (kg: number, units: Units) => (units === 'imperial' ? kgToLb(kg) : kg);

/** A number the user typed in the chosen units to kg. */
export const fromDisplayWeight = (value: number, units: Units) => (units === 'imperial' ? lbToKg(value) : value);

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** "62.5", "135" (no trailing zeros), without the unit. */
export function weightText(kg: number, units: Units): string {
  return String(round1(toDisplayWeight(kg, units)));
}

/** "62.5 kg" or "137.8 lb". */
export function formatWeight(kg: number, units: Units): string {
  return `${weightText(kg, units)} ${weightUnit(units)}`;
}

/** Whole inches are the finest height unit people use, so 180 cm is 5 ft 11 in. */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { ft: Math.floor(totalInches / 12), inch: totalInches % 12 };
}

export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * CM_PER_INCH;

export function formatHeight(cm: number, units: Units): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft} ft ${inch} in`;
}

/** The smallest sensible load jump: a 2.5 kg plate pair or a 5 lb pair. */
export const loadStep = (units: Units) => (units === 'imperial' ? 5 : 2.5);

/** A kg suggestion rounded to a whole step in the chosen units (60 kg -> 130 lb), as a display number. */
export function suggestedDisplayWeight(kg: number, units: Units): number {
  const step = loadStep(units);
  return Math.round(toDisplayWeight(kg, units) / step) * step;
}

/** Re-expresses a number the user typed when they switch units ("135" lb -> "61.2" kg). Empty or invalid input stays empty. */
export function convertWeightText(text: string, from: Units, to: Units): string {
  const n = parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(n) || from === to) return from === to ? text : '';
  return String(round1(toDisplayWeight(fromDisplayWeight(n, from), to)));
}

/** The text for each height field (cm, or feet and inches) for a height in cm. */
export function heightFields(cm: number): { cm: string; ft: string; inch: string } {
  const { ft, inch } = cmToFtIn(cm);
  return { cm: String(Math.round(cm)), ft: String(ft), inch: String(inch) };
}
