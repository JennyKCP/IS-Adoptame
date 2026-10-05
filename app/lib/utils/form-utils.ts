
export const toYesNo = (value: boolean | null | undefined): "true" | "false" =>
  value ? "true" : "false";


export const boolToSelectValue = (
  value: boolean | null | undefined
): "true" | "false" | undefined => {
  if (value === true) return "true";
  if (value === false) return "false";
  return undefined;
};
