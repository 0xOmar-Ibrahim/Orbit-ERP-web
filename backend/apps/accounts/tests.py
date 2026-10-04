from django.test import TestCase

# Create your tests here.
from models import Employee, Role, Module, Permission
from django.contrib.auth.hashers import make_password

Role.objects.create(role_name="Admin", description="Administrator role").save()

# employee = Employee.objects.create(
#     employee_code="EMP001",
#     role=,
#     first_name="Omar",
#     last_name="Ibrahim",
#     password=make_password("123456"),
#     date_of_birth="2004-01-01",
#     gender="M",
#     national_id="123456789",
#     phone="01000000000",
#     work_email="omar@example.com",
#     address="Giza",
#     hire_date="2026-10-04",
# )