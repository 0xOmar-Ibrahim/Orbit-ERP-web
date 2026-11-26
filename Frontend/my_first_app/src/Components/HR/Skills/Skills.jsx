import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../Attendance/Attendance.css";
import "./Skills.css";
import Icon from "../Attendance/Icon";
import SkillModal from "./SkillModal";
import { Empty, ErrorBanner, Loading, SectionHeading } from "../shared/HrStates";
import { employeeIdOf, fullName, hrFetchAll, hrRequest } from "../shared/hrRequest";
import { levelLabel, levelPercent, yearsLabel } from "./skillUtils";

/** Skills tab of the employee profile — the signed-in employee's skills */
export default function Skills() {
  const outlet = useOutletContext() || {};
  const user = outlet.user;
  const employeeId = employeeIdOf(user);

  const [mySkills, setMySkills] = useState([]);
  const [catalog, setCatalog] = useState([]); // all skills
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { item: null | {...} }

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError("");
    try {
      const [mine, skills, cats] = await Promise.all([
        hrFetchAll("employee-skills/", { employee_id: employeeId }),
        hrFetchAll("skills/"),
        hrFetchAll("skill-categories/"),
      ]);
      setMySkills([...mine].sort((a, b) => b.level - a.level || String(a.skill__name).localeCompare(b.skill__name)));
      setCatalog(skills);
      setCategories(cats);
    } catch (err) {
      if (err.message !== "SESSION_EXPIRED") setError(err.message);
      setMySkills([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Creates the skill in the catalog first when it's a new one */
  const save = async ({ skillId, newSkill, level, years }, item) => {
    let id = skillId;

    if (!id && newSkill) {
      await hrRequest("skills/", { method: "POST", body: { skill_category: newSkill.categoryId, name: newSkill.name } });
      // POST returns only a message, so look the new skill up by name and category
      const found = await hrFetchAll("skills/", { name: newSkill.name, skill_category_id: newSkill.categoryId });
      id = found[0]?.skill_id;
      if (!id) throw new Error("The skill was created but couldn't be loaded. Please try again.");
    }

    const body = { employee: employeeId, skill: Number(id), level: Number(level), years_experience: Number(years) };
    if (item) await hrRequest("employee-skills/", { method: "PATCH", body: { employee_skill_id: item.employee_skill_id, ...body } });
    else await hrRequest("employee-skills/", { method: "POST", body });
    load();
  };

  const remove = async (item) => {
    await hrRequest("employee-skills/", { method: "DELETE", body: { employee_skill_id: item.employee_skill_id } });
    load();
  };

  const pageError = user && !employeeId ? "Couldn't identify the signed-in employee." : error;

  return (
    <div className="att-page">
      <div className="att-inner">
        <SectionHeading eyebrow="Capabilities" title="Skills" copy="Experience and proficiency across key competencies.">
          <button type="button" className="att-button primary" onClick={() => setModal({ item: null })} disabled={!employeeId}>
            <Icon name="plus" size={17} /> Add skill
          </button>
        </SectionHeading>

        <ErrorBanner message={pageError} onRetry={employeeId ? load : undefined} />

        {loading && employeeId ? (
          <Loading />
        ) : !mySkills.length ? (
          <Empty
            title="No skills found"
            copy="Add a new skill to this employee's profile."
            action={employeeId ? "Add skill" : undefined}
            onAction={() => setModal({ item: null })}
          />
        ) : (
          <div className="hr-skills-grid">
            {mySkills.map((s) => (
              <section className="att-card hr-skill-card" key={s.employee_skill_id}>
                <div>
                  <span className="hr-chip">{s.skill__skill_category__name}</span>
                  <button type="button" aria-label={`Edit ${s.skill__name}`} onClick={() => setModal({ item: s })}>
                    •••
                  </button>
                </div>
                <h3>{s.skill__name}</h3>
                <p>{yearsLabel(s.years_experience)}</p>
                <div className="hr-skill-level">
                  <span>{levelLabel(s.level)}</span>
                  <b>{levelPercent(s.level)}%</b>
                </div>
                <i className="hr-progress">
                  <em style={{ width: `${levelPercent(s.level)}%` }} />
                </i>
              </section>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <SkillModal
          employeeLabel={fullName(user)}
          item={modal.item}
          catalog={catalog}
          categories={categories}
          takenSkillIds={mySkills.map((s) => s.skill_id)}
          onClose={() => setModal(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}
