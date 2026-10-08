from rest_framework import serializers
from apps.accounts.models import Employee
import random
import time
from django.contrib.auth.hashers import make_password
class AddEmployeeSerializer(serializers.ModelSerializer):
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
        ]


    def validate(self, data):
        # You can add any validation logic here if needed
        if data["gender"] not in ["male", "female"]:
            raise serializers.ValidationError({"gender": "Gender must be either 'male' or 'female'."})
        return data


    def create(self, validated_data):
            # Hash the password to store it in data base securely
            password = validated_data.pop("password")

            random_number = random.randint(1000, 9999)
            current_year = time.strftime("%Y")
            employee_code = f"EMP-{current_year}-{random_number}"
            
            employee = Employee.objects.create(**validated_data, employee_code=employee_code)
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
                ]

    
    
    def validate(self, data):
        if password := data.get("password"):
            data["password"] = make_password(password)
        return data