import type { WeightUnitSystem } from "./shelter-settings";

export type WeightUnit = "g" | "kg" | "oz" | "lb";

const GRAMS_PER_OUNCE = 28.349523125;
const GRAMS_PER_POUND = 453.59237;

const GRAMS_PER_UNIT: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: GRAMS_PER_OUNCE,
  lb: GRAMS_PER_POUND,
};



export const weightUnits = (
  system: WeightUnitSystem,
): readonly [WeightUnit, WeightUnit] =>
  system === "imperial" ? ["oz", "lb"] : ["g", "kg"];

export function toGrams(value: number, unit: WeightUnit): number {
  return value * GRAMS_PER_UNIT[unit];
}

export function fromGrams(grams: number, unit: WeightUnit): number {
  return grams / GRAMS_PER_UNIT[unit];
}



export function roundForUnit(value: number, unit: WeightUnit): number {
  return unit === "g" ? Math.round(value) : Math.round(value * 100) / 100;
}




export function inferWeightUnit(
  previousWeightGrams: number | null | undefined,
  system: WeightUnitSystem,
): WeightUnit {
  const [small, large] = weightUnits(system);
  if (previousWeightGrams == null) return large;
  const smallUnitCeilingGrams = GRAMS_PER_UNIT[large];
  return previousWeightGrams < smallUnitCeilingGrams ? small : large;
}



function trimDecimal(value: number, maxDecimals: number): string {
  const fixed = value.toFixed(maxDecimals);
  return fixed.includes(".")
    ? fixed.replace(/0+$/, "").replace(/\.$/, "")
    : fixed;
}


export function formatWeight(
  grams: number | null | undefined,
  system: WeightUnitSystem,
): string {
  if (grams == null) return "";

  if (system === "imperial") {
    if (grams < GRAMS_PER_POUND) {
      return `${trimDecimal(grams / GRAMS_PER_OUNCE, 1)} oz`;
    }
    return `${trimDecimal(grams / GRAMS_PER_POUND, 2)} lb`;
  }

  if (grams < 1000) {
    return `${Math.round(grams)} g`;
  }
  return `${trimDecimal(grams / 1000, 2)} kg`;
}


export function formatTemperature(
  celsius: number | null | undefined,
  system: WeightUnitSystem,
): string {
  if (celsius == null) return "";

  if (system === "imperial") {
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${trimDecimal(fahrenheit, 1)}°F`;
  }
  return `${trimDecimal(celsius, 1)}°C`;
}
