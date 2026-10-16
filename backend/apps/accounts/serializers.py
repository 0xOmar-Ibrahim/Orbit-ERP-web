# apps/accounts/serializers.py
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from apps.accounts.models import Employee, RegistrationRequest
from ..helpers import get_user_permissions
from django.contrib.auth.hashers import make_password
from django.utils import timezone

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            employee = Employee.objects.get(work_email=attrs["email"])
        except Employee.DoesNotExist:
            raise AuthenticationFailed("Invalid email or password.")

        # Check hashed password
        if not employee.password or not check_password(attrs["password"], employee.password):
            raise AuthenticationFailed("Invalid email or password.")

        # Check employment status
        if employee.employment_status != Employee.EmploymentStatus.ACTIVE:
            raise AuthenticationFailed("This account is disabled.")

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

