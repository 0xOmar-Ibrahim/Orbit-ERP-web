from rest_framework import serializers
from apps.accounts.models import Employee, Branch
from apps.hr.models import Department, JobPosition, WorkSchedule
from ..helpers import generate_code
from django.contrib.auth.hashers import make_password
class AddEmployeeSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
    )
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
    )

    position_id = serializers.PrimaryKeyRelatedField(
        queryset=JobPosition.objects.all(),
        source="job_position",
    )
    
    schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=WorkSchedule.objects.all(),
        source="work_schedule",
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
            
            employee = Employee.objects.create(
            **validated_data,
            employee_code=employee_code,
            )
            employee.set_password(make_password(password))

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