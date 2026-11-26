// Values match EmployeeSkill.SkillLevel in backend/apps/hr/models.py.
// The backend stores a level (1–4), so the progress bar shows level / 4.
export const SKILL_LEVELS = [
  { value: 1, label: "Beginner" },
  { value: 2, label: "Intermediate" },
  { value: 3, label: "Advanced" },
  { value: 4, label: "Expert" },
];

export const levelLabel = (level) => SKILL_LEVELS.find((l) => l.value === Number(level))?.label || "—";

export const levelPercent = (level) => Math.round((Math.min(Math.max(Number(level) || 0, 0), 4) / 4) * 100);

export const yearsLabel = (years) => `${years} year${Number(years) === 1 ? "" : "s"} experience`;
