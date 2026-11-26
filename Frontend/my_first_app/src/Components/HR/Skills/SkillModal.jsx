import React, { useState } from "react";
import HrModal, { Field, SelectInput, useModalState } from "../shared/HrModal";
import SearchSelect from "../shared/SearchSelect";
import { SKILL_LEVELS } from "./skillUtils";

const str = (v) => (v === null || v === undefined ? "" : String(v));

/** Add (item = null) or edit one of the employee's skills */
export default function SkillModal({ employeeLabel, item, catalog, categories, takenSkillIds, onClose, onSave, onDelete }) {
  const editing = Boolean(item);

  const [skillId, setSkillId] = useState(str(item?.skill_id));
  const [newName, setNewName] = useState(""); // set when "Add new skill" is used
  const [categoryId, setCategoryId] = useState(() => {
    const skill = catalog.find((s) => s.skill_id === item?.skill_id);
    return str(skill?.skill_category_id);
  });
  const [level, setLevel] = useState(str(item?.level));
  const [years, setYears] = useState(str(item?.years_experience));

  const { errors, setErrors, formError, setFormError, saving, saved, clearError, run } = useModalState(onClose);

  const skillOptions = [
    ...catalog.map((s) => ({ value: String(s.skill_id), label: s.name, hint: s.skill_category__name })),
    ...(newName ? [{ value: `new:${newName}`, label: newName, hint: "New skill" }] : []),
  ];
  const selectedValue = newName && !skillId ? `new:${newName}` : skillId;
  const isNew = Boolean(newName) && !skillId;

  const pickSkill = (value) => {
    clearError("skill");
    if (!value) {
      setSkillId("");
      return;
    }
    if (String(value).startsWith("new:")) {
      setSkillId("");
      return;
    }
    setSkillId(value);
    setNewName("");
    // An existing skill already belongs to a category
    const skill = catalog.find((s) => String(s.skill_id) === String(value));
    if (skill) {
      setCategoryId(String(skill.skill_category_id));
      clearError("category");
    }
  };

  const submit = () => {
    const next = {};
    if (!skillId && !newName) next.skill = "This field is required";
    if (!categoryId) next.category = "This field is required";
    if (!level) next.level = "This field is required";
    if (years === "") next.years_experience = "This field is required";
    const missing = Object.keys(next).length > 0;

    if (years !== "" && (!Number.isInteger(Number(years)) || Number(years) < 0)) {
      next.years_experience = "Enter whole years (0 or more)";
    }
    if (skillId && takenSkillIds.includes(Number(skillId)) && Number(skillId) !== item?.skill_id) {
      next.skill = "This employee already has this skill";
    }

    setErrors(next);
    if (Object.keys(next).length) {
      setFormError(missing ? "Please complete all required fields before saving." : "");
      return;
    }

    run(() =>
      onSave(
        {
          skillId: skillId || null,
          newSkill: isNew ? { name: newName, categoryId: Number(categoryId) } : null,
          level,
          years,
        },
        item
      )
    );
  };

  return (
    <HrModal
      eyebrow={employeeLabel}
      title={editing ? "Edit skill" : "Add skill"}
      saving={saving}
      saved={saved}
      error={formError}
      onClose={onClose}
      onSubmit={submit}
      onDelete={editing ? () => run(() => onDelete(item)) : undefined}
    >
      <Field label="Skill name" required error={errors.skill}>
        <SearchSelect
          value={selectedValue}
          onChange={pickSkill}
          options={skillOptions}
          placeholder="Search and select a skill"
          createLabel="Add new skill"
          onCreate={(name) => {
            setNewName(name);
            setSkillId("");
            clearError("skill");
          }}
        />
      </Field>
      <div className="att-form-grid">
        <Field label="Category" required error={errors.category || errors.skill_category}>
          {isNew ? (
            <SelectInput
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v);
                clearError("category");
              }}
              options={categories.map((c) => ({ value: String(c.skill_category_id), label: c.name }))}
              placeholder="Select category"
            />
          ) : (
            <>
              <select value={categoryId} disabled className={categoryId ? "" : "is-placeholder"}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.skill_category_id} value={String(c.skill_category_id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </Field>
        <Field label="Level" required error={errors.level}>
          <SelectInput
            value={level}
            onChange={(v) => {
              setLevel(v);
              clearError("level");
            }}
            options={SKILL_LEVELS.map((l) => ({ value: String(l.value), label: l.label }))}
            placeholder="Select level"
          />
        </Field>
        <Field label="Years of experience" required error={errors.years_experience}>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={years}
            onChange={(e) => {
              setYears(e.target.value);
              clearError("years_experience");
            }}
            placeholder="0"
          />
        </Field>
      </div>
    </HrModal>
  );
}
