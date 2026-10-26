
import random
import time
import re
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission


EMAIL_REGEX = r"^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$"

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

class IsAdministratorUser(BasePermission):
    """
    Allows access only to admin users.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)
