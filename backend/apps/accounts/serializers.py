# apps/accounts/serializers.py
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from apps.accounts.models import Employee

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            employee = Employee.objects.get(
                work_email=attrs["email"]
            )
        except Employee.DoesNotExist:
            raise AuthenticationFailed(
                "Invalid email or password."
            )

        # Check hashed password
        if not employee.password or not check_password(
            attrs["password"],
            employee.password
        ):
            raise AuthenticationFailed(
                "Invalid email or password."
            )

        # Check employment status
        if employee.employment_status != Employee.EmploymentStatus.ACTIVE:
            raise AuthenticationFailed(
                "This account is disabled."
            )

        # Create JWT
        refresh = RefreshToken()

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "code": employee.employee_code,
                "email": employee.work_email,
                "role": employee.role_id,
            },
        }