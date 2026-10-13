
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

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "code": employee.employee_code,
            "email": employee.work_email,
            "role": employee.role_id,
            "role_name": role_name,
            "permissions": permissions,
        },
    }