"""
Automatic EmployeeHistory logging.

History is written only by the system (the history API is read-only). Any endpoint that
edits an employee must do:

    before = snapshot_employee(employee)
    with transaction.atomic():
        employee = serializer.save()
        log_employee_changes(employee, before, recorded_by=request.user)

so the change and its history rows are saved together or not at all.
"""

import datetime

from django.utils import timezone

from .models import EmployeeHistory

ChangeType = EmployeeHistory.ChangeType


def _text(value):
    """Readable text for a stored value: None -> "", dates -> ISO, anything else -> str."""
    if value is None:
        return ""
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return str(value)


def _full_name(employee):
    if not employee:
        return ""
    return f"{employee.first_name} {employee.last_name}".strip()


def _related(attr, name_field):
    """Reader for a FK: the related object's name field, or "" when empty."""
    def read(employee):
        obj = getattr(employee, attr)
        return getattr(obj, name_field) if obj else ""
    return read


def _choice(field):
    """Reader for a choices field: its display label, or "" when empty."""
    def read(employee):
        if not getattr(employee, field):
            return ""
        return getattr(employee, f"get_{field}_display")()
    return read


def _plain(field):
    return lambda employee: getattr(employee, field)


# Every employee field the API can edit (see UpdateEmployeeSerializer in
# apps/admin_control/serializers.py).
# field -> (change_type, label, function that turns the employee into a readable value)
TRACKED_EMPLOYEE_FIELDS = {
    # Career changes
    "position": (ChangeType.POSITION_CHANGE, "Position", _related("position", "title")),
    "department": (ChangeType.TRANSFER, "Department", _related("department", "department_name")),
    "branch": (ChangeType.TRANSFER, "Branch", _related("branch", "branch_name")),
    "employment_status": (ChangeType.STATUS_CHANGE, "Employment status", _choice("employment_status")),
    "employment_type": (ChangeType.OTHER, "Employment type", _choice("employment_type")),
    "manager": (ChangeType.OTHER, "Manager", lambda e: _full_name(e.manager)),
    "role": (ChangeType.OTHER, "Role", _related("role", "role_name")),
    "schedule": (ChangeType.OTHER, "Work schedule", _related("schedule", "name")),
    "hire_date": (ChangeType.OTHER, "Hire date", _plain("hire_date")),

    # Personal / contact information
    "first_name": (ChangeType.OTHER, "First name", _plain("first_name")),
    "last_name": (ChangeType.OTHER, "Last name", _plain("last_name")),
    "work_email": (ChangeType.OTHER, "Work email", _plain("work_email")),
    "phone": (ChangeType.OTHER, "Phone", _plain("phone")),
    "address": (ChangeType.OTHER, "Address", _plain("address")),
    "national_id": (ChangeType.OTHER, "National ID", _plain("national_id")),
    "gender": (ChangeType.OTHER, "Gender", _choice("gender")),
    "date_of_birth": (ChangeType.OTHER, "Date of birth", _plain("date_of_birth")),

    # Security: compared by hash, but the values are never written to history
    "password": (ChangeType.OTHER, "Password", _plain("password")),
}

# Fields whose old/new values must not be stored in history
MASKED_FIELDS = {"password"}


def snapshot_employee(employee):
    """Readable value of every tracked field, e.g. {"position": "Sales Executive", ...}."""
    return {
        field: _text(read(employee))
        for field, (_, _, read) in TRACKED_EMPLOYEE_FIELDS.items()
    }


def build_employee_changes(employee, before, recorded_by=None):
    """Unsaved EmployeeHistory rows for every tracked field that differs from `before`."""
    after = snapshot_employee(employee)
    today = timezone.localdate()
    rows = []

    for field, (change_type, label, _) in TRACKED_EMPLOYEE_FIELDS.items():
        if before.get(field) == after[field]:
            continue

        masked = field in MASKED_FIELDS

        rows.append(EmployeeHistory(
            employee=employee,
            change_type=change_type,
            old_value="" if masked else before.get(field, ""),
            new_value="" if masked else after[field],
            notes=f"{label} changed.",
            change_date=today,
            recorded_by=recorded_by,
        ))

    return rows


def log_employee_changes(employee, before, recorded_by=None):
    """Compare `before` (from snapshot_employee) with the saved employee and log each change."""
    rows = build_employee_changes(employee, before, recorded_by)
    if rows:
        EmployeeHistory.objects.bulk_create(rows)


def log_salary_change(contract, old_wage, recorded_by=None):
    """Log a salary_change row when a contract's wage actually changed."""
    if old_wage is None or contract.wage is None or old_wage == contract.wage:
        return

    EmployeeHistory.objects.create(
        employee_id=contract.employee_id,
        change_type=ChangeType.SALARY_CHANGE,
        old_value=str(old_wage),
        new_value=str(contract.wage),
        notes=f"Contract {contract.contract_number} ({contract.currency}).",
        change_date=timezone.localdate(),
        recorded_by=recorded_by,
    )
