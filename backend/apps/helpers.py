
import random
import time
import re
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from django.db.models import Q
from apps.hr.models import EmploymentContract, WorkScheduleLine

EMAIL_REGEX = r"^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$"


class IsAdministratorUser(BasePermission):
    """
    Allows access only to admin users.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

    
def is_valid_id(value):
    # IDs are positive integers; anything else would raise a ValueError in the ORM
    return str(value).isdigit()


def validate_email_regex(email):
    if not re.fullmatch(EMAIL_REGEX, email or ""):
        raise ValidationError({
            "email": "Enter a valid email address."
        })

    return email

def get_user_permissions(employee, refresh):
    """
    Get the permissions for a given employee based on their role.
    """
    if not employee.role_id:
        return {}

    # Get user role name
    role_name = employee.role.role_name if employee.role_id else None

    # Get role permissions
    permissions = []

    if employee.role_id:
        permissions = [
            {
                "module": rp.module.module_name,
                "permission": rp.permission.permission_name
            }
            for rp in employee.role.role_permissions.select_related("module", "permission")
        ]

    payload = {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "user": {
            "id": employee.employee_id,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "code": employee.employee_code,
            "email": employee.work_email,
            "role": employee.role_id,
            "role_name": role_name,
            "permissions": permissions,
        },
    }

    return payload

def generate_code(account_type = 1):
    """
        generate code based on account type
        1 ==> employee
        2 ==> customer
    """

    if account_type == 1:
        prefix = "EMP"
    elif account_type == 2: 
        prefix = "CUS" 
    else:
        raise ValueError("The Code type must be Employee or Customer.")

    random_number = random.randint(1000, 9999)
    current_year = time.strftime("%Y")
    generated_code = f"{prefix}-{current_year}-{random_number}"

    return generated_code



def calculate_attendance_metrics(attendance):
    """
    Calculate worked_minutes and overtime_minutes using the employee's
    running contract and assigned WorkSchedule.
    """

    attendance.worked_minutes = 0
    attendance.overtime_minutes = 0

    # An incomplete attendance record has no finalized working duration.
    if not attendance.check_in or not attendance.check_out:
        return

    elapsed_minutes = int(
        (attendance.check_out - attendance.check_in).total_seconds() // 60
    )

    # Prevent negative durations.
    if elapsed_minutes <= 0:
        return

    # Find the contract active on the attendance date.
    contract = (
        EmploymentContract.objects
        .filter(
            employee_id=attendance.employee_id,
            status=EmploymentContract.ContractStatus.RUNNING,
            start_date__lte=attendance.attendance_date,
        )
        .filter(
            Q(end_date__isnull=True) |
            Q(end_date__gte=attendance.attendance_date)
        )
        .select_related("schedule")
        .first()
    )

    # No active contract or no assigned schedule:
    # Record actual elapsed time, but do not assume overtime.
    if not contract or not contract.schedule:
        attendance.worked_minutes = elapsed_minutes
        return

    schedule = contract.schedule

    # Your WorkScheduleLine weekday values are:
    # Saturday=0, Sunday=1, Monday=2, ..., Friday=6.
    weekday = (attendance.attendance_date.weekday() + 2) % 7

    schedule_line = WorkScheduleLine.objects.filter(
        schedule=schedule,
        weekday=weekday,
    ).first()

    # No schedule line means no defined working duration for this day.
    if not schedule_line:
        attendance.worked_minutes = elapsed_minutes
        return

    # WorkScheduleLine requires end_time > start_time.
    scheduled_minutes = int(
        (
            schedule_line.end_time.hour * 60
            + schedule_line.end_time.minute
        )
        -
        (
            schedule_line.start_time.hour * 60
            + schedule_line.start_time.minute
        )
    )

    # Subtract the configured break from the scheduled working duration.
    scheduled_work_minutes = max(
        0,
        scheduled_minutes - schedule_line.break_minutes
    )

    # The schema defines break_minutes as a deduction from worked hours.
    actual_worked_minutes = max(
        0,
        elapsed_minutes - schedule_line.break_minutes
    )

    attendance.worked_minutes = actual_worked_minutes
    attendance.overtime_minutes = max(
        0,
        actual_worked_minutes - scheduled_work_minutes
    )

# ==========================
# Uploaded file storage
# ==========================

def get_upload_storage():
    """Storage rooted at settings.MEDIA_ROOT (backend/uploads/)."""
    from django.conf import settings
    from django.core.files.storage import FileSystemStorage

    return FileSystemStorage(location=settings.MEDIA_ROOT)


def save_uploaded_file(uploaded_file, folder):
    """
    Save an uploaded file under MEDIA_ROOT/<folder>/ with a random name,
    keeping only the original extension. Returns the relative path to store in the DB.
    """
    import os
    import uuid

    extension = os.path.splitext(uploaded_file.name)[1].lower()
    random_name = f"{folder}/{uuid.uuid4().hex}{extension}"

    return get_upload_storage().save(random_name, uploaded_file)


def delete_stored_file(relative_path):
    """Delete a stored file if it exists. Never raises."""
    if not relative_path:
        return

    try:
        storage = get_upload_storage()
        if storage.exists(relative_path):
            storage.delete(relative_path)
    except Exception:
        pass
