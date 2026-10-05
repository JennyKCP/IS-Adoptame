




interface UnitLabel {
  name: string;
  location: { name: string };
}

export const formatUnitLabel = (unit: UnitLabel): string =>
  `${unit.location.name} · ${unit.name}`;


export const buildLocationChangeSummary = (
  previousUnit: UnitLabel | null,
  nextUnit: UnitLabel | null
): string => {
  if (!previousUnit && nextUnit) {
    
    return `Moved to ${formatUnitLabel(nextUnit)}.`;
  }
  if (previousUnit && !nextUnit) {
    
    return `Removed from ${formatUnitLabel(previousUnit)} (now unplaced).`;
  }
  if (previousUnit && nextUnit) {
    
    return `Moved from ${formatUnitLabel(previousUnit)} to ${formatUnitLabel(
      nextUnit
    )}.`;
  }
  
  return "Location updated.";
};
