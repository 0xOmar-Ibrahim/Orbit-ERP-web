"""
Automatic EmployeeHistory logging.

History is written only by the system (never through the API). Call these helpers
inside the same transaction.atomic() block as the change they describe, so the
change and its history row are saved together or not at all.
"""

from django.utils import timezone

from .models import EmployeeHistory

ChangeType = EmployeeHistory.ChangeType


def _full_name(employee):
    if not employee:
        return ""
    return f"{employee.first_name} {employee.last_name}".strip()


# field -> (change_type, label, function that turns the employee into a readable value)
TRACKED_EMPLOYEE_FIELDS = {
    "position": (
        ChangeType.POSITION_CHANGE,
        "Position",
        lambda e: e.position.title if e.position else "",
    ),
    "department": (
        ChangeType.TRANSFER,
        "Department",
        lambda e: e.department.department_name if e.department else "",
    ),
    "branch": (
        ChangeType.TRANSFER,
        "Branch",
        lambda e: e.branch.branch_name if e.branch else "",
    ),
    "employment_status": (
        ChangeType.STATUS_CHANGE,
        "Employment status",
        lambda e: e.get_employment_status_display() if e.employment_status else "",
    ),
    "employment_type": (
        ChangeType.OTHER,
        "Employment type",
        lambda e: e.get_employment_type_display() if e.employment_type else "",
    ),
    "manager": (
        ChangeType.OTHER,
        "Manager",
        lambda e: _full_name(e.manager),
    ),
}


def snapshot_employee(employee):
    """Readable value of every tracked field, e.g. {"position": "Sales Executive", ...}."""
    return {
        field: str(read(employee))
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

        rows.append(EmployeeHistory(
            employee=employee,
            change_type=change_type,
            old_value=before.get(field, ""),
            new_value=after[field],
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
