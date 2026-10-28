# ABO ELNOUR: Management command to seed initial data for Module and Permission tables.
#
# Run once after the first migration to populate the permission system:
#   python manage.py seed_permissions
#
# This command is idempotent — safe to run multiple times; existing records are not duplicated.

from django.core.management.base import BaseCommand
from apps.accounts.models import Module, Permission


# ABO ELNOUR: MODULES defines all system modules that can be assigned permissions.
# Each entry becomes one row in the 'module' table.
MODULES = [
    "Accounts",
    "CRM",
    "HR",
    "Projects",
    "Accounting",
    "Reporting",
    "Admin Control",
]

# ABO ELNOUR: PERMISSIONS defines the action verbs available across all modules.
# Namespaced as "<module>.<action>" to avoid the global unique collision on permission_name.
# Format: (permission_name, human_readable_label)
PERMISSIONS = [
    # Accounts module
    ("accounts.view_employee",    "Accounts — View Employee"),
    ("accounts.create_employee",  "Accounts — Create Employee"),
    ("accounts.edit_employee",    "Accounts — Edit Employee"),
    ("accounts.delete_employee",  "Accounts — Delete Employee"),
    ("accounts.view_role",        "Accounts — View Role"),
    ("accounts.manage_role",      "Accounts — Manage Role"),

    # CRM module
    ("crm.view_customer",         "CRM — View Customer"),
    ("crm.create_customer",       "CRM — Create Customer"),
    ("crm.edit_customer",         "CRM — Edit Customer"),
    ("crm.delete_customer",       "CRM — Delete Customer"),
    ("crm.view_opportunity",      "CRM — View Opportunity"),
    ("crm.create_opportunity",    "CRM — Create Opportunity"),
    ("crm.edit_opportunity",      "CRM — Edit Opportunity"),
    ("crm.delete_opportunity",    "CRM — Delete Opportunity"),
    ("crm.view_interaction",      "CRM — View Interaction"),
    ("crm.create_interaction",    "CRM — Create Interaction"),

    # HR module
    ("hr.view_employee_hr",       "HR — View Employee HR Data"),
    ("hr.edit_employee_hr",       "HR — Edit Employee HR Data"),
    ("hr.view_attendance",        "HR — View Attendance"),
    ("hr.manage_attendance",      "HR — Manage Attendance"),
    ("hr.view_leave",             "HR — View Leave Requests"),
    ("hr.approve_leave",          "HR — Approve Leave Requests"),
    ("hr.view_payroll",           "HR — View Payroll"),
    ("hr.manage_payroll",         "HR — Manage Payroll"),
    ("hr.view_appraisal",         "HR — View Appraisals"),
    ("hr.manage_appraisal",       "HR — Manage Appraisals"),
    ("hr.manage_recruitment",     "HR — Manage Recruitment"),

    # Projects module
    ("projects.view_project",     "Projects — View Project"),
    ("projects.create_project",   "Projects — Create Project"),
    ("projects.edit_project",     "Projects — Edit Project"),
    ("projects.delete_project",   "Projects — Delete Project"),

    # Accounting module
    ("accounting.view_report",    "Accounting — View Reports"),
    ("accounting.export_report",  "Accounting — Export Reports"),
    ("accounting.manage_entries", "Accounting — Manage Journal Entries"),

    # Reporting module
    ("reporting.view_dashboard",  "Reporting — View Dashboard"),
    ("reporting.export",          "Reporting — Export Data"),

    # Admin Control module
    ("admin.manage_settings",     "Admin — Manage System Settings"),
    ("admin.manage_users",        "Admin — Manage All Users"),
    ("admin.view_audit_log",      "Admin — View Audit Logs"),
]


class Command(BaseCommand):
    # ABO ELNOUR: Command description shown in 'python manage.py help seed_permissions'
    help = "Seed initial Module and Permission records required for the role-based access system."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Modules...")

        # ABO ELNOUR: get_or_create ensures idempotency — running the command twice
        # will not create duplicate rows.
        modules_created = 0
        for module_name in MODULES:
            _, created = Module.objects.get_or_create(module_name=module_name)
            if created:
                modules_created += 1
                self.stdout.write(f"  Created module: {module_name}")

        self.stdout.write(f"Modules done — {modules_created} new, {len(MODULES) - modules_created} already existed.\n")

        self.stdout.write("Seeding Permissions...")

        permissions_created = 0
        for perm_name, _ in PERMISSIONS:
            _, created = Permission.objects.get_or_create(permission_name=perm_name)
            if created:
                permissions_created += 1
                self.stdout.write(f"  Created permission: {perm_name}")

        self.stdout.write(
            f"Permissions done — {permissions_created} new, "
            f"{len(PERMISSIONS) - permissions_created} already existed.\n"
        )

        self.stdout.write(self.style.SUCCESS("Seed completed successfully."))
