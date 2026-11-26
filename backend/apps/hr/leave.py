"""
Leave business logic: working-day counting, balances, validation and status transitions.

Working days come from the employee's work schedule (running contract first, then the
employee's own schedule), falling back to Sunday-Thursday. Public holidays are excluded;
recurring holidays repeat every year on the same day/month.
"""

import calendar
import datetime
from decimal import Decimal

from django.db.models import Q, Sum
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    EmploymentContract,
    LeaveAllocation,
    LeaveRequest,
    LeaveType,
    PublicHoliday,
    WorkScheduleLine,
)

Status = LeaveRequest.LeaveStatus

# WorkScheduleLine weekday numbering: Saturday=0, Sunday=1, ..., Friday=6
DEFAULT_WORKING_WEEKDAYS = {1, 2, 3, 4, 5}  # Sunday - Thursday

# Requests in these states block overlapping requests for the same employee
ACTIVE_STATUSES = (Status.DRAFT, Status.SUBMITTED, Status.APPROVED)


def schedule_weekday(day):
    """Python date -> WorkScheduleLine weekday (Saturday=0 ... Friday=6)."""
    return (day.weekday() + 2) % 7


# ==========================
# Public holidays
# ==========================

def project_to_year(holiday_date, year):
    """Move a recurring holiday to `year` (Feb 29 -> Feb 28 in non-leap years)."""
    if holiday_date.month == 2 and holiday_date.day == 29 and not calendar.isleap(year):
        return datetime.date(year, 2, 28)
    return holiday_date.replace(year=year)


def holiday_dates(start, end):
    """{date: holiday name} for every public holiday between start and end (inclusive)."""
    holidays = {}
    rows = (
        PublicHoliday.objects
        .filter(Q(is_recurring=True) | Q(date__range=(start, end)))
        .values("name", "date", "is_recurring")
    )

    for row in rows:
        if row["is_recurring"]:
            candidates = [
                project_to_year(row["date"], year)
                for year in range(start.year, end.year + 1)
            ]
        else:
            candidates = [row["date"]]

        for day in candidates:
            if start <= day <= end:
                holidays.setdefault(day, row["name"])

    return holidays


# ==========================
# Working days
# ==========================

def working_weekdays(employee):
    """Weekdays (Saturday=0 numbering) the employee works, from their schedule lines."""
    contract = (
        EmploymentContract.objects
        .filter(
            employee_id=employee.pk,
            status=EmploymentContract.ContractStatus.RUNNING,
            schedule__isnull=False,
        )
        .values("schedule_id")
        .first()
    )
    schedule_id = contract["schedule_id"] if contract else getattr(employee, "schedule_id", None)

    if schedule_id:
        weekdays = set(
            WorkScheduleLine.objects
            .filter(schedule_id=schedule_id)
            .values_list("weekday", flat=True)
        )
        if weekdays:
            return weekdays

    return set(DEFAULT_WORKING_WEEKDAYS)


def count_leave_days(employee, start, end):
    """
    Count working days between start and end (inclusive), excluding weekends
    (days without a schedule line) and public holidays.
    """
    weekdays = working_weekdays(employee)
    holidays = holiday_dates(start, end)

    counted = weekend = 0
    counted_holidays = []
    day = start

    while day <= end:
        if schedule_weekday(day) not in weekdays:
            weekend += 1
        elif day in holidays:
            counted_holidays.append({"date": day, "name": holidays[day]})
        else:
            counted += 1
        day += datetime.timedelta(days=1)

    return {
        "counted_days": counted,
        "weekend_days": weekend,
        "holiday_days": len(counted_holidays),
        "holidays": counted_holidays,
    }


def compute_requested_amount(employee, leave_type, date_from, date_to, given_amount=None):
    """
    Days-based types: the counted working days (client value ignored).
    Hours-based types: the client's amount, for a single day.
    """
    if leave_type.unit == LeaveType.LeaveUnit.HOURS:
        if given_amount is None:
            raise ValidationError({"requested_amount": "Required for hour-based leave types."})
        if date_from != date_to:
            raise ValidationError({"date_to": "Hour-based leave must start and end on the same day."})
        if not (Decimal("0") < Decimal(given_amount) <= Decimal("24")):
            raise ValidationError({"requested_amount": "Hours must be more than 0 and at most 24."})
        return Decimal(given_amount)

    return Decimal(count_leave_days(employee, date_from, date_to)["counted_days"])


# ==========================
# Balance
# ==========================

def _sum_requests(employee_id, leave_type_id, status, window, exclude_leave_id):
    queryset = LeaveRequest.objects.filter(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        status=status,
        date_from__gte=window[0],
        date_from__lte=window[1],
    )
    if exclude_leave_id:
        queryset = queryset.exclude(leave_id=exclude_leave_id)
    return queryset.aggregate(total=Sum("requested_amount"))["total"] or Decimal("0")


