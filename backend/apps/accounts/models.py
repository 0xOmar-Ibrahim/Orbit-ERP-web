from django.db import models
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.conf import settings


class Role(models.Model):
    """
        Role Table Named with (role) in DB
    """
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        # The table name
        db_table = "role"

    # Edit the str attribute
    def __str__(self):
        return self.role_name


class Module(models.Model):
    """
        Module Table named with (module)
    """
    module_id = models.AutoField(primary_key=True)
    module_name = models.CharField(max_length=100, unique=True)

    class Meta:
        # table name
        db_table = "module"

    # Edit the str attribute
    def __str__(self):
        return self.module_name


class Permission(models.Model):
    """
        Permission Table named with (permission)
    """
    permission_id = models.AutoField(primary_key=True)
    # ABO ELNOUR: permission_name must be namespaced (e.g. "crm.view_customer") to avoid
    # global UNIQUE collision when the same action name exists across multiple modules
    permission_name = models.CharField(max_length=100, unique=True)

    class Meta:
        # Table name
        db_table = "permission"

    # Edit the str attribute
    def __str__(self):
        return self.permission_name


class EmployeeManager(BaseUserManager):

    def create_user(self, work_email, password=None, **extra_fields):
        if not work_email:
            raise ValueError("Work email is required")

        employee = self.model(
            work_email=self.normalize_email(work_email),
            **extra_fields
        )

        employee.set_password(password)
        employee.save(using=self._db)

        return employee


# ABO ELNOUR: Branch model — represents a physical office or store location.
# Added to support multi-branch organizations where employees and customers
# belong to a specific branch.
class Branch(models.Model):
    """Branch Table — stores physical office/store locations (db_table: branch)"""
    branch_id = models.AutoField(primary_key=True)
    branch_name = models.CharField(max_length=150, unique=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    # ABO ELNOUR: is_active uses soft-delete pattern — branches are deactivated, never deleted
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "branch"

    def __str__(self):
        return self.branch_name


class Employee(AbstractBaseUser, PermissionsMixin):

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    class EmploymentStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        ON_LEAVE = "on_leave", "On Leave"
        SUSPENDED = "suspended", "Suspended"
        TERMINATED = "terminated", "Terminated"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"
        INTERN = "intern", "Intern"

    employee_id = models.AutoField(primary_key=True)

    employee_code = models.CharField(
        max_length=30,
        unique=True
    )

    role = models.ForeignKey(
        "Role",
        on_delete=models.PROTECT,
        related_name="employees",
        db_column="role_id",
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    date_of_birth = models.DateField()

    gender = models.CharField(
        max_length=6,
        choices=Gender.choices
    )

    national_id = models.CharField(
        max_length=30,
        unique=True
    )

    phone = models.CharField(max_length=20)

    work_email = models.EmailField(
        unique=True
    )

    address = models.TextField(
        blank=True
    )

    hire_date = models.DateField()

    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )

    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )

    sso_issuer = models.URLField(
        null=True,
        blank=True,
    )

    sso_subject = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    sso_enabled = models.BooleanField(
        default=False,
    )

    # ABO ELNOUR: termination_date records the official last working day.
    # Null for active employees; set when employment_status changes to TERMINATED.
    termination_date = models.DateField(null=True, blank=True)

    # ABO ELNOUR: branch links the employee to a physical branch (multi-branch support).
    # Uses SET_NULL so removing a branch does not delete the employee records.
    branch = models.ForeignKey(
        "Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        db_column="branch_id",
    )

    # ABO ELNOUR: department — current organizational unit the employee belongs to.
    # String reference 'hr.Department' avoids circular import between accounts <-> hr.
    department = models.ForeignKey(
        "hr.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        db_column="department_id",
    )

    # ABO ELNOUR: manager — direct reporting line (self-referencing FK).
    # SET_NULL so that deleting a manager does not cascade to subordinates.
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordinates",
        db_column="manager_id",
    )

    # ABO ELNOUR: position — current job title held by the employee.
    # String reference 'hr.JobPosition' to avoid circular import.
    position = models.ForeignKey(
        "hr.JobPosition",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        db_column="position_id",
    )

    # ABO ELNOUR: schedule — the work timetable assigned to this employee.
    # String reference 'hr.WorkSchedule' to avoid circular import.
    schedule = models.ForeignKey(
        "hr.WorkSchedule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
        db_column="schedule_id",
    )

    # ABO ELNOUR: created_at and updated_at — audit timestamps.
    # Track when the employee record was first created and last modified.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = EmployeeManager()

    # Note: is_superuser is inherited from PermissionsMixin — kept here intentionally
    # to override the default to False; no duplicate column is created in the DB.
    is_superuser = models.BooleanField(default=False)

    # Note: last_login is inherited from AbstractBaseUser — redefined here with
    # null=True, blank=True to allow employees who never logged in.
    last_login = models.DateTimeField(null=True, blank=True)

    sso_enabled = models.BooleanField(default=False)
    
    USERNAME_FIELD = "work_email"

    REQUIRED_FIELDS = []

    class Meta:
        db_table = "employee"
        # ABO ELNOUR: indexes to speed up common lookups on the employee table
        indexes = [
            models.Index(fields=["branch"], name="idx_employee_branch"),
            models.Index(fields=["department"], name="idx_employee_department"),
            models.Index(fields=["employment_status"], name="idx_employee_status"),
        ]

    def __str__(self):
        return f"{self.employee_code} - {self.first_name} {self.last_name}"


class RolePermission(models.Model):
    """
        RolePermission Table named with (role_permission)
    """

    # Create the RolePermission model with the following fields
    role_permission_id = models.AutoField(primary_key=True)
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions",
        db_column="role_id",
    )
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="role_permissions",
        db_column="module_id",
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="role_permissions",
        db_column="permission_id",
    )

    # Create the Meta class to set the table name to "role_permission" and add a unique constraint on the combination of role, module, and permission
    class Meta:
        db_table = "role_permission"
        constraints = [
            models.UniqueConstraint(
                fields=["role", "module", "permission"],
                name="unique_role_module_permission",
            )
        ]

    # Edit the str attribute to return the role, module, and permission
    def __str__(self):
        return f"{self.role} | {self.module} | {self.permission}"


class RegistrationRequest(models.Model):

    class RegistrationMethod(models.TextChoices):
        SSO = "sso", "SSO"
        PASSWORD = "password", "Email and Password"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    request_id = models.AutoField(primary_key=True)

    registration_method = models.CharField(
        max_length=20,
        choices=RegistrationMethod.choices,
        default=""
    )

    # Identity verified by the SSO provider
    sso_issuer = models.URLField()
    sso_subject = models.CharField(max_length=255)

    work_email = models.EmailField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    # Optional message from the applicant
    reason = models.TextField(blank=True)

    password = models.CharField(
        max_length=128,
        blank=True,
        default=""
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_registration_requests",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "registration_request"

    def __str__(self):
        return f"{self.work_email} - {self.status}"
