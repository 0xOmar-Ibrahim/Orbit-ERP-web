from django.db import models
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin



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

class Employee(AbstractBaseUser, PermissionsMixin):

    class Gender(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"

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
        max_length=1,
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

    objects = EmployeeManager()

    USERNAME_FIELD = "work_email"

    REQUIRED_FIELDS = []

    class Meta:
        db_table = "employee"

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

