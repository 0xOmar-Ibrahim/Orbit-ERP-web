from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from apps.accounts.models import Employee, RegistrationRequest, Role
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from apps.accounts.serializers import LoginSerializer
from apps.accounts.views import LoginThrottle
from .serializers import AddEmployeeSerializer, UpdateEmployeeSerializer
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ..helpers import generate_code
class Employees(APIView):
    permission_classes = [IsAuthenticated]  # must be open, the user isn't logged in yet

    def get(self, request):
        parameters = request.query_params

        employees = [
                        {
                            **employee,
                            "gender": Employee.Gender(employee["gender"]).label,
                            
                        }
                        for employee in Employee.objects.select_related("role").values(
                            "employee_id",
                            "first_name",
                            "last_name",
                            "role__role_name",
                            "employee_code",
                            "work_email",
                            "phone",
                            "national_id",
                            "gender",
                            "employment_status",
                            "employment_type",
                            "hire_date",
                        ).filter(**{field:value for field, value in parameters.items()})
                    ]
        
        # You can add any validation logic here if needed
        return Response({"Employees": employees})
    
    def post(self, request):
        serializer = AddEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # You can add any validation logic here if needed
        return Response({"message": "Employee added successfully."})

    def patch(self, request):
        employee_code = request.data.get("employee_code")
        if not employee_code:
            return Response({"error": "Employee code is required."}, status=400)

        try:
            employee = Employee.objects.get(employee_code=employee_code)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found."}, status=404)

        serializer = UpdateEmployeeSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Employee updated successfully."})

    def delete(self, request):
        employee_code = request.data.get("employee_code")
        if not employee_code:
            return Response({"error": "Employee code is required."}, status=400)

        try:
            employee = Employee.objects.get(employee_code=employee_code)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found."}, status=404)

        employee.delete()
        return Response({"message": "Employee deleted successfully."})
class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data.get("user", {}).get("email")
        
        if email:
            try:
                employee = Employee.objects.get(work_email=email)
                if not employee.is_superuser:
                    return Response({"message": "You do not have permission to access the admin panel."}, status=status.HTTP_403_FORBIDDEN)
                
                is_mobile = request.headers.get("X-Client-Type") == "Flutter"

                # Copy the dictionary to avoid modifying validated_data
                payload = dict(serializer.validated_data)

                if is_mobile:
                    return Response(payload, status=status.HTTP_200_OK)
        
                refresh_token = payload.pop("refresh_token", None)
        
                response = Response(payload, status=status.HTTP_200_OK)
        
                if refresh_token:
                    response.set_cookie(
                        key="refresh_token",
                        value=refresh_token,
                        httponly=True,
                        secure=request.is_secure(),  # HTTPS=True, HTTP=False
                        samesite="Lax",
                        path="/",
                        max_age=7 * 24 * 3600,
                    )
            except Employee.DoesNotExist:
                return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        return response

class AdminLogoutView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        refresh_token = (
                    request.COOKIES.get("refresh_token")
                    or request.data.get("refresh")
                )
        
        if not refresh_token:
            response = Response(
                {"error": "Refresh token cookie is missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            response.delete_cookie("access_token", path="/", samesite="Lax")
            response.delete_cookie("refresh_token", path="/", samesite="Lax")
            response.delete_cookie("sessionid", path="/", samesite="Lax")
            return response

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

        except TokenError:
            response = Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_200_OK,
            )
            response.delete_cookie("access_token", path="/", samesite="Lax")
            response.delete_cookie("refresh_token", path="/", samesite="Lax")
            response.delete_cookie("sessionid", path="/", samesite="Lax")
            return response

        response = Response(
            {"error": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token", path="/", samesite="Lax")
        response.delete_cookie("refresh_token", path="/", samesite="Lax")
        response.delete_cookie("sessionid", path="/", samesite="Lax")

        return response


class ApproveRegistrationView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):

        request_id = request.data.get("request_id")

        registration = get_object_or_404(
            RegistrationRequest.objects.select_for_update(),
            request_id=request_id,
        )

        if registration.status != "pending":
            return Response(
                {
                    "message": (
                        f"Request is already {registration.status}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The admin must explicitly select the employee's role.
        role_id = request.data.get("role_id")
        date_of_birth = request.data.get("date_of_birth")
        gender = request.data.get("gender")
        national_id = request.data.get("national_id")
        phone = request.data.get("phone")
        address = request.data.get("address")
        hire_date = request.data.get("hire_date")
        employee_type = request.data.get("employment_type")

        
        employee_code = generate_code()

        if not role_id:
            return Response(
                {"message": "role_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        role = get_object_or_404(Role, role_id=role_id)

        # Never automatically link an existing employee by email.
        if Employee.objects.filter(
            work_email__iexact=registration.work_email
        ).exists():
            return Response(
                {
                    "message": (
                        "An employee with this email already exists. "
                        "Review and link the account through a separate "
                        "verified process."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        if registration.sso_issuer and registration.sso_subject:
            if Employee.objects.filter(
                sso_issuer=registration.sso_issuer,
                sso_subject=registration.sso_subject,
            ).exists():
                return Response(
                    {"message": "This SSO identity is already linked."},
                    status=status.HTTP_409_CONFLICT,
                )

        # Add any other required Employee fields from your model here.
        employee = Employee(
            employee_code=employee_code,
            first_name=registration.first_name,
            last_name=registration.last_name,
            work_email=registration.work_email,
            role=role,
            sso_issuer=registration.sso_issuer,
            sso_subject=registration.sso_subject,
            sso_enabled=True if registration.registration_method == "sso" else False,
            employment_status="active",
            date_of_birth=date_of_birth,
            gender=gender,
            national_id=national_id,
            phone=phone,
            address=address,
            hire_date=hire_date,
            employment_type=employee_type
        )

        if registration.registration_method == "sso":
            # SSO users do not need a local password.
            employee.set_unusable_password()
        else: 
           employee.password = registration.password

        employee.save()

        registration.status = "approved"
        registration.reviewed_by = request.user
        registration.reviewed_at = timezone.now()
        registration.save(
            update_fields=[
                "status",
                "reviewed_by",
                "reviewed_at",
            ]
        )

        return Response(
            {
                "message": "Registration approved successfully.",
                "employee_id": employee.employee_id,
                "work_email": employee.work_email,
                "role": role.role_name,
                "sso_enabled": employee.sso_enabled,
            },
            status=status.HTTP_200_OK,
        )

class RegistrationRequests(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]  # must be open, the user isn't logged in yet

    def get(self, request):
        parameters = request.query_params

        requests = [
                    {
                        **registration_request,
                    }
                    for registration_request in RegistrationRequest.objects.values(
                        "request_id",
                        "sso_issuer",
                        "sso_subject",
                        "work_email",
                        "first_name",
                        "last_name",
                        "reason",
                        "status",
                        "reviewed_at",
                        "created_at",
                        "reviewed_by_id",
                        "registration_method",
                    ).filter(**{field:value for field, value in parameters.items()})
                ]
        
        # You can add any validation logic here if needed
        return Response({"Requests": requests})
