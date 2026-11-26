# apps/accounts/serializers.py
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from apps.accounts.models import Employee, RegistrationRequest, Branch
from apps.hr.models import Department, JobPosition, WorkSchedule
from ..helpers import get_user_permissions, validate_email_regex, generate_code
from django.contrib.auth.hashers import make_password
from django.utils import timezone

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):

        email = attrs["email"].strip().lower()

        registration = RegistrationRequest.objects.filter(
            work_email__iexact=email
        ).first()

        if registration and registration.status == "pending":
            raise AuthenticationFailed("Registration is pending")
        
        try:
            employee = Employee.objects.get(work_email=attrs["email"])
        except Employee.DoesNotExist:
            raise NotAuthenticated("Account not Found.")

        # Check hashed password
        if not employee.password or not check_password(attrs["password"], employee.password):
            raise NotAuthenticated("Invalid email or password.")

        # Check employment status
        if employee.employment_status != Employee.EmploymentStatus.ACTIVE:
            raise NotAuthenticated("This account is disabled.")

        employee.last_login = timezone.now()
        employee.save(update_fields=["last_login"])

        # Create JWT
        refresh = RefreshToken.for_user(employee)

        return get_user_permissions(employee, refresh)

class SignUPSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    work_email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        required=True,
        trim_whitespace=False,
        min_length=8,
    )

    def validate(self, attrs):
        validate_email_regex(attrs['work_email'])
        
        reg = (
            RegistrationRequest.objects
            .filter(work_email=attrs["work_email"])
            .order_by("-created_at")
            .first()
        )  

        if reg:
            if reg.status == "pending":
                raise serializers.ValidationError({
                    "error": "This registration request is pending."
                })

        if Employee.objects.filter(work_email=attrs['work_email']).exists():
            raise serializers.ValidationError({
                "error": "This account is already in the system."
            })
        return attrs

    def create(self, validated_data):
        validated_data["password"] = make_password(
            validated_data["password"]
        )

        new_user = RegistrationRequest.objects.create(
            **validated_data, registration_method="password"
        )

        return {
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "email": new_user.work_email,
        }  

class AddEmployeeSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
    )
    manager_id = serializers.PrimaryKeyRelatedField(
    queryset=Employee.objects.all(),
    source="manager",
    )

    position_id = serializers.PrimaryKeyRelatedField(
        queryset=JobPosition.objects.all(),
        source="position",
    )

    schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=WorkSchedule.objects.all(),
        source="schedule",
    )

    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        source="branch",
    )
    
    class Meta:
        model = Employee
        fields = [
            "first_name", 
            "last_name",
            "password",
            "work_email",
            "phone",
            "national_id",
            "gender",
            "role",
            "date_of_birth",
            "employment_status",
            "employment_type",
            "hire_date",
            "address",
            "department_id",
            "manager_id",
            "position_id",
            "schedule_id",
            "branch_id"
        ]


    def validate(self, data):
        # You can add any validation logic here if needed
        if data["gender"] not in ["male", "female"]:
            raise serializers.ValidationError({"gender": "Gender must be either 'male' or 'female'."})
        return data


    def create(self, validated_data):
            # Hash the password to store it in data base securely
            password = validated_data.pop("password")

            employee_code = generate_code()
            while True:
                if Employee.objects.filter(employee_code=employee_code).exists():
                    employee_code = generate_code()
                else:
                    break
            employee = Employee.objects.create(
            **validated_data,
            employee_code=employee_code,
            )
            # set_password hashes it; passing an already-hashed value would hash it twice
            employee.set_password(password)

            employee.save()

            return employee

class UpdateEmployeeSerializer(serializers.ModelSerializer):

    employee_code = serializers.CharField(read_only=True)
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Employee
        fields = [
                    "employee_code",
                    "first_name", 
                    "last_name",
                    "password",
                    "work_email",
                    "phone",
                    "national_id",
                    "gender",
                    "role",
                    "date_of_birth",
                    "employment_status",
                    "employment_type",
                    "hire_date",
                    "address",
                    "department_id",
                    "manager_id",
                    "position_id",
                    "schedule_id",
                    "branch_id"
                ]

    
    
    def validate(self, data):
        if password := data.get("password"):
            data["password"] = make_password(password)
        return data
