export const educationLevels = ["primary", "secondary", "university"] as const;

export type EducationLevel = (typeof educationLevels)[number];

export const educationLevelLabels: Record<EducationLevel, string> = {
  primary: "Primario",
  secondary: "Secundario",
  university: "Universitario",
};

export const educationLevelOptions = educationLevels.map((value) => ({
  value,
  label: educationLevelLabels[value],
}));

export function isEducationLevel(value: unknown): value is EducationLevel {
  return (
    typeof value === "string" &&
    educationLevels.includes(value as EducationLevel)
  );
}
