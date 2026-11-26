import React, { useState } from "react";
import HrModal, { Field, SelectInput, useModalState } from "../shared/HrModal";
import SearchSelect from "../shared/SearchSelect";
import { CONTRACT_STATUSES, CONTRACT_TYPES, CURRENCIES } from "./contractUtils";

const str = (v) => (v === null || v === undefined ? "" : String(v));

/** Add (contract = null) or edit an employment contract */
export default function ContractModal({
  employeeLabel,
  employeeId,
  contract,
  runningId,
  positions,
  schedules,
  onClose,
  onSave,
  onDelete,
}) {
  const editing = Boolean(contract);
  const [type, setType] = useState(contract?.contract_type || "");
  const [positionId, setPositionId] = useState(str(contract?.position_id));
  const [startDate, setStartDate] = useState(contract?.start_date || "");
  const [endDate, setEndDate] = useState(contract?.end_date || "");
  const [scheduleId, setScheduleId] = useState(str(contract?.schedule_id));
  const [status, setStatus] = useState(contract?.status || "draft");
  const [wage, setWage] = useState(str(contract?.wage));
  const [currency, setCurrency] = useState(contract?.currency || "EGP");

  const { errors, setErrors, formError, setFormError, saving, saved, clearError, run } = useModalState(onClose);

  const change = (setter, key) => (value) => {
    setter(value);
    clearError(key);
  };

  const submit = () => {
    const next = {};
    if (!type) next.contract_type = "This field is required";
    if (positions.length && !positionId) next.position_id = "This field is required";
    if (!startDate) next.start_date = "This field is required";
    if (schedules.length && !scheduleId) next.schedule_id = "This field is required";
    if (!status) next.status = "This field is required";
    if (wage === "") next.wage = "This field is required";
    if (!currency) next.currency = "This field is required";
    const missing = Object.keys(next).length > 0;

    if (startDate && endDate && endDate <= startDate) next.end_date = "End date must be later than start date";
    if (wage !== "" && (!Number.isFinite(Number(wage)) || Number(wage) < 0)) next.wage = "Enter a valid amount (0 or more)";
    if (status === "running" && runningId && runningId !== contract?.contract_id) {
      next.status = "This employee already has a running contract";
    }

    setErrors(next);
    if (Object.keys(next).length) {
      setFormError(missing ? "Please complete all required fields before saving." : "");
      return;
    }

    const payload = {
      employee_id: employeeId,
      contract_type: type,
      start_date: startDate,
      end_date: endDate || null,
      position_id: positionId ? Number(positionId) : null,
      schedule_id: scheduleId ? Number(scheduleId) : null,
      wage: Number(wage).toFixed(2),
      currency,
      status,
    };
    if (editing) payload.contract_id = contract.contract_id;

    run(() => onSave(payload, editing));
  };

  return (
    <HrModal
      eyebrow={employeeLabel}
      title={editing ? "Edit contract" : "Add contract"}
      saving={saving}
      saved={saved}
      error={formError}
      onClose={onClose}
      onSubmit={submit}
      onDelete={editing ? () => run(() => onDelete(contract)) : undefined}
    >
      <div className="att-form-grid">
        <Field label="Contract type" required error={errors.contract_type}>
          <SelectInput
            value={type}
            onChange={change(setType, "contract_type")}
            options={CONTRACT_TYPES}
            placeholder="Select contract type"
          />
        </Field>
        <Field label="Position" required={positions.length > 0} error={errors.position_id || errors.position}>
          <SearchSelect
            value={positionId}
            onChange={change(setPositionId, "position_id")}
            options={positions.map((p) => ({ value: String(p.value), label: p.label }))}
            placeholder="e.g. Design Lead"
          />
        </Field>
        <Field label="Start date" required error={errors.start_date}>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => change(setStartDate, "start_date")(e.target.value)} />
        </Field>
        <Field label="End date" error={errors.end_date}>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => change(setEndDate, "end_date")(e.target.value)} />
        </Field>
        <Field label="Work schedule" required={schedules.length > 0} error={errors.schedule_id || errors.schedule}>
          <SelectInput
            value={scheduleId}
            onChange={change(setScheduleId, "schedule_id")}
            options={schedules.map((s) => ({ value: String(s.value), label: s.label }))}
            placeholder="Select work schedule"
          />
        </Field>
        <Field label="Status" required error={errors.status}>
          <SelectInput value={status} onChange={change(setStatus, "status")} options={CONTRACT_STATUSES} placeholder="Select status" />
        </Field>
        <Field label="Annual salary" required error={errors.wage}>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={wage}
            onChange={(e) => change(setWage, "wage")(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Currency" required error={errors.currency}>
          <SelectInput value={currency} onChange={change(setCurrency, "currency")} options={CURRENCIES} placeholder="Select currency" />
        </Field>
      </div>
    </HrModal>
  );
}