def leave_balance(employee_id, leave_type, on_date, exclude_leave_id=None):
    """
    Balance for the allocation period containing on_date:
    allocated (approved allocations) - used (approved requests) - pending (submitted requests).
    remaining is None for leave types that don't require an allocation (no limit).
    """
    base = {
        "leave_type_id": leave_type.leave_type_id,
        "name": leave_type.name,
        "code": leave_type.code,
        "unit": leave_type.unit,
        "requires_allocation": leave_type.requires_allocation,
    }

    allocations = LeaveAllocation.objects.filter(
        employee_id=employee_id,
        leave_type_id=leave_type.leave_type_id,
        status=LeaveAllocation.AllocationStatus.APPROVED,
        valid_from__lte=on_date,
        valid_to__gte=on_date,
    ).values("amount", "valid_from", "valid_to")
    allocations = list(allocations)

    if allocations:
        window = (
            min(a["valid_from"] for a in allocations),
            max(a["valid_to"] for a in allocations),
        )
    else:
        # No allocation: count usage within the calendar year
        window = (datetime.date(on_date.year, 1, 1), datetime.date(on_date.year, 12, 31))

    allocated = sum((a["amount"] for a in allocations), Decimal("0"))
    used = _sum_requests(employee_id, leave_type.leave_type_id, Status.APPROVED, window, exclude_leave_id)
    pending = _sum_requests(employee_id, leave_type.leave_type_id, Status.SUBMITTED, window, exclude_leave_id)

    if leave_type.requires_allocation:
        remaining = allocated - used - pending
    else:
        allocated = None
        remaining = None

    return {
        **base,
        "allocated": allocated,
        "used": used,
        "pending": pending,
        "remaining": remaining,
        "valid_from": window[0] if allocations else None,
        "valid_to": window[1] if allocations else None,
    }


# ==========================
# Validation
# ==========================

def has_overlap(employee_id, date_from, date_to, exclude_leave_id=None):
    queryset = LeaveRequest.objects.filter(
        employee_id=employee_id,
        status__in=ACTIVE_STATUSES,
        date_from__lte=date_to,
        date_to__gte=date_from,
    )
    if exclude_leave_id:
        queryset = queryset.exclude(leave_id=exclude_leave_id)
    return queryset.exists()


def validate_leave(employee, leave_type, date_from, date_to, amount,
                   exclude_leave_id=None, check_balance=False):
    """Raise ValidationError if the request can't be saved (or submitted, when check_balance)."""
    if not leave_type.is_active:
        raise ValidationError({"leave_type_id": "This leave type is not active."})

    if date_to < date_from:
        raise ValidationError({"date_to": "End date must be on or after the start date."})

    if amount <= 0:
        raise ValidationError({
            "date_from": "The selected period has no working days (only weekends or public holidays)."
        })

    if has_overlap(employee.pk, date_from, date_to, exclude_leave_id):
        raise ValidationError({
            "date_from": "This period overlaps another draft, submitted or approved leave request."
        })

    if check_balance and leave_type.requires_allocation:
        balance = leave_balance(employee.pk, leave_type, date_from, exclude_leave_id)

        if not balance["allocated"]:
            raise ValidationError({
                "leave_type_id": "No approved allocation for this leave type covers the start date."
            })

        if balance["valid_to"] and date_to > balance["valid_to"]:
            raise ValidationError({
                "date_to": f"The request must end by {balance['valid_to']} (end of the allocation period)."
            })

        if amount > balance["remaining"]:
            raise ValidationError({
                "requested_amount": (
                    f"Not enough balance: {balance['remaining']} {leave_type.unit} remaining, "
                    f"{amount} requested."
                )
            })


# ==========================
# Status transitions
# ==========================

ALLOWED_TRANSITIONS = {
    Status.DRAFT: {Status.SUBMITTED, Status.CANCELLED},
    Status.SUBMITTED: {Status.APPROVED, Status.REFUSED, Status.CANCELLED},
    Status.APPROVED: {Status.CANCELLED},
    Status.REFUSED: set(),
    Status.CANCELLED: set(),
}


def change_status(leave, new_status, user, reviewer_comment=None):
    """
    Apply a status transition to `leave` (not saved). Raises ValidationError for an
    invalid transition and PermissionDenied when `user` isn't allowed to make it.
    """
    current = leave.status

    if new_status == current:
        return leave

    if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
        raise ValidationError({"status": f"Cannot change status from {current} to {new_status}."})

    is_requester = user.pk == leave.employee_id
    is_admin = bool(getattr(user, "is_superuser", False))
    is_approver = leave.approver_id is not None and user.pk == leave.approver_id

    if new_status in (Status.APPROVED, Status.REFUSED):
        if is_requester:
            raise PermissionDenied("You cannot review your own leave request.")
        if not (is_approver or is_admin):
            raise PermissionDenied("Only the assigned approver or an administrator can review this request.")

        if new_status == Status.APPROVED:
            # Re-check balance/overlap at approval time
            validate_leave(
                leave.employee, leave.leave_type, leave.date_from, leave.date_to,
                leave.requested_amount, exclude_leave_id=leave.leave_id, check_balance=True,
            )

        if leave.approver_id is None:
            leave.approver = user

    elif new_status == Status.SUBMITTED:
        if not (is_requester or is_admin):
            raise PermissionDenied("Only the requester can submit this leave request.")

        validate_leave(
            leave.employee, leave.leave_type, leave.date_from, leave.date_to,
            leave.requested_amount, exclude_leave_id=leave.leave_id, check_balance=True,
        )

        # Leave types that don't need approval are approved on submit
        if not leave.leave_type.requires_approval:
            new_status = Status.APPROVED

    elif new_status == Status.CANCELLED:
        allowed = is_requester or is_admin or (current == Status.APPROVED and is_approver)
        if not allowed:
            raise PermissionDenied("You are not allowed to cancel this leave request.")

    if reviewer_comment is not None:
        if is_requester and not is_admin:
            raise PermissionDenied("The requester cannot write the reviewer comment.")
        leave.reviewer_comment = reviewer_comment

    leave.status = new_status
    return leave
