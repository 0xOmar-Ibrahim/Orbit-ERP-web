# apps/accounts/serializers.py
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from apps.accounts.models import Employee
from .helpers import get_user_permissions

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

        # Create JWT
        refresh = RefreshToken.for_user(employee)

        return get_user_permissions(employee, refresh)
