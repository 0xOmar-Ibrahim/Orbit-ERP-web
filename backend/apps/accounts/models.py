from django.db import models


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


class Employee(models.Model):
    """
        Create the Base class Employee with name (employee) in db
    """
    class Gender(models.TextChoices):
        """
            Create class Gender to choose the gender from it.
        """
        MALE = "M", "Male"
        FEMALE = "F", "Female"

    class EmploymentStatus(models.TextChoices):
        """
            Create class EmploymentStatus to choose the employment status from it.
        """
        ACTIVE = "active", "Active"
        ON_LEAVE = "on_leave", "On Leave"
        SUSPENDED = "suspended", "Suspended"
        TERMINATED = "terminated", "Terminated"

    class EmploymentType(models.TextChoices):
        """
            Create class EmploymentType to choose the employment type from it.
        """
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"
        INTERN = "intern", "Intern"

    # Create the Employee model with the following fields
    employee_id = models.AutoField(primary_key=True)
    employee_code = models.CharField(max_length=30, unique=True)
    # Create a foreign key to the Role model with on_delete=models.PROTECT (Block the deletion of a role if it is assigned to any employee)
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="employees",
        db_column="role_id",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=Gender.choices)
    national_id = models.CharField(max_length=30, unique=True)
    phone = models.CharField(max_length=20)
    work_email = models.EmailField(unique=True)
    address = models.TextField(blank=True)
    hire_date = models.DateField()
    # Create a foreign key to the Employee model with on_delete=models.SET_NULL (Set the manager to null if the manager is deleted)
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

    # Create the Meta class to set the table name to "employee"
    class Meta:
        db_table = "employee"

    # Edit the str attribute to return the employee code and name
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